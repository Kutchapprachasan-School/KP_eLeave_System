import { prisma } from "@/lib/db";

export const StandardResourceType = {
  SCIENCE_LAB: "SCIENCE_LAB",
  COMPUTER_LAB: "COMPUTER_LAB",
  MUSIC_ROOM: "MUSIC_ROOM",
  GYM: "GYM",
  STADIUM: "STADIUM",
  BUS: "BUS",
  AUDITORIUM: "AUDITORIUM",
} as const;

export type StandardResourceType = typeof StandardResourceType[keyof typeof StandardResourceType];

export interface CreateReservationInput {
  resourceId: string;
  reservedBy: string;
  reservedFor: string;
  startTime: Date | string;
  endTime: Date | string;
}

export interface CapacityUtilizationReport {
  resourceId: string;
  resourceCode: string;
  resourceName: string;
  resourceType: string;
  totalBookedHours: number;
  totalAvailableHours: number;
  utilizationPercent: number;
  reservationCount: number;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictingReservations: Array<{
    id: string;
    resourceId: string;
    reservedBy: string;
    reservedFor: string;
    startTime: Date;
    endTime: Date;
    status: string;
  }>;
}

export class ResourceCapacityEngine {
  /**
   * Checks if a resource is available during the requested time window.
   */
  public async checkAvailability(
    resourceId: string,
    startTime: Date | string,
    endTime: Date | string,
    excludeReservationId?: string
  ): Promise<ConflictCheckResult> {
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Invalid start or end date format.");
    }

    if (start >= end) {
      throw new Error("startTime must be strictly before endTime.");
    }

    const conflictingReservations = await prisma.resourceReservation.findMany({
      where: {
        resourceId,
        ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
        status: { not: "CANCELLED" },
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });

    return {
      hasConflict: conflictingReservations.length > 0,
      conflictingReservations: conflictingReservations.map((r) => ({
        id: r.id,
        resourceId: r.resourceId,
        reservedBy: r.reservedBy,
        reservedFor: r.reservedFor,
        startTime: r.startTime,
        endTime: r.endTime,
        status: r.status,
      })),
    };
  }

  /**
   * Creates a resource reservation if no booking conflicts exist.
   */
  public async createReservation(input: CreateReservationInput) {
    const conflictCheck = await this.checkAvailability(input.resourceId, input.startTime, input.endTime);

    if (conflictCheck.hasConflict) {
      const details = conflictCheck.conflictingReservations
        .map((c) => `Reservation ${c.id} by ${c.reservedBy} (${c.startTime.toISOString()} - ${c.endTime.toISOString()})`)
        .join(", ");
      throw new Error(`Booking conflict detected for resource ${input.resourceId}: ${details}`);
    }

    return prisma.resourceReservation.create({
      data: {
        resourceId: input.resourceId,
        reservedBy: input.reservedBy,
        reservedFor: input.reservedFor,
        startTime: new Date(input.startTime),
        endTime: new Date(input.endTime),
        status: "APPROVED",
      },
      include: { resource: true },
    });
  }

  /**
   * Batch conflict detection across multiple proposed reservation requests.
   */
  public async detectConflicts(
    proposedReservations: Array<{
      resourceId: string;
      startTime: Date | string;
      endTime: Date | string;
    }>
  ) {
    const results = [];

    for (let i = 0; i < proposedReservations.length; i++) {
      const item = proposedReservations[i];
      const dbCheck = await this.checkAvailability(item.resourceId, item.startTime, item.endTime);

      // Also check against previous items in the batch
      const batchConflicts = proposedReservations.slice(0, i).filter((prev) => {
        if (prev.resourceId !== item.resourceId) return false;
        const s1 = new Date(prev.startTime).getTime();
        const e1 = new Date(prev.endTime).getTime();
        const s2 = new Date(item.startTime).getTime();
        const e2 = new Date(item.endTime).getTime();
        return s2 < e1 && e2 > s1;
      });

      const hasConflict = dbCheck.hasConflict || batchConflicts.length > 0;

      results.push({
        index: i,
        resourceId: item.resourceId,
        startTime: item.startTime,
        endTime: item.endTime,
        hasConflict,
        dbConflicts: dbCheck.conflictingReservations,
        batchConflictsCount: batchConflicts.length,
      });
    }

    return results;
  }

  /**
   * Calculates capacity utilization percentage and total booked hours for a resource in a date range.
   */
  public async getCapacityUtilization(
    resourceId: string,
    startDate: Date | string,
    endDate: Date | string,
    dailyOperatingHours: number = 8
  ): Promise<CapacityUtilizationReport> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const resource = await prisma.resourceItem.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new Error(`ResourceItem with ID "${resourceId}" not found.`);
    }

    const reservations = await prisma.resourceReservation.findMany({
      where: {
        resourceId,
        status: { not: "CANCELLED" },
        startTime: { lte: end },
        endTime: { gte: start },
      },
    });

    let totalBookedMs = 0;
    for (const res of reservations) {
      const rStart = res.startTime < start ? start : res.startTime;
      const rEnd = res.endTime > end ? end : res.endTime;
      if (rEnd > rStart) {
        totalBookedMs += rEnd.getTime() - rStart.getTime();
      }
    }

    const totalBookedHours = Math.round((totalBookedMs / (1000 * 60 * 60)) * 100) / 100;
    const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const totalAvailableHours = diffDays * dailyOperatingHours;
    const utilizationPercent = Math.min(
      100,
      Math.round((totalBookedHours / totalAvailableHours) * 10000) / 100
    );

    return {
      resourceId: resource.id,
      resourceCode: resource.code,
      resourceName: resource.name,
      resourceType: resource.resourceType,
      totalBookedHours,
      totalAvailableHours,
      utilizationPercent,
      reservationCount: reservations.length,
    };
  }

  /**
   * Seeds standard school resource items into database if empty.
   */
  public async seedDefaultResources() {
    const defaultResources = [
      { code: "LAB_CHEM_01", name: "ห้องปฏิบัติการเคมี 1", resourceType: StandardResourceType.SCIENCE_LAB, capacity: 40, location: "อาคาร 3 ชั้น 2" },
      { code: "LAB_PHYS_01", name: "ห้องปฏิบัติการฟิสิกส์ 1", resourceType: StandardResourceType.SCIENCE_LAB, capacity: 40, location: "อาคาร 3 ชั้น 3" },
      { code: "LAB_COMP_01", name: "ห้องปฏิบัติการคอมพิวเตอร์ 1", resourceType: StandardResourceType.COMPUTER_LAB, capacity: 45, location: "อาคาร 4 ชั้น 2" },
      { code: "ROOM_MUSIC_01", name: "ห้องซ้อมดนตรีสากล", resourceType: StandardResourceType.MUSIC_ROOM, capacity: 30, location: "อาคารศิลปะ ชั้น 1" },
      { code: "GYM_MAIN", name: "โรงยิมเนเซียมอเนกประสงค์", resourceType: StandardResourceType.GYM, capacity: 300, location: "อาคารพละ" },
      { code: "STADIUM_MAIN", name: "สนามฟุตบอลหลัก", resourceType: StandardResourceType.STADIUM, capacity: 1000, location: "สนามกลาง" },
      { code: "BUS_SCHOOL_01", name: "รถบัสปรับอากาศ 1", resourceType: StandardResourceType.BUS, capacity: 45, location: "ลานจอดรถ" },
      { code: "AUDITORIUM_MAIN", name: "หอประชุมใหญ่", resourceType: StandardResourceType.AUDITORIUM, capacity: 800, location: "อาคารหอประชุม" },
    ];

    for (const r of defaultResources) {
      await prisma.resourceItem.upsert({
        where: { code: r.code },
        update: { name: r.name, resourceType: r.resourceType, capacity: r.capacity, location: r.location },
        create: r,
      });
    }

    return prisma.resourceItem.findMany();
  }
}

export const resourceCapacityEngine = new ResourceCapacityEngine();
