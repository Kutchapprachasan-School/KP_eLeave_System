import { toIsoUtcString } from "./facility-time.ts";

/**
 * Strict Plain DTO Serialization Contract
 *
 * Allowed primitive whitelist:
 * - string
 * - number
 * - boolean
 * - null
 * - Array of whitelisted values
 * - Plain Object with string keys and whitelisted values
 *
 * ZERO Date, ZERO Decimal, ZERO BigInt, ZERO Class instances.
 */

export interface FacilityResourceDTO {
  id: string;
  code: string;
  name: string;
  type: string;
  capacity: number | null;
  location: string | null;
  description: string | null;
  status: string;
  vehicleProfile: {
    licensePlate: string;
    brand: string | null;
    model: string | null;
    fuelType: string;
    seatCapacity: number;
    currentOdometer: number;
  } | null;
  roomProfile: {
    floor: string | null;
    hasProjector: boolean;
    hasSoundSystem: boolean;
    hasVideoConference: boolean;
    airConditionerCount: number;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface FacilityApprovalStepDTO {
  id: string;
  stepNo: number;
  roleRequired: string;
  title: string;
  status: string;
  approverUserId: string | null;
  approverName: string | null;
  comment: string | null;
  actedAt: string | null;
  createdAt: string;
}

export interface ReservationResourceAssignmentDTO {
  id: string;
  targetType: string;
  resourceId: string | null;
  driverProfileId: string | null;
  driverName: string | null;
  driverPhone: string | null;
  startAt: string;
  endAt: string;
  status: string;
}

export interface FacilityReservationDTO {
  id: string;
  bookingNumber: string | null;
  resourceId: string;
  resourceName: string | null;
  resourceType: string | null;
  reservedByUserId: string;
  reservedByName: string | null;
  consumerModule: string;
  title: string;
  purpose: string | null;
  startAt: string;
  endAt: string;
  expiresAt: string | null;
  attendeeCount: number | null;
  department: string | null;
  contactPhone: string | null;
  status: string;
  currentStep: number;
  totalSteps: number;
  rejectionReason: string | null;
  idempotencyKey: string | null;
  idempotencyPayloadHash: string | null;
  roomDetails: {
    layoutType: string;
    layoutNotes: string | null;
    audioVisualNotes: string | null;
    cateringNotes: string | null;
    requireAirCon: boolean;
  } | null;
  vehicleDetails: {
    missionType: string;
    origin: string;
    destination: string;
    teacherCount: number;
    studentCount: number;
    passengerListNotes: string | null;
    driverAssignedAt: string | null;
    startMileage: number | null;
    endMileage: number | null;
    fuelCost: number | null;
    tripNotes: string | null;
  } | null;
  approvalSteps: FacilityApprovalStepDTO[];
  assignments: ReservationResourceAssignmentDTO[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Validates that an object conforms strictly to the Plain Serializable Whitelist recursively.
 * Throws an Error if any unwhitelisted type (Date, Function, Symbol, BigInt, custom class) is found.
 */
export function assertPlainSerializableWhitelist(val: unknown, path = "root"): void {
  if (val === null || val === undefined) return;

  const t = typeof val;
  if (t === "string" || t === "number" || t === "boolean") {
    if (typeof val === "number" && !Number.isFinite(val)) {
      throw new Error(`SERIALIZATION_VIOLATION: Non-finite number (NaN/Infinity) at ${path}`);
    }
    return;
  }

  if (t === "bigint") {
    throw new Error(`SERIALIZATION_VIOLATION: Unconverted BigInt at ${path}. Must convert to string explicitly.`);
  }

  if (t === "function" || t === "symbol") {
    throw new Error(`SERIALIZATION_VIOLATION: Non-serializable type "${t}" at ${path}`);
  }

  if (val instanceof Date) {
    throw new Error(`SERIALIZATION_VIOLATION: Unconverted Date instance at ${path}. Must convert to ISO string.`);
  }

  if (Array.isArray(val)) {
    for (let i = 0; i < val.length; i++) {
      assertPlainSerializableWhitelist(val[i], `${path}[${i}]`);
    }
    return;
  }

  if (t === "object") {
    const proto = Object.getPrototypeOf(val);
    if (proto !== null && proto !== Object.prototype) {
      throw new Error(`SERIALIZATION_VIOLATION: Object with custom prototype "${proto.constructor?.name}" at ${path}`);
    }

    const obj = val as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      assertPlainSerializableWhitelist(obj[key], `${path}.${key}`);
    }
    return;
  }

  throw new Error(`SERIALIZATION_VIOLATION: Unknown type "${t}" at ${path}`);
}

/**
 * Pure DTO Mapper: FacilityResource -> FacilityResourceDTO
 */
export function mapResourceToDTO(r: any): FacilityResourceDTO {
  if (!r) throw new Error("MAPPING_ERROR: Resource cannot be null");

  const dto: FacilityResourceDTO = {
    id: String(r.id),
    code: String(r.code),
    name: String(r.name),
    type: String(r.type),
    capacity: r.capacity !== null && r.capacity !== undefined ? Number(r.capacity) : null,
    location: r.location !== null && r.location !== undefined ? String(r.location) : null,
    description: r.description !== null && r.description !== undefined ? String(r.description) : null,
    status: String(r.status),
    vehicleProfile: r.vehicleProfile
      ? {
          licensePlate: String(r.vehicleProfile.licensePlate),
          brand: r.vehicleProfile.brand ? String(r.vehicleProfile.brand) : null,
          model: r.vehicleProfile.model ? String(r.vehicleProfile.model) : null,
          fuelType: String(r.vehicleProfile.fuelType || "DIESEL"),
          seatCapacity: Number(r.vehicleProfile.seatCapacity || 12),
          currentOdometer: Number(r.vehicleProfile.currentOdometer || 0),
        }
      : null,
    roomProfile: r.roomProfile
      ? {
          floor: r.roomProfile.floor ? String(r.roomProfile.floor) : null,
          hasProjector: Boolean(r.roomProfile.hasProjector),
          hasSoundSystem: Boolean(r.roomProfile.hasSoundSystem),
          hasVideoConference: Boolean(r.roomProfile.hasVideoConference),
          airConditionerCount: Number(r.roomProfile.airConditionerCount || 0),
        }
      : null,
    createdAt: toIsoUtcString(r.createdAt),
    updatedAt: toIsoUtcString(r.updatedAt),
  };

  assertPlainSerializableWhitelist(dto, "FacilityResourceDTO");
  return dto;
}

/**
 * Pure DTO Mapper: FacilityReservation -> FacilityReservationDTO
 */
export function mapReservationToDTO(r: any): FacilityReservationDTO {
  if (!r) throw new Error("MAPPING_ERROR: Reservation cannot be null");

  const dto: FacilityReservationDTO = {
    id: String(r.id),
    bookingNumber: r.bookingNumber ? String(r.bookingNumber) : null,
    resourceId: String(r.resourceId),
    resourceName: r.resource?.name ? String(r.resource.name) : null,
    resourceType: r.resource?.type ? String(r.resource.type) : null,
    reservedByUserId: String(r.reservedByUserId),
    reservedByName: r.reservedByUser?.name ? String(r.reservedByUser.name) : null,
    consumerModule: String(r.consumerModule || "MANUAL"),
    title: String(r.title),
    purpose: r.purpose ? String(r.purpose) : null,
    startAt: toIsoUtcString(r.startAt),
    endAt: toIsoUtcString(r.endAt),
    expiresAt: r.expiresAt ? toIsoUtcString(r.expiresAt) : null,
    attendeeCount: r.attendeeCount !== null && r.attendeeCount !== undefined ? Number(r.attendeeCount) : null,
    department: r.department ? String(r.department) : null,
    contactPhone: r.contactPhone ? String(r.contactPhone) : null,
    status: String(r.status),
    currentStep: Number(r.currentStep || 1),
    totalSteps: Number(r.totalSteps || 2),
    rejectionReason: r.rejectionReason ? String(r.rejectionReason) : null,
    idempotencyKey: r.idempotencyKey ? String(r.idempotencyKey) : null,
    idempotencyPayloadHash: r.idempotencyPayloadHash ? String(r.idempotencyPayloadHash) : null,
    roomDetails: r.roomDetails
      ? {
          layoutType: String(r.roomDetails.layoutType || "THEATER"),
          layoutNotes: r.roomDetails.layoutNotes ? String(r.roomDetails.layoutNotes) : null,
          audioVisualNotes: r.roomDetails.audioVisualNotes ? String(r.roomDetails.audioVisualNotes) : null,
          cateringNotes: r.roomDetails.cateringNotes ? String(r.roomDetails.cateringNotes) : null,
          requireAirCon: Boolean(r.roomDetails.requireAirCon),
        }
      : null,
    vehicleDetails: r.vehicleDetails
      ? {
          missionType: String(r.vehicleDetails.missionType || "OFFICIAL_MEETING"),
          origin: String(r.vehicleDetails.origin || ""),
          destination: String(r.vehicleDetails.destination || ""),
          teacherCount: Number(r.vehicleDetails.teacherCount || 0),
          studentCount: Number(r.vehicleDetails.studentCount || 0),
          passengerListNotes: r.vehicleDetails.passengerListNotes ? String(r.vehicleDetails.passengerListNotes) : null,
          driverAssignedAt: r.vehicleDetails.driverAssignedAt ? toIsoUtcString(r.vehicleDetails.driverAssignedAt) : null,
          startMileage: r.vehicleDetails.startMileage !== null && r.vehicleDetails.startMileage !== undefined ? Number(r.vehicleDetails.startMileage) : null,
          endMileage: r.vehicleDetails.endMileage !== null && r.vehicleDetails.endMileage !== undefined ? Number(r.vehicleDetails.endMileage) : null,
          fuelCost: r.vehicleDetails.fuelCost !== null && r.vehicleDetails.fuelCost !== undefined ? Number(r.vehicleDetails.fuelCost) : null,
          tripNotes: r.vehicleDetails.tripNotes ? String(r.vehicleDetails.tripNotes) : null,
        }
      : null,
    approvalSteps: Array.isArray(r.approvalSteps)
      ? r.approvalSteps.map((s: any) => ({
          id: String(s.id),
          stepNo: Number(s.stepNo),
          roleRequired: String(s.roleRequired),
          title: String(s.title),
          status: String(s.status),
          approverUserId: s.approverUserId ? String(s.approverUserId) : null,
          approverName: s.approver?.name ? String(s.approver.name) : null,
          comment: s.comment ? String(s.comment) : null,
          actedAt: s.actedAt ? toIsoUtcString(s.actedAt) : null,
          createdAt: toIsoUtcString(s.createdAt),
        }))
      : [],
    assignments: Array.isArray(r.assignments)
      ? r.assignments.map((a: any) => ({
          id: String(a.id),
          targetType: String(a.targetType),
          resourceId: a.resourceId ? String(a.resourceId) : null,
          driverProfileId: a.driverProfileId ? String(a.driverProfileId) : null,
          driverName: a.driverProfile?.user?.name ? String(a.driverProfile.user.name) : null,
          driverPhone: a.driverProfile?.phoneNumber ? String(a.driverProfile.phoneNumber) : null,
          startAt: toIsoUtcString(a.startAt),
          endAt: toIsoUtcString(a.endAt),
          status: String(a.status),
        }))
      : [],
    createdAt: toIsoUtcString(r.createdAt),
    updatedAt: toIsoUtcString(r.updatedAt),
  };

  assertPlainSerializableWhitelist(dto, "FacilityReservationDTO");
  return dto;
}
