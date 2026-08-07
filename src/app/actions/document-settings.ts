"use server";

import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { getSession } from "@/lib/auth-session";

async function checkAuth() {
  // Allow bypassing auth in CLI / test scripts
  if (process.env.BYPASS_AUTH === "true") {
    return { id: "test-user-id", role: "ADMIN" };
  }

  const session = await getSession().catch(() => null);
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  const user = session.user as any;
  const isAdmin = user.role === "ADMIN" || user.position === "แอดมิน";
  const isHRHead = user.position === "หัวหน้างานบุคคล" || user.role === "HR_HEAD" || user.position === "HR_HEAD";
  const isTeacher = user.role === "TEACHER" || user.position === "ครู" || user.position === "TEACHER";
  
  if (!isAdmin && !isHRHead && !isTeacher) {
    throw new Error("Unauthorized");
  }
  return user;
}

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
    revalidateTag("memo-sections");
    revalidateTag("signee-presets");
    revalidateTag("document-configs");
  } catch (e) {
    // Ignore error when running in CLI test environment
  }
}

// MemoSection Actions with 24-hour Server Cache (On-demand revalidation on edit)
export const getMemoSections = unstable_cache(
  async () => {
    return prisma.memoSection.findMany({
      orderBy: [
        { sortOrder: "asc" },
        { code: "asc" }
      ]
    });
  },
  ["memo-sections-cache"],
  { revalidate: 86400, tags: ["memo-sections"] }
);

export async function upsertMemoSection(
  id: string | null,
  name: string,
  code: string,
  isActive: boolean = true,
  color: string = "#6366f1",
  icon: string = "Folder",
  sortOrder: number = 0,
  prefix?: string,
  useThaiNumerals?: boolean,
  paddingDigits?: number,
  yearFormat?: string,
  nextSeq?: number
) {
  await checkAuth();
  const codeUpper = code.trim().toUpperCase();
  const targetCurrentSeq = nextSeq !== undefined ? Math.max(0, nextSeq - 1) : undefined;

  if (id) {
    const updated = await prisma.memoSection.update({
      where: { id },
      data: { name, code: codeUpper, isActive, color, icon, sortOrder }
    });
    
    // Create or update DocumentConfig for this section
    await prisma.documentConfig.upsert({
      where: { memoSectionId: updated.id },
      update: {
        prefix: prefix !== undefined ? prefix : `${codeUpper}`,
        useThaiNumerals: useThaiNumerals !== undefined ? useThaiNumerals : true,
        paddingDigits: paddingDigits !== undefined ? paddingDigits : 1,
        yearFormat: yearFormat !== undefined ? yearFormat : "TH_BE",
        ...(targetCurrentSeq !== undefined ? { currentSeq: targetCurrentSeq } : {})
      },
      create: {
        docType: "MEMO",
        memoSectionId: updated.id,
        prefix: prefix !== undefined ? prefix : `${codeUpper}`,
        useThaiNumerals: useThaiNumerals !== undefined ? useThaiNumerals : true,
        paddingDigits: paddingDigits !== undefined ? paddingDigits : 1,
        yearFormat: yearFormat !== undefined ? yearFormat : "TH_BE",
        currentSeq: targetCurrentSeq !== undefined ? targetCurrentSeq : 0
      }
    });
    
    safeRevalidatePath("/document/settings");
    return updated;
  } else {
    const created = await prisma.memoSection.create({
      data: { name, code: codeUpper, isActive, color, icon, sortOrder }
    });
    
    await prisma.documentConfig.create({
      data: {
        docType: "MEMO",
        memoSectionId: created.id,
        prefix: prefix !== undefined ? prefix : `${codeUpper}`,
        useThaiNumerals: useThaiNumerals !== undefined ? useThaiNumerals : true,
        paddingDigits: paddingDigits !== undefined ? paddingDigits : 1,
        yearFormat: yearFormat !== undefined ? yearFormat : "TH_BE",
        currentSeq: targetCurrentSeq !== undefined ? targetCurrentSeq : 0
      }
    });
    
    safeRevalidatePath("/document/settings");
    return created;
  }
}

export async function deleteMemoSection(id: string) {
  await checkAuth();
  await prisma.memoSection.delete({ where: { id } });
  safeRevalidatePath("/document/settings");
  return { success: true };
}

// SigneePreset Actions with 24-hour Server Cache
async function fetchSigneePresetsDirect() {
  return prisma.signeePreset.findMany({
    orderBy: [{ isCommon: "desc" }, { name: "asc" }]
  });
}

export const getSigneePresets = unstable_cache(
  async () => {
    return fetchSigneePresetsDirect();
  },
  ["signee-presets-cache"],
  { revalidate: 86400, tags: ["signee-presets"] }
);

export async function upsertSigneePreset(id: string | null, name: string, position: string, isCommon: boolean = true) {
  await checkAuth();
  if (id) {
    const updated = await prisma.signeePreset.update({
      where: { id },
      data: { name, position, isCommon }
    });
    safeRevalidatePath("/document/settings");
    return updated;
  } else {
    const created = await prisma.signeePreset.create({
      data: { name, position, isCommon }
    });
    safeRevalidatePath("/document/settings");
    return created;
  }
}

export async function deleteSigneePreset(id: string) {
  await checkAuth();
  await prisma.signeePreset.delete({ where: { id } });
  safeRevalidatePath("/document/settings");
  return { success: true };
}

// DocumentConfig Actions with 24-hour Server Cache
async function fetchDocumentConfigsDirect() {
  let existing = await prisma.documentConfig.findMany({
    include: { memoSection: true }
  });

  // Auto-migrate or clean up legacy "OUTGOING" base config if "OUTGOING_NORMAL" exists
  const legacyOutgoing = existing.find((c) => c.docType === "OUTGOING" && !c.memoSectionId);
  if (legacyOutgoing) {
    const hasNormal = existing.some((c) => c.docType === "OUTGOING_NORMAL" && !c.memoSectionId);
    if (!hasNormal) {
      await prisma.documentConfig.update({
        where: { id: legacyOutgoing.id },
        data: { docType: "OUTGOING_NORMAL" }
      });
      (legacyOutgoing as any).docType = "OUTGOING_NORMAL";
    } else {
      await prisma.documentConfig.delete({
        where: { id: legacyOutgoing.id }
      });
      existing = existing.filter((c) => c.id !== legacyOutgoing.id);
    }
  }

  const baseTypes = [
    { docType: "OUTGOING_NORMAL", prefix: "ที่ ศทก" },
    { docType: "OUTGOING_CIRCULAR", prefix: "ที่ ศทก" },
    { docType: "COMMAND", prefix: "คำสั่งที่" },
    { docType: "ANNOUNCEMENT", prefix: "ประกาศที่" },
  ];

  for (const item of baseTypes) {
    const found = existing.find((c) => c.docType === item.docType && !c.memoSectionId);
    if (!found) {
      const created = await prisma.documentConfig.create({
        data: {
          docType: item.docType,
          prefix: item.prefix,
          useThaiNumerals: true,
          paddingDigits: 1,
          yearFormat: "TH_BE",
          currentSeq: 0,
        },
        include: { memoSection: true }
      });
      existing.push(created as any);
    }
  }

  return existing;
}

export const getDocumentConfigs = unstable_cache(
  async () => {
    return fetchDocumentConfigsDirect();
  },
  ["document-configs-cache"],
  { revalidate: 86400, tags: ["document-configs"] }
);

export async function saveDocumentConfig(
  id: string,
  prefix: string,
  useThaiNumerals: boolean,
  paddingDigits: number,
  yearFormat: string,
  nextSeq?: number
) {
  await checkAuth();
  const targetCurrentSeq = nextSeq !== undefined ? Math.max(0, nextSeq - 1) : undefined;
  const updated = await prisma.documentConfig.update({
    where: { id },
    data: {
      prefix,
      useThaiNumerals,
      paddingDigits,
      yearFormat,
      ...(targetCurrentSeq !== undefined ? { currentSeq: targetCurrentSeq } : {})
    }
  });
  safeRevalidatePath("/document/settings");
  return { success: true, data: updated };
}
