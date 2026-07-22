"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { hasRepairPermission } from "@/lib/permissions";

export interface SummaryReportParams {
  fiscalYear: number; // e.g. 2569 (Buddhist) or 2026 (AD)
  period: "ALL" | "ROUND_1" | "ROUND_2" | "MONTH";
  month?: number; // 1-12
}

export async function getRepairDashboardStatsAction() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("กรุณาเข้าสู่ระบบก่อน");

    const actor = {
      id: session.user.id,
      role: (session.user as any).role ?? "TEACHER",
      position: (session.user as any).position,
    };

    if (!hasRepairPermission(actor, "repair:dashboard")) {
      throw new Error("ไม่มีสิทธิ์เข้าถึงข้อมูลแดชบอร์ด");
    }

    const currentYear = new Date().getFullYear();
    const startDate = new Date(currentYear - 1, 9, 1); // 1 Oct last year
    const endDate = new Date(currentYear, 8, 30, 23, 59, 59); // 30 Sep this year

    const allRequests = await prisma.repairRequest.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        assignee: { select: { id: true, name: true } },
      },
    });

    const activeRequests = allRequests.filter(
      (r) => r.status !== "COMPLETED" && r.status !== "CANCELLED"
    );

    const warningCount = activeRequests.filter((r) => {
      if (!r.expectedFinishAt) return false;
      const diffHours = (r.expectedFinishAt.getTime() - Date.now()) / (1000 * 3600);
      return diffHours > 0 && diffHours <= 48;
    }).length;

    const overdueCount = activeRequests.filter((r) => {
      if (!r.expectedFinishAt) return false;
      return r.expectedFinishAt.getTime() < Date.now();
    }).length;

    const totalCostOverall = allRequests.reduce((acc, r) => {
      return acc + (r.cost ? Number(r.cost) : 0);
    }, 0);

    // Group by category
    const catMap: Record<string, { count: number; totalCost: number }> = {};
    for (const r of allRequests) {
      if (!catMap[r.category]) catMap[r.category] = { count: 0, totalCost: 0 };
      catMap[r.category].count += 1;
      catMap[r.category].totalCost += r.cost ? Number(r.cost) : 0;
    }
    const categories = Object.keys(catMap).map((cat) => ({
      category: cat,
      count: catMap[cat].count,
      totalCost: catMap[cat].totalCost,
    }));

    // Monthly trend
    const monthNames = ["ต.ค.", "พ.ย.", "ธ.ค.", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย."];
    const monthlyTrend = monthNames.map((name, index) => {
      const targetMonthIndex = (index + 9) % 12; // Oct is 9, Nov is 10 ... Sep is 8
      const yearOffset = index < 3 ? currentYear - 1 : currentYear;
      
      const filtered = allRequests.filter((r) => {
        const d = new Date(r.createdAt);
        return d.getMonth() === targetMonthIndex && d.getFullYear() === yearOffset;
      });

      return {
        month: name,
        count: filtered.length,
        completed: filtered.filter((r) => r.status === "COMPLETED").length,
      };
    });

    // Technician performance
    const techMap: Record<string, { id: string; name: string; assigned: number; completed: number; totalHours: number }> = {};
    for (const r of allRequests) {
      if (r.assignee) {
        if (!techMap[r.assignee.id]) {
          techMap[r.assignee.id] = { id: r.assignee.id, name: r.assignee.name, assigned: 0, completed: 0, totalHours: 0 };
        }
        techMap[r.assignee.id].assigned += 1;
        if (r.status === "COMPLETED" && r.finishedAt) {
          techMap[r.assignee.id].completed += 1;
          const duration = (r.finishedAt.getTime() - r.createdAt.getTime()) / (1000 * 3600);
          techMap[r.assignee.id].totalHours += duration;
        }
      }
    }

    const technicians = Object.values(techMap).map((t) => ({
      id: t.id,
      name: t.name,
      assignedCount: t.assigned,
      completedCount: t.completed,
      avgResolutionHours: t.completed > 0 ? Math.round(t.totalHours / t.completed) : 0,
    }));

    const result = {
      totalCostOverall,
      sla: {
        totalActive: activeRequests.length,
        warningCount,
        overdueCount,
        overduePercentage: activeRequests.length > 0 ? Math.round((overdueCount / activeRequests.length) * 100) : 0,
      },
      categories,
      monthlyTrend,
      technicians,
    };

    return JSON.parse(JSON.stringify(result));
  } catch (err: any) {
    console.error("getRepairDashboardStatsAction error:", err);
    throw err;
  }
}

export async function getRepairSummaryReportAction(params: SummaryReportParams) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) throw new Error("กรุณาเข้าสู่ระบบก่อน");

    const actor = {
      id: session.user.id,
      role: (session.user as any).role ?? "TEACHER",
      position: (session.user as any).position,
    };

    if (!hasRepairPermission(actor, "repair:dashboard") && !hasRepairPermission(actor, "repair:export")) {
      throw new Error("ไม่มีสิทธิ์เข้าถึงรายงานสรุป");
    }

    // Convert Buddhist year to AD year if needed (e.g. 2569 -> 2026)
    const adYear = params.fiscalYear > 2500 ? params.fiscalYear - 543 : params.fiscalYear;

    let startDate: Date;
    let endDate: Date;

    if (params.period === "ROUND_1") {
      // Round 1: 1 Oct (adYear - 1) to 31 Mar (adYear)
      startDate = new Date(adYear - 1, 9, 1, 0, 0, 0);
      endDate = new Date(adYear, 2, 31, 23, 59, 59);
    } else if (params.period === "ROUND_2") {
      // Round 2: 1 Apr (adYear) to 30 Sep (adYear)
      startDate = new Date(adYear, 3, 1, 0, 0, 0);
      endDate = new Date(adYear, 8, 30, 23, 59, 59);
    } else if (params.period === "MONTH" && params.month) {
      // Specific Month (1-12)
      const calYear = params.month >= 10 ? adYear - 1 : adYear;
      startDate = new Date(calYear, params.month - 1, 1, 0, 0, 0);
      endDate = new Date(calYear, params.month, 0, 23, 59, 59);
    } else {
      // ALL (Entire Fiscal Year: 1 Oct adYear-1 to 30 Sep adYear)
      startDate = new Date(adYear - 1, 9, 1, 0, 0, 0);
      endDate = new Date(adYear, 8, 30, 23, 59, 59);
    }

    const requests = await prisma.repairRequest.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        requester: { select: { id: true, name: true, position: true } },
        assignee: { select: { id: true, name: true, position: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const statusCounts = {
      PENDING: requests.filter((r) => r.status === "PENDING").length,
      ASSIGNED: requests.filter((r) => r.status === "ASSIGNED").length,
      IN_PROGRESS: requests.filter((r) => r.status === "IN_PROGRESS").length,
      COMPLETED: requests.filter((r) => r.status === "COMPLETED").length,
      CANCELLED: requests.filter((r) => r.status === "CANCELLED").length,
    };

    const totalCost = requests.reduce((acc, r) => acc + (r.cost ? Number(r.cost) : 0), 0);

    const categoryBreakdown: Record<string, { count: number; cost: number }> = {};
    for (const r of requests) {
      if (!categoryBreakdown[r.category]) categoryBreakdown[r.category] = { count: 0, cost: 0 };
      categoryBreakdown[r.category].count += 1;
      categoryBreakdown[r.category].cost += r.cost ? Number(r.cost) : 0;
    }

    const urgencyBreakdown = {
      NORMAL: requests.filter((r) => r.urgency === "NORMAL").length,
      URGENT: requests.filter((r) => r.urgency === "URGENT").length,
      URGENT_MOST: requests.filter((r) => r.urgency === "URGENT_MOST").length,
    };

    const validNonCancelled = requests.length - statusCounts.CANCELLED;
    const completionRate = validNonCancelled > 0 ? Math.round((statusCounts.COMPLETED / validNonCancelled) * 100) : 0;

    const reportData = {
      fiscalYear: params.fiscalYear,
      period: params.period,
      month: params.month ?? null,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalRequests: requests.length,
      completionRate,
      totalCost,
      statusCounts,
      categoryBreakdown,
      urgencyBreakdown,
      requestsList: requests.map((r) => ({
        id: r.id,
        repairNo: r.repairNo,
        title: r.title,
        category: r.category,
        urgency: r.urgency,
        status: r.status,
        location: r.location,
        requesterName: r.requester?.name ?? "ไม่ระบุ",
        assigneeName: r.assignee?.name ?? "ยังไม่มอบหมาย",
        cost: r.cost ? Number(r.cost) : 0,
        createdAt: r.createdAt.toISOString(),
        finishedAt: r.finishedAt ? r.finishedAt.toISOString() : null,
      })),
    };

    return {
      success: true,
      data: JSON.parse(JSON.stringify(reportData)),
    };
  } catch (err: any) {
    console.error("getRepairSummaryReportAction error:", err);
    return { success: false, error: err?.message || "ไม่สามารถดึงรายงานสรุปได้" };
  }
}
