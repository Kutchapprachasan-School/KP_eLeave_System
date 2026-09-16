-- =============================================================================
-- Rollback Migration: 20260917000000_forensic_definitive_hardening
-- Description: Reverses the definitive forensic hardening migration
-- =============================================================================

-- Drop Triggers
DROP TRIGGER IF EXISTS trg_facility_completed_mutation_guard ON "FacilityReservation";
DROP FUNCTION IF EXISTS trg_facility_reservation_completed_guard();

DROP TRIGGER IF EXISTS trg_exam_answer_key_version_guard ON "ExamAnswerKeyVersion";
DROP FUNCTION IF EXISTS trg_exam_answer_key_version_immutable_guard();

DROP TRIGGER IF EXISTS trg_exam_item_submission_mutation_guard ON "ExamItemSubmission";
DROP FUNCTION IF EXISTS trg_exam_item_submission_guard();

DROP TRIGGER IF EXISTS trg_exam_item_override_no_mutate ON "ExamItemOverride";
DROP FUNCTION IF EXISTS trg_exam_item_override_immutable_guard();

DROP TRIGGER IF EXISTS trg_audit_event_no_mutate ON "AuditEvent";
DROP FUNCTION IF EXISTS trg_audit_event_immutable_guard();

-- Drop Tables
DROP TABLE IF EXISTS "ExamItemOverride" CASCADE;
DROP TABLE IF EXISTS "OutboxEvent" CASCADE;
DROP TABLE IF EXISTS "AuditEvent" CASCADE;
DROP TABLE IF EXISTS "FacilitySettings" CASCADE;
DROP TABLE IF EXISTS "FacilityPostMissionReport" CASCADE;
DROP TABLE IF EXISTS "FacilityReservationRevision" CASCADE;

-- Revert FacilityApprovalStep
ALTER TABLE "FacilityApprovalStep" DROP CONSTRAINT IF EXISTS "FacilityApprovalStep_reservationId_revisionNo_stepNo_key";
ALTER TABLE "FacilityApprovalStep" ADD CONSTRAINT "FacilityApprovalStep_reservationId_stepNo_key" UNIQUE ("reservationId", "stepNo");
ALTER TABLE "FacilityApprovalStep" DROP COLUMN IF EXISTS "idempotencyKey";
ALTER TABLE "FacilityApprovalStep" DROP COLUMN IF EXISTS "revisionNo";

-- Revert Exclusion constraints
ALTER TABLE "ReservationResourceAssignment" DROP CONSTRAINT IF EXISTS no_overlapping_resource_assignment;
ALTER TABLE "ReservationResourceAssignment" DROP CONSTRAINT IF EXISTS no_overlapping_driver_assignment;
ALTER TABLE "ReservationResourceAssignment" DROP CONSTRAINT IF EXISTS chk_assignment_time_valid;
ALTER TABLE "ReservationResourceAssignment" DROP COLUMN IF EXISTS "driverLicenseSnapshot";
ALTER TABLE "ReservationResourceAssignment" DROP COLUMN IF EXISTS "driverLicenseExpirySnapshot";
ALTER TABLE "ReservationResourceAssignment" DROP COLUMN IF EXISTS "qualificationVerifiedAt";
ALTER TABLE "ReservationResourceAssignment" DROP COLUMN IF EXISTS "qualificationStatusAtAssignment";
ALTER TABLE "ReservationResourceAssignment" DROP COLUMN IF EXISTS "assignedByUserId";

-- Revert FacilityReservation
ALTER TABLE "FacilityReservation" DROP CONSTRAINT IF EXISTS chk_reservation_time_valid;
ALTER TABLE "FacilityReservation" DROP COLUMN IF EXISTS "revisionNo";

-- Revert ExamSubmission & ExamItemSubmission
ALTER TABLE "ExamItemSubmission" DROP CONSTRAINT IF EXISTS chk_exam_item_score_non_negative;
ALTER TABLE "ExamItemSubmission" DROP COLUMN IF EXISTS "detectionStatus";
ALTER TABLE "ExamItemSubmission" DROP COLUMN IF EXISTS "overrideVersion";

ALTER TABLE "ExamSubmission" DROP COLUMN IF EXISTS "rawImageHash";
ALTER TABLE "ExamSubmission" DROP COLUMN IF EXISTS "processedImageHash";
ALTER TABLE "ExamSubmission" DROP COLUMN IF EXISTS "rawStorageKey";
ALTER TABLE "ExamSubmission" DROP COLUMN IF EXISTS "processedStorageKey";
ALTER TABLE "ExamSubmission" DROP COLUMN IF EXISTS "detectorVersion";
ALTER TABLE "ExamSubmission" DROP COLUMN IF EXISTS "thresholdProfile";
ALTER TABLE "ExamSubmission" DROP COLUMN IF EXISTS "ingestedAt";
ALTER TABLE "ExamSubmission" DROP COLUMN IF EXISTS "studentCodeSnapshot";
ALTER TABLE "ExamSubmission" DROP COLUMN IF EXISTS "classSnapshot";
ALTER TABLE "ExamSubmission" DROP COLUMN IF EXISTS "examRosterId";
ALTER TABLE "ExamSubmission" DROP COLUMN IF EXISTS "studentIdentityStatus";
ALTER TABLE "ExamSubmission" DROP COLUMN IF EXISTS "mappingReason";

-- Drop Enums
DROP TYPE IF EXISTS "DetectionStatus";
DROP TYPE IF EXISTS "StudentIdentityStatus";
DROP TYPE IF EXISTS "OutboxEventStatus";
