import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentLeaveCycle, getLeaveCycleFilter } from "@/lib/cycle";
import { getDashboardStats } from "@/app/actions/leave";

export async function GET(req: Request) {
  try {
    // Basic auth check if a cron secret is set, otherwise allow for now or check headers
    // Vercel Cron passes a Bearer token matching CRON_SECRET
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cycle = getCurrentLeaveCycle();
    const now = new Date();
    
    // Check if we are past the cycle end date
    // We only archive if we are in the last day of the cycle, or just passed it.
    // However, if we just run this cron every day at midnight, we can check if the current date is the *first* day of a new cycle (Oct 1 or Apr 1)
    
    const month = now.getMonth();
    const date = now.getDate();
    
    // October 1st or April 1st
    if (month === 9 && date === 1) {
      
      // Determine previous cycle label for archiving
      let prevCycleDate = new Date(now);
      prevCycleDate.setDate(prevCycleDate.getDate() - 1); // Get last day of previous month
      
      const prevCycle = getLeaveCycleFilter(prevCycleDate, "year")!;

      // Check if we already archived this cycle
      const existing = await prisma.leaveArchive.findFirst({
        where: { cycleLabel: prevCycle.label }
      });

      if (existing) {
        return NextResponse.json({ status: "skipped", reason: "Already archived" });
      }

      // Simulate a session for getDashboardStats internally or fetch data manually
      const users = await prisma.user.findMany({
        where: { role: { not: "ADMIN" } },
        select: { id: true, name: true, position: true, subjectGroup: true }
      });

      const snapshotData: any[] = [];
      let totalDaysUsed = 0;

      for (const user of users) {
        const userRequests = await prisma.leaveRequest.findMany({
          where: {
            userId: user.id,
            status: "APPROVED",
            startDate: { gte: prevCycle.start, lte: prevCycle.end }
          }
        });

        const leaves: Record<string, number> = {};
        let userTotal = 0;

        for (const req of userRequests) {
          const days = Math.ceil((req.endDate.getTime() - req.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          leaves[req.type] = (leaves[req.type] || 0) + days;
          userTotal += days;
        }

        if (userTotal > 0) {
          totalDaysUsed += userTotal;
          snapshotData.push({
            userId: user.id,
            userName: user.name,
            position: user.position,
            subjectGroup: user.subjectGroup,
            totalDays: userTotal,
            leaves
          });
        }
      }

      await prisma.$transaction(async (tx) => {
        // 1. Create Archive
        await tx.leaveArchive.create({
          data: {
            cycleLabel: prevCycle.label,
            cycleStart: prevCycle.start,
            cycleEnd: prevCycle.end,
            data: JSON.stringify(snapshotData),
            totalStaff: snapshotData.length,
            totalDays: totalDaysUsed,
            archivedBy: "SYSTEM"
          }
        });

        // 2. Delete the actual LeaveRequests that fall entirely within the old cycle
        await tx.leaveRequest.deleteMany({
          where: {
            startDate: { gte: prevCycle.start, lte: prevCycle.end }
          }
        });
      });

      return NextResponse.json({ status: "success", archivedCycle: prevCycle.label });
    }

    return NextResponse.json({ status: "skipped", reason: "Not cut-off date" });
  } catch (error: any) {
    console.error("Auto Archive Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
