"use client";

import React from "react";
import Link from "next/link";
import {
  GraduationCap,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  HeartHandshake,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import type { SchoolManagementExecutiveStats } from "@/app/actions/dashboard-widgets";

export interface StudentLeaveSummaryItem {
  id: string;
  studentName: string;
  className: string;
  leaveType: string;
  date: string;
  status: "APPROVED" | "PENDING" | string;
}

interface ExecutiveStudentLeaveOverviewProps {
  studentStats?: SchoolManagementExecutiveStats["student"] | null;
  studentLeaves?: StudentLeaveSummaryItem[];
  totalSickCount?: number;
  totalPersonalCount?: number;
  onOpenAffairsView?: () => void;
}

export default function ExecutiveStudentLeaveOverview({
  studentStats,
  studentLeaves = [],
  totalSickCount,
  totalPersonalCount,
  onOpenAffairsView,
}: ExecutiveStudentLeaveOverviewProps) {
  // Use live stats from database, fallback safely to props
  const totalStudents = studentStats?.totalStudents ?? 0;
  const attendanceRate = studentStats?.attendanceToday.attendanceRate ?? 100;
  const isMorningCheckDone = studentStats?.attendanceToday.isMorningCheckCompleted ?? false;

  const todaySick =
    studentStats?.attendanceToday.sick ??
    totalSickCount ??
    studentLeaves.filter((l) => l.leaveType.includes("ป่วย") || l.leaveType === "SICK").length;

  const todayPersonal =
    studentStats?.attendanceToday.personal ??
    totalPersonalCount ??
    studentLeaves.filter((l) => l.leaveType.includes("กิจ") || l.leaveType === "PERSONAL").length;

  const todayAbsent = studentStats?.attendanceToday.absent ?? 0;
  const todayLate = studentStats?.attendanceToday.late ?? 0;
  const riskEwsCount = studentStats?.riskEwsCount ?? 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E6EEF7] dark:border-slate-800 shadow-[0_4px_16px_rgba(40,90,140,0.06)] dark:shadow-none p-4 sm:p-5 select-none flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#163A66] dark:text-white text-sm sm:text-base flex items-center gap-1.5">
                <span>ภาพรวมข้อมูลผู้เรียน (Student Affairs)</span>
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                สถิติการมาเรียน การลา และระบบเฝ้าระวังความเสี่ยง (EWS)
              </p>
            </div>
          </div>

          <Link
            href="/attendance"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
          >
            <span>จัดการเช็กแถว</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Attendance Rate Indicator */}
        <div className="mt-3.5 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              อัตราการมาเรียนเฉลี่ยวันนี้:
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
              {attendanceRate}%
            </span>
            <span className="text-[10px] text-slate-400">
              {isMorningCheckDone ? "(จากแถวเช้า)" : "(ประเมินเบื้องต้น)"}
            </span>
          </div>
        </div>

        {/* 3 Micro Stat Boxes: Sick, Personal, Absent/Late */}
        <div className="grid grid-cols-3 gap-2 my-3 text-center">
          <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
            <span className="text-[10px] text-rose-800 dark:text-rose-300 font-semibold block">
              ลาป่วย
            </span>
            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {todaySick} <span className="text-[10px] font-normal text-slate-500">คน</span>
            </div>
            <span className="text-[9px] text-rose-600 dark:text-rose-400">มีใบรับรอง</span>
          </div>

          <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
            <span className="text-[10px] text-blue-800 dark:text-blue-300 font-semibold block">
              ลากิจ
            </span>
            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {todayPersonal} <span className="text-[10px] font-normal text-slate-500">คน</span>
            </div>
            <span className="text-[9px] text-blue-600 dark:text-blue-400">ครูรับทราบ</span>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
            <span className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold block">
              สาย / ขาด
            </span>
            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {todayLate + todayAbsent} <span className="text-[10px] font-normal text-slate-500">คน</span>
            </div>
            <span className="text-[9px] text-amber-600 dark:text-amber-400">
              สาย {todayLate} ขาด {todayAbsent}
            </span>
          </div>
        </div>

        {/* EWS or Check status alert */}
        {riskEwsCount > 0 ? (
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-medium text-[11px]">
                พบนักเรียนกลุ่มเฝ้าระวังความเสี่ยง (EWS) {riskEwsCount} ราย
              </span>
            </div>
            <Link
              href="/academic"
              className="text-[10px] font-bold text-amber-700 dark:text-amber-300 underline shrink-0"
            >
              ติดตามเคส
            </Link>
          </div>
        ) : isMorningCheckDone ? (
          <div className="py-2 px-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/40 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-[11px]">
              บันทึกสถิตินักเรียนผ่านระบบเช็คแถวครบถ้วนทุกห้องเรียนแล้ว
            </span>
          </div>
        ) : (
          <div className="py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-[11px]">
              {totalStudents > 0
                ? `นักเรียนลงทะเบียน ${totalStudents.toLocaleString("th-TH")} คน — รอการสรุปยอดเช็กแถวหน้าเสาธง`
                : "ยังไม่มีข้อมูลนักเรียนที่ลงทะเบียนในระบบ"}
            </span>
          </div>
        )}
      </div>

      <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span>ฝ่ายกิจการนักเรียน & แนะแนว</span>
        <span className="text-purple-600 dark:text-purple-400 font-semibold">ซิงค์อัตโนมัติ</span>
      </div>
    </div>
  );
}
