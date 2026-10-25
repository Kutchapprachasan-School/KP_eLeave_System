"use client";

import React, { useState, useTransition } from "react";
import { voidExpenseAction } from "@/actions/planning/expense-actions";
import {
  ActivityExpenseDTO,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_STATUS_LABELS,
  ProjectActivityDTO,
  ProjectDTO,
} from "@/lib/planning/types";
import { formatCurrencyTHB } from "../FinancialMetricCards";
import {
  X,
  History,
  CheckCircle2,
  Clock,
  Trash2,
  Plus,
  AlertCircle,
  FileCheck2,
} from "lucide-react";

export interface ExpenseHistoryDrawerProps {
  project?: ProjectDTO;
  activity: ProjectActivityDTO;
  onClose: () => void;
  onOpenRecordNew?: () => void;
  onOpenSettleReserved?: (expense: ActivityExpenseDTO) => void;
  onUpdated?: () => void;
  // Legacy / alternate prop support
  isOpen?: boolean;
  onSaved?: () => void;
  projectName?: string;
  canManageBudget?: boolean;
}

export function ExpenseHistoryDrawer({
  project,
  activity,
  onClose,
  onOpenRecordNew,
  onOpenSettleReserved,
  onUpdated,
  isOpen = true,
  onSaved,
  projectName,
  canManageBudget: propCanManageBudget,
}: ExpenseHistoryDrawerProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [voidingExpenseId, setVoidingExpenseId] = useState<string | null>(null);
  const [cancelRemark, setCancelRemark] = useState("");

  if (!isOpen) return null;

  const handleUpdated = onUpdated || onSaved || onClose;
  const resolvedProjectName = project ? `${project.code}: ${project.name}` : (projectName || "โครงการ");
  const financials = activity.financials || {
    effectiveBudget: 0,
    reservedAmount: 0,
    paidAmount: 0,
    remainingBalance: 0,
  };
  const canManageExpenses =
    propCanManageBudget ??
    activity.permissions?.canRecordAndSettleExpenses ??
    project?.permissions?.canDisburseExpenses ??
    true;

  const handleConfirmVoid = (expenseId: string) => {
    if (!cancelRemark.trim()) {
      setErrorMsg("กรุณาระบุเหตุผลในการยกเลิกรายการใช้จ่าย");
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      const res = await voidExpenseAction({
        expenseId,
        cancelRemark: cancelRemark.trim(),
      });

      if (!res.success) {
        setErrorMsg(res.error);
        return;
      }

      setVoidingExpenseId(null);
      setCancelRemark("");
      handleUpdated();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs">
      <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl dark:bg-gray-900">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-gray-800/60">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-900 p-2 text-white dark:bg-slate-700">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                ประวัติการใช้จ่ายงบประมาณรายกิจกรรม
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {resolvedProjectName} • กิจกรรมที่ {activity.activityNo}:{" "}
                {activity.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* แถบสรุปตัวเลขงบประมาณของกิจกรรมย่อย */}
        <div className="grid grid-cols-2 gap-2.5 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-gray-900 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-gray-800/40">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">งบสุทธิกิจกรรม</div>
            <div className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
              {formatCurrencyTHB(financials.effectiveBudget)}
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
            <div className="text-[11px] text-amber-800 dark:text-amber-400">กันวงเงินจอง</div>
            <div className="mt-0.5 text-sm font-bold text-amber-700 dark:text-amber-300">
              {formatCurrencyTHB(financials.reservedAmount)}
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900/50 dark:bg-blue-950/30">
            <div className="text-[11px] text-blue-800 dark:text-blue-400">เบิกจ่ายจริงแล้ว</div>
            <div className="mt-0.5 text-sm font-bold text-blue-700 dark:text-blue-300">
              {formatCurrencyTHB(financials.paidAmount)}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <div className="text-[11px] text-emerald-800 dark:text-emerald-400">คงเหลือสุทธิ</div>
            <div className="mt-0.5 text-sm font-bold text-emerald-700 dark:text-emerald-300">
              {formatCurrencyTHB(financials.remainingBalance)}
            </div>
          </div>
        </div>

        {/* แถบปุ่มเพิ่มรายการใหม่สำหรับเจ้าหน้าที่แผน */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            รายการธุรกรรมทั้งหมด ({(activity.expenses || []).length} รายการ)
          </span>

          {canManageExpenses && onOpenRecordNew && (
            <button
              type="button"
              onClick={onOpenRecordNew}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>บันทึกการใช้เงินเพิ่ม</span>
            </button>
          )}
        </div>

        {/* รายการประวัติการใช้เงิน */}
        <div className="flex-1 space-y-3 overflow-y-auto p-6">
          {errorMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {(activity.expenses || []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-14 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              ยังไม่มีประวัติการเบิกจ่ายหรือกันวงเงินในกิจกรรมนี้
            </div>
          ) : (
            activity.expenses.map((exp) => {
              const isReserved = exp.status === "RESERVED";
              const isVoidingThis = voidingExpenseId === exp.id;
              const reqName = exp.requester?.name || exp.requesterName || "ไม่ระบุ";
              const recName = exp.recordedBy?.name || exp.recordedByName || "ระบบ";

              return (
                <div
                  key={exp.id}
                  className={`rounded-xl border p-4 transition-all ${
                    isReserved
                      ? "border-amber-200 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-950/20"
                      : "border-slate-200 bg-white dark:border-slate-800 dark:bg-gray-800/40"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1.5">
                      {/* ป้ายสถานะ + หมวดค่าใช้จ่าย + วันที่ */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
                            isReserved
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                          }`}
                        >
                          {isReserved ? (
                            <Clock className="h-3 w-3" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          {EXPENSE_STATUS_LABELS[exp.status] || exp.status}
                        </span>

                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {EXPENSE_CATEGORY_LABELS[exp.expenseCategory] || exp.expenseCategory}
                        </span>

                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          วันที่{" "}
                          {new Date(exp.expenseDate).toLocaleDateString(
                            "th-TH",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </span>
                      </div>

                      {/* ชื่อรายการค่าใช้จ่าย */}
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {exp.title}
                      </div>

                      {/* ข้อมูล Audit Trail: ผู้ขอเบิก, ผู้คีย์, เลขที่ใบเสร็จ */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                        <span>
                          ผู้ขอเบิก:{" "}
                          <strong className="text-slate-800 dark:text-slate-200">
                            {reqName}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          ผู้บันทึกตัดยอด:{" "}
                          <strong className="text-slate-800 dark:text-slate-200">
                            {recName}
                          </strong>
                        </span>
                        {exp.receiptNo && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300">
                              อ้างอิง: {exp.receiptNo}
                            </span>
                          </>
                        )}
                      </div>

                      {exp.remark && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          หมายเหตุ: {exp.remark}
                        </p>
                      )}
                    </div>

                    {/* ยอดเงิน + ปุ่มจัดการสำหรับเจ้าหน้าที่แผน */}
                    <div className="flex flex-row items-center justify-between gap-3 sm:flex-col sm:items-end">
                      <div
                        className={`text-base font-bold ${
                          isReserved
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-blue-700 dark:text-blue-400"
                        }`}
                      >
                        {formatCurrencyTHB(exp.amount)}
                      </div>

                      {canManageExpenses && (
                        <div className="flex items-center gap-1.5">
                          {/* ปุ่มลัดเปลี่ยน RESERVED เป็น PAID */}
                          {isReserved && onOpenSettleReserved && (
                            <button
                              type="button"
                              onClick={() => onOpenSettleReserved(exp)}
                              className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-amber-700"
                            >
                              <FileCheck2 className="h-3.5 w-3.5" />
                              <span>ยืนยันเบิกจ่ายจริง</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setVoidingExpenseId(
                                isVoidingThis ? null : exp.id
                              );
                              setCancelRemark("");
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:bg-gray-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
                            title="ยกเลิกรายการและคืนวงเงินกลับเข้ากิจกรรม"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>ยกเลิกรายการ</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* กล่องกรอกเหตุผลการยกเลิกรายการ (Inline Void Confirmation) */}
                  {isVoidingThis && (
                    <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50/70 p-3 dark:border-rose-900 dark:bg-rose-950/40">
                      <label className="block text-xs font-semibold text-rose-900 dark:text-rose-200">
                        ระบุเหตุผลในการยกเลิกรายการ (วงเงิน{" "}
                        {formatCurrencyTHB(exp.amount)}{" "}
                        จะถูกคืนกลับเข้ากิจกรรมทันที):
                      </label>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <input
                          type="text"
                          value={cancelRemark}
                          onChange={(e) => setCancelRemark(e.target.value)}
                          placeholder="เช่น คีย์ยอดผิดพลาด หรือ ยกเลิกการจัดซื้อ"
                          className="flex-1 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-rose-500 focus:outline-none dark:border-rose-800 dark:bg-gray-800 dark:text-white"
                        />
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleConfirmVoid(exp.id)}
                            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                          >
                            {isPending ? "กำลังยกเลิก..." : "ยืนยันการยกเลิก"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setVoidingExpenseId(null)}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-300 dark:hover:bg-gray-700"
                          >
                            ปิด
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
