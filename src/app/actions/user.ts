"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { uploadSignatureWithFallback, uploadAvatarWithFallback } from "@/services/storage/resilient-upload";
import { sanitizeSvg } from "@/lib/svg-sanitizer";
import { invalidateSignatureCache } from "@/app/api/signatures/[userId]/route";
import { AcademicStandingSchema, validateSubjectGroupNotLegacy } from "@/lib/permissions";

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
      data: { signatureUrl: null, hasSignature: false }
    });
    revalidatePath("/profile");
    return { success: true, signatureUrl: null };
  }

  const trimmed = signatureData.trim();
  let finalUrl = trimmed;

  try {
    let isSvg = false;
    let buffer: Buffer;
    let mimeType = "image/png";

    if (trimmed.startsWith("<svg") || trimmed.includes("<svg")) {
      const cleanSvg = sanitizeSvg(trimmed);
      buffer = Buffer.from(cleanSvg, "utf8");
      isSvg = true;
      mimeType = "image/svg+xml";
    } else if (trimmed.startsWith("data:image/svg+xml")) {
      const rawContent = decodeURIComponent(trimmed.replace(/^data:image\/svg\+xml;[^,]*,/, ""));
      const cleanSvg = sanitizeSvg(rawContent);
      buffer = Buffer.from(cleanSvg, "utf8");
      isSvg = true;
      mimeType = "image/svg+xml";
    } else if (trimmed.startsWith("data:image/")) {
      const parts = trimmed.split(",");
      const base64Str = parts[1] || parts[0];
      buffer = Buffer.from(base64Str, "base64");
      const match = trimmed.match(/^data:([^;]+);/);
      if (match) mimeType = match[1];
    } else {
      buffer = Buffer.from(trimmed, "utf8");
    }

    const uploadRes = await uploadSignatureWithFallback({
      buffer,
      userId: session.user.id,
      isSvg,
      mimeType,
    });

    // Point User.signatureUrl to the private authenticated streaming route
    finalUrl = `/api/signatures/${session.user.id}?v=${Date.now()}`;

    await prisma.user.update({
      where: { id: session.user.id },
      data: { signatureUrl: finalUrl, hasSignature: true }
    });

    invalidateSignatureCache(session.user.id);
    revalidatePath("/profile");
    return { success: true, signatureUrl: finalUrl };
  } catch (err: any) {
    console.error("[setUserSignature] Error saving signature:", err);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { signatureUrl: trimmed, hasSignature: true }
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

  let finalSignatureUrl = data.signatureUrl;
  if (data.signatureUrl) {
    const sigTrimmed = data.signatureUrl.trim();
    try {
      let isSvg = false;
      let buffer: Buffer;
      let mimeType = "image/png";

      if (sigTrimmed.startsWith("<svg") || sigTrimmed.includes("<svg")) {
        const cleanSvg = sanitizeSvg(sigTrimmed);
        buffer = Buffer.from(cleanSvg, "utf8");
        isSvg = true;
        mimeType = "image/svg+xml";
      } else if (sigTrimmed.startsWith("data:image/svg+xml")) {
        const rawContent = decodeURIComponent(sigTrimmed.replace(/^data:image\/svg\+xml;[^,]*,/, ""));
        const cleanSvg = sanitizeSvg(rawContent);
        buffer = Buffer.from(cleanSvg, "utf8");
        isSvg = true;
        mimeType = "image/svg+xml";
      } else if (sigTrimmed.startsWith("data:image/")) {
        const parts = sigTrimmed.split(",");
        const base64Str = parts[1] || parts[0];
        buffer = Buffer.from(base64Str, "base64");
        const match = sigTrimmed.match(/^data:([^;]+);/);
        if (match) mimeType = match[1];
      } else {
        buffer = Buffer.from(sigTrimmed, "utf8");
      }

      const sigRes = await uploadSignatureWithFallback({
        buffer,
        userId: session.user.id,
        isSvg,
        mimeType,
      });
      finalSignatureUrl = `/api/signatures/${session.user.id}?v=${Date.now()}`;
    } catch (e) {
      console.warn("[updateProfile] Signature upload fallback:", e);
      finalSignatureUrl = sigTrimmed;
    }
  }

  let normalizedEmail: string | undefined = undefined;
  if (data.email !== undefined) {
    const trimmed = data.email.trim().toLowerCase();
    if (trimmed) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) {
        throw new Error("รูปแบบอีเมลไม่ถูกต้อง");
      }
      const existingUser = await prisma.user.findFirst({
        where: {
          email: trimmed,
          id: { not: session.user.id }
        }
      });
      if (existingUser) {
        throw new Error(`อีเมล "${trimmed}" มีผู้ใช้งานในระบบแล้ว`);
      }
      normalizedEmail = trimmed;
    }
  }

    let parsedLevel: string | null | undefined = undefined;
    if (data.level !== undefined) {
      parsedLevel = AcademicStandingSchema.parse(data.level);
    }

    if (data.subjectGroup !== undefined) {
      validateSubjectGroupNotLegacy(data.subjectGroup);
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: data.name,
        ...(normalizedEmail !== undefined && { email: normalizedEmail }),
        subjectGroup: data.subjectGroup,
        lineUserId: data.lineUserId,
        image: finalImageUrl !== undefined ? finalImageUrl : undefined,
        signatureUrl: finalSignatureUrl !== undefined ? finalSignatureUrl : undefined,
        hasSignature: finalSignatureUrl !== undefined ? Boolean(finalSignatureUrl) : undefined,
        address: data.address !== undefined ? data.address : undefined,
        phoneNumber: data.phoneNumber !== undefined ? data.phoneNumber : undefined,
        level: parsedLevel,
      }
    });

  if (normalizedEmail) {
    try {
      await prisma.account.updateMany({
        where: {
          userId: session.user.id,
          providerId: "credential"
        },
        data: {
          accountId: normalizedEmail
        }
      });
    } catch (e) {
      console.warn("[updateProfile] Account credential sync fallback:", e);
    }
  }

  revalidatePath("/profile");
  return { success: true };
}

