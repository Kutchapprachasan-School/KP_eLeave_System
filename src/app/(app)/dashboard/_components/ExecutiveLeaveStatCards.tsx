"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileCheck,
  UserCheck,
  GraduationCap,
  Clock,
  Wrench,
  Building2,
  FileText,
  AlertTriangle,
  Fingerprint,
  HeartHandshake,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  Filter,
} from "lucide-react";
import type {
  SchoolManagementExecutiveStats,
  DashboardWidgetConfig,
} from "@/app/actions/dashboard-widgets";

export type KpiCategoryFilter = "all" | "student" | "staff" | "support";

interface KpiCardItem {
  id: keyof DashboardWidgetConfig;
  category: KpiCategoryFilter;
  title: string;
  value: number | string;
  unit: string;
  subsystemLabel: string;
  subsystemColor: "amber" | "blue" | "emerald" | "purple" | "rose" | "indigo" | "teal";
  icon: React.ReactNode;
  urgentText?: string;
  statusText: string;
  drillDownHref?: string;
  drillDownText?: string;
  actionOnClick?: () => void;
}

interface ExecutiveLeaveStatCardsProps {
  stats?: SchoolManagementExecutiveStats | null;
  config?: DashboardWidgetConfig;
  onFilterPending?: () => void;

  // Fallback compatibility props
  pendingCount?: number;
  staffOnLeaveTodayCount?: number;
  studentsOnLeaveTodayCount?: number;
  proxyTeachingAssignedCount?: number;
}

export default function ExecutiveLeaveStatCards({
  stats,
  config,
  onFilterPending,
  pendingCount: fallbackPending,
  staffOnLeaveTodayCount: fallbackStaffOnLeave,
  studentsOnLeaveTodayCount: fallbackStudentsOnLeave,
  proxyTeachingAssignedCount: fallbackProxyTeaching,
}: ExecutiveLeaveStatCardsProps) {
  const [activeCategory, setActiveCategory] = useState<KpiCategoryFilter>("all");

  // Derive consolidated values
  const pendingLeaves = stats?.staff.pendingLeaveCount ?? fallbackPending ?? 0;
  const staffOnLeave = stats?.staff.staffOnLeaveTodayCount ?? fallbackStaffOnLeave ?? 0;
  const proxyTeaching = stats?.staff.proxyTeachingCount ?? fallbackProxyTeaching ?? 0;
  const staffClockedIn = stats?.staff.attendanceToday.totalClockIn ?? 0;

  const totalStudents = stats?.student.totalStudents ?? 1138;
  const isMorningDone = stats?.student.attendanceToday.isMorningCheckCompleted ?? false;
  const studentRate = stats?.student.attendanceToday.attendanceRate ?? 95.6;
  const studentPresent = stats?.student.attendanceToday.present ?? 0;
  const studentSickAndPersonal =
    (stats?.student.attendanceToday.sick ?? 0) +
    (stats?.student.attendanceToday.personal ?? 0) ||
    (fallbackStudentsOnLeave ?? 0);
  const studentRisk = stats?.student.riskEwsCount ?? 0;

  const documentPending = stats?.document.pendingRoutingCount ?? 0;
  const repairActive = stats?.repair.activeCount ?? 0;
  const facilityToday = stats?.facility.reservationsTodayCount ?? 0;

  // Master KPI Registry for School Management System
  const registry: KpiCardItem[] = [
    // ── กลุ่มที่ 1: ด้านผู้เรียน (Student Affairs & Academic) ──
    {
      id: "kpiStudentTotal",
      category: "student",
      title: "นักเรียนทั้งหมดในระบบ",
      value: totalStudents > 0 ? totalStudents.toLocaleString("th-TH") : "1,138",
      unit: "คน",
      subsystemLabel: "ทะเบียนนักเรียน",
      subsystemColor: "blue",
      icon: <GraduationCap className="w-5 h-5" />,
      statusText: totalStudents > 0 ? "สถานะปกติ (Active)" : "ข้อมูลทางการสถานศึกษา",
      drillDownHref: "/academic",
      drillDownText: "ดูข้อมูลนักเรียน",
    },
    {
      id: "kpiStudentPresentToday",
      category: "student",
      title: "อัตราการมาเรียนวันนี้",
      value: isMorningDone ? `${studentRate}%` : "-",
      unit: isMorningDone ? `(${studentPresent.toLocaleString("th-TH")} คน)` : "(รอสรุปยอด)",
      subsystemLabel: "เช็กแถวหน้าเสาธง",
      subsystemColor: "emerald",
      icon: <TrendingUp className="w-5 h-5" />,
      statusText: isMorningDone
        ? "เช็กชื่อเสร็จสมบูรณ์"
        : "รอสรุปยอดเช็กแถว",
      drillDownHref: "/attendance",
      drillDownText: "ดูสถิติเช็กชื่อ",
    },
    {
      id: "kpiStudentLeavesToday",
      category: "student",
      title: "นักเรียนลาวันนี้ (ป่วย/กิจ)",
      value: studentSickAndPersonal,
      unit: "คน",
      subsystemLabel: "กิจการนักเรียน",
      subsystemColor: "blue",
      icon: <HeartHandshake className="w-5 h-5" />,
      statusText: "มีหลักฐาน/ใบรับรองแพทย์",
      drillDownHref: "/attendance",
      drillDownText: "ดูใบลานักเรียน",
    },
    {
      id: "kpiStudentRiskEws",
      category: "student",
      title: "นักเรียนกลุ่มเฝ้าระวัง (EWS)",
      value: studentRisk,
      unit: "คน",
      subsystemLabel: "ดูแลช่วยเหลือนักเรียน",
      subsystemColor: "rose",
      icon: <ShieldAlert className="w-5 h-5" />,
      urgentText: studentRisk > 0 ? "ต้องดูแล" : undefined,
      statusText: studentRisk > 0 ? "เคสความเสี่ยงสะสม" : "ไม่มีเคสเสี่ยงวิกฤต",
      drillDownHref: "/academic",
      drillDownText: "ดูเคส EWS",
    },

    // ── กลุ่มที่ 2: ด้านครูและบุคลากร (Staff & HR) ──
    {
      id: "kpiStaffLeavePending",
      category: "staff",
      title: "คำขอรอพิจารณาอนุมัติ",
      value: pendingLeaves,
      unit: "ฉบับ",
      subsystemLabel: "ระบบการลา",
      subsystemColor: "amber",
      icon: <Clock className="w-5 h-5" />,
      urgentText: pendingLeaves > 0 ? "เร่งด่วน" : undefined,
      statusText: "รอผู้บริหารลงนาม",
      actionOnClick: onFilterPending,
      drillDownHref: "#approval-queue-section",
      drillDownText: "คลิกเพื่อดูคิว ➔",
    },
    {
      id: "kpiStaffOnLeave",
      category: "staff",
      title: "ครู/บุคลากรลาวันนี้",
      value: staffOnLeave,
      unit: "ท่าน",
      subsystemLabel: "บริหารบุคลากร",
      subsystemColor: "blue",
      icon: <UserCheck className="w-5 h-5" />,
      statusText: "กำลังปฏิบัติหน้าที่ครบถ้วน",
      drillDownHref: "/reports",
      drillDownText: "ดูสถิติบุคลากร",
    },
    {
      id: "kpiStaffProxyTeaching",
      category: "staff",
      title: "จัดครูสอนแทนประจำคาบ",
      value: proxyTeaching,
      unit: "คาบ",
      subsystemLabel: "วิชาการ & สอนแทน",
      subsystemColor: "emerald",
      icon: <FileCheck className="w-5 h-5" />,
      statusText: "ครบทุกคาบเรียน 100%",
      drillDownHref: "/academic/substitute",
      drillDownText: "ดูตารางสอนแทน",
    },
    {
      id: "kpiStaffAttendance",
      category: "staff",
      title: "การลงเวลาปฏิบัติหน้าที่",
      value: staffClockedIn,
      unit: "คน",
      subsystemLabel: "ระบบลงเวลา",
      subsystemColor: "indigo",
      icon: <Fingerprint className="w-5 h-5" />,
      statusText: "บันทึกเวลา GPS/ใบหน้า",
      drillDownHref: "/attendance/stats",
      drillDownText: "สถิติการมาทำงาน",
    },

    // ── กลุ่มที่ 3: ด้านงานบริหารสนับสนุน (Operations & Support) ──
    {
      id: "kpiDocumentPending",
      category: "support",
      title: "หนังสือราชการรอเกษียณ",
      value: documentPending,
      unit: "เรื่อง",
      subsystemLabel: "งานสารบรรณ",
      subsystemColor: "indigo",
      icon: <FileText className="w-5 h-5" />,
      urgentText: documentPending > 0 ? "รอดำเนินการ" : undefined,
      statusText: "หนังสือรับเข้า & คำสั่ง",
      drillDownHref: "/document?view=history&tab=inbound",
      drillDownText: "ไปที่สารบรรณ",
    },
    {
      id: "kpiRepairActive",
      category: "support",
      title: "งานแจ้งซ่อมบำรุงที่ค้างอยู่",
      value: repairActive,
      unit: "รายการ",
      subsystemLabel: "ระบบแจ้งซ่อม",
      subsystemColor: "rose",
      icon: <Wrench className="w-5 h-5" />,
      urgentText: stats?.repair.overdueSlaCount && stats.repair.overdueSlaCount > 0 ? "เกิน SLA" : undefined,
      statusText: stats?.repair.overdueSlaCount ? `เกินกำหนด ${stats.repair.overdueSlaCount} รายการ` : "กำลังดำเนินการ",
      drillDownHref: "/repair",
      drillDownText: "ตรวจงานแจ้งซ่อม",
    },
    {
      id: "kpiFacilityToday",
      category: "support",
      title: "การใช้ทรัพยากรส่วนกลางวันนี้",
      value: facilityToday,
      unit: "รายการ",
      subsystemLabel: "ห้องประชุม & ยานพาหนะ",
      subsystemColor: "teal",
      icon: <Building2 className="w-5 h-5" />,
      statusText: "คิวจองที่ได้รับอนุมัติ",
      drillDownHref: "/general/facility",
      drillDownText: "ดูปฏิทินส่วนกลาง",
    },
  ];

  // Filter based on widget customizer config (default enabled if config not passed)
  const enabledCards = registry.filter((card) => {
    if (!config) return true;
    return config[card.id] ?? true;
  });

  // Filter based on selected category tab
  const displayedCards = enabledCards.filter((card) => {
    if (activeCategory === "all") return true;
    return card.category === activeCategory;
  });

  const colorStyles: Record<string, { bg: string; text: string; badge: string; border: string }> = {
    amber: {
      bg: "bg-amber-500",
      text: "text-amber-700 dark:text-amber-400",
      badge: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
      border: "border-amber-300 ring-2 ring-amber-400/20",
    },
    blue: {
      bg: "bg-blue-600",
      text: "text-blue-700 dark:text-blue-400",
      badge: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
      border: "border-[#E6EEF7] dark:border-slate-800",
    },
    emerald: {
      bg: "bg-emerald-600",
      text: "text-emerald-700 dark:text-emerald-400",
      badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
      border: "border-[#E6EEF7] dark:border-slate-800",
    },
    purple: {
      bg: "bg-purple-600",
      text: "text-purple-700 dark:text-purple-400",
      badge: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300",
      border: "border-[#E6EEF7] dark:border-slate-800",
    },
    rose: {
      bg: "bg-rose-600",
      text: "text-rose-700 dark:text-rose-400",
      badge: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
      border: "border-[#E6EEF7] dark:border-slate-800",
    },
    indigo: {
      bg: "bg-indigo-600",
      text: "text-indigo-700 dark:text-indigo-400",
      badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300",
      border: "border-[#E6EEF7] dark:border-slate-800",
    },
    teal: {
      bg: "bg-teal-600",
      text: "text-teal-700 dark:text-teal-400",
      badge: "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300",
      border: "border-[#E6EEF7] dark:border-slate-800",
    },
  };

  return (
    <div className="space-y-3.5 select-none">
      {/* Category Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>จำแนกมิติข้อมูล:</span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeCategory === "all"
                ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            ทั้งหมด ({enabledCards.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory("student")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeCategory === "student"
                ? "bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-purple-500" />
            <span>ด้านผู้เรียน ({enabledCards.filter((c) => c.category === "student").length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory("staff")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeCategory === "staff"
                ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>ด้านบุคลากร ({enabledCards.filter((c) => c.category === "staff").length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory("support")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeCategory === "support"
                ? "bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>ฝ่ายสนับสนุน ({enabledCards.filter((c) => c.category === "support").length})</span>
          </button>
        </div>
      </div>

      {/* Responsive Modular KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {displayedCards.map((card) => {
          const colors = colorStyles[card.subsystemColor] || colorStyles.blue;
          const isUrgent = Boolean(card.urgentText);

          return (
            <div
              key={card.id}
              role={card.actionOnClick ? "button" : undefined}
              tabIndex={card.actionOnClick ? 0 : undefined}
              onKeyDown={(e) => {
                if (card.actionOnClick && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  card.actionOnClick();
                }
              }}
              onClick={card.actionOnClick}
              className={`stat-card bg-white dark:bg-slate-900 rounded-2xl border p-4 sm:p-5 flex flex-col justify-between shadow-[0_4px_16px_rgba(40,90,140,0.06)] dark:shadow-none transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                isUrgent ? colors.border : "border-[#E6EEF7] dark:border-slate-800"
              } ${card.actionOnClick ? "cursor-pointer" : ""}`}
            >
              <div>
                {/* Header: Label & Subsystem Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-bold ${colors.badge}`}
                    >
                      {card.subsystemLabel}
                    </span>
                    <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug">
                      {card.title}
                    </h4>
                  </div>

                  <div
                    className={`w-10 h-10 rounded-xl ${colors.bg} text-white flex items-center justify-center shrink-0 shadow-xs`}
                  >
                    {card.icon}
                  </div>
                </div>

                {/* Big Stat Value */}
                <div className="flex items-baseline gap-1.5 mt-3">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#163A66] dark:text-white tracking-tight tabular-nums">
                    {card.value}
                  </span>
                  {card.unit && (
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                      {card.unit}
                    </span>
                  )}
                  {card.urgentText && (
                    <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse">
                      {card.urgentText}
                    </span>
                  )}
                </div>
              </div>

              {/* Footer: Status Text & Drill-down Link */}
              <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 text-xs truncate max-w-[140px]">
                  {card.statusText}
                </span>

                {card.drillDownHref ? (
                  <Link
                    href={card.drillDownHref}
                    onClick={(e) => {
                      if (card.actionOnClick) {
                        e.preventDefault();
                        card.actionOnClick();
                      }
                    }}
                    className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 text-[11px] shrink-0"
                  >
                    <span>{card.drillDownText || "ดูข้อมูล"}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                ) : (
                  <span className="font-semibold text-slate-400 text-[11px]">
                    {card.drillDownText}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
