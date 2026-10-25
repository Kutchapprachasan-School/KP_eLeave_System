import React from "react";
import { redirect } from "next/navigation";
import { getPlanningDashboardDataAction } from "@/actions/planning/project-actions";
import { PlanningDashboardClient } from "@/components/planning/PlanningDashboardClient";
import { AlertCircle } from "lucide-react";

interface PlanningPageProps {
  searchParams?: Promise<{
    year?: string;
    fy?: string;
  }>;
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ระบบแผนงานโครงการและติดตามงบประมาณ | โรงเรียนสุราษฎร์ธานี",
  description:
    "ระบบบริหารจัดการแผนปฏิบัติการประจำปี ติดตามการเบิกจ่ายงบประมาณ และจัดเก็บเอกสารประกันคุณภาพ (SAR)",
};

export default async function PlanningPage({ searchParams }: PlanningPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};

  // คำนวณปีงบประมาณ พ.ศ. ปัจจุบันเป็นค่าเริ่มต้น (หากเดือน ต.ค. - ธ.ค. ให้บวกเป็นปีงบประมาณถัดไป)
  const now = new Date();
  const currentThaiYear =
    now.getFullYear() + 543 + (now.getMonth() >= 9 ? 1 : 0);

  const rawYear = resolvedSearchParams.year || resolvedSearchParams.fy;
  const parsedYear = rawYear ? parseInt(rawYear, 10) : currentThaiYear;

  const selectedFiscalYear = Number.isNaN(parsedYear)
    ? currentThaiYear
    : parsedYear;

  const result = await getPlanningDashboardDataAction({
    fiscalYear: selectedFiscalYear,
  });

  if (!result.success) {
    if (
      result.error?.includes("Unauthorized") ||
      result.error?.includes("เข้าสู่ระบบ")
    ) {
      redirect("/login");
    }

    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="flex items-start gap-4 rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-xs dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <h1 className="text-lg font-semibold">
              ไม่สามารถเข้าถึงระบบแผนงานโครงการและงบประมาณ
            </h1>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
              {result.error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PlanningDashboardClient
      initialData={result.data}
      selectedFiscalYear={selectedFiscalYear}
    />
  );
}
