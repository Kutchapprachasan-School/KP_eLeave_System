import crypto from "crypto";
import { z } from "zod";
import { toIsoUtcString } from "./facility-time.ts";
import { mapReservationToDTO } from "./facility-dto.ts";
import type { FacilityReservationDTO } from "./facility-dto.ts";

export const IDEMPOTENCY_CONSTRAINT_NAME = "uq_facility_reservation_user_idempotency";

/**
 * Strict Zod Schema for Reservation Payload Fingerprinting
 * Enforces explicit types so different inputs (e.g. 0 vs null vs "") never produce identical fingerprints.
 */
export const ReservationPayloadSchema = z.object({
  resourceId: z.string().min(1, "Resource ID is required").trim(),
  startAt: z.union([z.string().min(1), z.date()]),
  endAt: z.union([z.string().min(1), z.date()]),
  title: z.string().min(1, "Title is required").trim(),
  purpose: z.string().trim().nullable().optional(),
  attendeeCount: z.number().int().min(1).nullable().optional(),
  department: z.string().trim().nullable().optional(),
  contactPhone: z.string().trim().nullable().optional(),
  roomDetails: z
    .object({
      layoutType: z.string().default("THEATER"),
      requireAirCon: z.boolean().default(true),
      layoutNotes: z.string().trim().nullable().optional(),
      audioVisualNotes: z.string().trim().nullable().optional(),
      cateringNotes: z.string().trim().nullable().optional(),
    })
    .nullable()
    .optional(),
  vehicleDetails: z
    .object({
      missionType: z.string().default("OFFICIAL_MEETING"),
      origin: z.string().trim().default(""),
      destination: z.string().trim().default(""),
      teacherCount: z.number().int().default(0),
      studentCount: z.number().int().default(0),
      passengerListNotes: z.string().trim().nullable().optional(),
      tripNotes: z.string().trim().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export type ValidatedReservationPayload = z.infer<typeof ReservationPayloadSchema>;

/**
 * Recursive Canonicalizer:
 * Recursively sorts object keys alphabetically at all nesting depths.
 * Preserves array element order (order has semantic significance).
 * Normalizes undefined -> null.
 */
export function canonicalizeValue(val: unknown): unknown {
  if (val === null || val === undefined) {
    return null;
  }

  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
    return val;
  }

  if (Array.isArray(val)) {
    return val.map((item) => canonicalizeValue(item));
  }

  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    const sortedObj: Record<string, unknown> = {};
    const sortedKeys = Object.keys(obj).sort();

    for (const key of sortedKeys) {
      sortedObj[key] = canonicalizeValue(obj[key]);
    }
    return sortedObj;
  }

  return String(val);
}

/**
 * Computes a deterministic SHA-256 fingerprint for a reservation payload.
 *
 * Pipeline:
 * 1. Zod schema validation
 * 2. Canonical ISO UTC time normalization
 * 3. Recursive key sorting
 * 4. JSON.stringify without whitespace
 * 5. SHA-256 digest
 */
export function computeCanonicalPayloadHash(rawInput: unknown): string {
  // Step 1: Validate through Zod
  const parsed = ReservationPayloadSchema.parse(rawInput);

  // Step 2: Canonicalize fields
  const normalized = {
    resourceId: parsed.resourceId,
    startAt: toIsoUtcString(parsed.startAt),
    endAt: toIsoUtcString(parsed.endAt),
    title: parsed.title,
    purpose: parsed.purpose ?? null,
    attendeeCount: parsed.attendeeCount ?? null,
    department: parsed.department ?? null,
    contactPhone: parsed.contactPhone ?? null,
    roomDetails: parsed.roomDetails
      ? {
          layoutType: parsed.roomDetails.layoutType,
          requireAirCon: parsed.roomDetails.requireAirCon,
          layoutNotes: parsed.roomDetails.layoutNotes ?? null,
          audioVisualNotes: parsed.roomDetails.audioVisualNotes ?? null,
          cateringNotes: parsed.roomDetails.cateringNotes ?? null,
        }
      : null,
    vehicleDetails: parsed.vehicleDetails
      ? {
          missionType: parsed.vehicleDetails.missionType,
          origin: parsed.vehicleDetails.origin,
          destination: parsed.vehicleDetails.destination,
          teacherCount: parsed.vehicleDetails.teacherCount,
          studentCount: parsed.vehicleDetails.studentCount,
          passengerListNotes: parsed.vehicleDetails.passengerListNotes ?? null,
          tripNotes: parsed.vehicleDetails.tripNotes ?? null,
        }
      : null,
  };

  // Step 3: Recursive key-sort
  const canonicalObj = canonicalizeValue(normalized);

  // Step 4: JSON stringify & SHA-256
  const canonicalJson = JSON.stringify(canonicalObj);
  return crypto.createHash("sha256").update(canonicalJson).digest("hex");
}

/**
 * Checks whether an error is specifically caused by the idempotency unique constraint.
 * Differentiates from other unique violations (e.g. bookingNumber collision).
 */
export function isIdempotencyUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;

  const dbErr = err as {
    code?: string;
    constraint?: string;
    message?: string;
    meta?: { target?: string[] | string };
  };

  // PostgreSQL native 23505 with constraint name
  if (dbErr.code === "23505") {
    if (dbErr.constraint === IDEMPOTENCY_CONSTRAINT_NAME) return true;
    if (dbErr.message?.includes(IDEMPOTENCY_CONSTRAINT_NAME)) return true;
  }

  // Prisma P2002 error
  if (dbErr.code === "P2002") {
    const target = dbErr.meta?.target;
    if (Array.isArray(target)) {
      if (target.includes("idempotencyKey") || target.includes(IDEMPOTENCY_CONSTRAINT_NAME)) {
        return true;
      }
    } else if (typeof target === "string") {
      if (target.includes("idempotencyKey") || target.includes(IDEMPOTENCY_CONSTRAINT_NAME)) {
        return true;
      }
    }
    if (dbErr.message?.includes(IDEMPOTENCY_CONSTRAINT_NAME) || dbErr.message?.includes("idempotencyKey")) {
      return true;
    }
  }

  return false;
}

/**
 * Handles concurrent race recovery when PostgreSQL returns 23505 / P2002.
 * If the collision is genuinely on the idempotency constraint:
 *   - Re-fetches the winner record
 *   - Compares the payload fingerprint
 *   - If identical -> returns mapped DTO (Safe Replay)
 *   - If different -> throws IDEMPOTENCY_MISMATCH
 * If the collision is on ANY OTHER constraint (e.g. bookingNumber) -> rethrows the original error!
 */
export async function recoverFromIdempotencyRace(
  prismaClient: any,
  userId: string,
  idempotencyKey: string,
  expectedPayloadHash: string,
  originalError: unknown
): Promise<FacilityReservationDTO> {
  if (!isIdempotencyUniqueViolation(originalError)) {
    throw originalError;
  }

  // Re-fetch existing winner reservation
  const winner = await prismaClient.facilityReservation.findFirst({
    where: {
      reservedByUserId: userId,
      idempotencyKey: idempotencyKey.trim(),
    },
    include: {
      resource: {
        include: {
          roomProfile: true,
          vehicleProfile: true,
        },
      },
      reservedByUser: true,
      approvalSteps: {
        include: { approver: true },
        orderBy: { stepNo: "asc" },
      },
      assignments: {
        include: {
          driverProfile: {
            include: { user: true },
          },
        },
      },
      roomDetails: true,
      vehicleDetails: true,
    },
  });

  if (!winner) {
    // Highly unexpected edge case: race condition without winner record
    throw originalError;
  }

  if (winner.idempotencyPayloadHash === expectedPayloadHash) {
    // Safe Replay
    return mapReservationToDTO(winner);
  }

  throw new Error("IDEMPOTENCY_MISMATCH:ไม่สามารถใช้ Idempotency Key ซ้ำกับข้อมูลคำขอที่แตกต่างกันได้");
}
