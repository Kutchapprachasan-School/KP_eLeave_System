"use server";

import { getSession } from "@/lib/auth-session";
import { getSupabaseUsageReport, type SupabaseUsageReport } from "@/services/monitoring/supabase-usage.service";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getSupabaseUsageStatsAction(): Promise<SupabaseUsageReport> {
  const session = await getSession();
  const user = session?.user as any;
  const isAdmin = user?.role === "ADMIN" || user?.position === "แอดมิน";

  const isDev = process.env.NODE_ENV !== "production";
  if (!isAdmin && !isDev) {
    throw new Error("Unauthorized: Only administrators can view Supabase Egress & Quota metrics.");
  }

  // Fetch optional saved monitoring settings from SystemSettings
  let settings: any = null;
  try {
    settings = await prisma.systemSettings.findFirst();
  } catch (err) {
    // Ignore if not present
  }

  let customConfig: any = {};
  if (settings?.extraSettings) {
    try {
      const parsed = JSON.parse(settings.extraSettings);
      if (parsed.monitoring) {
        customConfig = parsed.monitoring;
      }
    } catch (e) {}
  }

  return getSupabaseUsageReport({
    accessToken: customConfig.supabaseAccessToken || process.env.SUPABASE_ACCESS_TOKEN,
    projectRef: customConfig.supabaseProjectRef || process.env.SUPABASE_PROJECT_REF,
    orgSlug: customConfig.supabaseOrgSlug || process.env.SUPABASE_ORG_SLUG || "elhmzcrjulinlolcjkur",
    planType: customConfig.planType || "FREE",
    customEgressLimitGb: customConfig.customEgressLimitGb ? Number(customConfig.customEgressLimitGb) : undefined,
    customDbLimitMb: customConfig.customDbLimitMb ? Number(customConfig.customDbLimitMb) : undefined,
  });
}

export async function saveMonitoringConfigAction(data: {
  supabaseAccessToken?: string;
  supabaseProjectRef?: string;
  supabaseOrgSlug?: string;
  planType?: "FREE" | "PRO" | "CUSTOM";
  customEgressLimitGb?: number;
}) {
  const session = await getSession();
  const user = session?.user as any;
  const isAdmin = user?.role === "ADMIN" || user?.position === "แอดมิน";

  if (!isAdmin) {
    throw new Error("Unauthorized");
  }

  const existing = await prisma.systemSettings.findFirst();
  let extraSettingsObj: any = {};
  if (existing?.extraSettings) {
    try {
      extraSettingsObj = JSON.parse(existing.extraSettings);
    } catch (e) {}
  }

  extraSettingsObj.monitoring = {
    ...extraSettingsObj.monitoring,
    ...data,
  };

  if (existing) {
    await prisma.systemSettings.update({
      where: { id: existing.id },
      data: {
        extraSettings: JSON.stringify(extraSettingsObj),
      },
    });
  } else {
    await prisma.systemSettings.create({
      data: {
        extraSettings: JSON.stringify(extraSettingsObj),
      },
    });
  }

  revalidatePath("/logs");
  return { success: true };
}
