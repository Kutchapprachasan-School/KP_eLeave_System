-- ========================================================
-- Migration: 20261024000000_add_school_planning_budget_system
-- Description: Non-destructive DDL - School Planning & Budget Ledger
-- ========================================================

-- 1. Create Enums if not exists
DO $$ BEGIN
  CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "BudgetSourceType" AS ENUM ('SUBSIDY', 'FREE_EDUCATION_15Y', 'SCHOOL_INCOME', 'LOCAL_GOV', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ExpenseCategory" AS ENUM ('REMUNERATION', 'OPERATING', 'MATERIALS', 'EQUIPMENT', 'UTILITIES', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ExpenseStatus" AS ENUM ('RESERVED', 'PAID', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AttachmentType" AS ENUM ('PROPOSAL', 'APPROVAL', 'SUMMARY', 'RECEIPT', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "StorageType" AS ENUM ('R2_UPLOAD', 'EXTERNAL_LINK');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Update SystemSettings
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "enablePlanning" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "planningOfficerUserIds" TEXT NOT NULL DEFAULT '';

-- 3. Update Project
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "budgetSourceType" "BudgetSourceType" NOT NULL DEFAULT 'SUBSIDY';
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "strategyCode" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "standardTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "adjustedAmount" DECIMAL(19,4);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

DO $$ BEGIN
  ALTER TABLE "Project" ADD CONSTRAINT "Project_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "idx_project_deleted_at" ON "Project"("deletedAt");

-- 4. Update ProjectActivity
ALTER TABLE "ProjectActivity" ADD COLUMN IF NOT EXISTS "adjustedAmount" DECIMAL(19,4);
ALTER TABLE "ProjectActivity" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "idx_activity_deleted_at" ON "ProjectActivity"("deletedAt");

-- 5. Update ProjectAttachment
ALTER TABLE "ProjectAttachment" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "ProjectAttachment" ADD COLUMN IF NOT EXISTS "attachmentType" "AttachmentType" NOT NULL DEFAULT 'PROPOSAL';
ALTER TABLE "ProjectAttachment" ADD COLUMN IF NOT EXISTS "storageType" "StorageType" NOT NULL DEFAULT 'R2_UPLOAD';
ALTER TABLE "ProjectAttachment" ADD COLUMN IF NOT EXISTS "fileUrl" TEXT;
ALTER TABLE "ProjectAttachment" ADD COLUMN IF NOT EXISTS "fileKey" TEXT;

CREATE INDEX IF NOT EXISTS "idx_proj_attach_proj_type" ON "ProjectAttachment"("projectId", "attachmentType");

-- 6. Update ActivityExpense
ALTER TABLE "ActivityExpense" ADD COLUMN IF NOT EXISTS "activityId" TEXT;
ALTER TABLE "ActivityExpense" ADD COLUMN IF NOT EXISTS "recordedByUserId" TEXT;
ALTER TABLE "ActivityExpense" ADD COLUMN IF NOT EXISTS "expenseCategory" "ExpenseCategory" NOT NULL DEFAULT 'MATERIALS';
ALTER TABLE "ActivityExpense" ADD COLUMN IF NOT EXISTS "attachmentUrl" TEXT;
ALTER TABLE "ActivityExpense" ADD COLUMN IF NOT EXISTS "attachmentKey" TEXT;
ALTER TABLE "ActivityExpense" ADD COLUMN IF NOT EXISTS "remark" TEXT;
ALTER TABLE "ActivityExpense" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

DO $$ BEGIN
  ALTER TABLE "ActivityExpense" ADD CONSTRAINT "ActivityExpense_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "ProjectActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ActivityExpense" ADD CONSTRAINT "ActivityExpense_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "idx_expense_activity_status" ON "ActivityExpense"("activityId", "status");
CREATE INDEX IF NOT EXISTS "idx_expense_recorded_by" ON "ActivityExpense"("recordedByUserId");
CREATE INDEX IF NOT EXISTS "idx_expense_deleted_at" ON "ActivityExpense"("deletedAt");
