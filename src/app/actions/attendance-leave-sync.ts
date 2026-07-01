"use server";

import { prisma } from "@/lib/db";

export interface ApprovedLeave {
  userId: string;
  startDate: Date;
  endDate: Date;
  type: string;
}

/**
 * Fetch all approved leave requests for specified users in a given date range
 */
export async function getApprovedLeavesForPeriod(
  userIds: string[],
  startDate: Date,
  endDate: Date
): Promise<ApprovedLeave[]> {
  const start = new Date(startDate);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);

  const leaves = await prisma.leaveRequest.findMany({
    where: {
      userId: { in: userIds },
      status: "APPROVED",
      startDate: { lte: end },
      endDate: { gte: start },
    },
    select: {
      userId: true,
      startDate: true,
      endDate: true,
      type: true,
    },
  });

  return leaves as ApprovedLeave[];
}

/**
 * Checks if a specific date falls within a user's approved leave range
 */
export function isDateOnLeave(date: Date, userId: string, leaves: ApprovedLeave[]): boolean {
  const targetTime = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

  return leaves.some((l) => {
    if (l.userId !== userId) return false;

    const leaveStart = Date.UTC(l.startDate.getUTCFullYear(), l.startDate.getUTCMonth(), l.startDate.getUTCDate());
    const leaveEnd = Date.UTC(l.endDate.getUTCFullYear(), l.endDate.getUTCMonth(), l.endDate.getUTCDate());

    return targetTime >= leaveStart && targetTime <= leaveEnd;
  });
}
