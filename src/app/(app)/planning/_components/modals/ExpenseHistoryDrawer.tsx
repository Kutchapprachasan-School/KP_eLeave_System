"use client";

import React, { useState, useTransition } from "react";
import { 
  X, 
  History, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Check, 
  AlertCircle, 
  Loader2, 
  Coins, 
  FileText, 
  User 
} from "lucide-react";
import { settleReservedExpenseAction, voidExpenseAction } from "@/app/actions/planning-expense";
import type { 
  ProjectActivityDTO, 
  ActivityExpenseDTO, 
  ExpenseCategoryType 
} from "@/lib/planning/types";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/planning/types";

interface ExpenseHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  activity: ProjectActivityDTO;
  projectName: string;
  canManageBudget: boolean;
}

export function ExpenseHistoryDrawer({
  isOpen,
  onClose,
  onSaved,
  activity,
  projectName,
  canManageBudget,
}: ExpenseHistoryDrawerProps) {
  // Settle Modal State
  const [settleTarget, setSettleTarget] = useState<ActivityExpenseDTO | null>(null);
  const [actualAmount, setActualAmount] = useState<string>("");
  const [settleReceiptNo, setSettleReceiptNo] = useState<string>("");

  // Void Modal State
  const [voidTarget, setVoidTarget] = useState<ActivityExpenseDTO | null>(null);
  const [voidRemark, setVoidRemark] = useState<string>("");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const expenses = activity.expenses || [];

  const handleOpenSettle = (exp: ActivityExpenseDTO) => {
    setSettleTarget(exp);
    setActualAmount(String(exp.amount));
    setSettleReceiptNo(exp.receiptNo || "");
    setErrorMessage(null);
  };

  const handleConfirmSettle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleTarget) return;

    const parsedActual = parseFloat(actualAmount);
    if (isNaN(parsedActual) || parsedActual <= 0) {
      setErrorMessage("กรุณากรอกจำนวนเงินเบิกจ่ายจริงที่ถูกต้อง");
      return;
    }

    startTransition(async () => {
      const res = await settleReservedExpenseAction({
        expenseId: settleTarget.id,
        actualAmount: parsedActual,
        receiptNo: settleReceiptNo.trim() || undefined,
      });

      if (res.success) {
        setSettleTarget(null);
        onSaved();
      } else {
        setErrorMessage(res.error || "เกิดข้อผิดพลาดในการยืนยันเบิกจ่ายจริง");
      }
    });
  };

  const handleOpenVoid = (exp: ActivityExpenseDTO) => {
    setVoidTarget(exp);
    setVoidRemark("");
    setErrorMessage(null);
  };

  const handleConfirmVoid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidTarget) return;

    if (!voidRemark.trim()) {
      setErrorMessage("กรุณาระบุเหตุผลในการยกเลิกรายการเบิกจ่ายนี้");
      return;
    }

    startTransition(async () => {
      const res = await voidExpenseAction({
        expenseId: voidTarget.id,
        cancelRemark: voidRemark.trim(),
      });

      if (res.success) {
        setVoidTarget(null);
        onSaved();
      } else {
        setErrorMessage(res.error || "เกิดข้อผิดพลาดในการยกเลิกรายการ");
      }
    });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs animate-in fade-in-50">
      <div className="bg-white dark:bg-gray-900 w-full max-w-2xl h-full shadow-2xl border-l border-gray-100 dark:border-gray-800 flex flex-col animate-in slide-in-from-right-50 duration-200">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                ประวัติการเบิกจ่าย & กันงบประมาณ
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[360px]">
                {activity.activityNo}. {activity.name} • {projectName}
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

        {/* Financial Summary Strip */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-[11px] text-gray-500">งบกิจกรรม</div>
            <div className="font-bold text-gray-900 dark:text-white text-sm">
              ฿{formatCurrency(activity.financials.effectiveBudget)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-blue-600 dark:text-blue-400">เบิกจ่ายจริง (PAID)</div>
            <div className="font-bold text-blue-700 dark:text-blue-400 text-sm">
              ฿{formatCurrency(activity.financials.paidAmount)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-amber-600 dark:text-amber-400">กันเงิน (RESERVED)</div>
            <div className="font-bold text-amber-700 dark:text-amber-400 text-sm">
              ฿{formatCurrency(activity.financials.reservedAmount)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400">คงเหลือสุทธิ</div>
            <div className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
              ฿{formatCurrency(activity.financials.remainingBalance)}
            </div>
          </div>
        </div>

        {/* Alert Error */}
        {errorMessage && (
          <div className="m-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-sm border border-rose-200 dark:border-rose-800 font-medium">
            {errorMessage}
          </div>
        )}

        {/* Ledger Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {expenses.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-gray-400 text-sm">
              ยังไม่มีประวัติการเบิกจ่ายหรือกันเงินงบประมาณในกิจกรรมนี้
            </div>
          ) : (
            expenses.map((exp) => {
              const isReserved = exp.status === "RESERVED";
              return (
                <div
                  key={exp.id}
                  className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-850 shadow-xs flex flex-col gap-2 hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {isReserved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            <Clock className="w-3 h-3" />
                            <span>กันงบประมาณ (RESERVED)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>เบิกจ่ายจริง (PAID)</span>
                          </span>
                        )}

                        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                          {EXPENSE_CATEGORY_LABELS[exp.expenseCategory] || exp.expenseCategory}
                        </span>
                      </div>

                      <h4 className="font-bold text-gray-900 dark:text-white mt-1.5 text-sm">
                        {exp.title}
                      </h4>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span>วันที่ {new Date(exp.expenseDate).toLocaleDateString("th-TH")}</span>
                        {exp.requesterName && <span>• ขอเบิกโดย: {exp.requesterName}</span>}
                        {exp.receiptNo && <span>• เลขที่: {exp.receiptNo}</span>}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-base font-black ${
                          isReserved
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        ฿{formatCurrency(exp.amount)}
                      </div>
                    </div>
                  </div>

                  {/* Actions for this expense row (Planning officers only) */}
                  {canManageBudget && (
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
                      {isReserved && (
                        <button
                          type="button"
                          onClick={() => handleOpenSettle(exp)}
                          disabled={isPending}
                          className="h-8 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>ยืนยันเบิกจ่ายจริง</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenVoid(exp)}
                        disabled={isPending}
                        className="h-8 px-2.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        title="ยกเลิกรายการเบิกจ่ายนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ยกเลิก</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Inline Overlay: Settle Reserved Expense */}
        {settleTarget && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-20 animate-in fade-in-50">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  ยืนยันเบิกจ่ายจริง (Settle Disbursement)
                </h3>
                <button
                  type="button"
                  onClick={() => setSettleTarget(null)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs text-gray-600 dark:text-gray-400">
                รายการ: <span className="font-semibold text-gray-900 dark:text-white">{settleTarget.title}</span>
                <br />
                ยอดที่กันไว้เดิม: ฿{formatCurrency(settleTarget.amount)}
              </div>

              <form onSubmit={handleConfirmSettle} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    ยอดเงินเบิกจ่ายจริง (บาท) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={actualAmount}
                    onChange={(e) => setActualAmount(e.target.value)}
                    className="w-full h-11 px-4 text-base font-bold text-purple-900 dark:text-purple-200 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    (หากยอดจริงต่ำกว่ายอดกันไว้ ส่วนต่างจะคืนกลับสู่งบประมาณกิจกรรมโดยอัตโนมัติ)
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    เลขที่ใบเสร็จ / เลขที่ฎีกา
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ใบเสร็จเล่ม 10 เลขที่ 23"
                    value={settleReceiptNo}
                    onChange={(e) => setSettleReceiptNo(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSettleTarget(null)}
                    disabled={isPending}
                    className="h-10 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>ยืนยันเบิกจ่าย</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Inline Overlay: Void Expense */}
        {voidTarget && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-20 animate-in fade-in-50">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <h3 className="font-bold text-rose-600 dark:text-rose-400 text-base flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  <span>ยกเลิกรายการเบิกจ่าย</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setVoidTarget(null)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs text-gray-600 dark:text-gray-400">
                รายการ: <span className="font-semibold text-gray-900 dark:text-white">{voidTarget.title}</span>
                <br />
                จำนวนเงิน: ฿{formatCurrency(voidTarget.amount)}
                <br />
                <span className="text-rose-600 dark:text-rose-400 mt-1 block">
                  * เมื่อยกเลิกแล้ว เงินจำนวนนี้จะถูกคืนกลับเข้าสู่งบประมาณคงเหลือของกิจกรรมทันที
                </span>
              </div>

              <form onSubmit={handleConfirmVoid} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    เหตุผลในการยกเลิกรายการ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น คีย์ยอดเงินผิด, กิจกรรมเลื่อนกำหนดการ"
                    value={voidRemark}
                    onChange={(e) => setVoidRemark(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setVoidTarget(null)}
                    disabled={isPending}
                    className="h-10 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    กลับ
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="h-10 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>ยืนยันยกเลิกรายการ</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
