"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  GitMerge, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ArrowLeft, 
  CheckCircle2, 
  UserCheck, 
  Save, 
  ShieldCheck
} from "lucide-react";

interface WorkflowStage {
  order: number;
  name: string;
  role: string;
  isMandatory: boolean;
}

export default function WorkflowConfigDomainPage() {
  const [stages, setStages] = useState<WorkflowStage[]>([
    { order: 1, name: "ตรวจสอบระดับกลุ่มสาระการเรียนรู้", role: "HEAD_OF_DEPT", isMandatory: true },
    { order: 2, name: "พิจารณาระดับฝ่ายบริหารงานวิชาการ", role: "ACADEMIC_DIRECTOR", isMandatory: true },
    { order: 3, name: "อนุมัติขั้นสุดท้ายโดยผู้อำนวยการโรงเรียน", role: "SCHOOL_DIRECTOR", isMandatory: true },
  ]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-6 text-slate-900 dark:text-slate-100">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400 border-b border-slate-200 dark:border-slate-800 pb-4">
        <Link href="/academic/planning" className="hover:underline flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Academic Planning Platform
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span>Configurable Approval Workflow</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <GitMerge className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            ตั้งค่าลำดับขั้นตอนการอนุมัติ (Configurable Approval Workflow)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ปรับแต่งลำดับขั้น ผู้รับผิดชอบ (Roles) และเงื่อนไขการอนุมัติหลักสูตรตามโครงสร้างองค์กรของโรงเรียน
          </p>
        </div>

        <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center gap-2">
          <Save className="w-4 h-4" />
          บันทึกโครงสร้าง Workflow
        </button>
      </div>

      {/* Workflow Steps Builder */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-purple-600" />
            ขั้นตอนการอนุมัติหลักสูตรสถานศึกษา (Active Workflow)
          </h3>

          <button 
            onClick={() => {
              setStages([...stages, { order: stages.length + 1, name: `ขั้นตอนที่ ${stages.length + 1}`, role: "ACADEMIC_COMMITTEE", isMandatory: false }]);
            }}
            className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 hover:bg-purple-100 rounded-xl font-bold text-xs transition flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            เพิ่มขั้นตอนอนุมัติ
          </button>
        </div>

        <div className="space-y-4">
          {stages.map((st, idx) => (
            <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 gap-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-purple-600 text-white font-extrabold font-mono text-xs flex items-center justify-center shrink-0">
                  {st.order}
                </span>
                <div className="space-y-1">
                  <input 
                    type="text" 
                    value={st.name} 
                    onChange={e => {
                      const val = e.target.value;
                      setStages(prev => prev.map((s, i) => i === idx ? { ...s, name: val } : s));
                    }}
                    className="font-bold text-xs bg-white dark:bg-slate-900 px-3 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <select 
                  value={st.role} 
                  onChange={e => {
                    const val = e.target.value;
                    setStages(prev => prev.map((s, i) => i === idx ? { ...s, role: val } : s));
                  }}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                >
                  <option value="HEAD_OF_DEPT">หัวหน้ากลุ่มสาระฯ (HEAD_OF_DEPT)</option>
                  <option value="ACADEMIC_DIRECTOR">รองวิชาการ (ACADEMIC_DIRECTOR)</option>
                  <option value="ACADEMIC_COMMITTEE">กรรมการวิชาการ (ACADEMIC_COMMITTEE)</option>
                  <option value="SCHOOL_DIRECTOR">ผู้อำนวยการโรงเรียน (SCHOOL_DIRECTOR)</option>
                </select>

                {stages.length > 1 && (
                  <button 
                    onClick={() => setStages(stages.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })))}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
