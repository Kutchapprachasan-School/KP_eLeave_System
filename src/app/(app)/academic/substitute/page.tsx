"use client";

import React, { useState } from "react";
import { 
  ArrowRightLeft, 
  Sparkles, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  CalendarDays as Calendar,
  Clock,
  Building2,
  FileSpreadsheet,
  Printer,
  FileText,
  Check
} from "lucide-react";
import { RecommendationService } from "@/lib/services/recommendationService";
import { SubstituteWorkflowService } from "@/lib/services/substituteWorkflowService";

const MOCK_TEACHERS = [
  { id: "t1", name: "ครูสมชาย สายวิทย์", departmentId: "DEP-SCI", subjectCode: "ว23101", maxWeekly: 20, gradeExperience: "ม.ต้น", slotSuitability: "เหมาะสม" },
  { id: "t2", name: "ครูสมหญิง คณิตศาสตร์", departmentId: "DEP-MATH", subjectCode: "ค23101", maxWeekly: 22, gradeExperience: "ม.ต้น", slotSuitability: "เหมาะสม" },
  { id: "t3", name: "ครูวิชัย ภาษาไทย", departmentId: "DEP-THAI", subjectCode: "ท23101", maxWeekly: 18, gradeExperience: "ม.ปลาย", slotSuitability: "ติดคาบซ้อน" },
  { id: "t4", name: "ครูนภา ภาษาต่างประเทศ", departmentId: "DEP-ENG", subjectCode: "อ23101", maxWeekly: 20, gradeExperience: "ม.ต้น", slotSuitability: "เหมาะสม" },
  { id: "t5", name: "ครูเดชา สังคมศึกษา", departmentId: "DEP-SOC", subjectCode: "ส23101", maxWeekly: 20, gradeExperience: "ม.ปลาย", slotSuitability: "เหมาะสม" }
];

export default function SubstituteTeachingPage() {
  const [selectedLeaveTeacher, setSelectedLeaveTeacher] = useState("t1");
  const [substituteDate, setSubstituteDate] = useState("2026-08-03");
  const [substitutePeriod, setSubstitutePeriod] = useState(1);
  const [assignedLog, setAssignedLog] = useState<any[]>([]);
  const [activeSlipModalPayload, setActiveSlipModalPayload] = useState<any | null>(null);

  // Calculate Recommendations using AI Engine with 4-Factor Weighted Model
  const recService = new RecommendationService([], [
    { teacherId: "t2", date: "2026-07-28" } // t2 has 1 past substitution penalty (-10)
  ]);
  const candidates = recService.rankCandidates(MOCK_TEACHERS, {
    subjectCode: "ว23101",
    departmentId: "DEP-SCI",
    gradeExperience: "ม.ต้น",
    slotSuitability: "เหมาะสม"
  });

  const handleAssignSubstitute = (candidateId: string, candidateName: string) => {
    const wfService = new SubstituteWorkflowService();
    const wf = wfService.assignSubstitute("req-001", "s1", substituteDate, candidateId, "วิชาการโรงเรียน");
    
    const slipPayload = RecommendationService.generateSubstituteOrderSlipPayload({
      absentTeacherName: MOCK_TEACHERS.find(t => t.id === selectedLeaveTeacher)?.name || "ครูผู้ลางาน",
      substituteTeacherName: candidateName,
      subjectName: "วิทยาศาสตร์ 5 (ว23101)",
      className: "ชั้น ม.3/1",
      periodIndex: substitutePeriod,
      dayName: "วันจันทร์",
      roomName: "ห้อง 301"
    });

    setAssignedLog(prev => [{ ...wf, candidateName, subject: "ว23101 วิทยาศาสตร์ 5", slipPayload }, ...prev]);
    setActiveSlipModalPayload(slipPayload);
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
              จัดครูสอนแทน & ใบบันทึกการปฏิบัติหน้าที่ (Order Slip)
            </h1>
            <p className="text-emerald-100 text-sm max-w-2xl leading-relaxed">
              เชื่อมโยงตารางสอนแม่บท + eLeave, แนะนำครูด้วยโมเดล 4 ปัจจัย (Fairness Penalty) และพิมพ์ใบบันทึกการสอนแทน
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => alert("พิมพ์รายงานคำสั่งปฏิบัติหน้าที่สอนแทนสำเร็จ!")}
              className="px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur-md transition-all flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              พิมพ์คำสั่งการสอนแทน
            </button>
          </div>
        </div>
      </div>

      {/* Substitute Order Slip Modal */}
      {activeSlipModalPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white text-slate-900 rounded-3xl p-8 max-w-xl w-full border border-slate-300 shadow-2xl space-y-6">
            <div className="text-center space-y-1 border-b border-slate-300 pb-4">
              <h2 className="text-lg font-black text-slate-900">📑 ใบบันทึกการปฏิบัติหน้าที่สอนแทน (Order Slip)</h2>
              <p className="text-xs text-slate-500">โรงเรียนกุดจับประชาสรรค์ | รหัส: {activeSlipModalPayload.slipId}</p>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="font-bold text-slate-500">วันที่ออกเอกสาร:</span>
                <span className="font-bold">{activeSlipModalPayload.issueDate}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="font-bold text-slate-500">ครูผู้ลางาน:</span>
                <span className="font-bold text-rose-600">{activeSlipModalPayload.absentTeacherName} ({activeSlipModalPayload.leaveType})</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="font-bold text-slate-500">ครูผู้ปฏิบัติหน้าที่สอนแทน:</span>
                <span className="font-bold text-emerald-600">{activeSlipModalPayload.substituteTeacherName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="font-bold text-slate-500">รายวิชา & ชั้นเรียน:</span>
                <span>{activeSlipModalPayload.subjectName} ({activeSlipModalPayload.className})</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="font-bold text-slate-500">คาบเรียน & ห้องเรียน:</span>
                <span>{activeSlipModalPayload.dayName} คาบที่ {activeSlipModalPayload.periodIndex} ({activeSlipModalPayload.roomName})</span>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-300 flex justify-between items-center">
              <button
                onClick={() => setActiveSlipModalPayload(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                ปิดหน้าต่าง
              </button>

              <button
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 shadow-md"
              >
                <Printer className="w-4 h-4" />
                พิมพ์ใบบันทึกการสอนแทน (A4)
              </button>
            </div>
          </div>
        </div>
      )}

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
                <option value="t1">ครูสมชาย สายวิทย์ (ลาป่วย)</option>
                <option value="t2">ครูสมหญิง คณิตศาสตร์ (ลากิจ)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                วันที่ต้องการจัดสอนแทน
              </label>
              <input
                type="date"
                value={substituteDate}
                onChange={e => setSubstituteDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border-none font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                คาบเรียนที่ต้องการจัดสอนแทน
              </label>
              <select
                value={substitutePeriod}
                onChange={e => setSubstitutePeriod(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border-none font-semibold"
              >
                <option value={1}>คาบที่ 1 (08:30 - 09:20 น.) - ว23101 วิทยาศาสตร์ 5 (ม.3/1)</option>
                <option value={2}>คาบที่ 2 (09:20 - 10:10 น.) - ค23101 คณิตศาสตร์ 5 (ม.3/1)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Panel: AI Recommendation & 4-Factor Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  รายชื่อครูที่แนะนำ (4-Factor AI Recommendation Matrix)
                </h3>
                <p className="text-xs text-slate-500">
                  คำนวณคะแนน match สาระวิชา, หักภาระงานสอนแทนสะสม (Fairness Penalty), และความพร้อมรายคาบ
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {candidates.map((cand: any, idx: number) => (
                <div
                  key={cand.candidate.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {cand.candidate.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Match Score: {cand.matchPercentage}%
                      </span>
                    </div>

                    {/* 4-Factor Breakdown Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {cand.explainabilityBreakdown.map((b: any, bIdx: number) => (
                        <span
                          key={bIdx}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            b.score < 0 ? "bg-rose-100 text-rose-700" : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {b.rule} ({b.score > 0 ? `+${b.score}` : b.score})
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleAssignSubstitute(cand.candidate.id, cand.candidate.name)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shrink-0 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    มอบหมาย & พิมพ์ใบสอนแทน
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
