"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { formatDocNumber, toThaiNumerals } from "@/lib/document-utils";

// Helper to check user session
async function getSessionUser() {
  if (process.env.BYPASS_AUTH === "true") {
    // Return a mock user or find/create a test user in DB to avoid foreign key violations
    const user = await prisma.user.findFirst();
    if (user) {
      return user;
    }
    return prisma.user.create({
      data: {
        id: "test-user-id",
        name: "Test User",
        email: "test@example.com",
        role: "ADMIN",
        isApproved: true
      }
    });
  }

  const { headers } = await import("next/headers");
  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({
    headers: await headers()
  });
  if (!session?.user) throw new Error("Unauthorized");
  return session.user;
}

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch (e) {
    // Ignore error when running in CLI test environment
  }
}


export async function saveDocDraft(data: {
  id?: string;
  docType: string;
  memoSectionId?: string;
  title: string;
  to: string;
  origin: string;
  date: string;
  content: string;
  signeeName: string;
  signeePosition: string;
  enclosures?: string;
  references?: string;
  requester?: string;
  department?: string;
}) {
  const user = await getSessionUser();
  const docDate = new Date(data.date);
  if (isNaN(docDate.getTime())) {
    throw new Error("\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48\u0e02\u0e2d\u0e07\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e44\u0e21\u0e48\u0e16\u0e39\u0e01\u0e15\u0e49\u0e2d\u0e07");
  }
  
  if (data.id) {
    const updated = await prisma.documentRecord.update({
      where: { id: data.id },
      data: {
        title: data.title,
        to: data.to,
        origin: data.origin,
        date: docDate,
        content: data.content,
        signeeName: data.signeeName,
        signeePosition: data.signeePosition,
        enclosures: data.enclosures || null,
        references: data.references || null,
        memoSectionId: data.memoSectionId || null,
        status: "DRAFT",
        requester: data.requester || null,
        department: data.department || null,
        year: docDate.getFullYear()
      }
    });
    safeRevalidatePath("/document");
    return updated;
  } else {
    const created = await prisma.documentRecord.create({
      data: {
        docType: data.docType,
        memoSectionId: data.memoSectionId || null,
        title: data.title,
        to: data.to,
        origin: data.origin,
        date: docDate,
        content: data.content,
        signeeName: data.signeeName,
        signeePosition: data.signeePosition,
        enclosures: data.enclosures || null,
        references: data.references || null,
        status: "DRAFT",
        requester: data.requester || null,
        department: data.department || null,
        createdById: user.id,
        year: docDate.getFullYear()
      }
    });
    safeRevalidatePath("/document");
    return created;
  }
}

export async function quickIssueDoc(data: {
  docType: string;
  memoSectionId?: string;
  title: string;
  to: string;
  origin: string;
  date: string;
  requester: string;
  department: string;
}) {
  const user = await getSessionUser();
  const docDate = new Date(data.date);
  if (isNaN(docDate.getTime())) {
    throw new Error("\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48\u0e02\u0e2d\u0e07\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e44\u0e21\u0e48\u0e16\u0e39\u0e01\u0e15\u0e49\u0e2d\u0e07");
  }

  const draft = await prisma.documentRecord.create({
    data: {
      docType: data.docType,
      memoSectionId: data.memoSectionId || null,
      title: data.title,
      to: data.to,
      origin: data.origin,
      date: docDate,
      content: "",
      signeeName: "",
      signeePosition: "",
      requester: data.requester,
      department: data.department,
      status: "DRAFT",
      createdById: user.id,
      year: docDate.getFullYear()
    }
  });

  try {
    const issued = await issueDocNumber(draft.id, data.date);
    return issued;
  } catch (error) {
    await prisma.documentRecord.delete({ where: { id: draft.id } }).catch(() => {});
    throw error;
  }
}

export async function issueDocNumber(docId: string, customDateStr?: string) {
  const user = await getSessionUser();
  
  // Transaction to secure auto-increment
  return prisma.$transaction(async (tx) => {
    const record = await tx.documentRecord.findUnique({
      where: { id: docId }
    });
    if (!record) throw new Error("Document not found");
    if (record.status !== "DRAFT" && record.status !== "RESERVED") throw new Error("Document already issued");

    const activeDate = customDateStr ? new Date(customDateStr) : record.date;
    const year = activeDate.getFullYear();
    const thYear = year + 543;

    // 1. Validate date constraint: Not earlier than the latest document in this sequence
    const latestDoc = await tx.documentRecord.findFirst({
      where: {
        docType: record.docType,
        memoSectionId: record.memoSectionId,
        year: year,
        status: { in: ["ISSUED", "PRINTED"] }
      },
      orderBy: { seqNo: "desc" }
    });

    if (latestDoc) {
      const activeDateStart = new Date(activeDate);
      activeDateStart.setHours(0, 0, 0, 0);
      const latestDocDateStart = new Date(latestDoc.date);
      latestDocDateStart.setHours(0, 0, 0, 0);

      if (activeDateStart < latestDocDateStart) {
        const formattedDate = latestDoc.date.toLocaleDateString("th-TH");
        throw new Error(`\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e2d\u0e2d\u0e01\u0e40\u0e25\u0e02\u0e22\u0e49\u0e2d\u0e19\u0e2b\u0e25\u0e31\u0e07\u0e02\u0e49\u0e32\u0e21\u0e25\u0e33\u0e14\u0e31\u0e1a\u0e40\u0e27\u0e25\u0e32\u0e44\u0e14\u0e49 \u0e27\u0e31\u0e19\u0e17\u0e35\u0e48\u0e02\u0e2d\u0e07\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e19\u0e35\u0e49\u0e15\u0e49\u0e2d\u0e07\u0e40\u0e17\u0e48\u0e32\u0e01\u0e31\u0e1a\u0e2b\u0e23\u0e37\u0e2d\u0e2b\u0e25\u0e31\u0e07\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48\u0e02\u0e2d\u0e07\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e09\u0e1a\u0e31\u0e1a\u0e25\u0e48\u0e32\u0e2a\u0e38\u0e14 (${formattedDate})`);
      }
    }

    // 2. Fetch or create config for prefix and sequence
    let config = await tx.documentConfig.findFirst({
      where: {
        docType: record.docType,
        memoSectionId: record.memoSectionId
      }
    });

    if (!config) {
      config = await tx.documentConfig.create({
        data: {
          docType: record.docType,
          memoSectionId: record.memoSectionId,
          prefix: record.docType === "COMMAND" ? "\u0e04\u0e33\u0e2a\u0e31\u0e48\u0e07\u0e17\u0e35\u0e48" : record.docType === "OUTGOING" ? "\u0e17\u0e35\u0e48 \u0e28\u0e17\u0e01" : "\u0e28\u0e17\u0e01",
          useThaiNumerals: true,
          paddingDigits: 1,
          yearFormat: "TH_BE",
          currentSeq: 0
        }
      });
    }

    const nextSeq = config.currentSeq + 1;
    
    // Update config sequence
    await tx.documentConfig.update({
      where: { id: config.id },
      data: { currentSeq: nextSeq }
    });

    // Formulate running number
    const finalYear = config.yearFormat === "TH_BE" ? thYear : year;
    const pattern = config.docType === "COMMAND" 
      ? "[PREFIX] [SEQ]/[YEAR]" 
      : config.docType === "OUTGOING" 
        ? "[PREFIX] [SEQ]/[YEAR]"
        : "[PREFIX] [SEQ]/[YEAR]";

    const formattedNo = formatDocNumber(
      pattern,
      config.prefix,
      nextSeq,
      finalYear,
      config.paddingDigits,
      config.useThaiNumerals
    );

    // Save and update document record
    const updated = await tx.documentRecord.update({
      where: { id: docId },
      data: {
        docNo: formattedNo,
        seqNo: nextSeq,
        year: year,
        date: activeDate,
        status: "ISSUED"
      }
    });

    // Write system log
    await tx.systemLog.create({
      data: {
        actionType: "DOC_ISSUE",
        description: `\u0e2d\u0e2d\u0e01\u0e40\u0e25\u0e02\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17 ${record.docType}: ${formattedNo} \u0e42\u0e14\u0e22\u0e1c\u0e39\u0e49\u0e43\u0e0a\u0e49\u0e07\u0e32\u0e19 ${user.name || "Unknown"}`,
        userId: user.id
      }
    });

    safeRevalidatePath("/document");
    return updated;
  });
}

export async function cancelDoc(id: string, reason: string) {
  const user = await getSessionUser();
  const updated = await prisma.documentRecord.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelReason: reason
    }
  });

  await prisma.systemLog.create({
    data: {
      actionType: "DOC_CANCEL",
      description: `\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e40\u0e25\u0e02\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23 ${updated.docNo || "\u0e22\u0e31\u0e07\u0e45\u0e21\u0e48\u0e44\u0e14\u0e49\u0e2d\u0e2d\u0e01\u0e40\u0e25\u0e02"} \u0e40\u0e19\u0e37\u0e48\u0e2d\u0e07\u0e08\u0e32\u0e01: ${reason}`,
      userId: user.id
    }
  });

  safeRevalidatePath("/document");
  return updated;
}

export async function getDocPreviewNumber(docType: string, sectionId?: string) {
  // Let's get the config or default values:
  const config = await prisma.documentConfig.findFirst({
    where: {
      docType,
      memoSectionId: sectionId || null
    }
  });

  const nextSeq = config ? config.currentSeq + 1 : 1;
  const prefix = config ? config.prefix : (docType === "COMMAND" ? "\u0e04\u0e33\u0e2a\u0e31\u0e48\u0e07\u0e17\u0e35\u0e48" : docType === "OUTGOING" ? "\u0e17\u0e35\u0e48 \u0e28\u0e17\u0e01" : "\u0e28\u0e17\u0e01");
  const useThaiNumerals = config ? config.useThaiNumerals : true;
  const paddingDigits = config ? config.paddingDigits : 1;
  const yearFormat = config ? config.yearFormat : "TH_BE";

  const year = new Date().getFullYear();
  const thYear = year + 543;
  const finalYear = yearFormat === "TH_BE" ? thYear : year;
  const pattern = docType === "COMMAND" 
    ? "[PREFIX] [SEQ]/[YEAR]" 
    : docType === "OUTGOING" 
      ? "[PREFIX] [SEQ]/[YEAR]"
      : "[PREFIX] [SEQ]/[YEAR]";

  return formatDocNumber(
    pattern,
    prefix,
    nextSeq,
    finalYear,
    paddingDigits,
    useThaiNumerals
  );
}

export async function getDocumentDetails(id: string) {
  return prisma.documentRecord.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, position: true } },
      memoSection: true
    }
  });
}

export async function getDocumentsList(filters: {
  search?: string;
  docType?: string;
  memoSectionId?: string;
  status?: string;
  year?: number;
}) {
  const where: any = {};
  if (filters.docType) where.docType = filters.docType;
  if (filters.memoSectionId) where.memoSectionId = filters.memoSectionId;
  if (filters.status) where.status = filters.status;
  if (filters.year) where.year = filters.year;
  
  if (filters.search) {
    where.OR = [
      { docNo: { contains: filters.search, mode: "insensitive" } },
      { title: { contains: filters.search, mode: "insensitive" } },
      { signeeName: { contains: filters.search, mode: "insensitive" } }
    ];
  }

  return prisma.documentRecord.findMany({
    where,
    include: {
      user: { select: { name: true } },
      memoSection: true
    },
    orderBy: [
      { isPinned: "desc" },
      { createdAt: "desc" }
    ]
  });
}

export async function getDashboardStats() {
  const currentYear = new Date().getFullYear();
  const counts = await prisma.documentRecord.groupBy({
    by: ["status"],
    _count: { id: true },
    where: { year: currentYear }
  });

  const stats = { DRAFT: 0, ISSUED: 0, PRINTED: 0, CANCELLED: 0 };
  counts.forEach((c) => {
    if (c.status in stats) {
      stats[c.status as keyof typeof stats] = c._count.id;
    }
  });
  return stats;
}
