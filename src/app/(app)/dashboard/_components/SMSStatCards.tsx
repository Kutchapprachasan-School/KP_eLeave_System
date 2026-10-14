"use client";

import React from "react";
import {
  Users,
  Briefcase,
  Calendar,
  ClipboardList,
  ChevronRight,
  ArrowUp,
} from "lucide-react";

interface SMSStatCardsProps {
  totalStudents?: number;
  totalStaff?: number;
  attendanceRate?: number;
  pendingTasks?: number;
  onClickCard?: (type: string) => void;
}

export default function SMSStatCards({
  totalStudents = 32,
  totalStaff = 28,
  attendanceRate = 95.6,
  pendingTasks = 8,
  onClickCard,
}: SMSStatCardsProps) {
  const cards = [
    {
      type: "students",
      title: "นักเรียนทั้งหมด",
      value: `${totalStudents.toLocaleString("th-TH")}`,
      unit: "คน",
      trendText: "+2 จากเทอมที่แล้ว",
      trendColor: "text-emerald-600 dark:text-emerald-400",
      icon: <Users className="w-6 h-6 text-blue-600" />,
      iconBg: "bg-blue-100/80 dark:bg-blue-950/50",
    },
    {
      type: "staff",
      title: "บุคลากรทั้งหมด",
      value: `${totalStaff.toLocaleString("th-TH")}`,
      unit: "คน",
      trendText: "+1 จากเทอมที่แล้ว",
      trendColor: "text-emerald-600 dark:text-emerald-400",
      icon: <Briefcase className="w-6 h-6 text-emerald-600" />,
      iconBg: "bg-emerald-100/80 dark:bg-emerald-950/50",
    },
    {
      type: "attendance",
      title: "การเข้าเรียนวันนี้",
      value: `${attendanceRate}%`,
      unit: "",
      trendText: "+1.2% จากเมื่อวาน",
      trendColor: "text-emerald-600 dark:text-emerald-400",
      icon: <Calendar className="w-6 h-6 text-amber-600" />,
      iconBg: "bg-amber-100/80 dark:bg-amber-950/50",
    },
    {
      type: "pending",
      title: "งานที่ต้องตรวจ",
      value: `${pendingTasks.toLocaleString("th-TH")}`,
      unit: "งาน",
      trendText: "+2 จากเมื่อวาน",
      trendColor: "text-rose-500 dark:text-rose-400",
      icon: <ClipboardList className="w-6 h-6 text-purple-600" />,
      iconBg: "bg-purple-100/80 dark:bg-purple-950/50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 select-none">
      {cards.map((c) => (
        <div
          key={c.type}
          onClick={() => onClickCard?.(c.type)}
          className="stat-card group relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex items-center justify-between"
        >
          {/* Left Icon Container */}
          <div
            className={`w-13 h-13 rounded-2xl ${c.iconBg} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}
          >
            {c.icon}
          </div>

          {/* Center Info */}
          <div className="flex-1 px-3.5 min-w-0">
            <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400 block truncate">
              {c.title}
            </span>

            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                {c.value}
              </span>
              {c.unit && (
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {c.unit}
                </span>
              )}
            </div>

            <div
              className={`flex items-center gap-0.5 text-[10.5px] font-semibold mt-1 ${c.trendColor}`}
            >
              <ArrowUp className="w-3 h-3 stroke-[2.5]" />
              <span>{c.trendText}</span>
            </div>
          </div>

          {/* Right Chevron */}
          <div className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      ))}
    </div>
  );
}
