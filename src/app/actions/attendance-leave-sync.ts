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
