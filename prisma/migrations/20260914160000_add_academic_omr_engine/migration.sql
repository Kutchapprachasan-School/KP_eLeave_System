-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ExamSheetType" AS ENUM ('SHEET_20_ITEMS', 'SHEET_50_ITEMS', 'SHEET_100_ITEMS', 'CUSTOM');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ExamItemStatus" AS ENUM ('CORRECT', 'INCORRECT', 'BLANK', 'MULTIPLE_MARKS', 'FLAGGED_FOR_REVIEW', 'MANUALLY_OVERRIDDEN');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "SubmissionSyncStatus" AS ENUM ('PENDING_SYNC', 'SYNCED', 'CONFLICT', 'SUPERSEDED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateTable: ExamTemplate
CREATE TABLE IF NOT EXISTS "ExamTemplate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sheetType" "ExamSheetType" NOT NULL DEFAULT 'SHEET_50_ITEMS',
    "canvasWidth" INTEGER NOT NULL DEFAULT 1654,
    "canvasHeight" INTEGER NOT NULL DEFAULT 2339,
    "gridMetadata" JSONB NOT NULL,
    "calibrationDefaults" JSONB NOT NULL,
    "isDeprecated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ExamPaper
CREATE TABLE IF NOT EXISTS "ExamPaper" (
    "id" TEXT NOT NULL,
    "subjectCode" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "term" INTEGER NOT NULL,
    "gradeLevel" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "totalItems" INTEGER NOT NULL DEFAULT 50,
    "maxScore" DECIMAL(6,2) NOT NULL,
    "passScore" DECIMAL(6,2) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamPaper_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ExamPrintedSheet
CREATE TABLE IF NOT EXISTS "ExamPrintedSheet" (
    "id" TEXT NOT NULL,
    "sheetToken" TEXT NOT NULL,
    "examPaperId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentName" TEXT,
    "classroom" TEXT,
    "seatNo" INTEGER,
    "attemptNo" INTEGER NOT NULL DEFAULT 1,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamPrintedSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ExamAnswerKey
CREATE TABLE IF NOT EXISTS "ExamAnswerKey" (
    "id" TEXT NOT NULL,
    "examPaperId" TEXT NOT NULL,
    "versionCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamAnswerKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ExamAnswerKeyItem
CREATE TABLE IF NOT EXISTS "ExamAnswerKeyItem" (
    "id" TEXT NOT NULL,
    "answerKeyId" TEXT NOT NULL,
    "itemNo" INTEGER NOT NULL,
    "correctChoices" TEXT[] NOT NULL,
    "points" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    "penaltyPoints" DECIMAL(5,2) NOT NULL DEFAULT 0.00,

    CONSTRAINT "ExamAnswerKeyItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ExamSubmission
CREATE TABLE IF NOT EXISTS "ExamSubmission" (
    "id" TEXT NOT NULL,
    "clientScanId" TEXT NOT NULL,
    "examPaperId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentName" TEXT,
    "classroom" TEXT,
    "seatNo" INTEGER,
    "versionCode" TEXT NOT NULL DEFAULT '01',
    "attemptNo" INTEGER NOT NULL DEFAULT 1,
    "isLatestAttempt" BOOLEAN NOT NULL DEFAULT true,
    "rawScore" DECIMAL(6,2) NOT NULL,
    "netScore" DECIMAL(6,2) NOT NULL,
    "totalCorrect" INTEGER NOT NULL DEFAULT 0,
    "totalIncorrect" INTEGER NOT NULL DEFAULT 0,
    "totalBlanks" INTEGER NOT NULL DEFAULT 0,
    "totalMultiple" INTEGER NOT NULL DEFAULT 0,
    "gradingVersion" INTEGER NOT NULL DEFAULT 1,
    "confidenceAvg" DECIMAL(4,3) NOT NULL,
    "hasAnomalies" BOOLEAN NOT NULL DEFAULT false,
    "isVerifiedByTeacher" BOOLEAN NOT NULL DEFAULT false,
    "verifiedByUserId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "scannedImageKey" TEXT,
    "syncStatus" "SubmissionSyncStatus" NOT NULL DEFAULT 'SYNCED',
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scannedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ExamItemSubmission
CREATE TABLE IF NOT EXISTS "ExamItemSubmission" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "itemNo" INTEGER NOT NULL,
    "detectedChoices" TEXT[] NOT NULL,
    "fillRatios" JSONB NOT NULL,
    "confidenceScore" DECIMAL(4,3) NOT NULL,
    "overrideChoice" TEXT,
    "effectiveChoice" TEXT,
    "isOverridden" BOOLEAN NOT NULL DEFAULT false,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "scoreEarned" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "status" "ExamItemStatus" NOT NULL DEFAULT 'CORRECT',

    CONSTRAINT "ExamItemSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ExamAuditLog
CREATE TABLE IF NOT EXISTS "ExamAuditLog" (
    "id" TEXT NOT NULL,
    "examPaperIdSnapshot" TEXT NOT NULL,
    "submissionIdSnapshot" TEXT,
    "action" TEXT NOT NULL,
    "performedByUserId" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamAuditLog_pkey" PRIMARY KEY ("id")
);

-- Unique Indexes & Standard Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "uk_exam_template_code_version" ON "ExamTemplate"("code", "version");
CREATE INDEX IF NOT EXISTS "ExamTemplate_sheetType_isDeprecated_idx" ON "ExamTemplate"("sheetType", "isDeprecated");

CREATE INDEX IF NOT EXISTS "ExamPaper_subjectCode_academicYear_term_idx" ON "ExamPaper"("subjectCode", "academicYear", "term");
CREATE INDEX IF NOT EXISTS "ExamPaper_createdById_idx" ON "ExamPaper"("createdById");

CREATE UNIQUE INDEX IF NOT EXISTS "uk_printed_sheet_token" ON "ExamPrintedSheet"("sheetToken");
CREATE UNIQUE INDEX IF NOT EXISTS "uk_printed_sheet_paper_student_attempt" ON "ExamPrintedSheet"("examPaperId", "studentId", "attemptNo");
CREATE INDEX IF NOT EXISTS "ExamPrintedSheet_sheetToken_idx" ON "ExamPrintedSheet"("sheetToken");

CREATE UNIQUE INDEX IF NOT EXISTS "uk_answer_key_paper_version" ON "ExamAnswerKey"("examPaperId", "versionCode");
CREATE INDEX IF NOT EXISTS "ExamAnswerKey_examPaperId_idx" ON "ExamAnswerKey"("examPaperId");

CREATE UNIQUE INDEX IF NOT EXISTS "uk_answer_key_item_no" ON "ExamAnswerKeyItem"("answerKeyId", "itemNo");
CREATE INDEX IF NOT EXISTS "ExamAnswerKeyItem_answerKeyId_idx" ON "ExamAnswerKeyItem"("answerKeyId");

CREATE UNIQUE INDEX IF NOT EXISTS "uk_submission_client_scan_id" ON "ExamSubmission"("clientScanId");
CREATE UNIQUE INDEX IF NOT EXISTS "uk_latest_submission_per_student" ON "ExamSubmission"("examPaperId", "studentId") WHERE "isLatestAttempt" = true;
CREATE INDEX IF NOT EXISTS "ExamSubmission_examPaperId_classroom_idx" ON "ExamSubmission"("examPaperId", "classroom");
CREATE INDEX IF NOT EXISTS "ExamSubmission_scannedByUserId_idx" ON "ExamSubmission"("scannedByUserId");
CREATE INDEX IF NOT EXISTS "ExamSubmission_syncStatus_idx" ON "ExamSubmission"("syncStatus");

CREATE UNIQUE INDEX IF NOT EXISTS "uk_item_submission_item_no" ON "ExamItemSubmission"("submissionId", "itemNo");
CREATE INDEX IF NOT EXISTS "ExamItemSubmission_submissionId_idx" ON "ExamItemSubmission"("submissionId");

CREATE INDEX IF NOT EXISTS "idx_audit_paper_created" ON "ExamAuditLog"("examPaperIdSnapshot", "createdAt");
CREATE INDEX IF NOT EXISTS "idx_audit_user" ON "ExamAuditLog"("performedByUserId");

-- Foreign Keys (wrapped in DO blocks for idempotency)
DO $$ BEGIN
  ALTER TABLE "ExamPaper" ADD CONSTRAINT "ExamPaper_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ExamTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ExamPaper" ADD CONSTRAINT "ExamPaper_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ExamPrintedSheet" ADD CONSTRAINT "ExamPrintedSheet_examPaperId_fkey" FOREIGN KEY ("examPaperId") REFERENCES "ExamPaper"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ExamAnswerKey" ADD CONSTRAINT "ExamAnswerKey_examPaperId_fkey" FOREIGN KEY ("examPaperId") REFERENCES "ExamPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ExamAnswerKeyItem" ADD CONSTRAINT "ExamAnswerKeyItem_answerKeyId_fkey" FOREIGN KEY ("answerKeyId") REFERENCES "ExamAnswerKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ExamSubmission" ADD CONSTRAINT "ExamSubmission_examPaperId_fkey" FOREIGN KEY ("examPaperId") REFERENCES "ExamPaper"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ExamSubmission" ADD CONSTRAINT "ExamSubmission_scannedByUserId_fkey" FOREIGN KEY ("scannedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ExamItemSubmission" ADD CONSTRAINT "ExamItemSubmission_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ExamSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CHECK Constraints on ExamAnswerKeyItem
DO $$ BEGIN
  ALTER TABLE "ExamAnswerKeyItem"
    ADD CONSTRAINT "chk_answer_key_item_no_positive" CHECK ("itemNo" >= 1);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ExamAnswerKeyItem"
    ADD CONSTRAINT "chk_answer_key_item_points" CHECK ("points" > 0 AND "penaltyPoints" >= 0);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ExamAnswerKeyItem"
    ADD CONSTRAINT "chk_answer_key_item_choices_cardinality" CHECK (cardinality("correctChoices") BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ExamAnswerKeyItem"
    ADD CONSTRAINT "chk_answer_key_item_choices_valid" CHECK (
      "correctChoices" <@ ARRAY['A', 'B', 'C', 'D', 'E']::text[]
      AND array_position("correctChoices", NULL) IS NULL
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Dynamic Bound Trigger for itemNo <= totalItems
CREATE OR REPLACE FUNCTION validate_answer_key_item_bounds()
RETURNS TRIGGER AS $$
DECLARE
  v_total_items INT;
BEGIN
  SELECT p."totalItems" INTO v_total_items
  FROM "ExamPaper" p
  JOIN "ExamAnswerKey" k ON k."examPaperId" = p.id
  WHERE k.id = NEW."answerKeyId";

  IF NEW."itemNo" > v_total_items THEN
    RAISE EXCEPTION 'INTEGRITY VIOLATION: itemNo (%) exceeds totalItems (%) of the parent ExamPaper',
      NEW."itemNo", v_total_items;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_answer_key_item_bounds ON "ExamAnswerKeyItem";
CREATE TRIGGER trg_validate_answer_key_item_bounds
BEFORE INSERT OR UPDATE ON "ExamAnswerKeyItem"
FOR EACH ROW EXECUTE FUNCTION validate_answer_key_item_bounds();

-- Strictly Append-Only Triggers on ExamAuditLog
CREATE OR REPLACE FUNCTION prevent_exam_audit_row_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'DATABASE INTEGRITY VIOLATION: ExamAuditLog row mutation is strictly prohibited. UPDATE and DELETE are blocked.';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_exam_audit_truncate()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'DATABASE INTEGRITY VIOLATION: Truncating ExamAuditLog is strictly prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_exam_audit_log_immutable_row ON "ExamAuditLog";
CREATE TRIGGER trg_exam_audit_log_immutable_row
BEFORE UPDATE OR DELETE ON "ExamAuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_exam_audit_row_mutation();

DROP TRIGGER IF EXISTS trg_exam_audit_log_prevent_truncate ON "ExamAuditLog";
CREATE TRIGGER trg_exam_audit_log_prevent_truncate
BEFORE TRUNCATE ON "ExamAuditLog"
FOR EACH STATEMENT EXECUTE FUNCTION prevent_exam_audit_truncate();

-- Revoke truncate permission
DO $$
BEGIN
  REVOKE TRUNCATE ON "ExamAuditLog" FROM PUBLIC;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    REVOKE TRUNCATE ON "ExamAuditLog" FROM app_user;
  END IF;
END $$;
