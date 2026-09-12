import prisma from "@/lib/prisma";
import crypto from "crypto";
import { getStorageProviderByType, uploadWithResilientFallback } from "@/services/storage";

export interface UploadResult {
  attachmentId: string;
  url: string;
  objectKey: string;
  storageProvider: string;
}

/**
 * Uploads a certificate template background image adhering strictly to the DB-first lifecycle.
 */
export async function uploadCertificateBackground(params: {
  file: File;
  clientSessionId?: string;
  userId: string;
}): Promise<UploadResult> {
  const { file, userId } = params;
  const clientSessionId = params.clientSessionId || crypto.randomUUID();

  // 1. Validate image mime type
  const validMimes = ["image/jpeg", "image/png", "image/webp"];
  if (!validMimes.includes(file.type)) {
    throw new Error("รูปแบบไฟล์ไม่ถูกต้อง รองรับเฉพาะ JPG, PNG, WEBP เท่านั้น");
  }

  // 2. Limit size to 10MB
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("ขนาดไฟล์ต้องไม่เกิน 10MB");
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const checksumSha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectKey = `certificates/backgrounds/${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${sanitizedFileName}`;
  const uploadExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lease

  // 3. DB-First: Create FileAttachment with UPLOAD_PENDING & StorageUploadLog with PENDING
  const attachment = await prisma.$transaction(async (tx) => {
    const existing = await tx.fileAttachment.findUnique({
      where: { uploadSessionId: clientSessionId },
    });

    if (existing) {
      return existing;
    }

    const created = await tx.fileAttachment.create({
      data: {
        objectKey,
        originalFileName: file.name,
        mimeType: file.type,
        fileSize: BigInt(file.size),
        checksumSha256,
        attachmentStatus: "UPLOAD_PENDING",
        uploadExpiresAt,
        uploadSessionId: clientSessionId,
      },
    });

    await tx.storageUploadLog.create({
      data: {
        objectKey,
        bucket: process.env.R2_BUCKET || "data1",
        originalFileName: file.name,
        mimeType: file.type,
        fileSize: BigInt(file.size),
        checksumSha256,
        status: "PENDING",
        uploadedBy: userId,
        fileAttachmentId: created.id,
      },
    });

    return created;
  });

  if (attachment.attachmentStatus === "ACTIVE") {
    const storage = getStorageProviderByType(attachment.storageProvider);
    const url = await storage.getUrl(attachment.objectKey, { isPublic: true });
    return {
      attachmentId: attachment.id,
      url,
      objectKey: attachment.objectKey,
      storageProvider: attachment.storageProvider,
    };
  }

  // 4. Upload to Cloud Storage with R2 -> Supabase resilient fallback
  let uploadRes: { storageKey: string; publicUrl?: string; provider: "R2" | "SUPABASE" };
  try {
    uploadRes = await uploadWithResilientFallback({
      buffer,
      mimeType: file.type,
      storageKey: objectKey,
    });
  } catch (uploadErr: any) {
    // Cloud upload failed -> mark ABORTED in DB
    await prisma.$transaction(async (tx) => {
      await tx.fileAttachment.deleteMany({
        where: { id: attachment.id, attachmentStatus: "UPLOAD_PENDING" },
      });
      await tx.storageUploadLog.updateMany({
        where: { objectKey, status: "PENDING" },
        data: {
          status: "ABORTED",
          abortedAt: new Date(),
          error: uploadErr?.message || "Upload error",
        },
      });
    });
    throw new Error(`Cloud upload failed: ${uploadErr?.message || uploadErr}`);
  }

  const actualProvider = uploadRes.provider;
  const publicUrl =
    uploadRes.publicUrl ||
    (await getStorageProviderByType(actualProvider).getUrl(objectKey, { isPublic: true }));

  // 5. Cloud upload succeeded -> Mark ACTIVE & status: COMMITTED
  await prisma.$transaction(async (tx) => {
    await tx.fileAttachment.update({
      where: { id: attachment.id },
      data: {
        storageProvider: actualProvider,
        attachmentStatus: "ACTIVE",
        uploadExpiresAt: null,
      },
    });

    await tx.storageUploadLog.updateMany({
      where: { objectKey, status: "PENDING" },
      data: {
        status: "COMMITTED",
        committedAt: new Date(),
      },
    });
  });

  return {
    attachmentId: attachment.id,
    url: publicUrl,
    objectKey,
    storageProvider: actualProvider,
  };
}

/**
 * Uploads a transparent teacher signature image adhering strictly to FileAttachment lifecycle.
 */
export async function uploadCertificateSignature(params: {
  file: File;
  clientSessionId?: string;
  userId: string;
}): Promise<UploadResult> {
  const { file, userId } = params;
  const clientSessionId = params.clientSessionId || crypto.randomUUID();

  const allowedMimes = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedMimes.includes(file.type)) {
    throw new Error("ไฟล์ต้องเป็นภาพ PNG, JPG หรือ WEBP (แนะนำ PNG พื้นหลังโปร่งใส)");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("ขนาดไฟล์ภาพลายเซ็นต้องไม่เกิน 5 MB");
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const checksumSha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  const ext = file.name.split(".").pop() || "png";
  const objectKey = `cert-signatures/${checksumSha256.slice(0, 16)}_${Date.now()}.${ext}`;
  const uploadExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // 1. Two-phase commit: Create UPLOAD_PENDING FileAttachment & PENDING StorageUploadLog
  const attachment = await prisma.$transaction(async (tx) => {
    const existingAtt = await tx.fileAttachment.findUnique({
      where: { uploadSessionId: clientSessionId },
    });
    if (existingAtt) return existingAtt;

    const created = await tx.fileAttachment.create({
      data: {
        objectKey,
        originalFileName: file.name,
        mimeType: file.type,
        fileSize: BigInt(file.size),
        checksumSha256,
        attachmentStatus: "UPLOAD_PENDING",
        uploadExpiresAt,
        uploadSessionId: clientSessionId,
      },
    });

    await tx.storageUploadLog.create({
      data: {
        objectKey,
        bucket: process.env.R2_BUCKET || "data1",
        originalFileName: file.name,
        mimeType: file.type,
        fileSize: BigInt(file.size),
        checksumSha256,
        status: "PENDING",
        uploadedBy: userId,
        fileAttachmentId: created.id,
      },
    });

    return created;
  });

  if (attachment.attachmentStatus === "ACTIVE") {
    const storage = getStorageProviderByType(attachment.storageProvider);
    const url = await storage.getUrl(attachment.objectKey, { isPublic: true });
    return {
      attachmentId: attachment.id,
      url,
      objectKey: attachment.objectKey,
      storageProvider: attachment.storageProvider,
    };
  }

  // 2. Upload to Cloud Storage with R2 -> Supabase resilient fallback
  let uploadRes: { storageKey: string; publicUrl?: string; provider: "R2" | "SUPABASE" };
  try {
    uploadRes = await uploadWithResilientFallback({
      buffer,
      mimeType: file.type,
      storageKey: objectKey,
    });
  } catch (uploadErr: any) {
    await prisma.$transaction(async (tx) => {
      await tx.fileAttachment.deleteMany({
        where: { id: attachment.id, attachmentStatus: "UPLOAD_PENDING" },
      });
      await tx.storageUploadLog.updateMany({
        where: { objectKey, status: "PENDING" },
        data: {
          status: "ABORTED",
          abortedAt: new Date(),
          error: uploadErr?.message || "Upload error",
        },
      });
    });
    throw new Error(`Cloud upload failed: ${uploadErr?.message || uploadErr}`);
  }

  const actualProvider = uploadRes.provider;
  const publicUrl =
    uploadRes.publicUrl ||
    (await getStorageProviderByType(actualProvider).getUrl(objectKey, { isPublic: true }));

  // 3. Mark ACTIVE & status: COMMITTED
  await prisma.$transaction(async (tx) => {
    await tx.fileAttachment.update({
      where: { id: attachment.id },
      data: {
        storageProvider: actualProvider,
        attachmentStatus: "ACTIVE",
        uploadExpiresAt: null,
      },
    });

    await tx.storageUploadLog.updateMany({
      where: { objectKey, status: "PENDING" },
      data: {
        status: "COMMITTED",
        committedAt: new Date(),
      },
    });
  });

  return {
    attachmentId: attachment.id,
    url: publicUrl,
    objectKey,
    storageProvider: actualProvider,
  };
}

export { detectFontMagicBytes } from "@/app/(app)/document/_components/designer/font-manifest";


export interface FontUploadResult {
  attachmentId: string;
  family: string;
  assetHash: string;
  fontVersion: string;
  url: string;
  objectKey: string;
  storageProvider: string;
}

/**
 * Senior Hardened Font Upload:
 * Validates font binary magic bytes, enforces <= 5MB, calculates authoritative server-side SHA-256,
 * stores under cert-fonts/ with DB-first lifecycle.
 */
export async function uploadCertificateFont(params: {
  file: File;
  familyName?: string;
  clientSessionId?: string;
  userId: string;
}): Promise<FontUploadResult> {
  const { file, userId } = params;
  const clientSessionId = params.clientSessionId || crypto.randomUUID();

  // 1. Enforce size limit <= 5MB
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("ขนาดไฟล์ฟอนต์ต้องไม่เกิน 5 MB");
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // 2. Validate magic bytes
  const magic = detectFontMagicBytes(buffer);
  if (!magic.valid) {
    throw new Error("รูปแบบไฟล์ฟอนต์ไม่ถูกต้อง (รองรับเฉพาะ WOFF2, WOFF, TTF, OTF)");
  }

  // 3. Authoritative server-side SHA-256 computation (Never trust client hash!)
  const checksumSha256 = crypto.createHash("sha256").update(buffer).digest("hex");

  // Derive and sanitize font family name
  const rawFamily = params.familyName || file.name.replace(/\.[^/.]+$/, "");
  const family = rawFamily.replace(/[^a-zA-Z0-9ก-๙ _-]/g, "").trim().slice(0, 50) || "CustomFont";

  const objectKey = `cert-fonts/${checksumSha256.slice(0, 16)}_${Date.now()}.${magic.format}`;
  const uploadExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // 4. DB-First: Create UPLOAD_PENDING FileAttachment & PENDING StorageUploadLog
  const attachment = await prisma.$transaction(async (tx) => {
    const existingAtt = await tx.fileAttachment.findUnique({
      where: { uploadSessionId: clientSessionId },
    });
    if (existingAtt) return existingAtt;

    const created = await tx.fileAttachment.create({
      data: {
        objectKey,
        originalFileName: file.name,
        mimeType: magic.mimeType,
        fileSize: BigInt(file.size),
        checksumSha256,
        attachmentStatus: "UPLOAD_PENDING",
        uploadExpiresAt,
        uploadSessionId: clientSessionId,
      },
    });

    await tx.storageUploadLog.create({
      data: {
        objectKey,
        bucket: process.env.R2_BUCKET || "data1",
        originalFileName: file.name,
        mimeType: magic.mimeType,
        fileSize: BigInt(file.size),
        checksumSha256,
        status: "PENDING",
        uploadedBy: userId,
        fileAttachmentId: created.id,
      },
    });

    return created;
  });

  if (attachment.attachmentStatus === "ACTIVE") {
    const storage = getStorageProviderByType(attachment.storageProvider);
    const url = await storage.getUrl(attachment.objectKey, { isPublic: true });
    return {
      attachmentId: attachment.id,
      family,
      assetHash: checksumSha256,
      fontVersion: "1.0.0",
      url,
      objectKey: attachment.objectKey,
      storageProvider: attachment.storageProvider,
    };
  }

  // 5. Upload to Cloud Storage with R2 -> Supabase fallback
  let uploadRes: { storageKey: string; publicUrl?: string; provider: "R2" | "SUPABASE" };
  try {
    uploadRes = await uploadWithResilientFallback({
      buffer,
      mimeType: magic.mimeType,
      storageKey: objectKey,
    });
  } catch (uploadErr: any) {
    await prisma.$transaction(async (tx) => {
      await tx.fileAttachment.deleteMany({
        where: { id: attachment.id, attachmentStatus: "UPLOAD_PENDING" },
      });
      await tx.storageUploadLog.updateMany({
        where: { objectKey, status: "PENDING" },
        data: {
          status: "ABORTED",
          abortedAt: new Date(),
          error: uploadErr?.message || "Upload error",
        },
      });
    });
    throw new Error(`Cloud upload failed: ${uploadErr?.message || uploadErr}`);
  }

  const actualProvider = uploadRes.provider;
  const publicUrl =
    uploadRes.publicUrl ||
    (await getStorageProviderByType(actualProvider).getUrl(objectKey, { isPublic: true }));

  // 6. Mark ACTIVE & COMMITTED
  await prisma.$transaction(async (tx) => {
    await tx.fileAttachment.update({
      where: { id: attachment.id },
      data: {
        storageProvider: actualProvider,
        attachmentStatus: "ACTIVE",
        uploadExpiresAt: null,
      },
    });

    await tx.storageUploadLog.updateMany({
      where: { objectKey, status: "PENDING" },
      data: {
        status: "COMMITTED",
        committedAt: new Date(),
      },
    });
  });

  return {
    attachmentId: attachment.id,
    family,
    assetHash: checksumSha256,
    fontVersion: "1.0.0",
    url: publicUrl,
    objectKey,
    storageProvider: actualProvider,
  };
}
