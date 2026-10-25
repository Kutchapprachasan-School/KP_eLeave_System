"use client";

import React, { useState, useTransition } from "react";
import {
  createProjectAction,
  updateProjectAction,
} from "@/actions/planning/project-actions";
import {
  BUDGET_SOURCE_LABELS,
  BudgetSourceType,
  DepartmentDTO,
  PROJECT_STATUS_LABELS,
  ProjectDTO,
  ProjectStatusType,
  SimpleUserDTO,
} from "@/lib/planning/types";
import { X, Landmark, AlertCircle, Save } from "lucide-react";

export interface ProjectFormModalProps {
  mode?: "CREATE" | "EDIT";
  fiscalYear?: number;
  project?: ProjectDTO;
  departments: DepartmentDTO[] | Array<{ id: string; name: string }>;
  teachers?: SimpleUserDTO[] | Array<{ id: string; name: string; position?: string | null }>;
  currentUserId?: string;
  onClose: () => void;
  onSuccess?: () => void;
  // Legacy / alternate prop support
  isOpen?: boolean;
  onSaved?: () => void;
  projectToEdit?: ProjectDTO | null;
  users?: SimpleUserDTO[] | Array<{ id: string; name: string; position?: string | null }>;
  currentFiscalYear?: number;
}

export function ProjectFormModal({
  mode: propMode,
  fiscalYear: propFiscalYear,
  project: propProject,
  departments,
  teachers: propTeachers,
  currentUserId = "",
  onClose,
  onSuccess,
  isOpen = true,
  onSaved,
  projectToEdit,
  users,
  currentFiscalYear,
}: ProjectFormModalProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const project = propProject || projectToEdit || undefined;
  const mode = propMode || (project ? "EDIT" : "CREATE");
  const defaultCalculatedYear =
    new Date().getFullYear() + 543 + (new Date().getMonth() >= 9 ? 1 : 0);
  const fiscalYear = propFiscalYear || currentFiscalYear || defaultCalculatedYear;
  const teachers = (propTeachers || users || []) as SimpleUserDTO[];
  const handleSuccess = onSuccess || onSaved || onClose;

  const [code, setCode] = useState(
    project?.code ?? `PRJ-${String(fiscalYear).slice(-2)}-001`
  );
  const [name, setName] = useState(project?.name ?? "");
  const [departmentId, setDepartmentId] = useState(
    project?.departmentId || project?.department?.id || departments[0]?.id || ""
  );
  const [leaderUserId, setLeaderUserId] = useState(
    project?.leaderUserId || project?.leader?.id || currentUserId || teachers[0]?.id || ""
  );
  const [budgetSource, setBudgetSource] = useState<BudgetSourceType>(
    (project?.budgetSource || project?.budgetSourceType || "SUBSIDY") as BudgetSourceType
  );
  const [strategyCode, setStrategyCode] = useState(
    project?.strategyCode ?? ""
  );
  const [standardTagsInput, setStandardTagsInput] = useState(
    project?.standardTags?.join(", ") ?? ""
  );
  const [allocatedAmount, setAllocatedAmount] = useState<string>(
    project ? String(project.allocatedAmount ?? project.financials?.allocatedAmount ?? "") : ""
  );
  const [adjustedAmount, setAdjustedAmount] = useState<string>(
    project ? String(project.adjustedAmount ?? project.financials?.effectiveBudget ?? "") : ""
  );
  const [status, setStatus] = useState<ProjectStatusType>(
    project?.status ?? "APPROVED"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedAllocated = parseFloat(allocatedAmount || "0");
    const parsedAdjusted =
      mode === "EDIT"
        ? parseFloat(adjustedAmount || "0")
        : parsedAllocated;

    if (Number.isNaN(parsedAllocated) || parsedAllocated < 0) {
      setErrorMsg("กรุณาระบุวงเงินงบประมาณตั้งต้นให้ถูกต้อง");
      return;
    }

    if (Number.isNaN(parsedAdjusted) || parsedAdjusted < 0) {
      setErrorMsg("กรุณาระบุวงเงินงบประมาณสุทธิหลังโอนเกลี่ยให้ถูกต้อง");
      return;
    }

    const cleanTags = standardTagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    startTransition(async () => {
      if (mode === "CREATE") {
        const res = await createProjectAction({
          fiscalYear,
          code,
          name,
          departmentId,
          leaderUserId,
          budgetSource,
          strategyCode: strategyCode.trim() || null,
          standardTags: cleanTags,
          allocatedAmount: parsedAllocated,
          adjustedAmount: parsedAllocated,
          status,
        });

        if (!res.success) {
          setErrorMsg(res.error);
          return;
        }
      } else if (project) {
        const res = await updateProjectAction({
          id: project.id,
          code,
          name,
          departmentId,
          leaderUserId,
          budgetSource,
          strategyCode: strategyCode.trim() || null,
          standardTags: cleanTags,
          allocatedAmount: parsedAllocated,
          adjustedAmount: parsedAdjusted,
          status,
        });

        if (!res.success) {
          setErrorMsg(res.error);
          return;
        }
      }

      handleSuccess();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-gray-800/60">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-blue-600 p-2 text-white">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {mode === "CREATE"
                  ? `สร้างโครงการใหม่ (ปีงบประมาณ ${fiscalYear})`
                  : `แก้ไขโครงการ: ${project?.code}`}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                กำหนดรายละเอียดโครงการ ผู้รับผิดชอบ แหล่งงบประมาณ และความเชื่อมโยงมาตรฐาน SAR
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 space-y-4 overflow-y-auto p-6"
        >
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                รหัสโครงการ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="เช่น PRJ-69-001"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                สถานะโครงการ
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatusType)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-gray-800 dark:text-white"
              >
                {Object.entries(PROJECT_STATUS_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              ชื่อโครงการ <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ระบุชื่อโครงการเต็มตามแผนปฏิบัติการประจำปี"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                ฝ่าย / กลุ่มสาระการเรียนรู้ <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-gray-800 dark:text-white"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                ครูหัวหน้าโครงการ <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={leaderUserId}
                onChange={(e) => setLeaderUserId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-gray-800 dark:text-white"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                แหล่งงบประมาณ <span className="text-rose-500">*</span>
              </label>
              <select
                value={budgetSource}
                onChange={(e) =>
                  setBudgetSource(e.target.value as BudgetSourceType)
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-gray-800 dark:text-white"
              >
                {Object.entries(BUDGET_SOURCE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                กลยุทธ์สถานศึกษา
              </label>
              <input
                type="text"
                value={strategyCode}
                onChange={(e) => setStrategyCode(e.target.value)}
                placeholder="เช่น กลยุทธ์ที่ 1"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                มาตรฐานการศึกษา (คั่นด้วย ,)
              </label>
              <input
                type="text"
                value={standardTagsInput}
                onChange={(e) => setStandardTagsInput(e.target.value)}
                placeholder="เช่น ม.1, ม.3"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* ส่วนตั้งงบประมาณและโอนเกลี่ย */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
              กรอบวงเงินงบประมาณโครงการ (บาท)
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  งบประมาณตั้งต้นตามแผน (Allocated){" "}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={allocatedAmount}
                  onChange={(e) => {
                    setAllocatedAmount(e.target.value);
                    if (mode === "CREATE") {
                      setAdjustedAmount(e.target.value);
                    }
                  }}
                  placeholder="0.00"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {mode === "EDIT" && (
                <div>
                  <label className="block text-xs font-semibold text-blue-900 dark:text-blue-300">
                    งบสุทธิหลังโอนเกลี่ย (Adjusted Budget){" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={adjustedAmount}
                    onChange={(e) => setAdjustedAmount(e.target.value)}
                    placeholder="0.00"
                    className="mt-1 w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-bold text-blue-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-blue-700 dark:bg-gray-800 dark:text-white"
                  />
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    ปรับค่านี้เมื่อมีการขออนุมัติโอนเปลี่ยนแปลงงบประมาณระหว่างปี
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-300 dark:hover:bg-gray-700"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              <span>
                {isPending
                  ? "กำลังบันทึก..."
                  : mode === "CREATE"
                  ? "สร้างโครงการ"
                  : "บันทึกการแก้ไข"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
