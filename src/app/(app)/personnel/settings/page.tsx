"use client";

import React, { useState } from "react";
import { Users, Clock, Award, Save, Check, Shield, UserCheck, Calendar } from "lucide-react";
import { useToast } from "@/components/toast-provider";

export default function PersonnelSettingsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"PA_TARGET" | "ATTENDANCE_CONFIG" | "ROLES">("PA_TARGET");
  const [isSaved, setIsSaved] = useState(false);

  // Form States
  const [targetPdHours, setTargetPdHours] = useState(20);
  const [geofenceRadiusMeters, setGeofenceRadiusMeters] = useState(500);
  const [checkInStartTime, setCheckInStartTime] = useState("07:00");
  const [checkInEndTime, setCheckInEndTime] = useState("08:30");

  const handleSave = () => {
    setIsSaved(true);
    showToast("success", "บันทึกการตั้งค่าฝ่ายบุคคลสำเร็จ");
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-6 text-slate-900 dark:text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            การตั้งค่าฝ่ายบุคคล (Personnel & HR Settings)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            กำหนดเกณฑ์ PA, เป้าหมายชั่วโมงพัฒนาตนเอง (PD), ขอบเขต Geofence การลงเวลา และการจัดการสิทธิ์บุคลากร
          </p>
        </div>

        <button
          onClick={handleSave}
          className="h-10 px-5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-md shadow-rose-600/20"
        >
          {isSaved ? <Check className="w-4 h-4 text-emerald-200" /> : <Save className="w-4 h-4" />}
          {isSaved ? "บันทึกตั้งค่าแล้ว!" : "บันทึกการตั้งค่า"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab("PA_TARGET")}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            activeTab === "PA_TARGET" ? "bg-rose-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <Award className="w-4 h-4" />
          เกณฑ์ PA & ชั่วโมง PD
        </button>

        <button
          onClick={() => setActiveTab("ATTENDANCE_CONFIG")}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            activeTab === "ATTENDANCE_CONFIG" ? "bg-rose-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <Clock className="w-4 h-4" />
          ตั้งค่าการลงเวลาปฏิบัติราชการ
        </button>

        <button
          onClick={() => setActiveTab("ROLES")}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            activeTab === "ROLES" ? "bg-rose-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <Shield className="w-4 h-4" />
          กำหนดบทบาทและสิทธิ์บุคลากร
        </button>
      </div>

      {/* Tab 1: PA & PD */}
      {activeTab === "PA_TARGET" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 max-w-3xl">
          <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center gap-2">
            🏆 เกณฑ์ข้อตกลง PA และชั่วโมงพัฒนาตนเอง (PD Hours)
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                เป้าหมายชั่วโมงพัฒนาตนเอง (PD Hours Target) ประจำปีการศึกษา
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={targetPdHours}
                  onChange={(e) => setTargetPdHours(Number(e.target.value))}
                  className="w-32 h-10 px-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                />
                <span className="text-xs font-semibold text-slate-500">ชั่วโมง / ปีการศึกษา (ตามเกณฑ์ ก.ค.ศ.)</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50 text-xs space-y-2">
              <div className="font-bold text-rose-700 dark:text-rose-300">📌 มิติการประเมินสมรรถนะครู 5 ด้าน</div>
              <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-1">
                <li>การจัดการเรียนรู้และการพัฒนาหลักสูตร</li>
                <li>การบริหารจัดการชั้นเรียนและสิ่งแวดล้อม</li>
                <li>การพัฒนาตนเองและพัฒนาวิชาชีพ (PD Hours)</li>
                <li>การทำงานร่วมกับผู้ปกครองและชุมชน</li>
                <li>จรรยาบรรณวิชาชีพและคุณธรรมจริยธรรม</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Attendance Config */}
      {activeTab === "ATTENDANCE_CONFIG" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 max-w-3xl">
          <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center gap-2">
            ⏰ กำหนดเกณฑ์ลงเวลาปฏิบัติราชการ (GPS & Shift Times)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">เวลาเริ่มบันทึกเข้างานปกติ</label>
              <input
                type="time"
                value={checkInStartTime}
                onChange={(e) => setCheckInStartTime(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">เวลานับการเข้างานสาย (Late Threshold)</label>
              <input
                type="time"
                value={checkInEndTime}
                onChange={(e) => setCheckInEndTime(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">รัศมี Geofence GPS รอบสถานศึกษา</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={geofenceRadiusMeters}
                  onChange={(e) => setGeofenceRadiusMeters(Number(e.target.value))}
                  className="w-32 h-10 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                />
                <span className="text-xs font-semibold text-slate-500">เมตร (Meters)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Roles & Permissions */}
      {activeTab === "ROLES" && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 max-w-3xl">
          <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center gap-2">
            🛡️ จัดการบทบาทและสิทธิ์การเข้าถึงข้อมูลบุคลากร
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            กำหนดระดับสิทธิ์สำหรับผู้บริหาร หัวหน้าฝ่ายงาน และครูผู้สอนในระบบจัดการบุคลากร
          </p>
          <a
            href="/users"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
          >
            <UserCheck className="w-4 h-4 text-rose-600" /> ไปยังหน้ารายชื่อและจัดการบุคลากรทั้งหมด ›
          </a>
        </div>
      )}
    </div>
  );
}
