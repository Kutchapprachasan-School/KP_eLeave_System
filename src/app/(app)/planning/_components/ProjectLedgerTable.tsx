"use client";

import React, { useState } from "react";
import { 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  FileCheck, 
  FileSpreadsheet, 
  Plus, 
  Pencil, 
  Trash2, 
  Clock, 
  AlertTriangle, 
  Coins, 
  User, 
  Building2, 
  Paperclip, 
  History, 
  ArrowUpRight 
} from "lucide-react";
import type { 
  ProjectDTO, 
  ProjectActivityDTO, 
  BudgetSourceType 
} from "@/lib/planning/types";

interface ProjectLedgerTableProps {
  projects: ProjectDTO[];
  canManageBudget: boolean;
  currentUserId?: string;
  onEditProject: (project: ProjectDTO) => void;
  onDeleteProject: (project: ProjectDTO) => void;
  onManageAttachments: (project: ProjectDTO) => void;
  onAddActivity: (project: ProjectDTO) => void;
  onEditActivity: (project: ProjectDTO, activity: ProjectActivityDTO) => void;
  onDeleteActivity: (project: ProjectDTO, activity: ProjectActivityDTO) => void;
  onRecordExpense: (project: ProjectDTO, activity: ProjectActivityDTO) => void;
  onViewHistory: (project: ProjectDTO, activity: ProjectActivityDTO) => void;
}

const BUDGET_SOURCE_BADGES: Record<BudgetSourceType, { label: string; color: string }> = {
  SUBSIDY: { label: "เงินอุดหนุน", color: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200" },
  GENERAL_BUDGET: { label: "งบแผ่นดิน", color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200" },
  REVENUE: { label: "รายได้สถานศึกษา", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200" },
  SPECIAL_PROJECT: { label: "โครงการพิเศษ", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200" },
  DONATION: { label: "เงินบริจาค", color: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200" },
};

const CATEGORY_NAMES: Record<string, string> = {
  OPERATING: "ค่าใช้สอย",
  MATERIAL: "ค่าวัสดุ",
  REMUNERATION: "ค่าตอบแทน",
  EQUIPMENT: "ค่าครุภัณฑ์",
  UTILITY: "ค่าสาธารณูปโภค",
  MISCELLANEOUS: "เบ็ดเตล็ด",
};

export function ProjectLedgerTable({
  projects,
  canManageBudget,
  currentUserId,
  onEditProject,
  onDeleteProject,
  onManageAttachments,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  onRecordExpense,
  onViewHistory,
}: ProjectLedgerTableProps) {
  // Expanded project accordion IDs
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(
    new Set(projects.map((p) => p.id))
  );

  const toggleExpand = (projectId: string) => {
    setExpandedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  if (projects.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-800 shadow-xs">
        <Coins className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
        <h3 className="text-base font-bold text-gray-700 dark:text-gray-300 mb-1">
          ไม่พบข้อมูลโครงการตามเงื่อนไขที่เลือก
        </h3>
        <p className="text-xs text-gray-400 max-w-md mx-auto">
          ลองปรับเปลี่ยนตัวกรองค้นหา ปีงบประมาณ หรือกลุ่มสาระการเรียนรู้
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table View (Hidden on mobile) */}
      <div className="hidden lg:block bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 w-10"></th>
                <th className="py-3.5 px-4">ชื่อโครงการ & กิจกรรมย่อย</th>
                <th className="py-3.5 px-4 w-44">ผู้รับผิดชอบ / หน่วยงาน</th>
                <th className="py-3.5 px-4 text-right w-28">งบประมาณ</th>
                <th className="py-3.5 px-4 text-right w-28 text-blue-600 dark:text-blue-400">เบิกจ่ายจริง</th>
                <th className="py-3.5 px-4 text-right w-28 text-amber-600 dark:text-amber-400">กันเงินไว้</th>
                <th className="py-3.5 px-4 text-right w-28 text-emerald-600 dark:text-emerald-400">คงเหลือ</th>
                <th className="py-3.5 px-4 text-center w-36">สถานะเอกสาร SAR</th>
                <th className="py-3.5 px-4 text-right w-40">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {projects.map((project) => {
                const isExpanded = expandedProjectIds.has(project.id);
                const hasActivities = project.activities && project.activities.length > 0;
                const srcBadge = BUDGET_SOURCE_BADGES[project.budgetSourceType];
                const canAttach =
                  canManageBudget ||
                  (currentUserId && project.leaderUserId === currentUserId);

                // Progress Bar calculations
                const effBudget = project.financials.effectiveBudget;
                const paidPct = effBudget > 0 ? (project.financials.paidAmount / effBudget) * 100 : 0;
                const reservedPct = effBudget > 0 ? (project.financials.reservedAmount / effBudget) * 100 : 0;

                return (
                  <React.Fragment key={project.id}>
                    {/* Project Row (Level 1) */}
                    <tr className="bg-white hover:bg-purple-50/20 dark:bg-gray-900 dark:hover:bg-purple-950/20 transition-colors group">
                      {/* Accordion Chevron */}
                      <td className="py-3 px-4 align-top">
                        <button
                          type="button"
                          onClick={() => toggleExpand(project.id)}
                          className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-500 transition-colors cursor-pointer"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Project Name & Badges */}
                      <td className="py-3 px-4 align-top max-w-xs sm:max-w-md">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          {project.code && (
                            <span className="font-mono font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded text-[11px]">
                              {project.code}
                            </span>
                          )}
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${srcBadge?.color}`}>
                            {srcBadge?.label || project.budgetSourceType}
                          </span>
                          {project.unallocatedBudget > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>รอจัดสรร ฿{formatCurrency(project.unallocatedBudget)}</span>
                            </span>
                          )}
                        </div>

                        <div className="font-bold text-sm text-gray-900 dark:text-white leading-snug">
                          {project.name}
                        </div>

                        {/* Stacked Progress Bar */}
                        <div className="mt-2 w-full max-w-sm">
                          <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
                            <div
                              style={{ width: `${paidPct}%` }}
                              className="bg-blue-600 h-full transition-all duration-300"
                              title={`เบิกจ่ายจริง ${paidPct.toFixed(1)}%`}
                            />
                            <div
                              style={{ width: `${reservedPct}%` }}
                              className="bg-amber-500 h-full transition-all duration-300"
                              title={`กันเงิน ${reservedPct.toFixed(1)}%`}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Leader & Department */}
                      <td className="py-3 px-4 align-top">
                        <div className="font-medium text-gray-800 dark:text-gray-200">
                          {project.leaderUser?.name || "ไม่ระบุหัวหน้า"}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400 text-[11px] mt-0.5">
                          {project.department?.name || "-"}
                        </div>
                      </td>

                      {/* Effective Budget */}
                      <td className="py-3 px-4 text-right align-top">
                        <div className="font-bold text-gray-900 dark:text-white text-sm">
                          ฿{formatCurrency(project.financials.effectiveBudget)}
                        </div>
                        {project.financials.isAdjusted && (
                          <div className="text-[10px] text-gray-400 line-through">
                            ฿{formatCurrency(project.financials.allocatedAmount)}
                          </div>
                        )}
                      </td>

                      {/* Paid */}
                      <td className="py-3 px-4 text-right align-top font-bold text-blue-600 dark:text-blue-400 text-sm">
                        ฿{formatCurrency(project.financials.paidAmount)}
                      </td>

                      {/* Reserved */}
                      <td className="py-3 px-4 text-right align-top font-bold text-amber-600 dark:text-amber-400 text-sm">
                        ฿{formatCurrency(project.financials.reservedAmount)}
                      </td>

                      {/* Remaining */}
                      <td className="py-3 px-4 text-right align-top font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        ฿{formatCurrency(project.financials.remainingBalance)}
                      </td>

                      {/* SAR Readiness 3-Badges */}
                      <td className="py-3 px-4 text-center align-top">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Proposal */}
                          <button
                            type="button"
                            onClick={() => onManageAttachments(project)}
                            className={`p-1.5 rounded-lg border text-[11px] transition-colors cursor-pointer ${
                              project.sarReadiness.hasProposal
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200"
                                : "text-gray-300 dark:text-gray-600 border-dashed border-gray-200 dark:border-gray-800 hover:border-gray-400"
                            }`}
                            title="เล่มโครงการ (คลิกเพื่อเปิด/แนบ)"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* Approval */}
                          <button
                            type="button"
                            onClick={() => onManageAttachments(project)}
                            className={`p-1.5 rounded-lg border text-[11px] transition-colors cursor-pointer ${
                              project.sarReadiness.hasApproval
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200"
                                : "text-gray-300 dark:text-gray-600 border-dashed border-gray-200 dark:border-gray-800 hover:border-gray-400"
                            }`}
                            title="แบบขออนุมัติโครงการ (คลิกเพื่อเปิด/แนบ)"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                          </button>

                          {/* Summary SAR */}
                          <button
                            type="button"
                            onClick={() => onManageAttachments(project)}
                            className={`p-1.5 rounded-lg border text-[11px] transition-colors cursor-pointer ${
                              project.sarReadiness.hasSummary
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200"
                                : "text-gray-300 dark:text-gray-600 border-dashed border-gray-200 dark:border-gray-800 hover:border-gray-400"
                            }`}
                            title="รายงานสรุปผล SAR (คลิกเพื่อเปิด/แนบ)"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Project Actions */}
                      <td className="py-3 px-4 text-right align-top">
                        <div className="flex items-center justify-end gap-1">
                          {canManageBudget && (
                            <button
                              type="button"
                              onClick={() => onAddActivity(project)}
                              className="h-8 px-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                              title="เพิ่มกิจกรรมย่อย"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>กิจกรรม</span>
                            </button>
                          )}

                          {canAttach && (
                            <button
                              type="button"
                              onClick={() => onManageAttachments(project)}
                              className="h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors cursor-pointer"
                              title="จัดการเอกสารแนบ"
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canManageBudget && (
                            <>
                              <button
                                type="button"
                                onClick={() => onEditProject(project)}
                                className="h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors cursor-pointer"
                                title="แก้ไขโครงการ"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteProject(project)}
                                className="h-8 w-8 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-gray-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                                title="ลบโครงการ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Sub-activity Rows (Level 2 - Accordion Content) */}
                    {isExpanded &&
                      (hasActivities ? (
                        project.activities.map((act) => {
                          const reservedCount = (act.expenses || []).filter(
                            (e) => e.status === "RESERVED"
                          ).length;
                          const totalExpensesCount = (act.expenses || []).length;

                          return (
                            <tr
                              key={act.id}
                              className="bg-gray-50/50 dark:bg-gray-850/40 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 transition-colors"
                            >
                              <td></td>
                              {/* Activity Name & Category Tags */}
                              <td className="py-2.5 px-4 pl-8">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                                    {act.activityNo}
                                  </span>
                                  <span className="font-medium text-gray-800 dark:text-gray-200 text-xs">
                                    {act.name}
                                  </span>
                                </div>
                                {/* Used Categories */}
                                {act.financials.usedCategories &&
                                  act.financials.usedCategories.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1 pl-7">
                                      {act.financials.usedCategories.map((c) => (
                                        <span
                                          key={c}
                                          className="text-[10px] px-1.5 py-0.2 rounded bg-gray-200/70 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                        >
                                          {CATEGORY_NAMES[c] || c}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                              </td>

                              {/* Responsible Teacher */}
                              <td className="py-2.5 px-4 text-xs text-gray-600 dark:text-gray-400">
                                {act.responsibleUser?.name || "-"}
                              </td>

                              {/* Budget Numbers */}
                              <td className="py-2.5 px-4 text-right font-medium text-gray-700 dark:text-gray-300 text-xs">
                                ฿{formatCurrency(act.financials.effectiveBudget)}
                              </td>

                              <td className="py-2.5 px-4 text-right font-semibold text-blue-600 dark:text-blue-400 text-xs">
                                ฿{formatCurrency(act.financials.paidAmount)}
                              </td>

                              <td className="py-2.5 px-4 text-right font-semibold text-amber-600 dark:text-amber-400 text-xs">
                                ฿{formatCurrency(act.financials.reservedAmount)}
                              </td>

                              <td className="py-2.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                                ฿{formatCurrency(act.financials.remainingBalance)}
                              </td>

                              <td></td>

                              {/* Sub-activity Actions */}
                              <td className="py-2.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {/* Record Expense Button (Officer Only) */}
                                  {canManageBudget && (
                                    <button
                                      type="button"
                                      onClick={() => onRecordExpense(project, act)}
                                      className="h-7 px-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                      title="บันทึกการเบิกจ่าย / กันเงิน"
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>ตัดเงิน</span>
                                    </button>
                                  )}

                                  {/* History Ledger Button */}
                                  <button
                                    type="button"
                                    onClick={() => onViewHistory(project, act)}
                                    className="h-7 px-2 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-200/50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer relative"
                                    title="ดูประวัติการเบิกจ่ายของกิจกรรมนี้"
                                  >
                                    <History className="w-3 h-3" />
                                    <span>ประวัติ ({totalExpensesCount})</span>
                                    {reservedCount > 0 && (
                                      <span className="w-2 h-2 rounded-full bg-amber-500 absolute -top-0.5 -right-0.5" />
                                    )}
                                  </button>

                                  {canManageBudget && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => onEditActivity(project, act)}
                                        className="h-7 w-7 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors cursor-pointer"
                                        title="แก้ไขกิจกรรม"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onDeleteActivity(project, act)}
                                        className="h-7 w-7 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-gray-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                                        title="ลบกิจกรรม"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr className="bg-gray-50/30 dark:bg-gray-850/20 border-b border-gray-100 dark:border-gray-800">
                          <td></td>
                          <td colSpan={8} className="py-3 px-4 text-xs text-gray-400 italic">
                            ยังไม่มีกิจกรรมย่อยในโครงการนี้
                            {canManageBudget && " (คลิกปุ่ม '+ กิจกรรม' เพื่อเพิ่ม)"}
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View (Visible on mobile/tablet) */}
      <div className="lg:hidden space-y-4">
        {projects.map((project) => {
          const isExpanded = expandedProjectIds.has(project.id);
          const srcBadge = BUDGET_SOURCE_BADGES[project.budgetSourceType];
          const effBudget = project.financials.effectiveBudget;
          const paidPct = effBudget > 0 ? (project.financials.paidAmount / effBudget) * 100 : 0;
          const reservedPct = effBudget > 0 ? (project.financials.reservedAmount / effBudget) * 100 : 0;
          const canAttach =
            canManageBudget ||
            (currentUserId && project.leaderUserId === currentUserId);

          return (
            <div
              key={project.id}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-xs space-y-3"
            >
              {/* Header Badges */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {project.code && (
                    <span className="font-mono font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded text-xs">
                      {project.code}
                    </span>
                  )}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${srcBadge?.color}`}>
                    {srcBadge?.label || project.budgetSourceType}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {/* SAR 3 Badges */}
                  <button
                    type="button"
                    onClick={() => onManageAttachments(project)}
                    className={`p-1.5 rounded-lg border text-xs ${
                      project.sarReadiness.hasProposal
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "text-gray-300 border-dashed border-gray-200"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onManageAttachments(project)}
                    className={`p-1.5 rounded-lg border text-xs ${
                      project.sarReadiness.hasApproval
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "text-gray-300 border-dashed border-gray-200"
                    }`}
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onManageAttachments(project)}
                    className={`p-1.5 rounded-lg border text-xs ${
                      project.sarReadiness.hasSummary
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "text-gray-300 border-dashed border-gray-200"
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Title & Leader */}
              <div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white leading-snug">
                  {project.name}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  <span>{project.leaderUser?.name || "ไม่ระบุหัวหน้า"}</span>
                  {project.department && <span>• {project.department.name}</span>}
                </div>
              </div>

              {/* Financial Matrix */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl text-xs">
                <div>
                  <span className="text-gray-500">งบประมาณ:</span>
                  <div className="font-bold text-gray-900 dark:text-white text-sm">
                    ฿{formatCurrency(project.financials.effectiveBudget)}
                  </div>
                </div>
                <div>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">คงเหลือสุทธิ:</span>
                  <div className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                    ฿{formatCurrency(project.financials.remainingBalance)}
                  </div>
                </div>
                <div>
                  <span className="text-blue-600 dark:text-blue-400">เบิกจ่ายจริง:</span>
                  <div className="font-bold text-blue-600 dark:text-blue-400">
                    ฿{formatCurrency(project.financials.paidAmount)}
                  </div>
                </div>
                <div>
                  <span className="text-amber-600 dark:text-amber-400">กันเงินไว้:</span>
                  <div className="font-bold text-amber-600 dark:text-amber-400">
                    ฿{formatCurrency(project.financials.reservedAmount)}
                  </div>
                </div>
              </div>

              {/* Stacked Progress Bar */}
              <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
                <div style={{ width: `${paidPct}%` }} className="bg-blue-600 h-full" />
                <div style={{ width: `${reservedPct}%` }} className="bg-amber-500 h-full" />
              </div>

              {/* Accordion Toggle */}
              <button
                type="button"
                onClick={() => toggleExpand(project.id)}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between cursor-pointer"
              >
                <span>กิจกรรมย่อย ({project.activities?.length || 0} รายการ)</span>
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {/* Mobile Activities List */}
              {isExpanded && (
                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  {project.activities && project.activities.length > 0 ? (
                    project.activities.map((act) => (
                      <div
                        key={act.id}
                        className="p-3 rounded-xl bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-xs text-gray-900 dark:text-white">
                              {act.activityNo}. {act.name}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              ผู้รับผิดชอบ: {act.responsibleUser?.name || "-"}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-bold text-emerald-600">
                              ฿{formatCurrency(act.financials.remainingBalance)}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              งบ ฿{formatCurrency(act.financials.effectiveBudget)}
                            </div>
                          </div>
                        </div>

                        {/* Mobile Activity Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-200/50">
                          {canManageBudget && (
                            <button
                              type="button"
                              onClick={() => onRecordExpense(project, act)}
                              className="h-9 px-3 rounded-lg bg-purple-600 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>ตัดเงิน</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onViewHistory(project, act)}
                            className="h-9 px-3 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 flex items-center gap-1 cursor-pointer"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>ประวัติ ({act.expenses?.length || 0})</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-3 text-xs text-gray-400">
                      ยังไม่มีกิจกรรมย่อย
                    </div>
                  )}

                  {/* Add Activity Button on Mobile */}
                  {canManageBudget && (
                    <button
                      type="button"
                      onClick={() => onAddActivity(project)}
                      className="w-full h-11 rounded-xl border border-dashed border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-purple-50 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>เพิ่มกิจกรรมย่อยในโครงการนี้</span>
                    </button>
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
