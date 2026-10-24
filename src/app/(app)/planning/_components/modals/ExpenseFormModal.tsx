"use client";

import React, { useState, useTransition } from "react";
import { 
  X, 
  Save, 
  Loader2, 
  Coins, 
  CreditCard, 
  Clock, 
  AlertCircle, 
  Info, 
  Calendar, 
  User, 
  FileText 
} from "lucide-react";
import { recordExpenseAction } from "@/app/actions/planning-expense";
import type { 
  ProjectActivityDTO, 
  ExpenseCategoryType, 
  ExpenseStatusType 
} from "@/lib/planning/types";

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  activity: ProjectActivityDTO;
  projectName: string;
}

const EXPENSE_CATEGORIES: { value: ExpenseCategoryType; label: string }[] = [
  { value: "OPERATING", label: "ค่าใช้สอย (จัดสถานที่/วิทยากร/เดินทาง/เบี้ยเลี้ยง)" },
  { value: "MATERIALS", label: "ค่าวัสดุ (เครื่องเขียน/อุปกรณ์การเรียน/เอกสาร)" },
  { value: "REMUNERATION", label: "ค่าตอบแทน (กรรมการ/ครูพี่เลี้ยง)" },
  { value: "EQUIPMENT", label: "ค่าครุภัณฑ์ (อุปกรณ์/เครื่องคอมพิวเตอร์)" },
  { value: "UTILITIES", label: "ค่าสาธารณูปโภค" },
  { value: "OTHER", label: "ค่าใช้จ่ายเบ็ดเตล็ดอื่น ๆ" },
];

export function ExpenseFormModal({
  isOpen,
  onClose,
  onSaved,
  activity,
  projectName,
}: ExpenseFormModalProps) {
  const [status, setStatus] = useState<ExpenseStatusType>("PAID");
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategoryType>("OPERATING");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [disbursedAt, setDisbursedAt] = useState(new Date().toISOString().split("T")[0]);
  const [requesterName, setRequesterName] = useState(activity.responsibleUserName || "");
  const [receiptNo, setReceiptNo] = useState("");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const availableBalance = activity.financials.remainingBalance;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage("กรุณากรอกจำนวนเงินที่ถูกต้อง (ต้องมากกว่า 0 บาท)");
      return;
    }

    if (parsedAmount > availableBalance) {
      setErrorMessage(
        `ยอดเงิน ฿${parsedAmount.toLocaleString("th-TH")} เกินกว่างบประมาณคงเหลือของกิจกรรมนี้ (คงเหลือ ฿${availableBalance.toLocaleString("th-TH")})`
      );
      return;
    }

    startTransition(async () => {
      const res = await recordExpenseAction({
        activityId: activity.id,
        expenseCategory,
        status,
        title: title.trim(),
        amount: parsedAmount,
        expenseDate: new Date(disbursedAt),
        requesterUserId: activity.responsibleUserId,
        receiptNo: receiptNo.trim() || undefined,
      });

      if (res.success) {
        onSaved();
        onClose();
      } else {
        setErrorMessage(res.error || "เกิดข้อผิดพลาดในการบันทึกค่าใช้จ่าย");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                บันทึกการเบิกจ่าย / กันเงินงบประมาณ
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[280px]">
                {activity.activityNo}. {activity.name}
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

        {/* Activity Financial Context Banner */}
        <div className="px-6 py-3 bg-purple-50/70 dark:bg-purple-950/30 border-b border-purple-100 dark:border-purple-900/40 flex items-center justify-between text-xs">
          <div>
            <span className="text-gray-500 dark:text-gray-400">งบประมาณกิจกรรม: </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              ฿{activity.financials.effectiveBudget.toLocaleString("th-TH")}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">คงเหลือใช้ได้: </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              ฿{availableBalance.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-sm border border-rose-200 dark:border-rose-800 font-medium">
              {errorMessage}
            </div>
          )}

          {/* Type Toggle: PAID vs RESERVED */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              ประเภทการทำรายการ <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus("PAID")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  status === "PAID"
                    ? "bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-xs"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50"
                }`}
              >
                <CreditCard className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-sm">เบิกจ่ายจริง (PAID)</div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    มีใบเสร็จหรือฎีกาเบิกจ่ายเรียบร้อยแล้ว
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStatus("RESERVED")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                  status === "RESERVED"
                    ? "bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-950 dark:text-amber-100 ring-2 ring-amber-500/20 shadow-xs"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50"
                }`}
              >
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-sm">กันงบประมาณ (RESERVED)</div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    ผูกพันยอดเงินไว้ก่อน รอตัดจ่ายจริงภายหลัง
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              จำนวนเงิน (บาท) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={availableBalance}
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-11 px-4 text-base font-bold text-purple-900 dark:text-purple-200 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <span className="absolute right-4 top-3 text-xs font-medium text-gray-400">
                บาท
              </span>
            </div>
          </div>

          {/* Expense Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              หมวดค่าใช้จ่าย <span className="text-rose-500">*</span>
            </label>
            <select
              value={expenseCategory}
              onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategoryType)}
              className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Title & Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              รายละเอียดรายการเบิกจ่าย <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="เช่น ซื้อวัสดุอุปกรณ์ทำสื่อการเรียนรู้, จ่ายค่าอาหารกลางวัน"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Disbursed Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                วันที่ทำรายการ / วันที่เบิกจ่าย <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={disbursedAt}
                onChange={(e) => setDisbursedAt(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Requester Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                ครูผู้ขอเบิก / ผู้รับเงิน
              </label>
              <input
                type="text"
                placeholder="ชื่อ-นามสกุล ครูผู้ขอเบิก"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Receipt / Doc Reference No */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              เลขที่ใบเสร็จ / เลขที่ฎีกา / บันทึกข้อความ (ถ้ามี)
            </label>
            <input
              type="text"
              placeholder="เช่น ใบเสร็จเล่ม 12 เลขที่ 45, บันทึกข้อความที่ ศธ 04..."
              value={receiptNo}
              onChange={(e) => setReceiptNo(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
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
                  <span>บันทึกตัดงบประมาณ</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
