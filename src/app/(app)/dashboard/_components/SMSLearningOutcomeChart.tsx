"use client";

import React, { useState } from "react";
import { BarChart2, ArrowRight, ChevronDown } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface SMSLearningOutcomeChartProps {
  onViewDetails?: () => void;
}

const mockChartData = [
  { month: "ม.ค.", class1: 38, class2: 24 },
  { month: "ก.พ.", class1: 58, class2: 38 },
  { month: "มี.ค.", class1: 72, class2: 68 },
  { month: "เม.ย.", class1: 89, class2: 74 },
  { month: "พ.ค.", class1: 92, class2: 82 },
];

export default function SMSLearningOutcomeChart({
  onViewDetails,
}: SMSLearningOutcomeChartProps) {
  const [selectedTerm, setSelectedTerm] = useState("ภาคเรียนที่ 1/2569");
  const [selectedClass, setSelectedClass] = useState("ทุกห้องเรียน");

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
      {/* Header matching media_1791947729556_c79c257e.jpg */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-50 dark:border-slate-800/60">
        {/* Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
            <BarChart2 className="w-4 h-4" />
          </div>
          <h2 className="text-[15px] font-bold text-slate-800 dark:text-white">
            ผลการเรียนรู้ภาพรวม
          </h2>
        </div>

        {/* Filters and Link */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Term Filter */}
          <div className="relative">
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="appearance-none bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl pl-3 pr-7 py-1 text-[11.5px] font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ภาคเรียนที่ 1/2569">ภาคเรียนที่ 1/2569</option>
              <option value="ภาคเรียนที่ 2/2568">ภาคเรียนที่ 2/2568</option>
              <option value="ภาคเรียนที่ 1/2568">ภาคเรียนที่ 1/2568</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Class Filter */}
          <div className="relative">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="appearance-none bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl pl-3 pr-7 py-1 text-[11.5px] font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ทุกห้องเรียน">ทุกห้องเรียน</option>
              <option value="ห้อง ม.3/1">ห้อง ม.3/1</option>
              <option value="ห้อง ม.3/2">ห้อง ม.3/2</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Drill-down link */}
          <button
            type="button"
            onClick={onViewDetails}
            className="flex items-center gap-1 text-[11.5px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 ml-1 cursor-pointer transition-colors"
          >
            <span>ดูรายละเอียด</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chart Legend on Top Right */}
      <div className="flex items-center justify-end gap-4 pt-3 pb-1 text-[11px] font-medium">
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
          <span>ห้อง ม.3/1</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
          <span>ห้อง ม.3/2</span>
        </div>
      </div>

      {/* Line Chart */}
      <div className="w-full h-56 pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={mockChartData}
            margin={{ top: 10, right: 15, left: -20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#E2E8F0"
              className="dark:stroke-slate-800"
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#94A3B8" }}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#94A3B8" }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-slate-900 text-white text-xs p-2.5 rounded-xl shadow-xl space-y-1">
                      <p className="font-bold border-b border-slate-800 pb-1">{label}</p>
                      {payload.map((entry, index) => (
                        <p key={`item-${index}`} className="flex items-center justify-between gap-3 text-[11px]">
                          <span style={{ color: entry.color }}>
                            {entry.name === "class1" ? "ห้อง ม.3/1" : "ห้อง ม.3/2"}:
                          </span>
                          <span className="font-bold">{entry.value}%</span>
                        </p>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="class1"
              name="class1"
              stroke="#2563EB"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#2563EB", strokeWidth: 2, stroke: "#EFF6FF" }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="class2"
              name="class2"
              stroke="#A855F7"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#A855F7", strokeWidth: 2, stroke: "#FAF5FF" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
