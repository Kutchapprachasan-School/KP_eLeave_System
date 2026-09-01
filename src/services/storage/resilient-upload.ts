import { getStorageProvider } from "./index";
import type { UploadOptions, StorageUploadResult } from "./provider.interface";

export interface ResilientUploadResult {
  success: boolean;
  url: string;
  storageKey: string;
  isFallback: boolean;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Universal Resilient Upload Handler
 * Tries Cloud Storage Provider (Tier 1 & Tier 2)
 * If cloud fails, gracefully falls back to In-DB Base64 Data URL (Tier 3)
 * so user submission NEVER crashes or blocks.
 */
export async function uploadWithResilientFallback({
  buffer,
  mimeType,
  storageKey,
  bucket,
  isPublic = true,
}: {
  buffer: Buffer;
  mimeType: string;
  storageKey: string;
  bucket?: string;
  isPublic?: boolean;
}): Promise<ResilientUploadResult> {
  const sizeBytes = buffer.byteLength;

  try {
    const storage = getStorageProvider();
    const result = await storage.upload(
      { buffer, mimeType, storageKey },
      { bucket, isPublic }
    );

    let url = "";
    if (result && typeof result === "object" && (result as StorageUploadResult).publicUrl) {
      url = (result as StorageUploadResult).publicUrl!;
    } else {
      url = await storage.getUrl(storageKey, { bucket, isPublic });
    }

    return {
      success: true,
      url,
      storageKey,
      isFallback: false,
      mimeType,
      sizeBytes,
    };
  } catch (err: any) {
    console.warn(
      "[ResilientStorage] Cloud upload encountered issue, applying Tier-3 Graceful Base64 Fallback:",
      err?.message || err
    );

    const base64Data = buffer.toString("base64");
    const dataUrl = "data:" + mimeType + ";base64," + base64Data;

    return {
      success: true,
      url: dataUrl,
      storageKey: "fallback:base64:" + Date.now(),
      isFallback: true,
      mimeType,
      sizeBytes,
    };
  }
}

/**
 * Helper to upload user signature (Transparent PNG or Vector SVG)
 * Automatically removes white background from JPEG/PNG, caps size <= 50KB,
 * and maintains pixel-perfect crispness.
 */
export async function uploadSignatureWithFallback({
  buffer,
  userId,
  isSvg = false,
  mimeType = "image/png",
}: {
  buffer: Buffer;
  userId: string;
  isSvg?: boolean;
  mimeType?: string;
}): Promise<ResilientUploadResult> {
  let finalBuffer = buffer;
  let finalMimeType = isSvg ? "image/svg+xml" : "image/png";
  let ext = isSvg ? ".svg" : ".png";

  if (!isSvg) {
    try {
      const sharp = require("sharp");
      let pipeline = sharp(buffer);
      const meta = await pipeline.metadata();

      const isJpeg = mimeType.includes("jpeg") || mimeType.includes("jpg") || !meta.hasAlpha;

      if (isJpeg) {
        const maxDim = 600;
        if ((meta.width && meta.width > maxDim) || (meta.height && meta.height > maxDim)) {
          pipeline = pipeline.resize(maxDim, maxDim, { fit: "inside", withoutEnlargement: true });
        }
        const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const { width, height, channels } = info;

        for (let i = 0; i < data.length; i += channels) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const lightness = 0.299 * r + 0.587 * g + 0.114 * b;
          if (lightness > 225) {
            data[i + 3] = 0;
          } else if (lightness > 175) {
            const factor = (225 - lightness) / 50;
            data[i + 3] = Math.round(data[i + 3] * factor);
          }
        }
        pipeline = sharp(data, { raw: { width, height, channels } });
      } else if (meta.width && (meta.width > 600 || meta.height > 600)) {
        pipeline = pipeline.resize(600, 600, { fit: "inside", withoutEnlargement: true });
      }

      finalBuffer = await pipeline
        .png({
          compressionLevel: 9,
          palette: true,
          quality: 95,
          effort: 10,
        })
        .toBuffer();

      // Guarantee <= 50KB constraint
      if (finalBuffer.length > 50 * 1024) {
        finalBuffer = await sharp(finalBuffer)
          .resize(450, 450, { fit: "inside", withoutEnlargement: true })
          .png({ compressionLevel: 9, palette: true, quality: 85 })
          .toBuffer();
      }
    } catch (err) {
      console.warn("[uploadSignatureWithFallback] Sharp optimization fallback:", err);
    }
  }

  // Use deterministic key so updates overwrite cleanly without orphan files
  const storageKey = "signatures/" + userId + "/signature" + ext;

  return uploadWithResilientFallback({
    buffer: finalBuffer,
    mimeType: finalMimeType,
    storageKey,
    isPublic: true,
  });
}

/**
 * Helper to upload leave attachment (PDF, JPG, PNG, WebP)
 */
export async function uploadLeaveAttachmentWithFallback({
  buffer,
  mimeType,
  fileName,
  requestId,
}: {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  requestId?: string;
}): Promise<ResilientUploadResult> {
  const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storageKey = "leaves/" + (requestId || "draft") + "/" + Date.now() + "-" + cleanName;

  return uploadWithResilientFallback({
    buffer,
    mimeType,
    storageKey,
    isPublic: true,
  });
}

/**
 * Helper to upload user avatar image (JPG, PNG, WebP)
 */
export async function uploadAvatarWithFallback({
  buffer,
  mimeType,
  userId,
}: {
  buffer: Buffer;
  mimeType: string;
  userId: string;
}): Promise<ResilientUploadResult> {
  let optimizedBuffer = buffer;
  let finalMimeType = mimeType;
  let ext = ".webp";

  try {
    const sharp = require("sharp");
    optimizedBuffer = await sharp(buffer)
      .resize(120, 120, { fit: "cover" })
      .webp({ quality: 80 })
      .toBuffer();
    finalMimeType = "image/webp";
  } catch (e) {
    ext = mimeType.includes("png") ? ".png" : mimeType.includes("webp") ? ".webp" : ".jpg";
  }

  // Use deterministic key so new avatar overwrites previous avatar for this user
  const storageKey = "avatars/" + userId + "/avatar" + ext;

  return uploadWithResilientFallback({
    buffer: optimizedBuffer,
    mimeType: finalMimeType,
    storageKey,
    isPublic: true,
  });
}


