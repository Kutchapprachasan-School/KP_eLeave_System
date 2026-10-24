"use client";

import React from "react";
import { Wallet, CheckCircle2, Clock, PiggyBank, TrendingUp } from "lucide-react";
import type { PortfolioSummaryDTO } from "@/lib/planning/types";

interface FinancialMetricCardsProps {
  summary: PortfolioSummaryDTO;
}

export function FinancialMetricCards({ summary }: FinancialMetricCardsProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const spentRatio =
    summary.totalEffectiveBudget > 0
      ? Math.min(100, (summary.totalPaid / summary.totalEffectiveBudget) * 100)
      : 0;

  const reservedRatio =
    summary.totalEffectiveBudget > 0
      ? Math.min(100, (summary.totalReserved / summary.totalEffectiveBudget) * 100)
      : 0;

  const remainingRatio =
    summary.totalEffectiveBudget > 0
      ? Math.max(0, (summary.totalRemaining / summary.totalEffectiveBudget) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Effective Budget */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-purple-100 dark:border-purple-950/60 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-400">
            งบประมาณทั้งหมด
          </span>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            ฿{formatCurrency(summary.totalEffectiveBudget)}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>{summary.totalProjects} โครงการ</span>
            <span>•</span>
            <span>{summary.totalActivities} กิจกรรมย่อย</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-purple-50 dark:border-purple-950/40 text-[11px] text-purple-600 dark:text-purple-400 flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5 shrink-0" />
          <span>กรอบวงเงินอนุมัติของโครงการที่แสดง</span>
        </div>
      </div>

      {/* 2. Total Paid (Actual Disbursement) */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-blue-100 dark:border-blue-950/60 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            เบิกจ่ายจริง (PAID)
          </span>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-blue-700 dark:text-blue-400 tracking-tight">
            ฿{formatCurrency(summary.totalPaid)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>เบิกจ่ายแล้ว</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {spentRatio.toFixed(1)}%
            </span>
          </div>
        </div>
        {/* Progress Mini Bar */}
        <div className="mt-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${spentRatio}%` }}
          />
        </div>
      </div>

      {/* 3. Total Reserved (Committed Budget) */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-amber-100 dark:border-amber-950/60 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            กันงบประมาณ (RESERVED)
          </span>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400 tracking-tight">
            ฿{formatCurrency(summary.totalReserved)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>ผูกพันรอจ่าย</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {reservedRatio.toFixed(1)}%
            </span>
          </div>
        </div>
        {/* Progress Mini Bar */}
        <div className="mt-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-amber-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${reservedRatio}%` }}
          />
        </div>
      </div>

      {/* 4. Total Remaining (Available Balance) */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-950/60 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            คงเหลือสุทธิ (REMAINING)
          </span>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <PiggyBank className="w-5 h-5" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
            ฿{formatCurrency(summary.totalRemaining)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>สามารถใช้ได้</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {remainingRatio.toFixed(1)}%
            </span>
          </div>
        </div>
        {/* Progress Mini Bar */}
        <div className="mt-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-emerald-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${remainingRatio}%` }}
          />
        </div>
      </div>
    </div>
  );
}
