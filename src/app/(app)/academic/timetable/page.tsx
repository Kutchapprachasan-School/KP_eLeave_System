"use client";

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from "react";
import { getSystemSettings } from "@/app/actions/settings";
import { 
  CalendarDays as Calendar, 
  Sparkles, 
  Search, 
  Building2, 
  Users, 
  FileSpreadsheet,
  Lock,
  Printer,
  Shield,
  BookOpen,
  Award,
  BarChart3,
  Info,
  Download,
  Upload,
  CheckCircle2,
  XCircle,
  Check,
  Settings,
  Layers,
  Zap,
  Sliders,
  TrendingUp
} from "lucide-react";
import { LocalSearchSchedulingEngine } from "@/lib/timetable/solvers/localSearchEngine";
import { ProgressiveCascadeSolver } from "@/lib/timetable/solvers/progressiveCascadeSolver";
import { ExcelImportService } from "@/lib/services/excelImportService";
import { PrintTemplateService } from "@/lib/services/printTemplateService";
import type { TimeSlot, ScheduleBlock, ConstraintDefinition, ExplainabilityReport, ObjectiveScore, EnterpriseOptimizationResult, OptimizationScopeLevel } from "@/lib/timetable/types";

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
  { id: "b-lunch-1", type: "LUNCH", title: "พักกลางวัน", timeSlotId: "ts-1-4", dayOfWeek: 1, periodIndex: 4, isLocked: true, isFrozen: true, lockDetails: { isLocked: true, lockType: "LOCKED_BY_POLICY", lockReason: "พักเที่ยงส่วนกลาง" } },
  { id: "b-lunch-2", type: "LUNCH", title: "พักกลางวัน", timeSlotId: "ts-2-4", dayOfWeek: 2, periodIndex: 4, isLocked: true, isFrozen: true, lockDetails: { isLocked: true, lockType: "LOCKED_BY_POLICY" } },
  { id: "b-lunch-3", type: "LUNCH", title: "พักกลางวัน", timeSlotId: "ts-3-4", dayOfWeek: 3, periodIndex: 4, isLocked: true, isFrozen: true, lockDetails: { isLocked: true, lockType: "LOCKED_BY_POLICY" } },
  { id: "b-scout", type: "SCOUT", title: "ลูกเสือ-เนตรนารี", timeSlotId: "ts-3-7", dayOfWeek: 3, periodIndex: 7, targetGradeIds: ["ม.ต้น"], isLocked: true, isFrozen: true, lockDetails: { isLocked: true, lockType: "LOCKED_BY_EVENT" } },
  { id: "b-club", type: "CLUB", title: "กิจกรรมชุมนุม", timeSlotId: "ts-4-7", dayOfWeek: 4, periodIndex: 7, targetGradeIds: ["ม.ปลาย"], isLocked: true, isFrozen: true, lockDetails: { isLocked: true, lockType: "LOCKED_BY_EVENT" } },
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

  const [settingsPeriodsPerDay, setSettingsPeriodsPerDay] = useState(8);
  const [settingsStartTime, setSettingsStartTime] = useState("08:30");
  const [settingsPeriodDuration, setSettingsPeriodDuration] = useState(50);

  useEffect(() => {
    getSystemSettings().then((s) => {
      if (s) {
        setSettingsPeriodsPerDay((s as any).timetablePeriodsPerDay ?? 8);
        setSettingsStartTime((s as any).timetableStartTime || "08:30");
        setSettingsPeriodDuration((s as any).timetablePeriodDuration ?? 50);
      }
    }).catch(console.error);
  }, []);

  const PERIODS = Array.from({length: settingsPeriodsPerDay}, (_, i) => i + 1);

  const getPeriodTimeStr = (p: number) => {
    if (p === 4) return "พักกลางวัน";
    const [startH, startM] = settingsStartTime.split(":").map(Number);
    let currentMins = startH * 60 + startM;
    for (let i = 1; i < p; i++) {
      currentMins += settingsPeriodDuration;
    }
    if (p > 4) {
      currentMins += settingsPeriodDuration; // lunch period
    }
    const endMins = currentMins + settingsPeriodDuration;
    const formatTime = (mins: number) => `${Math.floor(mins / 60).toString().padStart(2, "0")}:${(mins % 60).toString().padStart(2, "0")}`;
    return `${formatTime(currentMins)} - ${formatTime(endMins)}`;
  };


  // Progressive Optimization State
  const [cascadeResult, setCascadeResult] = useState<EnterpriseOptimizationResult | null>(null);
  const [maxChangedSlotsBudget, setMaxChangedSlotsBudget] = useState(10);
  const [targetScopeLevel, setTargetScopeLevel] = useState<OptimizationScopeLevel>("LEVEL_1_WITHIN_DEPARTMENT");

  // Print Preset State
  const [printPreset, setPrintPreset] = useState(PrintTemplateService.getDefaultPreset());

  // Excel Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([
    { rowNumber: 1, subjectCode: "ว23101", subjectName: "วิทยาศาสตร์ 5", periodsPerWeek: 3, classroomName: "ม.3/1", teacherId: "t-1", teacherName: "ครูสมชาย สายวิทย์", roomId: "r-lab", isValid: true, errors: [] },
    { rowNumber: 2, subjectCode: "ค23101", subjectName: "คณิตศาสตร์ 5", periodsPerWeek: 3, classroomName: "ม.3/1", teacherId: "t-2", teacherName: "ครูสมหญิง คณิตศาสตร์", roomId: "r-101", isValid: true, errors: [] },
    { rowNumber: 3, subjectCode: "", subjectName: "สังคมศึกษา 5", periodsPerWeek: 2, classroomName: "ม.3/1", teacherId: "t-5", teacherName: "ครูนิภา", roomId: "r-101", isValid: false, errors: ["ไม่พบรหัสวิชา"] }
  ]);

  // Constraint Toggles State
  const [constraintToggles, setConstraintToggles] = useState<ConstraintDefinition[]>([
    { code: "TEACHER_UNAVAILABILITY", name: "ตรวจเวลาห้ามสอนของครู", description: "งดจัดสอนวัน/คาบที่ครูติดภารกิจ", category: "TEACHER", severity: "HARD", defaultWeight: 10000, isEnabled: true },
    { code: "SUBJECT_NATURE_TIME", name: "ธรรมชาติวิชา (วิชาหนักลงเช้า)", description: "คณิต/วิทย์/อังกฤษ ลงคาบ 1-3", category: "ACADEMIC", severity: "CRITICAL_SOFT", defaultWeight: 500, isEnabled: true },
    { code: "TEACHER_NO_GAP", name: "ป้องกันคาบฟันหลอของครู", description: "จัดคาบสอนครูเป็นบล็อกต่อเนื่อง", category: "TEACHER", severity: "SOFT", defaultWeight: 200, isEnabled: true },
    { code: "TEACHER_WORKLOAD_BALANCE", name: "เฉลี่ยภาระงานสอนต่อวัน", description: "กระจายคาบสอนต่อวันให้เท่ากัน", category: "TEACHER", severity: "SOFT", defaultWeight: 100, isEnabled: true }
  ]);

  // Run Progressive Optimization Cascade AI Engine
  const handleRunProgressiveCascade = async () => {
    setIsSolving(true);
    try {
      const cascadeSolver = new ProgressiveCascadeSolver();
      const result = await cascadeSolver.solveCascade(INITIAL_TIMESLOTS, blocks, constraintToggles, {
        maxChangedSlots: maxChangedSlotsBudget,
        maxChangedTeachers: 3,
        maxChangedRooms: 2,
        freezePublishedClasses: true,
        freezeExamWeeks: true,
        allowCrossDepartmentElectivesOnly: false
      });
      setBlocks(result.blocks);
      setCascadeResult(result);
    } catch (e: any) {
      alert("เกิดข้อผิดพลาดในการประมวลผล: " + e.message);
    } finally {
      setIsSolving(false);
    }
  };

  // Download Sample Template CSV
  const handleDownloadSampleTemplate = () => {
    const csvContent = ExcelImportService.getSampleTemplateCSV();
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Timetable_Master_Data_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Confirm Import Verified Rows
  const handleConfirmImport = () => {
    const parsed = ExcelImportService.parseOfferingRows(importRows);
    const validOfferings = parsed.filter(p => p.isValid);
    if (validOfferings.length === 0) {
      alert("ไม่พบรายการข้อมูลที่ผ่านการตรวจสอบ กรุณาแก้ไขข้อมูลในตาราง Preview ก่อนกดยืนยัน");
      return;
    }
    const newBlocks = ExcelImportService.convertOfferingsToScheduleBlocks(validOfferings);
    setBlocks(prev => [...prev.filter(b => b.type !== "ACADEMIC_SUBJECT"), ...newBlocks]);
    setShowImportModal(false);
    alert(`นำเข้าข้อมูลวิชาสอนสำเร็จแล้วจำนวน ${validOfferings.length} รายวิชา (${newBlocks.length} คาบ)`);
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

  const workloadSummary = PrintTemplateService.calculateWorkloadSummary(filteredBlocks);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-6">
      {/* Clean Minimal Top Header Bar (No Heavy Hero Banner) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            จัดตารางสอนแม่บท (Master Timetable)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            จัดตารางสอน ตรวจสอบข้อขัดแย้ง ปรับสมดุลภาระงาน และพิมพ์ตารางสอน
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5 shadow-xs"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-500" />
            นำเข้าด้วย Excel
          </button>

          <button
            onClick={handleRunProgressiveCascade}
            disabled={isSolving}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            {isSolving ? "กำลังประมวลผล..." : "สั่ง AI เฉลี่ยภาระงาน"}
          </button>
        </div>
      </div>

      {/* Excel Import Preview Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                  นำเข้าข้อมูลด้วย Excel / CSV
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ตรวจสอบและแก้ไขข้อมูลล่วงหน้าก่อนกดยืนยัน
                </p>
              </div>

              <button
                onClick={handleDownloadSampleTemplate}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                ดาวน์โหลด Template
              </button>
            </div>

            {/* Interactive Preview Data Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>ตาราง Preview ({importRows.length} รายการ)</span>
                <span className="text-slate-400 font-normal">💡 คลิกที่เซลล์เพื่อแก้ไขข้อมูล</span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                      <th className="p-3 w-16 text-center">แถว</th>
                      <th className="p-3 w-24 text-center">สถานะ</th>
                      <th className="p-3">รหัสวิชา</th>
                      <th className="p-3">ชื่อวิชา</th>
                      <th className="p-3 w-20 text-center">คาบ/สัปดาห์</th>
                      <th className="p-3">ชั้นเรียน</th>
                      <th className="p-3">ครูผู้สอน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {importRows.map((row, index) => (
                      <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 text-center font-bold text-slate-400">#{row.rowNumber}</td>
                        <td className="p-3 text-center">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                              <CheckCircle2 className="w-3 h-3" /> ผ่าน
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-[10px]">
                              <XCircle className="w-3 h-3" /> {row.errors.join(", ")}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={row.subjectCode}
                            onChange={e => {
                              const val = e.target.value;
                              setImportRows(prev => prev.map((r, i) => i === index ? { ...r, subjectCode: val, isValid: Boolean(val && r.subjectName && r.classroomName), errors: val ? [] : ["ไม่พบรหัสวิชา"] } : r));
                            }}
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent font-bold text-purple-600 focus:ring-1 focus:ring-purple-500"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={row.subjectName}
                            onChange={e => {
                              const val = e.target.value;
                              setImportRows(prev => prev.map((r, i) => i === index ? { ...r, subjectName: val, isValid: Boolean(r.subjectCode && val && r.classroomName) } : r));
                            }}
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent focus:ring-1 focus:ring-purple-500"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            value={row.periodsPerWeek}
                            onChange={e => {
                              const val = parseInt(e.target.value, 10) || 1;
                              setImportRows(prev => prev.map((r, i) => i === index ? { ...r, periodsPerWeek: val } : r));
                            }}
                            className="w-16 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-center bg-transparent focus:ring-1 focus:ring-purple-500"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={row.classroomName}
                            onChange={e => {
                              const val = e.target.value;
                              setImportRows(prev => prev.map((r, i) => i === index ? { ...r, classroomName: val } : r));
                            }}
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent focus:ring-1 focus:ring-purple-500"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={row.teacherName}
                            onChange={e => {
                              const val = e.target.value;
                              setImportRows(prev => prev.map((r, i) => i === index ? { ...r, teacherName: val } : r));
                            }}
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent focus:ring-1 focus:ring-purple-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-md"
              >
                <Check className="w-4 h-4" />
                ยืนยันนำเข้าข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tab Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-xs">
        <button
          onClick={() => setActiveTab("CANVAS")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === "CANVAS"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          ตาราง Interactive Grid
        </button>

        <button
          onClick={() => setActiveTab("ACTIVITIES")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === "ACTIVITIES"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          กิจกรรมพัฒนาผู้เรียน & คาบล็อค
        </button>

        <button
          onClick={() => setActiveTab("BLOCKED_SLOTS")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === "BLOCKED_SLOTS"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          เวลาห้ามสอนของครู
        </button>

        <button
          onClick={() => setActiveTab("PRINT")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === "PRINT"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Printer className="w-3.5 h-3.5" />
          พิมพ์ตารางเรียน / ตารางสอน A4
        </button>
      </div>

      {/* TAB 1: Timetable Canvas */}
      {activeTab === "CANVAS" && (
        <div className="space-y-6">
          {/* Action Filter & Change Budget Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อครู/วิชา/ห้อง..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <select
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold border-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="ม.3/1">ชั้น ม.3/1</option>
                <option value="ม.3/2">ชั้น ม.3/2</option>
                <option value="ม.3/3">ชั้น ม.3/3</option>
              </select>
            </div>

            {/* Change Budget Inputs */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <Sliders className="w-3.5 h-3.5 text-purple-500" />
                <span className="font-bold text-slate-600 dark:text-slate-300">เพดานการย้ายคาบ:</span>
                <input
                  type="number"
                  value={maxChangedSlotsBudget}
                  onChange={e => setMaxChangedSlotsBudget(parseInt(e.target.value, 10) || 10)}
                  className="w-10 px-1 py-0.5 text-center font-bold text-purple-600 bg-transparent border-b border-purple-400"
                />
                <span className="text-slate-400">คาบ</span>
              </div>
            </div>
          </div>

          {/* Progressive Optimization Cascade Result Dashboard */}
          {cascadeResult && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 rounded-xl font-bold text-sm bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    🛡️ ความคงเดิม: {cascadeResult.scheduleStabilityScore}%
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-xs">
                      {cascadeResult.explainabilityReport.overallSummary}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      ผลกระทบ: สลับ {cascadeResult.impactSummary.changedSlotsCount} คาบ | ครู {cascadeResult.impactSummary.changedTeachersCount} ท่าน
                    </p>
                  </div>
                </div>

                <div className="text-xs font-extrabold text-emerald-600">
                  Fairness: {cascadeResult.fairnessIndexBefore}% ➔ {cascadeResult.fairnessIndexAfter}% 🟢
                </div>
              </div>
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
                        {getPeriodTimeStr(p)}
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
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              ⚜️ กิจกรรมพัฒนาผู้เรียน & คาบล็อค
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              กำหนดขอบเขตผู้เรียนเข้าร่วมกิจกรรม
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="font-bold text-purple-600 dark:text-purple-400 text-sm">🍚 พักกลางวัน</div>
              <p className="text-slate-500">คาบที่ 4 (11:00 - 11:50 น.) | ขอบเขต: ทั้งโรงเรียน</p>
              <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                ✓ ล็อคทุกวันจันทร์ - ศุกร์
              </span>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="font-bold text-amber-600 dark:text-amber-400 text-sm">⚜️ ลูกเสือ - เนตรนารี</div>
              <p className="text-slate-500">วันพุธ คาบที่ 7 (14:30 - 15:20 น.) | ขอบเขต: ม.ต้น</p>
              <span className="inline-block px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">
                ✓ ล็อคช่วงชั้น ม.ต้น
              </span>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">🧩 กิจกรรมชุมนุม</div>
              <p className="text-slate-500">วันพฤหัสบดี คาบที่ 7 (14:30 - 15:20 น.) | ขอบเขต: ม.ปลาย</p>
              <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                ✓ ล็อคช่วงชั้น ม.ปลาย
              </span>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="font-bold text-blue-600 dark:text-blue-400 text-sm">☸️ สวดมนต์ / โฮมรูม</div>
              <p className="text-slate-500">วันจันทร์ คาบที่ 1 (08:30 - 09:20 น.) | ขอบเขต: ทั้งโรงเรียน</p>
              <span className="inline-block px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">
                ✓ ล็อคทั้งโรงเรียน
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Teacher Unavailability Matrix */}
      {activeTab === "BLOCKED_SLOTS" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              🚫 กำหนดเวลาห้ามสอนของครูรายบุคคล
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              งดจัดสอนคาบที่ครูติดภารกิจประจำสัปดาห์
            </p>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-amber-900 text-xs">
            💡 **ตัวอย่าง**: ครูสมชาย สายวิทย์ (ฝ่ายการเงิน) งดจัดคาบสอนวันศุกร์ คาบ 6-7
          </div>
        </div>
      )}

      {/* TAB 4: Print & Customizer Dashboard */}
      {activeTab === "PRINT" && (
        <div className="space-y-6">
          {/* Customizer Controls */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-500" />
                ตั้งค่ารูปแบบการพิมพ์ A4
              </h2>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-md"
              >
                <Printer className="w-4 h-4" />
                สั่งพิมพ์ A4 ({printPreset.orientation === "LANDSCAPE" ? "แนวนอน" : "แนวตั้ง"})
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">ชื่อโรงเรียน</label>
                <input
                  type="text"
                  value={printPreset.schoolName}
                  onChange={e => setPrintPreset(prev => ({ ...prev, schoolName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">ปีการศึกษา / ภาคเรียน</label>
                <input
                  type="text"
                  value={`ภาคเรียนที่ ${printPreset.term} ปีการศึกษา ${printPreset.academicYear}`}
                  onChange={e => setPrintPreset(prev => ({ ...prev, academicYear: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">แนววางกระดาษ</label>
                <select
                  value={printPreset.orientation}
                  onChange={e => setPrintPreset(prev => ({ ...prev, orientation: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                >
                  <option value="LANDSCAPE">A4 แนวนอน (Landscape)</option>
                  <option value="PORTRAIT">A4 แนวตั้ง (Portrait)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Real-time WYSIWYG A4 Print Preview Sheet */}
          <div className="bg-white text-slate-900 rounded-3xl p-8 border border-slate-300 shadow-2xl space-y-6 max-w-5xl mx-auto font-sans">
            <div className="text-center space-y-1 border-b border-slate-300 pb-4">
              <h1 className="text-xl font-black tracking-tight">{printPreset.schoolName}</h1>
              <p className="text-xs font-semibold text-slate-600">{printPreset.subHeaderText}</p>
              <h2 className="text-sm font-bold text-purple-700 mt-2">
                ตารางเรียน / ตารางสอน ภาคเรียนที่ {printPreset.term} ปีการศึกษา {printPreset.academicYear} ({selectedClass})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse border border-slate-400 text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400 font-bold">
                    <th className="p-2 border border-slate-400 w-24">วัน / คาบ</th>
                    {PERIODS.map(p => (
                      <th key={p} className="p-2 border border-slate-400">
                        คาบที่ {p}
                        <span className="block text-[9px] font-normal text-slate-500">
                          {getPeriodTimeStr(p)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map(day => (
                    <tr key={day.id} className="border-b border-slate-300">
                      <td className="p-2 border border-slate-400 font-bold bg-slate-50">{day.name}</td>
                      {PERIODS.map(period => {
                        const block = filteredBlocks.find(b => b.dayOfWeek === day.id && b.periodIndex === period);
                        return (
                          <td key={period} className="p-2 border border-slate-400 h-16 align-middle text-[11px]">
                            {block ? (
                              <div className="font-bold text-slate-800">
                                <div>{block.subjectCode || block.title}</div>
                                <div className="text-[10px] text-slate-600 font-normal">{block.teacherNames?.join(", ")}</div>
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {printPreset.showWorkloadSummary && (
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-300 text-xs">
                <span className="font-bold">📊 สรุปภาระงานสอนรวม:</span>
                <span>วิชาการ: <strong>{workloadSummary.academicPeriods}</strong> คาบ</span>
                <span>กิจกรรม: <strong>{workloadSummary.activityPeriods}</strong> คาบ</span>
                <span className="font-bold text-purple-700">รวมภาระงานสอนสุทธิ: {workloadSummary.totalTeachingPeriods} คาบ/สัปดาห์</span>
              </div>
            )}

            {printPreset.showSignaturesBlock && (
              <div className="grid grid-cols-3 gap-6 pt-8 text-center text-xs text-slate-700">
                <div className="space-y-8">
                  <div>ลงชื่อ..........................................................</div>
                  <div className="font-semibold">({printPreset.signature1Title})</div>
                </div>
                <div className="space-y-8">
                  <div>ลงชื่อ..........................................................</div>
                  <div className="font-semibold">({printPreset.signature2Title})</div>
                </div>
                <div className="space-y-8">
                  <div>ลงชื่อ..........................................................</div>
                  <div className="font-semibold">({printPreset.signature3Title})</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
