import crypto from "crypto";
import { prisma } from "@/lib/db";

const SIGNATURE_HMAC_SECRET = process.env.SIGNATURE_TOKEN_SECRET || process.env.BETTER_AUTH_SECRET || "eleave-secure-signature-hmac-secret-kutchap";

export interface SignatureTokenPayload {
  jti: string;
  userId: string;
  docId: string;
  purpose: string;
  expiresAt: number; // Unix timestamp ms
}

/**
 * Creates a scoped, time-limited, single-use signature token and registers it in SignatureTokenLog.
 */
export async function createScopedSignatureToken(params: {
  userId: string;
  docId: string;
  purpose?: string;
  ttlSeconds?: number;
}): Promise<string> {
  const jti = crypto.randomUUID();
  const purpose = params.purpose || "PRINT_FACILITY_A4";
  const ttl = params.ttlSeconds || 300; // 5 minutes default
  const expiresAtMs = Date.now() + ttl * 1000;
  const expiresAtDate = new Date(expiresAtMs);

  const payload: SignatureTokenPayload = {
    jti,
    userId: params.userId,
    docId: params.docId,
    purpose,
    expiresAt: expiresAtMs
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SIGNATURE_HMAC_SECRET)
    .update(payloadB64)
    .digest("base64url");

  const token = `${payloadB64}.${signature}`;

  // Record in database SignatureTokenLog
  await prisma.signatureTokenLog.create({
    data: {
      jti,
      userId: params.userId,
      docId: params.docId,
      purpose,
      expiresAt: expiresAtDate
    }
  });

  return token;
}

/**
 * Verifies HMAC signature and unpacks payload without consuming.
 */
export function verifySignatureTokenFormat(token: string): SignatureTokenPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, providedSig] = parts;
  const expectedSig = crypto
    .createHmac("sha256", SIGNATURE_HMAC_SECRET)
    .update(payloadB64)
    .digest("base64url");

  if (!crypto.timingSafeEqual(Buffer.from(providedSig), Buffer.from(expectedSig))) {
    return null;
  }

  try {
    const payload: SignatureTokenPayload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    );
    return payload;
  } catch {
    return null;
  }
}

/**
 * Single-Query Atomic Verification & Consumption of Single-Use Signature Token.
 * Uses atomic UPDATE ... WHERE consumedAt IS NULL RETURNING *
 * Returns true only if exactly 1 unconsumed row was matched and marked consumed.
 */
export async function verifyAndConsumeSignatureToken(
  token: string,
  expectedDocId: string,
  expectedUserId: string,
  expectedPurpose: string = "PRINT_FACILITY_A4"
): Promise<boolean> {
  const payload = verifySignatureTokenFormat(token);
  if (!payload) return false;

  if (
    payload.userId !== expectedUserId ||
    payload.docId !== expectedDocId ||
    payload.purpose !== expectedPurpose
  ) {
    return false;
  }

  if (Date.now() > payload.expiresAt) {
    return false;
  }

  // Atomic Single-Query Consumption
  try {
    const affectedCount = await prisma.$executeRaw`
      UPDATE "SignatureTokenLog"
      SET "consumedAt" = NOW()
      WHERE "jti" = ${payload.jti}
        AND "consumedAt" IS NULL
        AND "expiresAt" > NOW()
        AND "userId" = ${expectedUserId}
        AND "docId" = ${expectedDocId}
    `;

    // In Prisma executeRaw, affectedCount === 1 means exactly 1 row updated
    return affectedCount === 1;
  } catch {
    return false;
  }
}
