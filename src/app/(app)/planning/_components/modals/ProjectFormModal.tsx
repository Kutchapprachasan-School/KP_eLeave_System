"use client";

import React, { useState, useTransition } from "react";
import { X, Save, Loader2, FolderPlus, Building2, User, Coins, Hash, Tag, Layers } from "lucide-react";
import { createProjectAction, updateProjectAction } from "@/app/actions/planning-project";
import type { ProjectDTO, BudgetSourceType } from "@/lib/planning/types";

interface UserOption {
  id: string;
  name: string;
  position?: string | null;
}

interface DepartmentOption {
  id: string;
  name: string;
}

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  projectToEdit?: ProjectDTO | null;
  departments: DepartmentOption[];
  users: UserOption[];
  currentFiscalYear: number;
}

const BUDGET_SOURCES: { value: BudgetSourceType; label: string }[] = [
  { value: "SUBSIDY", label: "เงินอุดหนุน (SUBSIDY)" },
  { value: "GENERAL_BUDGET", label: "งบประมาณแผ่นดิน (GENERAL)" },
  { value: "REVENUE", label: "เงินรายได้สถานศึกษา (REVENUE)" },
  { value: "SPECIAL_PROJECT", label: "โครงการพิเศษ (SPECIAL)" },
  { value: "DONATION", label: "เงินบริจาค/ระดมทรัพยากร (DONATION)" },
];

export function ProjectFormModal({
  isOpen,
  onClose,
  onSaved,
  projectToEdit,
  departments,
  users,
  currentFiscalYear,
}: ProjectFormModalProps) {
  const isEditing = !!projectToEdit;

  const [code, setCode] = useState(projectToEdit?.code || "");
  const [name, setName] = useState(projectToEdit?.name || "");
  const [fiscalYear, setFiscalYear] = useState<number>(projectToEdit?.fiscalYear || currentFiscalYear);
  const [departmentId, setDepartmentId] = useState(projectToEdit?.departmentId || (departments[0]?.id || ""));
  const [leaderUserId, setLeaderUserId] = useState(projectToEdit?.leaderUserId || (users[0]?.id || ""));
  const [budgetSourceType, setBudgetSourceType] = useState<BudgetSourceType>(
    projectToEdit?.budgetSourceType || "SUBSIDY"
  );
  const [allocatedAmount, setAllocatedAmount] = useState<string>(
    projectToEdit ? String(projectToEdit.financials.allocatedAmount) : ""
  );
  const [adjustedAmount, setAdjustedAmount] = useState<string>(
    projectToEdit?.adjustedAmount !== undefined && projectToEdit?.adjustedAmount !== null
      ? String(projectToEdit.adjustedAmount)
      : ""
  );
  const [strategyCode, setStrategyCode] = useState(projectToEdit?.strategyCode || "");
  const [tagsInput, setTagsInput] = useState(projectToEdit?.standardTags?.join(", ") || "");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const alloc = parseFloat(allocatedAmount);
    if (isNaN(alloc) || alloc < 0) {
      setErrorMessage("กรุณากรอกงบประมาณโครงการที่ถูกต้อง (ตัวเลข >= 0)");
      return;
    }

    let adj: number | undefined = undefined;
    if (adjustedAmount.trim()) {
      const parsedAdj = parseFloat(adjustedAmount);
      if (isNaN(parsedAdj) || parsedAdj < 0) {
        setErrorMessage("กรุณากรอกงบประมาณหลังปรับปรุงให้ถูกต้อง (ตัวเลข >= 0)");
        return;
      }
      adj = parsedAdj;
    }

    const standardTags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    startTransition(async () => {
      if (isEditing && projectToEdit) {
        const res = await updateProjectAction({
          id: projectToEdit.id,
          code,
          name,
          fiscalYear,
          departmentId: departmentId || undefined,
          leaderUserId: leaderUserId || undefined,
          budgetSourceType,
          allocatedAmount: alloc,
          adjustedAmount: adj,
          strategyCode: strategyCode.trim() || undefined,
          standardTags,
        });

        if (res.success) {
          onSaved();
          onClose();
        } else {
          setErrorMessage(res.error || "เกิดข้อผิดพลาดในการแก้ไขโครงการ");
        }
      } else {
        const res = await createProjectAction({
          code,
          name,
          fiscalYear,
          departmentId: departmentId || undefined,
          leaderUserId: leaderUserId || undefined,
          budgetSourceType,
          allocatedAmount: alloc,
          adjustedAmount: adj,
          strategyCode: strategyCode.trim() || undefined,
          standardTags,
        });

        if (res.success) {
          onSaved();
          onClose();
        } else {
          setErrorMessage(res.error || "เกิดข้อผิดพลาดในการสร้างโครงการ");
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {isEditing ? "แก้ไขข้อมูลโครงการ" : "สร้างโครงการใหม่"}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ระบบแผนงานโครงการและติดตามงบประมาณสถานศึกษา
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-sm border border-rose-200 dark:border-rose-800 font-medium">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Project Code */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                รหัสโครงการ
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="เช่น P-01 หรือ ว่างไว้"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full h-11 px-3 pl-9 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <Hash className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              </div>
            </div>

            {/* Fiscal Year */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                ปีงบประมาณ <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                value={fiscalYear}
                onChange={(e) => setFiscalYear(Number(e.target.value))}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Budget Source */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                แหล่งเงิน <span className="text-rose-500">*</span>
              </label>
              <select
                value={budgetSourceType}
                onChange={(e) => setBudgetSourceType(e.target.value as BudgetSourceType)}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {BUDGET_SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Project Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              ชื่อโครงการ <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="เช่น โครงการพัฒนาทักษะวิชาการและเทคโนโลยีสารสนเทศ"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Department */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                กลุ่มสาระ/กลุ่มงานที่รับผิดชอบ
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">-- ไม่ระบุกลุ่มสาระ --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Leader User */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                หัวหน้าโครงการ (ครูผู้รับผิดชอบหลัก)
              </label>
              <select
                value={leaderUserId}
                onChange={(e) => setLeaderUserId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">-- ไม่ระบุหัวหน้าโครงการ --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.position ? `(${u.position})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Budget Amounts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50">
            <div>
              <label className="block text-xs font-bold text-purple-900 dark:text-purple-300 mb-1">
                งบประมาณตั้งต้น (บาท) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={allocatedAmount}
                onChange={(e) => setAllocatedAmount(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                งบประมาณหลังปรับปรุง (บาท)
                <span className="text-[10px] text-gray-500 font-normal ml-1">
                  (กรอกเมื่อมีการโอน/เปลี่ยนแปลง)
                </span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="เว้นว่างหากไม่มีการปรับปรุง"
                value={adjustedAmount}
                onChange={(e) => setAdjustedAmount(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Strategy & SAR Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                ยุทธศาสตร์/กลยุทธ์สถานศึกษา
              </label>
              <input
                type="text"
                placeholder="เช่น ยุทธศาสตร์ที่ 1, แผนงานบริหารวิชาการ"
                value={strategyCode}
                onChange={(e) => setStrategyCode(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                มาตรฐานการศึกษา / SAR Tags (คั่นด้วยจุลภาค)
              </label>
              <input
                type="text"
                placeholder="เช่น มฐ.1, ตัวบ่งชี้ที่ 1.2"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="h-11 px-5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="h-11 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm flex items-center gap-2 shadow-md shadow-purple-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEditing ? "บันทึกการแก้ไข" : "สร้างโครงการ"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
