"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Calendar, ArrowRight, ChevronLeft, ChevronRight, MapPin, Clock } from "lucide-react";
import {
  schoolCalendarSyncService,
  CALENDAR_UPDATED_EVENT,
  type SchoolCalendarEvent,
} from "@/lib/services/schoolCalendarSync";

interface SMSAcademicCalendarCardProps {
  onViewAll?: () => void;
}

const THAI_MONTH_NAMES = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export default function SMSAcademicCalendarCard({
  onViewAll,
}: SMSAcademicCalendarCardProps) {
  // เริ่มต้นที่วัน เดือน และปีปัจจุบันจริง
  const [currentMonth, setCurrentMonth] = useState<number>(() => {
    return new Date().getMonth() + 1;
  });
  const [currentYear, setCurrentYear] = useState<number>(() => {
    return new Date().getFullYear() + 543;
  });
  const [events, setEvents] = useState<SchoolCalendarEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    return new Date().getDate();
  });

  useEffect(() => {
    // ล้างข้อมูลจำลองเก่าที่อาจตกค้างในเบราว์เซอร์อัตโนมัติ
    schoolCalendarSyncService.purgeAllMockData();
    setEvents(schoolCalendarSyncService.getEvents());

    const handleUpdate = () => {
      setEvents(schoolCalendarSyncService.getEvents());
    };

    window.addEventListener(CALENDAR_UPDATED_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(CALENDAR_UPDATED_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // คำนวณวันในเดือนและวันในสัปดาห์
  const calendarMatrix = useMemo(() => {
    // แปลง พ.ศ. เป็น ค.ศ. สำหรับคำนวณ Date
    const gregorianYear = currentYear - 543;
    const firstDayOfWeek = new Date(gregorianYear, currentMonth - 1, 1).getDay(); // 0 = อา, 1 = จ, ...
    const daysInMonth = new Date(gregorianYear, currentMonth, 0).getDate();
    const daysInPrevMonth = new Date(gregorianYear, currentMonth - 1, 0).getDate();

    const cells: Array<{
      day: number;
      isCurrentMonth: boolean;
      events: SchoolCalendarEvent[];
    }> = [];

    // เติมวันจากเดือนก่อนหน้า
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      cells.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        events: [],
      });
    }

    // เติมวันของเดือนปัจจุบัน
    for (let d = 1; d <= daysInMonth; d++) {
      const dayEvents = events.filter(
        (e) => e.year === currentYear && e.month === currentMonth && e.day === d
      );
      cells.push({
        day: d,
        isCurrentMonth: true,
        events: dayEvents,
      });
    }

    // เติมวันจากเดือนถัดไปให้เต็มสัปดาห์
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        day: i,
        isCurrentMonth: false,
        events: [],
      });
    }

    return cells;
  }, [currentMonth, currentYear, events]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // ดึงกิจกรรมของวันที่เลือก
  const selectedDateEvents = useMemo(() => {
    return events.filter(
      (e) => e.year === currentYear && e.month === currentMonth && e.day === selectedDay
    );
  }, [events, currentYear, currentMonth, selectedDay]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-50 dark:border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <h2 className="text-[15px] font-bold text-slate-800 dark:text-white">
              ปฏิทินกิจกรรมโรงเรียน
            </h2>
          </div>

          <Link
            href="/calendar"
            className="flex items-center gap-1 text-[11.5px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 cursor-pointer transition-colors"
          >
            <span>ดูทั้งหมด</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Month Selector */}
        <div className="flex items-center justify-between my-3 px-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs sm:text-[13px] font-bold text-slate-800 dark:text-slate-100">
            {THAI_MONTH_NAMES[currentMonth - 1]} {currentYear}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Weekday Labels */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1.5">
          {WEEKDAYS.map((wd, idx) => (
            <div
              key={wd}
              className={idx === 0 ? "text-rose-400" : idx === 6 ? "text-purple-400" : ""}
            >
              {wd}
            </div>
          ))}
        </div>

        {/* Dynamic Days Grid */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {calendarMatrix.map((item, idx) => {
            const isSelected = item.isCurrentMonth && selectedDay === item.day;
            const hasEvent = item.events.length > 0;
            const isToday =
              item.isCurrentMonth &&
              item.day === 2 &&
              currentMonth === 10 &&
              currentYear === 2569;

            let dotColor = "bg-blue-500";
            if (hasEvent) {
              const firstEv = item.events[0];
              if (firstEv.colorType === "GREEN") dotColor = "bg-emerald-500";
              else if (firstEv.colorType === "RED") dotColor = "bg-rose-500";
              else if (firstEv.colorType === "PURPLE") dotColor = "bg-purple-500";
              else if (firstEv.colorType === "ORANGE") dotColor = "bg-amber-500";
            }

            return (
              <button
                key={`${item.day}-${idx}`}
                type="button"
                onClick={() => {
                  if (item.isCurrentMonth) setSelectedDay(item.day);
                }}
                className={`relative h-8 rounded-lg flex flex-col items-center justify-center font-medium transition-all ${
                  !item.isCurrentMonth
                    ? "text-slate-300 dark:text-slate-600 cursor-default"
                    : isSelected
                    ? "bg-blue-600 text-white font-bold shadow-xs cursor-pointer"
                    : isToday
                    ? "border border-blue-500 text-blue-600 font-bold hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                }`}
              >
                <span>{item.day}</span>
                {hasEvent && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full absolute bottom-1 ${
                      isSelected ? "bg-white" : dotColor
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Event Summary */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="text-[11px] font-bold text-slate-500 mb-1.5 flex items-center justify-between">
          <span>กิจกรรมวันที่ {selectedDay} {THAI_MONTH_NAMES[currentMonth - 1]}:</span>
          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
            {selectedDateEvents.length} รายการ
          </span>
        </div>

        <div className="space-y-1.5 max-h-24 overflow-y-auto custom-scrollbar">
          {selectedDateEvents.map((ev) => (
            <div
              key={ev.id}
              className="text-xs bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl flex items-center justify-between gap-2 border border-slate-100 dark:border-slate-800"
            >
              <div className="min-w-0">
                <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {ev.title}
                </div>
                {ev.location && (
                  <div className="text-[10.5px] text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{ev.location}</span>
                  </div>
                )}
              </div>
              {ev.time && (
                <span className="text-[10px] font-medium text-slate-500 bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded-md shrink-0 border border-slate-200/50">
                  {ev.time}
                </span>
              )}
            </div>
          ))}

          {selectedDateEvents.length === 0 && (
            <div className="text-center py-2 text-[11px] text-slate-400">
              ไม่มีกิจกรรมในวันนี้
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
