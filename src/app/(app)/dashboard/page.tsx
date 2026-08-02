"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { getSystemSettings } from "@/app/actions/settings";
import { getRepairDashboardStatsAction } from "@/app/actions/repair/report";
import { hasRepairPermission } from "@/lib/permissions";
import DashboardShell from "./_components/DashboardShell";
import LeaveDashboardClient from "./_components/LeaveDashboardClient";
import RepairDashboardView, { type RepairDashStats } from "./_components/RepairDashboardView";
import DocumentDashboardView from "./_components/DocumentDashboardView";
import { Loader2 } from "lucide-react";

function DashboardContent() {
  const { data: session, isPending } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [systemSettings, setSystemSettings] = useState<any>(null);
  const [repairStats, setRepairStats] = useState<RepairDashStats | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (mounted && session?.user) {
      getSystemSettings()
        .then(setSystemSettings)
        .catch((err) => console.error("Failed to load settings on dashboard:", err));
    }
  }, [mounted, session]);

  const enableRepair = systemSettings?.enableRepair ?? false;
  const currentUser = (session?.user as any) || {};
  const userRole = currentUser?.role ?? "TEACHER";

  const canViewRepairDash =
    hasRepairPermission(currentUser, "repair:dashboard") &&
    (userRole === "ADMIN" || !!enableRepair);

  const canViewCost = hasRepairPermission(currentUser, "repair:view.cost");

  const availableSystems = [
    { id: "leave", label: "ระบบการลา", icon: "CalendarDays" as const },
    { id: "document", label: "ระบบงานสารบรรณ", icon: "FileText" as const },
    ...(canViewRepairDash
      ? [{ id: "repair", label: "ระบบแจ้งซ่อม", icon: "Wrench" as const }]
      : []),
  ];

  const rawSystem = searchParams.get("system");
  const activeSystem = availableSystems.some((s) => s.id === rawSystem)
    ? rawSystem!
    : "leave";

  useEffect(() => {
    if (mounted && activeSystem === "repair" && canViewRepairDash) {
      getRepairDashboardStatsAction()
        .then((res: any) => setRepairStats(res as RepairDashStats))
        .catch((err) => console.error("Failed to load repair stats:", err));
    }
  }, [mounted, activeSystem, canViewRepairDash]);

  if (isPending || !mounted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <DashboardShell
      initialSystem={activeSystem}
      availableSystems={availableSystems}
      leaveView={<LeaveDashboardClient />}
      documentView={<DocumentDashboardView />}
      repairView={
        repairStats ? (
          <RepairDashboardView stats={repairStats} canViewCost={canViewCost} />
        ) : null
      }
    />
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
