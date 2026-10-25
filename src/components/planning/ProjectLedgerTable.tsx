"use client";

import React from "react";
import {
  BUDGET_SOURCE_LABELS,
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
} from "lucide-react";

interface ProjectLedgerTableProps {
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
}

/**
 * แถบความก้าวหน้าการใช้เงินแบบ 2 ชั้น (Stacked Progress Bar: Paid + Reserved)
 */
function StackedBudgetProgressBar({
  paidPercentage,
  reservedPercentage,
  usagePercentage,
}: {
  paidPercentage: number;
  reservedPercentage: number;
  usagePercentage: number;
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
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-gray-800 ring-1 ring-inset ring-slate-200/80 dark:ring-gray-700">
        {/* ส่วนที่เบิกจ่ายจริงแล้ว (PAID) */}
        {paidPercentage > 0 && (
          <div
            style={{ width: `${paidPercentage}%` }}
            className="bg-blue-600 transition-all duration-300"
            title={`เบิกจ่ายจริงแล้ว ${paidPercentage}%`}
          />
        )}
        {/* ส่วนที่กันวงเงินจองไว้ (RESERVED) */}
        {reservedPercentage > 0 && (
          <div
            style={{ width: `${reservedPercentage}%` }}
            className="bg-amber-400 transition-all duration-300"
            title={`กันวงเงินจอง ${reservedPercentage}%`}
          />
        )}
      </div>
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
        <span className="font-medium text-slate-700 dark:text-slate-300">รวม {usagePercentage}%</span>
      </div>
    </div>
  );
}

/**
 * ป้ายสีตามสถานะโครงการ
 */
function ProjectStatusBadge({ status }: { status: ProjectDTO["status"] }) {
  const badgeStyles: Record<ProjectDTO["status"], string> = {
    DRAFT: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
    APPROVED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    IN_PROGRESS: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
    COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    CANCELLED: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${badgeStyles[status] || "bg-slate-100 text-slate-700 border-slate-200"}`}
    >
      {PROJECT_STATUS_LABELS[status] || status}
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
}: ProjectLedgerTableProps) {
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
      {projects.map((project) => {
        const isExpanded = expandedProjectIds.has(project.id);
        const { financials, permissions } = project;
        const { sarReadiness } = financials;
        const bSourceKey = project.budgetSource || project.budgetSourceType;
        const deptName = project.department?.name || project.departmentName || "-";
        const leaderName = project.leader?.name || project.leaderUserName || "-";

        const paidPct = financials.paidPercentage ?? (financials.effectiveBudget > 0 ? Number(((financials.paidAmount / financials.effectiveBudget) * 100).toFixed(1)) : 0);
        const resPct = financials.reservedPercentage ?? (financials.effectiveBudget > 0 ? Number(((financials.reservedAmount / financials.effectiveBudget) * 100).toFixed(1)) : 0);
        const usePct = financials.usagePercentage ?? (financials.effectiveBudget > 0 ? Number(((financials.totalSpent / financials.effectiveBudget) * 100).toFixed(1)) : 0);
        const hasWarning = financials.hasUnallocatedWarning ?? (financials.unallocatedBudget !== 0);

        const canManageBudget = permissions?.canManageProjectsAndBudget ?? permissions?.canManageProject ?? false;
        const canAttach = permissions?.canManageAttachments ?? true;

        return (
          <div
            key={project.id}
            className="overflow-hidden rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs transition-shadow hover:shadow-md"
          >
            {/* ========================================================= */}
            {/* LEVEL 1: แถวโครงการหลัก (Project Master Card / Row) */}
            {/* ========================================================= */}
            <div className="border-b border-slate-100 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-850/60 p-4 sm:p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                {/* ข้อมูลโครงการด้านซ้าย */}
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => onToggleExpand(project.id)}
                    aria-label={isExpanded ? "ย่อกิจกรรมย่อย" : "กางกิจกรรมย่อย"}
                    aria-expanded={isExpanded}
                    className="mt-0.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1.5 text-slate-600 dark:text-slate-300 shadow-2xs hover:bg-slate-100 dark:hover:bg-gray-700 hover:text-slate-900 cursor-pointer"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  <div className="space-y-2">
                    {/* บรรทัดที่ 1: รหัสโครงการ + ชื่อโครงการ + ป้ายสถานะ */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-slate-900 dark:bg-slate-800 px-2 py-0.5 font-mono text-xs font-semibold text-white dark:text-slate-300">
                        {project.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => onToggleExpand(project.id)}
                        className="text-left text-base font-bold text-slate-900 dark:text-white hover:text-blue-700 dark:hover:text-blue-400 cursor-pointer"
                      >
                        {project.name}
                      </button>
                      <ProjectStatusBadge status={project.status} />
                    </div>

                    {/* บรรทัดที่ 2: ฝ่ายงาน + แหล่งเงิน + หัวหน้าโครงการ + กลยุทธ์ */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {deptName}
                      </span>
                      <span>•</span>
                      <span className="rounded-md bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 font-medium text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {BUDGET_SOURCE_LABELS[bSourceKey] || bSourceKey}
                      </span>
                      <span>•</span>
                      <span>
                        หัวหน้าโครงการ:{" "}
                        <strong className="text-slate-800 dark:text-slate-200">
                          {leaderName}
                        </strong>
                      </span>
                      {project.strategyCode && (
                        <>
                          <span>•</span>
                          <span>กลยุทธ์: {project.strategyCode}</span>
                        </>
                      )}
                    </div>

                    {/* บรรทัดที่ 3: สถานะเอกสาร SAR 3 ช่อง + ปุ่มจัดการเอกสารแนบ + ป้ายเตือนงบยังไม่จัดสรร */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <div className="inline-flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1 text-xs">
                        <span className="font-medium text-slate-500 dark:text-slate-400">
                          เอกสาร SAR:
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 ${
                            sarReadiness.hasProposal
                              ? "font-medium text-emerald-700 dark:text-emerald-400"
                              : "text-slate-400 dark:text-gray-500"
                          }`}
                        >
                          {sarReadiness.hasProposal ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Circle className="h-3.5 w-3.5" />
                          )}
                          เล่มโครงการ
                        </span>
                        <span className="text-slate-300 dark:text-gray-600">|</span>
                        <span
                          className={`inline-flex items-center gap-1 ${
                            sarReadiness.hasApproval
                              ? "font-medium text-emerald-700 dark:text-emerald-400"
                              : "text-slate-400 dark:text-gray-500"
                          }`}
                        >
                          {sarReadiness.hasApproval ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Circle className="h-3.5 w-3.5" />
                          )}
                          ขออนุมัติ
                        </span>
                        <span className="text-slate-300 dark:text-gray-600">|</span>
                        <span
                          className={`inline-flex items-center gap-1 ${
                            sarReadiness.hasSummary
                              ? "font-medium text-emerald-700 dark:text-emerald-400"
                              : "text-slate-400 dark:text-gray-500"
                          }`}
                        >
                          {sarReadiness.hasSummary ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Circle className="h-3.5 w-3.5" />
                          )}
                          สรุปผล SAR
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenAttachments(project)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/40 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 cursor-pointer"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        <span>
                          เอกสารแนบ ({project.attachments?.length || 0})
                          {canAttach ? " / + แนบไฟล์" : ""}
                        </span>
                      </button>

                      {/* ป้ายเตือนกรณีงบโครงการกับผลรวมงบกิจกรรมย่อยยังไม่ตรงกัน */}
                      {hasWarning && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium ${
                            financials.unallocatedBudget > 0
                              ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300"
                              : "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300"
                          }`}
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {financials.unallocatedBudget > 0
                            ? `รอจัดสรรลงกิจกรรม ${formatCurrencyTHB(financials.unallocatedBudget)}`
                            : `จัดสรรเกินงบโครงการ ${formatCurrencyTHB(Math.abs(financials.unallocatedBudget))}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ข้อมูลตัวเลขการเงินและปุ่มจัดการระดับโครงการด้านขวา */}
                <div className="flex flex-col gap-3 border-t border-slate-200/80 dark:border-gray-800 pt-3 xl:min-w-[440px] xl:border-t-0 xl:pt-0">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-lg bg-white dark:bg-gray-800 p-2.5 ring-1 ring-slate-200/80 dark:ring-gray-700">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">งบสุทธิโครงการ</div>
                      <div className="mt-0.5 text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                        {formatCurrencyTHB(financials.effectiveBudget)}
                      </div>
                      {financials.isAdjusted && (
                        <div
                          className="text-[10px] tabular-nums text-slate-400"
                          title="มีการโอนเกลี่ยงบประมาณจากแผนตั้งต้น"
                        >
                          เดิม {formatCurrencyTHB(financials.allocatedAmount)}
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg bg-white dark:bg-gray-800 p-2.5 ring-1 ring-slate-200/80 dark:ring-gray-700">
                      <div className="text-[11px] text-amber-700 dark:text-amber-400">กันวงเงิน</div>
                      <div className="mt-0.5 text-sm font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                        {formatCurrencyTHB(financials.reservedAmount)}
                      </div>
                    </div>

                    <div className="rounded-lg bg-white dark:bg-gray-800 p-2.5 ring-1 ring-slate-200/80 dark:ring-gray-700">
                      <div className="text-[11px] text-blue-700 dark:text-blue-400">เบิกจ่ายจริง</div>
                      <div className="mt-0.5 text-sm font-semibold tabular-nums text-blue-700 dark:text-blue-400">
                        {formatCurrencyTHB(financials.paidAmount)}
                      </div>
                    </div>

                    <div className="rounded-lg bg-white dark:bg-gray-800 p-2.5 ring-1 ring-slate-200/80 dark:ring-gray-700">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">คงเหลือสุทธิ</div>
                      <div
                        className={`mt-0.5 text-sm font-bold tabular-nums ${
                          financials.remainingBalance < 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-emerald-700 dark:text-emerald-400"
                        }`}
                      >
                        {formatCurrencyTHB(financials.remainingBalance)}
                      </div>
                    </div>
                  </div>

                  {/* แถบ Progress Bar 2 ชั้น + ปุ่มจัดการของเจ้าหน้าที่แผน */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <StackedBudgetProgressBar
                        paidPercentage={paidPct}
                        reservedPercentage={resPct}
                        usagePercentage={usePct}
                      />
                    </div>

                    {canManageBudget && (
                      <div className="flex items-center justify-end gap-1.5 sm:ml-3">
                        <button
                          type="button"
                          onClick={() => onAddActivity(project)}
                          className="inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-slate-900 dark:bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-700 cursor-pointer"
                        >
                          <Plus className="h-4 w-4" />
                          เพิ่มกิจกรรมย่อย
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditProject(project)}
                          aria-label="แก้ไขโครงการ / โอนเกลี่ยงบ"
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-700 hover:text-slate-900 cursor-pointer"
                          title="แก้ไขโครงการ / โอนเกลี่ยงบ"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteProject(project)}
                          aria-label="ลบโครงการ"
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          title="ลบโครงการ"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* LEVEL 2: รายการกิจกรรมย่อยภายใต้โครงการ (Child Activity Rows) */}
            {/* ========================================================= */}
            {isExpanded && (
              <div className="divide-y divide-slate-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                {!project.activities || project.activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <FileText className="h-6 w-6 text-slate-300 dark:text-gray-600" />
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      ยังไม่มีกิจกรรมย่อยในโครงการนี้
                    </p>
                    {canManageBudget && (
                      <button
                        type="button"
                        onClick={() => onAddActivity(project)}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        คลิกเพื่อเพิ่มกิจกรรมย่อยแรก
                      </button>
                    )}
                  </div>
                ) : (
                  project.activities.map((activity) => {
                    const actFin = activity.financials;
                    const respName = activity.responsibleUser?.name || activity.responsibleUserName || "-";
                    const actExpensesCount = actFin.activeExpenseCount ?? (activity.expenses?.filter(e => e.status !== "CANCELLED").length || 0);
                    const actReservedCount = actFin.reservedExpenseCount ?? (activity.expenses?.filter(e => e.status === "RESERVED").length || 0);
                    const canSettle = activity.permissions?.canRecordAndSettleExpenses ?? canManageBudget;
                    const canManageAct = activity.permissions?.canManageProjectsAndBudget ?? canManageBudget;

                    return (
                      <div
                        key={activity.id}
                        className="flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50/80 dark:hover:bg-gray-800/50 sm:px-6 lg:flex-row lg:items-center lg:justify-between"
                      >
                        {/* ข้อมูลกิจกรรมย่อยด้านซ้าย */}
                        <div className="space-y-1 lg:max-w-md xl:max-w-xl">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex h-5 items-center rounded bg-slate-100 dark:bg-gray-800 px-1.5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                              กิจกรรมที่ {activity.activityNo}
                            </span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {activity.name}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                            <span>
                              ผู้รับผิดชอบ:{" "}
                              <strong className="text-slate-700 dark:text-slate-200">
                                {respName}
                              </strong>
                            </span>

                            {/* ป้ายหมวดค่าใช้จ่ายที่มีการเบิกจริงในกิจกรรมนี้ */}
                            {actFin.usedCategories && actFin.usedCategories.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1">
                                <span>• หมวดที่เบิก:</span>
                                {actFin.usedCategories.map((cat) => (
                                  <span
                                    key={cat}
                                    className="rounded bg-slate-100 dark:bg-gray-800 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300"
                                  >
                                    {EXPENSE_CATEGORY_LABELS[cat] || cat}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ตัวเลขงบประมาณระดับกิจกรรมย่อย + ปุ่มดำเนินการ */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end lg:gap-5">
                          <div className="grid grid-cols-4 gap-3 text-right text-xs">
                            <div>
                              <div className="text-[11px] text-slate-400">
                                งบกิจกรรม
                              </div>
                              <div className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                                {formatCurrencyTHB(actFin.effectiveBudget)}
                              </div>
                              {actFin.isAdjusted && (
                                <div className="text-[10px] tabular-nums text-slate-400">
                                  (เดิม {formatCurrencyTHB(actFin.allocatedAmount)})
                                </div>
                              )}
                            </div>

                            <div>
                              <div className="text-[11px] text-amber-600 dark:text-amber-400">
                                กันวงเงิน
                              </div>
                              <div className="font-medium tabular-nums text-amber-700 dark:text-amber-400">
                                {formatCurrencyTHB(actFin.reservedAmount)}
                              </div>
                            </div>

                            <div>
                              <div className="text-[11px] text-blue-600 dark:text-blue-400">
                                จ่ายแล้ว
                              </div>
                              <div className="font-medium tabular-nums text-blue-700 dark:text-blue-400">
                                {formatCurrencyTHB(actFin.paidAmount)}
                              </div>
                            </div>

                            <div>
                              <div className="text-[11px] text-slate-400">
                                คงเหลือ
                              </div>
                              <div
                                className={`font-bold tabular-nums ${
                                  actFin.remainingBalance < 0
                                    ? "text-rose-600 dark:text-rose-400"
                                    : "text-emerald-700 dark:text-emerald-400"
                                }`}
                              >
                                {formatCurrencyTHB(actFin.remainingBalance)}
                              </div>
                            </div>
                          </div>

                          {/* ปุ่ม Actions ของกิจกรรมย่อย */}
                          <div className="flex flex-wrap items-center gap-2">
                            {canSettle && (
                              <button
                                type="button"
                                onClick={() =>
                                  onRecordExpense(project, activity)
                                }
                                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-emerald-700 cursor-pointer"
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
                              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-700 cursor-pointer"
                            >
                              <History className="h-4 w-4 text-slate-500" />
                              <span>
                                ประวัติเงิน ({actExpensesCount})
                              </span>
                              {actReservedCount > 0 && (
                                <span className="rounded-full bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                                  รอเคลียร์ {actReservedCount}
                                </span>
                              )}
                            </button>

                            {canManageAct && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onEditActivity(project, activity)
                                  }
                                  aria-label="แก้ไขกิจกรรมย่อย"
                                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-700 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                                  title="แก้ไขกิจกรรมย่อย"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onDeleteActivity(project, activity)
                                  }
                                  aria-label="ลบกิจกรรมย่อย"
                                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 cursor-pointer"
                                  title="ลบกิจกรรมย่อย"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
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
  );
}
