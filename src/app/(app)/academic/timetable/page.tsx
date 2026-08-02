"use client";

import React, { useState } from "react";
import { 
  CalendarDays as Calendar, 
  Sparkles, 
  Search, 
  Building2, 
  Users, 
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Lock,
  Printer,
  Shield,
  BookOpen,
  Award,
  BarChart3,
  ListFilter,
  Info
} from "lucide-react";
import { LocalSearchSchedulingEngine } from "@/lib/timetable/solvers/localSearchEngine";
import type { TimeSlot, ScheduleBlock, ConstraintDefinition, ExplainabilityReport, ObjectiveScore } from "@/lib/timetable/types";

// Mock TimeSlots (5 Days x 8 Periods)
const INITIAL_TIMESLOTS: TimeSlot[] = [];
const DAYS = [
  { id: 1, name: "วันจันทร์", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  { id: 2, name: "วันอังคาร", color: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20" },
  { id: 3, name: "วันพุธ", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  { id: 4, name: "วันพฤหัสบดี", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  { id: 5, name: "วันศุกร์", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" }
];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

for (let d = 1; d <= 5; d++) {
  for (let p = 1; p <= 8; p++) {
    INITIAL_TIMESLOTS.push({
      id: `ts-${d}-${p}`,
      dayOfWeek: d,
      periodIndex: p,
      startTime: `${8 + (p <= 4 ? p - 1 : p)}:30`,
      endTime: `${8 + (p <= 4 ? p : p + 1)}:20`,
      isAcademicSlot: p !== 4
    });
  }
}

// Initial Mock ScheduleBlocks
const INITIAL_BLOCKS: ScheduleBlock[] = [
  { id: "b-lunch-1", type: "LUNCH", title: "พักกลางวัน", timeSlotId: "ts-1-4", dayOfWeek: 1, periodIndex: 4, isLocked: true, isFrozen: true },
  { id: "b-lunch-2", type: "LUNCH", title: "พักกลางวัน", timeSlotId: "ts-2-4", dayOfWeek: 2, periodIndex: 4, isLocked: true, isFrozen: true },
  { id: "b-lunch-3", type: "LUNCH", title: "พักกลางวัน", timeSlotId: "ts-3-4", dayOfWeek: 3, periodIndex: 4, isLocked: true, isFrozen: true },
  { id: "b-scout", type: "SCOUT", title: "ลูกเสือ-เนตรนารี", timeSlotId: "ts-3-7", dayOfWeek: 3, periodIndex: 7, targetGradeIds: ["ม.ต้น"], isLocked: true, isFrozen: true },
  { id: "b-club", type: "CLUB", title: "กิจกรรมชุมนุม", timeSlotId: "ts-4-7", dayOfWeek: 4, periodIndex: 7, targetGradeIds: ["ม.ปลาย"], isLocked: true, isFrozen: true },
  { id: "b-math-1", type: "ACADEMIC_SUBJECT", title: "คณิตศาสตร์ 5", subjectCode: "ค23101", timeSlotId: "ts-1-1", dayOfWeek: 1, periodIndex: 1, teacherIds: ["t-math"], teacherNames: ["ครูสมหญิง คณิตศาสตร์"], roomId: "r-101", roomName: "ห้อง 301", targetClassroomIds: ["ม.3/1"], isLocked: false, isFrozen: false },
  { id: "b-sci-1", type: "ACADEMIC_SUBJECT", title: "วิทยาศาสตร์ 5", subjectCode: "ว23101", timeSlotId: "ts-1-2", dayOfWeek: 1, periodIndex: 2, teacherIds: ["t-sci"], teacherNames: ["ครูสมชาย สายวิทย์"], roomId: "r-lab", roomName: "แล็บวิทย์ 1", targetClassroomIds: ["ม.3/1"], isLocked: false, isFrozen: false },
  { id: "b-thai-1", type: "ACADEMIC_SUBJECT", title: "ภาษาไทย 5", subjectCode: "ท23101", timeSlotId: "ts-2-2", dayOfWeek: 2, periodIndex: 2, teacherIds: ["t-thai"], teacherNames: ["ครูวิชัย ภาษาไทย"], roomId: "r-101", roomName: "ห้อง 301", targetClassroomIds: ["ม.3/1"], isLocked: false, isFrozen: false },
  { id: "b-eng-1", type: "ACADEMIC_SUBJECT", title: "ภาษาอังกฤษ 5", subjectCode: "อ23101", timeSlotId: "ts-3-1", dayOfWeek: 3, periodIndex: 1, teacherIds: ["t-eng"], teacherNames: ["ครูนภา ต่างประเทศ"], roomId: "r-102", roomName: "ห้อง 302", targetClassroomIds: ["ม.3/2"], isLocked: false, isFrozen: false }
];

export default function TimetableBuilderPage() {
  const [activeTab, setActiveTab] = useState<"CANVAS" | "ACTIVITIES" | "BLOCKED_SLOTS" | "PRINT">("CANVAS");
  const [selectedClass, setSelectedClass] = useState("ม.3/1");
  const [searchQuery, setSearchQuery] = useState("");
  const [blocks, setBlocks] = useState<ScheduleBlock[]>(INITIAL_BLOCKS);
  const [isSolving, setIsSolving] = useState(false);
  const [explainabilityReport, setExplainabilityReport] = useState<ExplainabilityReport | null>(null);
  const [score, setScore] = useState<ObjectiveScore | null>(null);

  // Constraint Toggles State
  const [constraintToggles, setConstraintToggles] = useState<ConstraintDefinition[]>([
    { code: "TEACHER_UNAVAILABILITY", name: "ตรวจเวลาห้ามสอนของครู", description: "งดจัดสอนวัน/คาบที่ครูติดภารกิจ", category: "TEACHER", severity: "HARD", defaultWeight: 10000, isEnabled: true },
    { code: "SUBJECT_NATURE_TIME", name: "ธรรมชาติวิชา (วิชาหนักลงเช้า)", description: "คณิต/วิทย์/อังกฤษ ลงคาบ 1-3", category: "ACADEMIC", severity: "CRITICAL_SOFT", defaultWeight: 500, isEnabled: true },
    { code: "TEACHER_NO_GAP", name: "ป้องกันคาบฟันหลอของครู", description: "จัดคาบสอนครูเป็นบล็อกต่อเนื่อง", category: "TEACHER", severity: "SOFT", defaultWeight: 200, isEnabled: true },
    { code: "TEACHER_WORKLOAD_BALANCE", name: "เฉลี่ยภาระงานสอนต่อวัน", description: "กระจายคาบสอนต่อวันให้เท่ากัน", category: "TEACHER", severity: "SOFT", defaultWeight: 100, isEnabled: true }
  ]);

  // Run AI Auto-Scheduler
  const handleRunAISolver = async () => {
    setIsSolving(true);
    try {
      const solver = new LocalSearchSchedulingEngine();
      const result = await solver.solve(INITIAL_TIMESLOTS, blocks, constraintToggles, {
        maxExecutionTimeSeconds: 10
      });
      setBlocks(result.blocks);
      setExplainabilityReport(result.explainabilityReport);
      setScore(result.score);
    } catch (e: any) {
      alert("เกิดข้อผิดพลาดในการประมวลผล: " + e.message);
    } finally {
      setIsSolving(false);
    }
  };

  const filteredBlocks = blocks.filter(b => {
    if (selectedClass && b.targetClassroomIds && !b.targetClassroomIds.includes(selectedClass) && b.type === "ACADEMIC_SUBJECT") {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        b.title.toLowerCase().includes(q) ||
        (b.subjectCode && b.subjectCode.toLowerCase().includes(q)) ||
        (b.teacherNames && b.teacherNames.some(t => t.toLowerCase().includes(q)))
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 p-6 md:p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-md">
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              Next-Gen Enterprise Scheduling Platform
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              ระบบจัดตารางสอนแม่บทอัจฉริยะ (Master Timetable)
            </h1>
            <p className="text-purple-100 text-sm max-w-2xl leading-relaxed">
              รองรับ 6-Layer Clean Architecture, AI Auto-Scheduler (Greedy + Hill Climbing), คาบล็อครายช่วงชั้น/รายห้อง และ Explainability Console
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunAISolver}
              disabled={isSolving}
              className="px-5 py-3 rounded-2xl font-extrabold text-xs bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 shadow-xl hover:shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-slate-900" />
              {isSolving ? "กำลังประมวลผล AI..." : "🤖 สั่ง AI จัดตารางสอนอัตโนมัติ"}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-sm">
        <button
          onClick={() => setActiveTab("CANVAS")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === "CANVAS"
              ? "bg-purple-600 text-white shadow-md"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Calendar className="w-4 h-4" />
          🎛️ ตารางInteractive Grid & AI Console
        </button>

        <button
          onClick={() => setActiveTab("ACTIVITIES")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === "ACTIVITIES"
              ? "bg-purple-600 text-white shadow-md"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Award className="w-4 h-4" />
          ⚜️ กิจกรรมพัฒนาผู้เรียน & คาบล็อค
        </button>

        <button
          onClick={() => setActiveTab("BLOCKED_SLOTS")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === "BLOCKED_SLOTS"
              ? "bg-purple-600 text-white shadow-md"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Shield className="w-4 h-4" />
          🚫 กำหนดเวลาห้ามสอนของครู
        </button>

        <button
          onClick={() => setActiveTab("PRINT")}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === "PRINT"
              ? "bg-purple-600 text-white shadow-md"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Printer className="w-4 h-4" />
          🖨️ พิมพ์ตารางเรียน / ตารางสอน A4
        </button>
      </div>

      {/* TAB 1: Timetable Canvas & AI Console */}
      {activeTab === "CANVAS" && (
        <div className="space-y-6">
          {/* Action Filter Bar */}
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

            {/* Constraint Toggles Preview */}
            <div className="flex items-center gap-2 overflow-x-auto">
              {constraintToggles.map(ct => (
                <button
                  key={ct.code}
                  onClick={() => setConstraintToggles(prev => prev.map(c => c.code === ct.code ? { ...c, isEnabled: !c.isEnabled } : c))}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all shrink-0 flex items-center gap-1.5 ${
                    ct.isEnabled
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-700 dark:text-emerald-300"
                      : "bg-slate-100 dark:bg-slate-800 border-slate-300 text-slate-400"
                  }`}
                >
                  {ct.isEnabled ? "✓" : "✗"} {ct.name}
                </button>
              ))}
            </div>
          </div>

          {/* Explainability Report Console */}
          {explainabilityReport && score && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl font-black text-xl text-white ${score.hardViolationsCount === 0 ? "bg-emerald-600" : "bg-rose-600"}`}>
                    {score.totalScore}%
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {explainabilityReport.overallSummary}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Hard Violations: {score.hardViolationsCount} | Soft Penalty: {score.softPenaltyTotal}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="text-center px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800">
                    <span className="text-[10px] text-slate-400 block">ความพึงพอใจครู</span>
                    <span className="font-bold text-xs text-purple-600">{score.categoryScores.teacherSatisfaction}%</span>
                  </div>
                  <div className="text-center px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800">
                    <span className="text-[10px] text-slate-400 block">อัตราการใช้ห้อง</span>
                    <span className="font-bold text-xs text-indigo-600">{score.categoryScores.roomUtilization}%</span>
                  </div>
                </div>
              </div>

              {explainabilityReport.explanations.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-indigo-500" />
                    เหตุผลการปรับย้ายตำแหน่งของ AI (Why Decision Traces):
                  </div>
                  <div className="space-y-1">
                    {explainabilityReport.explanations.map((ex, idx) => (
                      <div key={idx} className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
                        <span>• [{ex.subjectCode}] {ex.reason}</span>
                        <span className="font-bold text-emerald-600">+{ex.scoreDelta} คะแนน</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Timetable Grid Canvas */}
          <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="p-4 w-32 font-bold text-center">วัน / คาบ</th>
                  {PERIODS.map(p => (
                    <th key={p} className="p-4 font-bold text-center border-l border-slate-200 dark:border-slate-800">
                      คาบที่ {p}
                      <span className="block text-[10px] text-slate-400 font-normal mt-0.5">
                        {p === 4 ? "พักกลางวัน" : `${8 + (p <= 4 ? p - 1 : p)}:30 - ${8 + (p <= 4 ? p : p + 1)}:20`}
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
                      const block = filteredBlocks.find(b => b.dayOfWeek === day.id && b.periodIndex === period);
                      return (
                        <td key={period} className="p-2 border-l border-slate-200 dark:border-slate-800 h-24 align-top">
                          {block ? (
                            <div
                              className={`h-full p-2.5 rounded-2xl border transition-all shadow-xs flex flex-col justify-between ${
                                block.type !== "ACADEMIC_SUBJECT"
                                  ? "bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 text-amber-900 dark:text-amber-200"
                                  : "bg-purple-50/60 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/60 text-slate-800 dark:text-slate-100"
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className="font-extrabold text-xs text-purple-700 dark:text-purple-300">
                                    {block.subjectCode || block.type}
                                  </span>
                                  {block.isLocked && <Lock className="w-3 h-3 text-amber-500 shrink-0" />}
                                </div>
                                <div className="font-semibold line-clamp-1">{block.title}</div>
                              </div>
                              {block.type === "ACADEMIC_SUBJECT" && (
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 mt-2 border-t border-slate-200/60 dark:border-slate-800 pt-1.5">
                                  <div className="flex items-center gap-1">
                                    <Users className="w-3 h-3 text-purple-500" />
                                    <span className="truncate">{block.teacherNames?.join(", ")}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Building2 className="w-3 h-3 text-slate-400" />
                                    <span>{block.roomName}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="h-full rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-purple-300 flex items-center justify-center text-slate-400 text-[11px] font-medium transition-colors">
                              คาบว่าง
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

      {/* TAB 2: Activity Scope Config */}
      {activeTab === "ACTIVITIES" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                ⚜️ กำหนดคาบล็อคกิจกรรมพัฒนาผู้เรียน & พักเที่ยง
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                กำหนดขอบเขตผู้เรียนที่ต้องเข้าร่วมกิจกรรม (ทั้งโรงเรียน / รายช่วงชั้น ม.ต้น-ม.ปลาย / รายห้องเรียน)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="font-bold text-purple-600 dark:text-purple-400 text-sm">🍚 พักกลางวัน (LUNCH)</div>
              <p className="text-slate-500">คาบที่ 4 (11:00 - 11:50 น.) | ขอบเขต: ทั้งโรงเรียน</p>
              <span className="inline-block px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                ✓ ล็อคทุกวันจันทร์ - ศุกร์
              </span>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="font-bold text-amber-600 dark:text-amber-400 text-sm">⚜️ ลูกเสือ - เนตรนารี (SCOUT)</div>
              <p className="text-slate-500">วันพุธ คาบที่ 7 (14:30 - 15:20 น.) | ขอบเขต: ม.ต้น (ม.1 - ม.3)</p>
              <span className="inline-block px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 font-bold">
                ✓ ล็อคช่วงชั้น ม.ต้น
              </span>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">🧩 กิจกรรมชุมนุม (CLUB)</div>
              <p className="text-slate-500">วันพฤหัสบดี คาบที่ 7 (14:30 - 15:20 น.) | ขอบเขต: ม.ปลาย (ม.4 - ม.6)</p>
              <span className="inline-block px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                ✓ ล็อคช่วงชั้น ม.ปลาย
              </span>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="font-bold text-blue-600 dark:text-blue-400 text-sm">☸️ สวดมนต์ / โฮมรูม (ASSEMBLY)</div>
              <p className="text-slate-500">วันจันทร์ คาบที่ 1 (08:30 - 09:20 น.) | ขอบเขต: ทั้งโรงเรียน</p>
              <span className="inline-block px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-bold">
                ✓ ล็อคทั้งโรงเรียน
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Teacher Unavailability Matrix */}
      {activeTab === "BLOCKED_SLOTS" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              🚫 กำหนดเวลาห้ามสอนของครูรายบุคคล (Teacher Blocked Slots Matrix)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              เลือกครูผู้สอนและคลิกคาบที่ไม่ต้องการให้จัดตารางสอน (เช่น ติดภารกิจฝ่ายการเงินงดสอนวันศุกร์บ่าย)
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs">
            💡 **ตัวอย่างเงื่อนไขครู**: ครูสมชาย สายวิทย์ (ฝ่ายการเงิน) งดจัดคาบสอนในวันศุกร์ คาบ 6-7 เพื่อไปถอนเงินประจำสัปดาห์
          </div>
        </div>
      )}

      {/* TAB 4: Print & Export Dashboard */}
      {activeTab === "PRINT" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                🖨️ ระบบพิมพ์ตารางเรียน และส่งออกตารางสอน A4
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                สลับเลือกตารางสอนรายครู หรือตารางเรียนรายชั้นเรียน สั่งพิมพ์ A4 แนวนอน/แนวตั้ง
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs flex items-center gap-2 shadow-md"
            >
              <Printer className="w-4 h-4" />
              พิมพ์ตาราง A4
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
              <Users className="w-8 h-8 text-purple-500 mx-auto" />
              <div className="font-bold text-sm">ตารางเรียนรายชั้นเรียน</div>
              <p className="text-slate-400">สำหรับแจกนักเรียน ม.1/1 - ม.6/6</p>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
              <BookOpen className="w-8 h-8 text-indigo-500 mx-auto" />
              <div className="font-bold text-sm">ตารางสอนรายครู</div>
              <p className="text-slate-400">ใบนัดหมายสอนครูรายบุคคล</p>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
              <BarChart3 className="w-8 h-8 text-emerald-500 mx-auto" />
              <div className="font-bold text-sm">ตารางสอนรวมทั้งโรงเรียน</div>
              <p className="text-slate-400">มุมมอง Master Matrix รวม</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
