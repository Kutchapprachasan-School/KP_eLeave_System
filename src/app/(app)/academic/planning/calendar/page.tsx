"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Lock, 
  Clock, 
  ChevronRight, 
  ArrowLeft, 
  Trash2,
  CalendarDays,
  ExternalLink,
  X,
  CheckCircle2
} from "lucide-react";
import {
  schoolCalendarSyncService,
  CALENDAR_UPDATED_EVENT,
  type SchoolCalendarEvent,
} from "@/lib/services/schoolCalendarSync";
import {
  deleteSchoolCalendarEvent,
  saveSchoolCalendarEvent,
} from "@/app/actions/school-calendar";

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

const DEFAULT_EVENTS: AcademicEventItem[] = [
  { id: "acad-init-1", title: "วันเปิดภาคเรียนที่ 1/2569", eventType: "OPENING_DAY", startDate: "2026-05-16", endDate: "2026-05-16", locksTimetable: false, locksSupervision: false, description: "เปิดการเรียนการสอนวันแรกประจำภาคเรียนที่ 1" },
  { id: "acad-init-2", title: "สัปดาห์สอบกลางภาค (Midterm Exam)", eventType: "EXAM_WEEK", startDate: "2026-07-20", endDate: "2026-07-24", locksTimetable: true, locksSupervision: true, description: "งดตารางสอนปกติ ล็อกคาบเพื่อจัดตารางสอบกลางภาค" },
  { id: "acad-init-3", title: "กิจกรรมเข้าค่ายพักแรมลูกเสือ-เนตรนารี", eventType: "SCOUT_CAMP", startDate: "2026-08-12", endDate: "2026-08-14", locksTimetable: true, locksSupervision: false, description: "กิจกรรมพัฒนานักเรียน ม.2 และ ม.3" },
  { id: "acad-init-4", title: "สัปดาห์สอบปลายภาค (Final Exam)", eventType: "EXAM_WEEK", startDate: "2026-09-21", endDate: "2026-09-25", locksTimetable: true, locksSupervision: true, description: "งดตารางสอนปกติ จัดตารางสอบปลายภาคเรียนที่ 1" },
];

export default function CalendarDomainPage() {
  const [events, setEvents] = useState<AcademicEventItem[]>(DEFAULT_EVENTS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("ACADEMIC");
  const [startDate, setStartDate] = useState("2026-05-16");
  const [endDate, setEndDate] = useState("2026-05-16");
  const [locksTimetable, setLocksTimetable] = useState(false);
  const [locksSupervision, setLocksSupervision] = useState(false);
  const [description, setDescription] = useState("");

  const loadEvents = async () => {
    try {
      // ดึงกิจกรรมจากระบบปฏิทินกลางที่เชื่อมฐานข้อมูลเดียวกันกับ SMS
      const allEvents = await schoolCalendarSyncService.syncFromLeaveSystemHolidays(2569);
      if (allEvents && allEvents.length > 0) {
        // กรองกิจกรรมที่เป็นวิชาการหรือสอบ
        const mapped: AcademicEventItem[] = allEvents
          .filter((e) => e.category === "ACADEMIC" || e.category === "EXAM" || e.category === "STUDENT" || e.id.startsWith("acad-db-"))
          .map((e) => {
            const startStr = `${e.year - 543}-${String(e.month).padStart(2, "0")}-${String(e.day).padStart(2, "0")}`;
            const endYearCE = e.endYear ? e.endYear - 543 : e.year - 543;
            const endMonthStr = String(e.endMonth || e.month).padStart(2, "0");
            const endDayStr = String(e.endDay || e.day).padStart(2, "0");
            const endStr = `${endYearCE}-${endMonthStr}-${endDayStr}`;

            return {
              id: e.id,
              title: e.title,
              eventType: e.category === "EXAM" ? "EXAM_WEEK" : e.category === "STUDENT" ? "SCOUT_CAMP" : "ACADEMIC",
              startDate: startStr,
              endDate: endStr,
              locksTimetable: e.category === "EXAM",
              locksSupervision: false,
              description: e.description || "",
            };
          });

        if (mapped.length > 0) {
          // กำจัดรายการซ้ำโดยอิงตาม id และ title
          const seen = new Set<string>();
          const deduped: AcademicEventItem[] = [];
          for (const item of mapped) {
            const key = `${item.title}-${item.startDate}-${item.endDate}`;
            if (!seen.has(key)) {
              seen.add(key);
              deduped.push(item);
            }
          }
          setEvents(deduped);
          return;
        }
      }
    } catch (err) {
      console.warn("Failed to load academic events from sync service:", err);
    }
  };

  useEffect(() => {
    loadEvents();

    const handleUpdate = () => {
      loadEvents();
    };

    window.addEventListener(CALENDAR_UPDATED_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(CALENDAR_UPDATED_EVENT, handleUpdate);
    };
  }, []);

  const handleDelete = async (id: string, eventTitle: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรมวิชาการ "${eventTitle}" ออกจากระบบ?`)) {
      return;
    }

    setIsDeleting(id);
    try {
      // ลบทั้งใน Client State และ Server Database
      await schoolCalendarSyncService.deleteEventAsync(id);
      await deleteSchoolCalendarEvent(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error("Failed to delete event:", err);
      alert("เกิดข้อผิดพลาดในการลบกิจกรรม");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const startParts = startDate.split("-").map(Number);
      const endParts = endDate.split("-").map(Number);
      const yearBE = startParts[0] + 543;
      const month = startParts[1];
      const day = startParts[2];
      const endYearBE = endParts[0] + 543;
      const endMonth = endParts[1];
      const endDay = endParts[2];

      const category = eventType === "EXAM_WEEK" ? "EXAM" : eventType === "SCOUT_CAMP" ? "STUDENT" : "ACADEMIC";

      const res = await saveSchoolCalendarEvent({
        day,
        month,
        year: yearBE,
        endDay,
        endMonth,
        endYear: endYearBE,
        title: title.trim(),
        category,
        colorType: category === "EXAM" ? "ORANGE" : "PURPLE",
        targetRole: "ALL",
        isAllDay: true,
        description: description.trim() || undefined,
      });

      if (res.success) {
        setIsModalOpen(false);
        setTitle("");
        setDescription("");
        await loadEvents();
      } else {
        alert(res.error || "เกิดข้อผิดพลาดในการบันทึกกิจกรรม");
      }
    } catch (err) {
      console.error("Failed to create academic event:", err);
      alert("เกิดข้อผิดพลาดในการสร้างกิจกรรม");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-6 text-slate-900 dark:text-slate-100">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400">
          <Link href="/academic/planning" className="hover:underline flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Academic Planning Platform
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span>Academic Calendar Engine</span>
        </div>

        <Link
          href="/calendar"
          className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-purple-600 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
        >
          <CalendarDays className="w-3.5 h-3.5 text-purple-600" />
          <span>ดูปฏิทินสถานศึกษาฉบับเต็ม</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            ปฏิทินวิชาการ & เหตุการณ์ล็อกตาราง (Academic Calendar Engine)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ศูนย์กลางปฏิทินวิชาการโรงเรียน กำหนดวันเปิด-ปิดภาคเรียน วันสอบ ค่ายลูกเสือ กีฬาสี ที่ระบบตารางสอน ตารางสอบ นิเทศ และสอนแทนอ้างอิงร่วมกัน (ใช้ฐานข้อมูลเดียวกันกับระบบ SMS)
          </p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          เพิ่มเหตุการณ์วิชาการ
        </button>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {events.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-sm">
            ไม่พบเหตุการณ์วิชาการในขณะนี้
          </div>
        ) : (
          events.map((ev) => (
            <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:shadow-md transition">
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
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {ev.description || "ไม่มีคำอธิบายเพิ่มเติม"}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-wrap gap-2">
                  {ev.locksTimetable && (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold text-[10px] flex items-center gap-1">
                      <Lock className="w-3 h-3" /> ล็อกตารางสอนปกติ
                    </span>
                  )}
                  {ev.locksSupervision && (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px] flex items-center gap-1">
                      <Lock className="w-3 h-3" /> งดการนิเทศการสอน
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isDeleting === ev.id}
                  onClick={() => handleDelete(ev.id, ev.title)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer disabled:opacity-50"
                  title="ลบเหตุการณ์นี้"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-600" />
                เพิ่มเหตุการณ์วิชาการใหม่
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-slate-700 dark:text-slate-300 font-bold">ชื่อเหตุการณ์ / กำหนดการ *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น สัปดาห์สอบปลายภาคเรียนที่ 1"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-bold">วันเริ่มต้น *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 dark:text-slate-300 font-bold">วันสิ้นสุด *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 dark:text-slate-300 font-bold">ประเภทเหตุการณ์</label>
                <select
                  value={eventType}
                  onChange={(e) => {
                    setEventType(e.target.value);
                    if (e.target.value === "EXAM_WEEK") {
                      setLocksTimetable(true);
                      setLocksSupervision(true);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ACADEMIC">วันเปิด/ปิดภาคเรียน หรือกิจกรรมวิชาการ (ACADEMIC)</option>
                  <option value="EXAM_WEEK">สัปดาห์สอบกลางภาค / ปลายภาค (EXAM_WEEK)</option>
                  <option value="SCOUT_CAMP">กิจกรรมเข้าค่าย / กีฬาสี (SCOUT_CAMP)</option>
                  <option value="HOLIDAY">วันหยุดสถานศึกษา (HOLIDAY)</option>
                </select>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={locksTimetable}
                    onChange={(e) => setLocksTimetable(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span>ล็อกตารางสอนปกติ (งดการเรียนการสอนปกติในคาบนี้)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={locksSupervision}
                    onChange={(e) => setLocksSupervision(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span>งดการนิเทศการสอน / สังเกตชั้นเรียน</span>
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 dark:text-slate-300 font-bold">รายละเอียดเพิ่มเติม</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="เช่น งดตารางสอนปกติ ล็อกคาบเพื่อจัดตารางสอบกลางภาค"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition shadow cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "กำลังบันทึก..." : "บันทึกเหตุการณ์"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
