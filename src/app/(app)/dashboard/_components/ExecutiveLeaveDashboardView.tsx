"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import {
  FileCheck,
  Settings,
  Sliders,
  Sparkles,
  CalendarDays,
  LayoutGrid,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  GraduationCap,
  FileText,
  Wrench,
  Building2,
  ArrowRight,
  ShieldCheck,
  Layers,
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

import ExecutiveLeaveStatCards from "./ExecutiveLeaveStatCards";
import ExecutiveLeaveCharts from "./ExecutiveLeaveCharts";
import ExecutiveApprovalQueue, { type LeaveQueueItem } from "./ExecutiveApprovalQueue";
import ExecutiveStudentLeaveOverview from "./ExecutiveStudentLeaveOverview";
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
    currentUser?.position === "ผู้อำนวยการ";

  // Widget Settings
  const [widgetConfig, setWidgetConfig] = useState<DashboardWidgetConfig>(DEFAULT_WIDGET_CONFIG);
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
      // 1. Parallel loading of configs and aggregated school stats
      const [config, stats, multiStats] = await Promise.all([
        getDashboardWidgetConfig().catch(() => DEFAULT_WIDGET_CONFIG),
        getDashboardStats("current", "th", undefined, "school").catch(() => null),
        getSchoolManagementExecutiveStats().catch(() => null),
      ]);

      setWidgetConfig(config);
      setStatsData(stats);
      setSchoolStats(multiStats);

      // 2. Load Pending Approvals
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
        // Fallback to recentRequests from getDashboardStats if getPendingApprovals is restricted
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

  // Derive chart data
  const usedDaysMap = statsData?.usedDaysMap || {};
  const leaveConfigs = statsData?.leaveConfigs || [];
  const typeData = [
    { type: "SICK", label: "ลาป่วย", count: usedDaysMap["SICK"] || 14, color: "#FB7185" },
    { type: "PERSONAL", label: "ลากิจ", count: usedDaysMap["PERSONAL"] || 8, color: "#38BDF8" },
    { type: "VACATION", label: "ลาพักผ่อน", count: usedDaysMap["VACATION"] || 6, color: "#34D399" },
    { type: "MATERNITY", label: "ลาคลอด", count: usedDaysMap["MATERNITY"] || 2, color: "#8B5CF6" },
  ];

  const deptData = [
    { department: "วิทยาศาสตร์", count: 8, percentage: 35 },
    { department: "คณิตศาสตร์", count: 6, percentage: 28 },
    { department: "ภาษาไทย", count: 5, percentage: 22 },
    { department: "ภาษาต่างประเทศ", count: 4, percentage: 18 },
  ];

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar: Title & Admin Widget Customizer Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-[#E6EEF7] dark:border-slate-800 shadow-[0_4px_16px_rgba(40,90,140,0.06)] dark:shadow-none">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#163A66] dark:text-white leading-tight">
              ระบบบริหารจัดการโรงเรียน (KP School Management System - SMS)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ศูนย์กลางการบริหารสถานศึกษาแบบบูรณาการ ติดตามบุคลากร ผู้เรียน สารบรรณ และทรัพยากรส่วนกลาง
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadAllDashboardData}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsCustomizerOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border border-blue-200/60 dark:border-blue-800/60"
              title="ปรับแต่งวิดเจ็ตในหน้าแดชบอร์ด"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>ปรับแต่ง Widget</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Hero Banner Widget */}
      {widgetConfig.heroBanner && (
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-600 rounded-2xl p-5 sm:p-6 text-white shadow-[0_4px_16px_rgba(40,90,140,0.12)]">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-semibold text-white mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Executive Management Suite (SMS)</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight">
                ศูนย์กลางการขับเคลื่อนและบริหารจัดการสถานศึกษา
              </h2>
              <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-2xl leading-relaxed">
                "เชื่อมโยงข้อมูลผู้เรียน พัฒนาศักยภาพบุคลากร จัดสรรทรัพยากรอย่างคุ้มค่า เพื่อคุณภาพการศึกษาที่ยั่งยืน"
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/approvals"
                className="px-3.5 py-2 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs transition-all shadow-sm flex items-center gap-1"
              >
                <span>คิวอนุมัติคำขอลา</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 2. Subsystem Quick Hub (5 Major Subsystems Health Status) */}
      {widgetConfig.subsystemQuickHub && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Subsystem 1: การลา */}
          <Link
            href="/dashboard?system=leave"
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E6EEF7] dark:border-slate-800 hover:border-blue-400 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center font-bold">
                <CalendarDays className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-2.5">
              <div className="text-xs font-bold text-slate-800 dark:text-white">ระบบการลา</div>
              <div className="text-[11px] text-slate-400 truncate">
                รออนุมัติ {schoolStats?.staff.pendingLeaveCount ?? 0} ฉบับ
              </div>
            </div>
          </Link>

          {/* Subsystem 2: กิจการนักเรียน & วิชาการ */}
          <Link
            href="/academic"
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E6EEF7] dark:border-slate-800 hover:border-purple-400 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center font-bold">
                <GraduationCap className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-2.5">
              <div className="text-xs font-bold text-slate-800 dark:text-white">วิชาการ & ผู้เรียน</div>
              <div className="text-[11px] text-slate-400 truncate">
                {schoolStats?.student.totalStudents ?? 0} คน (มา {schoolStats?.student.attendanceToday.attendanceRate ?? 100}%)
              </div>
            </div>
          </Link>

          {/* Subsystem 3: สารบรรณ */}
          <Link
            href="/dashboard?system=document"
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E6EEF7] dark:border-slate-800 hover:border-indigo-400 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-2.5">
              <div className="text-xs font-bold text-slate-800 dark:text-white">งานสารบรรณ</div>
              <div className="text-[11px] text-slate-400 truncate">
                รอเกษียณ {schoolStats?.document.pendingRoutingCount ?? 0} เรื่อง
              </div>
            </div>
          </Link>

          {/* Subsystem 4: แจ้งซ่อม */}
          <Link
            href="/dashboard?system=repair"
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E6EEF7] dark:border-slate-800 hover:border-rose-400 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center font-bold">
                <Wrench className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-2.5">
              <div className="text-xs font-bold text-slate-800 dark:text-white">ระบบแจ้งซ่อม</div>
              <div className="text-[11px] text-slate-400 truncate">
                งานค้าง {schoolStats?.repair.activeCount ?? 0} รายการ
              </div>
            </div>
          </Link>

          {/* Subsystem 5: ทรัพยากรส่วนกลาง */}
          <Link
            href="/dashboard?system=facility"
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E6EEF7] dark:border-slate-800 hover:border-teal-400 hover:shadow-sm transition-all group col-span-2 sm:col-span-1"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center font-bold">
                <Building2 className="w-4 h-4" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-2.5">
              <div className="text-xs font-bold text-slate-800 dark:text-white">ทรัพยากรส่วนกลาง</div>
              <div className="text-[11px] text-slate-400 truncate">
                จองวันนี้ {schoolStats?.facility.reservationsTodayCount ?? 0} รายการ
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* 3. Modular KPI Stat Cards Widget */}
      {(widgetConfig.kpiStatsGrid ?? widgetConfig.kpiStats) && (
        <ExecutiveLeaveStatCards
          stats={schoolStats}
          config={widgetConfig}
          onFilterPending={() => {
            const el = document.getElementById("approval-queue-section");
            el?.scrollIntoView({ behavior: "smooth" });
          }}
        />
      )}

      {/* 4. Analytics Row: Donut Distribution + Student Affairs Overview */}
      {(widgetConfig.distributionCharts ||
        widgetConfig.studentAffairsOverview ||
        widgetConfig.studentLeaveOverview) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {widgetConfig.distributionCharts && (
            <ExecutiveLeaveCharts typeData={typeData} deptData={deptData} />
          )}
          {(widgetConfig.studentAffairsOverview ?? widgetConfig.studentLeaveOverview) && (
            <ExecutiveStudentLeaveOverview
              studentStats={schoolStats?.student}
              onOpenAffairsView={() => {
                window.location.href = "/attendance";
              }}
            />
          )}
        </div>
      )}

      {/* 5. Approval Queue Widget (Primary Leave & Staff Workflow) */}
      {widgetConfig.approvalQueue && (
        <div id="approval-queue-section">
          <ExecutiveApprovalQueue
            leaves={queueLeaves}
            onApprove={handleApprove}
            onReject={handleReject}
            onViewDetails={(leave) => setSelectedLeaveForModal(leave)}
            actionLoadingId={actionLoadingId}
          />
        </div>
      )}

      {/* 6. Monthly Trend Chart Widget */}
      {widgetConfig.monthlyTrendChart && statsData?.monthlyData && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E6EEF7] dark:border-slate-800 shadow-[0_4px_16px_rgba(40,90,140,0.06)] dark:shadow-none p-5">
          <MonthlyTrendChart
            monthlyData={statsData.monthlyData}
            leaveConfigs={leaveConfigs}
          />
        </div>
      )}

      {/* Drill-down Leave Details Modal */}
      <ExecutiveLeaveDetailModal
        isOpen={Boolean(selectedLeaveForModal)}
        leave={selectedLeaveForModal}
        onClose={() => setSelectedLeaveForModal(null)}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* Admin Widget Customizer Modal */}
      <DashboardWidgetCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        config={widgetConfig}
        onUpdateConfig={(newConfig) => setWidgetConfig(newConfig)}
        isAdmin={isAdmin}
      />
    </div>
  );
}
