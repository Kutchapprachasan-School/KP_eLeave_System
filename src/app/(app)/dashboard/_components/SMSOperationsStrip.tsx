"use client";

import React from "react";
import Link from "next/link";
import {
  Banknote,
  FileText,
  Building2,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  FileCheck,
  Wrench,
  Send,
  Phone,
  Mail,
} from "lucide-react";

import type { SchoolManagementExecutiveStats } from "@/app/actions/dashboard-widgets";

interface SMSOperationsStripProps {
  stats?: SchoolManagementExecutiveStats | null;
}

export default function SMSOperationsStrip({ stats }: SMSOperationsStripProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 select-none">
      {/* ── Card 1: การเงิน & พัสดุ ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <Banknote className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-white">
              การเงิน & พัสดุ
            </h3>
          </div>
          <Link
            href="/finance"
            className="text-[10px] font-semibold text-blue-600 hover:underline"
          >
            ดูทั้งหมด
          </Link>
        </div>

        <div className="mt-2.5 space-y-2">
          {/* Budget */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Banknote className="w-3 h-3 text-emerald-500" />
              งบประมาณ (ปีงบ 2568)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold text-slate-900 dark:text-white">
              8,450,000
            </span>
            <span className="text-[10px] text-slate-400">บาท</span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">รายจ่ายสะสม</span>
            <span className="font-bold text-slate-800 dark:text-white">5,320,000 บาท</span>
          </div>

          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-emerald-600 flex items-center gap-0.5 font-semibold">
              <TrendingUp className="w-3 h-3" /> +12% จากปีก่อน
            </span>
            <span className="text-emerald-600 flex items-center gap-0.5 font-semibold">
              +8% จากเป้าหมาย
            </span>
          </div>

          {/* Sub-stats */}
          <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>ใบสั่งซื้อ <strong className="text-slate-700 dark:text-white">126</strong> รายการ</span>
            <span><strong className="text-slate-700 dark:text-white">8</strong> สัญญา</span>
            <span><strong className="text-slate-700 dark:text-white">5</strong> รายการ</span>
          </div>
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
            className="text-[10px] font-semibold text-blue-600 hover:underline"
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
            className="text-[10px] font-semibold text-blue-600 hover:underline"
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

      {/* ── Card 4: สื่อสารโรงเรียน ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-white">
              สื่อสารโรงเรียน
            </h3>
          </div>
          <Link
            href="/communication"
            className="text-[10px] font-semibold text-blue-600 hover:underline"
          >
            ดูทั้งหมด
          </Link>
        </div>

        <div className="mt-2.5 space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">ประกาศ / ข่าวสาร</span>
            <span className="font-bold text-slate-800 dark:text-white">12 เรื่อง</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Phone className="w-3 h-3 text-green-500" /> LINE OA
            </span>
            <span className="font-bold text-slate-800 dark:text-white">8,420 คน</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">แจ้งเตือนผู้ปกครอง</span>
            <span className="font-bold text-slate-800 dark:text-white">342 คน</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Mail className="w-3 h-3 text-blue-500" /> อีเมล/SMS
            </span>
            <span className="font-bold text-slate-800 dark:text-white">1,256 ข้อความ</span>
          </div>

          {/* Quick message input */}
          <div className="flex items-center gap-1.5 pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-800">
            <input
              type="text"
              placeholder="แถบส่งข้อความด่วน..."
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-600 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition shrink-0"
            >
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
