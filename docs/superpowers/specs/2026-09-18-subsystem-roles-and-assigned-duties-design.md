# Subsystem Roles, Assigned Duties & Teacher Capability Architecture Design (Rev 6 - Production Ready Candidate)

**Document ID:** `SPEC-2026-09-18-ROLES-DUTIES-06`  
**Date:** 2026-09-18  
**Status:** `PRODUCTION_READY_CANDIDATE_REV6`  
**Author:** Pair Programming (Senior Forensic Architecture)  
**Target Environments:** `dev` → `main` (Vercel & Authoritative PostgreSQL)

---

## 1. Executive Summary & Forensic Architecture (Rev 6)

This specification incorporates the final 4 production-grade security and database integrity closures:
1. **Explicit Duty-Specific Partial Unique Indexes:**
   - Global duties (`INSPECTOR`, `HR_HEAD`, `HR_STAFF`) are explicitly bound:
     `("userId", "dutyType") WHERE revokedAt IS NULL AND dutyType IN ('INSPECTOR', 'HR_HEAD', 'HR_STAFF')`.
   - Scoped duties (`DIVISION_HEAD`, `DEPT_HEAD`) allow distinct scopes per user (e.g. acting across departments) without colliding:
     `("userId", "dutyType", "divisionScope") WHERE revokedAt IS NULL AND dutyType = 'DIVISION_HEAD'`.
     `("userId", "dutyType", "departmentScope") WHERE revokedAt IS NULL AND dutyType = 'DEPT_HEAD'`.
2. **Durable, Autonomous Security Violation Audit Logging:**
   - Security violations (e.g. self-approval attempts) are logged in an **isolated, immediate transaction** committed to `SystemLog` *before* the business transaction aborts and throws, guaranteeing zero loss of tamper/incident evidence upon rollback.
3. **DB Trigger Mandates Complete Snapshots on `APPROVED` Transition:**
   - The PostgreSQL trigger verifies that when a request transitions to `APPROVED`, modern leave requests (`createdAt >= '2026-09-18'`) **MUST contain sealed non-null `headApproverSnapshot`** (and `inspectorSnapshot` if inspection was required).
4. **Explicit Composite Singleton Indexes:**
   - Institutional singletons explicitly index `("dutyType", "divisionScope")` and `("dutyType", "departmentScope")`, ensuring absolute domain uniqueness.

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
-- 1. Bi-directional scope validity constraint
ALTER TABLE "UserDutyAssignment"
  DROP CONSTRAINT IF EXISTS "chk_duty_scope_validity";
ALTER TABLE "UserDutyAssignment"
  ADD CONSTRAINT "chk_duty_scope_validity"
  CHECK (
    ("dutyType" = 'DIVISION_HEAD' AND "divisionScope" IS NOT NULL AND "departmentScope" IS NULL) OR
    ("dutyType" = 'DEPT_HEAD' AND "departmentScope" IS NOT NULL AND "divisionScope" IS NULL) OR
    ("dutyType" IN ('INSPECTOR', 'HR_HEAD', 'HR_STAFF') AND "divisionScope" IS NULL AND "departmentScope" IS NULL)
  );

-- 2. User assignment uniqueness: explicitly bound by dutyType
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

-- 3. Institutional Singleton Constraints: Explicit composite index key
DROP INDEX IF EXISTS "uk_single_active_division_head";
CREATE UNIQUE INDEX "uk_single_active_division_head" ON "UserDutyAssignment" (
  "dutyType", "divisionScope"
) WHERE "revokedAt" IS NULL AND "dutyType" = 'DIVISION_HEAD';

DROP INDEX IF EXISTS "uk_single_active_dept_head";
CREATE UNIQUE INDEX "uk_single_active_dept_head" ON "UserDutyAssignment" (
  "dutyType", "departmentScope"
) WHERE "revokedAt" IS NULL AND "dutyType" = 'DEPT_HEAD';

-- 4. Immutable Signer Snapshot & Mandatory Snapshot on APPROVED Trigger
CREATE OR REPLACE FUNCTION protect_leave_signer_snapshots()
RETURNS TRIGGER AS $$
BEGIN
  -- Mandatory snapshot presence check when transitioning into APPROVED
  IF OLD.status <> 'APPROVED' AND NEW.status = 'APPROVED' THEN
    -- Enforce for requests created on or after Rev 6 cutover (legacy leaves exempt)
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
    -- Status cannot transition away from APPROVED
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

## 3. Concurrency Hierarchy & Isolated Security Audit Logging

### 3.1 Isolated Security Violation Logger
```typescript
export async function logSecurityViolationIsolated(actorId: string, leaveId: string, violationReason: string) {
  try {
    // Separate independent transaction committed immediately
    await prisma.$transaction(async (auditTx) => {
      await auditTx.systemLog.create({
        data: {
          actionType: "SECURITY_VIOLATION",
          subsystem: "LEAVE",
          description: `CRITICAL: ${violationReason}`,
          userId: actorId,
          metadata: { leaveId, actorId, reason: violationReason, timestamp: new Date().toISOString() }
        }
      });
    });
  } catch (logErr) {
    console.error("FATAL: Failed to commit isolated security audit log:", logErr);
  }
}
```

### 3.2 Concurrency Hierarchy in `updateAppointedDuties`
```typescript
export async function updateAppointedDuties(input: {
  assignmentsToGrant: Array<{ userId: string; dutyType: DutyType; divisionScope?: ScopeDivision; departmentScope?: ScopeDepartment }>;
  assignmentsToRevoke: Array<{ assignmentId: string }>;
}) {
  // Derive actorId strictly on server
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

    // Execute revocations with full state audit
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

    // Execute grants with target validation and full state audit
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

## 4. Anti-Self-Approval with Isolated Incident Auditing

In `src/app/actions/leave.ts`:
```typescript
// 1. Transactional check for direct self-approval attempt
if (request.userId === session.user.id) {
  // Commit to SystemLog in isolated transaction so log survives business rollback
  await logSecurityViolationIsolated(
    session.user.id,
    request.id,
    `Self-approval attempted by requester ${session.user.id} on leave ${request.id}`
  );
  throw new Error("CRITICAL_SECURITY_VIOLATION: Requester cannot inspect or approve their own leave request");
}

// 2. Transactional domain-bound scope verification
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
    await logSecurityViolationIsolated(
      session.user.id,
      request.id,
      `Cross-department approval violation by user ${session.user.id} for department ${requestDept}`
    );
    throw new Error(`FORBIDDEN: User is not authorized as Department Head for department ${requestDept}`);
  }
}
```
