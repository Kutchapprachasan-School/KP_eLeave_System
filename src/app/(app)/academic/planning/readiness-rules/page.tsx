"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Sliders, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ArrowLeft, 
  Plus, 
  Save, 
  ToggleLeft, 
  ToggleRight,
  HelpCircle
} from "lucide-react";

interface IndicatorItem {
  id: string;
  code: string;
  name: string;
  weight: number;
  enabled: boolean;
  expression: string;
  description: string;
}

const INITIAL_INDICATORS: IndicatorItem[] = [
  { id: "r1", code: "RULE_OFFERING_COVERAGE", name: "ความครอบคลุมการเปิดรายวิชาทุกห้องเรียน", weight: 25.0, enabled: true, expression: "offeringPercent >= 100", description: "ต้องเปิดรายวิชาบังคับตามโครงสร้างหลักสูตรครบทุกห้องเรียน ม.1 - ม.6" },
  { id: "r2", code: "RULE_TEACHER_ASSIGNMENT", name: "อัตราการระบุตัวครูผู้สอนประจำกลุ่มเรียน", weight: 30.0, enabled: true, expression: "teacherAssignedPercent >= 95", description: "ต้องมีครูผู้สอนรับผิดชอบในแต่ละ SubjectOffering ไม่ต่ำกว่า 95%" },
  { id: "r3", code: "RULE_ETU_WORKLOAD_CAP", name: "การปฏิบัติตามเกณฑ์ภาระงาน ETU รายบุคคล", weight: 25.0, enabled: true, expression: "overloadedTeachersCount == 0", description: "ไม่มีครูผู้สอนที่มีภาระงานเกินเกณฑ์ Policy Max ETU" },
  { id: "r4", code: "RULE_RESOURCE_CAPACITY", name: "ความพอเพียงของห้องแล็บและทรัพยากร", weight: 20.0, enabled: true, expression: "resourceConflictCount == 0", description: "ไม่มีข้อขัดแย้งในการใช้ห้องปฏิบัติการและทรัพยากรส่วนกลาง" },
];

export default function ReadinessRulesDomainPage() {
  const [indicators, setIndicators] = useState<IndicatorItem[]>(INITIAL_INDICATORS);

  const totalWeight = indicators.filter(i => i.enabled).reduce((sum, i) => sum + i.weight, 0);

  const toggleIndicator = (id: string) => {
    setIndicators(prev => prev.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-6 text-slate-900 dark:text-slate-100">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400 border-b border-slate-200 dark:border-slate-800 pb-4">
        <Link href="/academic/planning" className="hover:underline flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Academic Planning Platform
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span>Data-Driven Readiness Indicators</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            กำหนดกฎและค่าน้ำหนักความพร้อม (Data-Driven Readiness Rules)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ปรับเปลี่ยนกฎ เกณฑ์ และค่าน้ำหนัก (%) สำหรับประมวลผล Readiness Gate ไดนามิกจากฐานข้อมูล (ไม่ใช่การแก้โค้ด)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center gap-2">
            <Save className="w-4 h-4" />
            บันทึกกฎและค่าน้ำหนัก
          </button>
        </div>
      </div>

      {/* Weight Summary Banner */}
      <div className={`rounded-3xl p-6 border flex items-center justify-between transition ${
        Math.abs(totalWeight - 100.0) < 0.01 
          ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50" 
          : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50"
      }`}>
        <div className="flex items-center gap-3">
          {Math.abs(totalWeight - 100.0) < 0.01 ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
          )}
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
              {Math.abs(totalWeight - 100.0) < 0.01 
                ? "ค่าน้ำหนักรวมครบ 100.0% สมบูรณ์" 
                : `ค่าน้ำหนักรวมปัจจุบันอยู่ที่ ${totalWeight.toFixed(1)}% (โปรดปรับแต่งให้ครบ 100.0%)`}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Readiness Engine จะดึงกฎที่เปิดใช้งาน (Enabled) มาคำนวณคะแนนความพร้อมก่อนส่งต่อ Timetable Engine
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">{totalWeight.toFixed(1)}%</span>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {indicators.map(rule => (
          <div key={rule.id} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-extrabold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded-lg">
                  {rule.code}
                </span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">{rule.name}</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{rule.description}</p>
              <div className="font-mono text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-100 dark:border-slate-800 w-fit">
                DSL Expression: <span className="text-indigo-600 dark:text-indigo-400">{rule.expression}</span>
              </div>
            </div>

            <div className="flex items-center gap-6 border-t md:border-t-0 border-slate-100 dark:border-slate-800 pt-3 md:pt-0">
              <div className="text-center">
                <span className="text-[11px] text-slate-400 font-semibold block">ค่าน้ำหนัก (%)</span>
                <input 
                  type="number" 
                  value={rule.weight} 
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 0;
                    setIndicators(prev => prev.map(i => i.id === rule.id ? { ...i, weight: val } : i));
                  }}
                  className="w-20 text-center font-mono font-extrabold text-sm py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 mt-1"
                />
              </div>

              <div className="text-center">
                <span className="text-[11px] text-slate-400 font-semibold block mb-1">สถานะ</span>
                <button 
                  onClick={() => toggleIndicator(rule.id)}
                  className="transition"
                >
                  {rule.enabled ? (
                    <ToggleRight className="w-8 h-8 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-400" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
