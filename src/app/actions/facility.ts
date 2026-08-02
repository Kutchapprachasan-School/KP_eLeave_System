"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type CreateFacilityResourceInput = {
  code: string;
  name: string;
  type: "MEETING_ROOM" | "CLASSROOM" | "LABORATORY" | "VEHICLE" | "EQUIPMENT" | "OTHER";
  capacity?: number;
  location?: string;
  description?: string;
};

export type ReserveFacilityInput = {
  resourceId: string;
  reservedByUserId: string;
  consumerModule?: string;
  title: string;
  purpose?: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
};

export async function createFacilityResourceAction(data: CreateFacilityResourceInput) {
  if (!data.code || !data.name) {
    throw new Error("Missing required fields: code, name");
  }
  const resource = await prisma.facilityResource.create({
    data: {
      code: data.code,
      name: data.name,
      type: data.type || "OTHER",
      capacity: data.capacity,
      location: data.location,
      description: data.description,
      status: "AVAILABLE"
    }
  });
  revalidatePath("/academic/settings");
  revalidatePath("/academic/facility");
  return resource;
}

export async function getFacilityResourcesAction(type?: string) {
  const where = type ? { type: type as any } : {};
  return await prisma.facilityResource.findMany({
    where,
    orderBy: { createdAt: "desc" }
  });
}

export async function checkFacilityConflictAction(resourceId: string, startTime: Date, endTime: Date) {
  const existing = await prisma.facilityReservation.findMany({
    where: {
      resourceId,
      status: { in: ["PENDING", "APPROVED"] },
      AND: [
        { startTime: { lt: endTime } },
        { endTime: { gt: startTime } }
      ]
    }
  });
  return existing.length > 0;
}

export async function reserveFacilityAction(data: ReserveFacilityInput) {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);

  const hasConflict = await checkFacilityConflictAction(data.resourceId, start, end);
  if (hasConflict) {
    throw new Error("ช่วงเวลาที่เลือกซ้อนทับกับการจองอื่นในระบบ");
  }

  const reservation = await prisma.facilityReservation.create({
    data: {
      resourceId: data.resourceId,
      reservedByUserId: data.reservedByUserId,
      consumerModule: data.consumerModule || "MANUAL",
      title: data.title,
      purpose: data.purpose,
      startTime: start,
      endTime: end,
      status: "APPROVED"
    }
  });

  revalidatePath("/academic/facility");
  return reservation;
}
