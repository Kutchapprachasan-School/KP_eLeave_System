"use server";

import { getSession } from "@/lib/auth-session";
import { getTelemetrySummary } from "@/lib/telemetry";

export async function getTelemetryStatsAction() {
  const session = await getSession();
  const user = session?.user as any;
  const isAdmin = user?.role === "ADMIN" || user?.position === "แอดมิน";

  // Allow admins or local development mode to view telemetry
  const isDev = process.env.NODE_ENV !== "production";
  if (!isAdmin && !isDev) {
    throw new Error("Unauthorized");
  }

  return getTelemetrySummary();
}
