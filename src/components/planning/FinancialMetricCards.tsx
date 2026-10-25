"use client";

import React from "react";
import { PortfolioSummaryDTO } from "@/lib/planning/types";
import {
  Wallet,
  CheckCircle2,
  Clock,
  PiggyBank,
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
      <div className="stat-card group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-gray-900 p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            งบประมาณสุทธิรวม
          </span>
          <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2 text-slate-700 dark:text-slate-300 group-hover:scale-105 transition-transform">
            <Wallet className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white">
          {formatCurrencyTHB(totalEffectiveBudget)}
        </div>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          ครอบคลุม <strong className="text-slate-700 dark:text-slate-200">{projectCount}</strong>{" "}
          โครงการ ({activityCount} กิจกรรมย่อย)
        </p>
      </div>

      {/* 2. เบิกจ่ายจริงแล้ว (PAID) */}
      <div className="stat-card group rounded-xl border border-blue-200 dark:border-blue-900/60 bg-gradient-to-br from-blue-50/60 to-white dark:from-blue-950/40 dark:to-gray-900 p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
            เบิกจ่ายจริงแล้ว (Paid)
          </span>
          <div className="rounded-lg bg-blue-100 dark:bg-blue-900/60 p-2 text-blue-700 dark:text-blue-300 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 text-2xl font-bold tracking-tight tabular-nums text-blue-700 dark:text-blue-400">
          {formatCurrencyTHB(totalPaidAmount)}
        </div>
        <p className="mt-1.5 text-xs text-blue-700/80 dark:text-blue-400/80">
          คิดเป็น <strong>{paidPercent}%</strong> ของงบประมาณสุทธิ
        </p>
      </div>

      {/* 3. กันวงเงินรอเบิก (RESERVED) */}
      <div className="stat-card group rounded-xl border border-amber-200 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/60 to-white dark:from-amber-950/40 dark:to-gray-900 p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-amber-900 dark:text-amber-300">
            กันวงเงินจอง (Reserved)
          </span>
          <div className="rounded-lg bg-amber-100 dark:bg-amber-900/60 p-2 text-amber-700 dark:text-amber-300 group-hover:scale-105 transition-transform">
            <Clock className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 text-2xl font-bold tracking-tight tabular-nums text-amber-700 dark:text-amber-400">
          {formatCurrencyTHB(totalReservedAmount)}
        </div>
        <p className="mt-1.5 text-xs text-amber-800/80 dark:text-amber-400/80">
          รออนุมัติ/รอใบเสร็จ <strong>{reservedPercent}%</strong> ของงบสุทธิ
        </p>
      </div>

      {/* 4. คงเหลือสุทธิ (REMAINING) */}
      <div
        className={`stat-card group rounded-xl border p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
          totalRemainingBalance < 0
            ? "border-rose-200 dark:border-rose-900/60 bg-gradient-to-br from-rose-50/60 to-white dark:from-rose-950/40 dark:to-gray-900"
            : "border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/60 to-white dark:from-emerald-950/40 dark:to-gray-900"
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-sm font-medium ${
              totalRemainingBalance < 0 ? "text-rose-900 dark:text-rose-300" : "text-emerald-900 dark:text-emerald-300"
            }`}
          >
            คงเหลือสุทธิ (Remaining)
          </span>
          <div
            className={`rounded-lg p-2 ${
              totalRemainingBalance < 0
                ? "bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300"
                : "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300"
            }`}
          >
            <PiggyBank className="h-5 w-5" />
          </div>
        </div>
        <div
          className={`mt-3 text-2xl font-bold tracking-tight tabular-nums ${
            totalRemainingBalance < 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"
          }`}
        >
          {formatCurrencyTHB(totalRemainingBalance)}
        </div>
        <p
          className={`mt-1.5 text-xs ${
            totalRemainingBalance < 0
              ? "text-rose-700/80 dark:text-rose-400/80"
              : "text-emerald-800/80 dark:text-emerald-400/80"
          }`}
        >
          งบคงเหลือพร้อมใช้ <strong>{remainingPercent}%</strong>
        </p>
      </div>
    </div>
  );
}
