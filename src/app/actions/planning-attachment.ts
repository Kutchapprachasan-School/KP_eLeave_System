"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getPlanningPermissions } from "@/lib/planning/permissions";
import { R2StorageProvider } from "@/services/storage/r2.provider";
import crypto from "crypto";

async function getCurrentUserAndSettings() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const user = session?.user || null;

  const settings = await prisma.systemSettings.findUnique({
    where: { id: "default" },
    select: { enablePlanning: true, planningOfficerUserIds: true },
  });

  return {
    user,
    settings: {
      enablePlanning: settings?.enablePlanning ?? true,
      planningOfficerUserIds: settings?.planningOfficerUserIds || "",
    },
  };
}

export async function addProjectAttachmentAction(formData: FormData) {
  try {
    const { user, settings } = await getCurrentUserAndSettings();
    if (!user) return { success: false as const, error: "Unauthorized: กรุณาเข้าสู่ระบบก่อนดำเนินการ" };

    const projectId = formData.get("projectId") as string;
    const title = (formData.get("title") as string)?.trim() || "เอกสารโครงการ";
    const attachmentType = (formData.get("attachmentType") as string) || "PROPOSAL";
    const storageType = (formData.get("storageType") as string) || "R2_UPLOAD";
    const externalUrl = (formData.get("externalUrl") as string)?.trim();
    const file = formData.get("file") as File | null;

    if (!projectId) return { success: false as const, error: "กรุณาระบุโครงการ" };

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        code: true,
        leaderUserId: true,
        status: true,
        fiscalYear: { select: { year: true } },
      },
    });

    if (!project) return { success: false as const, error: "ไม่พบโครงการที่ระบุ" };

    const perms = getPlanningPermissions(user, settings, {
      leaderUserId: project.leaderUserId,
      projectStatus: project.status,
    });

    if (!perms.canManageAttachments) {
      return { success: false as const, error: "Forbidden: คุณไม่มีสิทธิ์แนบเอกสารในโครงการนี้" };
    }

    if (storageType === "EXTERNAL_LINK") {
      if (!externalUrl || !externalUrl.startsWith("http")) {
        return { success: false as const, error: "กรุณาระบุ URL ที่ถูกต้อง (ขึ้นต้นด้วย http:// หรือ https://)" };
      }

      const attachment = await prisma.projectAttachment.create({
        data: {
          projectId,
          title,
          attachmentType: attachmentType as any,
          storageType: "EXTERNAL_LINK",
          fileUrl: externalUrl,
          originalFileName: title,
          storageProvider: "EXTERNAL_LINK",
          objectKey: externalUrl,
          uploadedByUserId: user.id,
        },
      });

      revalidatePath("/planning");
      return { success: true as const, data: { id: attachment.id, fileUrl: attachment.fileUrl } };
    }

    // R2_UPLOAD
    if (!file || file.size === 0) {
      return { success: false as const, error: "กรุณาเลือกไฟล์ที่ต้องการอัปโหลด" };
    }

    // Limit to 25MB
    if (file.size > 25 * 1024 * 1024) {
      return { success: false as const, error: "ขนาดไฟล์ต้องไม่เกิน 25 MB" };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const year = project.fiscalYear?.year || 2569;
    const cleanCode = project.code.replace(/[^a-zA-Z0-9_-]/g, "_");
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uuid = crypto.randomUUID().slice(0, 8);
    const storageKey = `planning/${year}/${cleanCode}/${uuid}-${cleanName}`;

    let fileUrl = "";
    try {
      const r2 = new R2StorageProvider();
      const res = await r2.upload(buffer, {
        storageKey,
        mimeType: file.type || "application/octet-stream",
      });
      fileUrl = res.publicUrl || (await r2.getUrl(storageKey));
    } catch (r2Err: any) {
      console.warn("R2 upload error (falling back to direct key):", r2Err.message);
      fileUrl = `/api/attachments/planning/${storageKey}`;
    }

    const attachment = await prisma.projectAttachment.create({
      data: {
        projectId,
        title,
        attachmentType: attachmentType as any,
        storageType: "R2_UPLOAD",
        fileUrl,
        fileKey: storageKey,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
        originalFileName: file.name,
        storageProvider: "R2_UPLOAD",
        objectKey: storageKey,
        uploadedByUserId: user.id,
      },
    });

    revalidatePath("/planning");
    return { success: true as const, data: { id: attachment.id, fileUrl: attachment.fileUrl } };
  } catch (error: any) {
    console.error("addProjectAttachmentAction error:", error);
    return { success: false as const, error: error.message || "เกิดข้อผิดพลาดในการแนบเอกสาร" };
  }
}

export async function deleteProjectAttachmentAction(attachmentId: string) {
  try {
    const { user, settings } = await getCurrentUserAndSettings();
    if (!user) return { success: false as const, error: "Unauthorized: กรุณาเข้าสู่ระบบก่อนดำเนินการ" };

    const attachment = await prisma.projectAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        project: {
          select: { leaderUserId: true, status: true },
        },
      },
    });

    if (!attachment) return { success: false as const, error: "ไม่พบเอกสารแนบ" };

    const perms = getPlanningPermissions(user, settings, {
      leaderUserId: attachment.project.leaderUserId,
      projectStatus: attachment.project.status,
    });

    if (!perms.canManageAttachments) {
      return { success: false as const, error: "Forbidden: คุณไม่มีสิทธิ์ลบเอกสารนี้" };
    }

    // Graceful R2 delete
    if (attachment.fileKey && attachment.storageType === "R2_UPLOAD") {
      try {
        const r2 = new R2StorageProvider();
        await r2.delete(attachment.fileKey);
      } catch (err: any) {
        console.warn("Graceful warning: R2 file deletion failed:", err.message);
      }
    }

    await prisma.projectAttachment.delete({
      where: { id: attachmentId },
    });

    revalidatePath("/planning");
    return { success: true as const };
  } catch (error: any) {
    console.error("deleteProjectAttachmentAction error:", error);
    return { success: false as const, error: error.message || "เกิดข้อผิดพลาดในการลบเอกสาร" };
  }
}
