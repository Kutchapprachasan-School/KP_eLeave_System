"use client";

import React from "react";
import {
  BUDGET_SOURCE_LABELS,
  BudgetSourceType,
  DepartmentDTO,
} from "@/lib/planning/types";
import {
  Search,
  UserCheck,
  FileSpreadsheet,
  Plus,
  ChevronsUpDown,
  RotateCcw,
} from "lucide-react";

interface PlanningFilterToolbarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedDepartmentId: string;
  onDepartmentChange: (val: string) => void;
  selectedBudgetSource: string;
  onBudgetSourceChange: (val: string) => void;
  onlyMyProjects: boolean;
  onOnlyMyProjectsChange: (val: boolean) => void;
  departments: DepartmentDTO[];
  canManageProjects: boolean;
  onOpenCreateProject: () => void;
  onExportExcel: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

export function PlanningFilterToolbar({
  searchQuery,
  onSearchChange,
  selectedDepartmentId,
  onDepartmentChange,
  selectedBudgetSource,
  onBudgetSourceChange,
  onlyMyProjects,
  onOnlyMyProjectsChange,
  departments,
  canManageProjects,
  onOpenCreateProject,
  onExportExcel,
  onExpandAll,
  onCollapseAll,
  onResetFilters,
  hasActiveFilters,
}: PlanningFilterToolbarProps) {
  const budgetSources = Object.entries(BUDGET_SOURCE_LABELS) as Array<
    [BudgetSourceType, string]
  >;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-gray-900 p-4 shadow-xs">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* ฝั่งซ้าย: ช่องค้นหา + ตัวกรองฝ่าย + ตัวกรองแหล่งเงิน */}
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {/* ช่องค้นหา */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ค้นหารหัส, ชื่อโครงการ, กิจกรรม, หรือชื่อครู..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-gray-800 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* ตัวกรองฝ่าย/กลุ่มสาระฯ */}
          <select
            value={selectedDepartmentId}
            onChange={(e) => onDepartmentChange(e.target.value)}
            aria-label="กรองตามฝ่ายหรือกลุ่มสาระการเรียนรู้"
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">ทุกฝ่าย / กลุ่มสาระฯ</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>

          {/* ตัวกรองแหล่งงบประมาณ */}
          <select
            value={selectedBudgetSource}
            onChange={(e) => onBudgetSourceChange(e.target.value)}
            aria-label="กรองตามแหล่งงบประมาณ"
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">ทุกแหล่งงบประมาณ</option>
            {budgetSources.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          {/* สวิตช์ Quick Filter: เฉพาะที่ฉันรับผิดชอบ */}
          <button
            type="button"
            onClick={() => onOnlyMyProjectsChange(!onlyMyProjects)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors cursor-pointer ${
              onlyMyProjects
                ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-xs"
                : "border-slate-300 dark:border-slate-700 bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-gray-700"
            }`}
          >
            <UserCheck
              className={`h-4 w-4 ${
                onlyMyProjects ? "text-blue-600 dark:text-blue-400" : "text-slate-400"
              }`}
            />
            <span>เฉพาะที่ฉันรับผิดชอบ</span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              ล้างตัวกรอง
            </button>
          )}
        </div>

        {/* ฝั่งขวา: ปุ่มกาง/หุบตาราง, ปุ่ม Export Excel, และปุ่มสร้างโครงการใหม่ */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 lg:border-t-0 lg:pt-0">
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-gray-800 p-0.5">
            <button
              type="button"
              onClick={onExpandAll}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-gray-700 hover:text-slate-900 dark:hover:text-white hover:shadow-2xs cursor-pointer"
              title="กางดูกิจกรรมย่อยทั้งหมด"
            >
              <ChevronsUpDown className="h-3.5 w-3.5" />
              กางทั้งหมด
            </button>
            <button
              type="button"
              onClick={onCollapseAll}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-gray-700 hover:text-slate-900 dark:hover:text-white hover:shadow-2xs cursor-pointer"
              title="หุบกิจกรรมย่อยทั้งหมด"
            >
              หุบทั้งหมด
            </button>
          </div>

          <button
            type="button"
            onClick={onExportExcel}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-2 text-sm font-medium text-emerald-800 dark:text-emerald-300 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-900/50 cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            <span>ส่งออก Excel</span>
          </button>

          {canManageProjects && (
            <button
              type="button"
              onClick={onOpenCreateProject}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>สร้างโครงการใหม่</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
