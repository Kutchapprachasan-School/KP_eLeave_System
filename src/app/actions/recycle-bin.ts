"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { revalidatePath } from "next/cache";
import {
  RecycleBinService,
  type RecycleBinItemType,
  type RecycleBinItemViewModel,
  calculateDaysRemaining,
} from "@/services/recycle-bin/recycle-bin.service";

interface AuthUser {
  id: string;
  role: string;
  name: string;
}

async function getAuthenticatedUser(): Promise<AuthUser> {
  if (process.env.BYPASS_AUTH === "true") {
    const user = await prisma.user.findFirst();
    if (user) return { id: user.id, role: user.role, name: user.name || "Test User" };
    const created = await prisma.user.create({
      data: {
        id: "test-user-id",
        name: "Test User",
        email: "test@example.com",
        role: "ADMIN",
        isApproved: true,
      },
    });
    return { id: created.id, role: created.role, name: created.name || "Test User" };
  }

  const session = await getSession();
  const user = session?.user as any;
  if (!user) throw new Error("Unauthorized");
  return {
    id: user.id as string,
    role: (user.role || "TEACHER") as string,
    name: (user.name || "User") as string,
  };
}

function safeRevalidate() {
  try {
    revalidatePath("/admin/recycle-bin");
    revalidatePath("/document");
    revalidatePath("/leave");
  } catch (e) {
    // Non-fatal in testing or background environments
  }
}

/**
 * Fetch items in Recycle Bin according to user role and filters.
 * Admin sees all; Regular users see only their own certificates.
 */
export async function getRecycleBinItemsAction(filters: {
  type?: RecycleBinItemType;
  search?: string;
}): Promise<{ success: boolean; data?: RecycleBinItemViewModel[]; error?: string }> {
  try {
    const user = await getAuthenticatedUser();
    const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";

    const items = await RecycleBinService.getRecycleBinItems({
      type: filters.type,
      search: filters.search,
      userId: user.id,
      isAdmin,
    });

    return { success: true, data: items };
  } catch (err: any) {
    console.error("🔒 [RecycleBin Action Error - getRecycleBinItemsAction]:", err);
    return { success: false, error: err.message || "เกิดข้อผิดพลาดในการโหลดรายการถังขยะ" };
  }
}

/**
 * Soft Delete item to 30-day Recycle Bin
 */
export async function softDeleteRecycleBinItemAction(
  type: RecycleBinItemType,
  id: string,
  reason?: string
): Promise<{ success: boolean; purgeAt?: Date; refundedQuotaDays?: number; error?: string }> {
  try {
    const user = await getAuthenticatedUser();
    const res = await RecycleBinService.softDelete({
      type,
      id,
      reason,
      user: { userId: user.id, userRole: user.role },
    });

    if (!res.success) {
      return { success: false, error: res.error || "ไม่สามารถย้ายลงถังขยะได้" };
    }

    // System audit log
    await prisma.systemLog.create({
      data: {
        actionType: "RECYCLE_BIN_SOFT_DELETE",
        subsystem: type === "LEAVE" ? "LEAVE" : "DOCUMENT",
        description: `ย้ายรายการ (${type} ID: ${id}) ลงถังขยะ ${reason ? `เหตุผล: ${reason}` : ""} โดยผู้ใช้ ${user.name} (${user.id})`,
        userId: user.id,
      },
    });

    safeRevalidate();
    return {
      success: true,
      purgeAt: res.purgeAt,
      refundedQuotaDays: res.refundedQuotaDays,
    };
  } catch (err: any) {
    console.error("🔒 [RecycleBin Action Error - softDeleteRecycleBinItemAction]:", err);
    return { success: false, error: err.message || "เกิดข้อผิดพลาดในการลบรายการ" };
  }
}

/**
 * Restore item from Recycle Bin
 * If Certificate: automatically and atomically reassigns to timeline tail (latestDate, nextSeq)
 */
export async function restoreRecycleBinItemAction(
  type: RecycleBinItemType,
  id: string
): Promise<{
  success: boolean;
  newSeqNo?: number;
  newDocNo?: string;
  restoredDate?: Date;
  deductedQuotaDays?: number;
  error?: string;
}> {
  try {
    const user = await getAuthenticatedUser();
    const res = await RecycleBinService.restore({
      type,
      id,
      user: { userId: user.id, userRole: user.role },
    });

    if (!res.success) {
      return { success: false, error: res.error || "ไม่สามารถกู้คืนรายการได้" };
    }

    // System audit log
    await prisma.systemLog.create({
      data: {
        actionType: "RECYCLE_BIN_RESTORE",
        subsystem: type === "LEAVE" ? "LEAVE" : "DOCUMENT",
        description: `กู้คืนรายการ (${type} ID: ${id}) ${res.newDocNo ? `ได้รับเลขใหม่: ${res.newDocNo}` : ""} โดยผู้ใช้ ${user.name} (${user.id})`,
        userId: user.id,
      },
    });

    safeRevalidate();
    return {
      success: true,
      newSeqNo: res.newSeqNo,
      newDocNo: res.newDocNo,
      restoredDate: res.restoredDate,
      deductedQuotaDays: res.deductedQuotaDays,
    };
  } catch (err: any) {
    console.error("🔒 [RecycleBin Action Error - restoreRecycleBinItemAction]:", err);
    return { success: false, error: err.message || "เกิดข้อผิดพลาดในการกู้คืนรายการ" };
  }
}

/**
 * Permanent Purge of a single item from Recycle Bin (Admin-only)
 */
export async function purgeRecycleBinItemAction(
  type: RecycleBinItemType,
  id: string
): Promise<{ success: boolean; releasedAttachmentCount?: number; error?: string }> {
  try {
    const user = await getAuthenticatedUser();
    const res = await RecycleBinService.purge({
      type,
      id,
      user: { userId: user.id, userRole: user.role },
    });

    if (!res.success) {
      return { success: false, error: res.error || "ไม่สามารถลบรายการถาวรได้" };
    }

    // System audit log
    await prisma.systemLog.create({
      data: {
        actionType: "RECYCLE_BIN_PURGE",
        subsystem: type === "LEAVE" ? "LEAVE" : "DOCUMENT",
        description: `ลบถาวร (Hard Purge) รายการ (${type} ID: ${id}) พร้อมเคลียร์ไฟล์แนบ ${res.releasedAttachmentCount || 0} ไฟล์ โดยผู้ใช้ ${user.name} (${user.id})`,
        userId: user.id,
      },
    });

    safeRevalidate();
    return {
      success: true,
      releasedAttachmentCount: res.releasedAttachmentCount,
    };
  } catch (err: any) {
    console.error("🔒 [RecycleBin Action Error - purgeRecycleBinItemAction]:", err);
    return { success: false, error: err.message || "เกิดข้อผิดพลาดในการลบรายการถาวร" };
  }
}

/**
 * Empty Recycle Bin completely or by item type (Admin-only)
 */
export async function emptyRecycleBinAction(
  type?: RecycleBinItemType
): Promise<{ success: boolean; purgedCount: number; error?: string }> {
  try {
    const user = await getAuthenticatedUser();
    if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      return { success: false, purgedCount: 0, error: "เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถล้างถังขยะทั้งหมดได้" };
    }

    const items = await RecycleBinService.getRecycleBinItems({
      type,
      userId: user.id,
      isAdmin: true,
    });

    let purgedCount = 0;
    for (const item of items) {
      const res = await RecycleBinService.purge({
        type: item.type,
        id: item.id,
        user: { userId: user.id, userRole: user.role },
      });
      if (res.success) {
        purgedCount++;
      }
    }

    await prisma.systemLog.create({
      data: {
        actionType: "RECYCLE_BIN_EMPTY",
        subsystem: "DOCUMENT",
        description: `ล้างถังขยะ ${type || "ทั้งหมด"}: ลบถาวรรวม ${purgedCount} รายการ โดยผู้ใช้ ${user.name} (${user.id})`,
        userId: user.id,
      },
    });

    safeRevalidate();
    return { success: true, purgedCount };
  } catch (err: any) {
    console.error("🔒 [RecycleBin Action Error - emptyRecycleBinAction]:", err);
    return { success: false, purgedCount: 0, error: err.message || "เกิดข้อผิดพลาดในการล้างถังขยะ" };
  }
}

/**
 * Get Recycle Bin statistical KPI metrics
 */
export async function getRecycleBinStatsAction(): Promise<{
  success: boolean;
  data?: {
    total: number;
    certificateCount: number;
    documentCount: number;
    leaveCount: number;
    expiringSoonCount: number;
    retentionDays: number;
  };
  error?: string;
}> {
  try {
    const user = await getAuthenticatedUser();
    const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";

    const [settings, items] = await Promise.all([
      prisma.systemSettings.findFirst({
        select: { recycleBinRetentionDays: true },
      }),
      RecycleBinService.getRecycleBinItems({
        userId: user.id,
        isAdmin,
      }),
    ]);

    const retentionDays = settings?.recycleBinRetentionDays || 30;

    let certCount = 0;
    let docCount = 0;
    let leaveCount = 0;
    let expiringSoonCount = 0;

    for (const item of items) {
      if (item.type === "CERTIFICATE") certCount++;
      else if (item.type === "DOCUMENT") docCount++;
      else if (item.type === "LEAVE") leaveCount++;

      if (item.daysRemaining <= 7) {
        expiringSoonCount++;
      }
    }

    return {
      success: true,
      data: {
        total: items.length,
        certificateCount: certCount,
        documentCount: docCount,
        leaveCount: leaveCount,
        expiringSoonCount,
        retentionDays,
      },
    };
  } catch (err: any) {
    console.error("🔒 [RecycleBin Action Error - getRecycleBinStatsAction]:", err);
    return { success: false, error: err.message || "เกิดข้อผิดพลาดในการโหลดสถิติถังขยะ" };
  }
}

/**
 * Get the current retention days setting (default 30)
 */
export async function getRecycleBinRetentionDaysAction(): Promise<{
  success: boolean;
  retentionDays: number;
  error?: string;
}> {
  try {
    const settings = await prisma.systemSettings.findFirst({
      select: { recycleBinRetentionDays: true },
    });
    return { success: true, retentionDays: settings?.recycleBinRetentionDays || 30 };
  } catch (err: any) {
    return { success: false, retentionDays: 30, error: err.message };
  }
}

/**
 * Update retention days in SystemSettings (Admin only)
 */
export async function updateRecycleBinRetentionDaysAction(
  days: number
): Promise<{ success: boolean; retentionDays?: number; error?: string }> {
  try {
    const user = await getAuthenticatedUser();
    if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      return { success: false, error: "เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถตั้งค่าอายุถังขยะได้" };
    }

    if (days < 7 || days > 90) {
      return { success: false, error: "ระยะเวลาการเก็บรักษาต้องอยู่ระหว่าง 7 ถึง 90 วัน" };
    }

    const updated = await prisma.systemSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        recycleBinRetentionDays: days,
      },
      update: {
        recycleBinRetentionDays: days,
      },
    });

    safeRevalidate();
    return { success: true, retentionDays: updated.recycleBinRetentionDays };
  } catch (err: any) {
    console.error("🔒 [RecycleBin Action Error - updateRecycleBinRetentionDaysAction]:", err);
    return { success: false, error: err.message || "เกิดข้อผิดพลาดในการบันทึกการตั้งค่า" };
  }
}
