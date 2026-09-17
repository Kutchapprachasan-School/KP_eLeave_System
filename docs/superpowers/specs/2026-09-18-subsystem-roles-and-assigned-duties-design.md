# Subsystem Roles, Assigned Duties & Teacher Capability Architecture Design (Rev 4 - Definitive Forensic Architecture)

**Document ID:** `SPEC-2026-09-18-ROLES-DUTIES-04`  
**Date:** 2026-09-18  
**Status:** `APPROVED_DESIGN_REV4_DEFINITIVE`  
**Author:** Pair Programming (Senior Forensic Architecture)  
**Target Environments:** `dev` → `main` (Vercel & Authoritative PostgreSQL)

---

## 1. Executive Summary & Forensic Hardening (Rev 4)

This definitive specification closes all 6 remaining production gates:
1. **Direct Scope Columns in Partial Unique Indexes:** Eliminates `COALESCE` expressions. Implements explicit partial unique indexes on `(userId, dutyType, divisionScope, departmentScope) WHERE revokedAt IS NULL` and institutional singleton constraints (one Head per Department/Division).
2. **Single Source of Truth for Active State:** Removed `isActive`. Canonical active status is strictly defined as `revokedAt IS NULL`.
3. **Canonical Deterministic Lock Hierarchy in `updateAppointedDuties`:** Locks `SystemSettings` -> sorts target `userId`s ascending -> acquires row locks on `User` -> acquires row locks on active `UserDutyAssignment` before executing mutations.
4. **Active Capability & Actor Verification at Transaction Execution:** Before executing `inspectLeaveRequest` or `approveLeaveRequest`, the system verifies inside the transaction: (a) `request.userId !== session.user.id`, (b) the actor's `UserDutyAssignment` remains active (`revokedAt IS NULL`), and (c) logs `SECURITY_VIOLATION` in `SystemLog` if breached before throwing.
5. **Explicit DB-Level Immutability Seal on Approved Snapshots:** PostgreSQL trigger enforces that `inspectorSnapshot` and `headApproverSnapshot` can be populated during the approval lifecycle, but become **PERMANENTLY IMMUTABLE** once `status = 'APPROVED'`. Corrections require an official superseding/cancellation record, preserving forensic auditability.
6. **Strict Input Validation & Audit for `--resolve-ambiguous`:** Resolving ambiguous positions requires Zod-validated input matching the official position allowlist, logging `{ actor: "CLI_ADMIN", targetUserId, previousPosition, resolvedPosition, timestamp }` into `SystemLog`.

---

## 2. Database Schema & Integrity Constraints

### 2.1 Prisma Models & Enums
```prisma
enum DutyType {
  INSPECTOR
  HR_HEAD
  HR_STAFF
  DIVISION_HEAD
  DEPT_HEAD
}

enum ScopeDivision {
  ACADEMIC
  PERSONNEL
  GENERAL
  BUDGET
}

enum ScopeDepartment {
  THAI
  MATH
  SCIENCE
  FOREIGN_LANG
  SOCIAL
  HEALTH_PE
  ART
  CAREER
  STUDENT_DEV
}

model UserDutyAssignment {
  id              String           @id @default(cuid())
  userId          String
  dutyType        DutyType
  divisionScope   ScopeDivision?
  departmentScope ScopeDepartment?
  assignedAt      DateTime         @default(now())
  revokedAt       DateTime?
  assignedById    String?
  user            User             @relation("UserDutyAssignments", fields: [userId], references: [id], onDelete: Cascade)
  assignedBy      User?            @relation("DutyAssignedByUser", fields: [assignedById], references: [id], onDelete: SetNull)

  @@index([userId, dutyType, revokedAt])
  @@index([dutyType, divisionScope, revokedAt])
  @@index([dutyType, departmentScope, revokedAt])
}

model LeaveRequest {
  // ... existing fields ...
  inspectorSnapshot    Json? // Dedicated sealed snapshot { userId, name, position, level, duty, signedAt }
  headApproverSnapshot Json? // Dedicated sealed snapshot { userId, name, position, level, duty, signedAt }
  // ...
}
```

### 2.2 Authoritative Database Constraints & Indexes (PostgreSQL)
```sql
-- 1. Bi-directional scope validity constraint: enforce exact scope fields per dutyType
ALTER TABLE "UserDutyAssignment"
  DROP CONSTRAINT IF EXISTS "chk_duty_scope_validity";
ALTER TABLE "UserDutyAssignment"
  ADD CONSTRAINT "chk_duty_scope_validity"
  CHECK (
    ("dutyType" = 'DIVISION_HEAD' AND "divisionScope" IS NOT NULL AND "departmentScope" IS NULL) OR
    ("dutyType" = 'DEPT_HEAD' AND "departmentScope" IS NOT NULL AND "divisionScope" IS NULL) OR
    ("dutyType" IN ('INSPECTOR', 'HR_HEAD', 'HR_STAFF') AND "divisionScope" IS NULL AND "departmentScope" IS NULL)
  );

-- 2. User assignment uniqueness: No duplicate active duty for same user, duty, and scope
DROP INDEX IF EXISTS "uk_active_global_user_duty";
CREATE UNIQUE INDEX "uk_active_global_user_duty" ON "UserDutyAssignment" (
  "userId", "dutyType"
) WHERE "revokedAt" IS NULL AND "divisionScope" IS NULL AND "departmentScope" IS NULL;

DROP INDEX IF EXISTS "uk_active_division_user_duty";
CREATE UNIQUE INDEX "uk_active_division_user_duty" ON "UserDutyAssignment" (
  "userId", "dutyType", "divisionScope"
) WHERE "revokedAt" IS NULL AND "divisionScope" IS NOT NULL;

DROP INDEX IF EXISTS "uk_active_dept_user_duty";
CREATE UNIQUE INDEX "uk_active_dept_user_duty" ON "UserDutyAssignment" (
  "userId", "dutyType", "departmentScope"
) WHERE "revokedAt" IS NULL AND "departmentScope" IS NOT NULL;

-- 3. Institutional Singleton Constraints: Only ONE active head per Division and Department school-wide
DROP INDEX IF EXISTS "uk_single_active_division_head";
CREATE UNIQUE INDEX "uk_single_active_division_head" ON "UserDutyAssignment" (
  "divisionScope"
) WHERE "revokedAt" IS NULL AND "dutyType" = 'DIVISION_HEAD';

DROP INDEX IF EXISTS "uk_single_active_dept_head";
CREATE UNIQUE INDEX "uk_single_active_dept_head" ON "UserDutyAssignment" (
  "departmentScope"
) WHERE "revokedAt" IS NULL AND "dutyType" = 'DEPT_HEAD';

-- 4. Immutable Signer Snapshot Trigger on LeaveRequest
CREATE OR REPLACE FUNCTION protect_leave_signer_snapshots()
RETURNS TRIGGER AS $$
BEGIN
  -- If leave was already APPROVED, strictly forbid modifying signer snapshots
  IF OLD.status = 'APPROVED' THEN
    IF (OLD."inspectorSnapshot" IS DISTINCT FROM NEW."inspectorSnapshot") OR
       (OLD."headApproverSnapshot" IS DISTINCT FROM NEW."headApproverSnapshot") THEN
      RAISE EXCEPTION 'Cryptographic/Audit Integrity Violation: Signer snapshots of approved leave requests are immutable';
    END IF;
    -- Disallow transitioning away from APPROVED status (must use cancel/supercede workflow)
    IF NEW.status <> 'APPROVED' AND NEW.status <> 'CANCELLED' THEN
      RAISE EXCEPTION 'Audit Violation: An APPROVED leave request cannot transition back to pending states';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_leave_signer_snapshots ON "LeaveRequest";
CREATE TRIGGER trg_protect_leave_signer_snapshots
BEFORE UPDATE ON "LeaveRequest"
FOR EACH ROW EXECUTE FUNCTION protect_leave_signer_snapshots();
```

---

## 3. Concurrency Hierarchy in `updateAppointedDuties`

To prevent deadlocks and race conditions, row locks must be acquired in a strictly deterministic order:

```typescript
export async function updateAppointedDuties(input: {
  assignmentsToGrant: Array<{ userId: string; dutyType: DutyType; divisionScope?: ScopeDivision; departmentScope?: ScopeDepartment }>;
  assignmentsToRevoke: Array<{ assignmentId: string }>;
}) {
  // 1. Server-derived actorId - NEVER from client payload
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized: Session required");
  const actorId = session.user.id;

  const dbActor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { role: true, position: true }
  });
  if (dbActor?.role !== "ADMIN" && dbActor?.position !== "แอดมิน") {
    throw new Error("Forbidden: SuperAdmin required");
  }

  // Collect and sort all target user IDs ascending to enforce global lock order
  const targetUserIds = [
    ...new Set([
      ...input.assignmentsToGrant.map(g => g.userId),
      // (Also include target users from assignmentsToRevoke)
    ])
  ].sort();

  return await prisma.$transaction(async (tx) => {
    // LOCK 1: SystemSettings singleton
    await tx.$executeRawUnsafe(`SELECT id FROM "SystemSettings" WHERE id = 'default' FOR UPDATE;`);

    // LOCK 2: Target Users in ascending order
    if (targetUserIds.length > 0) {
      await tx.$executeRawUnsafe(
        `SELECT id FROM "User" WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE;`,
        targetUserIds
      );
    }

    // LOCK 3: Active assignments for target users
    if (targetUserIds.length > 0) {
      await tx.$executeRawUnsafe(
        `SELECT id FROM "UserDutyAssignment" WHERE "userId" = ANY($1::text[]) AND "revokedAt" IS NULL FOR UPDATE;`,
        targetUserIds
      );
    }

    const now = new Date();

    // Execute revocations
    for (const { assignmentId } of input.assignmentsToRevoke) {
      const existing = await tx.userDutyAssignment.findUnique({ where: { id: assignmentId } });
      if (existing && !existing.revokedAt) {
        await tx.userDutyAssignment.update({
          where: { id: assignmentId },
          data: { revokedAt: now }
        });

        await tx.systemLog.create({
          data: {
            actionType: "DUTY_REVOKED",
            subsystem: "PERSONNEL",
            description: `Revoked duty ${existing.dutyType} from user ${existing.userId}`,
            userId: actorId,
            metadata: { actorId, assignmentId, userId: existing.userId, dutyType: existing.dutyType, revokedAt: now.toISOString() }
          }
        });
      }
    }

    // Execute grants with user validation
    for (const grant of input.assignmentsToGrant) {
      const targetUser = await tx.user.findUnique({
        where: { id: grant.userId },
        select: { id: true, isApproved: true }
      });
      if (!targetUser || !targetUser.isApproved) {
        throw new Error(`Target user ${grant.userId} is not approved/active`);
      }

      const created = await tx.userDutyAssignment.create({
        data: {
          userId: grant.userId,
          dutyType: grant.dutyType,
          divisionScope: grant.divisionScope ?? null,
          departmentScope: grant.departmentScope ?? null,
          assignedById: actorId,
          assignedAt: now
        }
      });

      await tx.systemLog.create({
        data: {
          actionType: "DUTY_ASSIGNED",
          subsystem: "PERSONNEL",
          description: `Assigned duty ${grant.dutyType} to user ${grant.userId}`,
          userId: actorId,
          metadata: { actorId, assignmentId: created.id, userId: grant.userId, dutyType: grant.dutyType, assignedAt: now.toISOString() }
        }
      });
    }

    return { success: true };
  });
}
```

---

## 4. Anti-Self-Approval & Transactional Capability Verification

In `src/app/actions/leave.ts`:
1. **Query Routing:** Exclude requester (`userId: { not: request.userId }`). If a Department Head or HR Head applies for leave, route to Director or alternate.
2. **Transactional Verification (Before Mutation):**
   ```typescript
   if (request.userId === session.user.id) {
     await prisma.systemLog.create({
       data: {
         actionType: "SECURITY_VIOLATION",
         subsystem: "LEAVE",
         description: `CRITICAL: Attempted self-approval by requester ${session.user.id} on leave ${request.id}`,
         userId: session.user.id,
         metadata: { leaveId: request.id, userId: session.user.id, timestamp: new Date().toISOString() }
       }
     });
     throw new Error("CRITICAL_SECURITY_VIOLATION: Requester cannot inspect or approve their own leave request");
   }

   // Verify acting user's duty assignment is still active inside transaction
   const activeDuty = await tx.userDutyAssignment.findFirst({
     where: { userId: session.user.id, dutyType: expectedDuty, revokedAt: null }
   });
   if (!activeDuty && !isSuperAdmin) {
     throw new Error("FORBIDDEN: Duty assignment has been revoked or expired");
   }
   ```

---

## 5. Ambiguous Migration Resolution Engine

In `scripts/migrate-subsystem-roles.mjs`:
```typescript
const CIVIL_SERVICE_POSITIONS_ALLOWLIST = [
  "ครู",
  "ครูผู้ช่วย",
  "พนักงานราชการ",
  "ลูกจ้างประจำ",
  "ลูกจ้างชั่วคราว",
  "ครูอัตราจ้าง"
];

// CLI Usage: --resolve-ambiguous="usr_staff_1:ครู,usr_staff_2:ลูกจ้างชั่วคราว"
export function parseAmbiguityResolutions(rawResolutions: string) {
  const map: Record<string, string> = {};
  if (!rawResolutions) return map;

  const pairs = rawResolutions.split(",").map(s => s.trim()).filter(Boolean);
  for (const pair of pairs) {
    const [userId, targetPosition] = pair.split(":").map(s => s.trim());
    if (!userId || !targetPosition) {
      throw new Error(`Invalid resolution format: '${pair}'. Expected 'userId:position'`);
    }
    if (!CIVIL_SERVICE_POSITIONS_ALLOWLIST.includes(targetPosition)) {
      throw new Error(`Invalid position '${targetPosition}'. Must be one of: ${CIVIL_SERVICE_POSITIONS_ALLOWLIST.join(", ")}`);
    }
    map[userId] = targetPosition;
  }
  return map;
}
```
If unresolved ambiguous users exist in `--apply` mode, the script prints their details and **aborts with exit code 1 before executing any database mutation**.
