"use client";

import React, { useState } from "react";
import { Calendar, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

interface SMSAcademicCalendarCardProps {
  onViewAll?: () => void;
}

export default function SMSAcademicCalendarCard({
  onViewAll,
}: SMSAcademicCalendarCardProps) {
  const [currentMonthName, setCurrentMonthName] = useState("ตุลาคม 2569");

  // Days matrix matching the screenshot exactly
  // Row 1: 28, 29, 30 (prev), 1, 2 (today active), 3, 5
  // Row 2: 6, 7, 8, 9, 10, 11, 12
  // Row 3: 13, 14, 15, 16, 17, 18, 19
  // Row 4: 20, 21, 22, 23, 24, 25, 26
  // Row 5: 27, 28, 29, 30, 31, 1 (next), 2 (next)
  const days = [
    { num: 28, isPrev: true },
    { num: 29, isPrev: true },
    { num: 30, isPrev: true },
    { num: 1, isCurrent: true, hasEvent: "amber" },
    { num: 2, isCurrent: true, isToday: true },
    { num: 3, isCurrent: true },
    { num: 5, isCurrent: true },
    { num: 6, isCurrent: true },
    { num: 7, isCurrent: true },
    { num: 8, isCurrent: true },
    { num: 9, isCurrent: true },
    { num: 10, isCurrent: true },
    { num: 11, isCurrent: true },
    { num: 12, isCurrent: true },
    { num: 13, isCurrent: true },
    { num: 14, isCurrent: true },
    { num: 15, isCurrent: true },
    { num: 16, isCurrent: true },
    { num: 17, isCurrent: true },
    { num: 18, isCurrent: true },
    { num: 19, isCurrent: true },
    { num: 20, isCurrent: true },
    { num: 21, isCurrent: true },
    { num: 22, isCurrent: true },
    { num: 23, isCurrent: true },
    { num: 24, isCurrent: true },
    { num: 25, isCurrent: true },
    { num: 26, isCurrent: true },
    { num: 27, isCurrent: true },
    { num: 28, isCurrent: true },
    { num: 29, isCurrent: true },
    { num: 30, isCurrent: true, hasEvent: "amber" },
    { num: 31, isCurrent: true, hasEvent: "emerald" },
    { num: 1, isNext: true },
    { num: 2, isNext: true },
  ];

  const weekdays = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
      {/* Header matching media_1791947729556_c79c257e.jpg */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-50 dark:border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <h2 className="text-[15px] font-bold text-slate-800 dark:text-white">
            ปฏิทินการศึกษา
          </h2>
        </div>

        <button
          type="button"
          onClick={onViewAll}
          className="flex items-center gap-1 text-[11.5px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 cursor-pointer transition-colors"
        >
          <span>ดูปฏิทินทั้งหมด</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Month Navigator */}
      <div className="flex items-center justify-between px-2 pt-3 pb-2 text-xs">
        <button
          type="button"
          className="w-6 h-6 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="font-bold text-slate-800 dark:text-slate-100 text-[13px]">
          {currentMonthName}
        </span>
        <button
          type="button"
          className="w-6 h-6 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 cursor-pointer"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center py-1">
        {weekdays.map((d) => (
          <div
            key={d}
            className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 py-0.5"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 text-center pt-1 pb-2">
        {days.map((day, idx) => {
          return (
            <div
              key={idx}
              className="flex flex-col items-center justify-center py-1 relative"
            >
              {day.isToday ? (
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                  {day.num}
                </div>
              ) : (
                <span
                  className={`text-xs font-medium ${
                    day.isPrev || day.isNext
                      ? "text-slate-300 dark:text-slate-600"
                      : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {day.num}
                </span>
              )}

              {/* Event indicator dot */}
              {day.hasEvent && !day.isToday && (
                <span
                  className={`w-1 h-1 rounded-full mt-0.5 ${
                    day.hasEvent === "amber"
                      ? "bg-amber-400"
                      : day.hasEvent === "emerald"
                      ? "bg-emerald-500"
                      : "bg-blue-500"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
