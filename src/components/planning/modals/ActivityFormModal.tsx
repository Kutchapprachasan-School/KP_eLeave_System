"use client";

import React, { useState, useTransition } from "react";
import {
  createActivityAction,
  updateActivityAction,
} from "@/actions/planning/project-actions";
import {
  ProjectActivityDTO,
  ProjectDTO,
  SimpleUserDTO,
} from "@/lib/planning/types";
import { formatCurrencyTHB } from "../FinancialMetricCards";
import { X, Layers, AlertCircle, Save } from "lucide-react";

export interface ActivityFormModalProps {
  mode?: "CREATE" | "EDIT";
  project?: ProjectDTO;
  activity?: ProjectActivityDTO;
  teachers?: SimpleUserDTO[] | Array<{ id: string; name: string; position?: string | null }>;
  onClose: () => void;
  onSuccess?: () => void;
  // Legacy / alternate prop support
  isOpen?: boolean;
  onSaved?: () => void;
  projectId?: string;
  projectName?: string;
  activityToEdit?: ProjectActivityDTO | null;
  users?: SimpleUserDTO[] | Array<{ id: string; name: string; position?: string | null }>;
}

export function ActivityFormModal({
  mode: propMode,
  project,
  activity: propActivity,
  teachers: propTeachers,
  onClose,
  onSuccess,
  isOpen = true,
  onSaved,
  projectId,
  projectName,
  activityToEdit,
  users,
}: ActivityFormModalProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const activity = propActivity || activityToEdit || undefined;
  const mode = propMode || (activity ? "EDIT" : "CREATE");
  const teachers = (propTeachers || users || []) as SimpleUserDTO[];
  const handleSuccess = onSuccess || onSaved || onClose;

  const resolvedProjectId =
    project?.id || projectId || activity?.projectId || "";
  const resolvedProjectName = project ? `${project.code}: ${project.name}` : (projectName || "โครงการ");
  const unallocatedBudget = project?.financials?.unallocatedBudget ?? 0;

  const nextActivityNo =
    project?.activities && project.activities.length > 0
      ? Math.max(...project.activities.map((a) => a.activityNo)) + 1
      : 1;

  const [activityNo, setActivityNo] = useState<string>(
    String(activity?.activityNo ?? nextActivityNo)
  );
  const [name, setName] = useState(activity?.name ?? "");
  const [responsibleUserId, setResponsibleUserId] = useState(
    activity?.responsibleUserId ||
      activity?.responsibleUser?.id ||
      project?.leaderUserId ||
      project?.leader?.id ||
      teachers[0]?.id ||
      ""
  );
  const [allocatedAmount, setAllocatedAmount] = useState<string>(
    activity
      ? String(activity.allocatedAmount ?? activity.financials?.allocatedAmount ?? "")
      : unallocatedBudget > 0
      ? String(unallocatedBudget)
      : "0"
  );
  const [adjustedAmount, setAdjustedAmount] = useState<string>(
    activity
      ? String(activity.adjustedAmount ?? activity.financials?.effectiveBudget ?? allocatedAmount)
      : allocatedAmount
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedNo = parseInt(activityNo, 10);
    const parsedAllocated = parseFloat(allocatedAmount || "0");
    const parsedAdjusted =
      mode === "EDIT"
        ? parseFloat(adjustedAmount || "0")
        : parsedAllocated;

    if (Number.isNaN(parsedNo) || parsedNo <= 0) {
      setErrorMsg("ลำดับที่กิจกรรมต้องเป็นตัวเลขมากกว่า 0");
      return;
    }

    if (Number.isNaN(parsedAllocated) || parsedAllocated < 0) {
      setErrorMsg("วงเงินงบประมาณกิจกรรมต้องไม่ติดลบ");
      return;
    }

    startTransition(async () => {
      if (mode === "CREATE") {
        const res = await createActivityAction({
          projectId: resolvedProjectId,
          activityNo: parsedNo,
          name,
          responsibleUserId,
          allocatedAmount: parsedAllocated,
          adjustedAmount: parsedAllocated,
        });
        if (!res.success) {
          setErrorMsg(res.error);
          return;
        }
      } else if (activity) {
        const res = await updateActivityAction({
          id: activity.id,
          activityNo: parsedNo,
          name,
          responsibleUserId,
          allocatedAmount: parsedAllocated,
          adjustedAmount: parsedAdjusted,
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
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-gray-800/60">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-slate-900 p-2 text-white dark:bg-slate-700">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {mode === "CREATE"
                  ? "เพิ่มกิจกรรมย่อยภายใต้โครงการ"
                  : `แก้ไขกิจกรรมที่ ${activity?.activityNo}`}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {resolvedProjectName}
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

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* แถบแสดงงบโครงการที่รอจัดสรรลงกิจกรรม */}
          {project && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs dark:border-slate-800 dark:bg-gray-800/50">
              <span className="text-slate-600 dark:text-slate-400">
                งบโครงการที่รอจัดสรรลงกิจกรรม:
              </span>
              <strong
                className={`text-sm tabular-nums ${
                  unallocatedBudget >= 0
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {formatCurrencyTHB(unallocatedBudget)}
              </strong>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                ลำดับที่ <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={activityNo}
                onChange={(e) => setActivityNo(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                ชื่อกิจกรรมย่อย <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น ค่ายคณิตศาสตร์เข้มข้น"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              ครูผู้รับผิดชอบกิจกรรม <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={responsibleUserId}
              onChange={(e) => setResponsibleUserId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-gray-800 dark:text-white"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                งบจัดสรรตั้งต้น (บาท) <span className="text-rose-500">*</span>
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
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {mode === "EDIT" && (
              <div>
                <label className="block text-xs font-semibold text-blue-900 dark:text-blue-300">
                  งบหลังโอนเกลี่ย (บาท) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={adjustedAmount}
                  onChange={(e) => setAdjustedAmount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-blue-300 bg-blue-50/40 px-3 py-2 text-sm font-bold text-blue-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-blue-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            )}
          </div>

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
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              <Save className="h-4 w-4" />
              <span>
                {isPending ? "กำลังบันทึก..." : "บันทึกกิจกรรมย่อย"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
