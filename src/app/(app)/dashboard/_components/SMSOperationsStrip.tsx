"use client";

import React from "react";
import Link from "next/link";
import {
  Banknote,
  FileText,
  Building2,
  Users,
  UserCheck,
  TrendingUp,
  ArrowRight,
  FileCheck,
  Wrench,
  Send,
} from "lucide-react";

import type { SchoolManagementExecutiveStats } from "@/app/actions/dashboard-widgets";

interface SMSOperationsStripProps {
  stats?: SchoolManagementExecutiveStats | null;
}

export default function SMSOperationsStrip({ stats }: SMSOperationsStripProps) {
  const currentFiscalYear = stats?.budget?.fiscalYear ?? new Date().getFullYear() + 543;
  const totalBudget = stats?.budget?.totalBudget ?? 0;
  const totalSpent = stats?.budget?.totalSpent ?? 0;
  const projectCount = stats?.budget?.projectCount ?? 0;
  const activeProjectCount = stats?.budget?.activeProjectCount ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 select-none">
      {/* ── Card 1: การเงิน & งบประมาณ ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <Banknote className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-white">
              การเงิน & งบประมาณ
            </h3>
          </div>
          <Link
            href="/budget"
            className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            ดูทั้งหมด
          </Link>
        </div>

        <div className="mt-2.5 space-y-2">
          {/* Budget */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Banknote className="w-3 h-3 text-emerald-500" />
              งบประมาณ (ปีงบ {currentFiscalYear})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold text-slate-900 dark:text-white">
              {totalBudget.toLocaleString("th-TH")}
            </span>
            <span className="text-[10px] text-slate-400">บาท</span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">จัดสรรโครงการแล้ว</span>
            <span className="font-bold text-slate-800 dark:text-white">
              {totalSpent.toLocaleString("th-TH")} บาท
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>
              โครงการทั้งหมด <strong className="text-slate-700 dark:text-white">{projectCount}</strong> โครงการ
            </span>
            <span>
              ดำเนินการ <strong className="text-emerald-600 dark:text-emerald-400">{activeProjectCount}</strong>
            </span>
          </div>

          <Link
            href="/budget"
            className="inline-flex items-center gap-1 px-3 py-1.5 mt-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold hover:bg-emerald-100 transition w-full justify-center"
          >
            จัดการงบประมาณและโครงการ <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* ── Card 2: งานเอกสาร & สารบรรณ ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-white">
              งานเอกสาร & สารบรรณ
            </h3>
          </div>
          <Link
            href="/document?view=history&tab=inbound"
            className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            ดูทั้งหมด
          </Link>
        </div>

        <div className="mt-2.5 space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <FileCheck className="w-3 h-3 text-blue-500" /> รอเกษียณ/พิจารณา
            </span>
            <span className="font-bold text-slate-800 dark:text-white">
              {stats?.document.pendingRoutingCount ?? 0} เรื่อง
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Send className="w-3 h-3 text-indigo-500" /> ออกเลขหนังสือปีนี้
            </span>
            <span className="font-bold text-slate-800 dark:text-white">
              {stats?.document.totalIssuedThisYear ?? 0} เรื่อง
            </span>
          </div>

          <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-[10.5px]">
              <span className="text-slate-400">ระบบสารบรรณอิเล็กทรอนิกส์</span>
              <span className="font-bold text-emerald-600">เชื่อมต่อแล้ว</span>
            </div>
          </div>

          <Link
            href="/document?view=history&tab=inbound"
            className="inline-flex items-center gap-1 px-3 py-1.5 mt-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 text-[10px] font-bold hover:bg-blue-100 transition w-full justify-center"
          >
            ดูรายละเอียด <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* ── Card 3: งานอื่น & อาคารสถานที่ ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-white">
              งานอื่น & อาคารสถานที่
            </h3>
          </div>
          <Link
            href="/general/facility"
            className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            ดูทั้งหมด
          </Link>
        </div>

        <div className="mt-2.5 space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Wrench className="w-3 h-3 text-amber-500" /> งานแจ้งซ่อมค้างอยู่
            </span>
            <span className="font-bold text-slate-800 dark:text-white">
              {stats?.repair.activeCount ?? 0} รายการ
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">จองสถานที่/รถวันนี้</span>
            <span className="font-bold text-slate-800 dark:text-white">
              {stats?.facility.reservationsTodayCount ?? 0} รายการ
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">คำขอจองรออนุมัติ</span>
            <span className="font-bold text-slate-800 dark:text-white">
              {stats?.facility.pendingReservationCount ?? 0} รายการ
            </span>
          </div>

          <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-[10.5px]">
              <span className={stats?.repair.overdueSlaCount && stats.repair.overdueSlaCount > 0 ? "text-rose-600 font-semibold flex items-center gap-1" : "text-emerald-600 font-semibold flex items-center gap-1"}>
                {stats?.repair.overdueSlaCount && stats.repair.overdueSlaCount > 0 ? `⚠️ เกิน SLA ${stats.repair.overdueSlaCount} รายการ` : "✅ ดำเนินการตาม SLA"}
              </span>
              <span className="font-bold text-slate-700 dark:text-white">{stats?.repair.activeCount ?? 0} เรื่อง</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Card 4: บริหารงานบุคคล & สอนแทน ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-white">
              บริหารงานบุคคล & สอนแทน
            </h3>
          </div>
          <Link
            href="/approvals"
            className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            ดูทั้งหมด
          </Link>
        </div>

        <div className="mt-2.5 space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <UserCheck className="w-3 h-3 text-emerald-500" /> ปฏิบัติราชการวันนี้
            </span>
            <span className="font-bold text-slate-800 dark:text-white">
              {stats?.staff.attendanceToday.totalClockIn ?? 0} คน
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">บุคลากรลาวันนี้</span>
            <span className="font-bold text-slate-800 dark:text-white">
              {stats?.staff.staffOnLeaveTodayCount ?? 0} คน
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">มีการจัดสอนแทน</span>
            <span className="font-bold text-slate-800 dark:text-white">
              {stats?.staff.proxyTeachingCount ?? 0} รายการ
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">คำขอรอพิจารณา</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {stats?.staff.pendingLeaveCount ?? 0} รายการ
            </span>
          </div>

          <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/approvals"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold hover:bg-indigo-100 transition w-full justify-center"
            >
              ติดตามคิวพิจารณาการลา <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
