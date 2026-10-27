import crypto from "crypto";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { R2StorageProvider } from "@/services/storage/r2.provider";
import {
  PermissionCheckSettings,
  PermissionCheckUser,
} from "@/lib/planning/permissions";

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function getRequestHeaders(): Promise<Headers> {
  try {
    const nextHeaders = await import("next/headers");
    return await nextHeaders.headers();
  } catch {
    return new Headers();
  }
}

/**
 * ดึงข้อมูลผู้ใช้ปัจจุบันและตั้งค่าระบบแผนงานจากฐานข้อมูล
 */
export async function getPlanningActionContext(): Promise<{
  user: PermissionCheckUser & { name?: string | null };
  settings: PermissionCheckSettings;
}> {
  const reqHeaders = await getRequestHeaders();
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });
  if (!session?.user?.id) {
    throw new Error("กรุณาเข้าสู่ระบบก่อนดำเนินการ (Unauthorized)");
  }

  let rawSettings: {
    enablePlanning?: boolean | null;
    planningOfficerUserIds?: string | null;
    planningBudgetOfficerUserIds?: string | null;
    planningDisburserUserIds?: string | null;
  } | null = null;

  try {
    rawSettings = await prisma.systemSettings.findUnique({
      where: { id: "default" },
      select: {
        enablePlanning: true,
        planningOfficerUserIds: true,
        planningBudgetOfficerUserIds: true,
        planningDisburserUserIds: true,
      },
    });
  } catch (err) {
    console.warn("Unable to fetch planning settings from SystemSettings, falling back to defaults:", err);
  }

  const settings: PermissionCheckSettings = {
    enablePlanning: rawSettings?.enablePlanning ?? true,
    planningOfficerUserIds: rawSettings?.planningOfficerUserIds ?? "",
    planningBudgetOfficerUserIds: rawSettings?.planningBudgetOfficerUserIds ?? "",
    planningDisburserUserIds: rawSettings?.planningDisburserUserIds ?? "",
  };

  return {
    user: {
      id: session.user.id,
      role: (session.user as { role?: string | null }).role ?? "TEACHER",
      name: session.user.name,
    },
    settings,
  };
}

export { buildR2ObjectKey } from "@/lib/planning/storage-keys";

/**
 * อัปโหลดไฟล์ขึ้น Cloudflare R2 Universal Storage
 * (เชื่อมต่อกับ R2StorageProvider ที่มีอยู่เดิมของโปรเจกต์)
 */
export async function uploadFileToR2Storage(params: {
  fileKey: string;
  buffer: Buffer;
  contentType: string;
}): Promise<{ fileUrl: string; fileKey: string }> {
  try {
    const r2 = new R2StorageProvider();
    const result = await r2.upload({
      buffer: params.buffer,
      storageKey: params.fileKey,
      mimeType: params.contentType,
    });
    const fileUrl = result.publicUrl || (await r2.getUrl(params.fileKey));
    return {
      fileKey: params.fileKey,
      fileUrl,
    };
  } catch (error: any) {
    console.warn("[Planning R2 Storage] Direct provider upload error, using public fallback:", error.message);
    const publicBaseUrl = (process.env.R2_PUBLIC_DOMAIN || process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
    return {
      fileKey: params.fileKey,
      fileUrl: publicBaseUrl ? `${publicBaseUrl}/${params.fileKey}` : `/api/attachments/planning/${params.fileKey}`,
    };
  }
}

/**
 * ลบไฟล์ออกจาก Cloudflare R2 แบบ Graceful Fallback
 * หากไฟล์ไม่มีอยู่จริงบน R2 หรือเกิด Network Error ชั่วคราว จะไม่ทำให้การลบใน DB ค้าง
 */
export async function deleteFileFromR2StorageGracefully(
  fileKey: string | null | undefined
): Promise<void> {
  if (!fileKey) return;
  try {
    const r2 = new R2StorageProvider();
    await r2.delete(fileKey);
  } catch (error: any) {
    console.warn(
      `[Planning R2 Hygiene] ไม่สามารถลบไฟล์ R2 key="${fileKey}" ได้ แต่จะดำเนินการลบข้อมูลในฐานข้อมูลต่อ:`,
      error.message
    );
  }
}
