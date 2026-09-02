"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { assertFacilityPermission } from "@/lib/permissions";
import type { Prisma, ReservationStatus, ResourceType, ResourceStatus } from "@prisma/client";

export type CreateFacilityResourceInput = {
  code: string;
  name: string;
  type: ResourceType;
  capacity?: number;
  location?: string;
  description?: string;
  roomProfile?: {
    floor?: string;
    hasProjector?: boolean;
    hasSoundSystem?: boolean;
    hasVideoConference?: boolean;
    airConditionerCount?: number;
  };
  vehicleProfile?: {
    licensePlate: string;
    brand?: string;
    model?: string;
    fuelType?: string;
    seatCapacity?: number;
    currentOdometer?: number;
  };
};

export type ReserveFacilityInput = {
  resourceId: string;
  consumerModule?: "MEETING_ROOM" | "VEHICLE" | "MANUAL";
  title: string;
  purpose?: string;
  startAt: string; // ISO String
  endAt: string;   // ISO String
  attendeeCount?: number;
  department?: string;
  contactPhone?: string;
  attachments?: any;
  roomDetails?: {
    layoutType?: any;
    layoutNotes?: string;
    audioVisualNotes?: string;
    cateringNotes?: string;
    requireAirCon?: boolean;
  };
  vehicleDetails?: {
    missionType?: any;
    origin?: string;
    destination?: string;
    teacherCount?: number;
    studentCount?: number;
    passengerListNotes?: string;
    driverProfileId?: string;
  };
};

/**
 * Gets the current authenticated session user from Better-Auth
 */
async function getSessionUser() {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  return session?.user || null;
}

/**
 * Single Gate: Transition Reservation Status and Synchronize All Resource/Driver Assignments
 * Always runs inside an active Prisma transaction with row-level locking.
 */
export async function transitionReservationStatus(
  tx: Prisma.TransactionClient,
  reservationId: string,
  newStatus: ReservationStatus,
  options?: {
    rejectionReason?: string;
    currentStep?: number;
    comment?: string;
  }
) {
  // 1. Row Lock Master Reservation
  const [lockedMaster] = await tx.$queryRaw<Array<{ id: string; status: ReservationStatus; expiresAt: Date | null }>>`
    SELECT id, status, "expiresAt" FROM "FacilityReservation" WHERE id = ${reservationId} FOR UPDATE
  `;

  if (!lockedMaster) {
    throw new Error("ไม่พบข้อมูลคำขอจองในระบบ");
  }

  // 2. Update Master Reservation
  const updatedReservation = await tx.facilityReservation.update({
    where: { id: reservationId },
    data: {
      status: newStatus,
      rejectionReason: options?.rejectionReason,
      ...(options?.currentStep !== undefined && { currentStep: options.currentStep })
    }
  });

  // 3. Synchronize All Schedulable Assignments in Exact Same Transaction
  await tx.reservationResourceAssignment.updateMany({
    where: { reservationId },
    data: { status: newStatus }
  });

  return updatedReservation;
}

/**
 * Deterministic Mutation Protocol Wrapper with DB Exclusion Guard (PostgreSQL Code 23P01 catch)
 * Order: Lock Resource Row -> Lock Driver Row (if present) -> Execute Mutation -> Catch Exclusion Violations
 */
export async function executeReservationMutation<T>(
  resourceId: string,
  driverProfileId: string | null | undefined,
  mutationFn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Lock Resource Row
      const [resource] = await tx.$queryRaw<Array<{ id: string; type: string }>>`
        SELECT id, type FROM "FacilityResource" WHERE id = ${resourceId} FOR UPDATE
      `;
      if (!resource) throw new Error("ไม่พบข้อมูลทรัพยากร");

      // 2. Lock Driver Row (if assigned)
      if (driverProfileId) {
        const [driver] = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "DriverProfile" WHERE id = ${driverProfileId} AND "isActive" = true FOR UPDATE
        `;
        if (!driver) throw new Error("ไม่พบข้อมูลพนักงานขับรถหรือสถานะคนขับไม่พร้อมปฏิบัติงาน");
      }

      // 3. Execute Mutation Body
      return await mutationFn(tx);
    }, {
      isolationLevel: "ReadCommitted",
      timeout: 10000
    });
  } catch (error: any) {
    // Catch PostgreSQL code 23P01 (exclusion_violation) or Prisma P2002/P2034
    if (
      error.code === "23P01" ||
      error.code === "P2002" ||
      error.message?.includes("exclusion") ||
      error.message?.includes("no_overlapping")
    ) {
      throw new Error("ขออภัย ทรัพยากรหรือพนักงานขับรถถูกจองไปแล้วในช่วงเวลาดังกล่าว (Database Exclusion Violation)");
    }
    throw error;
  }
}

/**
 * Calculates dynamic SLA Expiry based on module policy and Server Clock
 */
async function calculateDynamicSlaExpiry(
  moduleType: ResourceType,
  startAt: Date,
  serverNow: Date = new Date()
): Promise<Date> {
  const policy = await prisma.facilityApprovalPolicy.findFirst({
    where: { moduleType, stepNo: 1, isActive: true }
  });

  const slaHours = policy?.slaHours ?? (moduleType === "VEHICLE" ? 48 : 24);
  const bufferHours = policy?.bufferHoursBefore ?? 6;

  const slaTarget = new Date(serverNow.getTime() + slaHours * 60 * 60 * 1000);
  const bufferTarget = new Date(startAt.getTime() - bufferHours * 60 * 60 * 1000);

  return bufferTarget < slaTarget ? bufferTarget : slaTarget;
}

/**
 * Create a new Facility/Vehicle Reservation (Queue hold as PENDING with SLA Expiry)
 */
export async function reserveFacilityAction(input: ReserveFacilityInput) {
  const user = await getSessionUser();
  if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนทำรายการ");

  const startAt = new Date(input.startAt);
  const endAt = new Date(input.endAt);
  const serverNow = new Date();

  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
    throw new Error("รูปแบบวันที่และเวลาไม่ถูกต้อง");
  }

  if (endAt <= startAt) {
    throw new Error("เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น");
  }

  // Min duration 15 minutes
  if (endAt.getTime() - startAt.getTime() < 15 * 60 * 1000) {
    throw new Error("ระยะเวลาการจองต้องไม่น้อยกว่า 15 นาที");
  }

  const driverId = input.vehicleDetails?.driverProfileId;

  return await executeReservationMutation(input.resourceId, driverId, async (tx) => {
    // 1. Application-level Overlap Pre-check (Resource)
    const conflictingResource = await tx.reservationResourceAssignment.findFirst({
      where: {
        resourceId: input.resourceId,
        status: { in: ["PENDING", "APPROVED", "IN_USE"] },
        AND: [
          { startAt: { lt: endAt } },
          { endAt: { gt: startAt } }
        ]
      }
    });

    if (conflictingResource) {
      throw new Error("ทรัพยากรนี้ถูกจองในช่วงเวลาดังกล่าวแล้ว");
    }

    // 2. Application-level Overlap Pre-check (Driver)
    if (driverId) {
      const conflictingDriver = await tx.reservationResourceAssignment.findFirst({
        where: {
          driverProfileId: driverId,
          status: { in: ["PENDING", "APPROVED", "IN_USE"] },
          AND: [
            { startAt: { lt: endAt } },
            { endAt: { gt: startAt } }
          ]
        }
      });

      if (conflictingDriver) {
        throw new Error("พนักงานขับรถท่านนี้มีภารกิจอื่นในช่วงเวลาดังกล่าวแล้ว");
      }
    }

    // Get Resource Type for Prefix and SLA
    const resource = await tx.facilityResource.findUnique({
      where: { id: input.resourceId }
    });
    if (!resource) throw new Error("ไม่พบข้อมูลทรัพยากร");

    const prefix = resource.type === "VEHICLE" ? "FV" : "FR";
    const count = await tx.facilityReservation.count();
    const bookingNumber = `${prefix}-${serverNow.getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const expiresAt = await calculateDynamicSlaExpiry(resource.type, startAt, serverNow);

    // 3. Create Master Reservation
    const reservation = await tx.facilityReservation.create({
      data: {
        bookingNumber,
        resourceId: input.resourceId,
        reservedByUserId: user.id,
        consumerModule: input.consumerModule || (resource.type === "VEHICLE" ? "VEHICLE" : "MEETING_ROOM"),
        title: input.title,
        purpose: input.purpose,
        startAt,
        endAt,
        expiresAt,
        attendeeCount: input.attendeeCount,
        department: input.department,
        contactPhone: input.contactPhone,
        status: "PENDING",
        currentStep: 1,
        totalSteps: 2,
        attachments: input.attachments || {},
        // Create Snapshot Approval Steps
        approvalSteps: {
          create: [
            {
              stepNo: 1,
              roleRequired: resource.type === "VEHICLE" ? "HEAD_VEHICLE" : "HEAD_FACILITY",
              title: resource.type === "VEHICLE" ? "การจัดสรรยานพาหนะและพนักงานขับรถ" : "การตรวจสอบสถานที่และโสตทัศนูปกรณ์",
              status: "PENDING"
            },
            {
              stepNo: 2,
              roleRequired: "DIRECTOR",
              title: "การอนุมัติขั้นสุดท้ายของผู้อำนวยการโรงเรียน",
              status: "PENDING"
            }
          ]
        },
        // Create Schedulable Assignments
        assignments: {
          create: [
            {
              targetType: "RESOURCE",
              resourceId: input.resourceId,
              startAt,
              endAt,
              status: "PENDING"
            },
            ...(driverId ? [{
              targetType: "DRIVER" as const,
              driverProfileId: driverId,
              startAt,
              endAt,
              status: "PENDING" as const
            }] : [])
          ]
        },
        // Extension Details
        ...(input.roomDetails ? {
          roomDetails: {
            create: {
              layoutType: input.roomDetails.layoutType || "THEATER",
              layoutNotes: input.roomDetails.layoutNotes,
              audioVisualNotes: input.roomDetails.audioVisualNotes,
              cateringNotes: input.roomDetails.cateringNotes,
              requireAirCon: input.roomDetails.requireAirCon ?? true
            }
          }
        } : {}),
        ...(input.vehicleDetails ? {
          vehicleDetails: {
            create: {
              missionType: input.vehicleDetails.missionType || "OFFICIAL_MEETING",
              origin: input.vehicleDetails.origin || "โรงเรียนกุดจับประชาสรรค์",
              destination: input.vehicleDetails.destination || "-",
              teacherCount: input.vehicleDetails.teacherCount ?? 1,
              studentCount: input.vehicleDetails.studentCount ?? 0,
              passengerListNotes: input.vehicleDetails.passengerListNotes
            }
          }
        } : {})
      },
      include: {
        resource: true,
        approvalSteps: true,
        assignments: true,
        roomDetails: true,
        vehicleDetails: true
      }
    });

    revalidatePath("/facility");
    revalidatePath("/general/facility");
    revalidatePath("/academic/facility");

    return reservation;
  });
}

/**
 * Step 1: Section Head Review & Driver Allocation
 */
export async function reviewFacilityReservationHeadAction(
  reservationId: string,
  data: {
    driverProfileId?: string;
    layoutNotes?: string;
    audioVisualNotes?: string;
    comment?: string;
  }
) {
  const user = await getSessionUser();
  if (!user) throw new Error("กรุณาเข้าสู่ระบบ");

  const existing = await prisma.facilityReservation.findUnique({
    where: { id: reservationId },
    include: { resource: true }
  });
  if (!existing) throw new Error("ไม่พบคำขอจอง");

  const permission = existing.resource.type === "VEHICLE" ? "facility:vehicle.manage" : "facility:room.manage";
  assertFacilityPermission(user, permission as any);

  return await executeReservationMutation(existing.resourceId, data.driverProfileId, async (tx) => {
    const reservation = await tx.facilityReservation.findUnique({
      where: { id: reservationId },
      include: { assignments: true }
    });
    if (!reservation || reservation.status !== "PENDING") {
      throw new Error("คำขอนี้ไม่ได้อยู่ในสถานะรอพิจารณา");
    }

    // If driver is allocated, check conflict & create/update Driver Assignment row
    if (data.driverProfileId) {
      const driverConflict = await tx.reservationResourceAssignment.findFirst({
        where: {
          driverProfileId: data.driverProfileId,
          reservationId: { not: reservationId },
          status: { in: ["PENDING", "APPROVED", "IN_USE"] },
          AND: [
            { startAt: { lt: reservation.endAt } },
            { endAt: { gt: reservation.startAt } }
          ]
        }
      });

      if (driverConflict) {
        throw new Error("พนักงานขับรถท่านนี้มีภารกิจขับรถคันอื่นในช่วงเวลาดังกล่าวแล้ว");
      }

      // Upsert Driver Assignment
      await tx.reservationResourceAssignment.deleteMany({
        where: { reservationId, targetType: "DRIVER" }
      });
      await tx.reservationResourceAssignment.create({
        data: {
          reservationId,
          targetType: "DRIVER",
          driverProfileId: data.driverProfileId,
          startAt: reservation.startAt,
          endAt: reservation.endAt,
          status: reservation.status
        }
      });

      await tx.vehicleReservationDetail.updateMany({
        where: { reservationId },
        data: { driverAssignedAt: new Date() }
      });
    }

    if (data.layoutNotes || data.audioVisualNotes) {
      await tx.roomReservationDetail.updateMany({
        where: { reservationId },
        data: {
          layoutNotes: data.layoutNotes,
          audioVisualNotes: data.audioVisualNotes
        }
      });
    }

    // Step 1 Snapshot Approval
    await tx.facilityApprovalStep.updateMany({
      where: { reservationId, stepNo: 1 },
      data: {
        status: "APPROVED",
        approverUserId: user.id,
        comment: data.comment,
        actedAt: new Date()
      }
    });

    await tx.facilityReservation.update({
      where: { id: reservationId },
      data: { currentStep: 2 }
    });

    revalidatePath("/facility");
    return { success: true };
  });
}

/**
 * Step 2: Director Final Approval with Concurrency Re-Check & SLA Freshness
 */
export async function approveFacilityReservationDirectorAction(
  reservationId: string,
  data?: { comment?: string }
) {
  const user = await getSessionUser();
  if (!user) throw new Error("กรุณาเข้าสู่ระบบ");
  assertFacilityPermission(user, "facility:approve.director");

  const existing = await prisma.facilityReservation.findUnique({
    where: { id: reservationId },
    include: { assignments: true }
  });
  if (!existing) throw new Error("ไม่พบคำขอจอง");

  const driverAssignment = existing.assignments.find(a => a.targetType === "DRIVER");

  return await executeReservationMutation(existing.resourceId, driverAssignment?.driverProfileId, async (tx) => {
    // 1. Row Lock & SLA Check
    const [res] = await tx.$queryRaw<Array<{ id: string; status: ReservationStatus; expiresAt: Date | null }>>`
      SELECT id, status, "expiresAt" FROM "FacilityReservation" WHERE id = ${reservationId} FOR UPDATE
    `;

    if (!res) throw new Error("ไม่พบคำขอจอง");
    if (res.status !== "PENDING") {
      throw new Error(`ไม่สามารถอนุมัติได้เนื่องจากคำขออยู่ในสถานะ ${res.status}`);
    }

    if (res.expiresAt && new Date() > new Date(res.expiresAt)) {
      throw new Error("คำขอนี้หมดอายุตาม SLA แล้ว ไม่สามารถอนุมัติได้ (ระบบจะทำการยกเลิกอัตโนมัติ)");
    }

    // 2. Atomic Re-Check Overlap against already APPROVED or IN_USE items
    const conflictResource = await tx.reservationResourceAssignment.findFirst({
      where: {
        resourceId: existing.resourceId,
        reservationId: { not: reservationId },
        status: { in: ["APPROVED", "IN_USE"] },
        AND: [
          { startAt: { lt: existing.endAt } },
          { endAt: { gt: existing.startAt } }
        ]
      }
    });

    if (conflictResource) {
      throw new Error("ไม่สามารถอนุมัติได้ เนื่องจากทรัพยากรถูกอนุมัติให้รายการอื่นในช่วงเวลาเดียวกันไปแล้ว");
    }

    if (driverAssignment?.driverProfileId) {
      const conflictDriver = await tx.reservationResourceAssignment.findFirst({
        where: {
          driverProfileId: driverAssignment.driverProfileId,
          reservationId: { not: reservationId },
          status: { in: ["APPROVED", "IN_USE"] },
          AND: [
            { startAt: { lt: existing.endAt } },
            { endAt: { gt: existing.startAt } }
          ]
        }
      });

      if (conflictDriver) {
        throw new Error("ไม่สามารถอนุมัติได้ เนื่องจากพนักงานขับรถถูกมอบหมายให้รายการอื่นไปแล้ว");
      }
    }

    // 3. Step 2 Snapshot Approval
    await tx.facilityApprovalStep.updateMany({
      where: { reservationId, stepNo: 2 },
      data: {
        status: "APPROVED",
        approverUserId: user.id,
        comment: data?.comment,
        actedAt: new Date()
      }
    });

    // 4. Single Gate Lifecycle Transition
    const updated = await transitionReservationStatus(tx, reservationId, "APPROVED", { currentStep: 2 });

    revalidatePath("/facility");
    return updated;
  });
}

/**
 * Rejects reservation
 */
export async function rejectFacilityReservationAction(reservationId: string, reason: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("กรุณาเข้าสู่ระบบ");

  return await prisma.$transaction(async (tx) => {
    const reservation = await tx.facilityReservation.findUnique({
      where: { id: reservationId },
      include: { approvalSteps: true }
    });

    if (!reservation || reservation.status !== "PENDING") {
      throw new Error("สามารถปฏิเสธได้เฉพาะคำขอที่อยู่ในสถานะรออนุมัติเท่านั้น");
    }

    // Snapshot active step
    await tx.facilityApprovalStep.updateMany({
      where: { reservationId, status: "PENDING" },
      data: {
        status: "REJECTED",
        approverUserId: user.id,
        comment: reason,
        actedAt: new Date()
      }
    });

    const updated = await transitionReservationStatus(tx, reservationId, "REJECTED", { rejectionReason: reason });
    revalidatePath("/facility");
    return updated;
  });
}

/**
 * Strict Cancellation Action
 */
export async function cancelFacilityReservationAction(reservationId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("กรุณาเข้าสู่ระบบ");

  return await prisma.$transaction(async (tx) => {
    const reservation = await tx.facilityReservation.findUnique({
      where: { id: reservationId }
    });

    if (!reservation) throw new Error("ไม่พบคำขอจอง");

    if (reservation.status === "COMPLETED" || reservation.status === "REJECTED") {
      throw new Error("รายการนี้เสร็จสิ้นหรือถูกปฏิเสธแล้ว ไม่สามารถยกเลิกได้ (Immutable Record)");
    }

    const isOwner = reservation.reservedByUserId === user.id;
    const isAdmin = user.role === "ADMIN";

    if (reservation.status === "IN_USE" && !isAdmin) {
      throw new Error("ภารกิจกำลังดำเนินการอยู่ เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถยกเลิกฉุกเฉินได้");
    }

    if (reservation.status === "APPROVED" && isOwner && !isAdmin) {
      const oneHourBefore = new Date(reservation.startAt.getTime() - 60 * 60 * 1000);
      if (new Date() > oneHourBefore) {
        throw new Error("ไม่อนุญาตให้ยกเลิกล่วงหน้าน้อยกว่า 1 ชั่วโมงก่อนถึงเวลาเริ่มใช้งาน");
      }
    }

    const updated = await transitionReservationStatus(tx, reservationId, "CANCELLED", {
      rejectionReason: `ยกเลิกโดย ${user.name || user.email}`
    });

    revalidatePath("/facility");
    return updated;
  });
}

/**
 * Idempotent SLA Auto-Cancel Cleanup Action
 */
export async function cleanupExpiredPendingReservationsAction() {
  const serverNow = new Date();

  const candidates = await prisma.facilityReservation.findMany({
    where: {
      status: "PENDING",
      expiresAt: { lte: serverNow }
    },
    select: { id: true, resourceId: true }
  });

  let cancelledCount = 0;

  for (const candidate of candidates) {
    try {
      await executeReservationMutation(candidate.resourceId, null, async (tx) => {
        const [locked] = await tx.$queryRaw<Array<{ id: string; status: ReservationStatus; expiresAt: Date | null }>>`
          SELECT id, status, "expiresAt" FROM "FacilityReservation" WHERE id = ${candidate.id} FOR UPDATE
        `;

        if (locked && locked.status === "PENDING" && locked.expiresAt && serverNow >= new Date(locked.expiresAt)) {
          await transitionReservationStatus(tx, candidate.id, "CANCELLED", {
            rejectionReason: "หมดเวลาการพิจารณาอนุมัติตาม SLA อัตโนมัติ (SLA Timeout Auto-Cancelled)"
          });
          cancelledCount++;
        }
      });
    } catch {
      // Safely ignore concurrent approval race errors
    }
  }

  revalidatePath("/facility");
  return { cancelledCount };
}

/**
 * Complete Vehicle Trip (Post-Trip Immutability Freezing)
 */
export async function completeVehicleTripAction(
  reservationId: string,
  data: {
    startMileage?: number;
    endMileage?: number;
    fuelCost?: number;
    tripNotes?: string;
  }
) {
  const user = await getSessionUser();
  if (!user) throw new Error("กรุณาเข้าสู่ระบบ");

  return await prisma.$transaction(async (tx) => {
    const reservation = await tx.facilityReservation.findUnique({
      where: { id: reservationId },
      include: { vehicleDetails: true }
    });

    if (!reservation) throw new Error("ไม่พบคำขอจอง");
    if (reservation.status !== "IN_USE" && reservation.status !== "APPROVED") {
      throw new Error("สามารถบันทึกสิ้นสุดภารกิจได้เฉพาะรายการที่กำลังใช้งานหรือได้รับการอนุมัติแล้ว");
    }

    if (data.startMileage !== undefined || data.endMileage !== undefined || data.fuelCost !== undefined || data.tripNotes !== undefined) {
      await tx.vehicleReservationDetail.updateMany({
        where: { reservationId },
        data: {
          startMileage: data.startMileage,
          endMileage: data.endMileage,
          fuelCost: data.fuelCost,
          tripNotes: data.tripNotes
        }
      });

      // Update vehicle current odometer if endMileage is provided
      if (data.endMileage && data.endMileage > 0) {
        await tx.vehicleProfile.updateMany({
          where: { resourceId: reservation.resourceId },
          data: { currentOdometer: data.endMileage }
        });
      }
    }

    const updated = await transitionReservationStatus(tx, reservationId, "COMPLETED");
    revalidatePath("/facility");
    return updated;
  });
}

/**
 * Query Facility Resources with Profiles
 */
export async function getFacilityResourcesAction(type?: ResourceType) {
  const where = type ? { type } : {};
  return await prisma.facilityResource.findMany({
    where,
    include: {
      roomProfile: true,
      vehicleProfile: true
    },
    orderBy: { code: "asc" }
  });
}

/**
 * Query Facility Reservations with Full Details
 */
export async function getFacilityReservationsAction(params?: {
  resourceId?: string;
  consumerModule?: string;
  status?: ReservationStatus;
  startDate?: string;
  endDate?: string;
}) {
  const where: any = {};
  if (params?.resourceId) where.resourceId = params.resourceId;
  if (params?.consumerModule) where.consumerModule = params.consumerModule;
  if (params?.status) where.status = params.status;
  if (params?.startDate || params?.endDate) {
    where.startAt = {};
    if (params.startDate) where.startAt.gte = new Date(params.startDate);
    if (params.endDate) where.startAt.lte = new Date(params.endDate);
  }

  return await prisma.facilityReservation.findMany({
    where,
    include: {
      resource: {
        include: {
          roomProfile: true,
          vehicleProfile: true
        }
      },
      reservedByUser: {
        select: { id: true, name: true, email: true, role: true, department: true }
      },
      approvalSteps: {
        include: {
          approver: {
            select: { id: true, name: true, role: true }
          }
        },
        orderBy: { stepNo: "asc" }
      },
      assignments: {
        include: {
          driverProfile: {
            include: {
              user: { select: { id: true, name: true, phoneNumber: true } }
            }
          }
        }
      },
      roomDetails: true,
      vehicleDetails: true
    },
    orderBy: { startAt: "desc" }
  });
}

/**
 * Query Active Driver Profiles
 */
export async function getDriverProfilesAction() {
  return await prisma.driverProfile.findMany({
    where: { isActive: true },
    include: {
      user: {
        select: { id: true, name: true, email: true, phoneNumber: true }
      }
    },
    orderBy: { createdAt: "asc" }
  });
}

/**
 * Create Facility Resource Action
 */
export async function createFacilityResourceAction(data: CreateFacilityResourceInput) {
  const user = await getSessionUser();
  if (!user) throw new Error("กรุณาเข้าสู่ระบบ");
  assertFacilityPermission(user, "facility:resource.create");

  return await prisma.facilityResource.create({
    data: {
      code: data.code,
      name: data.name,
      type: data.type,
      capacity: data.capacity,
      location: data.location,
      description: data.description,
      status: "AVAILABLE",
      ...(data.roomProfile ? {
        roomProfile: {
          create: {
            floor: data.roomProfile.floor,
            hasProjector: data.roomProfile.hasProjector ?? true,
            hasSoundSystem: data.roomProfile.hasSoundSystem ?? true,
            hasVideoConference: data.roomProfile.hasVideoConference ?? false,
            airConditionerCount: data.roomProfile.airConditionerCount ?? 2
          }
        }
      } : {}),
      ...(data.vehicleProfile ? {
        vehicleProfile: {
          create: {
            licensePlate: data.vehicleProfile.licensePlate,
            brand: data.vehicleProfile.brand,
            model: data.vehicleProfile.model,
            fuelType: data.vehicleProfile.fuelType || "DIESEL",
            seatCapacity: data.vehicleProfile.seatCapacity ?? 12,
            currentOdometer: data.vehicleProfile.currentOdometer ?? 0
          }
        }
      } : {})
    },
    include: {
      roomProfile: true,
      vehicleProfile: true
    }
  });
}
