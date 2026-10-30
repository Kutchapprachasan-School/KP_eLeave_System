"use client";

import React from "react";
import {
  BUDGET_SOURCE_LABELS,
  BudgetSourceCategoryType,
  EXPENSE_CATEGORY_LABELS,
  PROJECT_STATUS_LABELS,
  ProjectActivityDTO,
  ProjectDTO,
} from "@/lib/planning/types";
import { formatCurrencyTHB } from "./FinancialMetricCards";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Paperclip,
  Plus,
  Receipt,
  History,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Edit3,
  Trash2,
  FolderOpen,
  User,
  GraduationCap,
  Users,
  Landmark,
  Building2,
  Coins,
  MoreVertical,
  FileCheck2,
  UploadCloud,
  Clock,
  Lock,
  Unlock,
} from "lucide-react";

/**
 * Badge แสดงแหล่งเงินงบประมาณ แยกสีและไอคอนเฉพาะประเภทอย่างชัดเจน
 */
export function BudgetSourceBadge({
  sourceKey,
}: {
  sourceKey?: string | null;
}) {
  const key = (sourceKey || "SUBSIDY") as BudgetSourceCategoryType;
  const label = BUDGET_SOURCE_LABELS[key] || sourceKey || "งบประมาณ";

  switch (key) {
    case "FREE_EDUCATION_15Y":
      // กิจกรรมพัฒนาผู้เรียน: โทนเขียวมรกต (Emerald) + GraduationCap
      return (
        <span
          className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 border border-emerald-200 dark:border-emerald-800 text-[10.5px] font-semibold text-emerald-800 dark:text-emerald-300 leading-none shadow-2xs"
          title={`แหล่งเงิน: ${label}`}
        >
          <GraduationCap className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{label}</span>
        </span>
      );

    case "SUBSIDY":
      // จัดการเรียนการสอน: โทนฟ้าสดใส (Sky) + Users
      return (
        <span
          className="inline-flex items-center gap-1 rounded-md bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.5 border border-sky-200 dark:border-sky-800 text-[10.5px] font-semibold text-sky-800 dark:text-sky-300 leading-none shadow-2xs"
          title={`แหล่งเงิน: ${label}`}
        >
          <Users className="h-3 w-3 text-sky-600 dark:text-sky-400 shrink-0" />
          <span>{label}</span>
        </span>
      );

    case "SCHOOL_REVENUE":
    case "SCHOOL_INCOME":
      // เงินรายได้สถานศึกษา: โทนส้มอำพัน (Amber) + Landmark
      return (
        <span
          className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 border border-amber-200 dark:border-amber-800 text-[10.5px] font-semibold text-amber-900 dark:text-amber-300 leading-none shadow-2xs"
          title={`แหล่งเงิน: ${label}`}
        >
          <Landmark className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>{label}</span>
        </span>
      );

    case "LOCAL_GOV":
      // เงินอุดหนุน อปท./อบจ.: โทนม่วง (Purple) + Building2
      return (
        <span
          className="inline-flex items-center gap-1 rounded-md bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 border border-purple-200 dark:border-purple-800 text-[10.5px] font-semibold text-purple-800 dark:text-purple-300 leading-none shadow-2xs"
          title={`แหล่งเงิน: ${label}`}
        >
          <Building2 className="h-3 w-3 text-purple-600 dark:text-purple-400 shrink-0" />
          <span>{label}</span>
        </span>
      );

    case "OTHER":
    default:
      // เงินนอกงบประมาณ/อื่นๆ: โทนคราม (Indigo) + Coins
      return (
        <span
          className="inline-flex items-center gap-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 border border-indigo-200 dark:border-indigo-800 text-[10.5px] font-semibold text-indigo-800 dark:text-indigo-300 leading-none shadow-2xs"
          title={`แหล่งเงิน: ${label}`}
        >
          <Coins className="h-3 w-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>{label}</span>
        </span>
      );
  }
}

export interface ProjectLedgerTableProps {
  projects: ProjectDTO[];
  expandedProjectIds: Set<string>;
  onToggleExpand: (projectId: string) => void;
  onEditProject: (project: ProjectDTO) => void;
  onDeleteProject: (project: ProjectDTO) => void;
  onAddActivity: (project: ProjectDTO) => void;
  onEditActivity: (project: ProjectDTO, activity: ProjectActivityDTO) => void;
  onDeleteActivity: (project: ProjectDTO, activity: ProjectActivityDTO) => void;
  onOpenAttachments: (project: ProjectDTO) => void;
  onRecordExpense: (project: ProjectDTO, activity: ProjectActivityDTO) => void;
  onOpenExpenseHistory: (
    project: ProjectDTO,
    activity: ProjectActivityDTO
  ) => void;
  onOpenActivityReport?: (
    project: ProjectDTO,
    activity: ProjectActivityDTO,
    initialTab?: "DOCUMENT" | "REPORT"
  ) => void;
  onLockProject?: (project: ProjectDTO) => void;
  onUnlockProject?: (project: ProjectDTO) => void;
}

/**
 * แถบความก้าวหน้าการใช้เงินแบบ 2 ชั้น (Stacked Progress Bar: Paid + Reserved)
 */
export function StackedBudgetProgressBar({
  paidPercentage,
  reservedPercentage,
  usagePercentage,
  compact = false,
}: {
  paidPercentage: number;
  reservedPercentage: number;
  usagePercentage: number;
  compact?: boolean;
}) {
  return (
    <div
      className="w-full"
      role="progressbar"
      aria-label="ความคืบหน้าการใช้งบประมาณ"
      aria-valuenow={Math.min(100, Math.round(usagePercentage))}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`flex w-full overflow-hidden rounded-full bg-slate-100 dark:bg-gray-800 ring-1 ring-inset ring-slate-200/80 dark:ring-gray-700 ${
          compact ? "h-2" : "h-2.5"
        }`}
      >
        {/* ส่วนที่เบิกจ่ายจริงแล้ว (PAID) */}
        {paidPercentage > 0 && (
          <div
            style={{ width: `${Math.max(0, Math.min(100, paidPercentage))}%` }}
            className="bg-blue-600 transition-all duration-300"
            title={`เบิกจ่ายจริงแล้ว ${paidPercentage}%`}
          />
        )}
        {/* ส่วนที่กันวงเงินจองไว้ (RESERVED) */}
        {reservedPercentage > 0 && (
          <div
            style={{ width: `${Math.max(0, Math.min(100 - paidPercentage, reservedPercentage))}%` }}
            className="bg-amber-400 transition-all duration-300"
            title={`กันวงเงินจอง ${reservedPercentage}%`}
          />
        )}
      </div>
      {!compact && (
        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              จ่ายจริง {paidPercentage}%
            </span>
            {reservedPercentage > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                กันเงิน {reservedPercentage}%
              </span>
            )}
          </div>
          <span className="font-medium text-slate-700 dark:text-slate-300">
            รวม {usagePercentage}%
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * ป้ายสีตามสถานะโครงการ
 */
export function ProjectStatusBadge({ status }: { status: ProjectDTO["status"] }) {
  const configs: Record<
    ProjectDTO["status"],
    { pill: string; dot: string }
  > = {
    APPROVED: {
      pill: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
      dot: "bg-emerald-500",
    },
    IN_PROGRESS: {
      pill: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
      dot: "bg-blue-500",
    },
    COMPLETED: {
      pill: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
      dot: "bg-teal-500",
    },
    DRAFT: {
      pill: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
      dot: "bg-slate-400",
    },
    CANCELLED: {
      pill: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
      dot: "bg-rose-500",
    },
  };

  if (status === "COMPLETED") {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 px-2.5 py-0.5 text-xs font-semibold text-teal-700 dark:text-teal-300 shadow-2xs whitespace-nowrap"
        title="โครงการนี้ปิดงบประมาณเรียบร้อยแล้ว (ล็อคข้อมูล)"
      >
        <Lock className="h-3 w-3 shrink-0 text-teal-600 dark:text-teal-400" />
        <span>ปิดงบแล้ว</span>
      </span>
    );
  }

  const config = configs[status] || configs.DRAFT;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-2xs whitespace-nowrap ${config.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${config.dot}`} />
      <span>{PROJECT_STATUS_LABELS[status] || status}</span>
    </span>
  );
}

export function ProjectLedgerTable({
  projects,
  expandedProjectIds,
  onToggleExpand,
  onEditProject,
  onDeleteProject,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  onOpenAttachments,
  onRecordExpense,
  onOpenExpenseHistory,
  onOpenActivityReport,
  onLockProject,
  onUnlockProject,
}: ProjectLedgerTableProps) {
  const [activeActionMenuId, setActiveActionMenuId] = React.useState<string | null>(null);
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-16 text-center">
        <div className="rounded-full bg-slate-100 dark:bg-gray-800 p-4 text-slate-400">
          <FolderOpen className="h-8 w-8" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
          ไม่พบข้อมูลโครงการตามเงื่อนไขที่ค้นหา
        </h3>
        <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
          ลองปรับเปลี่ยนคำค้นหา เลือกฝ่าย/กลุ่มสาระฯ อื่น หรือกดปุ่มสร้างโครงการใหม่เพื่อเริ่มต้นวางแผนงบประมาณประจำปี
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* 1. DESKTOP & TABLET VIEW: High-Density Financial Ledger Table (ตารางคุมงบ) */}
      {/* ========================================================================= */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200/90 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 dark:bg-gray-850 border-b border-slate-200/90 dark:border-gray-800 text-xs font-bold text-slate-700 dark:text-slate-200">
              <tr>
                <th scope="col" className="py-3.5 pl-6 pr-3 w-[33%] text-left">
                  โครงการ / ฝ่ายงาน / หัวหน้า
                </th>
                <th scope="col" className="py-3.5 px-3 w-[17%] text-left">
                  สถานะเอกสาร
                </th>
                <th scope="col" className="py-3.5 px-3 w-[11%] text-left">
                  งบสุทธิ
                </th>
                <th scope="col" className="py-3.5 px-3 w-[9%] text-left">
                  กันเงิน
                </th>
                <th scope="col" className="py-3.5 px-3 w-[12%] text-left">
                  เบิกจ่ายแล้ว
                </th>
                <th scope="col" className="py-3.5 px-3 w-[11%] text-left">
                  คงเหลือสุทธิ
                </th>
                <th scope="col" className="py-3.5 pr-6 pl-3 w-[7%] text-left">
                  การจัดการ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-gray-800 text-xs">
              {projects.map((project) => {
                const isExpanded = expandedProjectIds.has(project.id);
                const { financials, permissions } = project;
                const { sarReadiness } = financials;
                const bSourceKey = project.budgetSource || project.budgetSourceType;
                const deptName =
                  project.department?.name || project.departmentName || "-";
                const leaderName =
                  project.leader?.name || project.leaderUserName || "-";

                const paidPct =
                  financials.paidPercentage ??
                  (financials.effectiveBudget > 0
                    ? Number(
                        ((financials.paidAmount / financials.effectiveBudget) *
                          100).toFixed(1)
                      )
                    : 0);
                const resPct =
                  financials.reservedPercentage ??
                  (financials.effectiveBudget > 0
                    ? Number(
                        (
                          (financials.reservedAmount /
                            financials.effectiveBudget) *
                          100
                        ).toFixed(1)
                      )
                    : 0);
                const usePct =
                  financials.usagePercentage ??
                  (financials.effectiveBudget > 0
                    ? Number(
                        ((financials.totalSpent / financials.effectiveBudget) *
                          100).toFixed(1)
                      )
                    : 0);
                const hasWarning =
                  financials.hasUnallocatedWarning ??
                  financials.unallocatedBudget !== 0;

                const canManageBudget =
                  permissions?.canManageProjectsAndBudget ??
                  permissions?.canManageProject ??
                  false;
                const canAttach = permissions?.canManageAttachments ?? true;

                return (
                  <React.Fragment key={project.id}>
                    <tr
                      className={`transition-colors hover:bg-slate-50/90 dark:hover:bg-gray-800/60 ${
                        isExpanded
                          ? "bg-slate-50/40 dark:bg-gray-850/40 font-medium"
                          : ""
                      }`}
                    >
                      {/* คอลัมน์ที่ 1: โครงการ / ฝ่ายงาน / หัวหน้า */}
                      <td className="py-4 pl-6 pr-3 align-top">
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => onToggleExpand(project.id)}
                            aria-label={
                              isExpanded ? "ย่อกิจกรรมย่อย" : "กางดูกิจกรรมย่อย"
                            }
                            aria-expanded={isExpanded}
                            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shadow-2xs hover:border-slate-300 transition-colors cursor-pointer"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                          </button>

                          <div className="min-w-0 space-y-1">
                            <div>
                              <span className="inline-block rounded-full bg-[#0c356a] px-2.5 py-0.5 font-mono text-[11px] font-bold text-white shadow-2xs">
                                {project.code}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => onToggleExpand(project.id)}
                              className="block text-left text-sm font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer leading-snug"
                            >
                              {project.name}
                            </button>

                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {deptName}
                            </div>

                            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                              <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span>{leaderName}</span>
                            </div>

                            {/* ป้ายแหล่งเงินและเตือนจัดสรรงบ */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              <BudgetSourceBadge sourceKey={bSourceKey} />
                              {hasWarning && (
                                <span
                                  className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                                    financials.unallocatedBudget > 0
                                      ? "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                      : "bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                                  }`}
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                  {financials.unallocatedBudget > 0
                                    ? `รอจัดสรร ${formatCurrencyTHB(financials.unallocatedBudget)}`
                                    : `เกินงบ ${formatCurrencyTHB(Math.abs(financials.unallocatedBudget))}`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* คอลัมน์ที่ 2: สถานะเอกสาร */}
                      <td className="py-4 px-3 align-top">
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs">
                            {/* 1. เล่ม */}
                            <div className="flex items-center gap-1" title={sarReadiness.hasProposal ? "มีไฟล์เล่มโครงการแล้ว" : "ยังไม่มีไฟล์เล่มโครงการ"}>
                              {sarReadiness.hasProposal ? (
                                <CheckCircle2 className="h-4 w-4 fill-blue-600 text-white shrink-0" />
                              ) : (
                                <Circle className="h-4 w-4 text-slate-300 dark:text-gray-600 shrink-0" />
                              )}
                              <span
                                className={
                                  sarReadiness.hasProposal
                                    ? "font-medium text-slate-800 dark:text-slate-200"
                                    : "text-slate-400 dark:text-gray-500"
                                }
                              >
                                เล่ม
                              </span>
                            </div>

                            <div className="h-[1.5px] w-2 bg-slate-300 dark:bg-gray-700 shrink-0 self-center" />

                            {/* 2. อนุมัติ */}
                            <div className="flex items-center gap-1" title={sarReadiness.hasApproval ? "มีไฟล์อนุมัติโครงการแล้ว" : "ยังไม่มีไฟล์อนุมัติ"}>
                              {sarReadiness.hasApproval ? (
                                <CheckCircle2 className="h-4 w-4 fill-blue-600 text-white shrink-0" />
                              ) : (
                                <Circle className="h-4 w-4 text-slate-300 dark:text-gray-600 shrink-0" />
                              )}
                              <span
                                className={
                                  sarReadiness.hasApproval
                                    ? "font-medium text-slate-800 dark:text-slate-200"
                                    : "text-slate-400 dark:text-gray-500"
                                }
                              >
                                อนุมัติ
                              </span>
                            </div>

                            <div className="h-[1.5px] w-2 bg-slate-300 dark:bg-gray-700 shrink-0 self-center" />

                            {/* 3. สรุปกิจกรรม */}
                            {(() => {
                              const actReports = sarReadiness.activityReports || {
                                total: 0,
                                submitted: 0,
                                isComplete: false,
                                isPartial: false,
                              };
                              return (
                                <div
                                  className="flex items-center gap-1"
                                  title={
                                    actReports.total === 0
                                      ? "ไม่มีกิจกรรมย่อย"
                                      : actReports.isComplete
                                      ? `ส่งรายงานกิจกรรมครบแล้ว (${actReports.submitted}/${actReports.total})`
                                      : actReports.isPartial
                                      ? `ส่งรายงานแล้วแต่ยังไม่ครบ (${actReports.submitted}/${actReports.total} กิจกรรม)`
                                      : `ยังไม่ได้ส่งรายงานกิจกรรม (0/${actReports.total})`
                                  }
                                >
                                  {actReports.total === 0 ? (
                                    <Circle className="h-4 w-4 text-slate-300 dark:text-gray-600 shrink-0" />
                                  ) : actReports.isComplete ? (
                                    <CheckCircle2 className="h-4 w-4 fill-blue-600 text-white shrink-0" />
                                  ) : actReports.isPartial ? (
                                    <Clock className="h-4 w-4 text-amber-500 shrink-0 animate-pulse" />
                                  ) : (
                                    <Circle className="h-4 w-4 text-slate-300 dark:text-gray-600 shrink-0" />
                                  )}
                                  <div className="leading-tight text-[11px] whitespace-nowrap">
                                    <div
                                      className={
                                        actReports.isComplete
                                          ? "font-medium text-slate-800 dark:text-slate-200"
                                          : actReports.isPartial
                                          ? "font-semibold text-amber-600 dark:text-amber-400"
                                          : "text-slate-400 dark:text-gray-500"
                                      }
                                    >
                                      สรุป
                                    </div>
                                    <div
                                      className={
                                        actReports.isComplete
                                          ? "font-medium text-slate-800 dark:text-slate-200"
                                          : actReports.isPartial
                                          ? "font-semibold text-amber-600 dark:text-amber-400"
                                          : "text-slate-400 dark:text-gray-500"
                                      }
                                    >
                                      กิจกรรม {actReports.total > 0 ? `(${actReports.submitted}/${actReports.total})` : "(0/0)"}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            <div className="h-[1.5px] w-2 bg-slate-300 dark:bg-gray-700 shrink-0 self-center" />

                            {/* 4. สรุปโครงการ */}
                            <div className="flex items-center gap-1" title={sarReadiness.hasProjectSummary ? "มีเล่มรายงานสรุปโครงการภาพรวมแล้ว" : "ยังไม่มีเล่มรายงานสรุปโครงการ"}>
                              {sarReadiness.hasProjectSummary ? (
                                <CheckCircle2 className="h-4 w-4 fill-blue-600 text-white shrink-0" />
                              ) : (
                                <Circle className="h-4 w-4 text-slate-300 dark:text-gray-600 shrink-0" />
                              )}
                              <div className="leading-tight text-[11px] whitespace-nowrap">
                                <div
                                  className={
                                    sarReadiness.hasProjectSummary
                                      ? "font-medium text-slate-800 dark:text-slate-200"
                                      : "text-slate-400 dark:text-gray-500"
                                  }
                                >
                                  สรุป
                                </div>
                                <div
                                  className={
                                    sarReadiness.hasProjectSummary
                                      ? "font-medium text-slate-800 dark:text-slate-200"
                                      : "text-slate-400 dark:text-gray-500"
                                  }
                                >
                                  โครงการ
                                </div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <button
                              type="button"
                              onClick={() => onOpenAttachments(project)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/40 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-pointer transition-colors shadow-2xs"
                            >
                              <Paperclip className="h-3 w-3" />
                              <span>ไฟล์แนบ ({project.attachments?.length || 0})</span>
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* คอลัมน์ที่ 3: งบสุทธิ */}
                      <td className="py-4 px-3 align-top">
                        <div className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                          {formatCurrencyTHB(financials.effectiveBudget)}
                        </div>
                        {financials.isAdjusted && (
                          <div
                            className="text-[10px] tabular-nums text-slate-400 mt-0.5"
                            title="งบประมาณตั้งต้นก่อนโอนเกลี่ย"
                          >
                            เดิม {formatCurrencyTHB(financials.allocatedAmount)}
                          </div>
                        )}
                      </td>

                      {/* คอลัมน์ที่ 4: กันเงิน */}
                      <td className="py-4 px-3 align-top">
                        <div className="text-sm font-semibold tabular-nums text-amber-500 dark:text-amber-400">
                          {formatCurrencyTHB(financials.reservedAmount)}
                        </div>
                      </td>

                      {/* คอลัมน์ที่ 5: เบิกจ่ายแล้ว */}
                      <td className="py-4 px-3 align-top">
                        <div className="w-28">
                          <div className="text-right text-sm font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                            {formatCurrencyTHB(financials.paidAmount)}
                          </div>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-blue-100 dark:bg-gray-800">
                            <div
                              style={{ width: `${Math.min(100, Math.max(0, paidPct))}%` }}
                              className="h-full bg-blue-600 rounded-full transition-all duration-300"
                            />
                          </div>
                          <div className="mt-1 text-right text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                            ใช้ไป {usePct}%
                          </div>
                        </div>
                      </td>

                      {/* คอลัมน์ที่ 6: คงเหลือสุทธิ */}
                      <td className="py-4 px-3 align-top">
                        <div
                          className={`text-sm font-bold tabular-nums ${
                            financials.remainingBalance < 0
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {formatCurrencyTHB(financials.remainingBalance)}
                        </div>
                      </td>

                      {/* คอลัมน์ที่ 7: การจัดการ */}
                      <td className="py-4 pr-6 pl-3 align-top">
                        <div className="flex items-center gap-1.5">
                          <ProjectStatusBadge status={project.status} />

                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveActionMenuId(
                                  activeActionMenuId === project.id ? null : project.id
                                )
                              }
                              aria-label="ตัวเลือกโครงการ"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-gray-800 dark:hover:text-slate-200 cursor-pointer transition-colors"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {activeActionMenuId === project.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-20"
                                  onClick={() => setActiveActionMenuId(null)}
                                />
                                <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1 shadow-lg z-30 text-xs">
                                  {/* Lock / Unlock Option */}
                                  {canManageBudget && (
                                    project.status === "COMPLETED" ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveActionMenuId(null);
                                          onUnlockProject?.(project);
                                        }}
                                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer font-medium"
                                      >
                                        <Unlock className="h-3.5 w-3.5" />
                                        <span>ปลดล็อคแก้ไข</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveActionMenuId(null);
                                          onLockProject?.(project);
                                        }}
                                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors cursor-pointer font-medium"
                                      >
                                        <Lock className="h-3.5 w-3.5 text-slate-500" />
                                        <span>ปิดงบประมาณ (ล็อค)</span>
                                      </button>
                                    )
                                  )}

                                  {canManageBudget && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveActionMenuId(null);
                                          onAddActivity(project);
                                        }}
                                        disabled={project.status === "COMPLETED"}
                                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors cursor-pointer font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                                      >
                                        <Plus className="h-3.5 w-3.5 text-blue-600" />
                                        <span>เพิ่มกิจกรรมย่อย</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveActionMenuId(null);
                                          onEditProject(project);
                                        }}
                                        disabled={project.status === "COMPLETED"}
                                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors cursor-pointer font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                                      >
                                        <Edit3 className="h-3.5 w-3.5 text-slate-500" />
                                        <span>แก้ไขโครงการ / ปรับงบ</span>
                                      </button>
                                    </>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      onOpenAttachments(project);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors cursor-pointer font-medium"
                                  >
                                    <Paperclip className="h-3.5 w-3.5 text-slate-500" />
                                    <span>จัดการไฟล์แนบ</span>
                                  </button>
                                  {canManageBudget && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        onDeleteProject(project);
                                      }}
                                      disabled={project.status === "COMPLETED"}
                                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      <span>ลบโครงการ</span>
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* รายการกิจกรรมย่อยเมื่อกดกางแถวโครงการ (Expanded Child Activity Table) */}
                    {isExpanded && (
                      <tr className="bg-slate-50/60 dark:bg-gray-850/40">
                        <td colSpan={7} className="p-0 border-b border-slate-200 dark:border-gray-800">
                          <div className="px-5 py-3.5 space-y-3 border-l-4 border-l-blue-600 dark:border-l-blue-500">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                                  กิจกรรมย่อยภายใต้โครงการ ({project.activities?.length || 0} รายการ)
                                </span>
                              </div>
                              {canManageBudget && (
                                <button
                                  type="button"
                                  onClick={() => onAddActivity(project)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-slate-900 dark:bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-700 cursor-pointer transition-colors"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  <span>เพิ่มกิจกรรมย่อย</span>
                                </button>
                              )}
                            </div>

                            {!project.activities || project.activities.length === 0 ? (
                              <div className="rounded-lg border border-dashed border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-6 text-center">
                                <FileText className="mx-auto h-6 w-6 text-slate-300 dark:text-gray-600" />
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  ยังไม่มีกิจกรรมย่อยในโครงการนี้
                                </p>
                              </div>
                            ) : (
                              <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xs">
                                <table className="w-full text-left border-collapse">
                                  <thead className="bg-slate-100/80 dark:bg-gray-800/80 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-gray-700">
                                    <tr>
                                      <th scope="col" className="py-2.5 px-3.5 w-[36%]">
                                        กิจกรรมย่อย / ผู้รับผิดชอบ / หมวดที่เบิก
                                      </th>
                                      <th scope="col" className="py-2.5 px-2.5 w-[11%] text-right">
                                        งบกิจกรรม
                                      </th>
                                      <th scope="col" className="py-2.5 px-2.5 w-[11%] text-right">
                                        กันเงิน
                                      </th>
                                      <th scope="col" className="py-2.5 px-2.5 w-[11%] text-right">
                                        จ่ายแล้ว
                                      </th>
                                      <th scope="col" className="py-2.5 px-2.5 w-[11%] text-right">
                                        คงเหลือ
                                      </th>
                                      <th scope="col" className="py-2.5 px-3.5 w-[20%] text-right">
                                        การเงิน / จัดการ
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-gray-800 text-xs">
                                    {project.activities.map((activity) => {
                                      const actFin = activity.financials;
                                      const respName =
                                        activity.responsibleUser?.name ||
                                        activity.responsibleUserName ||
                                        "-";
                                      const actExpensesCount =
                                        actFin.activeExpenseCount ??
                                        (activity.expenses?.filter(
                                          (e) => e.status !== "CANCELLED"
                                        ).length || 0);
                                      const actReservedCount =
                                        actFin.reservedExpenseCount ??
                                        (activity.expenses?.filter(
                                          (e) => e.status === "RESERVED"
                                        ).length || 0);
                                      const canSettle =
                                        activity.permissions
                                          ?.canRecordAndSettleExpenses ??
                                        canManageBudget;
                                      const canManageAct =
                                        (activity.permissions?.canEditActivity ??
                                          activity.permissions?.canManageProjectsAndBudget) ??
                                        canManageBudget;

                                      return (
                                        <tr
                                          key={activity.id}
                                          className="hover:bg-slate-50/80 dark:hover:bg-gray-800/40 transition-colors"
                                        >
                                          {/* ชื่อกิจกรรม & ผู้รับผิดชอบ */}
                                          <td className="py-2.5 px-3.5 align-middle">
                                            <div className="space-y-0.5">
                                              <div className="flex items-center gap-1.5">
                                                <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                                  #{activity.activityNo}
                                                </span>
                                                <span className="font-semibold text-slate-900 dark:text-white">
                                                  {activity.name}
                                                </span>
                                              </div>
                                              <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500 dark:text-slate-400">
                                                <span>
                                                  ผู้รับผิดชอบ:{" "}
                                                  <strong className="text-slate-700 dark:text-slate-300 font-medium">
                                                    {respName}
                                                  </strong>
                                                </span>
                                                {/* 1. ไฟล์กิจกรรมย่อย */}
                                                {activity.documentAttachment ? (
                                                  <span className="inline-flex items-center gap-1">
                                                    <span>•</span>
                                                    <a
                                                      href={activity.documentAttachment.fileUrl}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="inline-flex items-center gap-1 rounded bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 text-[10.5px] font-semibold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
                                                      title={`ดูไฟล์กิจกรรม: ${activity.documentAttachment.title}`}
                                                    >
                                                      <FileText className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                                      <span>ไฟล์กิจกรรม ↗</span>
                                                    </a>
                                                    {onOpenActivityReport && (activity.permissions?.canManageFiles || activity.permissions?.canUploadReport) && (
                                                      <button
                                                        type="button"
                                                        onClick={() => onOpenActivityReport(project, activity, "DOCUMENT")}
                                                        className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline cursor-pointer"
                                                        title="จัดการไฟล์กิจกรรมย่อย"
                                                      >
                                                        จัดการ
                                                      </button>
                                                    )}
                                                  </span>
                                                ) : (
                                                  onOpenActivityReport && (activity.permissions?.canManageFiles || activity.permissions?.canUploadReport) && (
                                                    <span className="inline-flex items-center gap-1">
                                                      <span>•</span>
                                                      <button
                                                        type="button"
                                                        onClick={() => onOpenActivityReport(project, activity, "DOCUMENT")}
                                                        className="inline-flex items-center gap-1 rounded border border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20 px-1.5 py-0.5 text-[10.5px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100/70 transition-colors cursor-pointer"
                                                        title="แนบไฟล์กิจกรรมย่อย"
                                                      >
                                                        <UploadCloud className="h-3 w-3" />
                                                        <span>+ แนบไฟล์กิจกรรม</span>
                                                      </button>
                                                    </span>
                                                  )
                                                )}

                                                {/* 2. รายงานสรุปกิจกรรมย่อย */}
                                                {activity.reportAttachment ? (
                                                  <span className="inline-flex items-center gap-1">
                                                    <span>•</span>
                                                    <a
                                                      href={activity.reportAttachment.fileUrl}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="inline-flex items-center gap-1 rounded bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                                                      title={`ดูรายงาน: ${activity.reportAttachment.title}`}
                                                    >
                                                      <FileCheck2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                                      <span>รายงานสรุป ↗</span>
                                                    </a>
                                                    {onOpenActivityReport && (activity.permissions?.canUploadReport || activity.permissions?.canManageFiles) && (
                                                      <button
                                                        type="button"
                                                        onClick={() => onOpenActivityReport(project, activity, "REPORT")}
                                                        className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline cursor-pointer"
                                                        title="จัดการรายงานกิจกรรมย่อย"
                                                      >
                                                        จัดการ
                                                      </button>
                                                    )}
                                                  </span>
                                                ) : (
                                                  onOpenActivityReport && (activity.permissions?.canUploadReport || activity.permissions?.canManageFiles) && (
                                                    <span className="inline-flex items-center gap-1">
                                                      <span>•</span>
                                                      <button
                                                        type="button"
                                                        onClick={() => onOpenActivityReport(project, activity, "REPORT")}
                                                        className="inline-flex items-center gap-1 rounded border border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 px-1.5 py-0.5 text-[10.5px] font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100/70 transition-colors cursor-pointer"
                                                        title="แนบไฟล์หรือลิงก์รายงานสรุปกิจกรรมย่อย"
                                                      >
                                                        <UploadCloud className="h-3 w-3" />
                                                        <span>+ แนบรายงาน</span>
                                                      </button>
                                                    </span>
                                                  )
                                                )}
                                                {actFin.usedCategories &&
                                                  actFin.usedCategories.length >
                                                    0 && (
                                                    <>
                                                      <span>•</span>
                                                      <span className="flex items-center gap-1">
                                                        {actFin.usedCategories.map(
                                                          (cat) => (
                                                            <span
                                                              key={cat}
                                                              className="rounded bg-slate-100 dark:bg-gray-800 px-1 py-0.2 text-[10px] text-slate-600 dark:text-slate-400"
                                                            >
                                                              {EXPENSE_CATEGORY_LABELS[
                                                                cat
                                                              ] || cat}
                                                            </span>
                                                          )
                                                        )}
                                                      </span>
                                                    </>
                                                  )}
                                              </div>
                                            </div>
                                          </td>

                                          {/* งบกิจกรรม */}
                                          <td className="py-2.5 px-2.5 align-middle text-right">
                                            <div className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                                              {formatCurrencyTHB(
                                                actFin.effectiveBudget
                                              )}
                                            </div>
                                          </td>

                                          {/* กันเงิน */}
                                          <td className="py-2.5 px-2.5 align-middle text-right">
                                            <div className="font-medium tabular-nums text-amber-700 dark:text-amber-400">
                                              {formatCurrencyTHB(
                                                actFin.reservedAmount
                                              )}
                                            </div>
                                          </td>

                                          {/* จ่ายแล้ว */}
                                          <td className="py-2.5 px-2.5 align-middle text-right">
                                            <div className="font-medium tabular-nums text-blue-700 dark:text-blue-400">
                                              {formatCurrencyTHB(
                                                actFin.paidAmount
                                              )}
                                            </div>
                                          </td>

                                          {/* คงเหลือ */}
                                          <td className="py-2.5 px-2.5 align-middle text-right">
                                            <div
                                              className={`font-bold tabular-nums ${
                                                actFin.remainingBalance < 0
                                                  ? "text-rose-600 dark:text-rose-400"
                                                  : "text-emerald-700 dark:text-emerald-400"
                                              }`}
                                            >
                                              {formatCurrencyTHB(
                                                actFin.remainingBalance
                                              )}
                                            </div>
                                          </td>

                                          {/* ปุ่มการเงินและจัดการ */}
                                          <td className="py-2.5 px-3.5 align-middle text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                              {canSettle && (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    onRecordExpense(
                                                      project,
                                                      activity
                                                    )
                                                  }
                                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer transition-colors shadow-2xs"
                                                  title="บันทึกตัดยอดงบประมาณ"
                                                >
                                                  <Receipt className="h-3.5 w-3.5" />
                                                  <span>บันทึกเงิน</span>
                                                </button>
                                              )}

                                              <button
                                                type="button"
                                                onClick={() =>
                                                  onOpenExpenseHistory(
                                                    project,
                                                    activity
                                                  )
                                                }
                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                                                title="ดูประวัติการเบิกจ่าย"
                                              >
                                                <History className="h-3.5 w-3.5 text-slate-500" />
                                                <span>({actExpensesCount})</span>
                                                {actReservedCount > 0 && (
                                                  <span className="rounded-full bg-amber-100 dark:bg-amber-950/60 px-1.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                                                    รอ {actReservedCount}
                                                  </span>
                                                )}
                                              </button>

                                              {canManageAct && (
                                                <div className="flex items-center gap-0.5">
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      onEditActivity(
                                                        project,
                                                        activity
                                                      )
                                                    }
                                                    aria-label="แก้ไขกิจกรรมย่อย"
                                                    className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-700 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition-colors"
                                                    title="แก้ไขกิจกรรมย่อย"
                                                  >
                                                    <Edit3 className="h-3.5 w-3.5" />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      onDeleteActivity(
                                                        project,
                                                        activity
                                                      )
                                                    }
                                                    aria-label="ลบกิจกรรมย่อย"
                                                    className="rounded p-1 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 cursor-pointer transition-colors"
                                                    title="ลบกิจกรรมย่อย"
                                                  >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MOBILE VIEW: Thumb-Friendly Rich Cards (การ์ดสำหรับหน้าจอมือถือ)        */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3.5">
        {projects.map((project) => {
          const isExpanded = expandedProjectIds.has(project.id);
          const { financials, permissions } = project;
          const { sarReadiness } = financials;
          const bSourceKey = project.budgetSource || project.budgetSourceType;
          const deptName =
            project.department?.name || project.departmentName || "-";
          const leaderName =
            project.leader?.name || project.leaderUserName || "-";

          const paidPct =
            financials.paidPercentage ??
            (financials.effectiveBudget > 0
              ? Number(
                  ((financials.paidAmount / financials.effectiveBudget) * 100).toFixed(
                    1
                  )
                )
              : 0);
          const resPct =
            financials.reservedPercentage ??
            (financials.effectiveBudget > 0
              ? Number(
                  (
                    (financials.reservedAmount / financials.effectiveBudget) *
                    100
                  ).toFixed(1)
                )
              : 0);
          const usePct =
            financials.usagePercentage ??
            (financials.effectiveBudget > 0
              ? Number(
                  ((financials.totalSpent / financials.effectiveBudget) * 100).toFixed(
                    1
                  )
                )
              : 0);
          const hasWarning =
            financials.hasUnallocatedWarning ??
            financials.unallocatedBudget !== 0;

          const canManageBudget =
            permissions?.canManageProjectsAndBudget ??
            permissions?.canManageProject ??
            false;
          const canAttach = permissions?.canManageAttachments ?? true;

          return (
            <div
              key={`mobile-${project.id}`}
              className="overflow-hidden rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs transition-shadow"
            >
              {/* ส่วนหัวการ์ดโครงการ: รหัส + สถานะ + ปุ่มกางดู */}
              <div className="p-4 border-b border-slate-100 dark:border-gray-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded bg-slate-900 dark:bg-slate-800 px-2 py-0.5 font-mono text-xs font-semibold text-white dark:text-slate-300">
                    {project.code}
                  </span>
                  <ProjectStatusBadge status={project.status} />
                </div>

                {/* ชื่อโครงการแตะเพื่อย่อ/ขยาย */}
                <button
                  type="button"
                  onClick={() => onToggleExpand(project.id)}
                  className="w-full text-left font-bold text-base text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer flex items-start justify-between gap-2"
                >
                  <span>{project.name}</span>
                  <span className="mt-1 shrink-0 text-slate-400">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-blue-600" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </span>
                </button>

                {/* รายละเอียดสังกัด, แหล่งเงิน, หัวหน้า */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {deptName}
                  </span>
                  <span>•</span>
                  <BudgetSourceBadge sourceKey={bSourceKey} />
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3 text-slate-400" />
                    {leaderName}
                  </span>
                </div>

                {/* ตารางตัวเลข 4 ช่องในจอมือถือ (2x2 Grid) */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="rounded-lg bg-slate-50 dark:bg-gray-800/70 p-2.5 border border-slate-200/80 dark:border-gray-700/80">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">งบสุทธิโครงการ</div>
                    <div className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                      {formatCurrencyTHB(financials.effectiveBudget)}
                    </div>
                  </div>

                  <div className="rounded-lg bg-amber-50/60 dark:bg-amber-950/30 p-2.5 border border-amber-200/80 dark:border-amber-900/60">
                    <div className="text-[11px] text-amber-700 dark:text-amber-400">กันวงเงินจอง</div>
                    <div className="text-sm font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                      {formatCurrencyTHB(financials.reservedAmount)}
                    </div>
                  </div>

                  <div className="rounded-lg bg-blue-50/60 dark:bg-blue-950/30 p-2.5 border border-blue-200/80 dark:border-blue-900/60">
                    <div className="text-[11px] text-blue-700 dark:text-blue-400">เบิกจ่ายจริง</div>
                    <div className="text-sm font-semibold tabular-nums text-blue-700 dark:text-blue-400">
                      {formatCurrencyTHB(financials.paidAmount)}
                    </div>
                  </div>

                  <div className="rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 p-2.5 border border-emerald-200/80 dark:border-emerald-900/60">
                    <div className="text-[11px] text-emerald-800 dark:text-emerald-300">คงเหลือสุทธิ</div>
                    <div
                      className={`text-sm font-bold tabular-nums ${
                        financials.remainingBalance < 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      {formatCurrencyTHB(financials.remainingBalance)}
                    </div>
                  </div>
                </div>

                {/* แถบ Progress Bar */}
                <div className="pt-1">
                  <StackedBudgetProgressBar
                    paidPercentage={paidPct}
                    reservedPercentage={resPct}
                    usagePercentage={usePct}
                  />
                </div>

                {/* สถานะรายงานสรุป & เอกสารแนบในจอมือถือ */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-gray-800">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">สถานะ:</span>
                    <span
                      className={`inline-flex items-center gap-0.5 ${
                        sarReadiness.hasProposal
                          ? "text-emerald-700 dark:text-emerald-400 font-medium"
                          : "text-slate-400"
                      }`}
                    >
                      {sarReadiness.hasProposal ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Circle className="h-3.5 w-3.5" />
                      )}
                      เล่ม
                    </span>
                    <span className="text-slate-300">|</span>
                    <span
                      className={`inline-flex items-center gap-0.5 ${
                        sarReadiness.hasApproval
                          ? "text-emerald-700 dark:text-emerald-400 font-medium"
                          : "text-slate-400"
                      }`}
                    >
                      {sarReadiness.hasApproval ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Circle className="h-3.5 w-3.5" />
                      )}
                      อนุมัติ
                    </span>
                    <span className="text-slate-300">|</span>
                    {(() => {
                      const actReports = sarReadiness.activityReports || {
                        total: 0,
                        submitted: 0,
                        isComplete: false,
                        isPartial: false,
                      };
                      return (
                        <span
                          className={`inline-flex items-center gap-0.5 ${
                            actReports.isComplete
                              ? "text-emerald-700 dark:text-emerald-400 font-medium"
                              : actReports.isPartial
                              ? "text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/50 px-1 rounded text-[11px]"
                              : "text-slate-400"
                          }`}
                        >
                          {actReports.isComplete ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          ) : actReports.isPartial ? (
                            <Clock className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                          ) : (
                            <Circle className="h-3.5 w-3.5" />
                          )}
                          สรุปกิจกรรม {actReports.total > 0 ? `(${actReports.submitted}/${actReports.total})` : ""}
                        </span>
                      );
                    })()}
                    <span className="text-slate-300">|</span>
                    <span
                      className={`inline-flex items-center gap-0.5 ${
                        sarReadiness.hasProjectSummary
                          ? "text-emerald-700 dark:text-emerald-400 font-medium"
                          : "text-slate-400"
                      }`}
                    >
                      {sarReadiness.hasProjectSummary ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Circle className="h-3.5 w-3.5" />
                      )}
                      สรุปโครงการ
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenAttachments(project)}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/80 dark:bg-blue-950/40 px-3.5 py-2 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    <span>
                      แนบไฟล์ ({project.attachments?.length || 0})
                    </span>
                  </button>
                </div>

                {/* ปุ่มจัดการโครงการระดับมือถือ */}
                {canManageBudget && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-gray-800">
                    {project.status === "COMPLETED" ? (
                      <button
                        type="button"
                        onClick={() => onUnlockProject?.(project)}
                        className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-3 py-2 text-xs font-semibold text-white cursor-pointer shadow-xs"
                      >
                        <Unlock className="h-4 w-4" />
                        ปลดล็อคแก้ไขโครงการ
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onAddActivity(project)}
                          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 dark:bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                        >
                          <Plus className="h-4 w-4" />
                          เพิ่มกิจกรรมย่อย
                        </button>
                        <button
                          type="button"
                          onClick={() => onLockProject?.(project)}
                          aria-label="ปิดงบประมาณ (ล็อค)"
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-slate-700 dark:text-slate-300"
                          title="ปิดงบประมาณ (ล็อคโครงการ)"
                        >
                          <Lock className="h-4 w-4 text-slate-500" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditProject(project)}
                          aria-label="แก้ไขโครงการ"
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-slate-700 dark:text-slate-300"
                          title="แก้ไขโครงการ"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteProject(project)}
                          aria-label="ลบโครงการ"
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-rose-600"
                          title="ลบโครงการ"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* กิจกรรมย่อยในจอมือถือ (เมื่อกางออก) */}
              {isExpanded && (
                <div className="divide-y divide-slate-100 dark:divide-gray-800 bg-slate-50/60 dark:bg-gray-850/60 p-3 space-y-3">
                  {!project.activities || project.activities.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">
                      ยังไม่มีกิจกรรมย่อยในโครงการนี้
                    </div>
                  ) : (
                    project.activities.map((activity) => {
                      const actFin = activity.financials;
                      const respName =
                        activity.responsibleUser?.name ||
                        activity.responsibleUserName ||
                        "-";
                      const actExpensesCount =
                        actFin.activeExpenseCount ??
                        (activity.expenses?.filter(
                          (e) => e.status !== "CANCELLED"
                        ).length || 0);
                      const actReservedCount =
                        actFin.reservedExpenseCount ??
                        (activity.expenses?.filter(
                          (e) => e.status === "RESERVED"
                        ).length || 0);
                      const canSettle =
                        activity.permissions?.canRecordAndSettleExpenses ??
                        canManageBudget;
                      const canManageAct =
                        (activity.permissions?.canEditActivity ??
                          activity.permissions?.canManageProjectsAndBudget) ??
                        canManageBudget;

                      return (
                        <div
                          key={`mobile-act-${activity.id}`}
                          className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                                กิจกรรม #{activity.activityNo}
                              </span>
                              <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                                {activity.name}
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                ผู้รับผิดชอบ:{" "}
                                <strong className="text-slate-700 dark:text-slate-200 font-medium">
                                  {respName}
                                </strong>
                              </p>
                              {/* 1. ไฟล์กิจกรรมย่อย */}
                              <div className="pt-1.5 flex flex-wrap items-center gap-2">
                                {activity.documentAttachment ? (
                                  <div className="flex items-center gap-1.5">
                                    <a
                                      href={activity.documentAttachment.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 px-2 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
                                    >
                                      <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                      <span>ไฟล์กิจกรรม ↗</span>
                                    </a>
                                    {onOpenActivityReport && (activity.permissions?.canManageFiles || activity.permissions?.canUploadReport) && (
                                      <button
                                        type="button"
                                        onClick={() => onOpenActivityReport(project, activity, "DOCUMENT")}
                                        className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 underline"
                                      >
                                        จัดการ
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  onOpenActivityReport && (activity.permissions?.canManageFiles || activity.permissions?.canUploadReport) && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenActivityReport(project, activity, "DOCUMENT")}
                                      className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100/70 transition-colors cursor-pointer"
                                    >
                                      <UploadCloud className="h-3.5 w-3.5" />
                                      <span>+ แนบไฟล์กิจกรรม</span>
                                    </button>
                                  )
                                )}

                                {/* 2. รายงานสรุปกิจกรรมย่อย */}
                                {activity.reportAttachment ? (
                                  <div className="flex items-center gap-1.5">
                                    <a
                                      href={activity.reportAttachment.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                                    >
                                      <FileCheck2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                      <span>รายงานสรุป ↗</span>
                                    </a>
                                    {onOpenActivityReport && (activity.permissions?.canUploadReport || activity.permissions?.canManageFiles) && (
                                      <button
                                        type="button"
                                        onClick={() => onOpenActivityReport(project, activity, "REPORT")}
                                        className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 underline"
                                      >
                                        จัดการ
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  onOpenActivityReport && (activity.permissions?.canUploadReport || activity.permissions?.canManageFiles) && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenActivityReport(project, activity, "REPORT")}
                                      className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 px-2 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100/70 transition-colors cursor-pointer"
                                    >
                                      <UploadCloud className="h-3.5 w-3.5" />
                                      <span>+ แนบรายงาน</span>
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                            {canManageAct && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onEditActivity(project, activity)
                                  }
                                  aria-label="แก้ไขกิจกรรมย่อย"
                                  className="p-1.5 text-slate-400 hover:text-slate-700"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onDeleteActivity(project, activity)
                                  }
                                  aria-label="ลบกิจกรรมย่อย"
                                  className="p-1.5 text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* ตัวเลขการเงินของกิจกรรมในมือถือ */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-slate-50 dark:bg-gray-800 p-2 rounded">
                              <span className="text-[10px] text-slate-500">งบกิจกรรม:</span>
                              <div className="font-bold tabular-nums text-slate-800 dark:text-slate-200">
                                {formatCurrencyTHB(actFin.effectiveBudget)}
                              </div>
                            </div>
                            <div className="bg-amber-50/50 dark:bg-amber-950/30 p-2 rounded">
                              <span className="text-[10px] text-amber-700 dark:text-amber-400">กันวงเงิน:</span>
                              <div className="font-medium tabular-nums text-amber-700 dark:text-amber-400">
                                {formatCurrencyTHB(actFin.reservedAmount)}
                              </div>
                            </div>
                            <div className="bg-blue-50/50 dark:bg-blue-950/30 p-2 rounded">
                              <span className="text-[10px] text-blue-700 dark:text-blue-400">จ่ายแล้ว:</span>
                              <div className="font-medium tabular-nums text-blue-700 dark:text-blue-400">
                                {formatCurrencyTHB(actFin.paidAmount)}
                              </div>
                            </div>
                            <div className="bg-emerald-50/50 dark:bg-emerald-950/30 p-2 rounded">
                              <span className="text-[10px] text-emerald-800 dark:text-emerald-300">คงเหลือ:</span>
                              <div
                                className={`font-bold tabular-nums ${
                                  actFin.remainingBalance < 0
                                    ? "text-rose-600"
                                    : "text-emerald-700 dark:text-emerald-400"
                                }`}
                              >
                                {formatCurrencyTHB(actFin.remainingBalance)}
                              </div>
                            </div>
                          </div>

                          {/* ปุ่ม Actions ในมือถือ */}
                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-gray-800">
                            {canSettle && (
                              <button
                                type="button"
                                onClick={() =>
                                  onRecordExpense(project, activity)
                                }
                                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                              >
                                <Receipt className="h-4 w-4" />
                                <span>บันทึกการใช้เงิน</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                onOpenExpenseHistory(project, activity)
                              }
                              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300"
                            >
                              <History className="h-4 w-4 text-slate-500" />
                              <span>ประวัติเงิน ({actExpensesCount})</span>
                              {actReservedCount > 0 && (
                                <span className="rounded-full bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                                  รอ {actReservedCount}
                                </span>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
