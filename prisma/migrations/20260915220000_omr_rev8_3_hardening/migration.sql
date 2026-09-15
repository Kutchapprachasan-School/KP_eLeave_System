-- Migration: 20260915220000_omr_rev8_3_hardening
-- Hardened OMR Schema Rev 8.3: Dual-Direction Score Triggers, Regrade Job with Row-Level Leasing, Composite Cursor Index, and gradingVersionId FK

-- 1. Create RegradeJobStatus Enum if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RegradeJobStatus') THEN
    CREATE TYPE "RegradeJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'SUPERSEDED');
  END IF;
END $$;

-- 2. Add gradingVersionId to ExamSubmission
ALTER TABLE "ExamSubmission" ADD COLUMN IF NOT EXISTS "gradingVersionId" TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_submission_grading_version') THEN
    ALTER TABLE "ExamSubmission" ADD CONSTRAINT "fk_submission_grading_version"
      FOREIGN KEY ("gradingVersionId") REFERENCES "ExamAnswerKeyVersion"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ExamSubmission_gradingVersionId_idx" ON "ExamSubmission"("gradingVersionId");

-- 3. Composite Index for Gapless Sortable Keyset Cursor
CREATE INDEX IF NOT EXISTS "ExamSubmission_paper_latest_created_id_idx"
  ON "ExamSubmission"("examPaperId", "isLatestAttempt", "createdAt", "id");

-- 4. Create ExamRegradeJob Table
CREATE TABLE IF NOT EXISTS "ExamRegradeJob" (
  "id" TEXT NOT NULL,
  "examPaperId" TEXT NOT NULL,
  "targetKeyVersionId" TEXT NOT NULL,
  "status" "RegradeJobStatus" NOT NULL DEFAULT 'PENDING',
  "workerToken" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "totalSubmissions" INTEGER NOT NULL DEFAULT 0,
  "processedSubmissions" INTEGER NOT NULL DEFAULT 0,
  "snapshotEndCreatedAt" TIMESTAMP(3),
  "snapshotEndId" TEXT,
  "cursorCreatedAt" TIMESTAMP(3),
  "cursorId" TEXT,
  "batchSize" INTEGER NOT NULL DEFAULT 50,
  "errorMessage" TEXT,
  "createdById" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ExamRegradeJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fk_regrade_job_paper" FOREIGN KEY ("examPaperId") REFERENCES "ExamPaper"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_regrade_job_key_version" FOREIGN KEY ("targetKeyVersionId") REFERENCES "ExamAnswerKeyVersion"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_regrade_job_created_by" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "ExamRegradeJob_paper_status_idx" ON "ExamRegradeJob"("examPaperId", "status");

-- 5. Trigger 1: Enforce Score Bounds on ExamSubmission (Child)
CREATE OR REPLACE FUNCTION fn_enforce_exam_submission_score_bounds()
RETURNS TRIGGER AS $$
DECLARE
  v_max_score DECIMAL(6, 2);
  v_subj_max_score DECIMAL(6, 2);
  v_total_max_score DECIMAL(6, 2);
BEGIN
  SELECT "maxScore", "subjectiveMaxScore"
  INTO v_max_score, v_subj_max_score
  FROM "ExamPaper"
  WHERE "id" = NEW."examPaperId";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ExamPaper % not found for score validation', NEW."examPaperId";
  END IF;

  v_total_max_score := v_max_score + v_subj_max_score;

  IF NEW."rawScore" < 0 OR NEW."rawScore" > v_max_score THEN
    RAISE EXCEPTION 'rawScore (%) must be between 0 and %', NEW."rawScore", v_max_score;
  END IF;

  IF NEW."subjectiveScore" < 0 OR NEW."subjectiveScore" > v_subj_max_score THEN
    RAISE EXCEPTION 'subjectiveScore (%) must be between 0 and %', NEW."subjectiveScore", v_subj_max_score;
  END IF;

  IF NEW."netScore" < 0 OR NEW."netScore" > v_total_max_score THEN
    RAISE EXCEPTION 'netScore (%) must be between 0 and %', NEW."netScore", v_total_max_score;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_exam_submission_score_bounds ON "ExamSubmission";
CREATE TRIGGER trg_exam_submission_score_bounds
BEFORE INSERT OR UPDATE OF "rawScore", "subjectiveScore", "netScore", "examPaperId"
ON "ExamSubmission"
FOR EACH ROW
EXECUTE FUNCTION fn_enforce_exam_submission_score_bounds();

-- 6. Trigger 2: Enforce Parent Score Reduction Guard on ExamPaper
CREATE OR REPLACE FUNCTION fn_enforce_exam_paper_score_bounds_on_update()
RETURNS TRIGGER AS $$
DECLARE
  v_max_existing_raw DECIMAL(6, 2);
  v_max_existing_subj DECIMAL(6, 2);
  v_max_existing_net DECIMAL(6, 2);
BEGIN
  IF (NEW."maxScore" < OLD."maxScore" OR NEW."subjectiveMaxScore" < OLD."subjectiveMaxScore") THEN
    SELECT 
      COALESCE(MAX("rawScore"), 0),
      COALESCE(MAX("subjectiveScore"), 0),
      COALESCE(MAX("netScore"), 0)
    INTO v_max_existing_raw, v_max_existing_subj, v_max_existing_net
    FROM "ExamSubmission"
    WHERE "examPaperId" = NEW."id";

    IF NEW."maxScore" < v_max_existing_raw THEN
      RAISE EXCEPTION 'Cannot reduce maxScore to %: existing submission has rawScore of %', NEW."maxScore", v_max_existing_raw;
    END IF;

    IF NEW."subjectiveMaxScore" < v_max_existing_subj THEN
      RAISE EXCEPTION 'Cannot reduce subjectiveMaxScore to %: existing submission has subjectiveScore of %', NEW."subjectiveMaxScore", v_max_existing_subj;
    END IF;

    IF (NEW."maxScore" + NEW."subjectiveMaxScore") < v_max_existing_net THEN
      RAISE EXCEPTION 'Cannot reduce total max score to %: existing submission has netScore of %', (NEW."maxScore" + NEW."subjectiveMaxScore"), v_max_existing_net;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_exam_paper_score_bounds_update ON "ExamPaper";
CREATE TRIGGER trg_exam_paper_score_bounds_update
BEFORE UPDATE OF "maxScore", "subjectiveMaxScore"
ON "ExamPaper"
FOR EACH ROW
EXECUTE FUNCTION fn_enforce_exam_paper_score_bounds_on_update();
