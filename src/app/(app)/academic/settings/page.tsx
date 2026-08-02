"use client";

import React, { useState } from "react";
import { 
  Settings, 
  Calendar, 
  Clock, 
  Sliders, 
  Building2, 
  BookOpen, 
  Users, 
  Lock, 
  Save, 
  RotateCcw,
  Check,
  Plus,
  Trash2,
  Award,
  FileText,
  Laptop
} from "lucide-react";
import { AcademicSettingsService } from "@/lib/services/academicSettingsService";

export default function AcademicSettingsPage() {
  const [settings, setSettings] = useState(AcademicSettingsService.getSettings());
  const [activeTab, setActiveTab] = useState<"YEAR_TIME" | "WORKLOAD" | "DEPARTMENTS" | "CLASSROOMS" | "ACTIVITIES" | "FACILITY" | "EXAM_CONFIG" | "PA_GUIDELINES">("YEAR_TIME");
  const [isSaved, setIsSaved] = useState(false);

  // New Department Form State
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptHead, setNewDeptHead] = useState("");

  // New Classroom Form State
  const [newClassName, setNewClassName] = useState("");
  const [newClassLevel, setNewClassLevel] = useState("ม.ต้น");
  const [newClassAdvisor, setNewClassAdvisor] = useState("");

  // New Locked Activity Form State
  const [newActName, setNewActName] = useState("");
  const [newActDay, setNewActDay] = useState<number>(3);
  const [newActPeriod, setNewActPeriod] = useState<number>(7);
  const [newActScope, setNewActScope] = useState("ทั้งโรงเรียน");

  const handleSave = () => {
    AcademicSettingsService.updateSettings(settings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleReset = () => {
    if (confirm("คุณต้องการคืนค่าตั้งค่าเริ่มต้นของระบบวิชาการหรือไม่?")) {
      const def = AcademicSettingsService.resetToDefaults();
      setSettings(def);
    }
  };

  const handleAddDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName) return;
    AcademicSettingsService.addDepartment({ name: newDeptName, headTeacher: newDeptHead || "ยังไม่ระบุ" });
    setSettings(AcademicSettingsService.getSettings());
    setNewDeptName("");
    setNewDeptHead("");
  };

  const handleAddClassroom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName) return;
    AcademicSettingsService.addClassroom({ name: newClassName, level: newClassLevel, advisorTeacher: newClassAdvisor || "ยังไม่ระบุ" });
    setSettings(AcademicSettingsService.getSettings());
    setNewClassName("");
    setNewClassAdvisor("");
  };

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActName) return;
    AcademicSettingsService.addLockedActivity({
      name: newActName,
      dayOfWeek: Number(newActDay),
      periodIndex: Number(newActPeriod),
      scope: newActScope || "ทั้งโรงเรียน"
    });
    setSettings(AcademicSettingsService.getSettings());
    setNewActName("");
  };

  const handleDeleteActivity = (id: string) => {
    if (confirm("คุณต้องการลบคาบล็อคกิจกรรมนี้หรือไม่?")) {
      AcademicSettingsService.deleteLockedActivity(id);
      setSettings(AcademicSettingsService.getSettings());
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-6 text-slate-900 dark:text-slate-100">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            ตั้งค่าระบบบริหารงานวิชาการ (Academic Settings)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            กำหนดโครงสร้างปีการศึกษา คาบเรียน เกณฑ์ภาระงาน กลุ่มสาระ และคาบล็อคกิจกรรมส่วนกลาง
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            คืนค่าเริ่มต้น
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
          >
            {isSaved ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Save className="w-3.5 h-3.5" />}
            {isSaved ? "บันทึกตั้งค่าแล้ว!" : "บันทึกการตั้งค่า"}
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab("YEAR_TIME")}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            activeTab === "YEAR_TIME" ? "bg-purple-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          ปีการศึกษา & เวลาเรียน
        </button>

        <button
          onClick={() => setActiveTab("WORKLOAD")}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            activeTab === "WORKLOAD" ? "bg-purple-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          เกณฑ์ภาระงานสอนครู
        </button>

        <button
          onClick={() => setActiveTab("DEPARTMENTS")}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            activeTab === "DEPARTMENTS" ? "bg-purple-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          กลุ่มสาระการเรียนรู้ (8 กลุ่ม)
        </button>

        <button
          onClick={() => setActiveTab("CLASSROOMS")}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            activeTab === "CLASSROOMS" ? "bg-purple-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          ชั้นเรียน & ห้องเรียน
        </button>

        <button
          onClick={() => setActiveTab("ACTIVITIES")}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            activeTab === "ACTIVITIES" ? "bg-purple-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          คาบล็อคกิจกรรมพัฒนาผู้เรียน
        </button>

        <button
          onClick={() => setActiveTab("ACTIVITIES")}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            activeTab === "ACTIVITIES" ? "bg-purple-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          คาบล็อคกิจกรรมพัฒนาผู้เรียน
        </button>

        <button
          onClick={() => setActiveTab("EXAM_CONFIG")}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            activeTab === "EXAM_CONFIG" ? "bg-purple-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          ระบบสอบส่วนกลาง (วิชาการ)
        </button>
      </div>

      {/* Division Navigation Shortcuts */}
      <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Settings className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          ไปยังส่วนตั้งค่าตามฝ่ายงาน:
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <a href="/facility/settings" className="px-3 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition flex items-center gap-1">
            🏢 ฝ่ายบริหารทั่วไป (ทรัพยากรกลาง) ›
          </a>
          <a href="/personnel/settings" className="px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition flex items-center gap-1">
            👥 ฝ่ายบุคคล (เกณฑ์ PA & PD) ›
          </a>
          <a href="/settings?section=document-settings" className="px-3 py-1 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 font-bold border border-orange-200 dark:border-orange-800 hover:bg-orange-100 transition flex items-center gap-1">
            📄 ฝ่ายสารบรรณ (เอกสาร) ›
          </a>
        </div>
      </div>

      {/* TAB 1: Year & Time Slot Settings */}
      {activeTab === "YEAR_TIME" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 max-w-4xl">
          <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3">
            📅 โครงสร้างปีการศึกษา และกำหนดเวลาคาบเรียน
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">ปีการศึกษาปัจจุบัน</label>
              <input
                type="text"
                value={settings.academicYear}
                onChange={e => setSettings({ ...settings, academicYear: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">ภาคเรียนปัจจุบัน</label>
              <select
                value={settings.term}
                onChange={e => setSettings({ ...settings, term: Number(e.target.value) })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
              >
                <option value={1}>ภาคเรียนที่ 1</option>
                <option value={2}>ภาคเรียนที่ 2</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">วันเปิดภาคเรียน</label>
              <input
                type="date"
                value={settings.startDate}
                onChange={e => setSettings({ ...settings, startDate: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">วันปิดภาคเรียน</label>
              <input
                type="date"
                value={settings.endDate}
                onChange={e => setSettings({ ...settings, endDate: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">จำนวนคาบเรียนต่อวัน</label>
              <input
                type="number"
                value={settings.dailyPeriodsCount}
                onChange={e => setSettings({ ...settings, dailyPeriodsCount: Number(e.target.value) })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-purple-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">คาบพักกลางวันประจำวัน</label>
              <select
                value={settings.lunchPeriodIndex}
                onChange={e => setSettings({ ...settings, lunchPeriodIndex: Number(e.target.value) })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
              >
                {[3, 4, 5].map(p => <option key={p} value={p}>คาบที่ {p} (11:00 - 11:50 น.)</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Workload Limits */}
      {activeTab === "WORKLOAD" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 max-w-4xl">
          <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3">
            ⚖️ เกณฑ์และเพดานภาระงานสอนครู (Teacher Workload Thresholds)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">ภาระงานสอนขั้นต่ำ (คาบ/สัปดาห์)</label>
              <input
                type="number"
                value={settings.workloadLimits.minWeeklyPeriods}
                onChange={e => setSettings({ ...settings, workloadLimits: { ...settings.workloadLimits, minWeeklyPeriods: Number(e.target.value) } })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-emerald-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">ภาระงานสอนสูงสุดมาตรฐาน (คาบ/สัปดาห์)</label>
              <input
                type="number"
                value={settings.workloadLimits.maxWeeklyPeriods}
                onChange={e => setSettings({ ...settings, workloadLimits: { ...settings.workloadLimits, maxWeeklyPeriods: Number(e.target.value) } })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-amber-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">เพดานคาบสอนสูงสุดต่อวัน (คาบ/วัน)</label>
              <input
                type="number"
                value={settings.workloadLimits.maxDailyPeriods}
                onChange={e => setSettings({ ...settings, workloadLimits: { ...settings.workloadLimits, maxDailyPeriods: Number(e.target.value) } })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-purple-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">จำกัดคาบสอนติดกันสูงสุด (คาบ)</label>
              <input
                type="number"
                value={settings.workloadLimits.allowConsecutivePeriods}
                onChange={e => setSettings({ ...settings, workloadLimits: { ...settings.workloadLimits, allowConsecutivePeriods: Number(e.target.value) } })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Departments */}
      {activeTab === "DEPARTMENTS" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              BookOpen กลุ่มสาระการเรียนรู้ (Departments Management)
            </h2>
          </div>

          {/* Add New Department Form */}
          <form onSubmit={handleAddDepartment} className="flex flex-col md:flex-row items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
            <input
              type="text"
              placeholder="ชื่อกลุ่มสาระการเรียนรู้ใหม่..."
              value={newDeptName}
              onChange={e => setNewDeptName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
            <input
              type="text"
              placeholder="ชื่อหัวหน้ากลุ่มสาระ..."
              value={newDeptHead}
              onChange={e => setNewDeptHead(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold flex items-center gap-1 shrink-0"
            >
              <Plus className="w-4 h-4" /> เพิ่มกลุ่มสาระ
            </button>
          </form>

          {/* Departments Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3">รหัสกลุ่มสาระ</th>
                  <th className="p-3">ชื่อกลุ่มสาระการเรียนรู้</th>
                  <th className="p-3">หัวหน้ากลุ่มสาระ</th>
                  <th className="p-3 text-center">จำนวนครูในสังกัด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {settings.departments.map(dept => (
                  <tr key={dept.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-purple-600">{dept.id}</td>
                    <td className="p-3 font-bold">{dept.name}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{dept.headTeacher}</td>
                    <td className="p-3 text-center font-bold">{dept.teacherCount} ท่าน</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Classrooms */}
      {activeTab === "CLASSROOMS" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            🏢 จัดการชั้นเรียน และครูที่ปรึกษา (Classrooms & Advisors)
          </h2>

          {/* Add New Classroom Form */}
          <form onSubmit={handleAddClassroom} className="flex flex-col md:flex-row items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
            <input
              type="text"
              placeholder="ชื่อห้องเรียน (เช่น ม.3/2)..."
              value={newClassName}
              onChange={e => setNewClassName(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
            <select
              value={newClassLevel}
              onChange={e => setNewClassLevel(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
            >
              <option value="ม.ต้น">ช่วงชั้น ม.ต้น</option>
              <option value="ม.ปลาย">ช่วงชั้น ม.ปลาย</option>
            </select>
            <input
              type="text"
              placeholder="ชื่อครูที่ปรึกษา..."
              value={newClassAdvisor}
              onChange={e => setNewClassAdvisor(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold flex items-center gap-1 shrink-0"
            >
              <Plus className="w-4 h-4" /> เพิ่มห้องเรียน
            </button>
          </form>

          {/* Classrooms Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3">ชื่อห้องเรียน</th>
                  <th className="p-3">ช่วงชั้น</th>
                  <th className="p-3 text-center">จำนวนนักเรียน</th>
                  <th className="p-3">ครูที่ปรึกษา</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {settings.classrooms.map(cls => (
                  <tr key={cls.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-extrabold text-purple-600">{cls.name}</td>
                    <td className="p-3 font-semibold">{cls.level}</td>
                    <td className="p-3 text-center font-bold">{cls.studentCount} คน</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{cls.advisorTeacher}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Locked Activities */}
      {activeTab === "ACTIVITIES" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                🔒 กำหนดคาบล็อคกิจกรรมพัฒนาผู้เรียนส่วนกลาง
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                กำหนดคาบกิจกรรมประจำสัปดาห์ (ลูกเสือ/ชุมนุม/แนะแนว/สวดมนต์) ป้องกันไม่ให้ AI จัดตารางสอนวิชาอื่นลงแทรก
              </p>
            </div>
          </div>

          {/* Form to Add New Activity */}
          <form onSubmit={handleAddActivity} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">ชื่อกิจกรรม</label>
              <input
                type="text"
                value={newActName}
                onChange={(e) => setNewActName(e.target.value)}
                placeholder="เช่น กิจกรรมลูกเสือ"
                className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">วันทำการ</label>
              <select
                value={newActDay}
                onChange={(e) => setNewActDay(Number(e.target.value))}
                className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                <option value={0}>ทุกวันจันทร์ - ศุกร์</option>
                <option value={1}>วันจันทร์</option>
                <option value={2}>วันอังคาร</option>
                <option value={3}>วันพุธ</option>
                <option value={4}>วันพฤหัสบดี</option>
                <option value={5}>วันศุกร์</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">คาบเรียน</label>
              <select
                value={newActPeriod}
                onChange={(e) => setNewActPeriod(Number(e.target.value))}
                className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(p => (
                  <option key={p} value={p}>คาบที่ {p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">ขอบเขตผู้เรียน</label>
              <select
                value={newActScope}
                onChange={(e) => setNewActScope(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                <option value="ทั้งโรงเรียน">ทั้งโรงเรียน</option>
                <option value="ม.ต้น">ม.ต้น</option>
                <option value="ม.ปลาย">ม.ปลาย</option>
                <option value="ม.1">ม.1</option>
                <option value="ม.2">ม.2</option>
                <option value="ม.3">ม.3</option>
                <option value="ม.4">ม.4</option>
                <option value="ม.5">ม.5</option>
                <option value="ม.6">ม.6</option>
              </select>
            </div>
            <button
              type="submit"
              className="h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> เพิ่มกิจกรรม
            </button>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3">ชื่อกิจกรรม</th>
                  <th className="p-3">วันทำการ</th>
                  <th className="p-3 text-center">คาบเรียน</th>
                  <th className="p-3">ขอบเขตผู้เรียน</th>
                  <th className="p-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {settings.lockedActivities.map(act => (
                  <tr key={act.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-amber-600 dark:text-amber-400">{act.name}</td>
                    <td className="p-3 font-medium">{act.dayOfWeek === 0 ? "ทุกวันจันทร์ - ศุกร์" : `วัน${act.dayOfWeek === 1 ? "จันทร์" : act.dayOfWeek === 2 ? "อังคาร" : act.dayOfWeek === 3 ? "พุธ" : act.dayOfWeek === 4 ? "พฤหัสบดี" : "ศุกร์"}`}</td>
                    <td className="p-3 text-center font-bold">คาบที่ {act.periodIndex}</td>
                    <td className="p-3 font-semibold text-purple-600 dark:text-purple-400">{act.scope}</td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteActivity(act.id)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="ลบคาบล็อคกิจกรรม"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: Facility Management */}
      {activeTab === "FACILITY" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            🏢 ตั้งค่ารายการทรัพยากรกลางส่วนกลาง (Facilities Catalog)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            บริหารจัดการห้องประชุม รถโรงเรียน อุปกรณ์ส่วนกลาง และห้องปฏิบัติการสำหรับเปิดให้ครูและบุคลากรจองใช้งาน
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/50">
              <div className="text-xs font-bold text-teal-600 dark:text-teal-400 mb-1">ห้องประชุมส่วนกลาง</div>
              <div className="text-xl font-black text-slate-900 dark:text-white">3 ห้อง</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">พร้อมเครื่องเสียงและโปรเจกเตอร์</div>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/50">
              <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">ยานพาหนะโรงเรียน</div>
              <div className="text-xl font-black text-slate-900 dark:text-white">2 คัน</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">รถบัส และรถตู้ส่วนกลาง</div>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/50">
              <div className="text-xs font-bold text-purple-600 dark:text-purple-400 mb-1">อุปกรณ์การสอน & Lab</div>
              <div className="text-xl font-black text-slate-900 dark:text-white">5 ชุด</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">โน้ตบุ๊กเคลื่อนที่ & ชุดทดลอง</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: Exam Configuration */}
      {activeTab === "EXAM_CONFIG" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            📝 ตั้งค่าระบบสอบส่วนกลาง (Exam Configuration)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            กำหนดจำนวนโต๊ะสอบต่อห้อง, รูปแบบสลับผังที่นั่ง, และช่วงเวลาสอบประจำภาคเรียน
          </p>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-4 max-w-lg">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">จำนวนโต๊ะสอบมาตรฐานต่อห้อง</label>
              <input
                type="number"
                defaultValue={30}
                className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">รูปแบบผังที่นั่งป้องกันทุจริต</label>
              <select className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium">
                <option value="ALTERNATE">สลับชั้นเรียน (คละชั้น ม.1 และ ม.2)</option>
                <option value="RANDOM">สุ่มเลขที่นั่งสอบ</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: PA Guidelines */}
      {activeTab === "PA_GUIDELINES" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            🏆 ตั้งค่าเกณฑ์ PA & ชั่วโมงพัฒนาตนเอง PD (PA & Competency Guidelines)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            กำหนดเป้าหมายชั่วโมงพัฒนาตนเอง (PD Hours) ประจำปี และหลักเกณฑ์การประเมิน 5 ด้านตาม ก.ค.ศ.
          </p>

          <div className="p-4 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50 space-y-4 max-w-lg">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">เป้าหมายชั่วโมง PD ขั้นต่ำต่อปีการศึกษา</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  defaultValue={20}
                  className="w-32 h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                />
                <span className="text-xs text-slate-500 font-semibold">ชั่วโมง / ปี</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
