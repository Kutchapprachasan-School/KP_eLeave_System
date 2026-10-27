"use client";

import React from "react";
import { PortfolioSummaryDTO } from "@/lib/planning/types";
import {
  Coins,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";

interface FinancialMetricCardsProps {
  summary: PortfolioSummaryDTO;
}

export function formatCurrencyTHB(amount: number): string {
  return `฿${amount.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function FinancialMetricCards({ summary }: FinancialMetricCardsProps) {
  const {
    totalEffectiveBudget,
    totalPaidAmount,
    totalReservedAmount,
    totalRemainingBalance,
    projectCount,
    activityCount,
  } = summary;

  const paidPercent =
    totalEffectiveBudget > 0
      ? ((totalPaidAmount / totalEffectiveBudget) * 100).toFixed(1)
      : "0.0";

  const reservedPercent =
    totalEffectiveBudget > 0
      ? ((totalReservedAmount / totalEffectiveBudget) * 100).toFixed(1)
      : "0.0";

  const remainingPercent =
    totalEffectiveBudget > 0
      ? ((totalRemainingBalance / totalEffectiveBudget) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* 1. งบประมาณสุทธิรวม */}
      <div className="stat-card group flex flex-col justify-between rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-gray-900 p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-400">
            <Coins className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            งบประมาณสุทธิรวม
          </span>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-black tracking-tight tabular-nums text-slate-900 dark:text-white">
            {formatCurrencyTHB(totalEffectiveBudget)}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            ครอบคลุม {projectCount} โครงการ ({activityCount} กิจกรรมย่อย)
          </p>
        </div>
      </div>

      {/* 2. เบิกจ่ายจริงแล้ว */}
      <div className="stat-card group flex flex-col justify-between rounded-2xl border border-blue-100/90 dark:border-blue-900/60 bg-blue-50/20 dark:bg-blue-950/20 p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-200/70 bg-blue-50 text-blue-600 dark:border-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
            <RefreshCw className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            เบิกจ่ายจริงแล้ว
          </span>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-black tracking-tight tabular-nums text-blue-600 dark:text-blue-400">
            {formatCurrencyTHB(totalPaidAmount)}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            คิดเป็น {paidPercent}% ของงบประมาณสุทธิ
          </p>
        </div>
      </div>

      {/* 3. กันวงเงินจอง */}
      <div className="stat-card group flex flex-col justify-between rounded-2xl border border-amber-200/70 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/20 p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            กันวงเงินจอง
          </span>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-black tracking-tight tabular-nums text-amber-600 dark:text-amber-400">
            {formatCurrencyTHB(totalReservedAmount)}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            รองบ/ผูกไว้รอเบิกแล้ว {reservedPercent}% ของงบสุทธิ
          </p>
        </div>
      </div>

      {/* 4. คงเหลือสุทธิ */}
      <div
        className={`stat-card group flex flex-col justify-between rounded-2xl border p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
          totalRemainingBalance < 0
            ? "border-rose-200/80 bg-rose-50/25 dark:border-rose-900/60 dark:bg-rose-950/20"
            : "border-emerald-200/70 bg-emerald-50/20 dark:border-emerald-900/60 dark:bg-emerald-950/20"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
              totalRemainingBalance < 0
                ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                : "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
            }`}
          >
            <Wallet className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            คงเหลือสุทธิ
          </span>
        </div>
        <div className="mt-3">
          <div
            className={`text-2xl font-black tracking-tight tabular-nums ${
              totalRemainingBalance < 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {formatCurrencyTHB(totalRemainingBalance)}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            ยอดเหลือพร้อมใช้ {remainingPercent}%
          </p>
        </div>
      </div>
    </div>
  );
}
