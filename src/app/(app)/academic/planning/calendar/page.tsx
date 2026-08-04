"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Lock, 
  Clock, 
  ChevronRight, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2,
  Bookmark
} from "lucide-react";

interface AcademicEventItem {
  id: string;
  title: string;
  eventType: string;
  startDate: string;
  endDate: string;
  locksTimetable: boolean;
  locksSupervision: boolean;
  description: string;
}

const EVENTS_DATA: AcademicEventItem[] = [
  { id: "e1", title: "วันเปิดภาคเรียนที่ 1/2569", eventType: "OPENING_DAY", startDate: "2026-05-16", endDate: "2026-05-16", locksTimetable: false, locksSupervision: false, description: "เปิดการเรียนการสอนวันแรกประจำภาคเรียนที่ 1" },
  { id: "e2", title: "สัปดาห์สอบกลางภาค (Midterm Exam)", eventType: "EXAM_WEEK", startDate: "2026-07-20", endDate: "2026-07-24", locksTimetable: true, locksSupervision: true, description: "งดตารางสอนปกติ ล็อกคาบเพื่อจัดตารางสอบกลางภาค" },
  { id: "e3", title: "กิจกรรมเข้าค่ายพักแรมลูกเสือ-เนตรนารี", eventType: "SCOUT_CAMP", startDate: "2026-08-12", endDate: "2026-08-14", locksTimetable: true, locksSupervision: false, description: "กิจกรรมพัฒนานักเรียน ม.2 และ ม.3" },
  { id: "e4", title: "สัปดาห์สอบปลายภาค (Final Exam)", eventType: "EXAM_WEEK", startDate: "2026-09-21", endDate: "2026-09-25", locksTimetable: true, locksSupervision: true, description: "งดตารางสอนปกติ จัดตารางสอบปลายภาคเรียนที่ 1" },
];

export default function CalendarDomainPage() {
  const [events, setEvents] = useState<AcademicEventItem[]>(EVENTS_DATA);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-6 text-slate-900 dark:text-slate-100">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400 border-b border-slate-200 dark:border-slate-800 pb-4">
        <Link href="/academic/planning" className="hover:underline flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Academic Planning Platform
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span>Academic Calendar Engine</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            ปฏิทินวิชาการ & เหตุการณ์ล็อกตาราง (Academic Calendar Engine)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ศูนย์กลางปฏิทินวิชาการโรงเรียน กำหนดวันเปิด-ปิดภาคเรียน วันสอบ ค่ายลูกเสือ กีฬาสี ที่ระบบตารางสอน ตารางสอบ นิเทศ และสอนแทนอ้างอิงร่วมกัน
          </p>
        </div>

        <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center gap-2">
          <Plus className="w-4 h-4" />
          เพิ่มเหตุการณ์วิชาการ
        </button>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {events.map((ev) => (
          <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                {ev.eventType}
              </span>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Clock className="w-4 h-4 text-slate-400" />
                {ev.startDate} ถึง {ev.endDate}
              </div>
            </div>

            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{ev.title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{ev.description}</p>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {ev.locksTimetable && (
                <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold text-[10px] flex items-center gap-1">
                  <Lock className="w-3 h-3" /> ล็อกตารางสอนปกติ (Timetable Locked)
                </span>
              )}
              {ev.locksSupervision && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px] flex items-center gap-1">
                  <Lock className="w-3 h-3" /> งดการนิเทศการสอน (Supervision Locked)
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
