"use client";

import React, { useState, useEffect } from "react";
import { Calendar, ArrowRight } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface SMSAttendanceDonutCardProps {
  presentRate?: number;
  lateRate?: number;
  absentRate?: number;
  leaveRate?: number;
  onViewAll?: () => void;
}

export default function SMSAttendanceDonutCard({
  presentRate = 95.6,
  lateRate = 2.1,
  absentRate = 1.3,
  leaveRate = 0.9,
  onViewAll,
}: SMSAttendanceDonutCardProps) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const data = [
    { name: "มาเรียน", value: presentRate, color: "#10B981" },
    { name: "สาย", value: lateRate, color: "#F59E0B" },
    { name: "ขาด", value: absentRate, color: "#EF4444" },
    { name: "ลา", value: leaveRate, color: "#8B5CF6" },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
      {/* Header matching media_1791947729556_c79c257e.jpg */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-50 dark:border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <h2 className="text-[15px] font-bold text-slate-800 dark:text-white">
            สรุปการเข้าเรียน
          </h2>
        </div>

        <button
          type="button"
          onClick={onViewAll}
          className="flex items-center gap-1 text-[11.5px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 cursor-pointer transition-colors"
        >
          <span>ดูทั้งหมด</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body: Donut Chart on Left + Legend on Right */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3">
        {/* Donut Chart Container */}
        <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  formatter={(value: any, name: any) => [`${value}%`, name]}
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    borderColor: "#334155",
                    borderRadius: "0.75rem",
                    color: "#FFFFFF",
                    fontSize: "12px",
                  }}
                />
                <Pie
                  data={data}
                  innerRadius={52}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-36 h-36 rounded-full border-4 border-slate-100 dark:border-slate-800 animate-pulse" />
          )}

          {/* Center text inside Donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-xl font-extrabold text-slate-800 dark:text-white leading-tight">
              {presentRate}%
            </span>
            <span className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
              การเข้าเรียน
            </span>
          </div>
        </div>

        {/* Legend on Right matching media_1791947729556_c79c257e.jpg */}
        <div className="flex-1 w-full space-y-2.5 pl-2">
          {data.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  {item.name}
                </span>
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-100">
                {item.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
