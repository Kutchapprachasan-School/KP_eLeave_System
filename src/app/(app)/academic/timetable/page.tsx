"use client";

import React, { useState } from "react";
import { 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Layers, 
  FileSpreadsheet, 
  Send, 
  Search, 
  RefreshCw, 
  ShieldCheck, 
  ArrowRightLeft, 
  BookOpen, 
  Building2, 
  SlidersHorizontal,
  ChevronDown
} from "lucide-react";
import { TimetableService } from "@/../../eLeave/src/services/timetableService.js";
import { AvailabilityService } from "@/../../eLeave/src/services/availabilityService.js";
import { RecommendationService } from "@/../../eLeave/src/services/recommendationService.js";
import { SubstituteWorkflowService } from "@/../../eLeave/src/services/substituteWorkflowService.js";

// Mock Master Data
const MOCK_TEACHERS = [
  { id: "t1", name: "ครูสมชาย สายวิทย์", departmentId: "DEP-SCI", subjectCode: "ว23101", maxWeekly: 20 },
  { id: "t2", name: "ครูสมหญิง คณิตศาสตร์", departmentId: "DEP-MATH", subjectCode: "ค23101", maxWeekly: 22 },
  { id: "t3", name: "ครูวิชัย ภาษาไทย", departmentId: "DEP-THAI", subjectCode: "ท23101", maxWeekly: 18 },
  { id: "t4", name: "ครูนภา ภาษาต่างประเทศ", departmentId: "DEP-ENG", subjectCode: "อ23101", maxWeekly: 20 },
  { id: "t5", name: "ครูเดชา สังคมศึกษา", departmentId: "DEP-SOC", subjectCode: "ส23101", maxWeekly: 20 }
];

const MOCK_ROOMS = [
  { id: "r101", code: "301", name: "ห้อง 301 (ม.3/1)", building: "อาคาร 3" },
  { id: "r102", code: "302", name: "ห้อง 302 (ม.3/2)", building: "อาคาร 3" },
  { id: "rLAB", code: "LAB1", name: "ห้องปฏิบัติการวิทยาศาสตร์ 1", building: "อาคาร 4" },
  { id: "rCOM", code: "COM1", name: "ห้องคอมพิวเตอร์ 1", building: "อาคาร ICT" }
];

const MOCK_SLOTS_INITIAL = [
  { id: "s1", timetableVersionId: "v1", offeringId: "off-101", subjectCode: "ว23101", subjectName: "วิทยาศาสตร์ 5", teacherName: "ครูสมชาย สายวิทย์", className: "ม.3/1", roomId: "r101", roomName: "ห้อง 301", dayOfWeek: 1, periodNumber: 1 },
  { id: "s2", timetableVersionId: "v1", offeringId: "off-102", subjectCode: "ค23101", subjectName: "คณิตศาสตร์ 5", teacherName: "ครูสมหญิง คณิตศาสตร์", className: "ม.3/1", roomId: "r101", dayOfWeek: 1, periodNumber: 2 },
  { id: "s3", timetableVersionId: "v1", offeringId: "off-103", subjectCode: "ท23101", subjectName: "ภาษาไทย 5", teacherName: "ครูวิชัย ภาษาไทย", className: "ม.3/1", roomId: "r101", dayOfWeek: 2, periodNumber: 3 },
  { id: "s4", timetableVersionId: "v1", offeringId: "off-104", subjectCode: "อ23101", subjectName: "ภาษาอังกฤษ 5", teacherName: "ครูนภา ภาษาต่างประเทศ", className: "ม.3/2", roomId: "r102", dayOfWeek: 3, periodNumber: 1 }
];

const DAYS = [
  { id: 1, name: "วันจันทร์", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  { id: 2, name: "วันอังคาร", color: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20" },
  { id: 3, name: "วันพุธ", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  { id: 4, name: "วันพฤหัสบดี", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  { id: 5, name: "วันศุกร์", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" }
];

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function TimetableManagementPage() {
  const [activeTab, setActiveTab] = useState<"builder" | "substitute" | "versions">("builder");
  const [dragMode, setDragMode] = useState<"DIRECT" | "CHAIN">("DIRECT");
  const [slots, setSlots] = useState(MOCK_SLOTS_INITIAL);
  const [currentVersion, setCurrentVersion] = useState("ตารางสอนภาคเรียนที่ 1/2569 (ฉบับใช้งานจริง)");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("ม.3/1");

  // Substitute State
  const [selectedLeaveTeacher, setSelectedLeaveTeacher] = useState("t1");
  const [substituteDate, setSubstituteDate] = useState("2026-08-03");
  const [substituteDay, setSubstituteDay] = useState(1);
  const [substitutePeriod, setSubstitutePeriod] = useState(1);
  const [assignedLog, setAssignedLog] = useState<any[]>([]);

  // Calculate Recommendations
  const recService = new RecommendationService();
  const candidates = recService.rankCandidates(MOCK_TEACHERS, {
    subjectCode: "ว23101",
    departmentId: "DEP-SCI"
  });

  const handleDirectMove = (slotId: string, newDay: number, newPeriod: number) => {
    const service = new TimetableService({ versions: [], slots, offerings: [], rooms: [] });
    try {
      const updated = service.directMoveSlot(slotId, newDay, newPeriod);
      setSlots(prev => prev.map(s => s.id === slotId ? { ...s, dayOfWeek: newDay, periodNumber: newPeriod, hasCollision: updated.hasCollision } : s));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAssignSubstitute = (candidateId: string, candidateName: string) => {
    const wfService = new SubstituteWorkflowService();
    const wf = wfService.assignSubstitute("req-001", "s1", substituteDate, candidateId, "วิชาการโรงเรียน");
    setAssignedLog(prev => [{ ...wf, candidateName, subject: "ว23101 วิทยาศาสตร์ 5" }, ...prev]);
    alert(`ส่งการแจ้งเตือน LINE อนุมัติจัดสอนแทนให้ ${candidateName} เรียบร้อยแล้ว!`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 p-6 md:p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              School Resource Orchestration Platform (SROP 2026)
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              ระบบจัดตารางสอน & จัดครูสอนแทนออนไลน์
            </h1>
            <p className="text-purple-100 text-sm max-w-2xl leading-relaxed">
              บริหารจัดการตารางเรียนตารางสอน ป้องกันคาบชน 4 มิติ สลับคาบด้วย AI และจัดครูสอนแทนพร้อมส่งแจ้งเตือน LINE 1-Tap
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 p-2 rounded-2xl backdrop-blur-md border border-white/20">
            <button
              onClick={() => setActiveTab("builder")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                activeTab === "builder" ? "bg-white text-purple-700 shadow-md" : "text-white hover:bg-white/10"
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-1.5" />
              จัดตารางสอน
            </button>
            <button
              onClick={() => setActiveTab("substitute")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                activeTab === "substitute" ? "bg-white text-purple-700 shadow-md" : "text-white hover:bg-white/10"
              }`}
            >
              <ArrowRightLeft className="w-4 h-4 inline mr-1.5" />
              จัดสอนแทน
            </button>
            <button
              onClick={() => setActiveTab("versions")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                activeTab === "versions" ? "bg-white text-purple-700 shadow-md" : "text-white hover:bg-white/10"
              }`}
            >
              <Layers className="w-4 h-4 inline mr-1.5" />
              เวอร์ชันตาราง
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      {activeTab === "builder" && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อครู/วิชา/ห้อง..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <select
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold border-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="ม.3/1">ชั้น ม.3/1</option>
                <option value="ม.3/2">ชั้น ม.3/2</option>
                <option value="ม.3/3">ชั้น ม.3/3</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                onClick={() => setDragMode(dragMode === "DIRECT" ? "CHAIN" : "DIRECT")}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  dragMode === "DIRECT"
                    ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400"
                    : "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400"
                }`}
              >
                {dragMode === "DIRECT" ? (
                  <>📍 โหมดขยับคาบโดยตรง (Direct Move)</>
                ) : (
                  <>🔗 โหมดสลับลูกโซ่ AI (Chain Swap)</>
                )}
              </button>

              <button
                onClick={() => alert("AI Auto-Scheduler กำลังคำนวณและจัดตารางอัตโนมัติด้วย 4-Level Fallback Cascade...")}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20 hover:shadow-xl transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                AI จัดตารางอัตโนมัติ
              </button>
            </div>
          </div>

          {/* Timetable Grid Table */}
          <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="p-4 w-32 font-bold text-center">วัน / คาบ</th>
                  {PERIODS.map(p => (
                    <th key={p} className="p-4 font-bold text-center border-l border-slate-200 dark:border-slate-800">
                      คาบที่ {p}
                      <span className="block text-[10px] text-slate-400 font-normal mt-0.5">
                        {p === 4 ? "พักกลางวัน" : `${8 + p - 1}:30 - ${8 + p}:20`}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {DAYS.map(day => (
                  <tr key={day.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="p-3 font-bold text-center">
                      <span className={`inline-block px-3 py-1.5 rounded-xl border ${day.color} text-xs shadow-xs`}>
                        {day.name}
                      </span>
                    </td>
                    {PERIODS.map(period => {
                      const slot = slots.find(s => s.dayOfWeek === day.id && s.periodNumber === period);
                      return (
                        <td key={period} className="p-2 border-l border-slate-200 dark:border-slate-800 h-24 align-top">
                          {slot ? (
                            <div
                              onClick={() => {
                                const newP = prompt("ย้ายไปคาบที่เท่าไหร่? (1-8)", String(period));
                                if (newP) handleDirectMove(slot.id, day.id, parseInt(newP, 10));
                              }}
                              className={`h-full p-2.5 rounded-2xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between ${
                                slot.hasCollision
                                  ? "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300"
                                  : "bg-purple-50/60 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/60 hover:border-purple-400 text-slate-800 dark:text-slate-100"
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className="font-extrabold text-xs text-purple-700 dark:text-purple-300">
                                    {slot.subjectCode}
                                  </span>
                                  {slot.hasCollision && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-red-500 text-white text-[9px] font-bold animate-pulse">
                                      ⚠️ ซ้อน
                                    </span>
                                  )}
                                </div>
                                <div className="font-semibold line-clamp-1">{slot.subjectName}</div>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 mt-2 border-t border-slate-200/60 dark:border-slate-800 pt-1.5">
                                <div className="flex items-center gap-1">
                                  <Users className="w-3 h-3 text-purple-500" />
                                  <span className="truncate">{slot.teacherName}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Building2 className="w-3 h-3 text-slate-400" />
                                  <span>{slot.roomName}</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div 
                              onClick={() => {
                                const code = prompt("ระบุรหัสวิชาที่จะจัดใส่คาบนี้:", "ว23101");
                                if (code) {
                                  setSlots(prev => [...prev, {
                                    id: `s-${Date.now()}`,
                                    timetableVersionId: "v1",
                                    offeringId: "off-new",
                                    subjectCode: code,
                                    subjectName: "วิชาเลือกเพิ่มเติม",
                                    teacherName: "ครูผู้สอน",
                                    className: selectedClass,
                                    roomId: "r101",
                                    roomName: "ห้อง 301",
                                    dayOfWeek: day.id,
                                    periodNumber: period
                                  }]);
                                }
                              }}
                              className="h-full rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 flex items-center justify-center text-slate-400 text-[11px] font-medium cursor-pointer transition-colors"
                            >
                              + เพิ่มคาบ
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Substitute Teaching Tab */}
      {activeTab === "substitute" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel: Request Input */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
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
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-purple-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
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
                              b.score > 0 ? "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300" : "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300"
                            }`}>
                              {b.rule} ({b.score > 0 ? `+${b.score}` : b.score})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-200 dark:border-slate-800 pt-3 md:pt-0">
                      <div className="text-right">
                        <div className="text-lg font-black text-purple-600 dark:text-purple-400">{c.matchPercentage}%</div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Match Score</div>
                      </div>
                      <button
                        onClick={() => handleAssignSubstitute(c.candidate.id, c.candidate.name)}
                        className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-lg shadow-purple-500/20 transition-all flex items-center gap-1.5"
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
      )}

      {/* Timetable Versions Tab */}
      {activeTab === "versions" && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">จัดการเวอร์ชันตารางสอน (Version Pointer Switch)</h3>
              <p className="text-xs text-slate-500">สลับตารางสอนเปิดใช้งานจริงระดับโรงเรียนใน 1 พอยต์เตอร์ โดยไม่ต้องคัดลอกแถวข้อมูลซ้ำซ้อน</p>
            </div>
            <button
              onClick={() => alert("สร้างตารางสอนฉบับร่างใหม่เรียบร้อยแล้ว!")}
              className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-md hover:bg-purple-700"
            >
              + สร้างฉบับร่างใหม่
            </button>
          </div>

          <div className="space-y-3">
            {[
              { id: "v1", name: "ตารางสอนภาคเรียนที่ 1/2569 (ฉบับใช้งานจริง)", status: "PUBLISHED", isCurrent: true, date: "2026-07-27 10:00" },
              { id: "v2", name: "ตารางสอนภาคเรียนที่ 1/2569 (ร่างทดลองปรับคาบวิทย์)", status: "DRAFT", isCurrent: false, date: "2026-07-26 15:30" }
            ].map(v => (
              <div key={v.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    {v.name}
                    {v.isCurrent && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                        ACTIVE PUBLISHED
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">อัปเดตล่าสุด: {v.date}</div>
                </div>

                {!v.isCurrent && (
                  <button
                    onClick={() => {
                      setCurrentVersion(v.name);
                      alert(`สลับใช้งาน ${v.name} เป็นตารางสอนจริงเรียบร้อยแล้ว!`);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-purple-600 hover:text-white transition-all"
                  >
                    สลับใช้งานเวอร์ชันนี้
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
