-- =============================================================================
-- Migration: 20260917120000_student_affairs_forensic_core
-- Description: Student Affairs Forensic Core (Rev 3.9 - Zero-GUC & Engine Privilege Edition)
-- =============================================================================

-- 0. ENSURE RUNTIME ROLE EXISTS
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'eleave_runtime') THEN
    CREATE ROLE eleave_runtime;
  END IF;
  GRANT eleave_runtime TO postgres;
END $$;

-- 1. ENUMS CREATION
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StudentStatus') THEN
    CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TRANSFERRED', 'DROPPED_OUT', 'GRADUATED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EnrollmentStatus') THEN
    CREATE TYPE "EnrollmentStatus" AS ENUM ('ENROLLED', 'TRANSFERRED_OUT', 'COMPLETED', 'DROPPED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StudentDecommissionReason') THEN
    CREATE TYPE "StudentDecommissionReason" AS ENUM ('DUPLICATE_RECORD_MERGE', 'COURT_OR_LEGAL_ORDER', 'DATA_MIGRATION_CLEANUP', 'SYSTEM_DECOMMISSION');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StudentGender') THEN
    CREATE TYPE "StudentGender" AS ENUM ('MALE', 'FEMALE');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ScheduledSessionType') THEN
    CREATE TYPE "ScheduledSessionType" AS ENUM ('REGULAR', 'MAKEUP', 'CANCELLED_HOLIDAY', 'CANCELLED_TEACHER_DUTY', 'CANCELLED_SCHOOL_EVENT');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StudentAttendanceStatus') THEN
    CREATE TYPE "StudentAttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'LEAVE', 'ACTIVITY');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttendanceExemptionStatus') THEN
    CREATE TYPE "AttendanceExemptionStatus" AS ENUM ('NONE', 'PENDING_REVIEW', 'EXEMPTED_OFFICIAL', 'REJECTED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BehaviorLedgerType') THEN
    CREATE TYPE "BehaviorLedgerType" AS ENUM ('DEMERIT', 'MERIT', 'CORRECTION_CREDIT', 'CORRECTION_DEBIT');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BehaviorCategory') THEN
    CREATE TYPE "BehaviorCategory" AS ENUM ('PUNCTUALITY', 'DRESS_CODE', 'ATTENDANCE', 'SUBSTANCE_ABUSE', 'VIOLENCE_BULLYING', 'GAMBLING', 'HONOR_INTEGRITY', 'VOLUNTEER_MERIT', 'ACADEMIC_EXCELLENCE', 'SPECIAL_ACHIEVEMENT', 'OTHER');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EvaluatorType') THEN
    CREATE TYPE "EvaluatorType" AS ENUM ('TEACHER', 'PARENT', 'STUDENT');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SdqLevel') THEN
    CREATE TYPE "SdqLevel" AS ENUM ('NORMAL', 'AT_RISK', 'PROBLEM');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CctPovertyLevel') THEN
    CREATE TYPE "CctPovertyLevel" AS ENUM ('EXTREMELY_POOR', 'POOR', 'NOT_POOR');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CasePriority') THEN
    CREATE TYPE "CasePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CaseStatus') THEN
    CREATE TYPE "CaseStatus" AS ENUM ('DRAFT', 'OPEN', 'IN_PROGRESS', 'FOLLOW_UP', 'RESOLVED', 'CLOSED', 'ESCALATED', 'CANCELLED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CaseOutcome') THEN
    CREATE TYPE "CaseOutcome" AS ENUM ('PENDING', 'IMPROVED', 'STABLE', 'WORSENED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RiskLevel') THEN
    CREATE TYPE "RiskLevel" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NORMAL');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NominationStatus') THEN
    CREATE TYPE "NominationStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ISSUED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttachmentEntityType') THEN
    CREATE TYPE "AttachmentEntityType" AS ENUM ('HOME_VISIT', 'BEHAVIOR_EVIDENCE', 'CASE_DOC');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttachmentCategory') THEN
    CREATE TYPE "AttachmentCategory" AS ENUM ('HOME_VISIT_FAMILY', 'HOME_VISIT_HOUSE_EXTERIOR', 'HOME_VISIT_HOUSE_INTERIOR', 'BEHAVIOR_EVIDENCE', 'CASE_INTERVENTION_DOCUMENT');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CctManifestStatus') THEN
    CREATE TYPE "CctManifestStatus" AS ENUM ('PENDING_UPLOAD', 'VERIFIED', 'FAILED');
  END IF;
END $$;


-- =============================================================================
-- 1.5. PREREQUISITE ACADEMIC FOUNDATIONS (ClassRoom & SubjectOffering)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public."Department" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Department_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Department_code_key" UNIQUE ("code")
);

CREATE TABLE IF NOT EXISTS public."Teacher" (
  "id" TEXT NOT NULL,
  "employeeCode" TEXT NOT NULL,
  "prefix" TEXT,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "maxWeeklyPeriods" INTEGER NOT NULL DEFAULT 20,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Teacher_employeeCode_key" UNIQUE ("employeeCode"),
  CONSTRAINT "Teacher_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public."Subject" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "credits" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "departmentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Subject_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Subject_code_key" UNIQUE ("code"),
  CONSTRAINT "Subject_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public."ClassRoom" (
  "id" TEXT NOT NULL,
  "gradeLevel" INTEGER NOT NULL,
  "roomNumber" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClassRoom_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClassRoom_gradeLevel_roomNumber_key" UNIQUE ("gradeLevel", "roomNumber")
);

CREATE TABLE IF NOT EXISTS public."SubjectOffering" (
  "id" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "classRoomId" TEXT NOT NULL,
  "academicYear" INTEGER NOT NULL,
  "term" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SubjectOffering_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SubjectOffering_subjectId_teacherId_classRoomId_academicYear_term_key" UNIQUE ("subjectId", "teacherId", "classRoomId", "academicYear", "term"),
  CONSTRAINT "SubjectOffering_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES public."Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SubjectOffering_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES public."Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SubjectOffering_classRoomId_fkey" FOREIGN KEY ("classRoomId") REFERENCES public."ClassRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "SubjectOffering_academicYear_term_idx" ON public."SubjectOffering"("academicYear", "term");


-- =============================================================================
-- 2. STUDENT AFFAIRS TABLES CREATION
-- =============================================================================

-- Table 1: Student
CREATE TABLE IF NOT EXISTS public."Student" (
  "id" TEXT NOT NULL,
  "studentCode" TEXT NOT NULL,
  "nationalId" TEXT,
  "title" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "nickname" TEXT,
  "gender" public."StudentGender" NOT NULL DEFAULT 'MALE'::public."StudentGender",
  "birthDate" TIMESTAMP(3),
  "status" public."StudentStatus" NOT NULL DEFAULT 'ACTIVE'::public."StudentStatus",
  "homeAddress" TEXT,
  "parentName" TEXT,
  "parentPhone" TEXT,
  "deletedAt" TIMESTAMP(3),
  "deletedById" TEXT,
  "deletionReason" public."StudentDecommissionReason",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Student_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Student_studentCode_key" UNIQUE ("studentCode"),
  CONSTRAINT "Student_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES public."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Student_status_idx" ON public."Student"("status");
CREATE INDEX IF NOT EXISTS "Student_deletedAt_idx" ON public."Student"("deletedAt");

-- Table 2: StudentStatusHistory
CREATE TABLE IF NOT EXISTS public."StudentStatusHistory" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "fromStatus" public."StudentStatus" NOT NULL,
  "toStatus" public."StudentStatus" NOT NULL,
  "effectiveDate" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "changedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StudentStatusHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StudentStatusHistory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StudentStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES public."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "StudentStatusHistory_studentId_effectiveDate_idx" ON public."StudentStatusHistory"("studentId", "effectiveDate");

-- Table 3: StudentEnrollment
CREATE TABLE IF NOT EXISTS public."StudentEnrollment" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "academicYear" INTEGER NOT NULL,
  "term" INTEGER NOT NULL,
  "classRoomId" TEXT NOT NULL,
  "gradeLevel" INTEGER NOT NULL,
  "roomNumber" INTEGER NOT NULL,
  "rollNumber" INTEGER NOT NULL,
  "status" public."EnrollmentStatus" NOT NULL DEFAULT 'ENROLLED'::public."EnrollmentStatus",
  "advisorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StudentEnrollment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uk_student_enrollment_term" UNIQUE ("studentId", "academicYear", "term"),
  CONSTRAINT "StudentEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StudentEnrollment_classRoomId_fkey" FOREIGN KEY ("classRoomId") REFERENCES public."ClassRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StudentEnrollment_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES public."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "StudentEnrollment_academicYear_term_gradeLevel_roomNumber_idx" ON public."StudentEnrollment"("academicYear", "term", "gradeLevel", "roomNumber");

-- Table 4: BehaviorRecord
CREATE TABLE IF NOT EXISTS public."BehaviorRecord" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "academicYear" INTEGER NOT NULL,
  "sequenceNo" BIGINT NOT NULL,
  "type" public."BehaviorLedgerType" NOT NULL,
  "category" public."BehaviorCategory" NOT NULL,
  "points" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "businessDate" DATE NOT NULL,
  "incidentTimestamp" TIMESTAMP(3) NOT NULL,
  "location" TEXT,
  "description" TEXT NOT NULL,
  "correctionForId" TEXT,
  "reportedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BehaviorRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uk_student_behavior_seq" UNIQUE ("studentId", "academicYear", "sequenceNo"),
  CONSTRAINT "BehaviorRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "BehaviorRecord_correctionForId_fkey" FOREIGN KEY ("correctionForId") REFERENCES public."BehaviorRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "BehaviorRecord_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES public."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "BehaviorRecord_academicYear_category_idx" ON public."BehaviorRecord"("academicYear", "category");

-- Table 5: StudentYearlyBehaviorProjection
CREATE TABLE IF NOT EXISTS public."StudentYearlyBehaviorProjection" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "academicYear" INTEGER NOT NULL,
  "startingScore" INTEGER NOT NULL DEFAULT 100,
  "currentScore" INTEGER NOT NULL DEFAULT 100,
  "totalDemerit" INTEGER NOT NULL DEFAULT 0,
  "totalMerit" INTEGER NOT NULL DEFAULT 0,
  "recordCount" INTEGER NOT NULL DEFAULT 0,
  "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StudentYearlyBehaviorProjection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uk_student_yearly_behavior" UNIQUE ("studentId", "academicYear"),
  CONSTRAINT "StudentYearlyBehaviorProjection_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "StudentYearlyBehaviorProjection_academicYear_currentScore_idx" ON public."StudentYearlyBehaviorProjection"("academicYear", "currentScore");

-- Table 6: ScheduledClassSession
CREATE TABLE IF NOT EXISTS public."ScheduledClassSession" (
  "id" TEXT NOT NULL,
  "offeringId" TEXT NOT NULL,
  "businessDate" DATE NOT NULL,
  "periodNumber" INTEGER NOT NULL,
  "sessionType" public."ScheduledSessionType" NOT NULL DEFAULT 'REGULAR'::public."ScheduledSessionType",
  "isEligibleDenominator" BOOLEAN NOT NULL DEFAULT true,
  "cancellationReason" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ScheduledClassSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uk_scheduled_class_session" UNIQUE ("offeringId", "businessDate", "periodNumber"),
  CONSTRAINT "ScheduledClassSession_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES public."SubjectOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ScheduledClassSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ScheduledClassSession_businessDate_offeringId_idx" ON public."ScheduledClassSession"("businessDate", "offeringId");

-- Table 7: StudentMedicalCertificate
CREATE TABLE IF NOT EXISTS public."StudentMedicalCertificate" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "hospitalName" TEXT NOT NULL,
  "diagnosis" TEXT,
  "storageKey" TEXT NOT NULL,
  "sha256" TEXT NOT NULL,
  "byteSize" BIGINT NOT NULL,
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "verifiedById" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StudentMedicalCertificate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StudentMedicalCertificate_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StudentMedicalCertificate_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES public."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "StudentMedicalCertificate_studentId_startDate_endDate_idx" ON public."StudentMedicalCertificate"("studentId", "startDate", "endDate");

-- Table 8: StudentMorningAttendance
CREATE TABLE IF NOT EXISTS public."StudentMorningAttendance" (
  "id" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "businessDate" DATE NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" public."StudentAttendanceStatus" NOT NULL DEFAULT 'PRESENT'::public."StudentAttendanceStatus",
  "medicalCertId" TEXT,
  "remarks" TEXT,
  "recordedById" TEXT NOT NULL,

  CONSTRAINT "StudentMorningAttendance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uk_student_morning_attendance" UNIQUE ("enrollmentId", "businessDate"),
  CONSTRAINT "StudentMorningAttendance_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES public."StudentEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StudentMorningAttendance_medicalCertId_fkey" FOREIGN KEY ("medicalCertId") REFERENCES public."StudentMedicalCertificate"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StudentMorningAttendance_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES public."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "StudentMorningAttendance_businessDate_status_idx" ON public."StudentMorningAttendance"("businessDate", "status");

-- Table 9: StudentPeriodAttendance
CREATE TABLE IF NOT EXISTS public."StudentPeriodAttendance" (
  "id" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "scheduledSessionId" TEXT NOT NULL,
  "status" public."StudentAttendanceStatus" NOT NULL DEFAULT 'PRESENT'::public."StudentAttendanceStatus",
  "exemptionStatus" public."AttendanceExemptionStatus" NOT NULL DEFAULT 'NONE'::public."AttendanceExemptionStatus",
  "medicalCertId" TEXT,
  "remarks" TEXT,
  "recordedById" TEXT NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StudentPeriodAttendance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uk_student_period_attendance" UNIQUE ("enrollmentId", "scheduledSessionId"),
  CONSTRAINT "StudentPeriodAttendance_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES public."StudentEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StudentPeriodAttendance_scheduledSessionId_fkey" FOREIGN KEY ("scheduledSessionId") REFERENCES public."ScheduledClassSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StudentPeriodAttendance_medicalCertId_fkey" FOREIGN KEY ("medicalCertId") REFERENCES public."StudentMedicalCertificate"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StudentPeriodAttendance_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES public."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "StudentPeriodAttendance_scheduledSessionId_status_idx" ON public."StudentPeriodAttendance"("scheduledSessionId", "status");

-- Table 10: StudentHomeVisit
CREATE TABLE IF NOT EXISTS public."StudentHomeVisit" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "academicYear" INTEGER NOT NULL,
  "term" INTEGER NOT NULL,
  "visitRound" INTEGER NOT NULL DEFAULT 1,
  "visitDate" TIMESTAMP(3) NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "guardianIncomeMonth" DECIMAL(10,2),
  "dependentCount" INTEGER NOT NULL DEFAULT 0,
  "houseCondition" TEXT,
  "roofMaterial" TEXT,
  "wallMaterial" TEXT,
  "floorMaterial" TEXT,
  "waterSource" TEXT,
  "toiletType" TEXT,
  "electricitySource" TEXT,
  "hasCar" BOOLEAN NOT NULL DEFAULT false,
  "hasMotorcycle" BOOLEAN NOT NULL DEFAULT false,
  "hasAirConditioner" BOOLEAN NOT NULL DEFAULT false,
  "agriculturalLandRai" DOUBLE PRECISION DEFAULT 0,
  "distanceKm" DOUBLE PRECISION,
  "commuteMethod" TEXT,
  "commuteCostPerDay" DECIMAL(8,2),
  "cctEstimatedPoverty" public."CctPovertyLevel" NOT NULL DEFAULT 'NOT_POOR'::public."CctPovertyLevel",
  "cctPmtScore" DOUBLE PRECISION,
  "visitorTeacherId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StudentHomeVisit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uk_student_home_visit" UNIQUE ("studentId", "academicYear", "term", "visitRound"),
  CONSTRAINT "StudentHomeVisit_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StudentHomeVisit_visitorTeacherId_fkey" FOREIGN KEY ("visitorTeacherId") REFERENCES public."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Table 11: SdqNormsRegistry
CREATE TABLE IF NOT EXISTS public."SdqNormsRegistry" (
  "id" TEXT NOT NULL,
  "instrumentVersion" TEXT NOT NULL,
  "scoringVersion" TEXT NOT NULL,
  "evaluatorType" public."EvaluatorType" NOT NULL,
  "targetAgeMin" INTEGER NOT NULL,
  "targetAgeMax" INTEGER NOT NULL,
  "reverseScoredItems" JSONB NOT NULL,
  "subscaleDefinitions" JSONB NOT NULL,
  "cutoffsJson" JSONB NOT NULL,
  "isImmutable" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SdqNormsRegistry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uk_sdq_norms" UNIQUE ("instrumentVersion", "scoringVersion", "evaluatorType", "targetAgeMin", "targetAgeMax")
);

-- Table 12: StudentSdqEvaluation
CREATE TABLE IF NOT EXISTS public."StudentSdqEvaluation" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "academicYear" INTEGER NOT NULL,
  "term" INTEGER NOT NULL,
  "evaluatorType" public."EvaluatorType" NOT NULL,
  "normRegistryId" TEXT NOT NULL,
  "emotionalScore" INTEGER NOT NULL,
  "conductScore" INTEGER NOT NULL,
  "hyperactivityScore" INTEGER NOT NULL,
  "peerProblemScore" INTEGER NOT NULL,
  "prosocialScore" INTEGER NOT NULL,
  "totalDifficulties" INTEGER NOT NULL,
  "overallLevel" public."SdqLevel" NOT NULL,
  "rawAnswersJson" JSONB NOT NULL,
  "evaluatorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StudentSdqEvaluation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uk_student_sdq_eval" UNIQUE ("studentId", "academicYear", "term", "evaluatorType"),
  CONSTRAINT "StudentSdqEvaluation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StudentSdqEvaluation_normRegistryId_fkey" FOREIGN KEY ("normRegistryId") REFERENCES public."SdqNormsRegistry"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StudentSdqEvaluation_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES public."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Table 13: StudentInterventionCase (defined before StudentRiskAssessment for FK)
CREATE TABLE IF NOT EXISTS public."StudentInterventionCase" (
  "id" TEXT NOT NULL,
  "caseNumber" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "priority" public."CasePriority" NOT NULL DEFAULT 'MEDIUM'::public."CasePriority",
  "status" public."CaseStatus" NOT NULL DEFAULT 'OPEN'::public."CaseStatus",
  "triggerReason" TEXT NOT NULL,
  "actionPlan" TEXT NOT NULL,
  "targetOutcome" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3),
  "assignedToId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "outcome" public."CaseOutcome" NOT NULL DEFAULT 'PENDING'::public."CaseOutcome",
  "outcomeNotes" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StudentInterventionCase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StudentInterventionCase_caseNumber_key" UNIQUE ("caseNumber"),
  CONSTRAINT "StudentInterventionCase_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StudentInterventionCase_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES public."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StudentInterventionCase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "StudentInterventionCase_status_priority_idx" ON public."StudentInterventionCase"("status", "priority");
CREATE INDEX IF NOT EXISTS "StudentInterventionCase_assignedToId_idx" ON public."StudentInterventionCase"("assignedToId");

-- Table 14: StudentRiskAssessment
CREATE TABLE IF NOT EXISTS public."StudentRiskAssessment" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "academicYear" INTEGER NOT NULL,
  "term" INTEGER NOT NULL,
  "evaluationCycle" TEXT NOT NULL,
  "riskLevel" public."RiskLevel" NOT NULL,
  "riskScore" DOUBLE PRECISION NOT NULL,
  "ruleVersion" TEXT NOT NULL,
  "signalsJson" JSONB NOT NULL,
  "explanationJson" JSONB NOT NULL,
  "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "triggeredCaseId" TEXT,

  CONSTRAINT "StudentRiskAssessment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uk_student_risk_cycle" UNIQUE ("enrollmentId", "ruleVersion", "evaluationCycle"),
  CONSTRAINT "StudentRiskAssessment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StudentRiskAssessment_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES public."StudentEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StudentRiskAssessment_triggeredCaseId_fkey" FOREIGN KEY ("triggeredCaseId") REFERENCES public."StudentInterventionCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "StudentRiskAssessment_academicYear_term_riskLevel_idx" ON public."StudentRiskAssessment"("academicYear", "term", "riskLevel");

-- Table 15: InterventionActivity
CREATE TABLE IF NOT EXISTS public."InterventionActivity" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "actionDate" TIMESTAMP(3) NOT NULL,
  "activityTitle" TEXT NOT NULL,
  "details" TEXT NOT NULL,
  "nextFollowUpDate" TIMESTAMP(3),
  "recordedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InterventionActivity_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InterventionActivity_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES public."StudentInterventionCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InterventionActivity_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES public."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "InterventionActivity_caseId_actionDate_idx" ON public."InterventionActivity"("caseId", "actionDate");

-- Table 16: StudentAffairsAttachment
CREATE TABLE IF NOT EXISTS public."StudentAffairsAttachment" (
  "id" TEXT NOT NULL,
  "entityType" public."AttachmentEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "category" public."AttachmentCategory" NOT NULL DEFAULT 'HOME_VISIT_FAMILY'::public."AttachmentCategory",
  "storageKey" TEXT NOT NULL,
  "sha256" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "byteSize" BIGINT NOT NULL,
  "objectVersion" TEXT NOT NULL DEFAULT 'v1',
  "imageWidth" INTEGER,
  "imageHeight" INTEGER,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uploadedById" TEXT NOT NULL,
  "retentionUntil" TIMESTAMP(3),
  "isQuarantined" BOOLEAN NOT NULL DEFAULT false,
  "isTombstoned" BOOLEAN NOT NULL DEFAULT false,
  "tombstonedAt" TIMESTAMP(3),
  "tombstonedById" TEXT,
  "tombstoneReason" TEXT,

  CONSTRAINT "StudentAffairsAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StudentAffairsAttachment_entityType_entityId_idx" ON public."StudentAffairsAttachment"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "StudentAffairsAttachment_category_idx" ON public."StudentAffairsAttachment"("category");

-- Table 17: StudentAffairsAuditLog
CREATE TABLE IF NOT EXISTS public."StudentAffairsAuditLog" (
  "id" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actionVersion" TEXT NOT NULL DEFAULT '1.0',
  "actorId" TEXT NOT NULL,
  "actorIdSnapshot" TEXT NOT NULL,
  "actorRoleSnapshot" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "requestId" TEXT,
  "source" TEXT NOT NULL,
  "beforeHash" TEXT,
  "afterHash" TEXT,
  "payload" JSONB,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StudentAffairsAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StudentAffairsAuditLog_createdAt_idx" ON public."StudentAffairsAuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "StudentAffairsAuditLog_actorId_createdAt_idx" ON public."StudentAffairsAuditLog"("actorId", "createdAt");
CREATE INDEX IF NOT EXISTS "StudentAffairsAuditLog_entityType_entityId_idx" ON public."StudentAffairsAuditLog"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "StudentAffairsAuditLog_correlationId_idx" ON public."StudentAffairsAuditLog"("correlationId");

-- Table 18: CctExportManifest
CREATE TABLE IF NOT EXISTS public."CctExportManifest" (
  "id" TEXT NOT NULL,
  "exportCode" TEXT NOT NULL,
  "academicYear" INTEGER NOT NULL,
  "term" INTEGER NOT NULL,
  "criteriaJson" JSONB NOT NULL,
  "recordCount" INTEGER NOT NULL,
  "storageKey" TEXT NOT NULL,
  "payloadSha256" TEXT NOT NULL,
  "byteSize" BIGINT NOT NULL,
  "schemaVersion" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "status" public."CctManifestStatus" NOT NULL DEFAULT 'PENDING_UPLOAD'::public."CctManifestStatus",
  "verifiedAt" TIMESTAMP(3),
  "verifiedById" TEXT,
  "failureReason" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CctExportManifest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CctExportManifest_exportCode_key" UNIQUE ("exportCode"),
  CONSTRAINT "CctExportManifest_idempotencyKey_key" UNIQUE ("idempotencyKey"),
  CONSTRAINT "CctExportManifest_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES public."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CctExportManifest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "CctExportManifest_academicYear_term_status_idx" ON public."CctExportManifest"("academicYear", "term", "status");

-- Table 19: StudentMeritNomination
CREATE TABLE IF NOT EXISTS public."StudentMeritNomination" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "academicYear" INTEGER NOT NULL,
  "term" INTEGER NOT NULL,
  "awardCategory" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "meritPointsScore" INTEGER NOT NULL,
  "status" public."NominationStatus" NOT NULL DEFAULT 'PENDING_REVIEW'::public."NominationStatus",
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "decisionNotes" TEXT,
  "certificateItemId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StudentMeritNomination_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StudentMeritNomination_certificateItemId_key" UNIQUE ("certificateItemId"),
  CONSTRAINT "StudentMeritNomination_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StudentMeritNomination_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES public."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StudentMeritNomination_certificateItemId_fkey" FOREIGN KEY ("certificateItemId") REFERENCES public."CertificateIssuedItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "StudentMeritNomination_academicYear_status_idx" ON public."StudentMeritNomination"("academicYear", "status");


-- =============================================================================
-- 3. 20 CHECK CONSTRAINTS BATTERY
-- =============================================================================

-- Term Constraints (1 - 6)
ALTER TABLE public."StudentEnrollment" DROP CONSTRAINT IF EXISTS "chk_enrollment_term";
ALTER TABLE public."StudentEnrollment" ADD CONSTRAINT "chk_enrollment_term" CHECK ("term" IN (1, 2));
ALTER TABLE public."StudentHomeVisit" DROP CONSTRAINT IF EXISTS "chk_homevisit_term";
ALTER TABLE public."StudentHomeVisit" ADD CONSTRAINT "chk_homevisit_term" CHECK ("term" IN (1, 2));
ALTER TABLE public."StudentSdqEvaluation" DROP CONSTRAINT IF EXISTS "chk_sdq_term";
ALTER TABLE public."StudentSdqEvaluation" ADD CONSTRAINT "chk_sdq_term" CHECK ("term" IN (1, 2));
ALTER TABLE public."StudentRiskAssessment" DROP CONSTRAINT IF EXISTS "chk_risk_term";
ALTER TABLE public."StudentRiskAssessment" ADD CONSTRAINT "chk_risk_term" CHECK ("term" IN (1, 2));
ALTER TABLE public."CctExportManifest" DROP CONSTRAINT IF EXISTS "chk_cct_term";
ALTER TABLE public."CctExportManifest" ADD CONSTRAINT "chk_cct_term" CHECK ("term" IN (1, 2));
ALTER TABLE public."StudentMeritNomination" DROP CONSTRAINT IF EXISTS "chk_nomination_term";
ALTER TABLE public."StudentMeritNomination" ADD CONSTRAINT "chk_nomination_term" CHECK ("term" IN (1, 2));

-- Home Visit Details (7 - 12)
ALTER TABLE public."StudentHomeVisit" DROP CONSTRAINT IF EXISTS "chk_homevisit_round";
ALTER TABLE public."StudentHomeVisit" ADD CONSTRAINT "chk_homevisit_round" CHECK ("visitRound" BETWEEN 1 AND 10);
ALTER TABLE public."StudentHomeVisit" DROP CONSTRAINT IF EXISTS "chk_homevisit_dependents";
ALTER TABLE public."StudentHomeVisit" ADD CONSTRAINT "chk_homevisit_dependents" CHECK ("dependentCount" >= 0);
ALTER TABLE public."StudentHomeVisit" DROP CONSTRAINT IF EXISTS "chk_homevisit_income";
ALTER TABLE public."StudentHomeVisit" ADD CONSTRAINT "chk_homevisit_income" CHECK ("guardianIncomeMonth" IS NULL OR "guardianIncomeMonth" >= 0);
ALTER TABLE public."StudentHomeVisit" DROP CONSTRAINT IF EXISTS "chk_homevisit_commute_cost";
ALTER TABLE public."StudentHomeVisit" ADD CONSTRAINT "chk_homevisit_commute_cost" CHECK ("commuteCostPerDay" IS NULL OR "commuteCostPerDay" >= 0);
ALTER TABLE public."StudentHomeVisit" DROP CONSTRAINT IF EXISTS "chk_homevisit_distance";
ALTER TABLE public."StudentHomeVisit" ADD CONSTRAINT "chk_homevisit_distance" CHECK ("distanceKm" IS NULL OR "distanceKm" >= 0);
ALTER TABLE public."StudentHomeVisit" DROP CONSTRAINT IF EXISTS "chk_homevisit_land";
ALTER TABLE public."StudentHomeVisit" ADD CONSTRAINT "chk_homevisit_land" CHECK ("agriculturalLandRai" IS NULL OR "agriculturalLandRai" >= 0);

-- Enrollment Ranges (13 - 15)
ALTER TABLE public."StudentEnrollment" DROP CONSTRAINT IF EXISTS "chk_enrollment_grade";
ALTER TABLE public."StudentEnrollment" ADD CONSTRAINT "chk_enrollment_grade" CHECK ("gradeLevel" BETWEEN 1 AND 6);
ALTER TABLE public."StudentEnrollment" DROP CONSTRAINT IF EXISTS "chk_enrollment_room";
ALTER TABLE public."StudentEnrollment" ADD CONSTRAINT "chk_enrollment_room" CHECK ("roomNumber" >= 1);
ALTER TABLE public."StudentEnrollment" DROP CONSTRAINT IF EXISTS "chk_enrollment_roll";
ALTER TABLE public."StudentEnrollment" ADD CONSTRAINT "chk_enrollment_roll" CHECK ("rollNumber" >= 1);

-- Counts & Metrics Non-Negative (16 - 18)
ALTER TABLE public."CctExportManifest" DROP CONSTRAINT IF EXISTS "chk_cct_retries";
ALTER TABLE public."CctExportManifest" ADD CONSTRAINT "chk_cct_retries" CHECK ("retryCount" >= 0);
ALTER TABLE public."CctExportManifest" DROP CONSTRAINT IF EXISTS "chk_cct_records";
ALTER TABLE public."CctExportManifest" ADD CONSTRAINT "chk_cct_records" CHECK ("recordCount" >= 0);
ALTER TABLE public."StudentYearlyBehaviorProjection" DROP CONSTRAINT IF EXISTS "chk_projection_counts";
ALTER TABLE public."StudentYearlyBehaviorProjection" ADD CONSTRAINT "chk_projection_counts" CHECK ("recordCount" >= 0 AND "totalDemerit" >= 0 AND "totalMerit" >= 0);

-- Behavior Points Non-Zero & Sign Consistency (19 - 20)
ALTER TABLE public."BehaviorRecord" DROP CONSTRAINT IF EXISTS "chk_points_nonzero";
ALTER TABLE public."BehaviorRecord" ADD CONSTRAINT "chk_points_nonzero" CHECK ("points" != 0);
ALTER TABLE public."BehaviorRecord" DROP CONSTRAINT IF EXISTS "chk_points_sign";
ALTER TABLE public."BehaviorRecord" ADD CONSTRAINT "chk_points_sign" CHECK (
  ("type" IN ('DEMERIT'::public."BehaviorLedgerType", 'CORRECTION_DEBIT'::public."BehaviorLedgerType") AND "points" < 0)
  OR
  ("type" IN ('MERIT'::public."BehaviorLedgerType", 'CORRECTION_CREDIT'::public."BehaviorLedgerType") AND "points" > 0)
);

-- Student Soft Delete Triad (21)
ALTER TABLE public."Student" DROP CONSTRAINT IF EXISTS "chk_student_soft_delete_triad";
ALTER TABLE public."Student" ADD CONSTRAINT "chk_student_soft_delete_triad" CHECK (
  ("deletedAt" IS NULL AND "deletedById" IS NULL AND "deletionReason" IS NULL)
  OR
  ("deletedAt" IS NOT NULL AND "deletedById" IS NOT NULL AND "deletionReason" IS NOT NULL)
);

-- Medical Certificate Verification Triad, Dates & Security Formatting (22 - 26)
ALTER TABLE public."StudentMedicalCertificate" DROP CONSTRAINT IF EXISTS "chk_medcert_dates";
ALTER TABLE public."StudentMedicalCertificate" ADD CONSTRAINT "chk_medcert_dates" CHECK ("startDate" <= "endDate");
ALTER TABLE public."StudentMedicalCertificate" DROP CONSTRAINT IF EXISTS "chk_medcert_verification_triad";
ALTER TABLE public."StudentMedicalCertificate" ADD CONSTRAINT "chk_medcert_verification_triad" CHECK (
  ("isVerified" = false AND "verifiedById" IS NULL AND "verifiedAt" IS NULL)
  OR
  ("isVerified" = true AND "verifiedById" IS NOT NULL AND "verifiedAt" IS NOT NULL)
);
ALTER TABLE public."StudentMedicalCertificate" DROP CONSTRAINT IF EXISTS "chk_medcert_byte_size";
ALTER TABLE public."StudentMedicalCertificate" ADD CONSTRAINT "chk_medcert_byte_size" CHECK ("byteSize" > 0);
ALTER TABLE public."StudentMedicalCertificate" DROP CONSTRAINT IF EXISTS "chk_medcert_sha256";
ALTER TABLE public."StudentMedicalCertificate" ADD CONSTRAINT "chk_medcert_sha256" CHECK ("sha256" ~ '^[a-f0-9]{64}$');
ALTER TABLE public."StudentMedicalCertificate" DROP CONSTRAINT IF EXISTS "chk_medcert_storage_key";
ALTER TABLE public."StudentMedicalCertificate" ADD CONSTRAINT "chk_medcert_storage_key" CHECK ("storageKey" ~ '^[a-zA-Z0-9/_.-]+$');

-- Attachment Tombstone Triad & Formats (27 - 30)
ALTER TABLE public."StudentAffairsAttachment" DROP CONSTRAINT IF EXISTS "chk_attachment_tombstone_triad";
ALTER TABLE public."StudentAffairsAttachment" ADD CONSTRAINT "chk_attachment_tombstone_triad" CHECK (
  ("isTombstoned" = false AND "tombstonedAt" IS NULL AND "tombstonedById" IS NULL AND "tombstoneReason" IS NULL)
  OR
  ("isTombstoned" = true AND "tombstonedAt" IS NOT NULL AND "tombstonedById" IS NOT NULL AND "tombstoneReason" IS NOT NULL)
);
ALTER TABLE public."StudentAffairsAttachment" DROP CONSTRAINT IF EXISTS "chk_attachment_byte_size";
ALTER TABLE public."StudentAffairsAttachment" ADD CONSTRAINT "chk_attachment_byte_size" CHECK ("byteSize" > 0);
ALTER TABLE public."StudentAffairsAttachment" DROP CONSTRAINT IF EXISTS "chk_attachment_sha256";
ALTER TABLE public."StudentAffairsAttachment" ADD CONSTRAINT "chk_attachment_sha256" CHECK ("sha256" ~ '^[a-f0-9]{64}$');
ALTER TABLE public."StudentAffairsAttachment" DROP CONSTRAINT IF EXISTS "chk_attachment_storage_key";
ALTER TABLE public."StudentAffairsAttachment" ADD CONSTRAINT "chk_attachment_storage_key" CHECK ("storageKey" ~ '^[a-zA-Z0-9/_.-]+$');

ALTER TABLE public."CctExportManifest" DROP CONSTRAINT IF EXISTS "chk_cct_byte_size";
ALTER TABLE public."CctExportManifest" ADD CONSTRAINT "chk_cct_byte_size" CHECK ("byteSize" > 0);
ALTER TABLE public."CctExportManifest" DROP CONSTRAINT IF EXISTS "chk_cct_sha256";
ALTER TABLE public."CctExportManifest" ADD CONSTRAINT "chk_cct_sha256" CHECK ("payloadSha256" ~ '^[a-f0-9]{64}$');

-- Scheduled Class Session Period & Type Eligibility (31 - 32)
ALTER TABLE public."ScheduledClassSession" DROP CONSTRAINT IF EXISTS "chk_session_period";
ALTER TABLE public."ScheduledClassSession" ADD CONSTRAINT "chk_session_period" CHECK ("periodNumber" BETWEEN 1 AND 8);
ALTER TABLE public."ScheduledClassSession" DROP CONSTRAINT IF EXISTS "chk_session_type_eligibility";
ALTER TABLE public."ScheduledClassSession" ADD CONSTRAINT "chk_session_type_eligibility" CHECK (
  ("sessionType" IN ('REGULAR'::public."ScheduledSessionType", 'MAKEUP'::public."ScheduledSessionType") AND "isEligibleDenominator" = true)
  OR
  ("sessionType" IN ('CANCELLED_HOLIDAY'::public."ScheduledSessionType", 'CANCELLED_TEACHER_DUTY'::public."ScheduledSessionType", 'CANCELLED_SCHOOL_EVENT'::public."ScheduledSessionType") AND "isEligibleDenominator" = false AND "cancellationReason" IS NOT NULL)
);

-- SDQ Subscale Scores Ranges & Total Sum Invariant (33 - 34)
ALTER TABLE public."StudentSdqEvaluation" DROP CONSTRAINT IF EXISTS "chk_sdq_subscale_scores";
ALTER TABLE public."StudentSdqEvaluation" ADD CONSTRAINT "chk_sdq_subscale_scores" CHECK (
  "emotionalScore" BETWEEN 0 AND 10 AND
  "conductScore" BETWEEN 0 AND 10 AND
  "hyperactivityScore" BETWEEN 0 AND 10 AND
  "peerProblemScore" BETWEEN 0 AND 10 AND
  "prosocialScore" BETWEEN 0 AND 10
);
ALTER TABLE public."StudentSdqEvaluation" DROP CONSTRAINT IF EXISTS "chk_sdq_total_sum";
ALTER TABLE public."StudentSdqEvaluation" ADD CONSTRAINT "chk_sdq_total_sum" CHECK (
  "totalDifficulties" = ("emotionalScore" + "conductScore" + "hyperactivityScore" + "peerProblemScore")
);

-- Risk Score Range, Level Alignment & Nomination Points (35 - 37)
ALTER TABLE public."StudentRiskAssessment" DROP CONSTRAINT IF EXISTS "chk_risk_score";
ALTER TABLE public."StudentRiskAssessment" ADD CONSTRAINT "chk_risk_score" CHECK ("riskScore" >= 0.0 AND "riskScore" <= 100.0);
ALTER TABLE public."StudentRiskAssessment" DROP CONSTRAINT IF EXISTS "chk_risk_level_score_alignment";
ALTER TABLE public."StudentRiskAssessment" ADD CONSTRAINT "chk_risk_level_score_alignment" CHECK (
  ("riskLevel" = 'CRITICAL'::public."RiskLevel" AND "riskScore" >= 80.0) OR
  ("riskLevel" = 'HIGH'::public."RiskLevel" AND "riskScore" >= 60.0 AND "riskScore" < 80.0) OR
  ("riskLevel" = 'MEDIUM'::public."RiskLevel" AND "riskScore" >= 40.0 AND "riskScore" < 60.0) OR
  ("riskLevel" = 'LOW'::public."RiskLevel" AND "riskScore" >= 20.0 AND "riskScore" < 40.0) OR
  ("riskLevel" = 'NORMAL'::public."RiskLevel" AND "riskScore" < 20.0)
);

ALTER TABLE public."StudentMeritNomination" DROP CONSTRAINT IF EXISTS "chk_nomination_points";
ALTER TABLE public."StudentMeritNomination" ADD CONSTRAINT "chk_nomination_points" CHECK ("meritPointsScore" > 0);


-- =============================================================================
-- 4. PARTIAL UNIQUE INDEXES
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS "uk_behavior_single_correction" 
ON public."BehaviorRecord" ("correctionForId") 
WHERE "correctionForId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "uk_student_single_active_case"
ON public."StudentInterventionCase" ("studentId")
WHERE "status" IN ('DRAFT', 'OPEN', 'IN_PROGRESS', 'FOLLOW_UP', 'ESCALATED');


-- =============================================================================
-- 5. TRIGGERS & PROCEDURES (SET search_path = pg_catalog, Fully Qualified)
-- =============================================================================

-- -------------------------------------------------------------
-- Trigger 1: Period Attendance Integrity
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_enforce_period_attendance_integrity() 
RETURNS TRIGGER AS $$
DECLARE
  v_enr_classroom_id TEXT;
  v_enr_student_id TEXT;
  v_enr_year INT;
  v_enr_term INT;
  v_enr_status public."EnrollmentStatus";
  v_offering_classroom_id TEXT;
  v_offering_year INT;
  v_offering_term INT;
  v_session_date DATE;
  v_med_student_id TEXT;
  v_med_start DATE;
  v_med_end DATE;
  v_med_verified BOOLEAN;
BEGIN
  -- 1. Validate Enrollment
  SELECT "classRoomId", "studentId", "academicYear", "term", "status"
  INTO v_enr_classroom_id, v_enr_student_id, v_enr_year, v_enr_term, v_enr_status
  FROM public."StudentEnrollment"
  WHERE "id" = NEW."enrollmentId";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ENROLLMENT_NOT_FOUND: Enrollment % does not exist.', NEW."enrollmentId" USING ERRCODE = '55000';
  END IF;

  IF v_enr_status <> 'ENROLLED'::public."EnrollmentStatus" THEN
    RAISE EXCEPTION 'ENROLLMENT_INACTIVE: Cannot record attendance for enrollment in status %.', v_enr_status USING ERRCODE = '55000';
  END IF;

  -- 2. Validate Session & Offering
  SELECT o."classRoomId", o."academicYear", o."term", s."businessDate"
  INTO v_offering_classroom_id, v_offering_year, v_offering_term, v_session_date
  FROM public."ScheduledClassSession" s
  JOIN public."SubjectOffering" o ON o."id" = s."offeringId"
  WHERE s."id" = NEW."scheduledSessionId";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND: Scheduled session % does not exist.', NEW."scheduledSessionId" USING ERRCODE = '55000';
  END IF;

  -- 3. Classroom Match
  IF v_enr_classroom_id IS DISTINCT FROM v_offering_classroom_id THEN
    RAISE EXCEPTION 'CROSS_CLASSROOM_ATTENDANCE_FORBIDDEN: Student classroom (%) does not match subject offering classroom (%).',
      v_enr_classroom_id, v_offering_classroom_id USING ERRCODE = '55000';
  END IF;

  -- 4. Term Match
  IF v_enr_year IS DISTINCT FROM v_offering_year OR v_enr_term IS DISTINCT FROM v_offering_term THEN
    RAISE EXCEPTION 'ATTENDANCE_TERM_MISMATCH: Enrollment term (%/%) does not match session term (%/%).',
      v_enr_year, v_enr_term, v_offering_year, v_offering_term USING ERRCODE = '55000';
  END IF;

  -- 5. Medical Certificate Ownership & Date Bounds
  IF NEW."medicalCertId" IS NOT NULL THEN
    SELECT "studentId", "startDate", "endDate", "isVerified"
    INTO v_med_student_id, v_med_start, v_med_end, v_med_verified
    FROM public."StudentMedicalCertificate"
    WHERE "id" = NEW."medicalCertId";

    IF NOT FOUND THEN
      RAISE EXCEPTION 'MEDICAL_CERT_NOT_FOUND: Medical certificate % does not exist.', NEW."medicalCertId" USING ERRCODE = '55000';
    END IF;

    IF v_med_student_id IS DISTINCT FROM v_enr_student_id THEN
      RAISE EXCEPTION 'MEDICAL_CERT_STUDENT_MISMATCH: Medical cert belongs to student %, but attendance is for student %.',
        v_med_student_id, v_enr_student_id USING ERRCODE = '55000';
    END IF;

    IF v_session_date < v_med_start OR v_session_date > v_med_end THEN
      RAISE EXCEPTION 'MEDICAL_CERT_DATE_OUT_OF_RANGE: Session date % is outside certificate range [% to %].',
        v_session_date, v_med_start, v_med_end USING ERRCODE = '55000';
    END IF;

    IF NEW."exemptionStatus" = 'EXEMPTED_OFFICIAL'::public."AttendanceExemptionStatus" AND v_med_verified = false THEN
      RAISE EXCEPTION 'MEDICAL_CERT_UNVERIFIED: Cannot grant EXEMPTED_OFFICIAL with unverified medical certificate.' USING ERRCODE = '55000';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_period_attendance_integrity ON public."StudentPeriodAttendance";
CREATE TRIGGER trg_period_attendance_integrity
BEFORE INSERT OR UPDATE ON public."StudentPeriodAttendance"
FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_period_attendance_integrity();

-- -------------------------------------------------------------
-- Trigger 2: Morning Attendance Integrity Guard
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_enforce_morning_attendance_integrity() 
RETURNS TRIGGER AS $$
DECLARE
  v_enr_student_id TEXT;
  v_enr_status public."EnrollmentStatus";
  v_med_student_id TEXT;
  v_med_start DATE;
  v_med_end DATE;
  v_med_verified BOOLEAN;
BEGIN
  -- 1. Validate Enrollment
  SELECT "studentId", "status"
  INTO v_enr_student_id, v_enr_status
  FROM public."StudentEnrollment"
  WHERE "id" = NEW."enrollmentId";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ENROLLMENT_NOT_FOUND: Enrollment % does not exist.', NEW."enrollmentId" USING ERRCODE = '55000';
  END IF;

  IF v_enr_status <> 'ENROLLED'::public."EnrollmentStatus" THEN
    RAISE EXCEPTION 'ENROLLMENT_INACTIVE: Cannot record morning attendance for enrollment in status %.', v_enr_status USING ERRCODE = '55000';
  END IF;

  -- 2. Validate Medical Certificate
  IF NEW."medicalCertId" IS NOT NULL THEN
    SELECT "studentId", "startDate", "endDate", "isVerified"
    INTO v_med_student_id, v_med_start, v_med_end, v_med_verified
    FROM public."StudentMedicalCertificate"
    WHERE "id" = NEW."medicalCertId";

    IF NOT FOUND THEN
      RAISE EXCEPTION 'MEDICAL_CERT_NOT_FOUND: Medical certificate % does not exist.', NEW."medicalCertId" USING ERRCODE = '55000';
    END IF;

    IF v_med_student_id IS DISTINCT FROM v_enr_student_id THEN
      RAISE EXCEPTION 'MEDICAL_CERT_STUDENT_MISMATCH: Medical cert belongs to student %, but morning attendance is for student %.',
        v_med_student_id, v_enr_student_id USING ERRCODE = '55000';
    END IF;

    IF NEW."businessDate" < v_med_start OR NEW."businessDate" > v_med_end THEN
      RAISE EXCEPTION 'MEDICAL_CERT_DATE_OUT_OF_RANGE: Morning attendance date % is outside certificate range [% to %].',
        NEW."businessDate", v_med_start, v_med_end USING ERRCODE = '55000';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_morning_attendance_integrity ON public."StudentMorningAttendance";
CREATE TRIGGER trg_morning_attendance_integrity
BEFORE INSERT OR UPDATE ON public."StudentMorningAttendance"
FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_morning_attendance_integrity();

-- -------------------------------------------------------------
-- Trigger 3: Nomination Full State Machine Matrix & Immutability
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_enforce_nomination_lifecycle() 
RETURNS TRIGGER AS $$
BEGIN
  -- 1. INSERT Operations
  IF TG_OP = 'INSERT' THEN
    IF NEW."status" <> 'PENDING_REVIEW'::public."NominationStatus" THEN
      RAISE EXCEPTION 'NOMINATION_INITIAL_STATUS_INVALID: Initial status must be PENDING_REVIEW (got %).', NEW."status" USING ERRCODE = '55000';
    END IF;
    IF NEW."reviewedById" IS NOT NULL OR NEW."reviewedAt" IS NOT NULL OR NEW."rejectionReason" IS NOT NULL OR NEW."certificateItemId" IS NOT NULL THEN
      RAISE EXCEPTION 'NOMINATION_INITIAL_FIELDS_INVALID: Review and certificate fields must be null on creation.' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
  END IF;

  -- 2. DELETE Operations
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" = 'ISSUED'::public."NominationStatus" THEN
      RAISE EXCEPTION 'NOMINATION_SEALED: An issued nomination cannot be deleted.' USING ERRCODE = '55000';
    END IF;
    IF OLD."status" = 'APPROVED'::public."NominationStatus" THEN
      RAISE EXCEPTION 'NOMINATION_APPROVED_CANNOT_DELETE: Approved nomination must be rejected/revoked before deletion.' USING ERRCODE = '55000';
    END IF;
    IF OLD."status" = 'REJECTED'::public."NominationStatus" THEN
      RAISE EXCEPTION 'NOMINATION_REJECTED_CANNOT_DELETE: Rejected nomination record must be preserved for audit trail.' USING ERRCODE = '55000';
    END IF;
    RETURN OLD;
  END IF;

  -- 3. UPDATE Operations: Transition Matrix
  IF OLD."status" = 'ISSUED'::public."NominationStatus" THEN
    RAISE EXCEPTION 'NOMINATION_SEALED: An issued nomination is permanently sealed and immutable.' USING ERRCODE = '55000';
  END IF;

  IF OLD."status" = 'REJECTED'::public."NominationStatus" THEN
    RAISE EXCEPTION 'NOMINATION_REJECTED_FINAL: Rejected nominations cannot be modified.' USING ERRCODE = '55000';
  END IF;

  -- Pair: PENDING_REVIEW -> PENDING_REVIEW
  IF OLD."status" = 'PENDING_REVIEW'::public."NominationStatus" AND NEW."status" = 'PENDING_REVIEW'::public."NominationStatus" THEN
    IF NEW."studentId" IS DISTINCT FROM OLD."studentId" OR 
       NEW."academicYear" IS DISTINCT FROM OLD."academicYear" OR 
       NEW."term" IS DISTINCT FROM OLD."term" THEN
      RAISE EXCEPTION 'NOMINATION_IDENTITY_IMMUTABLE: Cannot change studentId, academicYear, or term.' USING ERRCODE = '55000';
    END IF;
    IF NEW."reviewedById" IS NOT NULL OR NEW."reviewedAt" IS NOT NULL OR NEW."certificateItemId" IS NOT NULL THEN
      RAISE EXCEPTION 'NOMINATION_PENDING_MUTATION_INVALID: Cannot set review or certificate fields while in PENDING_REVIEW.' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
  END IF;

  -- Pair: PENDING_REVIEW -> APPROVED
  IF OLD."status" = 'PENDING_REVIEW'::public."NominationStatus" AND NEW."status" = 'APPROVED'::public."NominationStatus" THEN
    IF NEW."reviewedById" IS NULL OR NEW."reviewedAt" IS NULL THEN
      RAISE EXCEPTION 'NOMINATION_INVALID_TRANSITION: Approval requires reviewedById and reviewedAt.' USING ERRCODE = '55000';
    END IF;
    IF NEW."rejectionReason" IS NOT NULL THEN
      RAISE EXCEPTION 'NOMINATION_INVALID_TRANSITION: Approved nomination cannot have rejectionReason.' USING ERRCODE = '55000';
    END IF;
    IF NEW."certificateItemId" IS NOT NULL THEN
      RAISE EXCEPTION 'NOMINATION_INVALID_TRANSITION: Certificate cannot be linked at approval stage.' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
  END IF;

  -- Pair: PENDING_REVIEW -> REJECTED
  IF OLD."status" = 'PENDING_REVIEW'::public."NominationStatus" AND NEW."status" = 'REJECTED'::public."NominationStatus" THEN
    IF NEW."reviewedById" IS NULL OR NEW."reviewedAt" IS NULL OR NEW."rejectionReason" IS NULL OR pg_catalog.btrim(NEW."rejectionReason") = '' THEN
      RAISE EXCEPTION 'NOMINATION_INVALID_TRANSITION: Rejection requires reviewedById, reviewedAt, and non-empty rejectionReason.' USING ERRCODE = '55000';
    END IF;
    IF NEW."certificateItemId" IS NOT NULL THEN
      RAISE EXCEPTION 'NOMINATION_INVALID_TRANSITION: Rejected nomination cannot have certificateItemId.' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
  END IF;

  -- Pair: APPROVED -> APPROVED
  IF OLD."status" = 'APPROVED'::public."NominationStatus" AND NEW."status" = 'APPROVED'::public."NominationStatus" THEN
    IF NEW."studentId" IS DISTINCT FROM OLD."studentId" OR
       NEW."academicYear" IS DISTINCT FROM OLD."academicYear" OR
       NEW."term" IS DISTINCT FROM OLD."term" OR
       NEW."meritPointsScore" IS DISTINCT FROM OLD."meritPointsScore" OR
       NEW."awardCategory" IS DISTINCT FROM OLD."awardCategory" OR
       NEW."reason" IS DISTINCT FROM OLD."reason" OR
       NEW."reviewedById" IS DISTINCT FROM OLD."reviewedById" OR
       NEW."reviewedAt" IS DISTINCT FROM OLD."reviewedAt" OR
       NEW."rejectionReason" IS NOT NULL OR
       NEW."certificateItemId" IS NOT NULL THEN
      RAISE EXCEPTION 'NOMINATION_APPROVED_IMMUTABLE: Approved nominations only permit editing decisionNotes.' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
  END IF;

  -- Pair: APPROVED -> ISSUED
  IF OLD."status" = 'APPROVED'::public."NominationStatus" AND NEW."status" = 'ISSUED'::public."NominationStatus" THEN
    IF NEW."certificateItemId" IS NULL THEN
      RAISE EXCEPTION 'NOMINATION_INVALID_TRANSITION: Issuance requires certificateItemId.' USING ERRCODE = '55000';
    END IF;
    IF NEW."rejectionReason" IS NOT NULL THEN
      RAISE EXCEPTION 'NOMINATION_INVALID_TRANSITION: Issued nomination cannot have rejectionReason.' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
  END IF;

  -- Pair: APPROVED -> REJECTED (Allowed Revocation)
  IF OLD."status" = 'APPROVED'::public."NominationStatus" AND NEW."status" = 'REJECTED'::public."NominationStatus" THEN
    IF NEW."rejectionReason" IS NULL OR pg_catalog.btrim(NEW."rejectionReason") = '' THEN
      RAISE EXCEPTION 'NOMINATION_INVALID_TRANSITION: Revocation requires non-empty rejectionReason.' USING ERRCODE = '55000';
    END IF;
    IF NEW."certificateItemId" IS NOT NULL THEN
      RAISE EXCEPTION 'NOMINATION_INVALID_TRANSITION: Revoked nomination cannot have certificateItemId.' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'NOMINATION_ILLEGAL_TRANSITION: Transition from % to % is strictly forbidden by state machine matrix.',
    OLD."status", NEW."status" USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nomination_lifecycle ON public."StudentMeritNomination";
CREATE TRIGGER trg_nomination_lifecycle
BEFORE INSERT OR UPDATE OR DELETE ON public."StudentMeritNomination"
FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_nomination_lifecycle();

-- -------------------------------------------------------------
-- Trigger 4: Attachment Tombstone & Immutability Guard
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_enforce_attachment_tombstone() 
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'ATTACHMENT_DELETE_FORBIDDEN: Student affairs attachments cannot be deleted. Use tombstoning.' USING ERRCODE = '55000';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- If already tombstoned, row is strictly read-only forever
    IF OLD."isTombstoned" = true THEN
      RAISE EXCEPTION 'ATTACHMENT_ALREADY_TOMBSTONED: This attachment has been permanently tombstoned and is sealed against further modifications.' USING ERRCODE = '55000';
    END IF;

    -- Core metadata fields are permanently immutable
    IF NEW."storageKey" IS DISTINCT FROM OLD."storageKey" OR
       NEW."sha256" IS DISTINCT FROM OLD."sha256" OR
       NEW."byteSize" IS DISTINCT FROM OLD."byteSize" OR
       NEW."entityType" IS DISTINCT FROM OLD."entityType" OR
       NEW."entityId" IS DISTINCT FROM OLD."entityId" OR
       NEW."uploadedAt" IS DISTINCT FROM OLD."uploadedAt" OR
       NEW."uploadedById" IS DISTINCT FROM OLD."uploadedById" THEN
      RAISE EXCEPTION 'ATTACHMENT_METADATA_IMMUTABLE: Attachment core metadata cannot be altered after upload.' USING ERRCODE = '55000';
    END IF;

    -- When transitioning to tombstoned, require audit triad and reason
    IF OLD."isTombstoned" = false AND NEW."isTombstoned" = true THEN
      IF NEW."tombstonedAt" IS NULL OR NEW."tombstonedById" IS NULL OR NEW."tombstoneReason" IS NULL OR pg_catalog.btrim(NEW."tombstoneReason") = '' THEN
        RAISE EXCEPTION 'ATTACHMENT_TOMBSTONE_INCOMPLETE: Tombstoning requires tombstonedAt, tombstonedById, and non-empty tombstoneReason.' USING ERRCODE = '55000';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_attachment_tombstone ON public."StudentAffairsAttachment";
CREATE TRIGGER trg_attachment_tombstone
BEFORE UPDATE OR DELETE ON public."StudentAffairsAttachment"
FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_attachment_tombstone();

-- -------------------------------------------------------------
-- Trigger 5: Attachment Polymorphic Referential Integrity
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_enforce_attachment_entity_integrity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."entityType" = 'HOME_VISIT'::public."AttachmentEntityType" THEN
    IF NOT EXISTS (SELECT 1 FROM public."StudentHomeVisit" WHERE "id" = NEW."entityId") THEN
      RAISE EXCEPTION 'ATTACHMENT_ENTITY_NOT_FOUND: Home visit % does not exist.', NEW."entityId" USING ERRCODE = '55000';
    END IF;
  ELSIF NEW."entityType" = 'BEHAVIOR_EVIDENCE'::public."AttachmentEntityType" THEN
    IF NOT EXISTS (SELECT 1 FROM public."BehaviorRecord" WHERE "id" = NEW."entityId") THEN
      RAISE EXCEPTION 'ATTACHMENT_ENTITY_NOT_FOUND: Behavior record % does not exist.', NEW."entityId" USING ERRCODE = '55000';
    END IF;
  ELSIF NEW."entityType" = 'CASE_DOC'::public."AttachmentEntityType" THEN
    IF NOT EXISTS (SELECT 1 FROM public."StudentInterventionCase" WHERE "id" = NEW."entityId") THEN
      RAISE EXCEPTION 'ATTACHMENT_ENTITY_NOT_FOUND: Intervention case % does not exist.', NEW."entityId" USING ERRCODE = '55000';
    END IF;
  ELSE
    RAISE EXCEPTION 'ATTACHMENT_INVALID_ENTITY_TYPE: Unknown entity type %.', NEW."entityType" USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_attachment_entity_integrity ON public."StudentAffairsAttachment";
CREATE TRIGGER trg_attachment_entity_integrity
BEFORE INSERT OR UPDATE OF "entityType", "entityId" ON public."StudentAffairsAttachment"
FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_attachment_entity_integrity();

-- -------------------------------------------------------------
-- Trigger 6: Append-Only Audit Log Guard
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'FORENSIC_INTEGRITY_VIOLATION: Student affairs audit logs are strictly append-only and cannot be modified or deleted.' USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_log_immutable ON public."StudentAffairsAuditLog";
CREATE TRIGGER trg_audit_log_immutable
BEFORE UPDATE OR DELETE ON public."StudentAffairsAuditLog"
FOR EACH ROW EXECUTE FUNCTION public.trg_prevent_audit_log_mutation();

-- -------------------------------------------------------------
-- Trigger 7: SDQ Norms Dual Guard (Auto-Lock & Immutability)
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_auto_lock_sdq_norm()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public."SdqNormsRegistry"
  SET "isImmutable" = true
  WHERE "id" = NEW."normRegistryId" AND "isImmutable" = false;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sdq_eval_locks_norm ON public."StudentSdqEvaluation";
CREATE TRIGGER trg_sdq_eval_locks_norm
AFTER INSERT ON public."StudentSdqEvaluation"
FOR EACH ROW EXECUTE FUNCTION public.trg_auto_lock_sdq_norm();

CREATE OR REPLACE FUNCTION public.trg_enforce_sdq_norms_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."isImmutable" = true THEN
      RAISE EXCEPTION 'SDQ_NORMS_IMMUTABLE: Cannot delete locked SDQ norms registry.' USING ERRCODE = '55000';
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD."isImmutable" = false AND NEW."isImmutable" = true THEN
      RETURN NEW;
    END IF;
    IF OLD."isImmutable" = true THEN
      RAISE EXCEPTION 'SDQ_NORMS_IMMUTABLE: Cannot modify locked SDQ norms registry.' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sdq_norms_immutability ON public."SdqNormsRegistry";
CREATE TRIGGER trg_sdq_norms_immutability
BEFORE UPDATE OR DELETE ON public."SdqNormsRegistry"
FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_sdq_norms_immutability();

-- -------------------------------------------------------------
-- Trigger 8: CCT Manifest Two-Phase Seal & Field Immutability Guard
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_enforce_cct_manifest_guard()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" = 'VERIFIED'::public."CctManifestStatus" THEN
      RAISE EXCEPTION 'CCT_MANIFEST_IMMUTABLE: Cannot delete verified CCT manifest.' USING ERRCODE = '55000';
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- 1. If already VERIFIED, row is sealed permanently
    IF OLD."status" = 'VERIFIED'::public."CctManifestStatus" THEN
      RAISE EXCEPTION 'CCT_MANIFEST_IMMUTABLE: A verified CCT export manifest is permanently sealed.' USING ERRCODE = '55000';
    END IF;

    -- 2. Core content metadata fields are strictly IMMUTABLE across all states
    IF NEW."exportCode" IS DISTINCT FROM OLD."exportCode" OR
       NEW."academicYear" IS DISTINCT FROM OLD."academicYear" OR
       NEW."term" IS DISTINCT FROM OLD."term" OR
       NEW."criteriaJson"::text IS DISTINCT FROM OLD."criteriaJson"::text OR
       NEW."recordCount" IS DISTINCT FROM OLD."recordCount" OR
       NEW."storageKey" IS DISTINCT FROM OLD."storageKey" OR
       NEW."payloadSha256" IS DISTINCT FROM OLD."payloadSha256" OR
       NEW."byteSize" IS DISTINCT FROM OLD."byteSize" OR
       NEW."schemaVersion" IS DISTINCT FROM OLD."schemaVersion" OR
       NEW."idempotencyKey" IS DISTINCT FROM OLD."idempotencyKey" OR
       NEW."createdById" IS DISTINCT FROM OLD."createdById" OR
       NEW."createdAt" IS DISTINCT FROM OLD."createdAt" THEN
      RAISE EXCEPTION 'CCT_MANIFEST_CONTENT_IMMUTABLE: Core manifest payload and metadata cannot be altered after creation.' USING ERRCODE = '55000';
    END IF;

    -- 3. State Transition Matrix & Field Requirements
    IF OLD."status" = 'PENDING_UPLOAD'::public."CctManifestStatus" THEN
      IF NEW."status" = 'VERIFIED'::public."CctManifestStatus" THEN
        IF NEW."verifiedById" IS NULL OR NEW."verifiedAt" IS NULL THEN
          RAISE EXCEPTION 'CCT_VERIFICATION_INCOMPLETE: Verification requires verifiedById and verifiedAt.' USING ERRCODE = '55000';
        END IF;
        RETURN NEW;
      ELSIF NEW."status" = 'FAILED'::public."CctManifestStatus" THEN
        IF NEW."failureReason" IS NULL OR pg_catalog.btrim(NEW."failureReason") = '' THEN
          RAISE EXCEPTION 'CCT_FAILURE_REASON_REQUIRED: Failure status requires non-empty failureReason.' USING ERRCODE = '55000';
        END IF;
        RETURN NEW;
      ELSIF NEW."status" = 'PENDING_UPLOAD'::public."CctManifestStatus" THEN
        RETURN NEW;
      END IF;
    ELSIF OLD."status" = 'FAILED'::public."CctManifestStatus" THEN
      IF NEW."status" = 'PENDING_UPLOAD'::public."CctManifestStatus" THEN
        IF NEW."retryCount" <= OLD."retryCount" THEN
          RAISE EXCEPTION 'CCT_RETRY_COUNT_MUST_INCREMENT: Retrying manifest requires incrementing retryCount.' USING ERRCODE = '55000';
        END IF;
        RETURN NEW;
      ELSIF NEW."status" = 'FAILED'::public."CctManifestStatus" THEN
        RETURN NEW;
      END IF;
    END IF;

    RAISE EXCEPTION 'CCT_MANIFEST_ILLEGAL_TRANSITION: Invalid status transition from % to %.', OLD."status", NEW."status" USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cct_manifest_guard ON public."CctExportManifest";
CREATE TRIGGER trg_cct_manifest_guard
BEFORE UPDATE OR DELETE ON public."CctExportManifest"
FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_cct_manifest_guard();


-- =============================================================================
-- 6. STORED PROCEDURES (Zero-GUC & 3-Tier Global Lock Order)
-- =============================================================================

-- Stored Procedure 1: change_student_status
CREATE OR REPLACE FUNCTION public.change_student_status(
  p_session_token TEXT,
  p_student_id TEXT,
  p_to_status public."StudentStatus",
  p_reason TEXT
) RETURNS VOID AS $$
DECLARE
  v_actor_id TEXT;
  v_actor_role TEXT;
  v_is_approved BOOLEAN;
  v_old_status public."StudentStatus";
  v_history_id TEXT;
BEGIN
  -- 1. Verify Bearer Session Token against Session & User tables
  IF p_session_token IS NULL OR pg_catalog.btrim(p_session_token) = '' THEN
    RAISE EXCEPTION 'SESSION_TOKEN_REQUIRED: A valid bearer session token is required.' USING ERRCODE = '55000';
  END IF;

  SELECT s."userId", u."role", u."isApproved"
  INTO v_actor_id, v_actor_role, v_is_approved
  FROM public."Session" s
  JOIN public."User" u ON u."id" = s."userId"
  WHERE s."token" = p_session_token
    AND s."expiresAt" > pg_catalog.clock_timestamp()
    AND u."isApproved" = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'UNAUTHORIZED_SESSION: Invalid, expired, or unapproved session token.' USING ERRCODE = '55000';
  END IF;

  IF v_actor_role NOT IN ('ADMIN', 'HEAD_OF_STUDENT_AFFAIRS') THEN
    RAISE EXCEPTION 'UNAUTHORIZED_STATUS_CHANGE: Only ADMIN or HEAD_OF_STUDENT_AFFAIRS can change student status.' USING ERRCODE = '55000';
  END IF;

  -- 2. Global Lock Order: Tier 1 - Lock Student Row FOR UPDATE
  SELECT "status" INTO v_old_status
  FROM public."Student"
  WHERE "id" = p_student_id AND "deletedAt" IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'STUDENT_NOT_FOUND: Student % not found or decommissioned.', p_student_id USING ERRCODE = '55000';
  END IF;

  IF v_old_status = p_to_status THEN
    RAISE EXCEPTION 'STUDENT_STATUS_SAME: Status is already %.', p_to_status USING ERRCODE = '55000';
  END IF;

  IF p_reason IS NULL OR pg_catalog.btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'STUDENT_STATUS_REASON_REQUIRED: Status change requires a non-empty reason.' USING ERRCODE = '55000';
  END IF;

  -- 3. Insert Status History with verified actor ID
  v_history_id := 'shist_' || pg_catalog.md5(pg_catalog.random()::text || pg_catalog.clock_timestamp()::text);
  INSERT INTO public."StudentStatusHistory" (
    "id", "studentId", "fromStatus", "toStatus", "effectiveDate", "reason", "changedById", "createdAt"
  ) VALUES (
    v_history_id, p_student_id, v_old_status, p_to_status, pg_catalog.clock_timestamp(), p_reason, v_actor_id, pg_catalog.clock_timestamp()
  );

  -- 4. Update Student Status
  UPDATE public."Student"
  SET "status" = p_to_status, "updatedAt" = pg_catalog.clock_timestamp()
  WHERE "id" = p_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog;

ALTER FUNCTION public.change_student_status(TEXT, TEXT, public."StudentStatus", TEXT) OWNER TO postgres;

-- Stored Procedure 2: record_student_behavior_ledger
CREATE OR REPLACE FUNCTION public.record_student_behavior_ledger(
  p_session_token TEXT,
  p_student_id TEXT,
  p_academic_year INT,
  p_type public."BehaviorLedgerType",
  p_category public."BehaviorCategory",
  p_points INT,
  p_business_date DATE,
  p_incident_timestamp TIMESTAMPTZ,
  p_location TEXT,
  p_description TEXT,
  p_reported_by_id TEXT,
  p_correction_for_id TEXT DEFAULT NULL,
  p_correlation_id TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS TABLE (
  o_record_id TEXT,
  o_sequence_no BIGINT,
  o_balance_after INT
) AS $$
DECLARE
  v_actor_id TEXT;
  v_actor_role TEXT;
  v_is_approved BOOLEAN;

  v_target_student_id TEXT;
  v_target_academic_year INT;
  v_target_type public."BehaviorLedgerType";
  v_target_points INT;
  v_target_correction_for_id TEXT;
  
  v_proj_id TEXT;
  v_current_score INT;
  v_total_demerit INT;
  v_total_merit INT;
  v_record_count INT;
  
  v_new_balance INT;
  v_new_seq BIGINT;
  v_new_record_id TEXT;
  v_audit_id TEXT;
BEGIN
  -- 1. Input Validation
  IF p_points = 0 THEN
    RAISE EXCEPTION 'POINTS_ZERO_FORBIDDEN: Behavior points cannot be 0.' USING ERRCODE = '55000';
  END IF;

  IF p_business_date IS NULL THEN
    RAISE EXCEPTION 'DATE_REQUIRED: Business date is required.' USING ERRCODE = '55000';
  END IF;

  -- 2. Verify Bearer Session Token against Session & User tables
  IF p_session_token IS NULL OR pg_catalog.btrim(p_session_token) = '' THEN
    RAISE EXCEPTION 'SESSION_TOKEN_REQUIRED: A valid bearer session token is required.' USING ERRCODE = '55000';
  END IF;

  SELECT s."userId", u."role", u."isApproved"
  INTO v_actor_id, v_actor_role, v_is_approved
  FROM public."Session" s
  JOIN public."User" u ON u."id" = s."userId"
  WHERE s."token" = p_session_token
    AND s."expiresAt" > pg_catalog.clock_timestamp()
    AND u."isApproved" = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'UNAUTHORIZED_SESSION: Invalid, expired, or unapproved session token.' USING ERRCODE = '55000';
  END IF;

  -- Verify Proxy Reporting Authority
  IF v_actor_id <> p_reported_by_id AND v_actor_role NOT IN ('ADMIN', 'HEAD_OF_STUDENT_AFFAIRS') THEN
    RAISE EXCEPTION 'UNAUTHORIZED_PROXY_REPORTING: User % cannot record behavior on behalf of %.', v_actor_id, p_reported_by_id USING ERRCODE = '55000';
  END IF;

  -- 3. Global Lock Order: Tier 1 - Lock Student Row FOR UPDATE
  PERFORM 1
  FROM public."Student"
  WHERE "id" = p_student_id AND "deletedAt" IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'STUDENT_NOT_ACTIVE: Student % does not exist or has been decommissioned.', p_student_id USING ERRCODE = '55000';
  END IF;

  -- 4. Global Lock Order: Tier 2 - Lock StudentYearlyBehaviorProjection FOR UPDATE
  SELECT "id", "currentScore", "totalDemerit", "totalMerit", "recordCount"
  INTO v_proj_id, v_current_score, v_total_demerit, v_total_merit, v_record_count
  FROM public."StudentYearlyBehaviorProjection"
  WHERE "studentId" = p_student_id AND "academicYear" = p_academic_year
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public."StudentYearlyBehaviorProjection" (
      "id", "studentId", "academicYear", "startingScore", "currentScore",
      "totalDemerit", "totalMerit", "recordCount", "lastCalculatedAt"
    ) VALUES (
      'proj_' || pg_catalog.md5(pg_catalog.random()::text || pg_catalog.clock_timestamp()::text),
      p_student_id, p_academic_year, 100, 100, 0, 0, 0, pg_catalog.clock_timestamp()
    )
    RETURNING "id", "currentScore", "totalDemerit", "totalMerit", "recordCount"
    INTO v_proj_id, v_current_score, v_total_demerit, v_total_merit, v_record_count;
  END IF;

  -- 5. Global Lock Order: Tier 3 - Type Validation & Target Row Locking (Only for corrections)
  IF p_type = 'DEMERIT'::public."BehaviorLedgerType" THEN
    IF p_points >= 0 THEN
      RAISE EXCEPTION 'DEMERIT_POINTS_MUST_BE_NEGATIVE: Demerit points must be negative.' USING ERRCODE = '55000';
    END IF;
    IF p_correction_for_id IS NOT NULL THEN
      RAISE EXCEPTION 'DEMERIT_CANNOT_HAVE_CORRECTION_FOR: Regular demerit cannot reference correctionForId.' USING ERRCODE = '55000';
    END IF;

  ELSIF p_type = 'MERIT'::public."BehaviorLedgerType" THEN
    IF p_points <= 0 THEN
      RAISE EXCEPTION 'MERIT_POINTS_MUST_BE_POSITIVE: Merit points must be positive.' USING ERRCODE = '55000';
    END IF;
    IF p_correction_for_id IS NOT NULL THEN
      RAISE EXCEPTION 'MERIT_CANNOT_HAVE_CORRECTION_FOR: Regular merit cannot reference correctionForId.' USING ERRCODE = '55000';
    END IF;

  ELSIF p_type = 'CORRECTION_CREDIT'::public."BehaviorLedgerType" THEN
    IF p_points <= 0 THEN
      RAISE EXCEPTION 'CORRECTION_CREDIT_MUST_BE_POSITIVE: Correction credit points must be positive.' USING ERRCODE = '55000';
    END IF;
    IF p_correction_for_id IS NULL THEN
      RAISE EXCEPTION 'CORRECTION_REQUIRES_TARGET: Correction credit must specify correctionForId.' USING ERRCODE = '55000';
    END IF;

    -- Tier 3 Lock: Lock target record FOR UPDATE
    SELECT "studentId", "academicYear", "type", "points", "correctionForId"
    INTO v_target_student_id, v_target_academic_year, v_target_type, v_target_points, v_target_correction_for_id
    FROM public."BehaviorRecord"
    WHERE "id" = p_correction_for_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'TARGET_RECORD_NOT_FOUND: Behavior record % not found.', p_correction_for_id USING ERRCODE = '55000';
    END IF;

    IF v_target_student_id <> p_student_id THEN
      RAISE EXCEPTION 'CORRECTION_STUDENT_MISMATCH: Target record belongs to student %, not %.', v_target_student_id, p_student_id USING ERRCODE = '55000';
    END IF;
    IF v_target_academic_year <> p_academic_year THEN
      RAISE EXCEPTION 'CORRECTION_YEAR_MISMATCH: Target record belongs to year %, not %.', v_target_academic_year, p_academic_year USING ERRCODE = '55000';
    END IF;
    IF v_target_type <> 'DEMERIT'::public."BehaviorLedgerType" THEN
      RAISE EXCEPTION 'INVALID_CORRECTION_TARGET: CORRECTION_CREDIT can only correct DEMERIT (target is %).', v_target_type USING ERRCODE = '55000';
    END IF;
    IF v_target_correction_for_id IS NOT NULL THEN
      RAISE EXCEPTION 'CANNOT_CORRECT_A_CORRECTION: Cannot chain corrections on record %.', p_correction_for_id USING ERRCODE = '55000';
    END IF;
    IF p_points > pg_catalog.abs(v_target_points) THEN
      RAISE EXCEPTION 'CORRECTION_EXCEEDS_ORIGINAL: Cannot credit % points for an original demerit of % points.', p_points, v_target_points USING ERRCODE = '55000';
    END IF;

  ELSIF p_type = 'CORRECTION_DEBIT'::public."BehaviorLedgerType" THEN
    IF p_points >= 0 THEN
      RAISE EXCEPTION 'CORRECTION_DEBIT_MUST_BE_NEGATIVE: Correction debit points must be negative.' USING ERRCODE = '55000';
    END IF;
    IF p_correction_for_id IS NULL THEN
      RAISE EXCEPTION 'CORRECTION_REQUIRES_TARGET: Correction debit must specify correctionForId.' USING ERRCODE = '55000';
    END IF;

    -- Tier 3 Lock: Lock target record FOR UPDATE
    SELECT "studentId", "academicYear", "type", "points", "correctionForId"
    INTO v_target_student_id, v_target_academic_year, v_target_type, v_target_points, v_target_correction_for_id
    FROM public."BehaviorRecord"
    WHERE "id" = p_correction_for_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'TARGET_RECORD_NOT_FOUND: Behavior record % not found.', p_correction_for_id USING ERRCODE = '55000';
    END IF;

    IF v_target_student_id <> p_student_id THEN
      RAISE EXCEPTION 'CORRECTION_STUDENT_MISMATCH: Target record belongs to student %, not %.', v_target_student_id, p_student_id USING ERRCODE = '55000';
    END IF;
    IF v_target_academic_year <> p_academic_year THEN
      RAISE EXCEPTION 'CORRECTION_YEAR_MISMATCH: Target record belongs to year %, not %.', v_target_academic_year, p_academic_year USING ERRCODE = '55000';
    END IF;
    IF v_target_type <> 'MERIT'::public."BehaviorLedgerType" THEN
      RAISE EXCEPTION 'INVALID_CORRECTION_TARGET: CORRECTION_DEBIT can only correct MERIT (target is %).', v_target_type USING ERRCODE = '55000';
    END IF;
    IF v_target_correction_for_id IS NOT NULL THEN
      RAISE EXCEPTION 'CANNOT_CORRECT_A_CORRECTION: Cannot chain corrections on record %.', p_correction_for_id USING ERRCODE = '55000';
    END IF;
    IF pg_catalog.abs(p_points) > v_target_points THEN
      RAISE EXCEPTION 'CORRECTION_EXCEEDS_ORIGINAL: Cannot debit % points for an original merit of % points.', pg_catalog.abs(p_points), v_target_points USING ERRCODE = '55000';
    END IF;
  END IF;

  -- 6. Calculate Sequence & New Conduct Balance
  v_new_balance := v_current_score + p_points;
  v_new_seq := v_record_count + 1;
  v_new_record_id := 'br_' || pg_catalog.md5(pg_catalog.random()::text || pg_catalog.clock_timestamp()::text);

  -- 7. Insert BehaviorRecord
  INSERT INTO public."BehaviorRecord" (
    "id", "studentId", "academicYear", "sequenceNo", "type", "category",
    "points", "balanceAfter", "businessDate", "incidentTimestamp", "location",
    "description", "correctionForId", "reportedById", "createdAt"
  ) VALUES (
    v_new_record_id, p_student_id, p_academic_year, v_new_seq, p_type, p_category,
    p_points, v_new_balance, p_business_date, p_incident_timestamp, p_location,
    p_description, p_correction_for_id, p_reported_by_id, pg_catalog.clock_timestamp()
  );

  -- 8. Update Projection
  UPDATE public."StudentYearlyBehaviorProjection" SET
    "currentScore" = v_new_balance,
    "recordCount" = v_record_count + 1,
    "totalDemerit" = CASE 
      WHEN p_type = 'DEMERIT'::public."BehaviorLedgerType" THEN "totalDemerit" + pg_catalog.abs(p_points)
      WHEN p_type = 'CORRECTION_CREDIT'::public."BehaviorLedgerType" THEN GREATEST(0, "totalDemerit" - p_points)
      ELSE "totalDemerit"
    END,
    "totalMerit" = CASE 
      WHEN p_type = 'MERIT'::public."BehaviorLedgerType" THEN "totalMerit" + p_points
      WHEN p_type = 'CORRECTION_DEBIT'::public."BehaviorLedgerType" THEN GREATEST(0, "totalMerit" - pg_catalog.abs(p_points))
      ELSE "totalMerit"
    END,
    "lastCalculatedAt" = pg_catalog.clock_timestamp()
  WHERE "id" = v_proj_id;

  -- 9. Insert Immutable Audit Log (Real Actor Verified from Session)
  v_audit_id := 'audit_' || pg_catalog.md5(pg_catalog.random()::text || pg_catalog.clock_timestamp()::text);
  INSERT INTO public."StudentAffairsAuditLog" (
    "id", "entityType", "entityId", "action", "actionVersion",
    "actorId", "actorIdSnapshot", "actorRoleSnapshot", "correlationId",
    "source", "payload", "ipAddress", "createdAt"
  ) VALUES (
    v_audit_id, 'BEHAVIOR_RECORD', v_new_record_id, 'RECORD_BEHAVIOR_LEDGER', '1.0',
    v_actor_id, v_actor_id, v_actor_role,
    COALESCE(p_correlation_id, pg_catalog.md5(pg_catalog.random()::text)), 'STORED_PROCEDURE',
    pg_catalog.json_build_object('type', p_type, 'points', p_points, 'balanceAfter', v_new_balance, 'seq', v_new_seq),
    p_ip_address, pg_catalog.clock_timestamp()
  );

  -- 10. Return Result
  o_record_id := v_new_record_id;
  o_sequence_no := v_new_seq;
  o_balance_after := v_new_balance;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog;

ALTER FUNCTION public.record_student_behavior_ledger(TEXT, TEXT, INT, public."BehaviorLedgerType", public."BehaviorCategory", INT, DATE, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) OWNER TO postgres;


-- =============================================================================
-- 7. PRIVILEGE BOUNDARY MATRIX (Storage Engine Revoke & Grant)
-- =============================================================================

-- 1. Behavior Projection Table
REVOKE INSERT, UPDATE, DELETE ON TABLE public."StudentYearlyBehaviorProjection" FROM PUBLIC, eleave_runtime;
GRANT SELECT ON TABLE public."StudentYearlyBehaviorProjection" TO eleave_runtime;

-- 2. Behavior Records Table
REVOKE INSERT, UPDATE, DELETE ON TABLE public."BehaviorRecord" FROM PUBLIC, eleave_runtime;
GRANT SELECT ON TABLE public."BehaviorRecord" TO eleave_runtime;

-- 3. Student Status History Table
REVOKE INSERT, UPDATE, DELETE ON TABLE public."StudentStatusHistory" FROM PUBLIC, eleave_runtime;
GRANT SELECT ON TABLE public."StudentStatusHistory" TO eleave_runtime;

-- 4. Audit Log Table
REVOKE INSERT, UPDATE, DELETE ON TABLE public."StudentAffairsAuditLog" FROM PUBLIC, eleave_runtime;
GRANT SELECT ON TABLE public."StudentAffairsAuditLog" TO eleave_runtime;

-- 5. Student Table (Column-Level Privilege Boundary)
REVOKE UPDATE ON TABLE public."Student" FROM PUBLIC, eleave_runtime;
GRANT SELECT ON TABLE public."Student" TO eleave_runtime;
GRANT UPDATE ("nationalId", "title", "firstName", "lastName", "nickname", "gender", "birthDate", "homeAddress", "parentName", "parentPhone", "updatedAt") ON TABLE public."Student" TO eleave_runtime;

-- 6. Other Student Affairs Tables (Read/Write Grants for Runtime)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."StudentEnrollment" TO eleave_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."ScheduledClassSession" TO eleave_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."StudentMedicalCertificate" TO eleave_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."StudentMorningAttendance" TO eleave_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."StudentPeriodAttendance" TO eleave_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."StudentHomeVisit" TO eleave_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."SdqNormsRegistry" TO eleave_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."StudentSdqEvaluation" TO eleave_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."StudentRiskAssessment" TO eleave_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."StudentInterventionCase" TO eleave_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."InterventionActivity" TO eleave_runtime;
GRANT SELECT, INSERT, UPDATE ON TABLE public."StudentAffairsAttachment" TO eleave_runtime;
GRANT SELECT, INSERT, UPDATE ON TABLE public."CctExportManifest" TO eleave_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."StudentMeritNomination" TO eleave_runtime;
GRANT SELECT ON TABLE public."ClassRoom" TO eleave_runtime;
GRANT SELECT ON TABLE public."SubjectOffering" TO eleave_runtime;

-- 7. Stored Procedures Execution Grants
REVOKE ALL ON FUNCTION public.record_student_behavior_ledger(TEXT, TEXT, INT, public."BehaviorLedgerType", public."BehaviorCategory", INT, DATE, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_student_behavior_ledger(TEXT, TEXT, INT, public."BehaviorLedgerType", public."BehaviorCategory", INT, DATE, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO eleave_runtime;

REVOKE ALL ON FUNCTION public.change_student_status(TEXT, TEXT, public."StudentStatus", TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.change_student_status(TEXT, TEXT, public."StudentStatus", TEXT) TO eleave_runtime;
