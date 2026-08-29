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
    let cleanSvgString = "";
    if (trimmed.startsWith("<svg") || trimmed.includes("<svg")) {
      cleanSvgString = sanitizeSvg(trimmed);
    } else if (trimmed.startsWith("data:image/svg+xml")) {
      const rawContent = decodeURIComponent(trimmed.replace(/^data:image\/svg\+xml;[^,]*,/, ""));
      cleanSvgString = sanitizeSvg(rawContent);
    }

    if (cleanSvgString) {
      // Vector SVG Data URL (from canvas drawing - pure vector, ultra-fast 0ms rendering)
      finalUrl = "data:image/svg+xml;utf8," + encodeURIComponent(cleanSvgString);
    } else if (trimmed.startsWith("data:image/")) {
      // Uploaded Image (PNG, JPG, WebP) -> Optimize with Sharp preserving authentic handwriting & alpha
      try {
        const sharp = require("sharp");
        const parts = trimmed.split(",");
        const base64Str = parts[1] || parts[0];
        const buffer = Buffer.from(base64Str, "base64");

        const optimized = await sharp(buffer)
          .resize(500, 200, { fit: "inside", withoutEnlargement: true })
          .png({ quality: 90, compressionLevel: 8 })
          .toBuffer();

        finalUrl = `data:image/png;base64,${optimized.toString("base64")}`;
      } catch (imgErr) {
        console.warn("[setUserSignature] Image optimization fallback:", imgErr);
        finalUrl = trimmed;
      }
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { signatureUrl: finalUrl }
    });

    revalidatePath("/profile");
    return { success: true, signatureUrl: finalUrl };
  } catch (err: any) {
    console.error("[setUserSignature] Error saving signature:", err);
    const safeFallbackUrl = trimmed.startsWith("<svg")
      ? "data:image/svg+xml;utf8," + encodeURIComponent(trimmed)
      : trimmed;

    await prisma.user.update({
      where: { id: session.user.id },
      data: { signatureUrl: safeFallbackUrl }
    });
    revalidatePath("/profile");
    return { success: true, signatureUrl: safeFallbackUrl };
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

  let finalSignatureUrl = data.signatureUrl;
  if (data.signatureUrl) {
    const sigTrimmed = data.signatureUrl.trim();
    if (sigTrimmed.startsWith("<svg") || sigTrimmed.includes("<svg")) {
      const cleanSvg = sanitizeSvg(sigTrimmed);
      finalSignatureUrl = "data:image/svg+xml;utf8," + encodeURIComponent(cleanSvg);
    } else if (sigTrimmed.startsWith("data:image/svg+xml")) {
      finalSignatureUrl = sigTrimmed;
    } else if (sigTrimmed.startsWith("data:image/")) {
      try {
        const sharp = require("sharp");
        const parts = sigTrimmed.split(",");
        const base64Str = parts[1] || parts[0];
        const buffer = Buffer.from(base64Str, "base64");

        const optimized = await sharp(buffer)
          .resize(500, 200, { fit: "inside", withoutEnlargement: true })
          .png({ quality: 90, compressionLevel: 8 })
          .toBuffer();

        finalSignatureUrl = `data:image/png;base64,${optimized.toString("base64")}`;
      } catch (e) {
        console.warn("[updateProfile] Signature optimization fallback:", e);
        finalSignatureUrl = sigTrimmed;
      }
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
      signatureUrl: finalSignatureUrl !== undefined ? finalSignatureUrl : undefined,
      address: data.address !== undefined ? data.address : undefined,
      phoneNumber: data.phoneNumber !== undefined ? data.phoneNumber : undefined,
      level: data.level !== undefined ? data.level : undefined,
    }
  });

  revalidatePath("/profile");
  return { success: true };
}

