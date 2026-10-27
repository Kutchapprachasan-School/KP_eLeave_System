"use client";

import React from "react";
import {
  BUDGET_SOURCE_LABELS,
  BudgetSourceType,
  DepartmentDTO,
} from "@/lib/planning/types";
import {
  Search,
  User,
  FileSpreadsheet,
  Plus,
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
    <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-gray-900 p-3 shadow-xs">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* ช่องค้นหา */}
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ค้นหารหัส ชื่อโครงการ กิจกรรม หรือผู้รับผิดชอบ..."
            className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-gray-800 pl-9.5 pr-3 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-gray-800 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
          />
        </div>

        {/* ตัวกรองฝ่าย/กลุ่มสาระฯ */}
        <select
          value={selectedDepartmentId}
          onChange={(e) => onDepartmentChange(e.target.value)}
          aria-label="ทุกฝ่าย / กลุ่มสาระฯ"
          className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 px-3 text-xs sm:text-sm text-slate-700 dark:text-slate-200 cursor-pointer focus:border-blue-600 focus:outline-none"
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
          aria-label="ทุกแหล่งงบประมาณ"
          className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 px-3 text-xs sm:text-sm text-slate-700 dark:text-slate-200 cursor-pointer focus:border-blue-600 focus:outline-none"
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
          className="h-10 inline-flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 px-3.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-gray-750 cursor-pointer transition-colors"
        >
          <User className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <span>เฉพาะที่ฉันรับผิดชอบ</span>
          <div
            className={`relative h-4 w-7 rounded-full transition-colors ${
              onlyMyProjects ? "bg-blue-600" : "bg-slate-200 dark:bg-gray-700"
            }`}
          >
            <div
              className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-xs transition-transform ${
                onlyMyProjects ? "translate-x-3.5" : "translate-x-0.5"
              }`}
            />
          </div>
        </button>

        {/* ตัวเลือกรูปแบบการแสดงผล: ทั้งหมด / กางทั้งหมด / หุบทั้งหมด */}
        <div className="h-10 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 px-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          <span className="shrink-0 text-slate-500 dark:text-slate-400">การแสดงผล:</span>
          <select
            aria-label="รูปแบบการแสดงผลตาราง"
            onChange={(e) => {
              if (e.target.value === "EXPANDED") onExpandAll();
              else if (e.target.value === "COLLAPSED") onCollapseAll();
            }}
            defaultValue="ALL"
            className="bg-transparent font-medium text-slate-800 dark:text-slate-100 cursor-pointer focus:outline-none"
          >
            <option value="ALL">ทั้งหมด</option>
            <option value="EXPANDED">กางทั้งหมด</option>
            <option value="COLLAPSED">หุบทั้งหมด</option>
          </select>
        </div>

        {/* ปุ่มส่งออก Excel */}
        <button
          type="button"
          onClick={onExportExcel}
          className="h-10 inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>ส่งออก Excel</span>
        </button>

        {/* ปุ่มล้างตัวกรอง */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="h-10 inline-flex items-center gap-1 rounded-xl px-2.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>ล้างตัวกรอง</span>
          </button>
        )}

        {/* ปุ่มสร้างโครงการใหม่ */}
        {canManageProjects && (
          <button
            type="button"
            onClick={onOpenCreateProject}
            className="h-10 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 cursor-pointer ml-auto"
          >
            <Plus className="h-4 w-4" />
            <span>สร้างโครงการใหม่</span>
          </button>
        )}
      </div>
    </div>
  );
}
