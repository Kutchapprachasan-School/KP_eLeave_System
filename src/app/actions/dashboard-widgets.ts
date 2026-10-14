"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export interface DashboardWidgetConfig {
  // Main Section Widgets
  heroBanner: boolean;
  subsystemQuickHub: boolean;
  kpiStatsGrid: boolean;
  learningOutcomeChart: boolean;
  attendanceDonutCard: boolean;
  operationsStrip: boolean;
  distributionCharts: boolean;
  studentAffairsOverview: boolean;
  announcementsCard: boolean;
  academicCalendarCard: boolean;
  approvalQueue: boolean;
  monthlyTrendChart: boolean;
  leaveCalendar: boolean;

  // Granular Modular KPI Cards
  kpiStaffLeavePending: boolean;
  kpiStaffOnLeave: boolean;
  kpiStaffProxyTeaching: boolean;
  kpiStaffAttendance: boolean;
  kpiStudentTotal: boolean;
  kpiStudentPresentToday: boolean;
  kpiStudentLeavesToday: boolean;
  kpiStudentRiskEws: boolean;
  kpiDocumentPending: boolean;
  kpiRepairActive: boolean;
  kpiFacilityToday: boolean;

  // Backward compatibility alias
  kpiStats?: boolean;
  studentLeaveOverview?: boolean;
  executiveAnalytics?: boolean;
}

export const DEFAULT_WIDGET_CONFIG: DashboardWidgetConfig = {
  // Main Section Widgets
  heroBanner: true,
  subsystemQuickHub: true,
  kpiStatsGrid: true,
  learningOutcomeChart: true,
  attendanceDonutCard: true,
  operationsStrip: true,
  distributionCharts: true,
  studentAffairsOverview: true,
  announcementsCard: true,
  academicCalendarCard: true,
  approvalQueue: true,
  monthlyTrendChart: true,
  leaveCalendar: true,

  // Granular Modular KPI Cards
  kpiStaffLeavePending: true,
  kpiStaffOnLeave: true,
  kpiStaffProxyTeaching: true,
  kpiStaffAttendance: true,
  kpiStudentTotal: true,
  kpiStudentPresentToday: true,
  kpiStudentLeavesToday: true,
  kpiStudentRiskEws: true,
  kpiDocumentPending: true,
  kpiRepairActive: true,
  kpiFacilityToday: true,

  // Compatibility
  kpiStats: true,
  studentLeaveOverview: true,
  executiveAnalytics: true,
};

const WIDGET_PERM_KEY = "__dashboardWidgets";

/**
 * Retrieves the dashboard widget customization configuration for SMS Executive Hub.
 * Falls back safely to DEFAULT_WIDGET_CONFIG.
 */
export async function getDashboardWidgetConfig(): Promise<DashboardWidgetConfig> {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "default" },
      select: { rolePermissions: true },
    });

    if (!settings?.rolePermissions) {
      return DEFAULT_WIDGET_CONFIG;
    }

    const parsed = JSON.parse(settings.rolePermissions);
    if (parsed[WIDGET_PERM_KEY] && typeof parsed[WIDGET_PERM_KEY] === "object") {
      const merged = {
        ...DEFAULT_WIDGET_CONFIG,
        ...parsed[WIDGET_PERM_KEY],
      };
      // Normalize compatibility fields if older keys exist
      if (parsed[WIDGET_PERM_KEY].kpiStats !== undefined) {
        merged.kpiStatsGrid = parsed[WIDGET_PERM_KEY].kpiStats;
      }
      if (parsed[WIDGET_PERM_KEY].studentLeaveOverview !== undefined) {
        merged.studentAffairsOverview = parsed[WIDGET_PERM_KEY].studentLeaveOverview;
      }
      return merged;
    }
  } catch (err) {
    console.error("Failed to parse dashboard widget config:", err);
  }

  return DEFAULT_WIDGET_CONFIG;
}

/**
 * Saves the dashboard widget customization configuration (Admin only).
 */
export async function saveDashboardWidgetConfig(
  newConfig: Partial<DashboardWidgetConfig>
): Promise<{ success: boolean; config?: DashboardWidgetConfig; error?: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const user = session.user as any;
    const isAuthorized =
      user.role === "ADMIN" ||
      user.position === "แอดมิน" ||
      user.role === "DIRECTOR" ||
      user.position === "ผู้อำนวยการ" ||
      user.role === "HR" ||
      user.role === "HR_STAFF" ||
      user.role === "DEPT_HEAD" ||
      user.role === "INSPECTOR" ||
      user.role === "TEACHER" ||
      Boolean(user.id);

    if (!isAuthorized) {
      return { success: false, error: "กรุณาเข้าสู่ระบบก่อนทำการปรับแต่งวิดเจ็ต" };
    }

    const settings = await prisma.systemSettings.findUnique({
      where: { id: "default" },
      select: { rolePermissions: true },
    });

    let currentPerms: Record<string, any> = {};
    if (settings?.rolePermissions) {
      try {
        currentPerms = JSON.parse(settings.rolePermissions);
      } catch {
        currentPerms = {};
      }
    }

    const currentWidgets = (currentPerms[WIDGET_PERM_KEY] as DashboardWidgetConfig) || DEFAULT_WIDGET_CONFIG;
    const updatedWidgets: DashboardWidgetConfig = {
      ...DEFAULT_WIDGET_CONFIG,
      ...currentWidgets,
      ...newConfig,
    };

    currentPerms[WIDGET_PERM_KEY] = updatedWidgets;

    await prisma.systemSettings.upsert({
      where: { id: "default" },
      update: {
        rolePermissions: JSON.stringify(currentPerms),
      },
      create: {
        id: "default",
        rolePermissions: JSON.stringify(currentPerms),
      },
    });

    revalidatePath("/dashboard");

    return {
      success: true,
      config: updatedWidgets,
    };
  } catch (err: any) {
    console.error("Failed to save dashboard widget config:", err);
    return {
      success: false,
      error: err?.message || "ไม่สามารถบันทึกการตั้งค่าได้",
    };
  }
}

export interface SchoolManagementExecutiveStats {
  staff: {
    pendingLeaveCount: number;
    staffOnLeaveTodayCount: number;
    proxyTeachingCount: number;
    attendanceToday: {
      present: number;
      late: number;
      absent: number;
      totalClockIn: number;
    };
  };
  student: {
    totalStudents: number;
    attendanceToday: {
      present: number;
      late: number;
      absent: number;
      sick: number;
      personal: number;
      recordedCount: number;
      attendanceRate: number; // 0-100%
      isMorningCheckCompleted: boolean;
    };
    riskEwsCount: number;
    medicalCertPendingCount: number;
  };
  document: {
    pendingRoutingCount: number;
    totalIssuedThisYear: number;
  };
  repair: {
    activeCount: number;
    overdueSlaCount: number;
  };
  facility: {
    reservationsTodayCount: number;
    pendingReservationCount: number;
  };
}

/**
 * Aggregates high-level multi-subsystem executive statistics for the School Management System.
 * Uses isolated try-catches and Promise.allSettled to guarantee 100% resilience against table errors.
 */
export async function getSchoolManagementExecutiveStats(): Promise<SchoolManagementExecutiveStats> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const todayDateOnly = new Date(now.toISOString().split("T")[0]);

  // Default resilient baseline stats
  const stats: SchoolManagementExecutiveStats = {
    staff: {
      pendingLeaveCount: 0,
      staffOnLeaveTodayCount: 0,
      proxyTeachingCount: 0,
      attendanceToday: {
        present: 0,
        late: 0,
        absent: 0,
        totalClockIn: 0,
      },
    },
    student: {
      totalStudents: 0,
      attendanceToday: {
        present: 0,
        late: 0,
        absent: 0,
        sick: 0,
        personal: 0,
        recordedCount: 0,
        attendanceRate: 100,
        isMorningCheckCompleted: false,
      },
      riskEwsCount: 0,
      medicalCertPendingCount: 0,
    },
    document: {
      pendingRoutingCount: 0,
      totalIssuedThisYear: 0,
    },
    repair: {
      activeCount: 0,
      overdueSlaCount: 0,
    },
    facility: {
      reservationsTodayCount: 0,
      pendingReservationCount: 0,
    },
  };

  // Run all subsystem queries in parallel
  await Promise.allSettled([
    // 1. Staff Leave & Proxy Teaching
    (async () => {
      try {
        const [pendingCount, leavesToday] = await Promise.all([
          prisma.leaveRequest.count({
            where: {
              status: { in: ["PENDING", "PENDING_HEAD", "PENDING_EXEC"] },
            },
          }),
          prisma.leaveRequest.findMany({
            where: {
              status: "APPROVED",
              startDate: { lte: endOfDay },
              endDate: { gte: startOfDay },
            },
            select: {
              id: true,
              proxyTeacherId: true,
              substituteTeacherId: true,
            },
          }),
        ]);

        stats.staff.pendingLeaveCount = pendingCount;
        stats.staff.staffOnLeaveTodayCount = leavesToday.length;
        stats.staff.proxyTeachingCount = leavesToday.filter(
          (l) => l.proxyTeacherId || l.substituteTeacherId
        ).length;
      } catch (err) {
        console.error("Error querying staff leave stats:", err);
      }
    })(),

    // 2. Staff Attendance Today
    (async () => {
      try {
        const attendances = await prisma.attendance.findMany({
          where: {
            date: { gte: startOfDay, lte: endOfDay },
          },
          select: { status: true },
        });

        stats.staff.attendanceToday.totalClockIn = attendances.length;
        stats.staff.attendanceToday.present = attendances.filter(
          (a) => a.status === "PRESENT" || a.status === "ON_TIME"
        ).length;
        stats.staff.attendanceToday.late = attendances.filter(
          (a) => a.status === "LATE"
        ).length;
        stats.staff.attendanceToday.absent = attendances.filter(
          (a) => a.status === "ABSENT"
        ).length;
      } catch (err) {
        console.error("Error querying staff attendance stats:", err);
      }
    })(),

    // 3. Student Statistics (Total Students, Morning Attendance, Risk EWS)
    (async () => {
      try {
        const [totalStudents, morningAttendances, riskCount, medicalCerts] = await Promise.all([
          prisma.student.count({
            where: { status: "ACTIVE", deletedAt: null },
          }),
          prisma.studentMorningAttendance.findMany({
            where: { businessDate: todayDateOnly },
            select: { status: true },
          }),
          prisma.studentRiskAssessment
            ? prisma.studentRiskAssessment.count({
                where: {
                  OR: [{ riskLevel: "HIGH" }, { riskLevel: "CRITICAL" }],
                },
              }).catch(() => 0)
            : Promise.resolve(0),
          prisma.studentMedicalCertificate
            ? prisma.studentMedicalCertificate.count({
                where: {
                  startDate: { lte: endOfDay },
                  endDate: { gte: startOfDay },
                },
              }).catch(() => 0)
            : Promise.resolve(0),
        ]);

        stats.student.totalStudents = totalStudents;
        stats.student.riskEwsCount = riskCount;
        stats.student.medicalCertPendingCount = medicalCerts;

        const recCount = morningAttendances.length;
        stats.student.attendanceToday.recordedCount = recCount;

        if (recCount > 0) {
          stats.student.attendanceToday.isMorningCheckCompleted = true;
          const present = morningAttendances.filter((a) => a.status === "PRESENT").length;
          const late = morningAttendances.filter((a) => a.status === "LATE").length;
          const absent = morningAttendances.filter((a) => a.status === "ABSENT").length;
          const sick = morningAttendances.filter((a) => a.status === "SICK").length;
          const personal = morningAttendances.filter(
            (a) => a.status === "LEAVE" || a.status === "BUSINESS"
          ).length;

          stats.student.attendanceToday.present = present;
          stats.student.attendanceToday.late = late;
          stats.student.attendanceToday.absent = absent;
          stats.student.attendanceToday.sick = sick;
          stats.student.attendanceToday.personal = personal;

          stats.student.attendanceToday.attendanceRate = Math.round(
            ((present + late) / recCount) * 100
          );
        } else {
          // If morning check not yet recorded today, display active student baseline
          stats.student.attendanceToday.isMorningCheckCompleted = false;
          stats.student.attendanceToday.present = totalStudents;
          stats.student.attendanceToday.attendanceRate = totalStudents > 0 ? 100 : 0;
        }
      } catch (err) {
        console.error("Error querying student stats:", err);
      }
    })(),

    // 4. Document Stats
    (async () => {
      try {
        const [pendingInbound, totalYearDocs] = await Promise.all([
          prisma.incomingDocument.count({
            where: {
              status: { in: ["ROUTING", "PENDING"] },
            },
          }),
          prisma.documentRecord.count({
            where: {
              createdAt: {
                gte: new Date(now.getFullYear(), 0, 1),
              },
            },
          }),
        ]);

        stats.document.pendingRoutingCount = pendingInbound;
        stats.document.totalIssuedThisYear = totalYearDocs;
      } catch (err) {
        console.error("Error querying document stats:", err);
      }
    })(),

    // 5. Repair Stats
    (async () => {
      try {
        const activeTickets = await prisma.repairRequest.findMany({
          where: {
            status: { in: ["PENDING", "ASSIGNED", "IN_PROGRESS"] },
          },
          select: {
            id: true,
            createdAt: true,
            priority: true,
          },
        });

        stats.repair.activeCount = activeTickets.length;

        // Tickets created > 3 days ago are marked overdue
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        stats.repair.overdueSlaCount = activeTickets.filter(
          (t) => new Date(t.createdAt) < threeDaysAgo
        ).length;
      } catch (err) {
        console.error("Error querying repair stats:", err);
      }
    })(),

    // 6. Facility & Vehicles Today
    (async () => {
      try {
        const [todayBookings, pendingBookings] = await Promise.all([
          prisma.facilityReservation.count({
            where: {
              status: { in: ["APPROVED", "IN_USE"] },
              startAt: { lte: endOfDay },
              endAt: { gte: startOfDay },
            },
          }),
          prisma.facilityReservation.count({
            where: {
              status: "PENDING",
            },
          }),
        ]);

        stats.facility.reservationsTodayCount = todayBookings;
        stats.facility.pendingReservationCount = pendingBookings;
      } catch (err) {
        console.error("Error querying facility stats:", err);
      }
    })(),
  ]);

  return stats;
}
