-- ========================================================
-- Migration: 20260902000000_add_budget_ledger_system
-- Description: Zero Destructive DDL - Add Budget Ledger Entities
-- ========================================================

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS "FiscalYear" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalYear_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BudgetSource" (
    "id" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalPlannedAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BudgetTranche" (
    "id" TEXT NOT NULL,
    "budgetSourceId" TEXT NOT NULL,
    "trancheNo" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "semester" INTEGER NOT NULL,
    "expectedStartDate" TIMESTAMP(3),
    "expectedEndDate" TIMESTAMP(3),
    "plannedAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetTranche_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BudgetReceipt" (
    "id" TEXT NOT NULL,
    "budgetTrancheId" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL,
    "documentRef" TEXT,
    "bankStatement" TEXT,
    "notes" TEXT,
    "confirmedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetReceipt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Project" (
    "id" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "budgetSourceId" TEXT NOT NULL,
    "departmentName" TEXT,
    "leaderUserId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetAcademicYear" INTEGER NOT NULL,
    "allocatedAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProjectActivity" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "responsibleUserId" TEXT NOT NULL,
    "activityNo" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "allocatedAmount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "plannedStartDate" TIMESTAMP(3),
    "plannedEndDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ActivityTrancheAllocation" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "budgetTrancheId" TEXT NOT NULL,
    "allocatedAmount" DECIMAL(19,4) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityTrancheAllocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ActivityExpense" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "receiptNo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "rejectedReason" TEXT,
    "submittedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityExpense_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ExpenseReversal" (
    "id" TEXT NOT NULL,
    "originalExpenseId" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "reason" TEXT NOT NULL,
    "cancelledByUserId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "approvedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseReversal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BudgetTransfer" (
    "id" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "fromAllocationId" TEXT NOT NULL,
    "toAllocationId" TEXT NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetTransfer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedBy" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProjectAttachment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "uploadedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ExpenseAttachment" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "uploadedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseAttachment_pkey" PRIMARY KEY ("id")
);

-- 2. Create Unique & Explicit Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "uk_fiscal_year_year" ON "FiscalYear"("year");
CREATE INDEX IF NOT EXISTS "idx_budget_source_fy" ON "BudgetSource"("fiscalYearId");
CREATE UNIQUE INDEX IF NOT EXISTS "uk_budget_source_fy_code" ON "BudgetSource"("fiscalYearId", "code");
CREATE INDEX IF NOT EXISTS "idx_tranche_src" ON "BudgetTranche"("budgetSourceId");
CREATE UNIQUE INDEX IF NOT EXISTS "uk_tranche_src_no" ON "BudgetTranche"("budgetSourceId", "trancheNo");
CREATE INDEX IF NOT EXISTS "idx_receipt_tranche" ON "BudgetReceipt"("budgetTrancheId");
CREATE INDEX IF NOT EXISTS "idx_receipt_confirmed_by" ON "BudgetReceipt"("confirmedByUserId");
CREATE INDEX IF NOT EXISTS "idx_receipt_received_date" ON "BudgetReceipt"("receivedDate");
CREATE INDEX IF NOT EXISTS "idx_project_fy" ON "Project"("fiscalYearId");
CREATE INDEX IF NOT EXISTS "idx_project_budget_source" ON "Project"("budgetSourceId");
CREATE INDEX IF NOT EXISTS "idx_project_leader" ON "Project"("leaderUserId");
CREATE INDEX IF NOT EXISTS "idx_project_status" ON "Project"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "uk_project_fy_code" ON "Project"("fiscalYearId", "code");
CREATE INDEX IF NOT EXISTS "idx_activity_project_status" ON "ProjectActivity"("projectId", "status");
CREATE INDEX IF NOT EXISTS "idx_activity_responsible" ON "ProjectActivity"("responsibleUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "uk_activity_project_no" ON "ProjectActivity"("projectId", "activityNo");
CREATE INDEX IF NOT EXISTS "idx_alloc_tranche" ON "ActivityTrancheAllocation"("budgetTrancheId");
CREATE INDEX IF NOT EXISTS "idx_alloc_activity" ON "ActivityTrancheAllocation"("activityId");
CREATE UNIQUE INDEX IF NOT EXISTS "uk_alloc_activity_tranche" ON "ActivityTrancheAllocation"("activityId", "budgetTrancheId");
CREATE UNIQUE INDEX IF NOT EXISTS "uk_expense_idempotency" ON "ActivityExpense"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "idx_expense_alloc_status" ON "ActivityExpense"("allocationId", "status");
CREATE INDEX IF NOT EXISTS "idx_expense_date" ON "ActivityExpense"("expenseDate");
CREATE INDEX IF NOT EXISTS "idx_expense_requested_by" ON "ActivityExpense"("requestedByUserId");
CREATE INDEX IF NOT EXISTS "idx_expense_status" ON "ActivityExpense"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "uk_reversal_original_expense" ON "ExpenseReversal"("originalExpenseId");
CREATE INDEX IF NOT EXISTS "idx_reversal_alloc_status" ON "ExpenseReversal"("allocationId", "status");
CREATE INDEX IF NOT EXISTS "idx_reversal_cancelled_by" ON "ExpenseReversal"("cancelledByUserId");
CREATE INDEX IF NOT EXISTS "idx_transfer_fiscal_year" ON "BudgetTransfer"("fiscalYearId");
CREATE INDEX IF NOT EXISTS "idx_transfer_from_alloc" ON "BudgetTransfer"("fromAllocationId");
CREATE INDEX IF NOT EXISTS "idx_transfer_to_alloc" ON "BudgetTransfer"("toAllocationId");
CREATE INDEX IF NOT EXISTS "idx_audit_table_record" ON "AuditLog"("tableName", "recordId");
CREATE INDEX IF NOT EXISTS "idx_audit_changed_by" ON "AuditLog"("changedBy");
CREATE INDEX IF NOT EXISTS "idx_audit_created_at" ON "AuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "idx_proj_attach_proj" ON "ProjectAttachment"("projectId");
CREATE INDEX IF NOT EXISTS "idx_proj_attach_user" ON "ProjectAttachment"("uploadedByUserId");
CREATE INDEX IF NOT EXISTS "idx_exp_attach_exp" ON "ExpenseAttachment"("expenseId");
CREATE INDEX IF NOT EXISTS "idx_exp_attach_user" ON "ExpenseAttachment"("uploadedByUserId");

-- 3. Add Foreign Keys (with ON DELETE RESTRICT for Financial Integrity)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BudgetSource_fiscalYearId_fkey') THEN
    ALTER TABLE "BudgetSource" ADD CONSTRAINT "BudgetSource_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "FiscalYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BudgetTranche_budgetSourceId_fkey') THEN
    ALTER TABLE "BudgetTranche" ADD CONSTRAINT "BudgetTranche_budgetSourceId_fkey" FOREIGN KEY ("budgetSourceId") REFERENCES "BudgetSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BudgetReceipt_budgetTrancheId_fkey') THEN
    ALTER TABLE "BudgetReceipt" ADD CONSTRAINT "BudgetReceipt_budgetTrancheId_fkey" FOREIGN KEY ("budgetTrancheId") REFERENCES "BudgetTranche"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BudgetReceipt_confirmedByUserId_fkey') THEN
    ALTER TABLE "BudgetReceipt" ADD CONSTRAINT "BudgetReceipt_confirmedByUserId_fkey" FOREIGN KEY ("confirmedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Project_fiscalYearId_fkey') THEN
    ALTER TABLE "Project" ADD CONSTRAINT "Project_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "FiscalYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Project_budgetSourceId_fkey') THEN
    ALTER TABLE "Project" ADD CONSTRAINT "Project_budgetSourceId_fkey" FOREIGN KEY ("budgetSourceId") REFERENCES "BudgetSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Project_leaderUserId_fkey') THEN
    ALTER TABLE "Project" ADD CONSTRAINT "Project_leaderUserId_fkey" FOREIGN KEY ("leaderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProjectActivity_projectId_fkey') THEN
    ALTER TABLE "ProjectActivity" ADD CONSTRAINT "ProjectActivity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProjectActivity_responsibleUserId_fkey') THEN
    ALTER TABLE "ProjectActivity" ADD CONSTRAINT "ProjectActivity_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ActivityTrancheAllocation_activityId_fkey') THEN
    ALTER TABLE "ActivityTrancheAllocation" ADD CONSTRAINT "ActivityTrancheAllocation_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "ProjectActivity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ActivityTrancheAllocation_budgetTrancheId_fkey') THEN
    ALTER TABLE "ActivityTrancheAllocation" ADD CONSTRAINT "ActivityTrancheAllocation_budgetTrancheId_fkey" FOREIGN KEY ("budgetTrancheId") REFERENCES "BudgetTranche"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ActivityExpense_allocationId_fkey') THEN
    ALTER TABLE "ActivityExpense" ADD CONSTRAINT "ActivityExpense_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "ActivityTrancheAllocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ActivityExpense_requestedByUserId_fkey') THEN
    ALTER TABLE "ActivityExpense" ADD CONSTRAINT "ActivityExpense_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ActivityExpense_approvedByUserId_fkey') THEN
    ALTER TABLE "ActivityExpense" ADD CONSTRAINT "ActivityExpense_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ExpenseReversal_originalExpenseId_fkey') THEN
    ALTER TABLE "ExpenseReversal" ADD CONSTRAINT "ExpenseReversal_originalExpenseId_fkey" FOREIGN KEY ("originalExpenseId") REFERENCES "ActivityExpense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ExpenseReversal_allocationId_fkey') THEN
    ALTER TABLE "ExpenseReversal" ADD CONSTRAINT "ExpenseReversal_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "ActivityTrancheAllocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ExpenseReversal_cancelledByUserId_fkey') THEN
    ALTER TABLE "ExpenseReversal" ADD CONSTRAINT "ExpenseReversal_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ExpenseReversal_approvedByUserId_fkey') THEN
    ALTER TABLE "ExpenseReversal" ADD CONSTRAINT "ExpenseReversal_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BudgetTransfer_fiscalYearId_fkey') THEN
    ALTER TABLE "BudgetTransfer" ADD CONSTRAINT "BudgetTransfer_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "FiscalYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BudgetTransfer_fromAllocationId_fkey') THEN
    ALTER TABLE "BudgetTransfer" ADD CONSTRAINT "BudgetTransfer_fromAllocationId_fkey" FOREIGN KEY ("fromAllocationId") REFERENCES "ActivityTrancheAllocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BudgetTransfer_toAllocationId_fkey') THEN
    ALTER TABLE "BudgetTransfer" ADD CONSTRAINT "BudgetTransfer_toAllocationId_fkey" FOREIGN KEY ("toAllocationId") REFERENCES "ActivityTrancheAllocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BudgetTransfer_requestedByUserId_fkey') THEN
    ALTER TABLE "BudgetTransfer" ADD CONSTRAINT "BudgetTransfer_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BudgetTransfer_approvedByUserId_fkey') THEN
    ALTER TABLE "BudgetTransfer" ADD CONSTRAINT "BudgetTransfer_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProjectAttachment_projectId_fkey') THEN
    ALTER TABLE "ProjectAttachment" ADD CONSTRAINT "ProjectAttachment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProjectAttachment_uploadedByUserId_fkey') THEN
    ALTER TABLE "ProjectAttachment" ADD CONSTRAINT "ProjectAttachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ExpenseAttachment_expenseId_fkey') THEN
    ALTER TABLE "ExpenseAttachment" ADD CONSTRAINT "ExpenseAttachment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "ActivityExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ExpenseAttachment_uploadedByUserId_fkey') THEN
    ALTER TABLE "ExpenseAttachment" ADD CONSTRAINT "ExpenseAttachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- 4. Financial Domain CHECK Constraints (amount > 0)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_receipt_positive') THEN
    ALTER TABLE "BudgetReceipt" ADD CONSTRAINT "chk_receipt_positive" CHECK ("amount" > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_alloc_positive') THEN
    ALTER TABLE "ActivityTrancheAllocation" ADD CONSTRAINT "chk_alloc_positive" CHECK ("allocatedAmount" > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_expense_positive') THEN
    ALTER TABLE "ActivityExpense" ADD CONSTRAINT "chk_expense_positive" CHECK ("amount" > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_reversal_positive') THEN
    ALTER TABLE "ExpenseReversal" ADD CONSTRAINT "chk_reversal_positive" CHECK ("amount" > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_transfer_positive') THEN
    ALTER TABLE "BudgetTransfer" ADD CONSTRAINT "chk_transfer_positive" CHECK ("amount" > 0);
  END IF;
END $$;
