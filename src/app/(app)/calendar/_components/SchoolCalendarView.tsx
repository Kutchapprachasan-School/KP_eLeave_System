"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Users,
  MapPin,
  Clock,
  Sparkles,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  GraduationCap,
  FileText,
  AlertCircle,
  Eye,
  CalendarDays,
  List,
  Columns3,
} from "lucide-react";
import {
  schoolCalendarSyncService,
  CALENDAR_UPDATED_EVENT,
  type SchoolCalendarEvent,
  type CalendarCategory,
  type CalendarColor,
  type TargetRole,
} from "@/lib/services/schoolCalendarSync";

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

const WEEKDAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const SHORT_WEEKDAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

export default function SchoolCalendarView() {
  const [currentMonth, setCurrentMonth] = useState<number>(() => {
    return new Date().getMonth() + 1;
  });
  const [currentYear, setCurrentYear] = useState<number>(() => {
    return new Date().getFullYear() + 543;
  });
  const [viewMode, setViewMode] = useState<"MONTH" | "LIST">("MONTH");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [roleFilter, setRoleFilter] = useState<TargetRole | "ALL">("ALL");

  const [events, setEvents] = useState<SchoolCalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<SchoolCalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [formId, setFormId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDay, setFormDay] = useState<number>(() => new Date().getDate());
  const [formMonth, setFormMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [formYear, setFormYear] = useState<number>(() => new Date().getFullYear() + 543);
  const [formTime, setFormTime] = useState("08:30");
  const [formIsAllDay, setFormIsAllDay] = useState(false);
  const [formCategory, setFormCategory] = useState<CalendarCategory>("ACADEMIC");
  const [formColor, setFormColor] = useState<CalendarColor>("GREEN");
  const [formRole, setFormRole] = useState<TargetRole>("ALL");
  const [formLocation, setFormLocation] = useState("");
  const [formDescription, setFormDescription] = useState("");

  // โหลดกิจกรรมจาก Single Source of Truth
  useEffect(() => {
    // ล้างข้อมูลจำลองเก่าที่อาจตกค้างในเบราว์เซอร์อัตโนมัติ
    schoolCalendarSyncService.purgeAllMockData();
    setEvents(schoolCalendarSyncService.getEvents());

    // ซิงค์วันหยุดและวันเรียนพิเศษจากระบบการลา (Holiday Settings ใน DB) เป็นหลัก
    schoolCalendarSyncService.syncFromLeaveSystemHolidays(currentYear).then((evs) => {
      if (evs && evs.length > 0) setEvents(evs);
    });

    const handleUpdate = () => {
      setEvents(schoolCalendarSyncService.getEvents());
    };

    window.addEventListener(CALENDAR_UPDATED_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(CALENDAR_UPDATED_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [currentYear]);

  // ตัวกรองกิจกรรม
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchMonth = e.month === currentMonth && e.year === currentYear;
      const matchCategory = categoryFilter === "ALL" || e.category === categoryFilter;
      const matchRole = roleFilter === "ALL" || e.targetRole === roleFilter || e.targetRole === "ALL";
      return matchMonth && matchCategory && matchRole;
    });
  }, [events, currentMonth, currentYear, categoryFilter, roleFilter]);

  // คำนวณวันในเดือนและตารางปฏิทิน 7 คอลัมน์
  const calendarCells = useMemo(() => {
    const gregorianYear = currentYear - 543;
    const firstDay = new Date(gregorianYear, currentMonth - 1, 1).getDay();
    const daysInMonth = new Date(gregorianYear, currentMonth, 0).getDate();
    const daysInPrevMonth = new Date(gregorianYear, currentMonth - 1, 0).getDate();

    const cells: Array<{
      day: number;
      isCurrentMonth: boolean;
      events: SchoolCalendarEvent[];
    }> = [];

    // วันก่อนหน้า
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        events: [],
      });
    }

    // วันในเดือนปัจจุบัน
    for (let d = 1; d <= daysInMonth; d++) {
      const dayEvents = filteredEvents.filter((e) => e.day === d);
      cells.push({
        day: d,
        isCurrentMonth: true,
        events: dayEvents,
      });
    }

    // วันถัดไปให้เต็มสัปดาห์
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        day: i,
        isCurrentMonth: false,
        events: [],
      });
    }

    return cells;
  }, [currentMonth, currentYear, filteredEvents]);

  // จัดกลุ่มกิจกรรมต่อเนื่องหลายวันให้แสดงผลเป็น 1 รายการในมุมมองรายการ (List View)
  const groupedListEvents = useMemo(() => {
    const sorted = [...filteredEvents].sort((a, b) => a.day - b.day);
    const groups: Array<{
      id: string;
      title: string;
      category: CalendarCategory;
      colorType: CalendarColor;
      targetRole: TargetRole;
      location?: string;
      description?: string;
      time?: string;
      isAllDay?: boolean;
      startDay: number;
      endDay: number;
      month: number;
      year: number;
      isMultiDay: boolean;
      daysCount: number;
      rawEvents: SchoolCalendarEvent[];
    }> = [];

    for (const ev of sorted) {
      const existing = groups.find(
        (g) =>
          g.title === ev.title &&
          g.category === ev.category &&
          g.month === ev.month &&
          g.year === ev.year &&
          (ev.day === g.endDay + 1 || (ev.day >= g.startDay && ev.day <= g.endDay))
      );

      if (existing) {
        existing.endDay = Math.max(existing.endDay, ev.endDay || ev.day);
        existing.daysCount = existing.endDay - existing.startDay + 1;
        existing.isMultiDay = existing.daysCount > 1;
        existing.rawEvents.push(ev);
        if (!existing.description && ev.description) existing.description = ev.description;
        if (!existing.location && ev.location) existing.location = ev.location;
      } else {
        const endDay = ev.endDay && ev.endDay >= ev.day ? ev.endDay : ev.day;
        groups.push({
          id: ev.id,
          title: ev.title,
          category: ev.category,
          colorType: ev.colorType,
          targetRole: ev.targetRole,
          location: ev.location,
          description: ev.description,
          time: ev.time,
          isAllDay: ev.isAllDay,
          startDay: ev.day,
          endDay: endDay,
          month: ev.month,
          year: ev.year,
          isMultiDay: endDay > ev.day,
          daysCount: endDay - ev.day + 1,
          rawEvents: [ev],
        });
      }
    }

    return groups;
  }, [filteredEvents]);

  // ตัวเปลี่ยนเดือน
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

  const handleOpenAddModal = (initialDay: number = 1) => {
    setIsEditing(false);
    setFormId(`event-${Date.now()}`);
    setFormTitle("");
    setFormDay(initialDay);
    setFormMonth(currentMonth);
    setFormYear(currentYear);
    setFormTime("08:30");
    setFormIsAllDay(false);
    setFormCategory("ACADEMIC");
    setFormColor("GREEN");
    setFormRole("TEACHER");
    setFormLocation("");
    setFormDescription("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (event: SchoolCalendarEvent) => {
    setIsEditing(true);
    setFormId(event.id);
    setFormTitle(event.title);
    setFormDay(event.day);
    setFormMonth(event.month);
    setFormYear(event.year);
    setFormTime(event.time || "08:30");
    setFormIsAllDay(Boolean(event.isAllDay));
    setFormCategory(event.category);
    setFormColor(event.colorType);
    setFormRole(event.targetRole);
    setFormLocation(event.location || "");
    setFormDescription(event.description || "");
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const newEv: SchoolCalendarEvent = {
      id: formId,
      day: formDay,
      month: formMonth,
      year: formYear,
      fullDateLabel: `วันที่ ${formDay} ${THAI_MONTHS[formMonth - 1]} ${formYear}`,
      time: formIsAllDay ? undefined : formTime,
      isAllDay: formIsAllDay,
      title: formTitle.trim(),
      category: formCategory,
      colorType: formColor,
      targetRole: formRole,
      location: formLocation.trim() || undefined,
      description: formDescription.trim() || undefined,
    };

    schoolCalendarSyncService.saveEvent(newEv);
    setIsModalOpen(false);
  };

  const handleDeleteEvent = (id: string) => {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรมนี้ออกจากปฏิทิน?")) {
      schoolCalendarSyncService.deleteEvent(id);
      setSelectedEvent(null);
    }
  };

  const getCategoryBadge = (cat: CalendarCategory, color: CalendarColor) => {
    let colorClasses = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300";
    if (color === "BLUE") colorClasses = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300";
    if (color === "ORANGE") colorClasses = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300";
    if (color === "RED") colorClasses = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300";
    if (color === "PURPLE") colorClasses = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300";

    const labels: Record<CalendarCategory, string> = {
      ACADEMIC: "วิชาการ",
      MEETING: "ประชุม",
      SUBMISSION: "ส่งงาน/ประเมิน",
      STUDENT: "กิจกรรมนักเรียน",
      EXAM: "สอบ/วัดผล",
      OTHER: "วันสำคัญ/วันหยุด",
    };

    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${colorClasses}`}>
        {labels[cat] || "กิจกรรม"}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner / Hero */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 rounded-2xl p-6 text-white shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-xs">
              ภาคเรียนที่ {currentMonth >= 5 && currentMonth <= 10 ? 1 : 2}/{currentYear}
            </span>
            <span className="text-blue-100 text-xs">ซิงค์กับระบบจัดการชั้นเรียน</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            ปฏิทินกิจกรรมสถานศึกษา (School Activity Calendar)
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 max-w-2xl leading-relaxed">
            กำหนดการ กิจกรรมวิชาการ วันหยุดราชการ และการปฏิบัติงานโรงเรียนกุดจับประชาสรรค์
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenAddModal(new Date().getDate())}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs sm:text-sm shadow-md transition cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>เพิ่มกิจกรรมใหม่</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Month Switcher & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs sm:text-sm font-bold text-slate-800 dark:text-white min-w-[140px] text-center">
              {THAI_MONTHS[currentMonth - 1]} {currentYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="เดือนถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              const d = new Date();
              setCurrentMonth(d.getMonth() + 1);
              setCurrentYear(d.getFullYear() + 543);
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            วันนี้
          </button>
        </div>

        {/* Filters & View Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 border-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">หมวดหมู่ทั้งหมด</option>
            <option value="OTHER">วันหยุดราชการ / สถานศึกษา</option>
            <option value="ACADEMIC">วิชาการ / วันเรียนพิเศษ</option>
            <option value="EXAM">การสอบ / วัดผล</option>
            <option value="MEETING">การประชุม</option>
            <option value="SUBMISSION">ส่งงาน / ประเมิน</option>
            <option value="STUDENT">กิจกรรมนักเรียน</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 border-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">กลุ่มเป้าหมายทั้งหมด</option>
            <option value="TEACHER">สำหรับครู</option>
            <option value="STUDENT">สำหรับนักเรียน</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode("MONTH")}
              className={`p-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === "MONTH"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>ปฏิทิน</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("LIST")}
              className={`p-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === "LIST"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>รายการ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === "MONTH" ? (
        /* Calendar Grid View */
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          {/* Weekday Header */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-center font-bold text-xs py-3">
            {WEEKDAYS.map((wd, idx) => (
              <div
                key={wd}
                className={idx === 0 || idx === 6 ? "text-rose-500 font-bold" : "text-slate-700 dark:text-slate-300"}
              >
                <span className="hidden sm:inline">{wd}</span>
                <span className="sm:hidden">{SHORT_WEEKDAYS[idx]}</span>
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800">
            {calendarCells.map((cell, idx) => {
              const now = new Date();
              const isToday =
                cell.isCurrentMonth &&
                cell.day === now.getDate() &&
                currentMonth === (now.getMonth() + 1) &&
                currentYear === (now.getFullYear() + 543);

              const colIndex = idx % 7;
              const isWeekend = colIndex === 0 || colIndex === 6;
              const isHoliday = cell.events.some(
                (e) =>
                  e.colorType === "RED" ||
                  e.category === "OTHER" ||
                  e.location === "วันหยุดราชการ" ||
                  e.location?.includes("วันหยุด") ||
                  e.title.includes("วันหยุด") ||
                  e.title.includes("ปิดเทอม") ||
                  e.title.includes("ปิดภาคเรียน")
              );
              const isDayOff = (isWeekend || isHoliday) && cell.isCurrentMonth;

              return (
                <div
                  key={`${cell.day}-${idx}`}
                  onClick={() => cell.isCurrentMonth && handleOpenAddModal(cell.day)}
                  className={`min-h-[110px] sm:min-h-[130px] p-2 flex flex-col justify-between transition-colors relative ${
                    !cell.isCurrentMonth
                      ? "bg-slate-50/40 dark:bg-slate-950/20 text-slate-300 dark:text-slate-700 cursor-default"
                      : isDayOff
                      ? "bg-rose-50/70 dark:bg-rose-950/25 border-rose-100/70 dark:border-rose-900/40 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 cursor-pointer group"
                      : "bg-white dark:bg-slate-900 hover:bg-blue-50/30 dark:hover:bg-slate-800/40 cursor-pointer group"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs sm:text-sm font-bold flex items-center justify-center w-6 h-6 rounded-full ${
                        isToday
                          ? isDayOff
                            ? "bg-rose-600 text-white shadow-xs font-black"
                            : "bg-blue-600 text-white shadow-xs font-black"
                          : cell.isCurrentMonth
                          ? isDayOff
                            ? "text-rose-600 dark:text-rose-400 font-extrabold"
                            : "text-slate-800 dark:text-slate-200"
                          : "text-slate-300 dark:text-slate-600"
                      }`}
                    >
                      {cell.day}
                    </span>

                    {cell.isCurrentMonth && (
                      <span className="opacity-0 group-hover:opacity-100 text-blue-600 dark:text-blue-400 text-[10px] font-bold transition">
                        + เพิ่ม
                      </span>
                    )}
                  </div>

                  {/* Event Badges inside Day Cell */}
                  <div className="space-y-1 mt-1 flex-1 overflow-visible">
                    {cell.events.map((ev) => {
                      const prevCell = idx > 0 ? calendarCells[idx - 1] : null;
                      const nextCell = idx < calendarCells.length - 1 ? calendarCells[idx + 1] : null;

                      const hasPrev = Boolean(
                        prevCell &&
                        prevCell.isCurrentMonth &&
                        colIndex !== 0 &&
                        prevCell.events.some((e) => e.title === ev.title && e.category === ev.category)
                      );

                      const hasNext = Boolean(
                        nextCell &&
                        nextCell.isCurrentMonth &&
                        colIndex !== 6 &&
                        nextCell.events.some((e) => e.title === ev.title && e.category === ev.category)
                      );

                      const isStart = !hasPrev && hasNext;
                      const isMiddle = hasPrev && hasNext;
                      const isEnd = hasPrev && !hasNext;

                      let shapeClass = "rounded-lg mx-0";
                      if (isStart) {
                        shapeClass = "rounded-l-lg rounded-r-none -mr-2.5 pr-2.5 z-10 border-r-0";
                      } else if (isMiddle) {
                        shapeClass = "rounded-none -mx-2.5 px-2.5 z-10 border-x-0";
                      } else if (isEnd) {
                        shapeClass = "rounded-r-lg rounded-l-none -ml-2.5 pl-2.5 z-10 border-l-0";
                      }

                      let bg = "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800";
                      if (ev.colorType === "BLUE") bg = "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800";
                      if (ev.colorType === "ORANGE") bg = "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800";
                      if (ev.colorType === "RED" || ev.category === "OTHER" || ev.colorType === "PURPLE") bg = "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800";

                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(ev);
                          }}
                          className={`text-[10px] sm:text-[10.5px] p-1 sm:p-1.5 font-medium border truncate transition hover:shadow-xs hover:brightness-95 cursor-pointer flex items-center ${shapeClass} ${bg}`}
                          title={`${ev.title} (${ev.time || "ตลอดวัน"})`}
                        >
                          <div className="flex items-center gap-1 truncate w-full">
                            {isMiddle && <span className="text-[9px] font-bold opacity-60 shrink-0">••</span>}
                            {isEnd && <span className="text-[9px] font-bold opacity-60 shrink-0">◀</span>}
                            {(!isMiddle || colIndex === 0) && ev.time && (
                              <span className="font-bold shrink-0">{ev.time}</span>
                            )}
                            <span className="truncate">
                              {(!isMiddle || colIndex === 0) ? ev.title : ev.title}
                            </span>
                            {isStart && <span className="text-[9px] font-bold opacity-60 shrink-0 ml-auto">▶</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List Mode - Grouped Multi-day Events */
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
          {groupedListEvents.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <CalendarIcon className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
              <p className="text-sm">ไม่มีกิจกรรมในเดือนนี้</p>
            </div>
          ) : (
            groupedListEvents.map((ev) => {
              const isMulti = ev.isMultiDay && ev.startDay !== ev.endDay;
              const isHoliday =
                ev.colorType === "RED" ||
                ev.category === "OTHER" ||
                ev.location?.includes("วันหยุด") ||
                ev.title.includes("วันหยุด") ||
                ev.title.includes("ปิดเทอม") ||
                ev.title.includes("ปิดภาคเรียน");

              const badgeColor = isHoliday
                ? "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300"
                : "bg-blue-50 dark:bg-blue-950/50 border-blue-100 dark:border-blue-900 text-blue-700 dark:text-blue-300";

              return (
                <div
                  key={ev.id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                    isHoliday
                      ? "hover:bg-rose-50/40 dark:hover:bg-rose-950/20"
                      : "hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Date badge */}
                    <div className={`w-16 h-14 rounded-2xl border flex flex-col items-center justify-center shrink-0 px-1 shadow-2xs ${badgeColor}`}>
                      {isMulti ? (
                        <>
                          <span className="text-xs sm:text-sm font-extrabold leading-tight text-center">
                            {ev.startDay} - {ev.endDay}
                          </span>
                          <span className="text-[10px] font-bold">{THAI_MONTHS[ev.month - 1].slice(0, 3)}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-lg font-extrabold leading-none">{ev.startDay}</span>
                          <span className="text-[10px] font-bold mt-0.5">{THAI_MONTHS[ev.month - 1].slice(0, 3)}</span>
                        </>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getCategoryBadge(ev.category, isHoliday ? "RED" : ev.colorType)}
                        {isMulti && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200">
                            กิจกรรมต่อเนื่อง {ev.daysCount} วัน
                          </span>
                        )}
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {ev.targetRole === "TEACHER" ? "เฉพาะครู" : ev.targetRole === "STUDENT" ? "เฉพาะนักเรียน" : "ทุกคน"}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                        {ev.title}
                      </h3>

                      {ev.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {ev.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-slate-400 pt-1 flex-wrap">
                        <div className="flex items-center gap-1 font-medium">
                          <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {isMulti
                              ? `วันที่ ${ev.startDay} - ${ev.endDay} ${THAI_MONTHS[ev.month - 1]} ${ev.year}`
                              : `วันที่ ${ev.startDay} ${THAI_MONTHS[ev.month - 1]} ${ev.year}`}
                          </span>
                        </div>
                        {ev.time && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{ev.time} น.</span>
                          </div>
                        )}
                        {ev.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{ev.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedEvent(ev.rawEvents[0] || (ev as any))}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>รายละเอียด</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(ev.rawEvents[0] || (ev as any))}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 text-xs font-bold cursor-pointer"
                      title="แก้ไข"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        ev.rawEvents.forEach((r) => handleDeleteEvent(r.id));
                      }}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:border-rose-200 text-rose-600 hover:text-rose-700 dark:hover:bg-rose-950/40 text-xs font-bold cursor-pointer transition"
                      title="ลบ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {getCategoryBadge(selectedEvent.category, selectedEvent.colorType)}
                  <span className="text-[11px] font-semibold text-slate-400">
                    {selectedEvent.fullDateLabel || `วันที่ ${selectedEvent.day} ${THAI_MONTHS[selectedEvent.month - 1]} ${selectedEvent.year}`}
                  </span>
                </div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {selectedEvent.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-[13px] text-slate-600 dark:text-slate-300">
              {selectedEvent.time && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>เวลา: {selectedEvent.time} น.</span>
                </div>
              )}
              {selectedEvent.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>สถานที่: {selectedEvent.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>กลุ่มเป้าหมาย: {selectedEvent.targetRole === "TEACHER" ? "คณะครูและบุคลากร" : selectedEvent.targetRole === "STUDENT" ? "นักเรียน" : "ทุกคน"}</span>
              </div>

              {selectedEvent.description && (
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="font-bold text-slate-700 dark:text-slate-200">รายละเอียด:</div>
                  <p className="leading-relaxed">{selectedEvent.description}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleDeleteEvent(selectedEvent.id)}
                className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition cursor-pointer"
              >
                ลบกิจกรรม
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(selectedEvent)}
                  className="px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 font-bold text-xs hover:bg-blue-100 transition cursor-pointer"
                >
                  แก้ไข
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <form
            onSubmit={handleSaveForm}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                {isEditing ? "แก้ไขกิจกรรมปฏิทิน" : "เพิ่มกิจกรรมปฏิทินใหม่"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-[13px]">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อกิจกรรม / หัวข้อการประชุม *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="เช่น ประชุมกลุ่มสาระวิชาการ, กิจกรรมวันสำคัญ..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    วันที่ (1-31)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={formDay}
                    onChange={(e) => setFormDay(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    เดือน
                  </label>
                  <select
                    value={formMonth}
                    onChange={(e) => setFormMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {THAI_MONTHS.map((m, idx) => (
                      <option key={m} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    เวลาเริ่มต้น
                  </label>
                  <input
                    type="text"
                    disabled={formIsAllDay}
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    placeholder="08:30"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                  />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formIsAllDay}
                      onChange={(e) => setFormIsAllDay(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      ตลอดทั้งวัน
                    </span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    หมวดหมู่
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => {
                      const cat = e.target.value as CalendarCategory;
                      setFormCategory(cat);
                      if (cat === "ACADEMIC") setFormColor("GREEN");
                      else if (cat === "MEETING") setFormColor("BLUE");
                      else if (cat === "SUBMISSION") setFormColor("ORANGE");
                      else if (cat === "STUDENT") setFormColor("RED");
                      else if (cat === "EXAM") setFormColor("RED");
                      else setFormColor("PURPLE");
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="ACADEMIC">วิชาการ (สีเขียว)</option>
                    <option value="MEETING">ประชุม (สีฟ้า)</option>
                    <option value="SUBMISSION">ส่งงาน/ประเมิน (สีส้ม)</option>
                    <option value="STUDENT">กิจกรรมนักเรียน (สีแดง)</option>
                    <option value="EXAM">สอบ/วัดผล (สีแดง)</option>
                    <option value="OTHER">วันหยุด/สำคัญ (สีม่วง)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    กลุ่มเป้าหมาย
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as TargetRole)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="ALL">ทุกคนในโรงเรียน</option>
                    <option value="TEACHER">สำหรับครูและบุคลากร</option>
                    <option value="STUDENT">สำหรับนักเรียน</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  สถานที่จัดกิจกรรม
                </label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="เช่น หอประชุมศุภชลาศัย, ห้องประชุมใหญ่..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  รายละเอียดเพิ่มเติม
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="รายละเอียดวาระการประชุม หรือกำหนดการกิจกรรม..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition cursor-pointer active:scale-95"
              >
                บันทึกกิจกรรม
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
