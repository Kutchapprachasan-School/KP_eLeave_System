import prisma from "@/lib/prisma";
import crypto from "crypto";
import { getStorageProvider } from "@/services/storage";
import { isValidVerificationTokenFormat } from "@/app/(app)/document/_components/designer/cert-schema";
export { isValidVerificationTokenFormat };

// Sliding-window in-memory rate limiter for public verification
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ipOrKey: string, maxRequests: number = 60, windowMs: number = 60 * 1000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ipOrKey);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ipOrKey, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

// Clean up stale rate limit entries periodically (every 5 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of rateLimitMap.entries()) {
      if (now > val.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

export interface VerificationResult {
  state: "VALID" | "REVOKED" | "NOT_FOUND";
  certificateNumber?: string;
  seqNo?: number;
  year?: number;
  roleTitle?: string;
  recipientName?: string | null;
  status?: string;
  activityTitle?: string;
  organization?: string;
  issuedDate?: Date;
  signeeName?: string;
  signeePosition?: string;
  downloadPdfUrl?: string | null;
}


/**
 * Public Certificate Verification Service.
 * Performs format validation, rate limiting, and exact indexed SHA-256 hash lookup.
 */
export async function verifyCertificateByToken(
  token: string,
  clientIp: string = "anonymous"
): Promise<{ success: boolean; data?: VerificationResult; error?: string; code?: string }> {
  // 1. Rate limiting check
  if (!checkRateLimit(clientIp, 60, 60 * 1000)) {
    return {
      success: false,
      code: "RATE_LIMITED",
      error: "คุณส่งคำขอตรวจสอบถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง",
    };
  }

  // 2. Strict token format validation
  const rawToken = (token || "").trim();
  if (!isValidVerificationTokenFormat(rawToken)) {
    return {
      success: false,
      error: "รูปแบบรหัสตรวจสอบเกียรติบัตรไม่ถูกต้อง",
      data: { state: "NOT_FOUND" },
    };
  }

  // Graceful sample preview certificate verification (for designer studio draft testing)
  if (rawToken.toUpperCase() === "SAMPLE") {
    return {
      success: true,
      data: {
        state: "VALID",
        certificateNumber: "001/2569",
        seqNo: 1,
        year: 2569,
        roleTitle: "รางวัลชนะเลิศ การแข่งขันโครงงานวิทยาศาสตร์",
        recipientName: "นายสมศักดิ์ รักเรียน (ตัวอย่างเกียรติบัตร)",
        status: "VALID",
        activityTitle: "สัปดาห์วิทยาศาสตร์ ประจำปีการศึกษา ๒๕๖๙",
        organization: "โรงเรียนกุดจับประชาสรรค์",
        issuedDate: new Date(),
        signeeName: "นายวิจิตร สุขสงบ",
        signeePosition: "ผู้อำนวยการโรงเรียนกุดจับประชาสรรค์",
        downloadPdfUrl: null,
      },
    };
  }

  // 3. Compute SHA-256 hash for exact indexed lookup
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  // 4. Exact indexed query on uk_cert_item_verify_token (O(1) lookup)
  const rows = await prisma.$queryRaw<Array<{
    certificateNumber: string;
    seqNo: number;
    year: number;
    roleTitle: string;
    recipientName: string | null;
    status: string;
    createdAt: Date;
    batchId: string;
    batchTitle: string;
    batchOrigin: string;
    batchDate: Date;
    batchSignee: string;
    batchSigneePosition: string;
    batchStatus: string;
    batchAttachmentUrl: string | null;
  }>>`
    SELECT 
      c."certificateNumber", c."seqNo", c.year, c."roleTitle", c."recipientName", c.status, c."createdAt",
      d.id as "batchId", d.title as "batchTitle", d.origin as "batchOrigin", d.date as "batchDate",
      d."signeeName" as "batchSignee", d."signeePosition" as "batchSigneePosition", d.status as "batchStatus",
      d."attachmentUrl" as "batchAttachmentUrl"
    FROM "CertificateIssuedItem" c
    JOIN "DocumentRecord" d ON d.id = c."batchRecordId"
    WHERE c."verifyToken" = ${tokenHash} OR c."verifyToken" = ${rawToken}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return {
      success: false,
      error: "ไม่พบข้อมูลเกียรติบัตรนี้ในระบบทะเบียน หรือรหัสตรวจสอบไม่ถูกต้อง",
      data: { state: "NOT_FOUND" },
    };
  }

  const item = rows[0];
  const isValid = item.status === "ISSUED" && item.batchStatus === "ISSUED";
  const isRevoked =
    item.status === "CANCELLED" || item.batchStatus === "CANCELLED" || item.status === "REVOKED";

  let downloadPdfUrl = item.batchAttachmentUrl || null;
  try {
    const att = await prisma.fileAttachment.findFirst({
      where: {
        documentRecordId: item.batchId,
        attachmentStatus: "ACTIVE",
        mimeType: { contains: "pdf" },
      },
      orderBy: { createdAt: "desc" },
    });
    if (att) {
      const storage = getStorageProvider();
      downloadPdfUrl = await storage.getUrl(att.objectKey);
    }
  } catch {
    // Graceful fallback to batchAttachmentUrl
  }

  return {
    success: true,
    data: {
      state: isValid ? "VALID" : isRevoked ? "REVOKED" : "NOT_FOUND",
      certificateNumber: item.certificateNumber,
      seqNo: item.seqNo,
      year: item.year,
      roleTitle: item.roleTitle,
      recipientName: item.recipientName,
      status: isValid ? "VALID" : "REVOKED",
      activityTitle: item.batchTitle,
      organization: item.batchOrigin,
      issuedDate: item.batchDate,
      signeeName: item.batchSignee,
      signeePosition: item.batchSigneePosition,
      downloadPdfUrl,
    },
  };
}
