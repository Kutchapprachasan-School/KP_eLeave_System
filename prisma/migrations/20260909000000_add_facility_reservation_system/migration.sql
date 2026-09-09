-- ========================================================
-- Migration: 20260909000000_add_facility_reservation_system
-- Description: Production v7.0 Facility & Central Resource Subsystem
-- ========================================================

-- 1. Create Enums if not exist
DO $$ BEGIN
    CREATE TYPE "ResourceType" AS ENUM ('MEETING_ROOM', 'CLASSROOM', 'LABORATORY', 'VEHICLE', 'EQUIPMENT', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ResourceStatus" AS ENUM ('AVAILABLE', 'UNDER_MAINTENANCE', 'OUT_OF_SERVICE', 'RETIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TYPE "ResourceStatus" ADD VALUE IF NOT EXISTS 'RETIRED';

DO $$ BEGIN
    CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'IN_USE', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AssignmentTargetType" AS ENUM ('RESOURCE', 'DRIVER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ApprovalStepStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "RoomLayoutType" AS ENUM ('THEATER', 'CLASSROOM', 'U_SHAPE', 'BANQUET', 'BOARDROOM', 'HOLLOW_SQUARE', 'CUSTOM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "VehicleMissionType" AS ENUM ('OFFICIAL_MEETING', 'STUDENT_COMPETITION', 'FIELD_TRIP', 'COMMUNITY_SERVICE', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create FacilityResource Table
CREATE TABLE IF NOT EXISTS "FacilityResource" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ResourceType" NOT NULL,
    "capacity" INTEGER,
    "location" TEXT,
    "description" TEXT,
    "status" "ResourceStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacilityResource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FacilityResource_code_key" ON "FacilityResource"("code");
CREATE INDEX IF NOT EXISTS "FacilityResource_type_status_idx" ON "FacilityResource"("type", "status");

-- 3. Create RoomProfile Table
CREATE TABLE IF NOT EXISTS "RoomProfile" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "floor" TEXT,
    "hasProjector" BOOLEAN NOT NULL DEFAULT true,
    "hasSoundSystem" BOOLEAN NOT NULL DEFAULT true,
    "hasVideoConference" BOOLEAN NOT NULL DEFAULT false,
    "airConditionerCount" INTEGER NOT NULL DEFAULT 2,

    CONSTRAINT "RoomProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RoomProfile_resourceId_key" ON "RoomProfile"("resourceId");

DO $$ BEGIN
    ALTER TABLE "RoomProfile"
    ADD CONSTRAINT "RoomProfile_resourceId_fkey"
    FOREIGN KEY ("resourceId") REFERENCES "FacilityResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. Create VehicleProfile Table
CREATE TABLE IF NOT EXISTS "VehicleProfile" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "fuelType" TEXT NOT NULL DEFAULT 'DIESEL',
    "seatCapacity" INTEGER NOT NULL DEFAULT 12,
    "currentOdometer" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "VehicleProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VehicleProfile_resourceId_key" ON "VehicleProfile"("resourceId");
CREATE UNIQUE INDEX IF NOT EXISTS "VehicleProfile_licensePlate_key" ON "VehicleProfile"("licensePlate");

DO $$ BEGIN
    ALTER TABLE "VehicleProfile"
    ADD CONSTRAINT "VehicleProfile_resourceId_fkey"
    FOREIGN KEY ("resourceId") REFERENCES "FacilityResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 5. Create DriverProfile Table
CREATE TABLE IF NOT EXISTS "DriverProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "licenseExpiry" TIMESTAMP(3),
    "phoneNumber" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DriverProfile_userId_key" ON "DriverProfile"("userId");
CREATE INDEX IF NOT EXISTS "DriverProfile_isActive_idx" ON "DriverProfile"("isActive");

DO $$ BEGIN
    ALTER TABLE "DriverProfile"
    ADD CONSTRAINT "DriverProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 6. Create FacilityApprovalPolicy Table
CREATE TABLE IF NOT EXISTS "FacilityApprovalPolicy" (
    "id" TEXT NOT NULL,
    "moduleType" "ResourceType" NOT NULL,
    "stepNo" INTEGER NOT NULL,
    "roleRequired" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slaHours" INTEGER NOT NULL DEFAULT 24,
    "bufferHoursBefore" INTEGER NOT NULL DEFAULT 6,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacilityApprovalPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FacilityApprovalPolicy_moduleType_stepNo_key" ON "FacilityApprovalPolicy"("moduleType", "stepNo");

-- 7. Create FacilityReservation Table
CREATE TABLE IF NOT EXISTS "FacilityReservation" (
    "id" TEXT NOT NULL,
    "bookingNumber" TEXT,
    "resourceId" TEXT NOT NULL,
    "reservedByUserId" TEXT NOT NULL,
    "consumerModule" TEXT NOT NULL DEFAULT 'MANUAL',
    "title" TEXT NOT NULL,
    "purpose" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "attendeeCount" INTEGER,
    "department" TEXT,
    "contactPhone" TEXT,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "totalSteps" INTEGER NOT NULL DEFAULT 2,
    "rejectionReason" TEXT,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacilityReservation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FacilityReservation_bookingNumber_key" ON "FacilityReservation"("bookingNumber");
CREATE INDEX IF NOT EXISTS "FacilityReservation_resourceId_status_startAt_endAt_idx" ON "FacilityReservation"("resourceId", "status", "startAt", "endAt");
CREATE INDEX IF NOT EXISTS "FacilityReservation_reservedByUserId_status_idx" ON "FacilityReservation"("reservedByUserId", "status");

DO $$ BEGIN
    ALTER TABLE "FacilityReservation"
    ADD CONSTRAINT "FacilityReservation_resourceId_fkey"
    FOREIGN KEY ("resourceId") REFERENCES "FacilityResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "FacilityReservation"
    ADD CONSTRAINT "FacilityReservation_reservedByUserId_fkey"
    FOREIGN KEY ("reservedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 8. Create ReservationResourceAssignment Table
CREATE TABLE IF NOT EXISTS "ReservationResourceAssignment" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "targetType" "AssignmentTargetType" NOT NULL,
    "resourceId" TEXT,
    "driverProfileId" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationResourceAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ReservationResourceAssignment_resourceId_status_startAt_endAt_idx" ON "ReservationResourceAssignment"("resourceId", "status", "startAt", "endAt");
CREATE INDEX IF NOT EXISTS "ReservationResourceAssignment_driverProfileId_status_startAt_endAt_idx" ON "ReservationResourceAssignment"("driverProfileId", "status", "startAt", "endAt");

DO $$ BEGIN
    ALTER TABLE "ReservationResourceAssignment"
    ADD CONSTRAINT "ReservationResourceAssignment_reservationId_fkey"
    FOREIGN KEY ("reservationId") REFERENCES "FacilityReservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ReservationResourceAssignment"
    ADD CONSTRAINT "ReservationResourceAssignment_resourceId_fkey"
    FOREIGN KEY ("resourceId") REFERENCES "FacilityResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ReservationResourceAssignment"
    ADD CONSTRAINT "ReservationResourceAssignment_driverProfileId_fkey"
    FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 9. Create FacilityApprovalStep Table
CREATE TABLE IF NOT EXISTS "FacilityApprovalStep" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "stepNo" INTEGER NOT NULL,
    "roleRequired" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ApprovalStepStatus" NOT NULL DEFAULT 'PENDING',
    "approverUserId" TEXT,
    "comment" TEXT,
    "actedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacilityApprovalStep_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FacilityApprovalStep_reservationId_stepNo_key" ON "FacilityApprovalStep"("reservationId", "stepNo");
CREATE INDEX IF NOT EXISTS "FacilityApprovalStep_approverUserId_status_idx" ON "FacilityApprovalStep"("approverUserId", "status");

DO $$ BEGIN
    ALTER TABLE "FacilityApprovalStep"
    ADD CONSTRAINT "FacilityApprovalStep_reservationId_fkey"
    FOREIGN KEY ("reservationId") REFERENCES "FacilityReservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "FacilityApprovalStep"
    ADD CONSTRAINT "FacilityApprovalStep_approverUserId_fkey"
    FOREIGN KEY ("approverUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 10. Create RoomReservationDetail Table
CREATE TABLE IF NOT EXISTS "RoomReservationDetail" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "layoutType" "RoomLayoutType" NOT NULL DEFAULT 'THEATER',
    "layoutNotes" TEXT,
    "audioVisualNotes" TEXT,
    "cateringNotes" TEXT,
    "requireAirCon" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RoomReservationDetail_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RoomReservationDetail_reservationId_key" ON "RoomReservationDetail"("reservationId");

DO $$ BEGIN
    ALTER TABLE "RoomReservationDetail"
    ADD CONSTRAINT "RoomReservationDetail_reservationId_fkey"
    FOREIGN KEY ("reservationId") REFERENCES "FacilityReservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 11. Create VehicleReservationDetail Table
CREATE TABLE IF NOT EXISTS "VehicleReservationDetail" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "missionType" "VehicleMissionType" NOT NULL DEFAULT 'OFFICIAL_MEETING',
    "origin" TEXT NOT NULL DEFAULT 'โรงเรียนกุดจับประชาสรรค์',
    "destination" TEXT NOT NULL,
    "teacherCount" INTEGER NOT NULL DEFAULT 1,
    "studentCount" INTEGER NOT NULL DEFAULT 0,
    "passengerListNotes" TEXT,
    "driverAssignedAt" TIMESTAMP(3),
    "startMileage" DOUBLE PRECISION,
    "endMileage" DOUBLE PRECISION,
    "fuelCost" DOUBLE PRECISION,
    "tripNotes" TEXT,

    CONSTRAINT "VehicleReservationDetail_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VehicleReservationDetail_reservationId_key" ON "VehicleReservationDetail"("reservationId");

DO $$ BEGIN
    ALTER TABLE "VehicleReservationDetail"
    ADD CONSTRAINT "VehicleReservationDetail_reservationId_fkey"
    FOREIGN KEY ("reservationId") REFERENCES "FacilityReservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 12. Create SignatureTokenLog Table
CREATE TABLE IF NOT EXISTS "SignatureTokenLog" (
    "jti" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignatureTokenLog_pkey" PRIMARY KEY ("jti")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SignatureTokenLog_jti_key" ON "SignatureTokenLog"("jti");
CREATE INDEX IF NOT EXISTS "SignatureTokenLog_userId_docId_idx" ON "SignatureTokenLog"("userId", "docId");
CREATE INDEX IF NOT EXISTS "SignatureTokenLog_expiresAt_idx" ON "SignatureTokenLog"("expiresAt");
