"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { uploadSignatureWithFallback, uploadAvatarWithFallback } from "@/services/storage/resilient-upload";
import { sanitizeSvg } from "@/lib/svg-sanitizer";

export async function getMySignature() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { signatureUrl: true }
  });

  return {
    signatureUrl: user?.signatureUrl || null,
    hasSignature: !!user?.signatureUrl
  };
}

export async function setUserSignature(signatureData: string | null) {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (!signatureData || !signatureData.trim()) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { signatureUrl: null }
    });
    revalidatePath("/profile");
    return { success: true, signatureUrl: null };
  }

  const trimmed = signatureData.trim();
  let finalUrl = trimmed;

  try {
    if (trimmed.startsWith("<svg") || trimmed.includes("<svg")) {
      // Vector SVG
      const cleanSvg = sanitizeSvg(trimmed);
      const buffer = Buffer.from(cleanSvg, "utf8");
      const result = await uploadSignatureWithFallback({
        buffer,
        userId: session.user.id,
        isSvg: true
      });
      finalUrl = result.url;
    } else if (trimmed.startsWith("data:image/")) {
      // Base64 WebP / PNG
      const parts = trimmed.split(",");
      const base64Str = parts[1] || parts[0];
      const buffer = Buffer.from(base64Str, "base64");
      const isSvg = trimmed.includes("image/svg+xml");
      const result = await uploadSignatureWithFallback({
        buffer,
        userId: session.user.id,
        isSvg
      });
      finalUrl = result.url;
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { signatureUrl: finalUrl }
    });

    revalidatePath("/profile");
    return { success: true, signatureUrl: finalUrl };
  } catch (err: any) {
    console.error("[setUserSignature] Error saving signature:", err);
    // Fallback: save directly if cloud fails
    await prisma.user.update({
      where: { id: session.user.id },
      data: { signatureUrl: trimmed }
    });
    revalidatePath("/profile");
    return { success: true, signatureUrl: trimmed };
  }
}

// For updating profile details like name, subjectGroup, image, signatureUrl
export async function updateProfile(data: {
  name: string;
  email?: string;
  subjectGroup: string;
  lineUserId?: string;
  image?: string;
  signatureUrl?: string;
  address?: string;
  phoneNumber?: string;
  level?: string;
}) {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  let finalImageUrl = data.image;
  if (data.image && data.image.startsWith("data:image/")) {
    try {
      const parts = data.image.split(",");
      const base64Str = parts[1] || parts[0];
      const mimeMatch = data.image.match(/data:([^;]+);/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const buffer = Buffer.from(base64Str, "base64");
      const result = await uploadAvatarWithFallback({
        buffer,
        mimeType,
        userId: session.user.id,
      });
      finalImageUrl = result.url;
    } catch (e) {
      console.warn("[updateProfile] Avatar upload fallback:", e);
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: data.name,
      email: data.email !== undefined ? data.email : undefined,
      subjectGroup: data.subjectGroup,
      lineUserId: data.lineUserId,
      image: finalImageUrl !== undefined ? finalImageUrl : undefined,
      signatureUrl: data.signatureUrl !== undefined ? data.signatureUrl : undefined,
      address: data.address !== undefined ? data.address : undefined,
      phoneNumber: data.phoneNumber !== undefined ? data.phoneNumber : undefined,
      level: data.level !== undefined ? data.level : undefined,
    }
  });

  revalidatePath("/profile");
  return { success: true };
}

