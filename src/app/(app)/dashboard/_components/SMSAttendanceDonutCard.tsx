"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, ArrowRight, Clock } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface SMSAttendanceDonutCardProps {
  presentRate?: number;
  lateRate?: number;
  absentRate?: number;
  leaveRate?: number;
  recordedCount?: number;
  onViewAll?: () => void;
}

export default function SMSAttendanceDonutCard({
  presentRate = 0,
  lateRate = 0,
  absentRate = 0,
  leaveRate = 0,
  recordedCount = 0,
  onViewAll,
}: SMSAttendanceDonutCardProps) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const hasRecordedData =
    recordedCount > 0 ||
    presentRate > 0 ||
    lateRate > 0 ||
    absentRate > 0 ||
    leaveRate > 0;

  const data = hasRecordedData
    ? [
        { name: "มาเรียน", value: presentRate, color: "#10B981" },
        { name: "สาย", value: lateRate, color: "#F59E0B" },
        { name: "ขาด", value: absentRate, color: "#EF4444" },
        { name: "ลา", value: leaveRate, color: "#8B5CF6" },
      ]
    : [{ name: "รอสรุปยอด", value: 100, color: "#CBD5E1" }];

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

        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="flex items-center gap-1 text-[11.5px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 cursor-pointer transition-colors"
          >
            <span>ดูทั้งหมด</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <Link
            href="/attendance"
            className="flex items-center gap-1 text-[11.5px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 cursor-pointer transition-colors"
          >
            <span>ดูทั้งหมด</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Body: Donut Chart on Left + Legend on Right */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3">
        {/* Donut Chart Container */}
        <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                {hasRecordedData && (
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
                )}
                <Pie
                  data={data}
                  innerRadius={52}
                  outerRadius={70}
                  paddingAngle={hasRecordedData ? 3 : 0}
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
            <span className="text-xl font-extrabold text-slate-800 dark:text-white leading-tight tabular-nums">
              {hasRecordedData ? `${presentRate}%` : "-"}
            </span>
            <span className="text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
              {hasRecordedData ? "การเข้าเรียน" : "รอสรุปยอด"}
            </span>
          </div>
        </div>

        {/* Legend on Right matching media_1791947729556_c79c257e.jpg */}
        <div className="flex-1 w-full space-y-2.5 pl-2">
          {hasRecordedData ? (
            data.map((item) => (
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
            ))
          ) : (
            <div className="space-y-2 py-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>ยังไม่มีการสรุปยอดเช็กแถวเช้าวันนี้</span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                ข้อมูลจะคำนวณและแสดงผลอัตโนมัติเมื่อครูประจำชั้นหรือผู้รับผิดชอบบันทึกการเช็กชื่อ
              </p>
              <Link
                href="/attendance"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline pt-0.5"
              >
                <span>ไปยังระบบเช็กแถว</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
