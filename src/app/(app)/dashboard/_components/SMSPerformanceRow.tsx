"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { ChevronDown, ArrowRight, User } from "lucide-react";

export default function SMSPerformanceRow() {
  const [levelSelection, setLevelSelection] = useState("ม.ปลาย");

  // Personnel Top Evaluation Data
  const personnelList = [
    {
      id: "1",
      name: "นางสาวกมลวรรณ ศรีสุข",
      position: "ครู คศ.2",
      score: 92.5,
      status: "ดีเด่น",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      avatarBg: "bg-purple-100 text-purple-700",
    },
    {
      id: "2",
      name: "นายชเนศ พวงศรี",
      position: "ครู คศ.1",
      score: 88.0,
      status: "ดีมาก",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      avatarBg: "bg-blue-100 text-blue-700",
    },
    {
      id: "3",
      name: "นางสาวปิยะธิดา แก้วใส",
      position: "ครู คศ.1",
      score: 85.6,
      status: "ดีมาก",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      avatarBg: "bg-pink-100 text-pink-700",
    },
    {
      id: "4",
      name: "นายสุรชัย วงค์ษา",
      position: "ครู คศ.2",
      score: 78.3,
      status: "ดี",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      avatarBg: "bg-teal-100 text-teal-700",
    },
    {
      id: "5",
      name: "นางสาวจิราพร โพธิน",
      position: "พนักงานราชการ",
      score: 72.1,
      status: "ปานกลาง",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      avatarBg: "bg-amber-100 text-amber-700",
    },
  ];

  // Subject Achievement Progress Bars
  const subjectAchievements = [
    { name: "ภาษาไทย", pct: 86.2, color: "bg-sky-500" },
    { name: "คณิตศาสตร์", pct: 78.4, color: "bg-blue-600" },
    { name: "วิทยาศาสตร์", pct: 82.7, color: "bg-cyan-500" },
    { name: "สังคมศึกษา", pct: 80.1, color: "bg-gradient-to-r from-amber-400 to-orange-500" },
    { name: "ภาษาอังกฤษ", pct: 88.6, color: "bg-blue-500" },
    { name: "สุขศึกษา", pct: 95.2, color: "bg-teal-500" },
    { name: "ศิลปะ", pct: 90.3, color: "bg-purple-500" },
    { name: "การงานอาชีพ", pct: 87.5, color: "bg-indigo-600" },
  ];

  // Student Status Donut Data (1,138 students baseline)
  const studentStatusData = [
    { name: "ปกติ", count: 1078, pct: 94.7, color: "#2563EB" },
    { name: "เสี่ยง", count: 42, pct: 3.7, color: "#FBBF24" },
    { name: "ต้องติดตาม", count: 18, pct: 1.6, color: "#F43F5E" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 select-none">
      {/* ── CARD 1: การประเมินบุคลากร (ล่าสุด) (Col 4) ── */}
      <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
            การประเมินบุคลากร (ล่าสุด)
          </h3>
          <Link
            href="/academic/supervision"
            className="text-[11px] font-semibold text-blue-600 hover:underline"
          >
            ดูทั้งหมด
          </Link>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 text-[10px] border-b border-slate-100 dark:border-slate-800">
                <th className="pb-2 font-medium">ชื่อ - สกุล</th>
                <th className="pb-2 font-medium">ตำแหน่ง</th>
                <th className="pb-2 font-medium text-center">คะแนน</th>
                <th className="pb-2 font-medium text-right">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {personnelList.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${p.avatarBg}`}
                      >
                        {p.name.charAt(p.name.indexOf(" ") + 1) || "ค"}
                      </div>
                      <span className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[110px] text-[11px]">
                        {p.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 text-[10.5px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                    {p.position}
                  </td>
                  <td className="py-2.5 text-center font-bold text-slate-800 dark:text-white text-[11px]">
                    {p.score}
                  </td>
                  <td className="py-2.5 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${p.badgeColor}`}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CARD 2: ผลสัมฤทธิ์ทางการเรียน (แยกตามกลุ่มสาระ) (Col 5) ── */}
      <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
            ผลสัมฤทธิ์ทางการเรียน (แยกตามกลุ่มสาระ)
          </h3>
          <button
            type="button"
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg hover:text-slate-800"
          >
            <span>{levelSelection}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {/* 8 Horizontal Progress Bars */}
        <div className="space-y-2 mt-3 text-xs">
          {subjectAchievements.map((subj) => (
            <div key={subj.name} className="flex items-center gap-3">
              <span className="w-20 text-[11px] font-medium text-slate-600 dark:text-slate-300 shrink-0 truncate">
                {subj.name}
              </span>
              <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${subj.color}`}
                  style={{ width: `${subj.pct}%` }}
                />
              </div>
              <span className="w-10 text-right text-[10.5px] font-bold text-slate-700 dark:text-slate-300 shrink-0">
                {subj.pct}%
              </span>
            </div>
          ))}
        </div>

        {/* Bottom scale ticks (0%, 25%, 50%, 75%, 100%) */}
        <div className="flex items-center justify-between text-[9px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 pl-24 pr-10">
          <span>0</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>

      {/* ── CARD 3: สถิตินักเรียน (Col 3) ── */}
      <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
        <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
            สถิตินักเรียน
          </h3>
        </div>

        {/* Donut Chart */}
        <div className="relative w-36 h-36 mx-auto my-2 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={studentStatusData}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={62}
                paddingAngle={3}
                dataKey="count"
              >
                {studentStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute text-center pointer-events-none">
            <span className="text-lg font-black text-slate-900 dark:text-white block leading-tight">
              {studentStatusData.reduce((acc, curr) => acc + curr.count, 0).toLocaleString("th-TH")}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block">คน</span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-1.5 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
          {studentStatusData.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 dark:text-slate-300 font-medium">{item.name}</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="font-bold text-slate-800 dark:text-white">{item.count.toLocaleString("th-TH")} คน</span>
                <span className="text-[10px] text-slate-400 w-10 text-right">{item.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
