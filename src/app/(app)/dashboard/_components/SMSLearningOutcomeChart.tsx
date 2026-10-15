"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BarChart2, ArrowRight, ChevronDown, Loader2 } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  getLearningOutcomesAction,
  LearningOutcomeData,
} from "@/app/actions/dashboard-widgets";

interface SMSLearningOutcomeChartProps {
  onViewDetails?: () => void;
}

export default function SMSLearningOutcomeChart({
  onViewDetails,
}: SMSLearningOutcomeChartProps) {
  const router = useRouter();
  const now = new Date();
  const currentBudgetY = now.getFullYear() + 543;
  const defaultTerm = `ภาคเรียนที่ ${now.getMonth() + 1 >= 5 && now.getMonth() + 1 <= 10 ? 1 : 2}/${currentBudgetY}`;

  const [selectedTerm, setSelectedTerm] = useState(defaultTerm);
  const [selectedClass, setSelectedClass] = useState("ทุกห้องเรียน");
  const [loading, setLoading] = useState(false);
  const [outcomeData, setOutcomeData] = useState<LearningOutcomeData | null>(null);

  useEffect(() => {
    let isCancelled = false;
    async function fetchData() {
      setLoading(true);
      try {
        const match = selectedTerm.match(/ภาคเรียนที่\s*(\d+)\/(\d+)/);
        const term = match ? parseInt(match[1], 10) : 1;
        const year = match ? parseInt(match[2], 10) : currentBudgetY;

        const res = await getLearningOutcomesAction(year, term, selectedClass);
        if (!isCancelled) {
          setOutcomeData(res);
        }
      } catch (err) {
        console.error("Failed to load learning outcomes:", err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }
    fetchData();
    return () => {
      isCancelled = true;
    };
  }, [selectedTerm, selectedClass, currentBudgetY]);

  const handleDetailsClick = () => {
    if (onViewDetails) {
      onViewDetails();
    } else {
      router.push("/academic/exam");
    }
  };

  const chartData = outcomeData?.chartData || [];
  const series = outcomeData?.series || [];
  const classrooms = outcomeData?.classrooms || [];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-50 dark:border-slate-800/60">
        {/* Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-slate-800 dark:text-white">
              ผลการเรียนรู้ภาพรวม
            </h2>
            <p className="text-[10px] text-slate-400">
              {outcomeData && outcomeData.totalExamsCount > 0
                ? `ข้อมูลจริงจากการประเมิน (${outcomeData.totalExamsCount} รายการ)`
                : "ซิงค์จากระบบจัดการชั้นเรียนและตรวจข้อสอบ"}
            </p>
          </div>
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
              <option value={`ภาคเรียนที่ 1/${currentBudgetY}`}>ภาคเรียนที่ 1/{currentBudgetY}</option>
              <option value={`ภาคเรียนที่ 2/${currentBudgetY - 1}`}>ภาคเรียนที่ 2/{currentBudgetY - 1}</option>
              <option value={`ภาคเรียนที่ 1/${currentBudgetY - 1}`}>ภาคเรียนที่ 1/{currentBudgetY - 1}</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Class Filter (Real Classrooms from DB) */}
          <div className="relative">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="appearance-none bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl pl-3 pr-7 py-1 text-[11.5px] font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ทุกห้องเรียน">ทุกห้องเรียน</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Drill-down link */}
          <button
            type="button"
            onClick={handleDetailsClick}
            className="flex items-center gap-1 text-[11.5px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 ml-1 cursor-pointer transition-colors"
          >
            <span>ดูรายละเอียด</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chart Legend on Top Right */}
      <div className="flex items-center justify-end gap-4 pt-3 pb-1 text-[11px] font-medium min-h-[26px]">
        {loading ? (
          <span className="flex items-center gap-1 text-slate-400 text-xs">
            <Loader2 className="w-3 h-3 animate-spin" /> กำลังโหลด...
          </span>
        ) : (
          series.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: s.color }} />
              <span>{s.name}</span>
            </div>
          ))
        )}
      </div>

      {/* Line Chart */}
      <div className="w-full h-56 pt-1 relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
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
                            {entry.name}:
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
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2.5}
                dot={{ r: 4, fill: s.color, strokeWidth: 2, stroke: "#EFF6FF" }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

