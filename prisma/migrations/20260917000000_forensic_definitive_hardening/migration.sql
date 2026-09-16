-- =============================================================================
-- Migration: 20260917000000_forensic_definitive_hardening
-- Description: Definitive Forensic Locked Schema, Immutability Triggers, 
--              Scoped GiST Exclusion, Transactional Outbox, Revision Snapshots, 
--              and Exam Item Override Ledger (onDelete: RESTRICT)
-- =============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. ENUMS
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OutboxEventStatus') THEN
    CREATE TYPE "OutboxEventStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StudentIdentityStatus') THEN
    CREATE TYPE "StudentIdentityStatus" AS ENUM ('IDENTIFIED', 'UNMAPPED', 'AMBIGUOUS', 'BLANK', 'UNRESOLVED', 'PHANTOM');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DetectionStatus') THEN
    CREATE TYPE "DetectionStatus" AS ENUM ('SINGLE_MARK', 'MULTIPLE_MARKS', 'NO_MARK', 'AMBIGUOUS', 'LOW_CONFIDENCE');
  END IF;
END $$;

-- 3. FACILITY CORE HARDENING: FacilityReservation
ALTER TABLE "FacilityReservation"
  ADD COLUMN IF NOT EXISTS "revisionNo" INTEGER NOT NULL DEFAULT 1;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_reservation_time_valid') THEN
    ALTER TABLE "FacilityReservation"
      ADD CONSTRAINT "chk_reservation_time_valid" CHECK ("startAt" < "endAt");
  END IF;
END $$;

-- 4. FACILITY CORE HARDENING: ReservationResourceAssignment
ALTER TABLE "ReservationResourceAssignment"
  ADD COLUMN IF NOT EXISTS "driverLicenseSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "driverLicenseExpirySnapshot" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "qualificationVerifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "qualificationStatusAtAssignment" TEXT DEFAULT 'VALID',
  ADD COLUMN IF NOT EXISTS "assignedByUserId" TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_assignment_time_valid') THEN
    ALTER TABLE "ReservationResourceAssignment"
      ADD CONSTRAINT "chk_assignment_time_valid" CHECK ("startAt" < "endAt");
  END IF;
END $$;

-- Drop obsolete or un-scoped constraints if they exist
ALTER TABLE "ReservationResourceAssignment" DROP CONSTRAINT IF EXISTS no_overlapping_room_reservations;
ALTER TABLE "ReservationResourceAssignment" DROP CONSTRAINT IF EXISTS no_overlapping_resource_reservations;
ALTER TABLE "ReservationResourceAssignment" DROP CONSTRAINT IF EXISTS no_overlapping_driver_assignments;
ALTER TABLE "ReservationResourceAssignment" DROP CONSTRAINT IF EXISTS no_overlapping_resource_assignment;
ALTER TABLE "ReservationResourceAssignment" DROP CONSTRAINT IF EXISTS no_overlapping_driver_assignment;

-- Scoped Exclusion Constraints using tsrange
ALTER TABLE "ReservationResourceAssignment"
  ADD CONSTRAINT no_overlapping_resource_assignment
  EXCLUDE USING gist (
    "resourceId" WITH =,
    tsrange("startAt", "endAt") WITH &&
  )
  WHERE ("status" NOT IN ('CANCELLED', 'REJECTED') AND "resourceId" IS NOT NULL);

ALTER TABLE "ReservationResourceAssignment"
  ADD CONSTRAINT no_overlapping_driver_assignment
  EXCLUDE USING gist (
    "driverProfileId" WITH =,
    tsrange("startAt", "endAt") WITH &&
  )
  WHERE ("status" NOT IN ('CANCELLED', 'REJECTED') AND "driverProfileId" IS NOT NULL);

-- 5. FACILITY CORE HARDENING: FacilityApprovalStep
ALTER TABLE "FacilityApprovalStep"
  ADD COLUMN IF NOT EXISTS "revisionNo" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "idempotencyKey" VARCHAR(128);

ALTER TABLE "FacilityApprovalStep" DROP CONSTRAINT IF EXISTS "FacilityApprovalStep_reservationId_stepNo_key";
ALTER TABLE "FacilityApprovalStep" DROP CONSTRAINT IF EXISTS "FacilityApprovalStep_reservationId_revisionNo_stepNo_key";

ALTER TABLE "FacilityApprovalStep"
  ADD CONSTRAINT "FacilityApprovalStep_reservationId_revisionNo_stepNo_key"
  UNIQUE ("reservationId", "revisionNo", "stepNo");

-- 6. NEW FACILITY ENTITIES: Revisions, PostMissionReport, Settings
CREATE TABLE IF NOT EXISTS "FacilityReservationRevision" (
  "id" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "revisionNo" INTEGER NOT NULL,
  "snapshotPayload" JSONB NOT NULL,
  "submittedByUserId" TEXT NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revisionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FacilityReservationRevision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fk_reservation_revision_parent" FOREIGN KEY ("reservationId") REFERENCES "FacilityReservation"("id") ON DELETE CASCADE,
  CONSTRAINT "uk_reservation_revision_no" UNIQUE ("reservationId", "revisionNo")
);
CREATE INDEX IF NOT EXISTS "idx_facility_revision_res_id" ON "FacilityReservationRevision"("reservationId");

CREATE TABLE IF NOT EXISTS "FacilityPostMissionReport" (
  "id" TEXT NOT NULL,
  "reservationId" TEXT NOT NULL,
  "startMileage" DOUBLE PRECISION,
  "endMileage" DOUBLE PRECISION,
  "distanceKm" DOUBLE PRECISION,
  "fuelCost" DECIMAL(10, 2),
  "fuelReceiptKey" TEXT,
  "incidentNotes" TEXT,
  "vehicleConditionRating" INTEGER,
  "roomCleanlinessRating" INTEGER,
  "reportedByUserId" TEXT NOT NULL,
  "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verifiedByUserId" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FacilityPostMissionReport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fk_post_mission_reservation" FOREIGN KEY ("reservationId") REFERENCES "FacilityReservation"("id") ON DELETE RESTRICT,
  CONSTRAINT "uk_post_mission_reservation_id" UNIQUE ("reservationId")
);

CREATE TABLE IF NOT EXISTS "FacilitySettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "guidelinesHtml" TEXT,
  "hotlinePhone" TEXT DEFAULT '042-261234',
  "driverAssignerUserIds" TEXT NOT NULL DEFAULT '',
  "driverPoolUserIds" TEXT NOT NULL DEFAULT '',
  "approverStep1UserIds" TEXT NOT NULL DEFAULT '',
  "approverStep2UserIds" TEXT NOT NULL DEFAULT '',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FacilitySettings_pkey" PRIMARY KEY ("id")
);

-- 7. AUDIT & OUTBOX ENTITIES
CREATE TABLE IF NOT EXISTS "AuditEvent" (
  "id" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "actorNameSnapshot" TEXT NOT NULL,
  "actorRoleSnapshot" TEXT NOT NULL,
  "actorDepartmentSnapshot" TEXT,
  "requestId" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'WEB_PORTAL',
  "previousState" JSONB,
  "newState" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "idx_audit_entity_created" ON "AuditEvent"("entityType", "entityId", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_audit_actor_created" ON "AuditEvent"("actorUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_audit_correlation_id" ON "AuditEvent"("correlationId");

CREATE TABLE IF NOT EXISTS "OutboxEvent" (
  "id" TEXT NOT NULL,
  "aggregateType" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "OutboxEventStatus" NOT NULL DEFAULT 'PENDING',
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),

  CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "idx_outbox_status_created" ON "OutboxEvent"("status", "createdAt");

-- 8. OMR ACADEMIC HARDENING: ExamSubmission
ALTER TABLE "ExamSubmission"
  ADD COLUMN IF NOT EXISTS "rawImageHash" TEXT,
  ADD COLUMN IF NOT EXISTS "processedImageHash" TEXT,
  ADD COLUMN IF NOT EXISTS "rawStorageKey" TEXT,
  ADD COLUMN IF NOT EXISTS "processedStorageKey" TEXT,
  ADD COLUMN IF NOT EXISTS "detectorVersion" TEXT DEFAULT 'REV_9.0_HYBRID',
  ADD COLUMN IF NOT EXISTS "thresholdProfile" TEXT DEFAULT 'STANDARD_A4',
  ADD COLUMN IF NOT EXISTS "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "studentCodeSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "classSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "examRosterId" TEXT,
  ADD COLUMN IF NOT EXISTS "studentIdentityStatus" "StudentIdentityStatus" NOT NULL DEFAULT 'IDENTIFIED',
  ADD COLUMN IF NOT EXISTS "mappingReason" TEXT;

-- 9. OMR ACADEMIC HARDENING: ExamItemSubmission
ALTER TABLE "ExamItemSubmission"
  ADD COLUMN IF NOT EXISTS "overrideVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "detectionStatus" "DetectionStatus" NOT NULL DEFAULT 'SINGLE_MARK';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_exam_item_score_non_negative') THEN
    ALTER TABLE "ExamItemSubmission"
      ADD CONSTRAINT "chk_exam_item_score_non_negative" CHECK ("scoreEarned" >= 0);
  END IF;
END $$;

-- 10. OMR ACADEMIC HARDENING: ExamItemOverride (onDelete: RESTRICT)
CREATE TABLE IF NOT EXISTS "ExamItemOverride" (
  "id" TEXT NOT NULL,
  "submissionItemId" TEXT NOT NULL,
  "sequenceNo" BIGINT NOT NULL,
  "previousChoice" TEXT,
  "overrideChoice" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ExamItemOverride_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fk_item_override_submission_item" FOREIGN KEY ("submissionItemId") REFERENCES "ExamItemSubmission"("id") ON DELETE RESTRICT,
  CONSTRAINT "uk_item_override_sequence_no" UNIQUE ("submissionItemId", "sequenceNo")
);
CREATE INDEX IF NOT EXISTS "idx_item_override_sub_created" ON "ExamItemOverride"("submissionItemId", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_item_override_actor_created" ON "ExamItemOverride"("actorUserId", "createdAt");

-- 11. IMMUTABILITY TRIGGER: AuditEvent (Write-Once / No Mutate)
CREATE OR REPLACE FUNCTION trg_audit_event_immutable_guard()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'AuditEvent records are write-once and permanently immutable. UPDATE and DELETE are strictly forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_event_no_mutate ON "AuditEvent";
CREATE TRIGGER trg_audit_event_no_mutate
BEFORE UPDATE OR DELETE ON "AuditEvent"
FOR EACH ROW
EXECUTE FUNCTION trg_audit_event_immutable_guard();

-- 12. IMMUTABILITY TRIGGER: ExamItemOverride (Append-Only / No Mutate)
CREATE OR REPLACE FUNCTION trg_exam_item_override_immutable_guard()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ExamItemOverride is an append-only ledger: UPDATE and DELETE operations are strictly forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_exam_item_override_no_mutate ON "ExamItemOverride";
CREATE TRIGGER trg_exam_item_override_no_mutate
BEFORE UPDATE OR DELETE ON "ExamItemOverride"
FOR EACH ROW
EXECUTE FUNCTION trg_exam_item_override_immutable_guard();

-- 13. IMMUTABILITY TRIGGER: ExamItemSubmission (Machine Output Write-Once & Anti-Delete)
CREATE OR REPLACE FUNCTION trg_exam_item_submission_guard()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (OLD."detectedChoices" IS DISTINCT FROM NEW."detectedChoices" OR
        OLD."fillRatios" IS DISTINCT FROM NEW."fillRatios" OR
        OLD."confidenceScore" IS DISTINCT FROM NEW."confidenceScore") THEN
      RAISE EXCEPTION 'Machine detection fields on ExamItemSubmission (detectedChoices, fillRatios, confidenceScore) are strictly immutable.';
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Direct DELETE on ExamItemSubmission is strictly prohibited. Submissions must be soft-deleted via ExamPaper.';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_exam_item_submission_mutation_guard ON "ExamItemSubmission";
CREATE TRIGGER trg_exam_item_submission_mutation_guard
BEFORE UPDATE OR DELETE ON "ExamItemSubmission"
FOR EACH ROW
EXECUTE FUNCTION trg_exam_item_submission_guard();

-- 14. IMMUTABILITY TRIGGER: ExamAnswerKeyVersion (Immutable once used by any submission)
CREATE OR REPLACE FUNCTION trg_exam_answer_key_version_immutable_guard()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ExamSubmission" WHERE "gradingVersionId" = OLD.id) THEN
    RAISE EXCEPTION 'ExamAnswerKeyVersion is immutable because active ExamSubmissions reference it. Create a new key version instead.';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_exam_answer_key_version_guard ON "ExamAnswerKeyVersion";
CREATE TRIGGER trg_exam_answer_key_version_guard
BEFORE UPDATE OR DELETE ON "ExamAnswerKeyVersion"
FOR EACH ROW
EXECUTE FUNCTION trg_exam_answer_key_version_immutable_guard();

-- 15. IMMUTABILITY TRIGGER: FacilityReservation (Centralized Core Fields Guard on COMPLETED)
CREATE OR REPLACE FUNCTION trg_facility_reservation_completed_guard()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'COMPLETED' THEN
    IF (OLD."resourceId" IS DISTINCT FROM NEW."resourceId" OR
        OLD."startAt" IS DISTINCT FROM NEW."startAt" OR
        OLD."endAt" IS DISTINCT FROM NEW."endAt" OR
        OLD."reservedByUserId" IS DISTINCT FROM NEW."reservedByUserId" OR
        OLD."consumerModule" IS DISTINCT FROM NEW."consumerModule" OR
        OLD."title" IS DISTINCT FROM NEW."title" OR
        OLD."purpose" IS DISTINCT FROM NEW."purpose" OR
        OLD."revisionNo" IS DISTINCT FROM NEW."revisionNo" OR
        NEW.status <> 'COMPLETED') THEN
      RAISE EXCEPTION 'Core fields of COMPLETED reservations are strictly immutable. Post-mission records must be appended via FacilityPostMissionReport.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_facility_completed_mutation_guard ON "FacilityReservation";
CREATE TRIGGER trg_facility_completed_mutation_guard
BEFORE UPDATE ON "FacilityReservation"
FOR EACH ROW
EXECUTE FUNCTION trg_facility_reservation_completed_guard();
