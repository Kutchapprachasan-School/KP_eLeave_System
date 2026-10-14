"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import {
  CheckCircle2,
  RefreshCw,
  Sliders,
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

// Existing components
import ExecutiveApprovalQueue, { type LeaveQueueItem } from "./ExecutiveApprovalQueue";
import ExecutiveLeaveDetailModal from "./ExecutiveLeaveDetailModal";
import DashboardWidgetCustomizerModal from "./DashboardWidgetCustomizerModal";
import MonthlyTrendChart from "./MonthlyTrendChart";

// New SMS components matching the mockup
import SMSHeaderBar from "./SMSHeaderBar";
import SMSHeroBanner from "./SMSHeroBanner";
import SMSStatCards from "./SMSStatCards";
import SMSAnalyticsRow from "./SMSAnalyticsRow";
import SMSPerformanceRow from "./SMSPerformanceRow";
import SMSOperationsStrip from "./SMSOperationsStrip";
import SMSSidebarWidgets from "./SMSSidebarWidgets";

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

  // Derive chart data for MonthlyTrendChart
  const leaveConfigs = statsData?.leaveConfigs || [];

  // Compute real stat values from schoolStats
  const totalStudents = schoolStats?.student.totalStudents ?? 0;
  const totalStaff =
    (schoolStats?.staff.attendanceToday.present ?? 0) +
    (schoolStats?.staff.attendanceToday.late ?? 0) +
    (schoolStats?.staff.attendanceToday.absent ?? 0);
  const attendanceRate = schoolStats?.student.attendanceToday.attendanceRate ?? 0;
  const pendingTasks =
    (schoolStats?.staff.pendingLeaveCount ?? 0) +
    (schoolStats?.document.pendingRoutingCount ?? 0) +
    (schoolStats?.repair.activeCount ?? 0);

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Row 0: Header Bar (Search, Term Selector, Notifications, Profile) ── */}
      <SMSHeaderBar />

      {/* ── Main 2-Column Layout: Content + Right Sidebar ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4">
        {/* ── LEFT CONTENT COLUMN ── */}
        <div className="space-y-4 min-w-0">
          {/* Row 1: Hero Banner with Panoramic School Photo */}
          {widgetConfig.heroBanner && (
            <SMSHeroBanner
              schoolName="โรงเรียนคำยางพิทยาคม"
              quote="การศึกษา คือ รากฐาน"
            />
          )}

          {/* Row 2: 4 Big KPI Stat Cards */}
          <SMSStatCards
            totalStudents={totalStudents}
            totalStaff={totalStaff > 0 ? totalStaff : undefined}
            attendanceRate={attendanceRate > 0 ? attendanceRate : undefined}
            pendingTasks={pendingTasks > 0 ? pendingTasks : undefined}
          />

          {/* Row 3: Analytics Row (GPA Summary + Attendance Bar + Personnel Eval Gauge) */}
          <SMSAnalyticsRow />

          {/* Row 4: Performance Row (Personnel Table + Subject Bars + Student Donut) */}
          <SMSPerformanceRow />

          {/* Row 5: Operations Strip (การเงิน/พัสดุ, งานเอกสาร, อาคารสถานที่, สื่อสาร) */}
          <SMSOperationsStrip />

          {/* Row 6: Approval Queue Widget (Primary Leave & Staff Workflow) */}
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

          {/* Row 7: Monthly Trend Chart Widget */}
          {widgetConfig.monthlyTrendChart && statsData?.monthlyData && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-5">
              <MonthlyTrendChart
                monthlyData={statsData.monthlyData}
                leaveConfigs={leaveConfigs}
              />
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR COLUMN (News, Calendar, AI Assistant) ── */}
        <div className="hidden xl:block">
          <SMSSidebarWidgets />
        </div>
      </div>

      {/* Admin Floating Controls */}
      {isAdmin && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
          <button
            type="button"
            onClick={loadAllDashboardData}
            className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsCustomizerOpen(true)}
            className="px-4 py-2.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 font-bold text-xs transition-all shadow-lg flex items-center gap-1.5 cursor-pointer"
            title="ปรับแต่งวิดเจ็ต"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>ปรับแต่ง</span>
          </button>
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
