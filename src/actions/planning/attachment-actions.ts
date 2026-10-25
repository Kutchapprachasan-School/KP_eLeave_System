"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getPlanningPermissions } from "@/lib/planning/permissions";
import { serializeAttachmentToDTO } from "@/lib/planning/serializers";
import {
  AttachmentTypeValue,
  ProjectAttachmentDTO,
  StorageTypeValue,
} from "@/lib/planning/types";
import {
  ActionResult,
  buildR2ObjectKey,
  deleteFileFromR2StorageGracefully,
  getPlanningActionContext,
  uploadFileToR2Storage,
} from "./_context";

const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/**
 * เพิ่มเอกสารแนบโครงการ (รองรับทั้ง R2_UPLOAD และ EXTERNAL_LINK)
 * สิทธิ์: เจ้าหน้าที่แผนงาน หรือ หัวหน้าโครงการ/ครูผู้รับผิดชอบกิจกรรมในโครงการที่ยังไม่ปิด
 */
export async function addProjectAttachmentAction(
  formData: FormData
): Promise<ActionResult<ProjectAttachmentDTO>> {
  try {
    const { user, settings } = await getPlanningActionContext();

    const projectId = String(formData.get("projectId") || "").trim();
    const title = String(formData.get("title") || "").trim();
    const attachmentType = String(
      formData.get("attachmentType") || "PROPOSAL"
    ) as AttachmentTypeValue;
    const storageType = String(
      formData.get("storageType") || "R2_UPLOAD"
    ) as StorageTypeValue;

    if (!projectId || !title) {
      return {
        success: false,
        error: "กรุณาระบุชื่อเอกสารให้ครบถ้วน",
      };
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: {
        fiscalYear: { select: { year: true } },
        activities: {
          where: { deletedAt: null },
          select: { responsibleUserId: true },
        },
      },
    });

    if (!project) {
      return {
        success: false,
        error: "ไม่พบโครงการที่ต้องการแนบเอกสาร",
      };
    }

    const isResponsibleForAnyActivity = project.activities.some(
      (a) => a.responsibleUserId === user.id
    );

    const perms = getPlanningPermissions(user, settings, {
      leaderUserId: project.leaderUserId,
      responsibleUserId: isResponsibleForAnyActivity ? user.id : undefined,
      projectStatus: project.status,
    });

    if (!perms.canManageAttachments) {
      return {
        success: false,
        error:
          "คุณไม่มีสิทธิ์แนบเอกสารในโครงการนี้ หรือโครงการดำเนินการเสร็จสิ้นแล้ว",
      };
    }

    let fileUrl = "";
    let fileKey: string | null = null;
    let fileSize: number | null = null;
    let mimeType: string | null = null;
    let originalFileName = title;

    if (storageType === "EXTERNAL_LINK") {
      const rawUrl = String(formData.get("externalUrl") || "").trim();
      if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) {
        return {
          success: false,
          error: "กรุณาระบุลิงก์ภายนอกที่ขึ้นต้นด้วย http:// หรือ https://",
        };
      }
      fileUrl = rawUrl;
      fileKey = rawUrl;
    } else {
      const file = formData.get("file");
      if (!(file instanceof File) || file.size === 0) {
        return {
          success: false,
          error: "กรุณาเลือกไฟล์เอกสารที่ต้องการอัปโหลด",
        };
      }

      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        return {
          success: false,
          error: "ขนาดไฟล์ต้องไม่เกิน 25 MB",
        };
      }

      if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
        return {
          success: false,
          error:
            "รองรับเฉพาะไฟล์ PDF, Word (.doc/.docx), Excel (.xls/.xlsx) และรูปภาพ (.jpg/.png/.webp) เท่านั้น",
        };
      }

      const fyYear = project.fiscalYear?.year || 2569;
      const objectKey = buildR2ObjectKey(
        fyYear,
        project.code,
        file.name,
        "documents"
      );
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const uploaded = await uploadFileToR2Storage({
        fileKey: objectKey,
        buffer,
        contentType: file.type || "application/octet-stream",
      });

      fileUrl = uploaded.fileUrl;
      fileKey = uploaded.fileKey;
      fileSize = file.size;
      mimeType = file.type || "application/octet-stream";
      originalFileName = file.name;
    }

    const created = await prisma.projectAttachment.create({
      data: {
        projectId: project.id,
        title,
        attachmentType,
        storageType,
        fileUrl,
        fileKey,
        fileSize,
        mimeType,
        originalFileName,
        storageProvider: storageType === "EXTERNAL_LINK" ? "EXTERNAL_LINK" : "R2_UPLOAD",
        objectKey: fileKey || fileUrl,
        uploadedByUserId: user.id,
      },
      include: {
        uploadedByUser: { select: { id: true, name: true } },
      },
    });

    revalidatePath("/planning");
    return {
      success: true,
      data: serializeAttachmentToDTO(created),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาดในการแนบเอกสารโครงการ",
    };
  }
}

/**
 * ลบเอกสารแนบโครงการ พร้อมสั่งลบไฟล์จริงบน Cloudflare R2 แบบ Graceful
 */
export async function deleteProjectAttachmentAction(
  attachmentId: string
): Promise<ActionResult> {
  try {
    const { user, settings } = await getPlanningActionContext();

    const attachment = await prisma.projectAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        project: {
          include: {
            activities: {
              where: { deletedAt: null },
              select: { responsibleUserId: true },
            },
          },
        },
      },
    });

    if (!attachment) {
      return {
        success: false,
        error: "ไม่พบเอกสารแนบที่ต้องการลบ",
      };
    }

    const isResponsibleForAnyActivity = attachment.project.activities.some(
      (a) => a.responsibleUserId === user.id
    );

    const perms = getPlanningPermissions(user, settings, {
      leaderUserId: attachment.project.leaderUserId,
      responsibleUserId: isResponsibleForAnyActivity ? user.id : undefined,
      projectStatus: attachment.project.status,
    });

    if (!perms.canManageAttachments) {
      return {
        success: false,
        error: "คุณไม่มีสิทธิ์ลบเอกสารในโครงการนี้",
      };
    }

    // ลบไฟล์จริงออกจาก Cloudflare R2 ก่อน (หากเกิดปัญหาบน R2 จะ warn และลบใน DB ต่อได้)
    if (attachment.storageType === "R2_UPLOAD" && (attachment.fileKey || attachment.objectKey)) {
      await deleteFileFromR2StorageGracefully(attachment.fileKey || attachment.objectKey);
    }

    await prisma.projectAttachment.delete({
      where: { id: attachment.id },
    });

    revalidatePath("/planning");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาดในการลบเอกสารแนบ",
    };
  }
}
