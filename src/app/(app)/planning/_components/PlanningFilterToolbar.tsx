"use client";

import React from "react";
import { 
  Search, 
  FileSpreadsheet, 
  Plus, 
  Check, 
  Filter, 
  Calendar, 
  Building2, 
  Coins 
} from "lucide-react";
import type { BudgetSourceType } from "@/lib/planning/types";

interface PlanningFilterToolbarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  fiscalYear: number;
  onFiscalYearChange: (fy: number) => void;
  departmentId: string;
  onDepartmentChange: (deptId: string) => void;
  budgetSource: string;
  onBudgetSourceChange: (source: string) => void;
  onlyMyResponsibilities: boolean;
  onToggleMyResponsibilities: () => void;
  onExportExcel: () => void;
  onCreateProject: () => void;
  canManageBudget: boolean;
  departments: Array<{ id: string; name: string }>;
  availableFiscalYears: number[];
}

const BUDGET_SOURCE_LABELS: Record<string, string> = {
  ALL: "แหล่งงบประมาณทั้งหมด",
  SUBSIDY: "เงินอุดหนุน (SUBSIDY)",
  GENERAL_BUDGET: "งบประมาณแผ่นดิน (GENERAL)",
  REVENUE: "เงินรายได้สถานศึกษา (REVENUE)",
  SPECIAL_PROJECT: "โครงการพิเศษ (SPECIAL)",
  DONATION: "เงินบริจาค/ระดมทรัพยากร (DONATION)",
};

export function PlanningFilterToolbar({
  searchQuery,
  onSearchChange,
  fiscalYear,
  onFiscalYearChange,
  departmentId,
  onDepartmentChange,
  budgetSource,
  onBudgetSourceChange,
  onlyMyResponsibilities,
  onToggleMyResponsibilities,
  onExportExcel,
  onCreateProject,
  canManageBudget,
  departments,
  availableFiscalYears,
}: PlanningFilterToolbarProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-800 shadow-xs space-y-4">
      {/* Top Row: Search + Quick Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="ค้นหาชื่อโครงการ, รหัส, กิจกรรม, หรือผู้รับผิดชอบ..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm transition-all"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
        </div>

        {/* Buttons Action Group */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Export Excel Button */}
          <button
            type="button"
            onClick={onExportExcel}
            className="h-11 px-4 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/60 font-medium text-sm flex items-center gap-2 transition-all cursor-pointer"
            title="ส่งออกรายงานงบประมาณโครงการเป็น Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">ส่งออก Excel</span>
          </button>

          {/* Create Project Button (Officer/Admin only) */}
          {canManageBudget && (
            <button
              type="button"
              onClick={onCreateProject}
              className="h-11 px-4 sm:px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm flex items-center gap-2 shadow-sm shadow-purple-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างโครงการใหม่</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Filter Controls Bar */}
      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-sm">
        {/* Fiscal Year Selector */}
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-500 font-medium">ปีงบฯ:</span>
          <select
            value={fiscalYear}
            onChange={(e) => onFiscalYearChange(Number(e.target.value))}
            className="bg-transparent font-semibold text-gray-900 dark:text-white focus:outline-none cursor-pointer"
          >
            {availableFiscalYears.map((fy) => (
              <option key={fy} value={fy} className="dark:bg-gray-800">
                {fy}
              </option>
            ))}
          </select>
        </div>

        {/* Department Selector */}
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
          <Building2 className="w-4 h-4 text-gray-400" />
          <select
            value={departmentId}
            onChange={(e) => onDepartmentChange(e.target.value)}
            className="bg-transparent text-gray-800 dark:text-gray-200 focus:outline-none cursor-pointer max-w-[150px] sm:max-w-[200px] truncate"
          >
            <option value="ALL" className="dark:bg-gray-800">
              ทุกกลุ่มงาน/กลุ่มสาระ
            </option>
            {departments.map((d) => (
              <option key={d.id} value={d.id} className="dark:bg-gray-800">
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Budget Source Selector */}
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
          <Coins className="w-4 h-4 text-gray-400" />
          <select
            value={budgetSource}
            onChange={(e) => onBudgetSourceChange(e.target.value)}
            className="bg-transparent text-gray-800 dark:text-gray-200 focus:outline-none cursor-pointer max-w-[180px] truncate"
          >
            {Object.entries(BUDGET_SOURCE_LABELS).map(([k, label]) => (
              <option key={k} value={k} className="dark:bg-gray-800">
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* My Responsibilities Toggle (Highlight Teacher Filter) */}
        <button
          type="button"
          onClick={onToggleMyResponsibilities}
          className={`h-9 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
            onlyMyResponsibilities
              ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 shadow-xs ring-2 ring-purple-500/20"
              : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100"
          }`}
        >
          <div
            className={`w-4 h-4 rounded-md flex items-center justify-center transition-colors ${
              onlyMyResponsibilities
                ? "bg-purple-600 text-white"
                : "border border-gray-400 bg-white dark:bg-gray-700"
            }`}
          >
            {onlyMyResponsibilities && <Check className="w-3 h-3 stroke-[3]" />}
          </div>
          <span>เฉพาะที่ฉันรับผิดชอบ</span>
        </button>
      </div>
    </div>
  );
}
