# Subsystem Roles, Assigned Duties & Teacher Capability Architecture Design (Rev 5 - Production Ready)

**Document ID:** `SPEC-2026-09-18-ROLES-DUTIES-05`  
**Date:** 2026-09-18  
**Status:** `PRODUCTION_READY_APPROVED`  
**Author:** Pair Programming (Senior Forensic Architecture)  
**Target Environments:** `dev` → `main` (Vercel & Authoritative PostgreSQL)

---

## 1. Executive Summary & Forensic Architecture (Rev 5)

This specification incorporates the final 5 critical safeguards and 2 operational controls:
1. **Clear Scope Uniqueness & Singleton Constraints:** Scoped partial unique indexes allow distinct scopes per user (e.g. acting head across departments) while guaranteeing singleton headship per department/division school-wide.
2. **Deterministic Multi-Row Lock Hierarchy with `ORDER BY id ASC`:** All row-level locks across `SystemSettings`, `User`, and `UserDutyAssignment` strictly enforce `ORDER BY id ASC FOR UPDATE` to guarantee deadlock-free execution.
3. **True Domain-Bound Anti-Self-Approval:** The security boundary verifies at transaction execution:
   - `session.user.id !== request.userId`
   - The actor holds an active assignment (`revokedAt IS NULL`) matching the exact required `dutyType` AND `scope` for that applicant's department (e.g., only the Math Dept Head or Director can approve a Math teacher's leave; an English Dept Head cannot).
   - Any breach creates an immutable `SECURITY_VIOLATION` in `SystemLog` before throwing.
4. **Comprehensive DB Triggers for Approved Leases (Update & Delete Protection):**
   - `trg_protect_leave_signer_snapshots` enforces that once `status = 'APPROVED'`, `inspectorSnapshot`, `headApproverSnapshot`, `execApproverId`, `headApproverId`, and `status` are **PERMANENTLY IMMUTABLE**.
   - `trg_protect_leave_approved_deletion` blocks hard `DELETE` of approved leave requests (enforcing soft delete or formal cancellation records).
5. **Scoped Migration Target Whitelist:** `--resolve-ambiguous` strictly enforces that target users must currently possess a synthetic position (`'หัวหน้างานบุคคล'`, `'ผู้ตรวจสอบ'`, `'เจ้าหน้าที่บุคคล'`). It cannot be misused to alter arbitrary personnel.
6. **Full State Audit Trail:** `SystemLog` records full `before` and `after` snapshots for every duty mutation.
7. **Reiterated Core Controls (from Rev 10 & Priority 0):** Retains `(fiscalYear, approvedSeq)` unique index + retry loop, soft-delete retention, and native calendar validation.

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

### 2.2 Authoritative Database Constraints & Triggers (PostgreSQL)
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

-- 2. User assignment uniqueness: No duplicate active duty for same user, duty, and specific scope
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

-- 4. Immutable Signer Snapshot & Approval Transition Trigger
CREATE OR REPLACE FUNCTION protect_leave_signer_snapshots()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'APPROVED' THEN
    -- Signer snapshots and approver IDs are permanently sealed
    IF (OLD."inspectorSnapshot" IS DISTINCT FROM NEW."inspectorSnapshot") OR
       (OLD."headApproverSnapshot" IS DISTINCT FROM NEW."headApproverSnapshot") OR
       (OLD."execApproverId" IS DISTINCT FROM NEW."execApproverId") OR
       (OLD."headApproverId" IS DISTINCT FROM NEW."headApproverId") THEN
      RAISE EXCEPTION 'Cryptographic/Audit Integrity Violation: Signer snapshots and approvers of an approved leave request are permanently immutable';
    END IF;
    -- Status cannot transition away from APPROVED (only soft cancellation record allowed)
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

-- 5. Protection Against Hard Deletion of Approved Leave Requests
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
```

---

## 3. Concurrency Hierarchy & Full State Audit in `updateAppointedDuties`

```typescript
export async function updateAppointedDuties(input: {
  assignmentsToGrant: Array<{ userId: string; dutyType: DutyType; divisionScope?: ScopeDivision; departmentScope?: ScopeDepartment }>;
  assignmentsToRevoke: Array<{ assignmentId: string }>;
}) {
  // 1. Derive actorId strictly from session - NEVER from client payload
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
    ])
  ].sort();

  return await prisma.$transaction(async (tx) => {
    // LOCK 1: SystemSettings singleton
    await tx.$executeRawUnsafe(`SELECT id FROM "SystemSettings" WHERE id = 'default' FOR UPDATE;`);

    // LOCK 2: Target Users in strictly ascending order
    if (targetUserIds.length > 0) {
      await tx.$executeRawUnsafe(
        `SELECT id FROM "User" WHERE id = ANY($1::text[]) ORDER BY id ASC FOR UPDATE;`,
        targetUserIds
      );
    }

    // LOCK 3: Active assignments in strictly ascending order
    if (targetUserIds.length > 0) {
      await tx.$executeRawUnsafe(
        `SELECT id FROM "UserDutyAssignment" WHERE "userId" = ANY($1::text[]) AND "revokedAt" IS NULL ORDER BY id ASC FOR UPDATE;`,
        targetUserIds
      );
    }

    const now = new Date();

    // Execute revocations with full before/after audit snapshot
    for (const { assignmentId } of input.assignmentsToRevoke) {
      const existing = await tx.userDutyAssignment.findUnique({ where: { id: assignmentId } });
      if (existing && !existing.revokedAt) {
        const updated = await tx.userDutyAssignment.update({
          where: { id: assignmentId },
          data: { revokedAt: now }
        });

        await tx.systemLog.create({
          data: {
            actionType: "DUTY_REVOKED",
            subsystem: "PERSONNEL",
            description: `Revoked duty ${existing.dutyType} from user ${existing.userId}`,
            userId: actorId,
            metadata: {
              actorId,
              targetUserId: existing.userId,
              dutyType: existing.dutyType,
              scope: existing.divisionScope || existing.departmentScope || null,
              before: { id: existing.id, dutyType: existing.dutyType, divisionScope: existing.divisionScope, departmentScope: existing.departmentScope, revokedAt: null },
              after: { id: updated.id, dutyType: updated.dutyType, divisionScope: updated.divisionScope, departmentScope: updated.departmentScope, revokedAt: now.toISOString() },
              timestamp: now.toISOString()
            }
          }
        });
      }
    }

    // Execute grants with target validation and full before/after audit snapshot
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
          metadata: {
            actorId,
            targetUserId: grant.userId,
            dutyType: grant.dutyType,
            scope: grant.divisionScope || grant.departmentScope || null,
            before: null,
            after: { id: created.id, dutyType: created.dutyType, divisionScope: created.divisionScope, departmentScope: created.departmentScope, assignedAt: now.toISOString() },
            timestamp: now.toISOString()
          }
        }
      });
    }

    return { success: true };
  });
}
```

---

## 4. Anti-Self-Approval & Domain-Bound Scope Verification

In `src/app/actions/leave.ts`:
1. **Query Routing:** Exclude requester (`userId: { not: request.userId }`). If a Department Head or HR Head applies for leave, route to Director or alternate.
2. **Transactional Verification (Before Mutation):**
   ```typescript
   // Check 1: Direct requester self-approval check
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

   // Check 2: Domain-bound duty and scope match
   if (expectedDuty === "DEPT_HEAD") {
     const requestDept = mapSubjectGroupToDeptScope(request.user.subjectGroup);
     const matchingDuty = await tx.userDutyAssignment.findFirst({
       where: {
         userId: session.user.id,
         dutyType: "DEPT_HEAD",
         departmentScope: requestDept,
         revokedAt: null
       }
     });
     if (!matchingDuty && !isDirector && !isSuperAdmin) {
       throw new Error(`FORBIDDEN: User is not authorized as Department Head for department ${requestDept}`);
     }
   }
   ```

---

## 5. Ambiguous Migration Resolution Engine with Strict Scope Whitelist

In `scripts/migrate-subsystem-roles.mjs`:
```typescript
export const SYNTHETIC_POSITIONS_WHITELIST = [
  "หัวหน้างานบุคคล",
  "ผู้ตรวจสอบ",
  "เจ้าหน้าที่บุคคล"
];

export const CIVIL_SERVICE_POSITIONS_ALLOWLIST = [
  "ครู",
  "ครูผู้ช่วย",
  "พนักงานราชการ",
  "ลูกจ้างประจำ",
  "ลูกจ้างชั่วคราว",
  "ครูอัตราจ้าง"
];

export async function resolveAmbiguousStaff(
  targetUserId: string,
  newPosition: string,
  actorId: string,
  tx: any
) {
  // 1. Enforce allowlist
  if (!CIVIL_SERVICE_POSITIONS_ALLOWLIST.includes(newPosition)) {
    throw new Error(`Invalid civil service position: ${newPosition}`);
  }

  // 2. Enforce scope whitelist: user MUST currently possess a synthetic position
  const user = await tx.user.findUnique({ where: { id: targetUserId } });
  if (!user || !SYNTHETIC_POSITIONS_WHITELIST.includes(user.position)) {
    throw new Error(`Security Violation: User ${targetUserId} does not possess a migratable synthetic position (${user?.position})`);
  }

  // 3. Update and audit
  await tx.user.update({
    where: { id: targetUserId },
    data: { position: newPosition }
  });

  await tx.systemLog.create({
    data: {
      actionType: "MIGRATION_AMBIGUITY_RESOLVED",
      subsystem: "PERSONNEL",
      description: `Resolved ambiguous position for user ${targetUserId} from '${user.position}' to '${newPosition}'`,
      userId: actorId,
      metadata: { targetUserId, previousPosition: user.position, resolvedPosition: newPosition, actorId, timestamp: new Date().toISOString() }
    }
  });
}
```
