import crypto from "crypto";

const SIGNATURE_HMAC_SECRET = process.env.SIGNATURE_TOKEN_SECRET || process.env.BETTER_AUTH_SECRET || "eleave-secure-signature-hmac-secret-kutchap";

export function createScopedSignatureTokenSync(params, mockDb) {
  const jti = crypto.randomUUID();
  const purpose = params.purpose || "PRINT_FACILITY_A4";
  const ttl = params.ttlSeconds || 300;
  const expiresAtMs = Date.now() + ttl * 1000;
  const expiresAtDate = new Date(expiresAtMs);

  const payload = {
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

  if (mockDb) {
    mockDb.push({
      jti,
      userId: params.userId,
      docId: params.docId,
      purpose,
      createdAt: new Date(),
      consumedAt: null,
      expiresAt: expiresAtDate
    });
  }

  return { token, payload };
}

export function verifySignatureTokenFormat(token) {
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
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    );
    return payload;
  } catch {
    return null;
  }
}

/**
 * Simulates atomic UPDATE ... WHERE consumedAt IS NULL RETURNING * against in-memory state or DB
 */
export function verifyAndConsumeSignatureTokenSync(
  token,
  expectedDocId,
  expectedUserId,
  expectedPurpose = "PRINT_FACILITY_A4",
  mockDb
) {
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

  if (mockDb) {
    const row = mockDb.find(r => r.jti === payload.jti);
    if (!row) return false;
    if (row.consumedAt !== null) return false; // Already consumed!
    if (new Date() > row.expiresAt) return false; // Expired!

    // Atomic update
    row.consumedAt = new Date();
    return true;
  }

  return true;
}
