"use client";

import React from "react";
import { Users, UserCheck, CalendarCheck, FileClock, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface SMSStatCardsProps {
  totalStudents?: number;
  totalStaff?: number;
  attendanceRate?: number;
  pendingTasks?: number;
  onClickCard?: (type: string) => void;
}

export default function SMSStatCards({
  totalStudents = 1248,
  totalStaff = 124,
  attendanceRate = 95.6,
  pendingTasks = 28,
  onClickCard,
}: SMSStatCardsProps) {
  const cards = [
    {
      type: "students",
      title: "นักเรียนทั้งหมด",
      value: totalStudents.toLocaleString("th-TH"),
      unit: "คน",
      trendText: "+12 จากเดือนที่แล้ว",
      isPositive: true,
      color: "blue",
      icon: <Users className="w-6 h-6 text-white" />,
      iconBg: "bg-blue-600",
      watermarkIcon: <Users className="w-16 h-16 text-blue-500/10 absolute -right-2 -bottom-2" />,
    },
    {
      type: "staff",
      title: "บุคลากรทั้งหมด",
      value: totalStaff.toLocaleString("th-TH"),
      unit: "คน",
      trendText: "+2 จากเดือนที่แล้ว",
      isPositive: true,
      color: "purple",
      icon: <UserCheck className="w-6 h-6 text-white" />,
      iconBg: "bg-purple-600",
      watermarkIcon: <UserCheck className="w-16 h-16 text-purple-500/10 absolute -right-2 -bottom-2" />,
    },
    {
      type: "attendance",
      title: "การเข้าเรียนวันนี้",
      value: `${attendanceRate}%`,
      unit: "",
      trendText: "+2.3% จากเมื่อวาน",
      isPositive: true,
      color: "emerald",
      icon: <CalendarCheck className="w-6 h-6 text-white" />,
      iconBg: "bg-emerald-500",
      watermarkIcon: <CalendarCheck className="w-16 h-16 text-emerald-500/10 absolute -right-2 -bottom-2" />,
    },
    {
      type: "pending",
      title: "งานรอดำเนินการ",
      value: pendingTasks.toLocaleString("th-TH"),
      unit: "รายการ",
      trendText: "-15% จากสัปดาห์ที่แล้ว",
      isPositive: false,
      color: "amber",
      icon: <FileClock className="w-6 h-6 text-white" />,
      iconBg: "bg-amber-500",
      watermarkIcon: <FileClock className="w-16 h-16 text-amber-500/10 absolute -right-2 -bottom-2" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 select-none">
      {cards.map((c) => (
        <div
          key={c.type}
          onClick={() => onClickCard?.(c.type)}
          className="stat-card relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-200 cursor-pointer flex items-center justify-between"
        >
          {/* Main Info */}
          <div className="space-y-1 relative z-10">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              {c.title}
            </span>

            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {c.value}
              </span>
              {c.unit && (
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                  {c.unit}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-[11px] font-semibold pt-1">
              {c.isPositive ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>▲ {c.trendText}</span>
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>▼ {c.trendText}</span>
                </span>
              )}
            </div>
          </div>

          {/* Icon Badge */}
          <div
            className={`w-12 h-12 rounded-2xl ${c.iconBg} flex items-center justify-center shadow-sm shrink-0 relative z-10`}
          >
            {c.icon}
          </div>

          {/* Watermark in background */}
          {c.watermarkIcon}
        </div>
      ))}
    </div>
  );
}
