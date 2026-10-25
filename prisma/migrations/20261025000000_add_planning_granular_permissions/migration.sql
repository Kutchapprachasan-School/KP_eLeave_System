-- Migration: 20261025000000_add_planning_granular_permissions
-- Add granular permissions columns for budget adjustment and expense disbursement

ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "enablePlanning" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "planningOfficerUserIds" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "planningBudgetOfficerUserIds" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "planningDisburserUserIds" TEXT NOT NULL DEFAULT '';
