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
import DocumentDashboardView from "./_components/DocumentDashboardView";

export const metadata: Metadata = {
  title: "แดชบอร์ด",
  description: "แดชบอร์ดสรุปสถิติภาพรวมและการทำงานระบบย่อยของโรงเรียน",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ system?: string }>;
}) {
  let session = null;
  try {
    session = await auth.api.getSession({
      headers: await headers(),
    });
  } catch (err) {
    console.error("Dashboard auth session fetch error:", err);
  }

  if (!session?.user) {
    redirect("/login");
  }

  // Get system settings — wrapped in try/catch so DB failure doesn't crash the entire page
  let systemSettings: any = null;
  try {
    systemSettings = await getSystemSettings();
  } catch (err) {
    console.error("Failed to load system settings on dashboard:", err);
  }

  // Safe-access settings with fallback defaults
  const enableRepair = systemSettings?.enableRepair ?? false;

  // Derive repair dashboard permissions safely
  const currentUser = session.user as any;
  const userRole = currentUser?.role ?? "TEACHER";
  const canViewRepairDash =
    hasRepairPermission(currentUser, "repair:dashboard") &&
    (userRole === "ADMIN" || !!enableRepair);

  const canViewCost = hasRepairPermission(currentUser, "repair:view.cost");

  // Define available dashboard tabs based on permissions & features enabled
  const availableSystems = [
    { id: "leave", label: "ระบบการลา", icon: "CalendarDays" as const },
    { id: "document", label: "ระบบงานสารบรรณ", icon: "FileText" as const },
    ...(canViewRepairDash
      ? [{ id: "repair", label: "ระบบแจ้งซ่อม", icon: "Wrench" as const }]
      : []),
  ];

  // Validate search param safely
  let rawSystem: string | undefined;
  try {
    const resolvedParams = searchParams ? await searchParams : {};
    rawSystem = resolvedParams?.system;
  } catch (err) {
    console.error("Failed to resolve searchParams on dashboard:", err);
  }

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
      documentView={<DocumentDashboardView />}
      repairView={
        repairStats ? (
          <RepairDashboardView stats={repairStats} canViewCost={canViewCost} />
        ) : null
      }
    />
  );
}
