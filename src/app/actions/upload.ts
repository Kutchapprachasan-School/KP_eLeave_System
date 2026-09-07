"use server";


import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function uploadLogo(formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session?.user || (session.user.role !== "ADMIN" && (session.user as any).position !== "แอดมิน")) {
    throw new Error("Unauthorized");
  }

  const file: File | null = formData.get("logo") as unknown as File;
  
  if (!file) {
    throw new Error("No file uploaded");
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Convert to Base64 to support serverless deployment (Vercel)
  // This avoids the ephemeral file system issue without needing an external Blob storage
  const base64Data = buffer.toString('base64');
  const mimeType = file.type || 'image/png';
  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  // Return the Base64 Data URL
  return { success: true, url: dataUrl };
}

import { uploadLeaveAttachmentWithFallback } from "@/services/storage/resilient-upload";

export async function uploadDocumentFile(formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const file: File | null = formData.get("file") as unknown as File;
  const customName = formData.get("customName") as string | null;
  
  if (!file) {
    throw new Error("No file uploaded");
  }

  const displayName = customName || file.name;
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const mimeType = file.type || 'application/pdf';

  try {
    const result = await uploadLeaveAttachmentWithFallback({
      buffer,
      mimeType,
      fileName: file.name
    });

    return {
      success: true,
      url: result.url,
      preview: result.url,
      name: displayName,
      displayName: displayName,
      storageKey: result.storageKey,
      sizeBytes: result.sizeBytes,
      mimeType: result.mimeType,
      isFallback: result.isFallback
    };
  } catch (err) {
    const base64Data = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Data}`;
    return {
      success: true,
      url: dataUrl,
      preview: dataUrl,
      name: displayName,
      displayName: displayName,
      sizeBytes: buffer.byteLength,
      mimeType,
      isFallback: true
    };
  }
}

