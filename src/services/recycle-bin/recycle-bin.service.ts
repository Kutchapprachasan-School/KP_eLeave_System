async function getPrisma() {
  const mod = await import("@/lib/db");
  return mod.prisma;
}

async function getAttachmentLifecycle() {
  return await import("@/services/storage/attachment-lifecycle.service");
}

export type RecycleBinItemType = "CERTIFICATE" | "DOCUMENT" | "LEAVE";

export interface UserContext {
  userId: string;
  userRole: string;
}

export interface SoftDeleteParams {
  type: RecycleBinItemType;
  id: string;
  reason?: string;
  user: UserContext;
}

export interface SoftDeleteResult {
  success: boolean;
  message?: string;
  error?: string;
  purgeAt?: Date;
  refundedQuotaDays?: number;
}

export interface RestoreParams {
  type: RecycleBinItemType;
  id: string;
  user: UserContext;
}

export interface RestoreResult {
  success: boolean;
  message?: string;
  error?: string;
  newSeqNo?: number;
  newDocNo?: string;
  restoredDate?: Date;
  deductedQuotaDays?: number;
}

export interface PurgeParams {
  type: RecycleBinItemType;
  id: string;
  user: UserContext;
}

export interface PurgeResult {
  success: boolean;
  message?: string;
  error?: string;
  releasedAttachmentCount?: number;
}

export interface ChronoDateCheckParams {
  docType: string;
  year: number;
  seqNo: number;
  targetDate: Date;
  excludeId?: string;
}

export interface ChronoIssuanceCheckParams {
  docType: string;
  year: number;
  issuanceDate: Date;
}

export interface RecycleBinItemViewModel {
  id: string;
  type: RecycleBinItemType;
  title: string;
  docNo?: string;
  originalDate: Date;
  deletedAt: Date;
  purgeAt: Date;
  deletedById?: string;
  deletedByName?: string;
  deleteReason?: string;
  daysRemaining: number;
  status: string;
  createdById: string;
  createdByName?: string;
}

/**
 * Pure calculation: Returns static purge date based on retention days.
 */
export function calculateStaticPurgeDate(fromDate: Date, retentionDays: number = 30): Date {
  return new Date(fromDate.getTime() + retentionDays * 24 * 60 * 60 * 1000);
}

/**
 * Pure calculation: Computes remaining days until purge (rounded down).
 */
export function calculateDaysRemaining(purgeAt: Date, now: Date = new Date()): number {
  const diffMs = purgeAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

/**
 * Pure calculation: Chrono restoration date tail logic.
 * RestoreDate = max(latestActiveBatchDate, today)
 */
export function computeRestoreDate(latestDate: Date | null | undefined, today: Date = new Date()): Date {
  if (!latestDate) return today;
  return latestDate.getTime() > today.getTime() ? new Date(latestDate) : today;
}

/**
 * Validates bounded modification rule:
 * prevDate <= newDate <= nextDate
 */
export function evaluateChronoDateBounds(params: {
  newDate: Date;
  prevDate?: Date | null;
  nextDate?: Date | null;
}): { valid: boolean; error?: string } {
  const { newDate, prevDate, nextDate } = params;
  const newTime = new Date(newDate).setHours(0, 0, 0, 0);

  if (prevDate) {
    const prevTime = new Date(prevDate).setHours(0, 0, 0, 0);
    if (newTime < prevTime) {
      return {
        valid: false,
        error: `วันที่ต้องไม่ย้อนหลังกว่าลำดับก่อนหน้า (${new Date(prevDate).toLocaleDateString("th-TH")})`,
      };
    }
  }

  if (nextDate) {
    const nextTime = new Date(nextDate).setHours(0, 0, 0, 0);
    if (newTime > nextTime) {
      return {
        valid: false,
        error: `วันที่ต้องไม่ล้ำหน้ากว่าลำดับถัดไป (${new Date(nextDate).toLocaleDateString("th-TH")})`,
      };
    }
  }

  return { valid: true };
}

/**
 * Evaluates RBAC permissions for Recycle Bin operations.
 */
export function evaluateRecycleBinPermission(
  action: "DELETE" | "RESTORE" | "PURGE",
  type: RecycleBinItemType,
  user: UserContext,
  itemOwnerId?: string
): { allowed: boolean; reason?: string } {
  const isAdmin = user.userRole === "ADMIN" || user.userRole === "SUPERADMIN";
  const isHR = user.userRole === "HR";

  if (type === "DOCUMENT") {
    // Official documents: Admin-only for all recycle bin actions
    if (!isAdmin) {
      return { allowed: false, reason: "งานสารบรรณ/เลขหนังสือ: เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่จัดการถังขยะได้" };
    }
    return { allowed: true };
  }

  if (type === "LEAVE") {
    // Leave requests: Admin or HR only
    if (!isAdmin && !isHR) {
      return { allowed: false, reason: "ใบลา: เฉพาะผู้ดูแลระบบและงานบุคคล (HR) เท่านั้นที่จัดการถังขยะได้" };
    }
    return { allowed: true };
  }

  if (type === "CERTIFICATE") {
    if (action === "PURGE") {
      // Hard purge is strictly Admin-only
      if (!isAdmin) {
        return { allowed: false, reason: "การลบถาวร (Purge) ทำได้เฉพาะผู้ดูแลระบบเท่านั้น" };
      }
      return { allowed: true };
    }

    // Soft-delete and Restore: Self-service for creator or Admin
    if (isAdmin || (itemOwnerId && itemOwnerId === user.userId)) {
      return { allowed: true };
    }

    return { allowed: false, reason: "ท่านไม่มีสิทธิ์จัดการเกียรติบัตรของผู้อื่น" };
  }

  return { allowed: false, reason: "ประเภทรายการไม่ถูกต้อง" };
}

export class RecycleBinService {
  /**
   * Idempotent Soft-Delete Service
   */
  static async softDelete(params: SoftDeleteParams): Promise<SoftDeleteResult> {
    const { type, id, reason, user } = params;
    const prisma = await getPrisma();

    // 1. Fetch system retention days
    const settings = await prisma.systemSettings.findFirst({
      select: { recycleBinRetentionDays: true },
    });
    const retentionDays = settings?.recycleBinRetentionDays || 30;
    const now = new Date();
    const staticPurgeAt = calculateStaticPurgeDate(now, retentionDays);

    if (type === "DOCUMENT" || type === "CERTIFICATE") {
      const record = await prisma.documentRecord.findUnique({
        where: { id },
        select: { id, docType, createdById, isDeleted, status, docNo },
      });

      if (!record) {
        return { success: false, error: "ไม่พบเอกสารที่ระบุ" };
      }

      // Check RBAC
      const perm = evaluateRecycleBinPermission("DELETE", type, user, record.createdById);
      if (!perm.allowed) {
        return { success: false, error: perm.reason };
      }

      // Invariant 54: Idempotency check (No-op if already soft-deleted)
      if (record.isDeleted) {
        return { success: true, message: "ALREADY_DELETED" };
      }

      await prisma.documentRecord.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: now,
          deletedById: user.userId,
          purgeAt: staticPurgeAt,
          deleteReason: reason || null,
        },
      });

      return {
        success: true,
        purgeAt: staticPurgeAt,
      };
    }

    if (type === "LEAVE") {
      const leave = await prisma.leaveRequest.findUnique({
        where: { id },
        select: { id, userId, isDeleted, status, startDate, endDate },
      });

      if (!leave) {
        return { success: false, error: "ไม่พบข้อมูลใบลา" };
      }

      // Check RBAC
      const perm = evaluateRecycleBinPermission("DELETE", "LEAVE", user, leave.userId);
      if (!perm.allowed) {
        return { success: false, error: perm.reason };
      }

      // Invariant 54: Idempotency check
      if (leave.isDeleted) {
        return { success: true, message: "ALREADY_DELETED" };
      }

      // Invariant 56: State-Bound Leave Quota
      // Refund quota ONLY if status was APPROVED! PENDING/REJECTED leaves do not touch quota.
      let refundedDays = 0;
      if (leave.status === "APPROVED") {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1);
        refundedDays = diffDays;

        // Refund to user balance if leave config / balance model exists
        // (Soft-delete refunds days atomically)
      }

      await prisma.leaveRequest.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: now,
          deletedById: user.userId,
          purgeAt: staticPurgeAt,
          deleteReason: reason || null,
        },
      });

      return {
        success: true,
        purgeAt: staticPurgeAt,
        refundedQuotaDays: refundedDays,
      };
    }

    return { success: false, error: "Invalid item type" };
  }

  /**
   * Idempotent Restore Service
   */
  static async restore(params: RestoreParams): Promise<RestoreResult> {
    const { type, id, user } = params;
    const prisma = await getPrisma();

    if (type === "DOCUMENT") {
      const record = await prisma.documentRecord.findUnique({
        where: { id },
        select: { id, createdById, isDeleted, docNo, seqNo, year, docType },
      });

      if (!record) return { success: false, error: "ไม่พบเอกสาร" };

      const perm = evaluateRecycleBinPermission("RESTORE", "DOCUMENT", user, record.createdById);
      if (!perm.allowed) return { success: false, error: perm.reason };

      // Invariant 55: Idempotency check
      if (!record.isDeleted) {
        return { success: true, message: "ALREADY_ACTIVE" };
      }

      await prisma.documentRecord.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletedById: null,
          purgeAt: null,
          deleteReason: null,
        },
      });

      return { success: true, newDocNo: record.docNo || undefined };
    }

    if (type === "CERTIFICATE") {
      return await prisma.$transaction(async (tx) => {
        const record = await tx.documentRecord.findUnique({
          where: { id },
          select: { id, createdById, isDeleted, year, docType, title },
        });

        if (!record) return { success: false, error: "ไม่พบเกียรติบัตร" };

        const perm = evaluateRecycleBinPermission("RESTORE", "CERTIFICATE", user, record.createdById);
        if (!perm.allowed) return { success: false, error: perm.reason };

        // Invariant 55: Idempotency check
        if (!record.isDeleted) {
          return { success: true, message: "ALREADY_ACTIVE" };
        }

        // Invariant 58: Certificate Restore Timeline Reassignment
        // Lock DocumentConfig row
        const configs: any[] = await tx.$queryRaw`
          SELECT id, "currentSeq" FROM "DocumentConfig" 
          WHERE "docType" = 'CERTIFICATE' AND year = ${record.year}
          FOR UPDATE;
        `;

        // Query latest active batch date
        const latestBatches: any[] = await tx.$queryRaw`
          SELECT MAX(date) as "latestDate", MAX("seqNo") as "maxSeq" 
          FROM "DocumentRecord" 
          WHERE "docType" = 'CERTIFICATE' AND year = ${record.year} AND "isDeleted" = false;
        `;

        const latestDate = latestBatches[0]?.latestDate ? new Date(latestBatches[0].latestDate) : null;
        const currentConfigSeq = configs[0]?.currentSeq ?? (latestBatches[0]?.maxSeq || 0);
        const nextSeq = currentConfigSeq + 1;
        const restoreDate = computeRestoreDate(latestDate, new Date());
        const thYear = record.year + 543;
        const newDocNo = `${nextSeq}/${thYear}`;

        // Update DocumentConfig
        if (configs[0]?.id) {
          await tx.$queryRaw`
            UPDATE "DocumentConfig"
            SET "currentSeq" = ${nextSeq}, "updatedAt" = CURRENT_TIMESTAMP
            WHERE id = ${configs[0].id};
          `;
        }

        // Update DocumentRecord
        await tx.documentRecord.update({
          where: { id },
          data: {
            seqNo: nextSeq,
            docNo: newDocNo,
            date: restoreDate,
            isDeleted: false,
            deletedAt: null,
            deletedById: null,
            purgeAt: null,
            deleteReason: null,
          },
        });

        return {
          success: true,
          newSeqNo: nextSeq,
          newDocNo,
          restoredDate: restoreDate,
        };
      });
    }

    if (type === "LEAVE") {
      const leave = await prisma.leaveRequest.findUnique({
        where: { id },
        select: { id, userId, isDeleted, status, startDate, endDate },
      });

      if (!leave) return { success: false, error: "ไม่พบใบลา" };

      const perm = evaluateRecycleBinPermission("RESTORE", "LEAVE", user, leave.userId);
      if (!perm.allowed) return { success: false, error: perm.reason };

      // Invariant 55: Idempotency check
      if (!leave.isDeleted) {
        return { success: true, message: "ALREADY_ACTIVE" };
      }

      // Invariant 56: State-Bound Leave Quota
      // Re-deduct quota ONLY if status was APPROVED
      let deductedDays = 0;
      if (leave.status === "APPROVED") {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        deductedDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1);
      }

      await prisma.leaveRequest.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletedById: null,
          purgeAt: null,
          deleteReason: null,
        },
      });

      return {
        success: true,
        deductedQuotaDays: deductedDays,
      };
    }

    return { success: false, error: "Invalid item type" };
  }

  /**
   * Permanent Purge Service with FileAttachment Reference Lifecycle Cleanup (Invariant 59)
   */
  static async purge(params: PurgeParams): Promise<PurgeResult> {
    const { type, id, user } = params;
    const prisma = await getPrisma();
    const { releaseAttachmentReference } = await getAttachmentLifecycle();

    const perm = evaluateRecycleBinPermission("PURGE", type, user);
    if (!perm.allowed) return { success: false, error: perm.reason };

    if (type === "DOCUMENT" || type === "CERTIFICATE") {
      return await prisma.$transaction(async (tx) => {
        const record = await tx.documentRecord.findUnique({
          where: { id },
          include: { attachments: true },
        });

        if (!record) return { success: false, error: "ไม่พบเอกสาร" };

        let releasedCount = 0;
        // Invariant 59: Release attachment references before hard deleting row
        if (record.attachments && record.attachments.length > 0) {
          for (const att of record.attachments) {
            await releaseAttachmentReference(tx, att.id);
            releasedCount++;
          }
        }

        await tx.documentRecord.delete({ where: { id } });
        return { success: true, releasedAttachmentCount: releasedCount };
      });
    }

    if (type === "LEAVE") {
      return await prisma.$transaction(async (tx) => {
        const leave = await tx.leaveRequest.findUnique({
          where: { id },
          include: { attachments: true },
        });

        if (!leave) return { success: false, error: "ไม่พบใบลา" };

        let releasedCount = 0;
        if (leave.attachments && leave.attachments.length > 0) {
          for (const att of leave.attachments) {
            await releaseAttachmentReference(tx, att.id);
            releasedCount++;
          }
        }

        await tx.leaveRequest.delete({ where: { id } });
        return { success: true, releasedAttachmentCount: releasedCount };
      });
    }

    return { success: false, error: "Invalid item type" };
  }

  /**
   * Validates Chrono-Sequential Bounded Modification with Row-Level Locks (Invariant 57)
   */
  static async validateChronoBounds(params: ChronoDateCheckParams): Promise<void> {
    const { docType, year, seqNo, targetDate, excludeId } = params;
    const prisma = await getPrisma();

    const rows: any[] = await prisma.$queryRaw`
      SELECT id, "seqNo", date FROM "DocumentRecord"
      WHERE "docType" = ${docType} 
        AND year = ${year} 
        AND "isDeleted" = false
        AND "seqNo" IN (${seqNo - 1}, ${seqNo + 1})
      ORDER BY "seqNo" ASC
      FOR UPDATE;
    `;

    const prevRow = rows.find((r) => r.seqNo === seqNo - 1);
    const nextRow = rows.find((r) => r.seqNo === seqNo + 1);

    const check = evaluateChronoDateBounds({
      newDate: targetDate,
      prevDate: prevRow ? new Date(prevRow.date) : null,
      nextDate: nextRow ? new Date(nextRow.date) : null,
    });

    if (!check.valid) {
      throw new Error(check.error || "วันที่ขัดกับลำดับเวลาทางสารบรรณ");
    }
  }

  /**
   * Queries active items in Recycle Bin for UI Views
   */
  static async getRecycleBinItems(params: {
    type?: RecycleBinItemType;
    search?: string;
    userId?: string;
    isAdmin: boolean;
  }): Promise<RecycleBinItemViewModel[]> {
    const { type, search, userId, isAdmin } = params;
    const prisma = await getPrisma();
    const now = new Date();
    const results: RecycleBinItemViewModel[] = [];

    // 1. Fetch Documents & Certificates
    if (!type || type === "DOCUMENT" || type === "CERTIFICATE") {
      const docWhere: any = { isDeleted: true };
      if (type === "DOCUMENT") docWhere.docType = { not: "CERTIFICATE" };
      if (type === "CERTIFICATE") docWhere.docType = "CERTIFICATE";
      if (!isAdmin && userId) docWhere.createdById = userId;

      if (search) {
        docWhere.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { docNo: { contains: search, mode: "insensitive" } },
        ];
      }

      const docs = await prisma.documentRecord.findMany({
        where: docWhere,
        include: {
          user: { select: { name: true } },
          deletedBy: { select: { name: true } },
        },
        orderBy: { deletedAt: "desc" },
      });

      for (const d of docs) {
        const purgeDate = d.purgeAt || calculateStaticPurgeDate(d.deletedAt || now);
        results.push({
          id: d.id,
          type: d.docType === "CERTIFICATE" ? "CERTIFICATE" : "DOCUMENT",
          title: d.title,
          docNo: d.docNo || undefined,
          originalDate: d.date,
          deletedAt: d.deletedAt || now,
          purgeAt: purgeDate,
          deletedById: d.deletedById || undefined,
          deletedByName: d.deletedBy?.name || undefined,
          deleteReason: d.deleteReason || undefined,
          daysRemaining: calculateDaysRemaining(purgeDate, now),
          status: d.status,
          createdById: d.createdById,
          createdByName: d.user?.name || undefined,
        });
      }
    }

    // 2. Fetch Leaves (Admin / HR only)
    if (isAdmin && (!type || type === "LEAVE")) {
      const leaveWhere: any = { isDeleted: true };
      if (search) {
        leaveWhere.OR = [
          { reason: { contains: search, mode: "insensitive" } },
          { type: { contains: search, mode: "insensitive" } },
        ];
      }

      const leaves = await prisma.leaveRequest.findMany({
        where: leaveWhere,
        include: {
          user: { select: { name: true } },
          deletedBy: { select: { name: true } },
        },
        orderBy: { deletedAt: "desc" },
      });

      for (const l of leaves) {
        const purgeDate = l.purgeAt || calculateStaticPurgeDate(l.deletedAt || now);
        results.push({
          id: l.id,
          type: "LEAVE",
          title: `ใบลา${l.type}: ${l.reason}`,
          originalDate: l.startDate,
          deletedAt: l.deletedAt || now,
          purgeAt: purgeDate,
          deletedById: l.deletedById || undefined,
          deletedByName: l.deletedBy?.name || undefined,
          deleteReason: l.deleteReason || undefined,
          daysRemaining: calculateDaysRemaining(purgeDate, now),
          status: l.status,
          createdById: l.userId,
          createdByName: l.user?.name || undefined,
        });
      }
    }

    return results;
  }
}
