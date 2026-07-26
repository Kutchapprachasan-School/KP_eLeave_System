"use client";

import { useSession } from "@/lib/auth-client";
import { PageHeader } from "@/components/ui/page-header";
import { FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { hasRepairPermission } from "@/lib/permissions";
import RepairSummaryReportView from "./RepairSummaryReportView";

export default function RepairSummaryReportPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const canViewCost = user ? hasRepairPermission(user, "repair:view.cost") : false;

  return (
    <div className="space-y-6 pb-8">
      <div className="print:hidden">
        <PageHeader
          title="สรุปการดำเนินงานระบบแจ้งซ่อม"
          description="รายงานสรุปผลการดำเนินงานแจ้งซ่อม (รายเดือน/รอบประเมิน/รายปี)"
          icon={FileText}
          action={
            <Link href="/repair">
              <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm cursor-pointer">
                <ArrowLeft className="w-4 h-4" />
                กลับหน้ารายการซ่อม
              </button>
            </Link>
          }
        />
      </div>

      <RepairSummaryReportView canViewCost={canViewCost} />
    </div>
  );
}
