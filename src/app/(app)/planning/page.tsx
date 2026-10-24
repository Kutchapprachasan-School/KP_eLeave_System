import React from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPlanningLedgerAction } from "@/app/actions/planning-project";
import { getPlanningPermissions } from "@/lib/planning/permissions";
import { PlanningDashboardClient } from "./_components/PlanningDashboardClient";
import { Map, ShieldCheck, Lock } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "แผนงานโครงการ & ติดตามงบประมาณ | โรงเรียนสุราษฎร์ธานี",
  description: "ระบบบริหารจัดการแผนงานโครงการ กิจกรรมย่อย และติดตามการเบิกจ่ายงบประมาณสถานศึกษา",
};

export default async function PlanningPage({
  searchParams,
}: {
  searchParams?: Promise<{ fy?: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const user = session?.user;

  if (!user) {
    redirect("/sign-in");
  }

  // Calculate default Thai Fiscal Year (starts in October)
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();
  const defaultFiscalYear = currentMonth >= 10 ? currentYear + 543 + 1 : currentYear + 543;

  const resolvedParams = searchParams ? await searchParams : undefined;
  const requestedFy = resolvedParams?.fy ? parseInt(resolvedParams.fy, 10) : defaultFiscalYear;
  const fiscalYear = isNaN(requestedFy) ? defaultFiscalYear : requestedFy;

  // Fetch System Settings & permissions
  const settings = await prisma.systemSettings.findUnique({
    where: { id: "default" },
    select: {
      enablePlanning: true,
      planningOfficerUserIds: true,
    },
  });

  const permissions = getPlanningPermissions(
    { id: user.id, role: user.role },
    {
      enablePlanning: settings?.enablePlanning ?? true,
      planningOfficerUserIds: settings?.planningOfficerUserIds || "",
    }
  );

  const isAdmin = user.role === "ADMIN";

  // If system disabled and not admin, show graceful notice
  if (settings && settings.enablePlanning === false && !isAdmin) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-800">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          ระบบแผนงานโครงการปิดให้บริการชั่วคราว
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-sm">
          ระบบแผนงานโครงการและติดตามงบประมาณอยู่ระหว่างการปรับปรุงข้อมูลโดยผู้ดูแลระบบ กรุณาติดต่อฝ่ายแผนงานสถานศึกษา
        </p>
      </div>
    );
  }

  // Fetch ledger data
  const ledgerResult = await getPlanningLedgerAction({ fiscalYear });
  const projects = ledgerResult.success ? ledgerResult.data.projects : [];
  const summary = ledgerResult.success
    ? ledgerResult.data.portfolioSummary
    : {
        totalEffectiveBudget: 0,
        totalReservedAmount: 0,
        totalPaidAmount: 0,
        totalSpentAmount: 0,
        totalRemainingBalance: 0,
        projectCount: 0,
        activityCount: 0,
      };

  // Fetch available departments for filter
  const departments = await prisma.department.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Fetch active users for assignment pickers
  const users = await prisma.user.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, position: true },
    orderBy: { name: "asc" },
  });

  // Calculate available fiscal years list
  const availableFiscalYears = [
    defaultFiscalYear + 1,
    defaultFiscalYear,
    defaultFiscalYear - 1,
    defaultFiscalYear - 2,
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in-50">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
            <Map className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                แผนงานโครงการ & ติดตามงบประมาณ
              </h1>
              {permissions.canManageProjectsAndBudget && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>เจ้าหน้าที่แผนงานและการเงิน</span>
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              ปีงบประมาณ พ.ศ. {fiscalYear} • ภาพรวมโครงการ กิจกรรมย่อย และความพร้อมเอกสารประกันคุณภาพ (SAR)
            </p>
          </div>
        </div>
      </div>

      {/* Main Interactive Dashboard Client */}
      <PlanningDashboardClient
        initialProjects={projects}
        initialSummary={summary}
        departments={departments}
        users={users}
        currentUserId={user.id}
        canManageBudget={permissions.canManageProjectsAndBudget}
        defaultFiscalYear={fiscalYear}
        availableFiscalYears={availableFiscalYears}
      />
    </div>
  );
}
