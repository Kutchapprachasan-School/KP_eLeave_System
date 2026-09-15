-- Migration: 20260915180000_omr_rev8_2_hardening
-- Hardened OMR Schema Rev 8.2: Subjective Items, Key Versions Snapshot, Recycle Bin Soft Delete, and Score CHECK Constraints

-- 1. Alter ExamPaper: add Subjective fields and Soft Delete metadata
ALTER TABLE "ExamPaper" ADD COLUMN IF NOT EXISTS "totalSubjectiveItems" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ExamPaper" ADD COLUMN IF NOT EXISTS "subjectiveMaxScore" DECIMAL(6, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE "ExamPaper" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ExamPaper" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "ExamPaper" ADD COLUMN IF NOT EXISTS "deletedById" TEXT;
ALTER TABLE "ExamPaper" ADD COLUMN IF NOT EXISTS "purgeAt" TIMESTAMP(3);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_exam_paper_deleted_by') THEN
    ALTER TABLE "ExamPaper" ADD CONSTRAINT "fk_exam_paper_deleted_by"
      FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ExamPaper_createdById_isDeleted_idx" ON "ExamPaper"("createdById", "isDeleted");
CREATE INDEX IF NOT EXISTS "ExamPaper_isDeleted_purgeAt_idx" ON "ExamPaper"("isDeleted", "purgeAt");

-- 2. Create ExamSubjectiveItem table (Normalized Relational Model)
CREATE TABLE IF NOT EXISTS "ExamSubjectiveItem" (
  "id" TEXT NOT NULL,
  "examPaperId" TEXT NOT NULL,
  "itemNo" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "maxScore" DECIMAL(5, 2) NOT NULL,
  "rubricDetail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ExamSubjectiveItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fk_subjective_item_exam_paper" FOREIGN KEY ("examPaperId") REFERENCES "ExamPaper"("id") ON DELETE CASCADE,
  CONSTRAINT "uk_subjective_item_paper_no" UNIQUE ("examPaperId", "itemNo")
);
CREATE INDEX IF NOT EXISTS "ExamSubjectiveItem_examPaperId_idx" ON "ExamSubjectiveItem"("examPaperId");

-- 3. Create ExamAnswerKeyVersion table (Immutable Snapshots)
CREATE TABLE IF NOT EXISTS "ExamAnswerKeyVersion" (
  "id" TEXT NOT NULL,
  "examPaperId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "keyPayload" JSONB NOT NULL,
  "totalItems" INTEGER NOT NULL,
  "maxScore" DECIMAL(6, 2) NOT NULL,
  "changedById" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ExamAnswerKeyVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fk_key_version_exam_paper" FOREIGN KEY ("examPaperId") REFERENCES "ExamPaper"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_key_version_changed_by" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT,
  CONSTRAINT "uk_paper_key_version" UNIQUE ("examPaperId", "version")
);
CREATE INDEX IF NOT EXISTS "ExamAnswerKeyVersion_examPaperId_idx" ON "ExamAnswerKeyVersion"("examPaperId");

-- 4. Alter ExamSubmission: add Subjective Scores
ALTER TABLE "ExamSubmission" ADD COLUMN IF NOT EXISTS "subjectiveScore" DECIMAL(6, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE "ExamSubmission" ADD COLUMN IF NOT EXISTS "subjectiveScores" JSONB;

-- 5. Mathematical Score Bounds CHECK Constraints
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_exam_paper_scores') THEN
    ALTER TABLE "ExamPaper" ADD CONSTRAINT "chk_exam_paper_scores"
      CHECK ("maxScore" >= 0 AND "subjectiveMaxScore" >= 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_subjective_item_score') THEN
    ALTER TABLE "ExamSubjectiveItem" ADD CONSTRAINT "chk_subjective_item_score"
      CHECK ("maxScore" > 0);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_exam_submission_score_invariants') THEN
    ALTER TABLE "ExamSubmission" ADD CONSTRAINT "chk_exam_submission_score_invariants"
      CHECK (
        "rawScore" >= 0 AND
        "subjectiveScore" >= 0 AND
        "netScore" >= 0
      );
  END IF;
END $$;
