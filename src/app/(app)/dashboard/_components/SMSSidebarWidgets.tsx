"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Megaphone,
  Trophy,
  ClipboardList,
  PenLine,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  ArrowUpRight,
  AlertTriangle,
  Eye,
  ArrowRight,
} from "lucide-react";

// ── Widget 1: ข่าวประชาสัมพันธ์ ──
function NewsWidget() {
  const newsItems = [
    {
      icon: <Megaphone className="w-3.5 h-3.5 text-blue-600" />,
      iconBg: "bg-blue-50 dark:bg-blue-950/40",
      title: "ประกาศเปิดภาคเรียนที่ 1/2568",
      date: "25 ส.ค. 2568",
    },
    {
      icon: <Trophy className="w-3.5 h-3.5 text-amber-600" />,
      iconBg: "bg-amber-50 dark:bg-amber-950/40",
      title: "กิจกรรมวันแม่แห่งชาติ",
      date: "12 ส.ค. 2568",
    },
    {
      icon: <ClipboardList className="w-3.5 h-3.5 text-emerald-600" />,
      iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
      title: "ส่งข้อสอบระบบสินทรัพย์มีเดิมทรัพย์สาว",
      date: "10 ส.ค. 2568",
    },
    {
      icon: <PenLine className="w-3.5 h-3.5 text-purple-600" />,
      iconBg: "bg-purple-50 dark:bg-purple-950/40",
      title: "แจ้งกำหนดการสอบนักเรียน ม.1 และ ม.4",
      date: "5 ส.ค. 2568",
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-xs font-bold text-slate-800 dark:text-white">
          ข่าวประชาสัมพันธ์
        </h3>
        <Link
          href="/news"
          className="text-[10px] font-semibold text-blue-600 hover:underline"
        >
          ดูทั้งหมด
        </Link>
      </div>

      <div className="mt-2.5 space-y-2.5">
        {newsItems.map((item, i) => (
          <div key={i} className="flex items-start gap-2.5 group cursor-pointer">
            <div className={`w-7 h-7 rounded-lg ${item.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
              {item.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 transition truncate leading-tight">
                {item.title}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">{item.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Widget 2: ปฏิทินกิจกรรม ──
function CalendarWidget() {
  const [currentMonth] = useState("สิงหาคม 2568");
  const weekdays = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
  const today = 12;

  // August 2568 starts on Friday (index 5)
  const startDay = 5;
  const daysInMonth = 31;
  const eventDays = new Set([12, 25]);

  // Build calendar grid
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to fill last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-xs font-bold text-slate-800 dark:text-white">
          ปฏิทินกิจกรรม
        </h3>
        <Link
          href="/calendar"
          className="text-[10px] font-semibold text-blue-600 hover:underline"
        >
          ดูทั้งหมด
        </Link>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mt-2.5 mb-2">
        <button className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] font-bold text-slate-700 dark:text-white">
          {currentMonth}
        </span>
        <button className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
        {weekdays.map((d) => (
          <span key={d} className="text-[9px] font-semibold text-slate-400 py-0.5">
            {d}
          </span>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {cells.map((day, i) => (
          <div
            key={i}
            className={`relative py-1 text-[10px] font-medium rounded-lg transition ${
              day === null
                ? ""
                : day === today
                  ? "bg-blue-600 text-white font-bold shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            }`}
          >
            {day ?? ""}
            {day && eventDays.has(day) && day !== today && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Widget 3: AI ผู้ช่วยผู้บริหาร ──
function AIAssistantWidget() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-800 dark:text-white">
            AI ผู้ช่วยผู้บริหาร
          </h3>
          <p className="text-[10px] text-slate-400">กำลังวิเคราะห์...</p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {/* Summary Header */}
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
            สรุปภาพรวมการเข้าเรียนเดือนสิงหาคม 2568
          </span>
        </div>

        {/* Bullet Points */}
        <ul className="space-y-1.5 text-[10.5px] text-slate-600 dark:text-slate-300 pl-1">
          <li className="flex items-start gap-1.5">
            <span className="text-slate-400 mt-0.5">•</span>
            <span>
              อัตราการมาเรียนเฉลี่ย{" "}
              <strong className="text-slate-800 dark:text-white">95.6%</strong>{" "}
              <span className="text-emerald-600 font-semibold">(↑ 2.3% จากเดือนก่อน)</span>
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-slate-400 mt-0.5">•</span>
            <span>
              นักเรียนขาดเรียน{" "}
              <strong className="text-slate-800 dark:text-white">42 คน</strong>{" "}
              <span className="text-slate-400">(0.4%)</span>
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-slate-400 mt-0.5">•</span>
            <span>
              นักเรียนมาสาย{" "}
              <strong className="text-slate-800 dark:text-white">13 คน</strong>{" "}
              <span className="text-slate-400">(1.4%)</span>
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-amber-500 mt-0.5">
              <AlertTriangle className="w-3 h-3" />
            </span>
            <span>
              นักเรียนที่ต้องเฝ้าระวังพิเศษ{" "}
              <strong className="text-rose-600 dark:text-rose-400">6 คน</strong>
            </span>
          </li>
        </ul>

        {/* CTA Button */}
        <Link
          href="/reports"
          className="flex items-center justify-center gap-1.5 w-full px-3 py-2 mt-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 text-[10.5px] font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition border border-blue-200/60 dark:border-blue-800/60"
        >
          <Eye className="w-3 h-3" />
          ดูรายละเอียดเพิ่มเติม
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

// ── Main Sidebar Widgets Container ──
export default function SMSSidebarWidgets() {
  return (
    <div className="space-y-3.5 sticky top-4">
      <NewsWidget />
      <CalendarWidget />
      <AIAssistantWidget />
    </div>
  );
}
