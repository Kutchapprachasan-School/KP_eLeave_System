"use client";

import React, { useState, useMemo } from "react";
import {
  Building,
  Bus,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Search,
  Filter,
  Users,
  MapPin,
  Lock,
  Eye,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import {
  toThaiDateString,
  toThaiTimeString,
  formatISODateInput,
  getThaiMonthYear,
  type ModuleMode
} from "./facility-shared";
import { MatrixShell, StatusPillBadge } from "@/components/shared-ui/school-ops";

type CalendarViewMode = "WEEK" | "MONTH" | "DAY";
type ResourceFilter = "ALL" | "MEETING_ROOM" | "VEHICLE";

// Hourly range for Day matrix (08:00 - 17:00)
const MATRIX_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16];

interface FacilityUnifiedCalendarProps {
  resources: any[];
  reservations: any[];
  onSelectSlot?: (resource: any, date: Date, hour?: number) => void;
  onSelectReservation?: (reservation: any) => void;
}

export default function FacilityUnifiedCalendar({
  resources,
  reservations,
  onSelectSlot,
  onSelectReservation
}: FacilityUnifiedCalendarProps) {
  // 1. Controls State
  const [viewMode, setViewMode] = useState<CalendarViewMode>("MONTH"); // Default is MONTH with day drilldown!
  const [resourceFilter, setResourceFilter] = useState<ResourceFilter>("ALL"); // Default is ALL
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");

  // Filtered Resources
  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      if (resourceFilter !== "ALL" && r.type !== resourceFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.name?.toLowerCase().includes(q) ||
          r.code?.toLowerCase().includes(q) ||
          r.location?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [resources, resourceFilter, searchQuery]);

  // Filtered Reservations
  const filteredReservations = useMemo(() => {
    return reservations.filter((b) => {
      if (b.status === "CANCELLED" || b.status === "REJECTED") return false;
      if (resourceFilter !== "ALL" && b.consumerModule !== resourceFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          b.title?.toLowerCase().includes(q) ||
          b.resource?.name?.toLowerCase().includes(q) ||
          b.reservedByUser?.name?.toLowerCase().includes(q) ||
          b.vehicleDetails?.destination?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [reservations, resourceFilter, searchQuery]);

  // Navigation Handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === "DAY") {
      next.setDate(next.getDate() - 1);
    } else if (viewMode === "WEEK") {
      next.setDate(next.getDate() - 7);
    } else if (viewMode === "MONTH") {
      next.setMonth(next.getMonth() - 1);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === "DAY") {
      next.setDate(next.getDate() + 1);
    } else if (viewMode === "WEEK") {
      next.setDate(next.getDate() + 7);
    } else if (viewMode === "MONTH") {
      next.setMonth(next.getMonth() + 1);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Week Days Calculation (Monday to Sunday)
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const dayOfWeek = curr.getDay(); // 0 is Sunday, 1 is Monday...
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + distanceToMonday);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  // Month Days Calculation (6-week grid)
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDay.getDay(); // 0 is Sun, 1 is Mon...
    const distanceToMonday = startDayOfWeek === 0 ? -6 : 1 - startDayOfWeek;
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() + distanceToMonday);

    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      days.push({
        date: d,
        isCurrentMonth: d.getMonth() === month
      });
      // Break early if we've passed the end of the month and completed the week
      if (d > lastDay && d.getDay() === 0) break;
    }
    return days;
  }, [currentDate]);

  // Day Bookings for Day View
  const dayBookings = useMemo(() => {
    const currentIsoStr = formatISODateInput(currentDate);
    return filteredReservations.filter((res) => {
      const resStartStr = formatISODateInput(new Date(res.startAt));
      const resEndStr = formatISODateInput(new Date(res.endAt));
      return resStartStr <= currentIsoStr && currentIsoStr <= resEndStr;
    });
  }, [filteredReservations, currentDate]);

  const thaiDaysShort = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

  return (
    <div className="space-y-4">
      {/* 1. Header Toolbar & Filters */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left: Navigation Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={handlePrev}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                title="ก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleToday}
                className="px-3 py-1 text-xs font-bold rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
              >
                วันนี้
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                title="ถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Current Period Label */}
            <div className="font-bold text-sm sm:text-base text-slate-900 dark:text-white px-2">
              {viewMode === "DAY" && toThaiDateString(currentDate, true)}
              {viewMode === "WEEK" && (
                <span>
                  {toThaiDateString(weekDays[0])} – {toThaiDateString(weekDays[6])}
                </span>
              )}
              {viewMode === "MONTH" && getThaiMonthYear(currentDate)}
            </div>

            <input
              type="date"
              value={formatISODateInput(currentDate)}
              onChange={(e) => e.target.value && setCurrentDate(new Date(e.target.value))}
              className="h-9 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300"
            />
          </div>

          {/* Right: Filters & View Switchers */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Resource Type Dropdown Filter */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl text-xs font-semibold">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={resourceFilter}
                onChange={(e) => setResourceFilter(e.target.value as ResourceFilter)}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">ทรัพยากร: ทั้งหมด (ห้อง + รถ)</option>
                <option value="MEETING_ROOM">เฉพาะห้องประชุม</option>
                <option value="VEHICLE">เฉพาะรถโรงเรียน</option>
              </select>
            </div>

            {/* View Mode Segmented Controls (Week default) */}
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                onClick={() => setViewMode("MONTH")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "MONTH"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                เดือน
              </button>
              <button
                onClick={() => setViewMode("WEEK")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "WEEK"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                สัปดาห์
              </button>
              <button
                onClick={() => setViewMode("DAY")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "DAY"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                วัน
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative min-w-[160px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหา..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs pt-1 text-slate-500 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span>ห้องประชุม</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>รถโรงเรียน</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-amber-400" />
            <span>รออนุมัติ (ล็อกคิว)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-purple-600" />
            <span>อนุมัติแล้ว</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. VIEW MODE 1: WEEK VIEW (DEFAULT)                       */}
      {/* ========================================================= */}
      {viewMode === "WEEK" && (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {weekDays.map((day, idx) => {
              const dayIsoStr = formatISODateInput(day);
              const isToday = formatISODateInput(new Date()) === dayIsoStr;
              
              // Bookings on this day
              const dayItems = filteredReservations.filter((r) => {
                const startStr = formatISODateInput(new Date(r.startAt));
                const endStr = formatISODateInput(new Date(r.endAt));
                return startStr <= dayIsoStr && dayIsoStr <= endStr;
              });

              return (
                <div
                  key={dayIsoStr}
                  className={`flex flex-col rounded-2xl border transition ${
                    dayItems.length === 0
                      ? "min-h-0 md:min-h-[360px] p-2.5 md:p-3 bg-slate-50/40 dark:bg-slate-800/20 border-slate-200/60 dark:border-slate-800/60 opacity-90 hover:opacity-100"
                      : "min-h-[140px] md:min-h-[380px] p-3 " +
                        (isToday
                          ? "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/60 shadow-xs"
                          : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/80 dark:border-slate-800 hover:border-slate-300")
                  }`}
                >
                  {/* Day Header */}
                  <div className={`flex items-center justify-between ${dayItems.length === 0 ? "border-b-0 md:border-b md:border-slate-200/60 md:dark:border-slate-700/60 md:pb-2 md:mb-2" : "border-b border-slate-200/60 dark:border-slate-700/60 pb-2 mb-2"}`}>
                    <div className="flex items-center gap-2 md:block">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {thaiDaysShort[idx]}
                      </span>
                      <div className={`text-base font-bold font-mono ${isToday ? "text-indigo-600 dark:text-indigo-400" : "text-slate-900 dark:text-white"}`}>
                        {day.getDate()}
                      </div>
                      {dayItems.length === 0 && (
                        <span className="md:hidden text-[11px] text-slate-400 italic ml-1.5">
                          ไม่มีคิวจอง
                        </span>
                      )}
                    </div>
                    {isToday && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                        วันนี้
                      </span>
                    )}
                  </div>

                  {/* Day Booking Cards */}
                  <div className={`flex-1 space-y-2 overflow-y-auto max-h-[480px] custom-scrollbar ${dayItems.length === 0 ? "hidden md:block" : ""}`}>
                    {dayItems.length === 0 ? (
                      <div className="h-24 flex items-center justify-center text-[11px] text-slate-400 italic">
                        ไม่มีคิวจอง
                      </div>
                    ) : (
                      dayItems.map((item) => {
                        const isRoom = item.consumerModule === "MEETING_ROOM";
                        const isApproved = item.status === "APPROVED" || item.status === "IN_USE";

                        return (
                          <div
                            key={item.id}
                            onClick={() => onSelectReservation && onSelectReservation(item)}
                            className={`p-2.5 rounded-xl text-xs space-y-1 transition cursor-pointer border ${
                              isApproved
                                ? isRoom
                                  ? "bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-100 hover:bg-indigo-100/90"
                                  : "bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100 hover:bg-emerald-100/90"
                                : "bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100 hover:bg-amber-100/90"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                isRoom
                                  ? "bg-indigo-200/70 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200"
                                  : "bg-emerald-200/70 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200"
                              }`}>
                                {isRoom ? <Building className="w-3 h-3" /> : <Bus className="w-3 h-3" />}
                                {item.resource?.code || (isRoom ? "ห้อง" : "รถ")}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                {toThaiTimeString(item.startAt)}
                              </span>
                            </div>

                            <div className="font-bold line-clamp-2 leading-tight">
                              {item.title}
                            </div>

                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {item.reservedByUser?.name || "ครู"}
                            </div>

                            {!isApproved && (
                              <div className="text-[9px] font-bold text-amber-600 dark:text-amber-400">
                                ⏳ รออนุมัติ
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* 1-Click Action at bottom of each day */}
                  <div className="pt-2 border-t border-slate-200/40 dark:border-slate-700/40 mt-auto">
                    <button
                      onClick={() => onSelectSlot && onSelectSlot(null, day)}
                      className="w-full py-1 px-2 rounded-lg bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1 transition"
                    >
                      <Plus className="w-3 h-3" /> จองวันนี้
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. VIEW MODE 2: MONTH VIEW                                */}
      {/* ========================================================= */}
      {viewMode === "MONTH" && (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-x-auto">
          {/* Day Names Header */}
          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
            {["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"].map((name) => (
              <div key={name} className="py-2">
                {name}
              </div>
            ))}
          </div>

          {/* Month Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {monthDays.map(({ date, isCurrentMonth }) => {
              const dayIsoStr = formatISODateInput(date);
              const isToday = formatISODateInput(new Date()) === dayIsoStr;
              const items = filteredReservations.filter((r) => {
                const startStr = formatISODateInput(new Date(r.startAt));
                const endStr = formatISODateInput(new Date(r.endAt));
                return startStr <= dayIsoStr && dayIsoStr <= endStr;
              });

              return (
                <div
                  key={dayIsoStr}
                  onClick={() => {
                    setCurrentDate(date);
                    setViewMode("DAY");
                  }}
                  title={`คลิกเพื่อดูตารางรายชั่วโมงวันที่ ${toThaiDateString(date)}`}
                  className={`min-h-[110px] p-2 rounded-2xl border transition flex flex-col cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-xs group ${
                    !isCurrentMonth
                      ? "opacity-40 bg-slate-50/30 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800"
                      : isToday
                      ? "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-700/60 shadow-2xs"
                      : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/80 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold font-mono group-hover:text-indigo-600 transition ${isToday ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300"}`}>
                      {date.getDate()}
                    </span>
                    {items.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 group-hover:bg-indigo-100 group-hover:text-indigo-700 transition">
                        {items.length}
                      </span>
                    )}
                  </div>

                  {/* Chips */}
                  <div className="space-y-1 flex-1 overflow-hidden">
                    {items.slice(0, 3).map((item) => {
                      const isRoom = item.consumerModule === "MEETING_ROOM";
                      return (
                        <div
                          key={item.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSelectReservation) onSelectReservation(item);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] truncate font-medium cursor-pointer transition ${
                            isRoom
                              ? "bg-indigo-100/80 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-200"
                              : "bg-emerald-100/80 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-200"
                          }`}
                          title={`${item.title} (${item.resource?.name})`}
                        >
                          {isRoom ? "🏢 " : "🚐 "}
                          {item.title}
                        </div>
                      );
                    })}
                    {items.length > 3 && (
                      <div className="text-[9px] text-slate-500 font-semibold px-1">
                        +{items.length - 3} รายการเพิ่มเติม
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. VIEW MODE 3: DAY VIEW (HOURLY MATRIX)                  */}
      {/* ========================================================= */}
      {viewMode === "DAY" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                📅 ตารางรายชั่วโมง: วันที่ {toThaiDateString(currentDate)}
              </span>
            </div>
            <button
              onClick={() => setViewMode("MONTH")}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 flex items-center gap-1 transition cursor-pointer"
            >
              ← กลับสู่ปฏิทินรายเดือน
            </button>
          </div>

          {filteredResources.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
              ไม่พบทรัพยากรตามเงื่อนไขที่ค้นหา
            </div>
          ) : (
            <MatrixShell>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3 w-24 text-center font-mono text-slate-500 border-r border-slate-200 dark:border-slate-700">
                      ช่วงเวลา
                    </th>
                    {filteredResources.map((res) => (
                      <th
                        key={res.id}
                        className="p-3 text-left min-w-[190px] border-r border-slate-200 dark:border-slate-700 last:border-r-0"
                      >
                        <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                          <span className="truncate">{res.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700 font-semibold ml-1">
                            {res.code}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-normal mt-0.5 flex items-center gap-1">
                          {res.type === "MEETING_ROOM" ? (
                            <span>{res.capacity ? `${res.capacity} ที่นั่ง` : "-"} • {res.roomProfile?.floor || res.location || "ชั้น 1"}</span>
                          ) : (
                            <span>{res.vehicleProfile?.licensePlate || "-"} • {res.capacity || 12} ที่นั่ง</span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {MATRIX_HOURS.map((hour) => {
                    const hourStart = new Date(currentDate);
                    hourStart.setHours(hour, 0, 0, 0);
                    const hourEnd = new Date(currentDate);
                    hourEnd.setHours(hour + 1, 0, 0, 0);

                    const timeLabel = `${String(hour).padStart(2, "0")}:00 - ${String(hour + 1).padStart(2, "0")}:00`;

                    return (
                      <tr key={hour} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition">
                        <td className="p-2.5 text-center font-mono font-medium text-slate-500 border-r border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/30 whitespace-nowrap">
                          {timeLabel}
                        </td>

                        {filteredResources.map((res) => {
                          if (res.status !== "AVAILABLE") {
                            return (
                              <td
                                key={res.id}
                                className="p-2 border-r border-slate-200 dark:border-slate-700 last:border-r-0 bg-slate-100/60 dark:bg-slate-800/40 text-slate-400 text-center text-[11px]"
                              >
                                <span className="inline-flex items-center gap-1">
                                  <Lock className="w-3 h-3" /> {res.status === "UNDER_MAINTENANCE" ? "ปิดซ่อมบำรุง" : "ไม่พร้อมใช้"}
                                </span>
                              </td>
                            );
                          }

                          // Find booking for this hour
                          const overlappingBooking = dayBookings.find((b) => {
                            if (b.resourceId !== res.id) return false;
                            const bStart = new Date(b.startAt);
                            const bEnd = new Date(b.endAt);
                            return bStart < hourEnd && bEnd > hourStart;
                          });

                          // Occupied Approved
                          if (overlappingBooking && (overlappingBooking.status === "APPROVED" || overlappingBooking.status === "IN_USE")) {
                            return (
                              <td
                                key={res.id}
                                onClick={() => onSelectReservation && onSelectReservation(overlappingBooking)}
                                className="p-1.5 border-r border-slate-200 dark:border-slate-700 last:border-r-0 bg-purple-50/60 dark:bg-purple-950/20 cursor-pointer"
                              >
                                <div className="p-2 rounded-xl bg-purple-600 text-white shadow-2xs space-y-0.5">
                                  <div className="font-bold truncate text-[11px]">
                                    {overlappingBooking.title}
                                  </div>
                                  <div className="text-[10px] text-purple-100 flex items-center justify-between">
                                    <span className="truncate">{overlappingBooking.reservedByUser?.name || "ครู"}</span>
                                    <span className="font-mono">
                                      {toThaiTimeString(overlappingBooking.startAt)} - {toThaiTimeString(overlappingBooking.endAt)}
                                    </span>
                                  </div>
                                </div>
                              </td>
                            );
                          }

                          // Occupied Pending (Locked)
                          if (overlappingBooking && overlappingBooking.status === "PENDING") {
                            return (
                              <td
                                key={res.id}
                                onClick={() => onSelectReservation && onSelectReservation(overlappingBooking)}
                                className="p-1.5 border-r border-slate-200 dark:border-slate-700 last:border-r-0 bg-amber-50/60 dark:bg-amber-950/20 cursor-pointer"
                              >
                                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 shadow-2xs space-y-0.5">
                                  <div className="font-bold truncate text-[11px]">
                                    ⏳ {overlappingBooking.title}
                                  </div>
                                  <div className="text-[10px] text-amber-700 dark:text-amber-300 flex items-center justify-between">
                                    <span className="truncate">{overlappingBooking.reservedByUser?.name || "ครู"}</span>
                                    <span className="font-mono">
                                      {toThaiTimeString(overlappingBooking.startAt)} - {toThaiTimeString(overlappingBooking.endAt)}
                                    </span>
                                  </div>
                                  <div className="text-[9px] font-bold text-amber-600 dark:text-amber-400">
                                    (รออนุมัติ - ล็อกคิวแล้ว)
                                  </div>
                                </div>
                              </td>
                            );
                          }

                          // Free Slot
                          return (
                            <td
                              key={res.id}
                              onClick={() => onSelectSlot && onSelectSlot(res, currentDate, hour)}
                              className="p-2 border-r border-slate-200 dark:border-slate-700 last:border-r-0 text-center cursor-pointer hover:bg-emerald-50/80 dark:hover:bg-emerald-950/30 transition group"
                              title={`คลิกเพื่อจอง ${res.name} ช่วงเวลา ${timeLabel}`}
                            >
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/60 px-2.5 py-1 rounded-lg shadow-2xs">
                                <Plus className="w-3 h-3" /> จองช่วงนี้
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </MatrixShell>
          )}
        </div>
      )}
    </div>
  );
}
