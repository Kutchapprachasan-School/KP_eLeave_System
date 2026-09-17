-- =============================================================================
-- Rollback: 20260917120000_student_affairs_forensic_core
-- Description: Clean Rollback for Student Affairs Forensic Core
-- =============================================================================

-- 1. DROP STORED PROCEDURES
DROP FUNCTION IF EXISTS public.record_student_behavior_ledger(TEXT, TEXT, INT, public."BehaviorLedgerType", public."BehaviorCategory", INT, DATE, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.change_student_status(TEXT, TEXT, public."StudentStatus", TEXT);

-- 2. DROP TRIGGERS & FUNCTIONS
DROP TRIGGER IF EXISTS trg_period_attendance_integrity ON public."StudentPeriodAttendance";
DROP FUNCTION IF EXISTS public.trg_enforce_period_attendance_integrity();

DROP TRIGGER IF EXISTS trg_morning_attendance_integrity ON public."StudentMorningAttendance";
DROP FUNCTION IF EXISTS public.trg_enforce_morning_attendance_integrity();

DROP TRIGGER IF EXISTS trg_nomination_lifecycle ON public."StudentMeritNomination";
DROP FUNCTION IF EXISTS public.trg_enforce_nomination_lifecycle();

DROP TRIGGER IF EXISTS trg_attachment_tombstone ON public."StudentAffairsAttachment";
DROP FUNCTION IF EXISTS public.trg_enforce_attachment_tombstone();

DROP TRIGGER IF EXISTS trg_attachment_entity_integrity ON public."StudentAffairsAttachment";
DROP FUNCTION IF EXISTS public.trg_enforce_attachment_entity_integrity();

DROP TRIGGER IF EXISTS trg_audit_log_immutable ON public."StudentAffairsAuditLog";
DROP FUNCTION IF EXISTS public.trg_prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS trg_sdq_eval_locks_norm ON public."StudentSdqEvaluation";
DROP FUNCTION IF EXISTS public.trg_auto_lock_sdq_norm();

DROP TRIGGER IF EXISTS trg_sdq_norms_immutability ON public."SdqNormsRegistry";
DROP FUNCTION IF EXISTS public.trg_enforce_sdq_norms_immutability();

DROP TRIGGER IF EXISTS trg_cct_manifest_guard ON public."CctExportManifest";
DROP FUNCTION IF EXISTS public.trg_enforce_cct_manifest_guard();

-- 3. DROP PARTIAL UNIQUE INDEXES
DROP INDEX IF EXISTS public."uk_behavior_single_correction";
DROP INDEX IF EXISTS public."uk_student_single_active_case";

-- 4. DROP TABLES (Reverse Dependency Order)
DROP TABLE IF EXISTS public."StudentMeritNomination" CASCADE;
DROP TABLE IF EXISTS public."CctExportManifest" CASCADE;
DROP TABLE IF EXISTS public."StudentAffairsAuditLog" CASCADE;
DROP TABLE IF EXISTS public."StudentAffairsAttachment" CASCADE;
DROP TABLE IF EXISTS public."InterventionActivity" CASCADE;
DROP TABLE IF EXISTS public."StudentRiskAssessment" CASCADE;
DROP TABLE IF EXISTS public."StudentInterventionCase" CASCADE;
DROP TABLE IF EXISTS public."StudentSdqEvaluation" CASCADE;
DROP TABLE IF EXISTS public."SdqNormsRegistry" CASCADE;
DROP TABLE IF EXISTS public."StudentHomeVisit" CASCADE;
DROP TABLE IF EXISTS public."StudentPeriodAttendance" CASCADE;
DROP TABLE IF EXISTS public."StudentMorningAttendance" CASCADE;
DROP TABLE IF EXISTS public."StudentMedicalCertificate" CASCADE;
DROP TABLE IF EXISTS public."ScheduledClassSession" CASCADE;
DROP TABLE IF EXISTS public."StudentYearlyBehaviorProjection" CASCADE;
DROP TABLE IF EXISTS public."BehaviorRecord" CASCADE;
DROP TABLE IF EXISTS public."StudentEnrollment" CASCADE;
DROP TABLE IF EXISTS public."StudentStatusHistory" CASCADE;
DROP TABLE IF EXISTS public."Student" CASCADE;

-- 5. DROP ENUMS
DROP TYPE IF EXISTS public."CctManifestStatus";
DROP TYPE IF EXISTS public."AttachmentCategory";
DROP TYPE IF EXISTS public."AttachmentEntityType";
DROP TYPE IF EXISTS public."NominationStatus";
DROP TYPE IF EXISTS public."RiskLevel";
DROP TYPE IF EXISTS public."CaseOutcome";
DROP TYPE IF EXISTS public."CaseStatus";
DROP TYPE IF EXISTS public."CasePriority";
DROP TYPE IF EXISTS public."CctPovertyLevel";
DROP TYPE IF EXISTS public."SdqLevel";
DROP TYPE IF EXISTS public."EvaluatorType";
DROP TYPE IF EXISTS public."BehaviorCategory";
DROP TYPE IF EXISTS public."BehaviorLedgerType";
DROP TYPE IF EXISTS public."AttendanceExemptionStatus";
DROP TYPE IF EXISTS public."StudentAttendanceStatus";
DROP TYPE IF EXISTS public."ScheduledSessionType";
DROP TYPE IF EXISTS public."StudentGender";
DROP TYPE IF EXISTS public."StudentDecommissionReason";
DROP TYPE IF EXISTS public."EnrollmentStatus";
DROP TYPE IF EXISTS public."StudentStatus";
