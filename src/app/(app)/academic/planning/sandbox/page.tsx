"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  GitBranch, 
  Sparkles, 
  ArrowLeft, 
  ChevronRight, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  Zap,
  BarChart3,
  Layers,
  ArrowRight,
  ShieldCheck
} from "lucide-react";

interface ScenarioMetric {
  id: string;
  name: string;
  description: string;
  etuAverage: number;
  budgetImpact: string;
  roomUsagePercent: number;
  readinessScore: number;
  overloadedTeachers: number;
  status: "BASELINE" | "RECOMMENDED" | "DRAFT";
}

const SCENARIOS: ScenarioMetric[] = [
  {
    id: "scen-a",
    name: "Scenario A: Baseline 2569",
    description: "โครงสร้างหลักสูตรสามัญปกติ ภาคเรียนที่ 1/2569",
    etuAverage: 20.4,
    budgetImpact: "+0 ฿",
    roomUsagePercent: 82.5,
    readinessScore: 94.5,
    overloadedTeachers: 3,
    status: "BASELINE",
  },
  {
    id: "scen-b",
    name: "Scenario B: STEM & AI Special Focus",
    description: "เพิ่มรายวิชาเลือกหุ่นยนต์ AI ม.1-ม.3 (+2 คาบ) และเกลี่ยภาระงานหมวดวิทย์",
    etuAverage: 19.8,
    budgetImpact: "+45,000 ฿",
    roomUsagePercent: 88.0,
    readinessScore: 98.2,
    overloadedTeachers: 0,
    status: "RECOMMENDED",
  },
  {
    id: "scen-c",
    name: "Scenario C: Competency-Based Sandbox 2570",
    description: "ทดลองปรับหลักสูตรฐานสมรรถนะล่วงหน้าปี 2570",
    etuAverage: 21.2,
    budgetImpact: "+120,000 ฿",
    roomUsagePercent: 91.5,
    readinessScore: 89.0,
    overloadedTeachers: 5,
    status: "DRAFT",
  }
];

export default function SandboxDomainPage() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("scen-b");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-6 text-slate-900 dark:text-slate-100">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400 border-b border-slate-200 dark:border-slate-800 pb-4">
        <Link href="/academic/planning" className="hover:underline flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Academic Planning Platform
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span>Planning Sandbox Sandbox</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-amber-500" />
            ศูนย์ทดลองและเปรียบเทียบสถานการณ์ (Planning Sandbox)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ทดลองปรับเปลี่ยนโครงสร้างวิชาและภาระงาน (Scenario A vs B vs C) เพื่อเปรียบเทียบ ETU, งบประมาณ, การใช้ห้อง และ Readiness Score แบบ Git Branch ก่อน Publish
          </p>
        </div>

        <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center gap-2">
          <GitBranch className="w-4 h-4" />
          สร้าง Scenario ใหม่
        </button>
      </div>

      {/* Scenario Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {SCENARIOS.map((s) => {
          const isSelected = selectedScenarioId === s.id;
          return (
            <div 
              key={s.id}
              onClick={() => setSelectedScenarioId(s.id)}
              className={`cursor-pointer rounded-3xl p-6 border transition-all flex flex-col justify-between space-y-4 ${
                isSelected 
                  ? "bg-white dark:bg-slate-900 border-purple-500 shadow-xl ring-2 ring-purple-500/20" 
                  : "bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase ${
                    s.status === "RECOMMENDED"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : s.status === "BASELINE"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}>
                    {s.status}
                  </span>
                  {isSelected && <CheckCircle2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
                </div>

                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{s.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{s.description}</p>
              </div>

              {/* Metrics Grid */}
              <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-2 text-xs font-semibold">
                <div className="flex justify-between">
                  <span className="text-slate-500">ค่าเฉลี่ย ETU:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{s.etuAverage} ETU</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">งบประมาณสถาบัน:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{s.budgetImpact}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">อัตราการใช้ห้อง:</span>
                  <span className="font-bold text-teal-600 dark:text-teal-400">{s.roomUsagePercent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ครูภาระงานเกิน:</span>
                  <span className={`font-bold ${s.overloadedTeachers === 0 ? "text-emerald-500" : "text-amber-500"}`}>
                    {s.overloadedTeachers} คน
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-slate-700 dark:text-slate-300">Readiness Score:</span>
                  <span className="font-extrabold text-purple-600 dark:text-purple-400">{s.readinessScore}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Delta Matrix */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-500" />
          ตารางเปรียบเทียบความแตกต่าง (Delta Diff Matrix)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                <th className="p-4">มิติการเปรียบเทียบ</th>
                <th className="p-4">Scenario A (Baseline)</th>
                <th className="p-4 bg-purple-50/50 dark:bg-purple-950/20">Scenario B (Recommended)</th>
                <th className="p-4">Scenario C (Draft 2570)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              <tr>
                <td className="p-4 font-bold text-slate-800 dark:text-slate-200">จำนวนรายวิชาเปิดสอนรวม</td>
                <td className="p-4">142 รายวิชา</td>
                <td className="p-4 bg-purple-50/30 dark:bg-purple-950/10 font-bold text-purple-600">146 รายวิชา (+4)</td>
                <td className="p-4">150 รายวิชา (+8)</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-slate-800 dark:text-slate-200">การเกลี่ยภาระงานครู (ETU Fairness)</td>
                <td className="p-4 text-amber-600">กระจายไม่สม่ำเสมอ (SD 3.2)</td>
                <td className="p-4 bg-purple-50/30 dark:bg-purple-950/10 font-bold text-emerald-600">กระจายสมดุลดีเยี่ยม (SD 1.1)</td>
                <td className="p-4 text-amber-600">กระจายไม่สม่ำเสมอ (SD 4.1)</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-slate-800 dark:text-slate-200">สถานะความพร้อมสู่ Timetable Engine</td>
                <td className="p-4 text-amber-600 font-bold">94.5% (ติด Warning)</td>
                <td className="p-4 bg-purple-50/30 dark:bg-purple-950/10 font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> 98.2% (พร้อม Deploy)
                </td>
                <td className="p-4 text-rose-600 font-bold">89.0% (ยังไม่ผ่านเกณฑ์)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
