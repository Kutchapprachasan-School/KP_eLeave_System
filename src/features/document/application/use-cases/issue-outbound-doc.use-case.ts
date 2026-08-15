import { prisma } from "@/lib/db";
import { generateAdvisoryLockKey } from "@/core/infrastructure/db/advisory-lock";
import { OutboundFormData } from "@/features/document/domain/types/document.types";
import { formatDocNumber } from "@/lib/document-utils";

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
  const baseDocType = isOutgoing ? "OUTGOING" : data.docType;

  return prisma.$transaction(async (tx) => {
    // 1. Acquire advisory lock key based on doc scope
    const scopeKey = `doc-seq-${baseDocType}-${data.memoSectionId || "default"}-${thYear}`;
    const lockKey = generateAdvisoryLockKey(scopeKey);

    // PostgreSQL transaction-level advisory lock
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

    // 2. Find or initialize DocumentConfig
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
      else if (data.docType === "OUTGOING_CIRCULAR") defaultPrefix = "ศธ.๐๔๓๔๙.๐๑/ว";
      else if (isOutgoing) defaultPrefix = "ศธ.๐๔๓๔๙.๐๑/";

      config = await tx.documentConfig.create({
        data: {
          docType: data.docType,
          memoSectionId: data.docType === "MEMO" ? data.memoSectionId || null : null,
          prefix: defaultPrefix,
          useThaiNumerals: true,
          paddingDigits: 1,
          yearFormat: "NONE",
          currentSeq: 0,
        },
      });
    }

    // 3. Check anti-backdating rule against latest issued document
    const latestDoc = await tx.documentRecord.findFirst({
      where: {
        docType: isOutgoing ? { in: ["OUTGOING", "OUTGOING_NORMAL", "OUTGOING_CIRCULAR"] } : data.docType,
        memoSectionId: data.docType === "MEMO" ? data.memoSectionId || null : null,
        year: thYear,
        status: { in: ["ISSUED", "PRINTED"] },
      },
      orderBy: { seqNo: "desc" },
    });

    if (latestDoc && latestDoc.date) {
      const activeDateMs = new Date(new Date(data.date).setHours(0, 0, 0, 0)).getTime();
      const latestDateMs = new Date(new Date(latestDoc.date).setHours(0, 0, 0, 0)).getTime();
      if (activeDateMs < latestDateMs) {
        throw new Error(
          `ไม่สามารถออกเลขย้อนหลังข้ามลำดับเวลาได้ (เลขล่าสุดออก ณ วันที่ ${new Date(
            latestDoc.date
          ).toLocaleDateString("th-TH")})`
        );
      }
    }

    // 4. Calculate sequence number for this specific year (thYear)
    let nextSeq: number;

    if (latestDoc && latestDoc.seqNo !== null && latestDoc.seqNo !== undefined) {
      // Documents exist in this year -> increment from the max seqNo of this year
      nextSeq = latestDoc.seqNo + 1;
      
      if (nextSeq > config.currentSeq) {
        await tx.documentConfig.update({
          where: { id: config.id },
          data: { currentSeq: nextSeq },
        });
      }
    } else {
      // First document of this year!
      // Use configured sequence or start at 1
      const configuredSeq = (config.currentSeq || 0) + 1;
      nextSeq = configuredSeq > 0 ? configuredSeq : 1;

      await tx.documentConfig.update({
        where: { id: config.id },
        data: { currentSeq: nextSeq },
      });
    }

    const finalYear = config.yearFormat === "TH_BE" ? thYear : year;
    const docNo = formatDocNumber(
      "[PREFIX] [SEQ]/[YEAR]",
      config.prefix,
      nextSeq,
      finalYear,
      config.paddingDigits,
      config.useThaiNumerals,
      data.docType,
      config.yearFormat
    );

    // 5. Create DocumentRecord directly as ISSUED within transaction
    const documentRecord = await tx.documentRecord.create({
      data: {
        docType: data.docType,
        memoSectionId: data.docType === "MEMO" ? data.memoSectionId || null : null,
        docNo,
        seqNo: nextSeq,
        year: thYear,
        title: data.title.trim(),
        to: data.to.trim(),
        origin: data.origin.trim(),
        date: new Date(data.date),
        content: "",
        signeeName: "",
        signeePosition: "",
        status: "ISSUED",
        requester: data.requester.trim(),
        department: data.department?.trim() || null,
        createdById: userId,
      },
    });

    // 6. Record Audit Log in SystemLog
    await tx.systemLog.create({
      data: {
        userId,
        actionType: "DOC_ISSUE",
        description: `ขอออกเลขทะเบียนเอกสารใหม่: ${docNo} (${data.title})`,
      },
    });

    return documentRecord;
  }, { timeout: 10000 });
}
