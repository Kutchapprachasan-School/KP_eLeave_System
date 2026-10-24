"use client";

import React, { useState, useTransition } from "react";
import { X, Save, Loader2, Sparkles, User, Hash } from "lucide-react";
import { createActivityAction, updateActivityAction } from "@/app/actions/planning-project";
import type { ProjectActivityDTO } from "@/lib/planning/types";

interface UserOption {
  id: string;
  name: string;
  position?: string | null;
}

interface ActivityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  projectId: string;
  projectName: string;
  activityToEdit?: ProjectActivityDTO | null;
  users: UserOption[];
}

export function ActivityFormModal({
  isOpen,
  onClose,
  onSaved,
  projectId,
  projectName,
  activityToEdit,
  users,
}: ActivityFormModalProps) {
  const isEditing = !!activityToEdit;

  const [activityNo, setActivityNo] = useState<number>(activityToEdit?.activityNo || 1);
  const [name, setName] = useState(activityToEdit?.name || "");
  const [responsibleUserId, setResponsibleUserId] = useState(
    activityToEdit?.responsibleUserId || (users[0]?.id || "")
  );
  const [allocatedAmount, setAllocatedAmount] = useState<string>(
    activityToEdit ? String(activityToEdit.financials.allocatedAmount) : ""
  );
  const [adjustedAmount, setAdjustedAmount] = useState<string>(
    activityToEdit?.financials?.isAdjusted
      ? String(activityToEdit.financials.effectiveBudget)
      : ""
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const alloc = parseFloat(allocatedAmount);
    if (isNaN(alloc) || alloc < 0) {
      setErrorMessage("กรุณากรอกงบประมาณกิจกรรมที่ถูกต้อง (ตัวเลข >= 0)");
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

    startTransition(async () => {
      if (isEditing && activityToEdit) {
        const res = await updateActivityAction({
          id: activityToEdit.id,
          activityNo,
          name,
          responsibleUserId: responsibleUserId || undefined,
          allocatedAmount: alloc,
          adjustedAmount: adj,
        });

        if (res.success) {
          onSaved();
          onClose();
        } else {
          setErrorMessage(res.error || "เกิดข้อผิดพลาดในการแก้ไขกิจกรรม");
        }
      } else {
        const res = await createActivityAction({
          projectId,
          activityNo,
          name,
          responsibleUserId: responsibleUserId || undefined,
          allocatedAmount: alloc,
          adjustedAmount: adj,
        });

        if (res.success) {
          onSaved();
          onClose();
        } else {
          setErrorMessage(res.error || "เกิดข้อผิดพลาดในการสร้างกิจกรรม");
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {isEditing ? "แก้ไขกิจกรรมย่อย" : "เพิ่มกิจกรรมย่อยในโครงการ"}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[280px]">
                {projectName}
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

          <div className="grid grid-cols-4 gap-3">
            {/* Activity Sequence No */}
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                ลำดับที่ <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={activityNo}
                onChange={(e) => setActivityNo(Number(e.target.value))}
                className="w-full h-11 px-3 text-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Activity Name */}
            <div className="col-span-3">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                ชื่อกิจกรรมย่อย <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="เช่น กิจกรรมอบรมเชิงปฏิบัติการ, จัดซื้อวัสดุ"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Responsible User */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              ผู้รับผิดชอบกิจกรรม (ครูผู้ดำเนินกิจกรรม)
            </label>
            <select
              value={responsibleUserId}
              onChange={(e) => setResponsibleUserId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">-- ไม่ระบุผู้รับผิดชอบ --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.position ? `(${u.position})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Budget Amounts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50">
            <div>
              <label className="block text-xs font-bold text-purple-900 dark:text-purple-300 mb-1">
                งบประมาณกิจกรรม (บาท) <span className="text-rose-500">*</span>
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
                งบหลังปรับปรุง (บาท)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="เว้นว่างหากไม่ปรับปรุง"
                value={adjustedAmount}
                onChange={(e) => setAdjustedAmount(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                  <span>{isEditing ? "บันทึกการแก้ไข" : "บันทึกกิจกรรม"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
