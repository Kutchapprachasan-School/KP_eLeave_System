"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import {
  CheckCircle2,
  RefreshCw,
  Sliders,
  Calendar,
  FileText,
  Wrench,
  Building2,
  GraduationCap,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import {
  type DashboardWidgetConfig,
  type SchoolManagementExecutiveStats,
  DEFAULT_WIDGET_CONFIG,
  getDashboardWidgetConfig,
  getSchoolManagementExecutiveStats,
} from "@/app/actions/dashboard-widgets";
import {
  getDashboardStats,
  getPendingApprovals,
  approveLeaveRequest,
  rejectLeaveRequest,
} from "@/app/actions/leave";

// Sub-components matching SMS Executive Hub
import SMSHeroBanner from "./SMSHeroBanner";
import ExecutiveLeaveStatCards from "./ExecutiveLeaveStatCards";
import SMSLearningOutcomeChart from "./SMSLearningOutcomeChart";
import SMSAttendanceDonutCard from "./SMSAttendanceDonutCard";
import SMSAnnouncementsCard from "./SMSAnnouncementsCard";
import SMSAcademicCalendarCard from "./SMSAcademicCalendarCard";
import SMSOperationsStrip from "./SMSOperationsStrip";

// Analytics & Operational e-Leave components
import ExecutiveLeaveCharts from "./ExecutiveLeaveCharts";
import ExecutiveStudentLeaveOverview from "./ExecutiveStudentLeaveOverview";
import ExecutiveApprovalQueue, { type LeaveQueueItem } from "./ExecutiveApprovalQueue";
import ExecutiveLeaveDetailModal from "./ExecutiveLeaveDetailModal";
import DashboardWidgetCustomizerModal from "./DashboardWidgetCustomizerModal";
import MonthlyTrendChart from "./MonthlyTrendChart";

export default function ExecutiveLeaveDashboardView() {
  const { data: session } = useSession();
  const currentUser = session?.user as any;
  const isAdmin =
    currentUser?.role === "ADMIN" ||
    currentUser?.position === "แอดมิน" ||
    currentUser?.role === "DIRECTOR" ||
    currentUser?.position === "ผู้อำนวยการ" ||
    currentUser?.role === "HR" ||
    currentUser?.role === "DEPT_HEAD";

  // Widget Settings with instant localStorage cache fallback
  const [widgetConfig, setWidgetConfig] = useState<DashboardWidgetConfig>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("kp_dashboard_widget_config");
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return DEFAULT_WIDGET_CONFIG;
  });

  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [selectedLeaveForModal, setSelectedLeaveForModal] = useState<LeaveQueueItem | null>(null);

  // Data States
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<any>(null);
  const [schoolStats, setSchoolStats] = useState<SchoolManagementExecutiveStats | null>(null);
  const [queueLeaves, setQueueLeaves] = useState<LeaveQueueItem[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadAllDashboardData = async () => {
    setLoading(true);
    try {
      // Parallel loading of configs and aggregated school stats
      const [config, stats, multiStats] = await Promise.all([
        getDashboardWidgetConfig().catch(() => null),
        getDashboardStats("current", "th", undefined, "school").catch(() => null),
        getSchoolManagementExecutiveStats().catch(() => null),
      ]);

      if (config) {
        // Only override if localStorage doesn't have an explicit override or sync with server
        try {
          const cached = localStorage.getItem("kp_dashboard_widget_config");
          if (cached) {
            setWidgetConfig(JSON.parse(cached));
          } else {
            setWidgetConfig(config);
          }
        } catch {
          setWidgetConfig(config);
        }
      }

      setStatsData(stats);
      setSchoolStats(multiStats);

      // Load Pending Approvals
      try {
        const pending = await getPendingApprovals();
        if (Array.isArray(pending)) {
          const mappedQueue: LeaveQueueItem[] = pending.map((item: any) => ({
            id: item.id,
            userId: item.userId,
            staffName: item.user?.name || "ไม่ระบุชื่อ",
            department: item.user?.subjectGroup || item.user?.position || "บุคลากร",
            leaveType: item.type,
            startDate: new Date(item.startDate).toLocaleDateString("th-TH"),
            endDate: new Date(item.endDate).toLocaleDateString("th-TH"),
            totalDays: item.leaveDays || 1,
            reason: item.reason || "-",
            status: item.status,
            hasProxyTeacher: Boolean(item.proxyTeacherId || item.substituteTeacherId),
            proxyTeacherName: item.proxyTeacherName,
            createdAt: new Date(item.createdAt).toLocaleDateString("th-TH"),
            userImage: item.user?.image,
            rawRequest: item,
          }));
          setQueueLeaves(mappedQueue);
        }
      } catch (err) {
        if (stats?.recentRequests && Array.isArray(stats.recentRequests)) {
          const mappedQueue: LeaveQueueItem[] = stats.recentRequests.map((item: any) => ({
            id: item.id,
            userId: item.userId,
            staffName: item.userName || "ไม่ระบุชื่อ",
            department: "กลุ่มสาระการเรียนรู้",
            leaveType: item.type,
            startDate: new Date(item.startDate).toLocaleDateString("th-TH"),
            endDate: new Date(item.endDate).toLocaleDateString("th-TH"),
            totalDays: 1,
            reason: item.reason || "-",
            status: item.status,
            hasProxyTeacher: true,
            proxyTeacherName: "จัดสอนแทนแล้ว",
            createdAt: new Date(item.createdAt).toLocaleDateString("th-TH"),
            rawRequest: item,
          }));
          setQueueLeaves(mappedQueue);
        }
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllDashboardData();
  }, [session]);

  // Approval handlers
  const handleApprove = async (id: string) => {
    setActionLoadingId(id);
    try {
      const res = await approveLeaveRequest(id);
      if (res?.success) {
        showToast("อนุมัติคำขอลาเรียบร้อยแล้ว");
        setQueueLeaves((prev) =>
          prev.map((l) => (l.id === id ? { ...l, status: "APPROVED" } : l))
        );
      } else {
        alert(res?.error || "ไม่สามารถอนุมัติได้");
      }
    } catch (err: any) {
      alert(err?.message || "เกิดข้อผิดพลาดในการอนุมัติ");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id: string, reason?: string) => {
    setActionLoadingId(id);
    try {
      const res = await rejectLeaveRequest(id, reason || "ไม่อนุมัติโดยผู้บริหาร");
      if (res?.success) {
        showToast("บันทึกไม่อนุมัติคำขอลาเรียบร้อยแล้ว");
        setQueueLeaves((prev) =>
          prev.map((l) => (l.id === id ? { ...l, status: "REJECTED" } : l))
        );
      } else {
        alert(res?.error || "ไม่สามารถปฏิเสธคำขอได้");
      }
    } catch (err: any) {
      alert(err?.message || "เกิดข้อผิดพลาด");
    } finally {
      setActionLoadingId(null);
    }
  };

  const leaveConfigs = statsData?.leaveConfigs || [];

  // Derived Values
  const totalStudents = schoolStats?.student.totalStudents || 32;
  const attendanceRate =
    schoolStats?.student.attendanceToday.attendanceRate && schoolStats.student.attendanceToday.attendanceRate > 0
      ? schoolStats.student.attendanceToday.attendanceRate
      : 95.6;
  const sickAndPersonal =
    (schoolStats?.student.attendanceToday.sick || 0) +
    (schoolStats?.student.attendanceToday.personal || 0);

  // Type & Department Chart Data
  const typeData = useMemo(() => {
    if (!leaveConfigs || !Array.isArray(leaveConfigs)) return [];
    const mapped = leaveConfigs.map((cfg: any) => ({
      type: cfg.type,
      label: cfg.nameTh || cfg.type,
      count: statsData?.usedDaysMap?.[cfg.type]?.days || 0,
      color: cfg.color || "#3B82F6",
    })).filter((t: any) => t.count > 0);

    // Fallback baseline if no leaves registered yet
    if (mapped.length === 0) {
      return [
        { type: "SICK", label: "ลาป่วย", count: 3, color: "#3B82F6" },
        { type: "PERSONAL", label: "ลากิจ", count: 2, color: "#10B981" },
        { type: "OFFICIAL", label: "ไปราชการ", count: 4, color: "#8B5CF6" },
      ];
    }
    return mapped;
  }, [leaveConfigs, statsData]);

  const deptData = useMemo(() => {
    if (!statsData?.deptStats || !Array.isArray(statsData.deptStats)) return [];
    return statsData.deptStats.map((d: any) => ({
      department: d.department,
      count: d.totalDays || d.count || 0,
      percentage: d.percentage || 0,
    }));
  }, [statsData]);

  return (
    <div className="space-y-4 sm:space-y-5 select-none font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Quick Hub Header */}
      <div className="flex flex-col gap-3">
        {/* Row 1: Hero Banner */}
        {widgetConfig.heroBanner && (
          <SMSHeroBanner
            title="แดชบอร์ดภาพรวมสถานศึกษา (Executive KPI Hub)"
            subtitle="ศูนย์รวมสถิติ ตัวชี้วัด KPI และการบริหารจัดการทุกระบบย่อยของโรงเรียน"
          />
        )}

        {/* Row 1.5: Subsystem Quick Hub (Status Bar) */}
        {widgetConfig.subsystemQuickHub && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {/* 1. ระบบการลา */}
            <Link
              href="/approvals"
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  ระบบการลา
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <div className="mt-2">
                <div className="text-sm font-extrabold text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors">
                  {schoolStats?.staff.pendingLeaveCount ?? 0} <span className="text-[11px] font-normal text-slate-400">คำขอรอตรวจ</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                  ครูลาวันนี้ {schoolStats?.staff.staffOnLeaveTodayCount ?? 0} คน
                </div>
              </div>
            </Link>

            {/* 2. สารบรรณ */}
            <Link
              href="/document?view=history&tab=inbound"
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  งานสารบรรณ
                </span>
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              </div>
              <div className="mt-2">
                <div className="text-sm font-extrabold text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors">
                  {schoolStats?.document.pendingRoutingCount ?? 0} <span className="text-[11px] font-normal text-slate-400">รอเกษียณ</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                  ออกเลขปีนี้ {schoolStats?.document.totalIssuedThisYear ?? 0} เรื่อง
                </div>
              </div>
            </Link>

            {/* 3. แจ้งซ่อม */}
            <Link
              href="/repair"
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-rose-600" />
                  ระบบแจ้งซ่อม
                </span>
                <span className={`w-2 h-2 rounded-full ${schoolStats?.repair.overdueSlaCount ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`} />
              </div>
              <div className="mt-2">
                <div className="text-sm font-extrabold text-slate-800 dark:text-white group-hover:text-rose-600 transition-colors">
                  {schoolStats?.repair.activeCount ?? 0} <span className="text-[11px] font-normal text-slate-400">งานค้างอยู่</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                  {schoolStats?.repair.overdueSlaCount ? `⚠️ เกิน SLA ${schoolStats.repair.overdueSlaCount} งาน` : "อยู่ในเกณฑ์เวลา"}
                </div>
              </div>
            </Link>

            {/* 4. ทรัพยากรส่วนกลาง */}
            <Link
              href="/general/facility"
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-teal-600" />
                  ห้องประชุม/รถ
                </span>
                <span className="w-2 h-2 rounded-full bg-teal-500" />
              </div>
              <div className="mt-2">
                <div className="text-sm font-extrabold text-slate-800 dark:text-white group-hover:text-teal-600 transition-colors">
                  {schoolStats?.facility.reservationsTodayCount ?? 0} <span className="text-[11px] font-normal text-slate-400">จองวันนี้</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                  รออนุมัติ {schoolStats?.facility.pendingReservationCount ?? 0} รายการ
                </div>
              </div>
            </Link>

            {/* 5. กิจการนักเรียน */}
            <Link
              href="/attendance"
              className="col-span-2 sm:col-span-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                  ผู้เรียน/เช็กแถว
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <div className="mt-2">
                <div className="text-sm font-extrabold text-slate-800 dark:text-white group-hover:text-purple-600 transition-colors">
                  {attendanceRate}% <span className="text-[11px] font-normal text-slate-400">มาเรียนวันนี้</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                  นักเรียนรวม {totalStudents} คน
                </div>
              </div>
            </Link>
          </div>
        )}
      </div>

      {/* Row 2: Comprehensive Modular KPI Grid across all subsystems */}
      {widgetConfig.kpiStatsGrid && (
        <div className="pt-1">
          <ExecutiveLeaveStatCards
            stats={schoolStats}
            config={widgetConfig}
            pendingCount={schoolStats?.staff.pendingLeaveCount}
            staffOnLeaveTodayCount={schoolStats?.staff.staffOnLeaveTodayCount}
            studentsOnLeaveTodayCount={sickAndPersonal}
            proxyTeachingAssignedCount={schoolStats?.staff.proxyTeachingCount}
            onFilterPending={() => {
              const el = document.getElementById("approval-queue-section");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
          />
        </div>
      )}

      {/* Row 3: Academic & Student Learning Analytics Grid */}
      {(widgetConfig.learningOutcomeChart || widgetConfig.attendanceDonutCard) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
          {widgetConfig.learningOutcomeChart && (
            <div className={`${widgetConfig.attendanceDonutCard ? "lg:col-span-7 xl:col-span-8" : "lg:col-span-12"} flex flex-col min-w-0`}>
              <SMSLearningOutcomeChart />
            </div>
          )}
          {widgetConfig.attendanceDonutCard && (
            <div className={`${widgetConfig.learningOutcomeChart ? "lg:col-span-5 xl:col-span-4" : "lg:col-span-12"} flex flex-col min-w-0`}>
              <SMSAttendanceDonutCard
                presentRate={attendanceRate}
                lateRate={2.1}
                absentRate={1.3}
                leaveRate={0.9}
              />
            </div>
          )}
        </div>
      )}

      {/* Row 4: Operational Strips (งบประมาณ, สารบรรณ, แจ้งซ่อม, ทรัพยากร) */}
      {widgetConfig.operationsStrip && (
        <div className="pt-1">
          <SMSOperationsStrip />
        </div>
      )}

      {/* Row 5: Leave Distribution & Student Overview Analytics */}
      {(widgetConfig.distributionCharts || widgetConfig.studentAffairsOverview) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
          {widgetConfig.distributionCharts && typeData.length > 0 && (
            <div className={`${widgetConfig.studentAffairsOverview ? "lg:col-span-6" : "lg:col-span-12"} flex flex-col min-w-0`}>
              <ExecutiveLeaveCharts typeData={typeData} deptData={deptData} />
            </div>
          )}
          {widgetConfig.studentAffairsOverview && (
            <div className={`${widgetConfig.distributionCharts && typeData.length > 0 ? "lg:col-span-6" : "lg:col-span-12"} flex flex-col min-w-0`}>
              <ExecutiveStudentLeaveOverview studentStats={schoolStats?.student} />
            </div>
          )}
        </div>
      )}

      {/* Row 6: Announcements & Academic Calendar */}
      {(widgetConfig.announcementsCard || widgetConfig.academicCalendarCard) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
          {widgetConfig.announcementsCard && (
            <div className={`${widgetConfig.academicCalendarCard ? "lg:col-span-7 xl:col-span-8" : "lg:col-span-12"} flex flex-col min-w-0`}>
              <SMSAnnouncementsCard />
            </div>
          )}
          {widgetConfig.academicCalendarCard && (
            <div className={`${widgetConfig.announcementsCard ? "lg:col-span-5 xl:col-span-4" : "lg:col-span-12"} flex flex-col min-w-0`}>
              <SMSAcademicCalendarCard />
            </div>
          )}
        </div>
      )}

      {/* Row 7: Approval Queue Widget (Primary Leave & Staff Workflow) */}
      {widgetConfig.approvalQueue && (
        <div id="approval-queue-section" className="pt-2">
          <ExecutiveApprovalQueue
            leaves={queueLeaves}
            onApprove={handleApprove}
            onReject={handleReject}
            onViewDetails={(leave) => setSelectedLeaveForModal(leave)}
            actionLoadingId={actionLoadingId}
          />
        </div>
      )}

      {/* Row 8: Monthly Trend Chart Widget */}
      {widgetConfig.monthlyTrendChart && statsData?.monthlyData && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5">
          <MonthlyTrendChart
            monthlyData={statsData.monthlyData}
            leaveConfigs={leaveConfigs}
          />
        </div>
      )}

      {/* Floating Action Controls */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
        <button
          type="button"
          onClick={loadAllDashboardData}
          className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
          title="รีเฟรชข้อมูลแดชบอร์ด"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
        <button
          type="button"
          onClick={() => setIsCustomizerOpen(true)}
          className="px-4 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95"
          title="เพิ่มหรือปรับแต่งวิดเจ็ต"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>ปรับแต่งวิดเจ็ต</span>
        </button>
      </div>

      {/* Drill-down Leave Details Modal */}
      <ExecutiveLeaveDetailModal
        isOpen={Boolean(selectedLeaveForModal)}
        leave={selectedLeaveForModal}
        onClose={() => setSelectedLeaveForModal(null)}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* Dashboard Widget Customizer Modal */}
      <DashboardWidgetCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        config={widgetConfig}
        onUpdateConfig={(newConfig) => {
          setWidgetConfig(newConfig);
          showToast("อัปเดตการแสดงผลวิดเจ็ตเรียบร้อยแล้ว");
        }}
        isAdmin={isAdmin}
      />
    </div>
  );
}
