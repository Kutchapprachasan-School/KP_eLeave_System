import { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getSystemSettings } from "@/app/actions/settings";
import { getRepairDashboardStatsAction } from "@/app/actions/repair/report";
import { hasRepairPermission } from "@/lib/permissions";
import DashboardShell from "./_components/DashboardShell";
import LeaveDashboardClient from "./_components/LeaveDashboardClient";
import RepairDashboardView, { type RepairDashStats } from "./_components/RepairDashboardView";

export const metadata: Metadata = {
  title: "แดชบอร์ด | e-Leave",
  description: "แดชบอร์ดสรุปสถิติภาพรวมและการทำงานระบบย่อยของโรงเรียน",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ system?: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  // Get system settings
  const systemSettings = await getSystemSettings();

  // Derive repair dashboard permissions
  // Admin always sees repair dashboard (to manage it even when disabled for others)
  const userRole = (session.user as any).role;
  const canViewRepairDash =
    hasRepairPermission(session.user as any, "repair:dashboard") &&
    (userRole === "ADMIN" || !!systemSettings.enableRepair);

  const canViewCost = hasRepairPermission(session.user as any, "repair:view.cost");

  // Define available dashboard tabs based on permissions & features enabled
  const availableSystems = [
    { id: "leave", label: "ระบบการลา", icon: "CalendarDays" as const },
    ...(canViewRepairDash
      ? [{ id: "repair", label: "ระบบแจ้งซ่อม", icon: "Wrench" as const }]
      : []),
  ];

  // Validate search param
  const rawSystem = (await searchParams).system;
  const activeSystem = availableSystems.some((s) => s.id === rawSystem)
    ? rawSystem!
    : "leave";

  // Fetch repair stats server-side if selected
  let repairStats: RepairDashStats | null = null;
  if (activeSystem === "repair" && canViewRepairDash) {
    try {
      repairStats = (await getRepairDashboardStatsAction()) as RepairDashStats;
    } catch (err) {
      console.error("Failed to load repair dashboard stats on server:", err);
    }
  }

  return (
    <DashboardShell
      initialSystem={activeSystem}
      availableSystems={availableSystems}
      leaveView={<LeaveDashboardClient />}
      repairView={
        repairStats ? (
          <RepairDashboardView stats={repairStats} canViewCost={canViewCost} />
        ) : null
      }
    />
  );
}
