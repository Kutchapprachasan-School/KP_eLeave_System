"use client";

import React, { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChevronDown, ArrowUpRight } from "lucide-react";

export default function SMSAnalyticsRow() {
  const [termSelection, setTermSelection] = useState("ภาคเรียนที่ 1/2568");
  const [daySelection, setDaySelection] = useState("วันนี้");
  const [evalYearSelection, setEvalYearSelection] = useState("ปีการศึกษา 2568");

  // Data for Card 1: GPA Trend (Grade 7 - 12 / ม.1 - ม.6)
  const gpaLevelData = [
    { grade: "ม.1", gpa: 3.1 },
    { grade: "ม.2", gpa: 3.4 },
    { grade: "ม.3", gpa: 3.3 },
    { grade: "ม.4", gpa: 3.5 },
    { grade: "ม.5", gpa: 3.7 },
    { grade: "ม.6", gpa: 3.8 },
  ];

  // Data for Card 1: GPA Distribution Donut
  const gpaDistribution = [
    { name: "4.00", value: 28, color: "#2563EB" },
    { name: "3.50 - 3.99", value: 34, color: "#38BDF8" },
    { name: "3.00 - 3.49", value: 22, color: "#FBBF24" },
    { name: "2.50 - 2.99", value: 11, color: "#FB923C" },
    { name: "ต่ำกว่า 2.50", value: 5, color: "#F43F5E" },
  ];

  // Data for Card 2: Attendance grouped bar chart by grade level
  const attendanceBarData = [
    { grade: "ม.1", present: 96, absent: 2.5, leave: 1.5 },
    { grade: "ม.2", present: 94, absent: 3.5, leave: 2.5 },
    { grade: "ม.3", present: 93, absent: 4.2, leave: 2.8 },
    { grade: "ม.4", present: 97, absent: 1.8, leave: 1.2 },
    { grade: "ม.5", present: 95, absent: 3.0, leave: 2.0 },
    { grade: "ม.6", present: 98, absent: 1.2, leave: 0.8 },
  ];

  // Data for Card 3: Personnel evaluation breakdown
  const evalScore = 87.5;
  const evalBreakdown = [
    { label: "ดีเด่น", count: 42, pct: "34.1%", color: "bg-emerald-500" },
    { label: "ดีมาก", count: 68, pct: "55.0%", color: "bg-blue-500" },
    { label: "ดี", count: 12, pct: "9.7%", color: "bg-sky-400" },
    { label: "ปานกลาง", count: 2, pct: "1.6%", color: "bg-amber-500" },
    { label: "ปรับปรุง", count: 0, pct: "0%", color: "bg-rose-500" },
  ];

  const evalGaugeData = [
    { value: evalScore, color: "#10B981" },
    { value: 100 - evalScore, color: "#E2E8F0" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 select-none">
      {/* ── CARD 1: สรุปผลการเรียน (เฉลี่ยรวมทุกระดับ) (Col 5) ── */}
      <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
              สรุปผลการเรียน (เฉลี่ยรวมทุกระดับ)
            </h3>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg hover:text-slate-800"
          >
            <span>{termSelection}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {/* Big GPA Metric */}
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            3.52
          </span>
          <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" />
            <span>▲ +0.18 จากภาคเรียนก่อน</span>
          </span>
        </div>

        {/* Charts Split Layout: Line chart (left) & Donut (right) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center mt-2">
          {/* Sub-chart Left: Line Chart across grades */}
          <div className="h-36 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={gpaLevelData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="grade" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis domain={[2.0, 4.0]} tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v: any) => [`GPA ${v}`, "เกรดเฉลี่ย"]}
                  contentStyle={{ backgroundColor: "#0f172a", color: "#fff", borderRadius: "8px", fontSize: "11px" }}
                />
                <Line
                  type="monotone"
                  dataKey="gpa"
                  stroke="#0284C7"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#0284C7", stroke: "#fff", strokeWidth: 1.5 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Sub-chart Right: Donut Chart with Breakdown Legend */}
          <div className="flex items-center gap-2">
            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gpaDistribution}
                    innerRadius={28}
                    outerRadius={42}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {gpaDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center pointer-events-none">
                <span className="text-[10px] font-bold text-slate-800 dark:text-white block leading-tight">
                  1,248
                </span>
                <span className="text-[8px] text-slate-400 block">คน</span>
              </div>
            </div>

            {/* Legend list */}
            <div className="space-y-1 text-[10px]">
              {gpaDistribution.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 dark:text-slate-400 font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 2: สถิติการเข้าเรียน (รายวัน) (Col 4) ── */}
      <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
            สถิติการเข้าเรียน
          </h3>
          <button
            type="button"
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg hover:text-slate-800"
          >
            <span>{daySelection}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-3 text-[10px] mt-2">
          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span>มาเรียน</span>
          </span>
          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            <span>ขาดเรียน</span>
          </span>
          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>ลา</span>
          </span>
        </div>

        {/* Grouped Bar Chart */}
        <div className="h-44 w-full mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={attendanceBarData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
              <XAxis dataKey="grade" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: any) => [`${v}%`]} />
              <Bar dataKey="present" fill="#2563EB" radius={[2, 2, 0, 0]} />
              <Bar dataKey="absent" fill="#FB923C" radius={[2, 2, 0, 0]} />
              <Bar dataKey="leave" fill="#8B5CF6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── CARD 3: ผลประเมินบุคลากร (Col 3) ── */}
      <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
            ผลประเมินบุคลากร
          </h3>
          <button
            type="button"
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg hover:text-slate-800"
          >
            <span>{evalYearSelection}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {/* Circular Donut Gauge & Legend */}
        <div className="grid grid-cols-2 items-center gap-3 my-auto pt-2">
          {/* Gauge Donut */}
          <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={evalGaugeData}
                  cx="50%"
                  cy="50%"
                  startAngle={90}
                  endAngle={-270}
                  innerRadius={36}
                  outerRadius={50}
                  stroke="none"
                  dataKey="value"
                >
                  <Cell fill="#10B981" />
                  <Cell fill="#E2E8F0" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center pointer-events-none">
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white block leading-tight">
                {evalScore}%
              </span>
              <span className="text-[9px] text-slate-400 font-semibold block">คะแนนเฉลี่ย</span>
            </div>
          </div>

          {/* Breakdown List */}
          <div className="space-y-1.5 text-[10.5px]">
            {evalBreakdown.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${item.color}`} />
                  <span className="text-slate-600 dark:text-slate-300">{item.label}</span>
                </div>
                <div className="text-slate-500 dark:text-slate-400 font-medium">
                  <span className="font-bold text-slate-800 dark:text-white">{item.count}</span> คน ({item.pct})
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
