"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseAMSSUrl } from "@/lib/amss-parser";
import { parseAMSSListHtml } from "@/lib/amss-list-parser";

// Helper to check user session
async function getSessionUser() {
  if (process.env.BYPASS_AUTH === "true") {
    const user = await prisma.user.findFirst();
    if (user) return user;
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
    // Ignore error
  }
}

// Scrape AMSS++ URL
export async function scrapeAMSSDocument(url: string) {
  await getSessionUser(); // Check auth
  const details = await parseAMSSUrl(url);
  if (!details) {
    throw new Error("ไม่สามารถดึงข้อมูลจากลิงก์ AMSS++ ได้ กรุณากรอกข้อมูลด้วยตนเอง");
  }
  return details;
}

// Create/Register Incoming Document
export async function createIncomingDoc(data: {
  senderOrg: string;
  docRefNo?: string;
  title: string;
  urgencyLevel: string; // URGENT_MOST, URGENT_MORE, URGENT, NORMAL
  amssLink?: string;
  attachmentUrl?: string;
  memoSectionId?: string;
  note?: string;
  firstAssigneeId?: string; // If provided, start routing to this person immediately
}) {
  const user = await getSessionUser();
  const receiveDate = new Date();
  const year = parseInt(new Date().toLocaleDateString("en-US", { year: "numeric", timeZone: "Asia/Bangkok" }), 10);
  const thYear = year + 543;

  return prisma.$transaction(async (tx) => {
    // Auto-generate receiveNo "รับที่ XXX/2569"
    // Find highest seq for current year by fetching all docs of the year and parsing in memory
    const yearDocuments = await tx.incomingDocument.findMany({
      where: {
        receiveDate: {
          gte: new Date(`${year}-01-01T00:00:00+07:00`),
          lt: new Date(`${year + 1}-01-01T00:00:00+07:00`)
        }
      },
      select: { receiveNo: true }
    });

    let nextSeq = 1;
    for (const doc of yearDocuments) {
      if (doc.receiveNo) {
        const match = doc.receiveNo.match(/รับที่\s*(\d+)/);
        if (match) {
          const seq = parseInt(match[1]);
          if (seq >= nextSeq) {
            nextSeq = seq + 1;
          }
        }
      }
    }

    const receiveNo = `รับที่ ${nextSeq}/${thYear}`;

    const doc = await tx.incomingDocument.create({
      data: {
        receiveNo,
        receiveDate,
        senderOrg: data.senderOrg,
        docRefNo: data.docRefNo || null,
        title: data.title,
        urgencyLevel: data.urgencyLevel,
        amssLink: data.amssLink || null,
        attachmentUrl: data.attachmentUrl || null,
        memoSectionId: data.memoSectionId || null,
        note: data.note || null,
        status: data.firstAssigneeId ? "ROUTING" : "PENDING",
        createdById: user.id
      }
    });

    // If first assignee is provided, add the first routing step
    if (data.firstAssigneeId) {
      await tx.documentRouting.create({
        data: {
          incomingDocId: doc.id,
          stepOrder: 1,
          assigneeId: data.firstAssigneeId,
          assignedById: user.id,
          status: "PENDING"
        }
      });

      // Send LINE notification if enabled
      await sendLineNotifyForRouting(doc.title, data.firstAssigneeId);
    }

    // Write system log
    await tx.systemLog.create({
      data: {
        actionType: "INCOMING_CREATE",
        description: `ลงทะเบียนรับหนังสือราชการ: ${receiveNo} - ${data.title} โดยผู้ใช้ ${user.name || "Unknown"}`,
        userId: user.id
      }
    });

    safeRevalidatePath("/document");
    return doc;
  });
}

// Add next step manually (if the manager wants to add a step to the chain)
export async function addRoutingStep(data: {
  incomingDocId: string;
  assigneeId: string;
  deadline?: string;
}) {
  const user = await getSessionUser();

  const result = await prisma.$transaction(async (tx) => {
    const doc = await tx.incomingDocument.findUnique({
      where: { id: data.incomingDocId },
      include: { routingSteps: true }
    });
    if (!doc) throw new Error("Document not found");

    const maxStep = doc.routingSteps.reduce((max, s) => Math.max(max, s.stepOrder), 0);
    const nextStepOrder = maxStep + 1;

    const newStep = await tx.documentRouting.create({
      data: {
        incomingDocId: data.incomingDocId,
        stepOrder: nextStepOrder,
        assigneeId: data.assigneeId,
        assignedById: user.id,
        status: "PENDING",
        deadline: data.deadline ? new Date(data.deadline) : null
      }
    });

    // If document was in PENDING status, mark it as ROUTING
    if (doc.status === "PENDING") {
      await tx.incomingDocument.update({
        where: { id: doc.id },
        data: { status: "ROUTING" }
      });
    }

    // Notify assignee
    await sendLineNotifyForRouting(doc.title, data.assigneeId);

    return newStep;
  });

  safeRevalidatePath(`/document/incoming/${data.incomingDocId}`);
  return result;
}

// Resolve/Sign/Annotate a routing step
export async function resolveRoutingStep(data: {
  routingId: string;
  resolution: string; // "รับทราบ", "ทราบและดำเนินการ", or custom text
  note?: string;
  nextAssigneeId?: string; // Chain to next person
  deadline?: string; // Deadline for the next person
}) {
  const user = await getSessionUser();

  const result = await prisma.$transaction(async (tx) => {
    const currentStep = await tx.documentRouting.findUnique({
      where: { id: data.routingId },
      include: { incomingDoc: true }
    });
    if (!currentStep) throw new Error("Routing step not found");
    if (currentStep.assigneeId !== user.id && user.role !== "ADMIN") {
      throw new Error("You are not authorized to sign this step");
    }

    // 1. Update current step
    const updatedStep = await tx.documentRouting.update({
      where: { id: data.routingId },
      data: {
        status: "COMPLETED",
        resolution: data.resolution,
        note: data.note || null,
        completedAt: new Date()
      }
    });

    // 2. Handle next step or complete routing
    if (data.nextAssigneeId) {
      // Create next step
      await tx.documentRouting.create({
        data: {
          incomingDocId: currentStep.incomingDocId,
          stepOrder: currentStep.stepOrder + 1,
          assigneeId: data.nextAssigneeId,
          assignedById: user.id,
          status: "PENDING",
          deadline: data.deadline ? new Date(data.deadline) : null
        }
      });

      // Send LINE notification
      await sendLineNotifyForRouting(currentStep.incomingDoc.title, data.nextAssigneeId);
    } else {
      // If no next assignee, it means the flow ends here. 
      // Check if all routing steps are resolved
      const pendingSteps = await tx.documentRouting.findMany({
        where: {
          incomingDocId: currentStep.incomingDocId,
          status: "PENDING"
        }
      });

      if (pendingSteps.length === 0) {
        // Complete the document status
        await tx.incomingDocument.update({
          where: { id: currentStep.incomingDocId },
          data: { status: "COMPLETED" }
        });
      }
    }

    // Write system log
    await tx.systemLog.create({
      data: {
        actionType: "INCOMING_RESOLVE",
        description: `เกษียนหนังสือรับ: ${currentStep.incomingDoc.receiveNo} - ขั้นตอนที่ ${currentStep.stepOrder} (${data.resolution}) โดย ${user.name || "Unknown"}`,
        userId: user.id
      }
    });

    return updatedStep;
  });

  safeRevalidatePath(`/document/incoming/${result.incomingDocId}`);
  safeRevalidatePath("/document");
  return result;
}

// Cancel / Skip routing step
export async function skipRoutingStep(routingId: string) {
  const user = await getSessionUser();
  if (user.role !== "ADMIN" && user.role !== "DIRECTOR") {
    throw new Error("Unauthorized to skip routing step");
  }

  const result = await prisma.$transaction(async (tx) => {
    const step = await tx.documentRouting.findUnique({
      where: { id: routingId }
    });
    if (!step) throw new Error("Step not found");

    const updated = await tx.documentRouting.update({
      where: { id: routingId },
      data: {
        status: "SKIPPED",
        completedAt: new Date()
      }
    });

    safeRevalidatePath(`/document/incoming/${step.incomingDocId}`);
    return updated;
  });

  return result;
}

// Get count of pending routing tasks for user
export async function getMyPendingRoutingCount() {
  try {
    const user = await getSessionUser();
    return prisma.documentRouting.count({
      where: {
        assigneeId: user.id,
        status: "PENDING"
      }
    });
  } catch {
    return 0;
  }
}

// Get user's pending routing list
export async function getMyPendingRouting() {
  const user = await getSessionUser();
  return prisma.documentRouting.findMany({
    where: {
      assigneeId: user.id,
      status: "PENDING"
    },
    include: {
      incomingDoc: {
        include: {
          memoSection: true
        }
      },
      assignedBy: {
        select: { name: true, position: true }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

// Get incoming document list
export async function getIncomingDocsList(filters: {
  search?: string;
  memoSectionId?: string;
  urgencyLevel?: string;
  status?: string; // PENDING, ROUTING, COMPLETED, CANCELLED
}) {
  const where: any = {};
  if (filters.memoSectionId) where.memoSectionId = filters.memoSectionId;
  if (filters.urgencyLevel) where.urgencyLevel = filters.urgencyLevel;
  if (filters.status) where.status = filters.status;

  if (filters.search) {
    where.OR = [
      { receiveNo: { contains: filters.search, mode: "insensitive" } },
      { docRefNo: { contains: filters.search, mode: "insensitive" } },
      { title: { contains: filters.search, mode: "insensitive" } },
      { senderOrg: { contains: filters.search, mode: "insensitive" } }
    ];
  }

  return prisma.incomingDocument.findMany({
    where,
    include: {
      memoSection: true,
      createdBy: { select: { name: true } },
      routingSteps: {
        orderBy: { stepOrder: "asc" },
        include: {
          assignee: { select: { name: true, position: true } }
        }
      }
    },
    orderBy: {
      receiveDate: "desc"
    }
  });
}

// Get details of single incoming document along with routing timeline
export async function getIncomingDocDetails(id: string) {
  return prisma.incomingDocument.findUnique({
    where: { id },
    include: {
      memoSection: true,
      createdBy: { select: { name: true, position: true } },
      routingSteps: {
        orderBy: { stepOrder: "asc" },
        include: {
          assignee: { select: { name: true, position: true, signatureUrl: true } },
          assignedBy: { select: { name: true, position: true } }
        }
      }
    }
  });
}

// Helper: send LINE notification to the assignee of a routing step
async function sendLineNotifyForRouting(docTitle: string, assigneeId: string) {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "default" }
    });

    if (!settings?.enableLineNotify || !settings?.lineChannelAccessToken) return;

    const assignee = await prisma.user.findUnique({
      where: { id: assigneeId }
    });

    if (!assignee?.lineUserId) return; // User hasn't linked LINE account

    // Build message
    const message = `🔔 หนังสือราชการถึงคิวเกษียนของท่าน\n\nเรื่อง: ${docTitle}\nกรุณาเข้าสู่ระบบเพื่อลงความเห็น/เกษียนสั่งการ`;

    // Trigger notification via the custom API (often implemented via LINE Bot or generic fetch)
    // We send to assignee's LINE userId
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.lineChannelAccessToken}`
      },
      body: JSON.stringify({
        to: assignee.lineUserId,
        messages: [
          {
            type: "text",
            text: message
          }
        ]
      })
    });
  } catch (e) {
    console.error("Failed to send LINE notification for routing", e);
  }
}

export async function syncAMSSDocumentsFromHtml(html: string) {
  const user = await getSessionUser();
  const parsedDocs = parseAMSSListHtml(html);
  
  if (parsedDocs.length === 0) {
    throw new Error("ไม่พบรายการหนังสือรับที่ถูกต้องในรหัส HTML ที่ส่งมา");
  }

  // Parse represented years from parsedDocs to query baseline sequence numbers
  const years = Array.from(new Set(parsedDocs.map(d => {
    const parts = d.dateText.split(" ");
    if (parts.length >= 3) {
      let year = parseInt(parts[2]);
      if (!isNaN(year)) {
        if (year > 2400) {
          year = year - 543;
        } else if (year < 100) {
          year = year + 2500 - 543;
        }
        return year;
      }
    }
    return new Date().getFullYear();
  })));

  const result = await prisma.$transaction(async (tx) => {
    let importedCount = 0;
    let duplicatesCount = 0;

    const amssLinks = parsedDocs.map(d => d.amssLink).filter(Boolean);
    const refCombos = parsedDocs
      .filter(d => d.docRefNo && d.docRefNo.trim() !== "")
      .map(d => ({ docRefNo: d.docRefNo, senderOrg: d.senderOrg }));

    const existingDocs = await tx.incomingDocument.findMany({
      where: {
        OR: [
          { amssLink: { in: amssLinks } },
          ...refCombos
        ]
      },
      select: { amssLink: true, docRefNo: true, senderOrg: true }
    });

    // Fetch baseline sequence numbers for each represented year
    const yearDocsMap = new Map<number, number>();
    for (const yr of years) {
      const docs = await tx.incomingDocument.findMany({
        where: {
          receiveDate: {
            gte: new Date(`${yr}-01-01T00:00:00+07:00`),
            lt: new Date(`${yr + 1}-01-01T00:00:00+07:00`)
          }
        },
        select: { receiveNo: true }
      });
      
      let nextSeq = 1;
      for (const doc of docs) {
        if (doc.receiveNo) {
          const match = doc.receiveNo.match(/รับที่\s*(\d+)/);
          if (match) {
            const seq = parseInt(match[1]);
            if (seq >= nextSeq) {
              nextSeq = seq + 1;
            }
          }
        }
      }
      yearDocsMap.set(yr, nextSeq);
    }

    for (const d of parsedDocs) {
      const isDuplicate = existingDocs.some(existing => {
        if (existing.amssLink && d.amssLink && existing.amssLink === d.amssLink) {
          return true;
        }
        if (
          d.docRefNo && d.docRefNo.trim() !== "" &&
          existing.docRefNo && existing.docRefNo.trim() === d.docRefNo.trim() &&
          existing.senderOrg && existing.senderOrg.trim() === d.senderOrg.trim()
        ) {
          return true;
        }
        return false;
      });

      if (isDuplicate) {
        duplicatesCount++;
        continue;
      }

      // Convert dateText to Date object
      let parsedDate = new Date();
      const parts = d.dateText.split(" ");
      if (parts.length >= 3) {
        const day = parseInt(parts[0]);
        const thaiMonthsShort = [
          "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
          "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
        ];
        const monthIndex = thaiMonthsShort.indexOf(parts[1]);
        const monthIdx = monthIndex !== -1 ? monthIndex : 5;
        
        let year = parseInt(parts[2]);
        if (!isNaN(year)) {
          if (year > 2400) {
            year = year - 543;
          } else if (year < 100) {
            year = year + 2500 - 543;
          }
          parsedDate = new Date(Date.UTC(year, monthIdx, day, 0, 0, 0, 0));
        }
      }

      const yearVal = parsedDate.getUTCFullYear();
      const thYear = yearVal + 543;

      let nextSeq = yearDocsMap.get(yearVal) || 1;
      const generatedReceiveNo = `รับที่ ${nextSeq}/${thYear}`;
      yearDocsMap.set(yearVal, nextSeq + 1);

      await tx.incomingDocument.create({
        data: {
          receiveNo: generatedReceiveNo,
          receiveDate: parsedDate,
          senderOrg: d.senderOrg,
          docRefNo: d.docRefNo || null,
          title: d.title,
          urgencyLevel: "NORMAL",
          amssLink: d.amssLink,
          status: "PENDING",
          createdById: user.id
        }
      });

      existingDocs.push({
        amssLink: d.amssLink,
        docRefNo: d.docRefNo || null,
        senderOrg: d.senderOrg
      });

      importedCount++;
    }

    // Write system log
    await tx.systemLog.create({
      data: {
        actionType: "INCOMING_SYNC_HTML",
        description: `ซิงค์รายการหนังสือ AMSS++: นำเข้าใหม่ ${importedCount} รายการ, ซ้ำ ${duplicatesCount} รายการ`,
        userId: user.id
      }
    });

    return { importedCount, duplicatesCount };
  });

  safeRevalidatePath("/document");
  return result;
}
