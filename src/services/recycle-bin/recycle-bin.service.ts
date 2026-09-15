async function getPrisma(override?: any) {
  if (override) return override;
  try {
    const mod = await import("../../lib/db.ts");
    return mod.prisma;
  } catch {
    const mod = await import("@/lib/db.ts");
    return mod.prisma;
  }
}

async function getAttachmentLifecycle(override?: any) {
  if (override) return override;
  try {
    return await import("../storage/attachment-lifecycle.service.ts");
  } catch {
    return await import("@/services/storage/attachment-lifecycle.service.ts");
  }
}

export type RecycleBinItemType = "CERTIFICATE" | "DOCUMENT" | "LEAVE" | "EXAM_PAPER";

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

export interface BulkItemParam {
  type: RecycleBinItemType;
  id: string;
}

export interface BulkRestoreParams {
  items: BulkItemParam[];
  user: UserContext;
}

export interface BulkPurgeParams {
  items: BulkItemParam[];
  user: UserContext;
}

export interface BulkOperationResultItem {
  id: string;
  status: "SUCCESS" | "FAILED";
  error?: string;
  docNo?: string;
  newDocNo?: string;
}

export interface BulkOperationResult {
  totalRequested: number;
  successCount: number;
  failureCount: number;
  results: BulkOperationResultItem[];
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

  if (type === "EXAM_PAPER") {
    if (action === "PURGE") {
      // Hard purge is strictly Admin-only
      if (!isAdmin) {
        return { allowed: false, reason: "การลบข้อสอบถาวร (Purge) ทำได้เฉพาะผู้ดูแลระบบเท่านั้น" };
      }
      return { allowed: true };
    }

    // Soft-delete and Restore: Teacher creator or Admin
    if (isAdmin || (itemOwnerId && itemOwnerId === user.userId)) {
      return { allowed: true };
    }

    return { allowed: false, reason: "ท่านไม่มีสิทธิ์จัดการชุดข้อสอบของผู้อื่น" };
  }

  return { allowed: false, reason: "ประเภทรายการไม่ถูกต้อง" };
}

export class RecycleBinService {
  /**
   * Idempotent Soft-Delete Service with Row/Partition Locking
   */
  static async softDelete(params: SoftDeleteParams, dbClient?: any): Promise<SoftDeleteResult> {
    const { type, id, reason, user } = params;
    const prisma = await getPrisma(dbClient);

    // 1. Fetch system retention days
    const settings = await prisma.systemSettings.findFirst({
      select: { recycleBinRetentionDays: true },
    });
    const retentionDays = settings?.recycleBinRetentionDays || 30;
    const now = new Date();
    const staticPurgeAt = calculateStaticPurgeDate(now, retentionDays);

    if (type === "DOCUMENT" || type === "CERTIFICATE") {
      return await prisma.$transaction(async (tx: any) => {
        // 🛡️ Partition Lock: NO TIMELINE MUTATION WITHOUT PARTITION LOCK
        await tx.$queryRaw`
          SELECT id, "currentSeq" FROM "DocumentConfig"
          WHERE "docType" = ${type}
          FOR UPDATE;
        `;

        const record = await tx.documentRecord.findUnique({
          where: { id },
          select: { id: true, docType: true, createdById: true, isDeleted: true, status: true, docNo: true, purgeAt: true },
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
          return { success: true, message: "ALREADY_DELETED", purgeAt: record.purgeAt || staticPurgeAt };
        }

        await tx.documentRecord.update({
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
      });
    }

    if (type === "LEAVE") {
      return await prisma.$transaction(async (tx: any) => {
        const leave = await tx.leaveRequest.findUnique({
          where: { id },
          select: { id: true, userId: true, isDeleted: true, status: true, startDate: true, endDate: true, purgeAt: true },
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
          return { success: true, message: "ALREADY_DELETED", purgeAt: leave.purgeAt || staticPurgeAt };
        }

        // Invariant 56: State-Bound Leave Quota
        // Refund quota ONLY if status was APPROVED! PENDING/REJECTED leaves do not touch quota.
        let refundedDays = 0;
        if (leave.status === "APPROVED") {
          const start = new Date(leave.startDate);
          const end = new Date(leave.endDate);
          const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1);
          refundedDays = diffDays;
        }

        await tx.leaveRequest.update({
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
      });
    }

    if (type === "EXAM_PAPER") {
      return await prisma.$transaction(async (tx: any) => {
        const paper = await tx.examPaper.findUnique({
          where: { id },
          select: { id: true, createdById: true, isDeleted: true, purgeAt: true, title: true, subjectCode: true },
        });

        if (!paper) return { success: false, error: "ไม่พบชุดข้อสอบ" };

        const perm = evaluateRecycleBinPermission("DELETE", "EXAM_PAPER", user, paper.createdById);
        if (!perm.allowed) return { success: false, error: perm.reason };

        if (paper.isDeleted) {
          return { success: true, message: "ALREADY_DELETED", purgeAt: paper.purgeAt || staticPurgeAt };
        }

        await tx.examPaper.update({
          where: { id },
          data: {
            isDeleted: true,
            deletedAt: now,
            deletedById: user.userId,
            purgeAt: staticPurgeAt,
          },
        });

        await tx.examAuditLog.create({
          data: {
            examPaperIdSnapshot: paper.id,
            action: "PAPER_SOFT_DELETED",
            performedByUserId: user.userId,
            details: {
              reason: reason || "ย้ายชุดข้อสอบลงถังขยะ",
              title: paper.title,
              subjectCode: paper.subjectCode,
              purgeAt: staticPurgeAt.toISOString(),
            },
          },
        });

        return {
          success: true,
          purgeAt: staticPurgeAt,
        };
      }, { maxWait: 15000, timeout: 30000 });
    }

    return { success: false, error: "Invalid item type" };
  }

  /**
   * Idempotent Restore Service
   */
  static async restore(params: RestoreParams, dbClient?: any): Promise<RestoreResult> {
    const { type, id, user } = params;
    const prisma = await getPrisma(dbClient);

    if (type === "DOCUMENT") {
      return await prisma.$transaction(async (tx: any) => {
        // 🛡️ Partition Lock
        await tx.$queryRaw`
          SELECT id, "currentSeq" FROM "DocumentConfig"
          WHERE "docType" = 'DOCUMENT'
          FOR UPDATE;
        `;

        const record = await tx.documentRecord.findUnique({
          where: { id },
          select: { id: true, createdById: true, isDeleted: true, docNo: true, seqNo: true, year: true, docType: true },
        });

        if (!record) return { success: false, error: "ไม่พบเอกสาร" };

        const perm = evaluateRecycleBinPermission("RESTORE", "DOCUMENT", user, record.createdById);
        if (!perm.allowed) return { success: false, error: perm.reason };

        // Invariant 55: Idempotency check
        if (!record.isDeleted) {
          return { success: true, message: "ALREADY_ACTIVE", newDocNo: record.docNo || undefined };
        }

        // Invariant 60 / Collision Check:
        // Verify if another active document already took the same docNo
        if (record.docNo) {
          const collided = await tx.documentRecord.findFirst({
            where: {
              docNo: record.docNo,
              isDeleted: false,
              id: { not: record.id },
            },
          });

          if (collided) {
            return {
              success: false,
              error: `เลขที่เอกสาร ${record.docNo} ถูกนำไปใช้แล้วในระบบ ไม่สามารถกู้คืนได้ กรุณาติดต่อผู้ดูแลระบบ`,
            };
          }
        }

        await tx.documentRecord.update({
          where: { id },
          data: {
            isDeleted: false,
            deletedAt: null,
            deletedById: null,
            purgeAt: null,
            deleteReason: null,
          },
        });

        // Atomic AuditLog inside tx
        await tx.auditLog.create({
          data: {
            tableName: "DocumentRecord",
            recordId: record.id,
            action: "RESTORE_DOCUMENT",
            field: "isDeleted",
            oldValue: "true",
            newValue: "false",
            changedBy: user.userId,
            reason: `กู้คืนหนังสือราชการคงเลขเดิม (${record.docNo})`,
          },
        });

        return { success: true, newDocNo: record.docNo || undefined };
      });
    }

    if (type === "CERTIFICATE") {
      return await prisma.$transaction(async (tx: any) => {
        // 🛡️ Partition Lock: DocumentConfig FOR UPDATE
        const configs: any[] = await tx.$queryRaw`
          SELECT id, "currentSeq" FROM "DocumentConfig" 
          WHERE "docType" = 'CERTIFICATE'
          FOR UPDATE;
        `;

        let configId = configs[0]?.id;
        let currentSeq = configs[0]?.currentSeq !== undefined ? Number(configs[0].currentSeq) : 0;

        if (!configId) {
          const created = await tx.documentConfig.create({
            data: {
              docType: "CERTIFICATE",
              prefix: "",
              currentSeq: 0,
              useThaiNumerals: false,
              paddingDigits: 1,
              yearFormat: "TH_BE",
            },
          });
          configId = created.id;
          currentSeq = 0;
        }

        const record = await tx.documentRecord.findUnique({
          where: { id },
          select: { id: true, createdById: true, isDeleted: true, year: true, docType: true, title: true, docNo: true, seqNo: true },
        });

        if (!record) return { success: false, error: "ไม่พบเกียรติบัตร" };

        const perm = evaluateRecycleBinPermission("RESTORE", "CERTIFICATE", user, record.createdById);
        if (!perm.allowed) return { success: false, error: perm.reason };

        // Invariant 55: Idempotency check
        if (!record.isDeleted) {
          return { success: true, message: "ALREADY_ACTIVE", newDocNo: record.docNo || undefined, newSeqNo: record.seqNo || undefined };
        }

        // 🛡️ Invariant 2 & 3: Sole Sequence Allocator Authority & Disaster Recovery Sanity Check
        // MAX(seqNo) counts ALL records in history (including isDeleted = true)
        const maxRows: any[] = await tx.$queryRaw`
          SELECT COALESCE(MAX("seqNo"), 0) as "maxSeq"
          FROM "DocumentRecord"
          WHERE "docType" = 'CERTIFICATE';
        `;
        const dbMax = maxRows[0]?.maxSeq !== undefined ? Number(maxRows[0].maxSeq) : 0;

        // Auto-heal sequence drift under lock with Audited Invariant
        if (dbMax > currentSeq) {
          console.warn(`[CRITICAL INTEGRITY EVENT] Sequence drift detected: config.currentSeq=${currentSeq} < maxDbSeq=${dbMax}. Repairing authority under partition lock.`);
          await tx.auditLog.create({
            data: {
              tableName: "DocumentConfig",
              recordId: configId,
              action: "AUTO_HEAL_SEQUENCE_DRIFT",
              field: "currentSeq",
              oldValue: String(currentSeq),
              newValue: String(dbMax),
              changedBy: user.userId,
              reason: `CRITICAL INTEGRITY EVENT: ตรวจพบ seqNo ในประวัติ (${dbMax}) สูงกว่า currentSeq (${currentSeq}) ระบบทำการซ่อมแซมตัวเลขรันให้ตรงกับประวัติจริงโดยอัตโนมัติภายใต้ Partition Lock`,
            },
          });

          await tx.documentConfig.update({
            where: { id: configId },
            data: { currentSeq: dbMax },
          });

          currentSeq = dbMax;
        }

        // 🛡️ Invariant 4: Tail date only derives from ACTIVE (isDeleted = false) records
        const latestBatchRows: any[] = await tx.$queryRaw`
          SELECT MAX(date) as "latestDate"
          FROM "DocumentRecord"
          WHERE "docType" = 'CERTIFICATE' AND "isDeleted" = false;
        `;

        const latestDate = latestBatchRows[0]?.latestDate ? new Date(latestBatchRows[0].latestDate) : null;
        const nextSeq = currentSeq + 1;
        const restoreDate = computeRestoreDate(latestDate, new Date());
        const thYear = record.year || (new Date().getFullYear() + 543);
        const newDocNo = `${nextSeq}/${thYear}`;

        // Update DocumentConfig sequence
        await tx.documentConfig.update({
          where: { id: configId },
          data: { currentSeq: nextSeq },
        });

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

        // 🛡️ Invariant 5: "No Audit = No Commit"
        // If auditLog fails, the entire transaction rolls back
        await tx.auditLog.create({
          data: {
            tableName: "DocumentRecord",
            recordId: record.id,
            action: "RESTORE_REISSUE",
            field: "docNo",
            oldValue: record.docNo || "",
            newValue: newDocNo,
            changedBy: user.userId,
            reason: `กู้คืนเกียรติบัตรและจัดสรรเลขรันต่อท้ายไทม์ไลน์ (${record.docNo || "เดิม"} -> ${newDocNo})`,
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
      return await prisma.$transaction(async (tx: any) => {
        const leave = await tx.leaveRequest.findUnique({
          where: { id },
          select: { id: true, userId: true, isDeleted: true, status: true, startDate: true, endDate: true },
        });

        if (!leave) return { success: false, error: "ไม่พบใบลา" };

        const perm = evaluateRecycleBinPermission("RESTORE", "LEAVE", user, leave.userId);
        if (!perm.allowed) return { success: false, error: perm.reason };

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

        await tx.leaveRequest.update({
          where: { id },
          data: {
            isDeleted: false,
            deletedAt: null,
            deletedById: null,
            purgeAt: null,
            deleteReason: null,
          },
        });

        await tx.auditLog.create({
          data: {
            tableName: "LeaveRequest",
            recordId: leave.id,
            action: "RESTORE_LEAVE",
            field: "isDeleted",
            oldValue: "true",
            newValue: "false",
            changedBy: user.userId,
            reason: `กู้คืนใบลา (สถานะ: ${leave.status}, หักโควตาคืน: ${deductedDays} วัน)`,
          },
        });

        return {
          success: true,
          deductedQuotaDays: deductedDays,
        };
      });
    }

    if (type === "EXAM_PAPER") {
      return await prisma.$transaction(async (tx: any) => {
        const paper = await tx.examPaper.findUnique({
          where: { id },
          select: { id: true, createdById: true, isDeleted: true, title: true, subjectCode: true, academicYear: true, term: true },
        });

        if (!paper) return { success: false, error: "ไม่พบชุดข้อสอบ" };

        const perm = evaluateRecycleBinPermission("RESTORE", "EXAM_PAPER", user, paper.createdById);
        if (!perm.allowed) return { success: false, error: perm.reason };

        if (!paper.isDeleted) {
          return { success: true, message: "ALREADY_ACTIVE" };
        }

        // Conflict check: Active paper with same subjectCode, academicYear, term, title for this teacher
        const existingActive = await tx.examPaper.findFirst({
          where: {
            createdById: paper.createdById,
            isDeleted: false,
            subjectCode: paper.subjectCode,
            academicYear: paper.academicYear,
            term: paper.term,
            title: paper.title,
            id: { not: id },
          },
        });

        let restoredTitle = paper.title;
        let conflictRenamed = false;
        if (existingActive) {
          conflictRenamed = true;
          const now = new Date();
          const dateFormatted = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear() + 543} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          restoredTitle = `${paper.title} (กู้คืนเมื่อ ${dateFormatted})`;
        }

        await tx.examPaper.update({
          where: { id },
          data: {
            title: restoredTitle,
            isDeleted: false,
            deletedAt: null,
            deletedById: null,
            purgeAt: null,
          },
        });

        await tx.examAuditLog.create({
          data: {
            examPaperIdSnapshot: paper.id,
            action: conflictRenamed ? "PAPER_RESTORED_CONFLICT_RENAMED" : "PAPER_RESTORED",
            performedByUserId: user.userId,
            details: {
              originalTitle: paper.title,
              restoredTitle: restoredTitle,
              conflictRenamed,
              subjectCode: paper.subjectCode,
            },
          },
        });

        return {
          success: true,
          message: conflictRenamed ? `กู้คืนชุดข้อสอบสำเร็จ (เปลี่ยนชื่อเป็น "${restoredTitle}" เพื่อป้องกันชื่อซ้ำ)` : "กู้คืนชุดข้อสอบสำเร็จ",
          newDocNo: paper.subjectCode,
        };
      }, { maxWait: 15000, timeout: 30000 });
    }

    return { success: false, error: "Invalid item type" };
  }

  /**
   * Permanent Purge Service with FileAttachment Reference Lifecycle Cleanup
   */
  static async purge(params: PurgeParams, dbClient?: any, lifecycleService?: any): Promise<PurgeResult> {
    const { type, id, user } = params;
    const prisma = await getPrisma(dbClient);
    const lifecycle = await getAttachmentLifecycle(lifecycleService);

    const perm = evaluateRecycleBinPermission("PURGE", type, user);
    if (!perm.allowed) return { success: false, error: perm.reason };

    if (type === "DOCUMENT" || type === "CERTIFICATE") {
      return await prisma.$transaction(async (tx: any) => {
        const record = await tx.documentRecord.findUnique({
          where: { id },
          include: { attachments: true },
        });

        if (!record) return { success: false, error: "ไม่พบเอกสาร" };

        let releasedCount = 0;
        // Invariant: Release attachment references before hard deleting row
        if (record.attachments && record.attachments.length > 0) {
          for (const att of record.attachments) {
            if (typeof lifecycle?.releaseAttachmentReference === "function") {
              await lifecycle.releaseAttachmentReference(tx, att.id);
            } else if (typeof tx._releaseAttachment === "function") {
              tx._releaseAttachment(att.id);
            }
            releasedCount++;
          }
        }

        await tx.documentRecord.delete({ where: { id } });
        return { success: true, releasedAttachmentCount: releasedCount };
      });
    }

    if (type === "LEAVE") {
      return await prisma.$transaction(async (tx: any) => {
        const leave = await tx.leaveRequest.findUnique({
          where: { id },
          include: { attachments: true },
        });

        if (!leave) return { success: false, error: "ไม่พบใบลา" };

        let releasedCount = 0;
        if (leave.attachments && leave.attachments.length > 0) {
          for (const att of leave.attachments) {
            if (typeof lifecycle?.releaseAttachmentReference === "function") {
              await lifecycle.releaseAttachmentReference(tx, att.id);
            } else if (typeof tx._releaseAttachment === "function") {
              tx._releaseAttachment(att.id);
            }
            releasedCount++;
          }
        }

        await tx.leaveRequest.delete({ where: { id } });
        return { success: true, releasedAttachmentCount: releasedCount };
      });
    }

    if (type === "EXAM_PAPER") {
      return await prisma.$transaction(async (tx: any) => {
        const paper = await tx.examPaper.findUnique({
          where: { id },
          select: { id: true, createdById: true },
        });

        if (!paper) return { success: false, error: "ไม่พบชุดข้อสอบ" };

        await tx.examPaper.delete({ where: { id } });
        return { success: true };
      });
    }

    return { success: false, error: "Invalid item type" };
  }

  /**
   * Bulk Restore with Per-Item Transaction Isolation
   */
  static async bulkRestore(params: BulkRestoreParams, dbClient?: any): Promise<BulkOperationResult> {
    const { items, user } = params;
    const results: BulkOperationResultItem[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const item of items) {
      try {
        const res = await RecycleBinService.restore(
          { type: item.type, id: item.id, user },
          dbClient
        );
        if (res.success) {
          successCount++;
          results.push({
            id: item.id,
            status: "SUCCESS",
            newDocNo: res.newDocNo,
          });
        } else {
          failureCount++;
          results.push({
            id: item.id,
            status: "FAILED",
            error: res.error || "ไม่สามารถกู้คืนได้",
          });
        }
      } catch (err: any) {
        failureCount++;
        results.push({
          id: item.id,
          status: "FAILED",
          error: err?.message || "เกิดข้อผิดพลาดในการกู้คืน",
        });
      }
    }

    return {
      totalRequested: items.length,
      successCount,
      failureCount,
      results,
    };
  }

  /**
   * Bulk Purge with Per-Item Transaction Isolation
   */
  static async bulkPurge(params: BulkPurgeParams, dbClient?: any, lifecycleService?: any): Promise<BulkOperationResult> {
    const { items, user } = params;
    const results: BulkOperationResultItem[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const item of items) {
      try {
        const res = await RecycleBinService.purge(
          { type: item.type, id: item.id, user },
          dbClient,
          lifecycleService
        );
        if (res.success) {
          successCount++;
          results.push({
            id: item.id,
            status: "SUCCESS",
          });
        } else {
          failureCount++;
          results.push({
            id: item.id,
            status: "FAILED",
            error: res.error || "ไม่สามารถลบถาวรได้",
          });
        }
      } catch (err: any) {
        failureCount++;
        results.push({
          id: item.id,
          status: "FAILED",
          error: err?.message || "เกิดข้อผิดพลาดในการลบถาวร",
        });
      }
    }

    return {
      totalRequested: items.length,
      successCount,
      failureCount,
      results,
    };
  }

  /**
   * Validates Chrono-Sequential Bounded Modification with Row-Level Locks and Partition Lock (Invariant 57)
   */
  static async validateChronoBounds(params: ChronoDateCheckParams, dbClient?: any): Promise<void> {
    const { docType, year, seqNo, targetDate } = params;
    const prisma = await getPrisma(dbClient);

    // 🛡️ Partition Lock
    await prisma.$queryRaw`
      SELECT id, "currentSeq" FROM "DocumentConfig"
      WHERE "docType" = ${docType}
      FOR UPDATE;
    `;

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
  }, dbClient?: any): Promise<RecycleBinItemViewModel[]> {
    const { type, search, userId, isAdmin } = params;
    const prisma = await getPrisma(dbClient);
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

    // 3. Fetch Exam Papers (Admin sees all, Teacher sees own)
    if (!type || type === "EXAM_PAPER") {
      const examWhere: any = { isDeleted: true };
      if (!isAdmin && userId) {
        examWhere.createdById = userId;
      }
      if (search) {
        examWhere.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { subjectCode: { contains: search, mode: "insensitive" } },
          { subjectName: { contains: search, mode: "insensitive" } },
        ];
      }

      const papers = await prisma.examPaper.findMany({
        where: examWhere,
        include: {
          createdBy: { select: { name: true } },
          deletedBy: { select: { name: true } },
        },
        orderBy: { deletedAt: "desc" },
      });

      for (const p of papers) {
        const purgeDate = p.purgeAt || calculateStaticPurgeDate(p.deletedAt || now);
        results.push({
          id: p.id,
          type: "EXAM_PAPER",
          title: `[${p.subjectCode}] ${p.subjectName} - ${p.title}`,
          docNo: p.subjectCode,
          originalDate: p.createdAt,
          deletedAt: p.deletedAt || now,
          purgeAt: purgeDate,
          deletedById: p.deletedById || undefined,
          deletedByName: p.deletedBy?.name || undefined,
          daysRemaining: calculateDaysRemaining(purgeDate, now),
          status: "DELETED",
          createdById: p.createdById,
          createdByName: p.createdBy?.name || undefined,
        });
      }
    }

    return results;
  }
}
