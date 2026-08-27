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
 * Helper to upload user signature (Vector SVG or WebP)
 */
export async function uploadSignatureWithFallback({
  buffer,
  userId,
  isSvg = true,
}: {
  buffer: Buffer;
  userId: string;
  isSvg?: boolean;
}): Promise<ResilientUploadResult> {
  const mimeType = isSvg ? "image/svg+xml" : "image/webp";
  const ext = isSvg ? ".svg" : ".webp";
  const storageKey = "signatures/" + userId + "/sig_" + Date.now() + ext;

  return uploadWithResilientFallback({
    buffer,
    mimeType,
    storageKey,
    bucket: "signatures",
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
    bucket: "leave-attachments",
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

  const storageKey = "avatars/" + userId + "/avatar_" + Date.now() + ext;

  return uploadWithResilientFallback({
    buffer: optimizedBuffer,
    mimeType: finalMimeType,
    storageKey,
    bucket: "signatures",
    isPublic: true,
  });
}


