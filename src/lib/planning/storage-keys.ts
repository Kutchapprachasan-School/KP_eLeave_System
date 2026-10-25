import crypto from "crypto";

/**
 * ทำความสะอาดชื่อไฟล์ก่อนสร้าง Object Key บน Cloudflare R2
 */
export function buildR2ObjectKey(
  fiscalYear: number,
  projectCode: string,
  originalFileName: string,
  subFolder: "documents" | "receipts" = "documents"
): string {
  const safeCode = projectCode.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeName = originalFileName
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._\u0E00-\u0E7F-]/gu, "");
  const uniquePrefix = crypto.randomUUID().slice(0, 8);
  return `planning/${fiscalYear}/${safeCode}/${subFolder}/${uniquePrefix}-${safeName}`;
}
