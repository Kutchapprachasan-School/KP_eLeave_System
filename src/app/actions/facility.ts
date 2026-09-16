"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { assertFacilityPermission, getFacilityRole, hasFacilityPermission } from "@/lib/permissions";
import type { Prisma, ReservationStatus, ResourceType, ResourceStatus } from "@prisma/client";

import { executeFacilityAction, type FacilityActionResult } from "@/services/facility/facility-action-boundary";
import { toDbUtcDate, toIsoUtcString, utcNow, calculateDynamicSlaExpiry as calculateDynamicSlaExpiryUtil } from "@/services/facility/facility-time";
import { mapReservationToDTO, mapResourceToDTO, type FacilityReservationDTO, type FacilityResourceDTO } from "@/services/facility/facility-dto";
import { computeCanonicalPayloadHash, isIdempotencyUniqueViolation, recoverFromIdempotencyRace } from "@/services/facility/facility-idempotency";

export type CreateFacilityResourceInput = {
  code: string;
  name: string;
  type: ResourceType;
  capacity?: number;
  location?: string;
  description?: string;
  status?: ResourceStatus;
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
  idempotencyKey?: string;
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
 * Domain-scoped Authoritative RBAC check:
 * - ADMIN: all domains
 * - HEAD_FACILITY: ROOM / LAB / CLASSROOM / EQUIPMENT / OTHER
 * - HEAD_VEHICLE: VEHICLE only
 */
function assertResourceDomainPermission(user: any, resourceType: ResourceType) {
  const role = getFacilityRole(user);
  if (role === "ADMIN") return;

  if (role === "HEAD_FACILITY") {
    if (resourceType === "VEHICLE") {
      throw new Error("หัวหน้าฝ่ายอาคารสถานที่สามารถจัดการเฉพาะห้องประชุม อาคาร และอุปกรณ์เท่านั้น");
    }
    return;
  }

  if (role === "HEAD_VEHICLE") {
    if (resourceType !== "VEHICLE") {
      throw new Error("หัวหน้างานยานพาหนะสามารถจัดการเฉพาะยานพาหนะโรงเรียนเท่านั้น");
    }
    return;
  }

  throw new Error("ไม่มีสิทธิ์จัดการข้อมูลทรัพยากรส่วนกลาง (ต้องเป็นผู้ดูแลระบบหรือหัวหน้างานที่เกี่ยวข้อง)");
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
 * Deterministic Mutation Protocol Wrapper with Multi-Resource Ordered Row Locking & DB Exclusion Guard
 * Global Lock Hierarchy Contract:
 *   1. FacilityResource[] (Deduplicated & sorted deterministically by ID ascending)
 *   2. DriverProfile[] (Deduplicated & sorted deterministically by ID ascending)
 *   3. FacilityReservation (Master row lock inside transaction body)
 */
export async function executeReservationMutation<T>(
  resourceIdOrIds: string | string[],
  driverProfileIdOrIds: string | string[] | null | undefined,
  mutationFn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  const resourceIds = (Array.isArray(resourceIdOrIds) ? resourceIdOrIds : [resourceIdOrIds])
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort();

  const rawDrivers = driverProfileIdOrIds
    ? (Array.isArray(driverProfileIdOrIds) ? driverProfileIdOrIds : [driverProfileIdOrIds])
    : [];
  const driverIds = rawDrivers
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort();

  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Lock all Resource Rows in deterministic ascending ID order
      for (const rId of resourceIds) {
        const [resource] = await tx.$queryRaw<Array<{ id: string; type: string }>>`
          SELECT id, type FROM "FacilityResource" WHERE id = ${rId} FOR UPDATE
        `;
        if (!resource) throw new Error(`ไม่พบข้อมูลทรัพยากร (ID: ${rId})`);
      }

      // 2. Lock all Driver Rows in deterministic ascending ID order
      for (const dId of driverIds) {
        const [driver] = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "DriverProfile" WHERE id = ${dId} AND "isActive" = true FOR UPDATE
        `;
        if (!driver) throw new Error(`ไม่พบข้อมูลพนักงานขับรถหรือสถานะคนขับไม่พร้อมปฏิบัติงาน (ID: ${dId})`);
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
 * Uses canonical time utility with guaranteed minimum 30-minute grace period
 */
async function calculateDynamicSlaExpiry(
  moduleType: ResourceType,
  startAt: Date | string,
  serverNow: Date = utcNow()
): Promise<Date> {
  const policy = await prisma.facilityApprovalPolicy.findFirst({
    where: { moduleType, stepNo: 1, isActive: true }
  });

  const slaHours = policy?.slaHours ?? (moduleType === "VEHICLE" ? 48 : 24);
  const bufferHours = policy?.bufferHoursBefore ?? 6;

  return calculateDynamicSlaExpiryUtil(startAt, slaHours, bufferHours, serverNow);
}

/**
 * Create a new Facility/Vehicle Reservation (Queue hold as PENDING with SLA Expiry)
 * Hardened with:
 * - executeFacilityAction boundary wrapper (Zero unhandled throw)
 * - Idempotency hash check & PostgreSQL 23505 race recovery
 * - Canonical UTC time mapping (toDbUtcDate)
 * - Post-commit revalidation
 * - Pure Plain DTO return contract
 */
export async function reserveFacilityAction(
  input: ReserveFacilityInput
): Promise<FacilityActionResult<FacilityReservationDTO>> {
  return await executeFacilityAction("reserveFacilityAction", async (_correlationId) => {
    const user = await getSessionUser();
    if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนทำรายการ");

    const startAt = toDbUtcDate(input.startAt);
    const endAt = toDbUtcDate(input.endAt);
    const serverNow = utcNow();

    if (endAt <= startAt) {
      throw new Error("เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น");
    }

    // Min duration 15 minutes
    if (endAt.getTime() - startAt.getTime() < 15 * 60 * 1000) {
      throw new Error("ระยะเวลาการจองต้องไม่น้อยกว่า 15 นาที");
    }

    // Past startAt reject
    if (startAt.getTime() < serverNow.getTime()) {
      throw new Error("ไม่อนุญาตให้ยื่นจองย้อนหลังในอดีตได้");
    }

    // Idempotency Pre-check & Hash Computation
    let payloadHash: string | null = null;
    if (input.idempotencyKey) {
      payloadHash = computeCanonicalPayloadHash(input);

      const existingWinner = await prisma.facilityReservation.findFirst({
        where: {
          reservedByUserId: user.id,
          idempotencyKey: input.idempotencyKey.trim()
        },
        include: {
          resource: {
            include: {
              roomProfile: true,
              vehicleProfile: true
            }
          },
          reservedByUser: true,
          approvalSteps: {
            include: { approver: true },
            orderBy: { stepNo: "asc" }
          },
          assignments: {
            include: {
              driverProfile: {
                include: { user: true }
              }
            }
          },
          roomDetails: true,
          vehicleDetails: true
        }
      });

      if (existingWinner) {
        if (existingWinner.idempotencyPayloadHash === payloadHash) {
          return mapReservationToDTO(existingWinner); // Safe Replay
        }
        throw new Error("IDEMPOTENCY_MISMATCH:ไม่สามารถใช้ Idempotency Key ซ้ำกับข้อมูลคำขอที่แตกต่างกันได้");
      }
    }

    const driverId = input.vehicleDetails?.driverProfileId;

    try {
      return await executeReservationMutation(input.resourceId, driverId, async (tx) => {
        // 0. Physical Availability & Active Status Guard
        const targetResource = await tx.facilityResource.findUnique({
          where: { id: input.resourceId },
          select: { id: true, name: true, status: true, type: true }
        });

        if (!targetResource) {
          throw new Error("ไม่พบข้อมูลทรัพยากรที่ระบุ");
        }

        if (targetResource.status !== "AVAILABLE") {
          const statusLabel = {
            UNDER_MAINTENANCE: "อยู่ระหว่างปรับปรุง/ซ่อมบำรุง",
            OUT_OF_SERVICE: "งดให้บริการชั่วคราว",
            RETIRED: "ยกเลิกการใช้งานแล้ว"
          }[targetResource.status] || targetResource.status;

          throw new Error(`ไม่สามารถทำรายการจองได้ เนื่องจากทรัพยากร "${targetResource.name}" อยู่ในสถานะ "${statusLabel}"`);
        }

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
            idempotencyKey: input.idempotencyKey ? input.idempotencyKey.trim() : null,
            idempotencyPayloadHash: input.idempotencyKey ? payloadHash : null,
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
            resource: {
              include: {
                roomProfile: true,
                vehicleProfile: true
              }
            },
            reservedByUser: true,
            approvalSteps: {
              include: { approver: true },
              orderBy: { stepNo: "asc" }
            },
            assignments: {
              include: {
                driverProfile: {
                  include: { user: true }
                }
              }
            },
            roomDetails: true,
            vehicleDetails: true
          }
        });

        return mapReservationToDTO(reservation);
      });
    } catch (err: unknown) {
      if (input.idempotencyKey && payloadHash && isIdempotencyUniqueViolation(err)) {
        return await recoverFromIdempotencyRace(prisma, user.id, input.idempotencyKey, payloadHash, err);
      }
      throw err;
    }
  }, () => {
    revalidatePath("/facility");
    revalidatePath("/general/facility");
    revalidatePath("/academic/facility");
  });
}

/**
 * Step 1: Section Head Review & Driver Allocation
 */
/**
 * Step 1: Section Head Review & Driver Allocation
 * Hardened with executeFacilityAction and post-commit revalidation
 */
export async function reviewFacilityReservationHeadAction(
  reservationId: string,
  data: {
    driverProfileId?: string;
    layoutNotes?: string;
    audioVisualNotes?: string;
    comment?: string;
  }
): Promise<FacilityActionResult<{ success: boolean; reservation: FacilityReservationDTO }>> {
  return await executeFacilityAction("reviewFacilityReservationHeadAction", async (_correlationId) => {
    const user = await getSessionUser();
    if (!user) throw new Error("กรุณาเข้าสู่ระบบ");

    const existing = await prisma.facilityReservation.findUnique({
      where: { id: reservationId },
      include: { resource: true, assignments: true }
    });
    if (!existing) throw new Error("ไม่พบคำขอจอง");

    const permission = existing.resource.type === "VEHICLE" ? "facility:vehicle.manage" : "facility:room.manage";
    assertFacilityPermission(user, permission as any);

    const resourceIds = Array.from(new Set([existing.resourceId, ...existing.assignments.map(a => a.resourceId)].filter(Boolean))) as string[];
    const driverIds = Array.from(new Set([data.driverProfileId, ...existing.assignments.map(a => a.driverProfileId)].filter(Boolean))) as string[];

    return await executeReservationMutation(resourceIds, driverIds, async (tx) => {
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
          data: { driverAssignedAt: utcNow() }
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
          actedAt: utcNow()
        }
      });

      const updated = await tx.facilityReservation.update({
        where: { id: reservationId },
        data: { currentStep: 2 },
        include: {
          resource: { include: { roomProfile: true, vehicleProfile: true } },
          reservedByUser: true,
          approvalSteps: { include: { approver: true }, orderBy: { stepNo: "asc" } },
          assignments: { include: { driverProfile: { include: { user: true } } } },
          roomDetails: true,
          vehicleDetails: true
        }
      });

      return {
        success: true,
        reservation: mapReservationToDTO(updated)
      };
    });
  }, () => {
    revalidatePath("/facility");
    revalidatePath("/general/facility");
    revalidatePath("/academic/facility");
    revalidatePath("/facility/settings");
  });
}

/**
 * Step 2: Director Final Approval with Concurrency Re-Check & SLA Freshness
 * Hardened with:
 * - executeFacilityAction boundary wrapper (Zero unhandled throw -> Prevents React Error #441)
 * - Canonical SLA Expiry Check with standardized SLA_EXPIRED error code
 * - Post-commit revalidation
 * - Pure Plain DTO return
 */
export async function approveFacilityReservationDirectorAction(
  reservationId: string,
  data?: { comment?: string }
): Promise<FacilityActionResult<FacilityReservationDTO>> {
  return await executeFacilityAction("approveFacilityReservationDirectorAction", async (_correlationId) => {
    const user = await getSessionUser();
    if (!user) throw new Error("กรุณาเข้าสู่ระบบ");
    assertFacilityPermission(user, "facility:approve.director");

    const existing = await prisma.facilityReservation.findUnique({
      where: { id: reservationId },
      include: { assignments: true }
    });
    if (!existing) throw new Error("ไม่พบคำขอจอง");

    const resourceIds = Array.from(new Set([existing.resourceId, ...existing.assignments.map(a => a.resourceId)].filter(Boolean))) as string[];
    const driverIds = Array.from(new Set(existing.assignments.map(a => a.driverProfileId).filter(Boolean))) as string[];

    return await executeReservationMutation(resourceIds, driverIds, async (tx) => {
      // 1. Row Lock & SLA Check
      const [res] = await tx.$queryRaw<Array<{ id: string; status: ReservationStatus; expiresAt: Date | null }>>`
        SELECT id, status, "expiresAt" FROM "FacilityReservation" WHERE id = ${reservationId} FOR UPDATE
      `;

      if (!res) throw new Error("ไม่พบคำขอจอง");
      if (res.status !== "PENDING") {
        throw new Error(`ไม่สามารถอนุมัติได้เนื่องจากคำขออยู่ในสถานะ ${res.status}`);
      }

      if (res.expiresAt && utcNow().getTime() > new Date(res.expiresAt).getTime()) {
        throw new Error("SLA_EXPIRED:คำขอนี้หมดอายุตาม SLA แล้ว ไม่สามารถอนุมัติได้ (ระบบจะทำการยกเลิกอัตโนมัติ)");
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

      const driverAssignment = existing.assignments.find(a => a.targetType === "DRIVER");
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
          actedAt: utcNow()
        }
      });

      // 4. Single Gate Lifecycle Transition
      const updated = await transitionReservationStatus(tx, reservationId, "APPROVED", { currentStep: 2 });
      return mapReservationToDTO(updated);
    });
  }, () => {
    revalidatePath("/facility");
    revalidatePath("/general/facility");
    revalidatePath("/academic/facility");
    revalidatePath("/facility/settings");
  });
}

/**
 * Rejects reservation
 */
export async function rejectFacilityReservationAction(
  reservationId: string,
  reason: string
): Promise<FacilityActionResult<FacilityReservationDTO>> {
  return await executeFacilityAction("rejectFacilityReservationAction", async (_correlationId) => {
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
          actedAt: utcNow()
        }
      });

      const updated = await transitionReservationStatus(tx, reservationId, "REJECTED", { rejectionReason: reason });
      return mapReservationToDTO(updated);
    });
  }, () => {
    revalidatePath("/facility");
    revalidatePath("/general/facility");
    revalidatePath("/academic/facility");
    revalidatePath("/facility/settings");
  });
}

/**
 * Strict Cancellation Action
 */
export async function cancelFacilityReservationAction(
  reservationId: string
): Promise<FacilityActionResult<FacilityReservationDTO>> {
  return await executeFacilityAction("cancelFacilityReservationAction", async (_correlationId) => {
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
        if (utcNow() > oneHourBefore) {
          throw new Error("ไม่อนุญาตให้ยกเลิกล่วงหน้าน้อยกว่า 1 ชั่วโมงก่อนถึงเวลาเริ่มใช้งาน");
        }
      }

      const updated = await transitionReservationStatus(tx, reservationId, "CANCELLED", {
        rejectionReason: `ยกเลิกโดย ${user.name || user.email}`
      });

      return mapReservationToDTO(updated);
    });
  }, () => {
    revalidatePath("/facility");
    revalidatePath("/general/facility");
    revalidatePath("/academic/facility");
    revalidatePath("/facility/settings");
  });
}

/**
 * Idempotent SLA Auto-Cancel Cleanup Action
 */
export async function cleanupExpiredPendingReservationsAction(): Promise<FacilityActionResult<{ cancelledCount: number }>> {
  return await executeFacilityAction("cleanupExpiredPendingReservationsAction", async (_correlationId) => {
    const serverNow = utcNow();

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

    return { cancelledCount };
  }, () => {
    revalidatePath("/facility");
    revalidatePath("/general/facility");
  });
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
): Promise<FacilityActionResult<FacilityReservationDTO>> {
  return await executeFacilityAction("completeVehicleTripAction", async (_correlationId) => {
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
      return mapReservationToDTO(updated);
    });
  }, () => {
    revalidatePath("/facility");
    revalidatePath("/general/facility");
    revalidatePath("/academic/facility");
  });
}

/**
 * Query Facility Resources with Profiles (excludes RETIRED by default)
 * Returns whitelisted Plain DTOs (Zero Date/Class instance leak)
 */
export async function getFacilityResourcesAction(
  typeOrOptions?: ResourceType | { type?: ResourceType; includeRetired?: boolean }
): Promise<FacilityResourceDTO[]> {
  const options = typeof typeOrOptions === "string" ? { type: typeOrOptions } : typeOrOptions;
  const where: any = {};
  if (options?.type) {
    where.type = options.type;
  }
  if (!options?.includeRetired) {
    where.status = { not: "RETIRED" };
  }
  const resources = await prisma.facilityResource.findMany({
    where,
    include: {
      roomProfile: true,
      vehicleProfile: true
    },
    orderBy: { code: "asc" }
  });
  return resources.map(mapResourceToDTO);
}

export type GetFacilityReservationsFilter = {
  consumerModule?: string;
  status?: ReservationStatus;
  resourceId?: string;
  userId?: string;
  onlyMine?: boolean;
  startDate?: Date | string;
  endDate?: Date | string;
};

/**
 * Query Facility Reservations with all relations
 * Strictly enforces session identity when onlyMine is specified to prevent IDOR
 * Returns whitelisted Plain DTOs (Zero Date/Class instance leak)
 */
export async function getFacilityReservationsAction(
  filter?: GetFacilityReservationsFilter
): Promise<FacilityReservationDTO[]> {
  const where: any = {};
  if (filter?.consumerModule) {
    where.consumerModule = filter.consumerModule;
  }
  if (filter?.status) {
    where.status = filter.status;
  }
  if (filter?.resourceId) {
    where.resourceId = filter.resourceId;
  }

  // Anti-IDOR: onlyMine uses authenticated session user id directly
  if (filter?.onlyMine) {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return [];
    where.reservedByUserId = sessionUser.id;
  } else if (filter?.userId) {
    const sessionUser = await getSessionUser();
    if (sessionUser && (sessionUser.id === filter.userId || hasFacilityPermission(sessionUser, "facility:view.all"))) {
      where.reservedByUserId = filter.userId;
    } else if (sessionUser) {
      where.reservedByUserId = sessionUser.id;
    } else {
      return [];
    }
  }

  if (filter?.startDate || filter?.endDate) {
    where.startAt = {};
    if (filter.startDate) where.startAt.gte = toDbUtcDate(filter.startDate);
    if (filter.endDate) where.startAt.lte = toDbUtcDate(filter.endDate);
  }

  const reservations = await prisma.facilityReservation.findMany({
    where,
    include: {
      resource: {
        include: {
          roomProfile: true,
          vehicleProfile: true
        }
      },
      reservedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          position: true,
          subjectGroup: true,
          phoneNumber: true
        }
      },
      assignments: {
        include: {
          resource: true,
          driverProfile: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phoneNumber: true
                }
              }
            }
          }
        }
      },
      approvalSteps: {
        include: {
          approver: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              position: true
            }
          }
        },
        orderBy: { stepNo: "asc" }
      },
      roomDetails: true,
      vehicleDetails: true
    },
    orderBy: { startAt: "desc" }
  });

  return reservations.map(mapReservationToDTO);
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
 * 1. Create Facility Resource Action (with Domain-scoped RBAC and Profile Invariant)
 */
export async function createFacilityResourceAction(data: CreateFacilityResourceInput) {
  const user = await getSessionUser();
  if (!user) throw new Error("กรุณาเข้าสู่ระบบ");
  assertFacilityPermission(user, "facility:resource.create");
  assertResourceDomainPermission(user, data.type);

  const isVehicle = data.type === "VEHICLE";
  const isRoomLike = ["MEETING_ROOM", "CLASSROOM", "LABORATORY", "EQUIPMENT", "OTHER"].includes(data.type);

  const created = await prisma.facilityResource.create({
    data: {
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      type: data.type,
      capacity: data.capacity ? Number(data.capacity) : null,
      location: data.location?.trim() || null,
      description: data.description?.trim() || null,
      status: data.status || "AVAILABLE",
      ...(isRoomLike ? {
        roomProfile: {
          create: {
            floor: data.roomProfile?.floor || "ชั้น 1",
            hasProjector: data.roomProfile?.hasProjector ?? true,
            hasSoundSystem: data.roomProfile?.hasSoundSystem ?? true,
            hasVideoConference: data.roomProfile?.hasVideoConference ?? false,
            airConditionerCount: data.roomProfile?.airConditionerCount ?? 2
          }
        }
      } : {}),
      ...(isVehicle ? {
        vehicleProfile: {
          create: {
            licensePlate: data.vehicleProfile?.licensePlate?.trim() || data.code.trim().toUpperCase(),
            brand: data.vehicleProfile?.brand?.trim() || "ยานพาหนะโรงเรียน",
            model: data.vehicleProfile?.model?.trim() || "",
            fuelType: data.vehicleProfile?.fuelType || "DIESEL",
            seatCapacity: data.vehicleProfile?.seatCapacity ?? (data.capacity ? Number(data.capacity) : 12),
            currentOdometer: data.vehicleProfile?.currentOdometer ?? 0
          }
        }
      } : {})
    },
    include: {
      roomProfile: true,
      vehicleProfile: true
    }
  });

  revalidatePath("/facility");
  revalidatePath("/general/facility");
  revalidatePath("/academic/facility");
  revalidatePath("/facility/settings");
  return created;
}

/**
 * 2. Update Facility Resource Action (Row-locked, Domain RBAC, Immutable Type & IN_USE Check)
 */
export async function updateFacilityResourceAction(
  id: string,
  data: {
    code?: string;
    name?: string;
    capacity?: number;
    location?: string;
    description?: string;
    status?: ResourceStatus;
    roomProfile?: any;
    vehicleProfile?: any;
  }
) {
  const user = await getSessionUser();
  if (!user) throw new Error("กรุณาเข้าสู่ระบบ");
  assertFacilityPermission(user, "facility:resource.manage");

  return await prisma.$transaction(async (tx) => {
    // 1. Pessimistic Row Lock on FacilityResource
    const [locked] = await tx.$queryRaw<Array<{ id: string; type: ResourceType; status: ResourceStatus }>>`
      SELECT id, type, status FROM "FacilityResource" WHERE id = ${id} FOR UPDATE;
    `;
    if (!locked) throw new Error("ไม่พบข้อมูลทรัพยากร");
    assertResourceDomainPermission(user, locked.type);

    const updateData: any = {
      ...(data.code ? { code: data.code.trim().toUpperCase() } : {}),
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.capacity !== undefined ? { capacity: Number(data.capacity) } : {}),
      ...(data.location !== undefined ? { location: data.location?.trim() || null } : {}),
      ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
    };

    // If changing status, check IN_USE invariant
    if (data.status && data.status !== locked.status) {
      if (data.status === "OUT_OF_SERVICE" || data.status === "UNDER_MAINTENANCE" || data.status === "RETIRED") {
        const activeInUse = await tx.reservationResourceAssignment.findFirst({
          where: { resourceId: id, status: "IN_USE" }
        });
        if (activeInUse) {
          throw new Error(`ไม่สามารถเปลี่ยนสถานะเป็น "${data.status}" ได้ เนื่องจากทรัพยากรนี้กำลังถูกใช้งานจริงในขณะนี้ (IN_USE)`);
        }
      }
      updateData.status = data.status;
    }

    // Upsert profiles appropriately
    if (locked.type === "VEHICLE" && data.vehicleProfile) {
      updateData.vehicleProfile = {
        upsert: {
          create: {
            licensePlate: data.vehicleProfile.licensePlate || data.code || id,
            brand: data.vehicleProfile.brand || "",
            model: data.vehicleProfile.model || "",
            fuelType: data.vehicleProfile.fuelType || "DIESEL",
            seatCapacity: data.vehicleProfile.seatCapacity ?? 12,
            currentOdometer: data.vehicleProfile.currentOdometer ?? 0
          },
          update: {
            ...(data.vehicleProfile.licensePlate ? { licensePlate: data.vehicleProfile.licensePlate } : {}),
            ...(data.vehicleProfile.brand !== undefined ? { brand: data.vehicleProfile.brand } : {}),
            ...(data.vehicleProfile.model !== undefined ? { model: data.vehicleProfile.model } : {}),
            ...(data.vehicleProfile.fuelType !== undefined ? { fuelType: data.vehicleProfile.fuelType } : {}),
            ...(data.vehicleProfile.seatCapacity !== undefined ? { seatCapacity: Number(data.vehicleProfile.seatCapacity) } : {}),
            ...(data.vehicleProfile.currentOdometer !== undefined ? { currentOdometer: Number(data.vehicleProfile.currentOdometer) } : {})
          }
        }
      };
    } else if (locked.type === "MEETING_ROOM" && data.roomProfile) {
      updateData.roomProfile = {
        upsert: {
          create: {
            floor: data.roomProfile.floor || "ชั้น 1",
            hasProjector: data.roomProfile.hasProjector ?? true,
            hasSoundSystem: data.roomProfile.hasSoundSystem ?? true,
            hasVideoConference: data.roomProfile.hasVideoConference ?? false,
            airConditionerCount: data.roomProfile.airConditionerCount ?? 2
          },
          update: {
            ...(data.roomProfile.floor !== undefined ? { floor: data.roomProfile.floor } : {}),
            ...(data.roomProfile.hasProjector !== undefined ? { hasProjector: data.roomProfile.hasProjector } : {}),
            ...(data.roomProfile.hasSoundSystem !== undefined ? { hasSoundSystem: data.roomProfile.hasSoundSystem } : {}),
            ...(data.roomProfile.hasVideoConference !== undefined ? { hasVideoConference: data.roomProfile.hasVideoConference } : {}),
            ...(data.roomProfile.airConditionerCount !== undefined ? { airConditionerCount: Number(data.roomProfile.airConditionerCount) } : {})
          }
        }
      };
    }

    const updated = await tx.facilityResource.update({
      where: { id },
      data: updateData,
      include: {
        roomProfile: true,
        vehicleProfile: true
      }
    });

    revalidatePath("/facility");
    revalidatePath("/general/facility");
    revalidatePath("/academic/facility");
    revalidatePath("/facility/settings");
    return updated;
  });
}

/**
 * 3. Toggle Facility Resource Status Action (Row-locked with IN_USE Guard)
 */
export async function toggleFacilityResourceStatusAction(id: string, newStatus: ResourceStatus) {
  const user = await getSessionUser();
  if (!user) throw new Error("กรุณาเข้าสู่ระบบ");
  assertFacilityPermission(user, "facility:resource.manage");

  return await prisma.$transaction(async (tx) => {
    // 1. Pessimistic Row Lock
    const [locked] = await tx.$queryRaw<Array<{ id: string; type: ResourceType; status: ResourceStatus }>>`
      SELECT id, type, status FROM "FacilityResource" WHERE id = ${id} FOR UPDATE;
    `;
    if (!locked) throw new Error("ไม่พบข้อมูลทรัพยากร");
    assertResourceDomainPermission(user, locked.type);

    // 2. Active IN_USE check
    if (newStatus === "OUT_OF_SERVICE" || newStatus === "UNDER_MAINTENANCE" || newStatus === "RETIRED") {
      const activeInUse = await tx.reservationResourceAssignment.findFirst({
        where: { resourceId: id, status: "IN_USE" }
      });
      if (activeInUse) {
        throw new Error(`ไม่สามารถเปลี่ยนสถานะเป็น "${newStatus}" ได้ เนื่องจากทรัพยากรนี้กำลังถูกใช้งานจริงในขณะนี้ (IN_USE)`);
      }
    }

    const updated = await tx.facilityResource.update({
      where: { id },
      data: { status: newStatus }
    });

    revalidatePath("/facility");
    revalidatePath("/general/facility");
    revalidatePath("/academic/facility");
    revalidatePath("/facility/settings");
    return updated;
  });
}

/**
 * 4. Delete Facility Resource Action (Authoritative Assignment Check with Specific P2003/23503 Fallback)
 */
export async function deleteFacilityResourceAction(id: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("กรุณาเข้าสู่ระบบ");
  assertFacilityPermission(user, "facility:resource.manage");

  return await prisma.$transaction(async (tx) => {
    // 1. Pessimistic Row Lock
    const [locked] = await tx.$queryRaw<Array<{ id: string; type: ResourceType; status: ResourceStatus }>>`
      SELECT id, type, status FROM "FacilityResource" WHERE id = ${id} FOR UPDATE;
    `;
    if (!locked) throw new Error("ไม่พบข้อมูลทรัพยากร");
    assertResourceDomainPermission(user, locked.type);

    // 2. Authoritative check on ReservationResourceAssignment
    const assignmentCount = await tx.reservationResourceAssignment.count({
      where: { resourceId: id }
    });

    if (assignmentCount > 0) {
      // Historical reservations exist -> MUST RETIRE, NEVER HARD DELETE!
      const retired = await tx.facilityResource.update({
        where: { id },
        data: { status: "RETIRED" }
      });
      revalidatePath("/facility");
      revalidatePath("/general/facility");
      revalidatePath("/academic/facility");
      revalidatePath("/facility/settings");
      return { action: "RETIRED" as const, resource: retired };
    }

    // 3. No reservation assignments exist -> Attempt hard delete
    try {
      const deleted = await tx.facilityResource.delete({
        where: { id }
      });
      revalidatePath("/facility");
      revalidatePath("/general/facility");
      revalidatePath("/academic/facility");
      revalidatePath("/facility/settings");
      return { action: "DELETED" as const, resource: deleted };
    } catch (err: any) {
      // Catch ONLY specific foreign key violation errors (P2003 / PostgreSQL 23503)
      const isFkViolation =
        err?.code === "P2003" ||
        err?.code === "23503" ||
        err?.message?.includes("foreign key constraint") ||
        err?.message?.includes("Foreign key constraint failed");

      if (isFkViolation) {
        // Fallback safely to RETIRED to preserve external reference
        const retired = await tx.facilityResource.update({
          where: { id },
          data: { status: "RETIRED" }
        });
        revalidatePath("/facility");
        revalidatePath("/general/facility");
        revalidatePath("/academic/facility");
        revalidatePath("/facility/settings");
        return { action: "RETIRED" as const, resource: retired };
      }

      // Any other unexpected error (network, pool timeout, syntax) MUST be rethrown
      throw err;
    }
  });
}

/**
 * 5. Seed Default Facility Resources Action (ADMIN only + Idempotent Upsert)
 */
export async function seedDefaultFacilityResourcesAction() {
  const user = await getSessionUser();
  if (!user) throw new Error("กรุณาเข้าสู่ระบบ");
  const role = getFacilityRole(user);
  if (role !== "ADMIN") {
    throw new Error("เฉพาะผู้ดูแลระบบ (ADMIN) เท่านั้นที่สามารถสร้างข้อมูลตัวอย่างได้");
  }

  const samples = [
    {
      code: "ROOM-CONF-1",
      name: "ห้องประชุมกุญชร 1",
      type: "MEETING_ROOM" as const,
      capacity: 80,
      location: "อาคาร 1 ชั้น 2",
      description: "ห้องประชุมใหญ่ส่วนกลาง พร้อมโปรเจคเตอร์และเครื่องเสียง",
      status: "AVAILABLE" as const,
      roomProfile: {
        floor: "ชั้น 2",
        hasProjector: true,
        hasSoundSystem: true,
        hasVideoConference: true,
        airConditionerCount: 4
      }
    },
    {
      code: "BUS-01",
      name: "รถบัสปรับอากาศ 45 ที่นั่ง",
      type: "VEHICLE" as const,
      capacity: 45,
      location: "โรงจอดรถยานพาหนะ",
      description: "รถบัสโรงเรียนปรับอากาศ สำหรับทัศนศึกษาและการแข่งขันวิชาการ",
      status: "AVAILABLE" as const,
      vehicleProfile: {
        licensePlate: "นข-4501 อุดรธานี",
        brand: "Hino",
        model: "S'elega VIP",
        fuelType: "DIESEL",
        seatCapacity: 45,
        currentOdometer: 12500
      }
    },
    {
      code: "LAB-CHEM-1",
      name: "ห้องปฏิบัติการเคมี 1",
      type: "LABORATORY" as const,
      capacity: 40,
      location: "อาคารวิทยาศาสตร์ ชั้น 3",
      description: "ห้องปฏิบัติการเคมีและอุปกรณ์ทดลองส่วนกลาง",
      status: "AVAILABLE" as const,
      roomProfile: {
        floor: "ชั้น 3",
        hasProjector: true,
        hasSoundSystem: false,
        hasVideoConference: false,
        airConditionerCount: 2
      }
    }
  ];

  const results = [];
  for (const s of samples) {
    const isVehicle = s.type === "VEHICLE";
    const res = await prisma.facilityResource.upsert({
      where: { code: s.code },
      update: {
        name: s.name,
        type: s.type,
        capacity: s.capacity,
        location: s.location,
        description: s.description,
        status: s.status
      },
      create: {
        code: s.code,
        name: s.name,
        type: s.type,
        capacity: s.capacity,
        location: s.location,
        description: s.description,
        status: s.status,
        ...(isVehicle ? {
          vehicleProfile: {
            create: s.vehicleProfile!
          }
        } : {
          roomProfile: {
            create: s.roomProfile!
          }
        })
      },
      include: {
        roomProfile: true,
        vehicleProfile: true
      }
    });
    results.push(res);
  }

  revalidatePath("/facility");
  return results;
}

/**
 * 6. Get Current User's Facility Role & Permissions
 */
export async function getCurrentFacilityUserRoleAction() {
  const user = await getSessionUser();
  if (!user) {
    return {
      user: null,
      role: "TEACHER" as const,
      canManage: false,
      isAdmin: false,
      canManageRooms: false,
      canManageVehicles: false
    };
  }
  const role = getFacilityRole(user);
  const canManage = hasFacilityPermission(user, "facility:resource.manage");
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: (user as any).role,
      position: (user as any).position
    },
    role,
    canManage,
    isAdmin: role === "ADMIN",
    canManageRooms: role === "ADMIN" || role === "HEAD_FACILITY",
    canManageVehicles: role === "ADMIN" || role === "HEAD_VEHICLE"
  };
}

/**
 * 7. Get Facility System Settings (Hotline, Guidelines, Approvers, Driver Pool)
 */
export async function getFacilitySettingsAction() {
  try {
    let settings = await prisma.facilitySettings.findUnique({
      where: { id: "default" }
    });

    if (!settings) {
      settings = await prisma.facilitySettings.create({
        data: {
          id: "default",
          hotlinePhone: "042-261234",
          guidelinesHtml: `<h3>ระเบียบและแนวปฏิบัติการใช้ทรัพยากรส่วนกลาง</h3>
<ul>
  <li>การจองห้องประชุมควรยื่นล่วงหน้าอย่างน้อย 1 วันทำการ</li>
  <li>การขอใช้รถส่วนกลางสำหรับการเดินทางไปราชการต้องได้รับการอนุมัติจากผู้มีอำนาจตามระเบียบ</li>
  <li>หลังสิ้นสุดภารกิจ ขอความร่วมมือผู้ใช้บริการ/พนักงานขับรถส่งแบบรายงานหลังเสร็จสิ้นภารกิจ (Post-Mission Report)</li>
  <li>กรณีต้องการยกเลิกคำขอ กรุณากดยกเลิกล่วงหน้าเพื่อให้ผู้อื่นสามารถจองต่อได้</li>
</ul>`,
          driverAssignerUserIds: "",
          driverPoolUserIds: "",
          approverStep1UserIds: "",
          approverStep2UserIds: ""
        }
      });
    }

    return settings;
  } catch (error: any) {
    console.error("Error getting facility settings:", error);
    return {
      id: "default",
      hotlinePhone: "042-261234",
      guidelinesHtml: "",
      driverAssignerUserIds: "",
      driverPoolUserIds: "",
      approverStep1UserIds: "",
      approverStep2UserIds: "",
      updatedAt: new Date()
    };
  }
}

/**
 * 8. Update Facility System Settings
 */
export async function updateFacilitySettingsAction(data: {
  hotlinePhone?: string;
  guidelinesHtml?: string;
  driverAssignerUserIds?: string;
  driverPoolUserIds?: string;
  approverStep1UserIds?: string;
  approverStep2UserIds?: string;
}) {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const canManage = hasFacilityPermission(user, "facility:resource.manage");
  if (!canManage) {
    throw new Error("ไม่มีสิทธิ์แก้ไขการตั้งค่าทรัพยากรส่วนกลาง (ต้องมีสิทธิ์ facility:resource.manage หรือแอดมิน)");
  }

  const updated = await prisma.facilitySettings.upsert({
    where: { id: "default" },
    update: {
      ...(data.hotlinePhone !== undefined ? { hotlinePhone: data.hotlinePhone } : {}),
      ...(data.guidelinesHtml !== undefined ? { guidelinesHtml: data.guidelinesHtml } : {}),
      ...(data.driverAssignerUserIds !== undefined ? { driverAssignerUserIds: data.driverAssignerUserIds } : {}),
      ...(data.driverPoolUserIds !== undefined ? { driverPoolUserIds: data.driverPoolUserIds } : {}),
      ...(data.approverStep1UserIds !== undefined ? { approverStep1UserIds: data.approverStep1UserIds } : {}),
      ...(data.approverStep2UserIds !== undefined ? { approverStep2UserIds: data.approverStep2UserIds } : {})
    },
    create: {
      id: "default",
      hotlinePhone: data.hotlinePhone || "042-261234",
      guidelinesHtml: data.guidelinesHtml || "",
      driverAssignerUserIds: data.driverAssignerUserIds || "",
      driverPoolUserIds: data.driverPoolUserIds || "",
      approverStep1UserIds: data.approverStep1UserIds || "",
      approverStep2UserIds: data.approverStep2UserIds || ""
    }
  });

  revalidatePath("/general/facility");
  revalidatePath("/facility");
  revalidatePath("/settings");

  return updated;
}

/**
 * 9. Get Eligible Users for Facility Approvers & Drivers
 */
export async function getFacilityEligibleUsersAction() {
  const users = await prisma.user.findMany({
    where: { isApproved: true },
    select: {
      id: true,
      name: true,
      email: true,
      position: true,
      role: true
    },
    orderBy: { name: "asc" }
  });
  return users;
}


