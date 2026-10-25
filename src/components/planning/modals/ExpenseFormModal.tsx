"use client";

import React, { useState, useTransition } from "react";
import {
  recordExpenseAction,
  settleReservedExpenseAction,
} from "@/actions/planning/expense-actions";
import { fromSatang, toSatang } from "@/lib/planning/calculator";
import {
  ActivityExpenseDTO,
  EXPENSE_CATEGORY_LABELS,
  ExpenseCategoryType,
  ProjectActivityDTO,
  ProjectDTO,
  SimpleUserDTO,
} from "@/lib/planning/types";
import { formatCurrencyTHB } from "../FinancialMetricCards";
import {
  X,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  Save,
} from "lucide-react";

export interface ExpenseFormModalProps {
  mode?: "RECORD" | "SETTLE";
  project?: ProjectDTO;
  activity: ProjectActivityDTO;
  settlingExpense?: ActivityExpenseDTO;
  teachers?: SimpleUserDTO[] | Array<{ id: string; name: string; position?: string | null }>;
  onClose: () => void;
  onSuccess?: () => void;
  // Legacy / alternate prop support
  isOpen?: boolean;
  onSaved?: () => void;
  projectName?: string;
}

export function ExpenseFormModal({
  mode: propMode,
  project,
  activity,
  settlingExpense,
  teachers: propTeachers,
  onClose,
  onSuccess,
  isOpen = true,
  onSaved,
  projectName,
}: ExpenseFormModalProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const mode = propMode || (settlingExpense ? "SETTLE" : "RECORD");
  const handleSuccess = onSuccess || onSaved || onClose;
  const teachers = (propTeachers || []) as SimpleUserDTO[];
  const resolvedProjectName = project ? `${project.code}: ${project.name}` : (projectName || "โครงการ");

  const todayIso = new Date().toISOString().slice(0, 10);

  const [status, setStatus] = useState<"PAID" | "RESERVED">(
    mode === "SETTLE" ? "PAID" : "PAID"
  );
  const [expenseDate, setExpenseDate] = useState<string>(
    settlingExpense ? String(settlingExpense.expenseDate).slice(0, 10) : todayIso
  );
  const [title, setTitle] = useState<string>(settlingExpense?.title ?? "");
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategoryType>(
    settlingExpense?.expenseCategory ?? "MATERIALS"
  );
  const [amountInput, setAmountInput] = useState<string>(
    settlingExpense ? String(settlingExpense.amount) : ""
  );
  const [requesterUserId, setRequesterUserId] = useState<string>(
    settlingExpense?.requesterUserId ||
      settlingExpense?.requester?.id ||
      activity.responsibleUserId ||
      activity.responsibleUser?.id ||
      teachers[0]?.id ||
      ""
  );
  const [receiptNo, setReceiptNo] = useState<string>(
    settlingExpense?.receiptNo ?? ""
  );
  const [remark, setRemark] = useState<string>(settlingExpense?.remark ?? "");

  // คำนวณวงเงินที่ใช้ได้จริง (Settlement Delta Invariant สำหรับกรณีเคลียร์บิล RESERVED)
  const currentRemainingSatang = toSatang(
    activity.financials?.remainingBalance ?? 0
  );
  const oldReservedSatang =
    mode === "SETTLE" && settlingExpense
      ? toSatang(settlingExpense.amount)
      : 0;
  const availableSatang = currentRemainingSatang + oldReservedSatang;
  const availableBalance = fromSatang(availableSatang);

  const enteredSatang = toSatang(amountInput || 0);
  const projectedRemainingSatang = availableSatang - enteredSatang;
  const projectedRemaining = fromSatang(projectedRemainingSatang);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedAmount = parseFloat(amountInput || "0");
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg("กรุณาระบุจำนวนเงินที่มากกว่า 0.00 บาท");
      return;
    }

    startTransition(async () => {
      if (mode === "SETTLE" && settlingExpense) {
        const res = await settleReservedExpenseAction({
          expenseId: settlingExpense.id,
          actualAmount: parsedAmount,
          expenseDate,
          receiptNo,
          expenseCategory,
          title,
          remark,
        });

        if (!res.success) {
          setErrorMsg(res.error);
          return;
        }
      } else {
        const res = await recordExpenseAction({
          activityId: activity.id,
          expenseDate,
          title,
          expenseCategory,
          amount: parsedAmount,
          status,
          requesterUserId,
          receiptNo,
          remark,
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
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-gray-900">
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b px-6 py-4 ${
            mode === "SETTLE"
              ? "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/40"
              : "border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-gray-800/60"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`rounded-lg p-2 text-white ${
                mode === "SETTLE" ? "bg-amber-600" : "bg-emerald-600"
              }`}
            >
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {mode === "SETTLE"
                  ? "ยืนยันเบิกจ่ายจริง (เคลียร์รายการกันวงเงิน)"
                  : "บันทึกการใช้จ่ายเงิน / ตัดยอดงบประมาณ"}
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
            aria-label="ปิดหน้าต่าง"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 space-y-4 overflow-y-auto p-6"
        >
          {/* กล่องแสดงวงเงินคงเหลือที่ใช้ได้ และยอดคงเหลือหลังหักแบบ Real-time */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-gray-800/40">
            <div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {mode === "SETTLE"
                  ? "วงเงินที่ใช้ได้ (รวมยอดกันเงินเดิม)"
                  : "งบคงเหลือปัจจุบันของกิจกรรม"}
              </div>
              <div className="mt-0.5 text-base font-bold tabular-nums text-slate-900 dark:text-white">
                {formatCurrencyTHB(availableBalance)}
              </div>
              {mode === "SETTLE" && settlingExpense && (
                <div className="text-[11px] tabular-nums text-amber-700 dark:text-amber-400">
                  (เดิมกันไว้ {formatCurrencyTHB(settlingExpense.amount)})
                </div>
              )}
            </div>

            <div className="border-l border-slate-200 pl-3 dark:border-slate-700">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                คงเหลือสุทธิหลังบันทึกรายการนี้
              </div>
              <div
                className={`mt-0.5 text-base font-bold tabular-nums ${
                  projectedRemaining < 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-700 dark:text-emerald-400"
                }`}
              >
                {formatCurrencyTHB(projectedRemaining)}
              </div>
              {projectedRemaining < 0 && (
                <div className="text-[11px] font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                  เกินวงเงิน {formatCurrencyTHB(Math.abs(projectedRemaining))}
                </div>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ปุ่มเลือกประเภทการบันทึก (แสดงเฉพาะโหมดสร้างรายการใหม่) */}
          {mode === "RECORD" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                ประเภทการตัดงบประมาณ <span className="text-rose-500">*</span>
              </label>
              <div className="mt-1.5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStatus("PAID")}
                  className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                    status === "PAID"
                      ? "border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-300 dark:hover:bg-gray-750"
                  }`}
                >
                  <CheckCircle2
                    className={`h-5 w-5 shrink-0 ${
                      status === "PAID" ? "text-blue-600 dark:text-blue-400" : "text-slate-400"
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold">เบิกจ่ายจริง (PAID)</div>
                    <div className="text-[11px] opacity-80">
                      จ่ายเงิน/มีใบเสร็จเรียบร้อยแล้ว
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus("RESERVED")}
                  className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                    status === "RESERVED"
                      ? "border-amber-500 bg-amber-50/70 text-amber-900 ring-2 ring-amber-500/20 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-300"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-gray-800 dark:text-slate-300 dark:hover:bg-gray-750"
                  }`}
                >
                  <Clock
                    className={`h-5 w-5 shrink-0 ${
                      status === "RESERVED"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-slate-400"
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold">
                      กันวงเงินจอง (RESERVED)
                    </div>
                    <div className="text-[11px] opacity-80">
                      ขออนุมัติหลักการไว้ รอใบเสร็จจริง
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                วันที่ใช้จ่าย / วันที่ในใบเสร็จ{" "}
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                หมวดค่าใช้จ่าย <span className="text-rose-500">*</span>
              </label>
              <select
                value={expenseCategory}
                onChange={(e) =>
                  setExpenseCategory(e.target.value as ExpenseCategoryType)
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-white"
              >
                {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              รายการค่าใช้จ่าย <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น ซื้อวัสดุวิทยาศาสตร์สำหรับเข้าค่าย ร้าน ก."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                จำนวนเงิน (บาท) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="0.00"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base font-bold tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                เลขที่ใบเสร็จ / เลขที่เอกสารอ้างอิง
              </label>
              <input
                type="text"
                value={receiptNo}
                onChange={(e) => setReceiptNo(e.target.value)}
                placeholder="เช่น INV-2569/014 หรือ บันทึกข้อความ..."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          {mode === "RECORD" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                ครูผู้ขอเบิกงบประมาณ <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={requesterUserId}
                onChange={(e) => setRequesterUserId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-white"
              >
                {teachers.length > 0 ? (
                  teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))
                ) : (
                  <option value={requesterUserId}>
                    {activity.responsibleUserName || "ผู้รับผิดชอบกิจกรรม"}
                  </option>
                )}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              หมายเหตุเพิ่มเติม (ถ้ามี)
            </label>
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="ระบุรายละเอียดเพิ่มเติม..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-gray-800 dark:text-white"
            />
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
              disabled={isPending || projectedRemaining < 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>
                {isPending
                  ? "กำลังบันทึก..."
                  : mode === "SETTLE"
                  ? "ยืนยันเปลี่ยนเป็นเบิกจ่ายจริง (PAID)"
                  : "บันทึกตัดยอดงบประมาณ"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
