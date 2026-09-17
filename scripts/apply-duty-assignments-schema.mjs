import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ ERROR: DIRECT_URL or DATABASE_URL is not defined in environment.");
  process.exit(1);
}

async function main() {
  console.log("Connecting to PostgreSQL to apply Subsystem Roles & Duty Assignments schema...");
  const client = new Client({
    connectionString,
    ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
  });

  await client.connect();
  try {
    // 1. Create Enums if not exist
    console.log("Creating enums: DutyType, ScopeDivision, ScopeDepartment...");
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "DutyType" AS ENUM ('INSPECTOR', 'HR_HEAD', 'HR_STAFF', 'DIVISION_HEAD', 'DEPT_HEAD');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "ScopeDivision" AS ENUM ('ACADEMIC', 'PERSONNEL', 'GENERAL', 'BUDGET');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "ScopeDepartment" AS ENUM ('THAI', 'MATH', 'SCIENCE', 'FOREIGN_LANG', 'SOCIAL', 'HEALTH_PE', 'ART', 'CAREER', 'STUDENT_DEV');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Create UserDutyAssignment table if not exists
    console.log("Creating table UserDutyAssignment...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS "UserDutyAssignment" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "dutyType" "DutyType" NOT NULL,
        "divisionScope" "ScopeDivision",
        "departmentScope" "ScopeDepartment",
        "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "revokedAt" TIMESTAMP(3),
        "assignedById" TEXT,
        CONSTRAINT "UserDutyAssignment_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "UserDutyAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "UserDutyAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    // 3. Add dedicated snapshot columns to LeaveRequest
    console.log("Adding inspectorSnapshot & headApproverSnapshot columns to LeaveRequest...");
    await client.query(`
      ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "inspectorSnapshot" JSONB;
      ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "headApproverSnapshot" JSONB;
    `);

    // 4. Bi-directional scope validity constraint
    console.log("Applying chk_duty_scope_validity constraint...");
    await client.query(`
      ALTER TABLE "UserDutyAssignment" DROP CONSTRAINT IF EXISTS "chk_duty_scope_validity";
      ALTER TABLE "UserDutyAssignment" ADD CONSTRAINT "chk_duty_scope_validity"
      CHECK (
        ("dutyType" = 'DIVISION_HEAD' AND "divisionScope" IS NOT NULL AND "departmentScope" IS NULL) OR
        ("dutyType" = 'DEPT_HEAD' AND "departmentScope" IS NOT NULL AND "divisionScope" IS NULL) OR
        ("dutyType" IN ('INSPECTOR', 'HR_HEAD', 'HR_STAFF') AND "divisionScope" IS NULL AND "departmentScope" IS NULL)
      );
    `);

    // 5. Scoped Partial Unique Indexes
    console.log("Applying partial unique indexes...");
    await client.query(`
      DROP INDEX IF EXISTS "uk_active_global_user_duty";
      CREATE UNIQUE INDEX "uk_active_global_user_duty" ON "UserDutyAssignment" (
        "userId", "dutyType"
      ) WHERE "revokedAt" IS NULL AND "dutyType" IN ('INSPECTOR', 'HR_HEAD', 'HR_STAFF');

      DROP INDEX IF EXISTS "uk_active_division_user_duty";
      CREATE UNIQUE INDEX "uk_active_division_user_duty" ON "UserDutyAssignment" (
        "userId", "dutyType", "divisionScope"
      ) WHERE "revokedAt" IS NULL AND "dutyType" = 'DIVISION_HEAD';

      DROP INDEX IF EXISTS "uk_active_dept_user_duty";
      CREATE UNIQUE INDEX "uk_active_dept_user_duty" ON "UserDutyAssignment" (
        "userId", "dutyType", "departmentScope"
      ) WHERE "revokedAt" IS NULL AND "dutyType" = 'DEPT_HEAD';

      DROP INDEX IF EXISTS "uk_single_active_division_head";
      CREATE UNIQUE INDEX "uk_single_active_division_head" ON "UserDutyAssignment" (
        "dutyType", "divisionScope"
      ) WHERE "revokedAt" IS NULL AND "dutyType" = 'DIVISION_HEAD';

      DROP INDEX IF EXISTS "uk_single_active_dept_head";
      CREATE UNIQUE INDEX "uk_single_active_dept_head" ON "UserDutyAssignment" (
        "dutyType", "departmentScope"
      ) WHERE "revokedAt" IS NULL AND "dutyType" = 'DEPT_HEAD';
    `);

    // 6. Triggers for Snapshot protection and Deletion protection
    console.log("Applying DB Triggers for leave protection...");
    await client.query(`
      CREATE OR REPLACE FUNCTION protect_leave_signer_snapshots()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Mandatory snapshot presence check when transitioning into APPROVED
        IF OLD.status <> 'APPROVED' AND NEW.status = 'APPROVED' THEN
          IF NEW."createdAt" >= '2026-09-18T00:00:00Z' THEN
            IF NEW."headApproverSnapshot" IS NULL THEN
              RAISE EXCEPTION 'Audit Violation: An approved leave request must contain a sealed headApproverSnapshot';
            END IF;
          END IF;
        END IF;

        -- Immutability check if leave was already APPROVED
        IF OLD.status = 'APPROVED' THEN
          IF (OLD."inspectorSnapshot" IS DISTINCT FROM NEW."inspectorSnapshot") OR
             (OLD."headApproverSnapshot" IS DISTINCT FROM NEW."headApproverSnapshot") OR
             (OLD."execApproverId" IS DISTINCT FROM NEW."execApproverId") OR
             (OLD."headApproverId" IS DISTINCT FROM NEW."headApproverId") THEN
            RAISE EXCEPTION 'Cryptographic/Audit Integrity Violation: Signer snapshots and approvers of an approved leave request are permanently immutable';
          END IF;
          IF NEW.status <> 'APPROVED' AND NEW.status <> 'CANCELLED' THEN
            RAISE EXCEPTION 'Audit Violation: An APPROVED leave request cannot transition back to pending or draft states';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_protect_leave_signer_snapshots ON "LeaveRequest";
      CREATE TRIGGER trg_protect_leave_signer_snapshots
      BEFORE UPDATE ON "LeaveRequest"
      FOR EACH ROW EXECUTE FUNCTION protect_leave_signer_snapshots();

      CREATE OR REPLACE FUNCTION protect_leave_approved_deletion()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.status = 'APPROVED' THEN
          RAISE EXCEPTION 'Audit Violation: Hard DELETE on an APPROVED leave request is forbidden. Use official cancellation or soft-delete.';
        END IF;
        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_protect_leave_approved_deletion ON "LeaveRequest";
      CREATE TRIGGER trg_protect_leave_approved_deletion
      BEFORE DELETE ON "LeaveRequest"
      FOR EACH ROW EXECUTE FUNCTION protect_leave_approved_deletion();
    `);

    console.log("✅ All Database schema, indexes, constraints, and triggers applied successfully!");
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error("❌ Error applying schema script:", err);
  process.exit(1);
});
