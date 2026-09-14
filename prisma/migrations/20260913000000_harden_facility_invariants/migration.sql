-- ========================================================
-- Migration: 20260913000000_harden_facility_invariants
-- Description: Physical GiST Overlap Exclusion Guards & Idempotency
-- ========================================================

-- 1. Extension
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Columns in FacilityReservation
ALTER TABLE "FacilityReservation"
ADD COLUMN IF NOT EXISTS "idempotencyKey" VARCHAR(128),
ADD COLUMN IF NOT EXISTS "idempotencyPayloadHash" VARCHAR(64);

-- 3. Partial Unique Index for Idempotency
CREATE UNIQUE INDEX IF NOT EXISTS uq_facility_reservation_user_idempotency
ON "FacilityReservation" ("reservedByUserId", "idempotencyKey")
WHERE "idempotencyKey" IS NOT NULL;

-- 4. Exclusion constraint for rooms on ReservationResourceAssignment
ALTER TABLE "ReservationResourceAssignment" 
DROP CONSTRAINT IF EXISTS no_overlapping_room_reservations;

ALTER TABLE "ReservationResourceAssignment" 
DROP CONSTRAINT IF EXISTS no_overlapping_resource_reservations;

ALTER TABLE "ReservationResourceAssignment" 
ADD CONSTRAINT no_overlapping_room_reservations 
EXCLUDE USING gist (
  "resourceId" WITH =,
  tsrange("startAt", "endAt") WITH &&
) 
WHERE (
  status IN ('PENDING', 'APPROVED', 'IN_USE') 
  AND "resourceId" IS NOT NULL
);

-- 5. Exclusion constraint for drivers on ReservationResourceAssignment
ALTER TABLE "ReservationResourceAssignment" 
DROP CONSTRAINT IF EXISTS no_overlapping_driver_assignments;

ALTER TABLE "ReservationResourceAssignment" 
ADD CONSTRAINT no_overlapping_driver_assignments 
EXCLUDE USING gist (
  "driverProfileId" WITH =,
  tsrange("startAt", "endAt") WITH &&
) 
WHERE (
  status IN ('PENDING', 'APPROVED', 'IN_USE') 
  AND "driverProfileId" IS NOT NULL
);
