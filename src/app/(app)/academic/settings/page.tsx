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
  Plus
} from "lucide-react";
import { AcademicSettingsService } from "@/lib/services/academicSettingsService";

export default function AcademicSettingsPage() {
  const [settings, setSettings] = useState(AcademicSettingsService.getSettings());
  const [activeTab, setActiveTab] = useState<"YEAR_TIME" | "WORKLOAD" | "DEPARTMENTS" | "CLASSROOMS" | "ACTIVITIES">("YEAR_TIME");
  const [isSaved, setIsSaved] = useState(false);

  // New Department Form State
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptHead, setNewDeptHead] = useState("");

  // New Classroom Form State
  const [newClassName, setNewClassName] = useState("");
  const [newClassLevel, setNewClassLevel] = useState("ม.ต้น");
  const [newClassAdvisor, setNewClassAdvisor] = useState("");

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
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            🔒 กำหนดคาบล็อคกิจกรรมพัฒนาผู้เรียนส่วนกลาง
          </h2>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3">ชื่อกิจกรรม</th>
                  <th className="p-3">วันทำการ</th>
                  <th className="p-3 text-center">คาบเรียน</th>
                  <th className="p-3">ขอบเขตผู้เรียน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {settings.lockedActivities.map(act => (
                  <tr key={act.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-amber-600">{act.name}</td>
                    <td className="p-3">{act.dayOfWeek === 0 ? "ทุกวันจันทร์ - ศุกร์" : `วัน${act.dayOfWeek === 1 ? "จันทร์" : act.dayOfWeek === 3 ? "พุธ" : "พฤหัสบดี"}`}</td>
                    <td className="p-3 text-center font-bold">คาบที่ {act.periodIndex}</td>
                    <td className="p-3 font-semibold text-purple-600">{act.scope}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
