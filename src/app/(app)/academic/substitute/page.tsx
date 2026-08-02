"use client";

import React, { useState } from "react";
import { 
  ArrowRightLeft, 
  Sparkles, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  Calendar,
  Clock,
  Building2,
  FileSpreadsheet
} from "lucide-react";
import { RecommendationService } from "@/lib/services/recommendationService";
import { SubstituteWorkflowService } from "@/lib/services/substituteWorkflowService";

const MOCK_TEACHERS = [
  { id: "t1", name: "ครูสมชาย สายวิทย์", departmentId: "DEP-SCI", subjectCode: "ว23101", maxWeekly: 20 },
  { id: "t2", name: "ครูสมหญิง คณิตศาสตร์", departmentId: "DEP-MATH", subjectCode: "ค23101", maxWeekly: 22 },
  { id: "t3", name: "ครูวิชัย ภาษาไทย", departmentId: "DEP-THAI", subjectCode: "ท23101", maxWeekly: 18 },
  { id: "t4", name: "ครูนภา ภาษาต่างประเทศ", departmentId: "DEP-ENG", subjectCode: "อ23101", maxWeekly: 20 },
  { id: "t5", name: "ครูเดชา สังคมศึกษา", departmentId: "DEP-SOC", subjectCode: "ส23101", maxWeekly: 20 }
];

export default function SubstituteTeachingPage() {
  const [selectedLeaveTeacher, setSelectedLeaveTeacher] = useState("t1");
  const [substituteDate, setSubstituteDate] = useState("2026-08-03");
  const [substitutePeriod, setSubstitutePeriod] = useState(1);
  const [assignedLog, setAssignedLog] = useState<any[]>([]);

  // Calculate Recommendations using AI Engine
  const recService = new RecommendationService();
  const candidates = recService.rankCandidates(MOCK_TEACHERS, {
    subjectCode: "ว23101",
    departmentId: "DEP-SCI"
  });

  const handleAssignSubstitute = (candidateId: string, candidateName: string) => {
    const wfService = new SubstituteWorkflowService();
    const wf = wfService.assignSubstitute("req-001", "s1", substituteDate, candidateId, "วิชาการโรงเรียน");
    setAssignedLog(prev => [{ ...wf, candidateName, subject: "ว23101 วิทยาศาสตร์ 5" }, ...prev]);
    alert(`ส่งการแจ้งเตือน LINE อนุมัติจัดสอนแทนให้ ${candidateName} เรียบร้อยแล้ว!`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 md:p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-md">
              <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-200" />
              ระบบจัดครูสอนแทนออนไลน์ (Smart Substitute Routing)
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              จัดครูสอนแทน & แจ้งเตือน LINE อัตโนมัติ
            </h1>
            <p className="text-emerald-100 text-sm max-w-2xl leading-relaxed">
              ซิงค์ข้อมูลครูลางานจากระบบ eLeave แนะนำครูว่างในคาบด้วย AI Weighted Match Score และส่งแจ้งเตือนผ่าน LINE 1-Tap
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => alert("ส่งออกบันทึกข้อความจัดสอนแทนเรียบร้อยแล้ว!")}
              className="px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur-md transition-all flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              พิมพ์บันทึกข้อความสอนแทน
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel: Request Input */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">คำขอจัดครูสอนแทน</h3>
              <p className="text-xs text-slate-500">ดึงข้อมูลครูลาจากระบบ eLeave อัตโนมัติ</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                เลือกครูที่ลางาน (eLeave Sync)
              </label>
              <select
                value={selectedLeaveTeacher}
                onChange={e => setSelectedLeaveTeacher(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border-none font-semibold"
              >
                <option value="t1">ครูสมชาย สายวิทย์ (ลาป่วย 3 ส.ค. 2569)</option>
                <option value="t2">ครูสมหญิง คณิตศาสตร์ (ลากิจ 4 ส.ค. 2569)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">วันที่สอนแทน</label>
                <input
                  type="date"
                  value={substituteDate}
                  onChange={e => setSubstituteDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border-none font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">คาบเรียนที่ติด</label>
                <select
                  value={substitutePeriod}
                  onChange={e => setSubstitutePeriod(parseInt(e.target.value, 10))}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border-none font-semibold"
                >
                  <option value={1}>คาบที่ 1 (ว23101 ม.3/1)</option>
                  <option value={2}>คาบที่ 2 (ว23101 ม.3/2)</option>
                </select>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                รายละเอียดคาบที่จะจัดสอนแทน:
              </div>
              <div>• รหัสวิชา: ว23101 (วิทยาศาสตร์ 5) ชั้น ม.3/1</div>
              <div>• ห้องเรียน: 301 | คาบที่ 1 (08:30 - 09:20)</div>
            </div>
          </div>
        </div>

        {/* Right Panel: AI Recommendation Ranking */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  อันดับครูแนะนำสำหรับสอนแทน (AI Ranked Candidates)
                </h3>
                <p className="text-xs text-slate-500">คำนวณคะแนน Match Score จากกลุ่มสาระ ตารางว่าง และภาระงานสะสม</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                {candidates.length} ท่านว่างในคาบนี้
              </span>
            </div>

            <div className="space-y-3">
              {candidates.map((c, idx) => (
                <div
                  key={c.candidate.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-emerald-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs ${
                      idx === 0 ? "bg-amber-500 text-white shadow-md shadow-amber-500/30" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}>
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">{c.candidate.name}</div>
                      <div className="text-xs text-slate-500">กลุ่มสาระวิทยาศาสตร์ | วิชาสอนหลัก: {c.candidate.subjectCode}</div>
                      
                      {/* Explainability Breakdown */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {c.explainabilityBreakdown.map((b, i) => (
                          <span key={i} className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            b.score > 0 ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300" : "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300"
                          }`}>
                            {b.rule} ({b.score > 0 ? `+${b.score}` : b.score})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-200 dark:border-slate-800 pt-3 md:pt-0">
                    <div className="text-right">
                      <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{c.matchPercentage}%</div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Match Score</div>
                    </div>
                    <button
                      onClick={() => handleAssignSubstitute(c.candidate.id, c.candidate.name)}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      มอบหมาย & แจ้ง LINE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Assigned Log History */}
          {assignedLog.length > 0 && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ประวัติการจัดสอนแทนสัปดาห์นี้
              </h4>
              <div className="space-y-2">
                {assignedLog.map((log, i) => (
                  <div key={i} className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-300 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold">{log.candidateName}</span> มอบหมายสอนแทน {log.subject} ({log.date})
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white font-bold text-[10px]">ส่ง LINE แล้ว</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
