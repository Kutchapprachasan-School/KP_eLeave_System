"use server";

import prisma from "@/lib/prisma";
import { requireAdminOrHR } from "./settings";
import { getApprovedLeavesForPeriod } from "./attendance-leave-sync";
import { isDateOnLeave } from "@/lib/attendance-utils";
import { getTimezoneMemo } from "./leave";

export async function getTodayAttendanceStats() {
  await requireAdminOrHR();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // 1. Get today's attendance records
  const attendances = await prisma.attendance.findMany({
    where: { attendanceDate: today },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          position: true,
          subjectGroup: true,
        }
      }
    }
  });

  // 2. Get active users list to determine pending clock-ins
  const allUsers = await prisma.user.findMany({
    where: { isApproved: true },
    select: {
      id: true,
      name: true,
      position: true,
      subjectGroup: true,
    }
  });

  const userIds = allUsers.map(u => u.id);
  const leaves = await getApprovedLeavesForPeriod(userIds, today, today);
  const tz = await getTimezoneMemo();

  // Apply leave status overrides to existing attendance records
  attendances.forEach(a => {
    const hasLeave = isDateOnLeave(today, a.userId, leaves, tz);
    if (hasLeave && a.status !== "PRESENT") {
      a.status = "LEAVE";
    }
  });

  const presentUsers = attendances.filter(a => a.status === "PRESENT");
  const lateUsers = attendances.filter(a => a.status === "LATE");
  const leaveUsers = attendances.filter(a => a.status === "LEAVE");
  
  const checkedInUserIds = new Set(attendances.map(a => a.userId));
  const pendingUsers = allUsers.filter(u => !checkedInUserIds.has(u.id));

  // Filter out pending users who have approved leaves and count them as leave
  const pendingLeaveUsers = pendingUsers.filter(u => isDateOnLeave(today, u.id, leaves, tz));
  const pendingLeaveUserIds = new Set(pendingLeaveUsers.map(u => u.id));
  const realPendingUsers = pendingUsers.filter(u => !pendingLeaveUserIds.has(u.id));

  return {
    summary: {
      present: presentUsers.length,
      late: lateUsers.length,
      leave: leaveUsers.length + pendingLeaveUsers.length,
      pending: realPendingUsers.length,
      total: allUsers.length
    },
    lateList: lateUsers.map(a => ({
      id: a.id,
      name: a.user.name || "ไม่ระบุชื่อ",
      checkIn: a.checkInTime ? new Date(a.checkInTime).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }) : "-",
      subjectGroup: a.user.subjectGroup || "ทั่วไป"
    })),
    pendingList: realPendingUsers.map(u => ({
      id: u.id,
      name: u.name || "ไม่ระบุชื่อ",
      position: u.position || "ครู",
      subjectGroup: u.subjectGroup || "ทั่วไป"
    }))
  };
}

export async function getIndividualAttendanceStats(
  userId: string,
  periodType: "monthly" | "round1" | "round2" | "fiscal",
  periodValue?: string
) {
  await requireAdminOrHR();

  let startDate = new Date();
  let endDate = new Date();

  const currentYear = new Date().getFullYear();

  if (periodType === "monthly") {
    const [year, month] = (periodValue || `${currentYear}-${new Date().getMonth() + 1}`).split("-").map(Number);
    startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    endDate = new Date(Date.UTC(year, month, 0, 0, 0, 0, 0));
  } else if (periodType === "round1") {
    // Round 1: 1 Oct - 31 Mar (Fiscal Year Assessment)
    const year = Number(periodValue) || currentYear;
    startDate = new Date(Date.UTC(year - 1, 9, 1, 0, 0, 0, 0)); // Oct of previous year
    endDate = new Date(Date.UTC(year, 2, 31, 0, 0, 0, 0)); // Mar of target year
  } else if (periodType === "round2") {
    // Round 2: 1 Apr - 30 Sep
    const year = Number(periodValue) || currentYear;
    startDate = new Date(Date.UTC(year, 3, 1, 0, 0, 0, 0)); // Apr
    endDate = new Date(Date.UTC(year, 8, 30, 0, 0, 0, 0)); // Sep
  } else if (periodType === "fiscal") {
    const year = Number(periodValue) || currentYear;
    startDate = new Date(Date.UTC(year - 1, 9, 1, 0, 0, 0, 0)); // Oct of previous year
    endDate = new Date(Date.UTC(year, 8, 30, 0, 0, 0, 0)); // Sep of target year
  }

  const attendances = await prisma.attendance.findMany({
    where: {
      userId,
      attendanceDate: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: {
      attendanceDate: "asc"
    }
  });

  const leaves = await getApprovedLeavesForPeriod([userId], startDate, endDate);
  const tz = await getTimezoneMemo();

  // Apply overrides to existing records
  attendances.forEach(a => {
    const hasLeave = isDateOnLeave(a.attendanceDate, userId, leaves, tz);
    if (hasLeave && a.status !== "PRESENT") {
      a.status = "LEAVE" as any;
    }
  });

  // Synthesize virtual LEAVE records for leave days with no attendance records
  const existingDates = new Set(attendances.map(a => 
    Date.UTC(a.attendanceDate.getUTCFullYear(), a.attendanceDate.getUTCMonth(), a.attendanceDate.getUTCDate())
  ));

  const synthesized: typeof attendances = [];
  const startMs = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
  const endMs = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());

  const oneDayMs = 24 * 60 * 60 * 1000;
  for (let currentMs = startMs; currentMs <= endMs; currentMs += oneDayMs) {
    const currentDate = new Date(currentMs);
    const hasLeave = isDateOnLeave(currentDate, userId, leaves, tz);
    if (hasLeave && !existingDates.has(currentMs)) {
      synthesized.push({
        id: `virtual-leave-${currentMs}`,
        userId,
        attendanceDate: currentDate,
        checkInTime: null,
        checkOutTime: null,
        status: "LEAVE" as any,
        workShiftId: null,
        createdById: null,
        createdAt: currentDate,
        updatedAt: currentDate
      } as any);
    }
  }

  // Combine and sort
  const combined = [...attendances, ...synthesized].sort((a, b) => 
    a.attendanceDate.getTime() - b.attendanceDate.getTime()
  );

  return combined;
}

export async function getSchoolAttendanceAnalytics() {
  await requireAdminOrHR();
  const tz = await getTimezoneMemo();

  const today = new Date();
  const currentYear = today.getFullYear();
  const fiscalYearStartYear = today.getMonth() >= 9 ? currentYear : currentYear - 1;
  const fiscalStart = new Date(Date.UTC(fiscalYearStartYear, 9, 1, 0, 0, 0, 0));
  const fiscalEnd = new Date(Date.UTC(fiscalYearStartYear + 1, 8, 30, 0, 0, 0, 0));

  // 1. Get lates grouped by subjectGroup
  const lates = await prisma.attendance.findMany({
    where: {
      status: "LATE",
      attendanceDate: {
        gte: fiscalStart,
        lte: fiscalEnd
      }
    },
    include: {
      user: {
        select: { id: true, subjectGroup: true }
      }
    }
  });

  const lateUserIds = Array.from(new Set(lates.map(l => l.userId)));
  const leaves = await getApprovedLeavesForPeriod(lateUserIds, fiscalStart, fiscalEnd);
  const realLates = lates.filter(l => !isDateOnLeave(l.attendanceDate, l.userId, leaves, tz));

  const deptLates: Record<string, number> = {};
  realLates.forEach(l => {
    const group = l.user.subjectGroup || "ทั่วไป";
    deptLates[group] = (deptLates[group] || 0) + 1;
  });

  const deptLatesArray = Object.entries(deptLates).map(([name, count]) => ({ name, count }));

  // 2. Get scanner peak hours distribution (hourly)
  const allEntries = await prisma.attendance.findMany({
    where: {
      checkInTime: { not: null },
      attendanceDate: {
        gte: fiscalStart,
        lte: fiscalEnd
      }
    },
    select: { checkInTime: true }
  });

  const hourlyCounts = Array(24).fill(0);
  allEntries.forEach(e => {
    if (e.checkInTime) {
      const hour = parseInt(new Date(e.checkInTime).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", timeZone: tz }), 10);
      hourlyCounts[hour]++;
    }
  });

  const peakHours = hourlyCounts.map((count, hour) => ({
    hour: `${String(hour).padStart(2, "0")}:00`,
    count
  })).filter(item => {
    const hr = Number(item.hour.split(":")[0]);
    return hr >= 6 && hr <= 18;
  }); // Only 6 AM - 6 PM

  // 3. Get monthly lates trend (last 6 months)
  const startMonthDate = new Date();
  startMonthDate.setUTCDate(1);
  startMonthDate.setUTCMonth(startMonthDate.getUTCMonth() - 5);
  const rangeStart = new Date(Date.UTC(startMonthDate.getUTCFullYear(), startMonthDate.getUTCMonth(), 1, 0, 0, 0, 0));

  const endMonthDate = new Date();
  endMonthDate.setUTCDate(1);
  const rangeEnd = new Date(Date.UTC(endMonthDate.getUTCFullYear(), endMonthDate.getUTCMonth() + 1, 0, 0, 0, 0, 0));

  const attendancesInRange = await prisma.attendance.findMany({
    where: {
      status: "LATE",
      attendanceDate: {
        gte: rangeStart,
        lte: rangeEnd
      }
    },
    select: {
      userId: true,
      attendanceDate: true
    }
  });

  const rangeUserIds = Array.from(new Set(attendancesInRange.map(a => a.userId)));
  const rangeLeaves = await getApprovedLeavesForPeriod(rangeUserIds, rangeStart, rangeEnd);
  const realRangeLates = attendancesInRange.filter(a => !isDateOnLeave(a.attendanceDate, a.userId, rangeLeaves, tz));

  const trendMap: Record<string, number> = {};
  realRangeLates.forEach(a => {
    const dateObj = new Date(a.attendanceDate);
    const y = dateObj.getUTCFullYear();
    const m = dateObj.getUTCMonth();
    const key = `${y}-${m}`;
    trendMap[key] = (trendMap[key] || 0) + 1;
  });

  const latesTrend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - i);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth();
    const key = `${year}-${month}`;
    const count = trendMap[key] || 0;

    latesTrend.push({
      month: d.toLocaleDateString("th-TH", { month: "short", timeZone: "UTC" }),
      count
    });
  }

  return {
    deptLates: deptLatesArray,
    peakHours,
    latesTrend
  };
}
