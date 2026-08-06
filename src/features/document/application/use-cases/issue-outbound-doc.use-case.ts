import { prisma } from "@/lib/db";
import { generateAdvisoryLockKey } from "@/core/infrastructure/db/advisory-lock";
import { OutboundFormData } from "@/features/document/domain/types/document.types";

/**
 * Formats a document sequence number into a standard document string.
 */
function formatDocNumber(
  pattern: string,
  prefix: string,
  seq: number,
  year: number,
  paddingDigits: number = 1,
  useThaiNumerals: boolean = true
): string {
  let paddedSeq = seq.toString().padStart(paddingDigits, "0");
  if (useThaiNumerals) {
    const thaiDigits = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"];
    paddedSeq = paddedSeq.replace(/\d/g, (d) => thaiDigits[parseInt(d, 10)]);
  }

  let strYear = year.toString();
  if (useThaiNumerals) {
    const thaiDigits = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"];
    strYear = strYear.replace(/\d/g, (d) => thaiDigits[parseInt(d, 10)]);
  }

  return pattern
    .replace("[PREFIX]", prefix)
    .replace("[SEQ]", paddedSeq)
    .replace("[YEAR]", strYear);
}

/**
 * Atomic Outbound Document Issuance Use Case.
 * Executes draft creation, sequence lock/increment, timeline validation, and audit log creation
 * all within a single ACID Prisma transaction to eliminate dangling drafts and race conditions.
 */
export async function issueOutboundDocAtomic(data: OutboundFormData, userId: string) {
  const docDate = new Date(data.date);
  const year = docDate.getFullYear();
  const thYear = year + 543;
  const isOutgoing = data.docType.startsWith("OUTGOING");
  const isCert = data.docType === "CERTIFICATE" || data.docType === "CERT";
  const baseDocType = isOutgoing ? "OUTGOING" : data.docType;

  // 1. Anti-forward-dating check: General docs cannot be dated in the future
  const activeDateMs = new Date(new Date(data.date).setHours(0, 0, 0, 0)).getTime();
  const todayMs = new Date(new Date().setHours(0, 0, 0, 0)).getTime();

  if (!isCert && activeDateMs > todayMs) {
    throw new Error("ไม่อนุญาตให้ออกเลขเอกสารล่วงหน้า (ยกเว้นเกียรติบัตรที่สามารถลงวันที่ล่วงหน้าหรือย้อนหลังได้)");
  }

  return prisma.$transaction(async (tx) => {
    // 2. Acquire advisory lock key based on doc scope and target year
    const scopeKey = `doc-seq-${data.docType}-${data.memoSectionId || "default"}-${thYear}`;
    const lockKey = generateAdvisoryLockKey(scopeKey);

    // PostgreSQL transaction-level advisory lock
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

    // 3. Find or initialize DocumentConfig
    let config = await tx.documentConfig.findFirst({
      where: {
        docType: data.docType,
        memoSectionId: data.docType === "MEMO" ? data.memoSectionId || null : null,
      },
    });

    if (!config) {
      let defaultPrefix = "ศทก";
      if (data.docType === "COMMAND") defaultPrefix = "คำสั่งที่";
      else if (data.docType === "ANNOUNCEMENT") defaultPrefix = "ประกาศที่";
      else if (isOutgoing) defaultPrefix = "ศธ.๐๔๓๔๙.๐๑";

      config = await tx.documentConfig.create({
        data: {
          docType: data.docType,
          memoSectionId: data.docType === "MEMO" ? data.memoSectionId || null : null,
          prefix: defaultPrefix,
          useThaiNumerals: true,
          paddingDigits: 1,
          yearFormat: "TH_BE",
          currentSeq: 0,
        },
      });
    }

    // 4. Calculate sequence number for target year (thYear)
    const latestDoc = await tx.documentRecord.findFirst({
      where: {
        docType: data.docType,
        memoSectionId: data.docType === "MEMO" ? data.memoSectionId || null : null,
        year: thYear,
        status: { in: ["ISSUED", "PRINTED"] },
      },
      orderBy: { seqNo: "desc" },
    });

    let nextSeq: number;
    if (latestDoc && latestDoc.seqNo !== null && latestDoc.seqNo !== undefined) {
      nextSeq = latestDoc.seqNo + 1;
    } else {
      nextSeq = 1;
    }

    // 5. Build Suffix & Pattern
    const finalYear = config.yearFormat === "TH_BE" ? thYear : year;
    let targetPrefix = config.prefix;
    let pattern = "[PREFIX] [SEQ]/[YEAR]";

    if (isOutgoing) {
      // Clean prefix for outgoing document numbers to ensure standard format "ศธ.๐๔๓๔๙.๐๑"
      let cleanPrefix = config.prefix.replace(/[\/\sว]+$/g, "").trim();
      if (!cleanPrefix || cleanPrefix === "ที่ ศทก" || cleanPrefix === "ศทก" || cleanPrefix.includes("ศทก")) {
        cleanPrefix = "ศธ.๐๔๓๔๙.๐๑";
      }
      targetPrefix = cleanPrefix;

      if (data.docType === "OUTGOING_CIRCULAR") {
        pattern = "[PREFIX]/ว[SEQ]";
      } else {
        pattern = "[PREFIX]/[SEQ]";
      }
    }

    // 6. Bulk Certificate Batch Processing vs Single Document
    const qty = isCert && data.isBulkBatch && data.quantity && data.quantity > 1 ? data.quantity : 1;
    const batchId = qty > 1 ? `batch-cert-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` : null;

    let firstRecord: any = null;
    for (let i = 0; i < qty; i++) {
      const curSeq = nextSeq + i;
      const docNo = formatDocNumber(
        pattern,
        targetPrefix,
        curSeq,
        finalYear,
        config.paddingDigits,
        config.useThaiNumerals
      );

      const record = await tx.documentRecord.create({
        data: {
          docType: data.docType,
          memoSectionId: data.docType === "MEMO" ? data.memoSectionId || null : null,
          docNo,
          seqNo: curSeq,
          year: thYear,
          title: qty > 1 ? `${data.title.trim()} (${i + 1}/${qty})` : data.title.trim(),
          to: data.to.trim(),
          origin: data.origin.trim(),
          date: new Date(data.date),
          content: "",
          signeeName: "",
          signeePosition: "",
          status: "ISSUED",
          requester: data.requester.trim(),
          department: data.department?.trim() || null,
          unitType: data.unitType || "DEPARTMENT",
          isBulkBatch: qty > 1,
          batchId,
          quantity: qty,
          roleType: data.roleType || null,
          roleTitle: data.roleTitle || null,
          createdById: userId,
        },
      });

      if (i === 0) firstRecord = record;
    }

    // 7. Update DocumentConfig currentSeq
    const maxSeqIssued = nextSeq + qty - 1;
    if (maxSeqIssued > (config.currentSeq || 0)) {
      await tx.documentConfig.update({
        where: { id: config.id },
        data: { currentSeq: maxSeqIssued },
      });
    }

    // 8. Record Audit Log in SystemLog
    await tx.systemLog.create({
      data: {
        userId,
        actionType: "DOC_ISSUE",
        description: qty > 1
          ? `ขอออกเลขทะเบียนเกียรติบัตรแบบชุด (${qty} หมายเลข): Batch ID ${batchId}`
          : `ขอออกเลขทะเบียนเอกสารใหม่: ${firstRecord?.docNo} (${data.title})`,
      },
    });

    return firstRecord;
  }, { timeout: 15000 });
}
