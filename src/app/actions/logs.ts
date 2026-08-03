"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function getSystemLogsAction(filter?: {
  subsystem?: string;
  actionType?: string;
  month?: number;
  year?: number;
}) {
  const session = await getSession();
  const user = session?.user as any;

  if (user?.role !== "ADMIN" && user?.position !== "แอดมิน") {
    throw new Error("Unauthorized");
  }

  let whereClause: any = {};

  if (filter?.subsystem && filter.subsystem !== "ALL") {
    whereClause.subsystem = filter.subsystem;
  }

  if (filter?.actionType && filter.actionType !== "ALL") {
    whereClause.actionType = filter.actionType;
  }

  if (filter?.month && filter?.year) {
    const startOfMonth = new Date(filter.year, filter.month - 1, 1);
    const endOfMonth = new Date(filter.year, filter.month, 0, 23, 59, 59, 999);
    whereClause.createdAt = { gte: startOfMonth, lte: endOfMonth };
  } else if (filter?.year) {
    const startOfYear = new Date(filter.year, 0, 1);
    const endOfYear = new Date(filter.year, 11, 31, 23, 59, 59, 999);
    whereClause.createdAt = { gte: startOfYear, lte: endOfYear };
  }

  const logs = await prisma.systemLog.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return logs.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
  }));
}

export async function archiveSystemLogsAction(year: number, month: number) {
  const session = await getSession();
  const user = session?.user as any;

  if (user?.role !== "ADMIN" && user?.position !== "แอดมิน") {
    throw new Error("Unauthorized");
  }

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  const logsToArchive = await prisma.systemLog.findMany({
    where: {
      createdAt: { gte: startOfMonth, lte: endOfMonth },
    },
  });

  if (logsToArchive.length === 0) {
    throw new Error(`ไม่พบรายการบันทึกระบบในช่วงเดือน ${month}/${year}`);
  }

  const batchName = `${month}/${year + 543}`;

  // Store in archive
  const archive = await prisma.systemLogArchive.create({
    data: {
      year,
      month,
      batchName,
      logCount: logsToArchive.length,
      logsData: JSON.parse(JSON.stringify(logsToArchive)),
    },
  });

  // Delete archived logs from active systemLog table
  await prisma.systemLog.deleteMany({
    where: {
      createdAt: { gte: startOfMonth, lte: endOfMonth },
    },
  });

  return { success: true, count: logsToArchive.length, archiveId: archive.id };
}

export async function getSystemLogArchivesAction() {
  const session = await getSession();
  const user = session?.user as any;

  if (user?.role !== "ADMIN" && user?.position !== "แอดมิน") {
    throw new Error("Unauthorized");
  }

  const archives = await prisma.systemLogArchive.findMany({
    orderBy: { createdAt: "desc" },
  });

  return archives.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
  }));
}

export async function restoreSystemLogArchiveAction(archiveId: string) {
  const session = await getSession();
  const user = session?.user as any;

  if (user?.role !== "ADMIN" && user?.position !== "แอดมิน") {
    throw new Error("Unauthorized");
  }

  const archive = await prisma.systemLogArchive.findUnique({
    where: { id: archiveId },
  });

  if (!archive) {
    throw new Error("ไม่พบไฟล์จัดเก็บสำรอง System Log");
  }

  const logs = archive.logsData as any[];

  if (Array.isArray(logs) && logs.length > 0) {
    await prisma.systemLog.createMany({
      data: logs.map((l: any) => ({
        id: l.id,
        actionType: l.actionType || "LOG",
        subsystem: l.subsystem || "LEAVE",
        description: l.description,
        userId: l.userId,
        createdAt: new Date(l.createdAt),
        metadata: l.metadata || undefined,
      })),
      skipDuplicates: true,
    });
  }

  await prisma.systemLogArchive.delete({
    where: { id: archiveId },
  });

  return { success: true, restoredCount: logs?.length || 0 };
}
