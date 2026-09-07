# Meeting Room & School Vehicle Booking System Design Specification (Production v7.0 - Golden Seal)

## Overview

This specification establishes the production-grade architectural, database, concurrency, security, and UI/UX design for the Meeting Room and School Vehicle Booking subsystems in KP e-Leave.

It hardens the architecture with **Triple-Lock Synchronization & Concurrency Guards**:
1. 🛡️ **Single Source of Lifecycle Truth:** `FacilityReservation` is the sole lifecycle owner; `ReservationResourceAssignment` scheduling rows are synchronized atomically via a centralized transaction helper `transitionReservationStatus(tx, reservationId, newStatus)`.
2. 🔒 **Strict Exclusion Constraint Predicates:** Active states (`PENDING`, `APPROVED`, `IN_USE`) block slots using half-open intervals `[startAt, endAt)`. Inactive states (`REJECTED`, `CANCELLED`, `COMPLETED`) never block slots.
3. ⚡ **SLA Auto-Cancel vs Approval Race Protection:** Both `cleanupExpiredPendingReservationsAction` and `approveFacilityReservationDirectorAction` execute under the exact same row lock (`SELECT id, status, "expiresAt" FROM "FacilityReservation" ... FOR UPDATE`) with explicit SLA freshness assertions, verified by `facilityPendingExpiryApprovalRace.test.js`.
4. ⚙️ **Configurable SLA Policy:** Dynamic SLA calculation per module type (`slaHoursMeetingRoom`, `slaHoursVehicle`, `slaBufferHoursBeforeStart`).
5. 🔁 **Idempotent SLA Cleanup:** Multi-run safety with zero duplicate audits.

---

## 1. Database Schema Specification (`prisma/schema.prisma`)

```prisma
// ==========================================
// ENUMS FOR FACILITY & VEHICLE RESERVATIONS
// ==========================================

enum ResourceType {
  MEETING_ROOM
  CLASSROOM
  LABORATORY
  VEHICLE
  EQUIPMENT
  OTHER
}

enum ResourceStatus {
  AVAILABLE
  UNDER_MAINTENANCE
  OUT_OF_SERVICE
}

enum ReservationStatus {
  PENDING            // อยู่ระหว่างกระบวนการขออนุมัติ (Queue hold with SLA expiry)
  APPROVED           // ได้รับการอนุมัติเรียบร้อย
  REJECTED           // ไม่อนุมัติ / ปฏิเสธ (Frees slot)
  CANCELLED          // ยกเลิกโดยผู้ขอ/แอดมิน/SLA Timeout (Frees slot)
  IN_USE             // กำลังใช้งาน (Core parameters frozen)
  COMPLETED          // เสร็จสิ้นภารกิจ (Frees slot, Fully immutable)
}

enum AssignmentTargetType {
  RESOURCE           // Physical Resource (Room, Vehicle, Equipment)
  DRIVER             // Human Resource (DriverProfile)
}

enum ApprovalStepStatus {
  PENDING
  APPROVED
  REJECTED
  SKIPPED
}

enum RoomLayoutType {
  THEATER
  CLASSROOM
  U_SHAPE
  BANQUET
  BOARDROOM
  HOLLOW_SQUARE
  CUSTOM
}

enum VehicleMissionType {
  OFFICIAL_MEETING
  STUDENT_COMPETITION
  FIELD_TRIP
  COMMUNITY_SERVICE
  OTHER
}

// ==========================================
// CORE RESOURCE MODELS & PROFILES
// ==========================================

model FacilityResource {
  id           String                @id @default(cuid())
  code         String                @unique // e.g. "ROOM-01", "VAN-01"
  name         String
  type         ResourceType
  capacity     Int?
  location     String?
  description  String?               @db.Text
  status       ResourceStatus        @default(AVAILABLE)
  
  vehicleProfile VehicleProfile?
  roomProfile    RoomProfile?
  
  reservations FacilityReservation[]
  assignments  ReservationResourceAssignment[]
  createdAt    DateTime              @default(now())
  updatedAt    DateTime              @updatedAt

  @@index([type, status])
}

model RoomProfile {
  id                  String           @id @default(cuid())
  resourceId          String           @unique
  resource            FacilityResource @relation(fields: [resourceId], references: [id], onDelete: Cascade)
  floor               String?
  hasProjector        Boolean          @default(true)
  hasSoundSystem      Boolean          @default(true)
  hasVideoConference  Boolean          @default(false)
  airConditionerCount Int              @default(2)
}

model VehicleProfile {
  id              String           @id @default(cuid())
  resourceId      String           @unique
  resource        FacilityResource @relation(fields: [resourceId], references: [id], onDelete: Cascade)
  licensePlate    String           @unique
  brand           String?
  model           String?
  fuelType        String           @default("DIESEL")
  seatCapacity    Int              @default(12)
  currentOdometer Float            @default(0)
}

model DriverProfile {
  id                 String                          @id @default(cuid())
  userId             String                          @unique
  user               User                            @relation(fields: [userId], references: [id], onDelete: Cascade)
  licenseNumber      String
  licenseExpiry      DateTime?
  phoneNumber        String
  isActive           Boolean                         @default(true)
  assignments        ReservationResourceAssignment[]
  createdAt          DateTime                        @default(now())
  updatedAt          DateTime                        @updatedAt

  @@index([isActive])
}

// ==========================================
// CONFIGURABLE SLA & APPROVAL POLICY
// ==========================================

model FacilityApprovalPolicy {
  id                 String       @id @default(cuid())
  moduleType         ResourceType // MEETING_ROOM or VEHICLE
  stepNo             Int          // 1 = Section Head, 2 = Director
  roleRequired       String       // "HEAD_FACILITY", "HEAD_VEHICLE", "DIRECTOR"
  title              String
  slaHours           Int          @default(24) // SLA เวลาพิจารณา (ชม.)
  bufferHoursBefore  Int          @default(6)  // ต้องอนุมัติก่อนเริ่มใช้งานอย่างน้อย (ชม.)
  isActive           Boolean      @default(true)
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  @@unique([moduleType, stepNo])
}

model FacilityReservation {
  id                 String                          @id @default(cuid())
  bookingNumber      String?                         @unique
  resourceId         String
  resource           FacilityResource                @relation(fields: [resourceId], references: [id], onDelete: Cascade)
  reservedByUserId   String
  reservedByUser     User                            @relation("FacilityReservationsCreated", fields: [reservedByUserId], references: [id])
  
  consumerModule     String                          @default("MANUAL") // "MEETING_ROOM" | "VEHICLE"
  title              String
  purpose            String?                         @db.Text
  
  startAt            DateTime
  endAt              DateTime
  
  // Dynamic SLA Expiry
  expiresAt          DateTime?
  
  attendeeCount      Int?
  department         String?
  contactPhone       String?
  
  status             ReservationStatus               @default(PENDING)
  currentStep        Int                             @default(1)
  totalSteps         Int                             @default(2)
  rejectionReason    String?
  
  attachments        Json?
  
  // Relations
  approvalSteps      FacilityApprovalStep[]
  assignments        ReservationResourceAssignment[]
  roomDetails        RoomReservationDetail?
  vehicleDetails     VehicleReservationDetail?

  createdAt          DateTime                        @default(now())
  updatedAt          DateTime                        @updatedAt

  @@index([resourceId, status, startAt, endAt])
  @@index([reservedByUserId, status])
}

// Unified Single Source of Truth for Scheduling
model ReservationResourceAssignment {
  id              String               @id @default(cuid())
  reservationId   String
  reservation     FacilityReservation  @relation(fields: [reservationId], references: [id], onDelete: Cascade)
  
  targetType      AssignmentTargetType // RESOURCE or DRIVER
  
  resourceId      String?              // Populated when targetType == RESOURCE
  resource        FacilityResource?    @relation(fields: [resourceId], references: [id], onDelete: Cascade)
  
  driverProfileId String?              // Populated when targetType == DRIVER
  driverProfile   DriverProfile?       @relation(fields: [driverProfileId], references: [id], onDelete: Cascade)
  
  startAt         DateTime
  endAt           DateTime
  status          ReservationStatus    @default(PENDING)
  
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt

  @@index([resourceId, status, startAt, endAt])
  @@index([driverProfileId, status, startAt, endAt])
}

model FacilityApprovalStep {
  id             String              @id @default(cuid())
  reservationId  String
  reservation    FacilityReservation @relation(fields: [reservationId], references: [id], onDelete: Cascade)
  
  stepNo         Int
  roleRequired   String
  title          String
  status         ApprovalStepStatus  @default(PENDING)
  
  approverUserId String?
  approver       User?               @relation("FacilityApprovalApprover", fields: [approverUserId], references: [id])
  comment        String?             @db.Text
  actedAt        DateTime?
  
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt

  @@unique([reservationId, stepNo])
  @@index([approverUserId, status])
}

model RoomReservationDetail {
  id                 String              @id @default(cuid())
  reservationId      String              @unique
  reservation        FacilityReservation @relation(fields: [reservationId], references: [id], onDelete: Cascade)
  layoutType         RoomLayoutType      @default(THEATER)
  layoutNotes        String?             @db.Text
  audioVisualNotes   String?             @db.Text
  cateringNotes      String?             @db.Text
  requireAirCon      Boolean             @default(true)
}

model VehicleReservationDetail {
  id                 String              @id @default(cuid())
  reservationId      String              @unique
  reservation        FacilityReservation @relation(fields: [reservationId], references: [id], onDelete: Cascade)
  
  missionType        VehicleMissionType  @default(OFFICIAL_MEETING)
  origin             String              @default("โรงเรียนกุดจับประชาสรรค์")
  destination        String
  teacherCount       Int                 @default(1)
  studentCount       Int                 @default(0)
  passengerListNotes String?             @db.Text
  
  driverAssignedAt   DateTime?
  startMileage       Float?
  endMileage         Float?
  fuelCost           Float?
  tripNotes          String?             @db.Text
}

// Stateful Anti-Replay Token Log
model SignatureTokenLog {
  jti        String    @id @unique // Nonce UUID
  userId     String
  docId      String
  purpose    String    // "PRINT_FACILITY_A4"
  createdAt  DateTime  @default(now())
  consumedAt DateTime? // Single-use consumption timestamp
  expiresAt  DateTime

  @@index([userId, docId])
  @@index([expiresAt])
}
```

---

## 2. PostgreSQL Dual Exclusion Constraints on `ReservationResourceAssignment`

```sql
-- Enable btree_gist extension
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. Resource Overlap Exclusion Constraint (Rooms, Vehicles, Equipment)
-- Blocks only active states ('PENDING', 'APPROVED', 'IN_USE') with half-open [startAt, endAt)
ALTER TABLE "ReservationResourceAssignment"
DROP CONSTRAINT IF EXISTS "no_overlapping_resource_assignments";

ALTER TABLE "ReservationResourceAssignment"
ADD CONSTRAINT "no_overlapping_resource_assignments"
EXCLUDE USING gist (
  "resourceId" WITH =,
  tstzrange("startAt", "endAt", '[)') WITH &&
)
WHERE ("resourceId" IS NOT NULL AND "status" IN ('PENDING', 'APPROVED', 'IN_USE'));

-- 2. Driver Overlap Exclusion Constraint (Driver Profiles)
ALTER TABLE "ReservationResourceAssignment"
DROP CONSTRAINT IF EXISTS "no_overlapping_driver_assignments";

ALTER TABLE "ReservationResourceAssignment"
ADD CONSTRAINT "no_overlapping_driver_assignments"
EXCLUDE USING gist (
  "driverProfileId" WITH =,
  tstzrange("startAt", "endAt", '[)') WITH &&
)
WHERE ("driverProfileId" IS NOT NULL AND "status" IN ('PENDING', 'APPROVED', 'IN_USE'));
```

---

## 3. Single Source of Truth Lifecycle Helper

```typescript
export async function transitionReservationStatus(
  tx: Prisma.TransactionClient,
  reservationId: string,
  newStatus: ReservationStatus,
  options?: { rejectionReason?: string; currentStep?: number }
) {
  // 1. Update Reservation Master
  const updatedReservation = await tx.facilityReservation.update({
    where: { id: reservationId },
    data: {
      status: newStatus,
      rejectionReason: options?.rejectionReason,
      ...(options?.currentStep !== undefined && { currentStep: options.currentStep })
    }
  });

  // 2. Synchronously Update all Scheduling Assignments in exact same transaction
  await tx.reservationResourceAssignment.updateMany({
    where: { reservationId },
    data: { status: newStatus }
  });

  return updatedReservation;
}
```

---

## 4. SLA Expiry vs Director Approval Race Protection & Idempotent Cleanup

```typescript
// 1. Director Approval with Strict SLA Freshness & Row Locking
export async function approveFacilityReservationDirectorAction(reservationId: string, comment?: string) {
  const session = await getSession();
  assertFacilityPermission(session?.user, "facility:approve.director");

  return await executeReservationMutation(reservationId, null, async (tx) => {
    // Row Lock Reservation
    const [res] = await tx.$queryRaw<Array<{ id: string; status: string; expiresAt: Date | null }>>`
      SELECT id, status, "expiresAt" FROM "FacilityReservation" WHERE id = ${reservationId} FOR UPDATE
    `;

    if (!res) throw new Error("ไม่พบข้อมูลคำขอจอง");
    if (res.status !== "PENDING") {
      throw new Error(`ไม่สามารถอนุมัติได้เนื่องจากคำขออยู่ในสถานะ ${res.status} (อาจถูกยกเลิกหรืออนุมัติไปแล้ว)`);
    }
    if (res.expiresAt && new Date() > new Date(res.expiresAt)) {
      throw new Error("คำขอนี้หมดอายุตาม SLA แล้ว ไม่สามารถอนุมัติได้ (ระบบจะทำการยกเลิกอัตโนมัติ)");
    }

    // Step 2 Snapshot Approval
    await tx.facilityApprovalStep.updateMany({
      where: { reservationId, stepNo: 2 },
      data: { status: "APPROVED", approverUserId: session.user.id, comment, actedAt: new Date() }
    });

    // Atomic Lifecycle Transition
    return await transitionReservationStatus(tx, reservationId, "APPROVED", { currentStep: 2 });
  });
}

// 2. Idempotent SLA Cleanup Action
export async function cleanupExpiredPendingReservationsAction() {
  const now = new Date();
  
  // Find candidates
  const candidates = await prisma.facilityReservation.findMany({
    where: { status: "PENDING", expiresAt: { lte: now } },
    select: { id: true, resourceId: true }
  });

  let cancelledCount = 0;

  for (const candidate of candidates) {
    try {
      await executeReservationMutation(candidate.resourceId, null, async (tx) => {
        const [locked] = await tx.$queryRaw<Array<{ id: string; status: string; expiresAt: Date | null }>>`
          SELECT id, status, "expiresAt" FROM "FacilityReservation" WHERE id = ${candidate.id} FOR UPDATE
        `;

        if (locked && locked.status === "PENDING" && locked.expiresAt && new Date() >= new Date(locked.expiresAt)) {
          await transitionReservationStatus(tx, candidate.id, "CANCELLED", {
            rejectionReason: "หมดเวลาการพิจารณาอนุมัติตาม SLA อัตโนมัติ (SLA Timeout Auto-Cancelled)"
          });
          cancelledCount++;
        }
      });
    } catch {
      // Ignore individual race errors (e.g. Director was concurrently approving it)
    }
  }

  return { cancelledCount };
}
```

---

## 5. Verification Plan & Test Suite Matrix

1. `eLeave/tests/unit/facilityReservationWorkflow.test.js`: State transitions, cancellation matrix, dynamic SLA calculation.
2. `eLeave/tests/unit/facilityPermissions.test.js`: Capability-based RBAC matrix.
3. `eLeave/tests/unit/signatureTokenAuth.test.js`: Atomic single-query token consumption & anti-replay.
4. `eLeave/tests/integration/facilityPostgreSqlConcurrency.test.js`: Real PostgreSQL concurrent transaction race condition test catching code `23P01`.
5. `eLeave/tests/integration/facilityPendingExpiryApprovalRace.test.js`: Concurrent race simulation between SLA Cleanup job and Director Approval action.
6. `npm test`: Full regression suite across 76+ tests.
