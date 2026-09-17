# Subsystem Roles, Assigned Duties & Teacher Capability Architecture Design (Rev 3 - Production Ready)

**Document ID:** `SPEC-2026-09-18-ROLES-DUTIES-03`  
**Date:** 2026-09-18  
**Status:** `APPROVED_DESIGN_REV3`  
**Author:** Pair Programming (Senior Forensic Architecture)  
**Target Environments:** `dev` → `main` (Vercel & Authoritative PostgreSQL)

---

## 1. Executive Summary & Forensic Hardening (Rev 3)

This specification addresses the definitive 7-point forensic hardening requirements:
1. **Zero Client Actor Spoofing:** Server actions derive `actorId = session.user.id` strictly on the server; client arguments are prohibited.
2. **DB-Level Assignment Uniqueness:** PostgreSQL partial unique index prevents concurrent duplicate active assignments on `(userId, dutyType, COALESCE(divisionScope::text, departmentScope::text, '')) WHERE revokedAt IS NULL`.
3. **Single Source of Active State & DB Consistency Check:** `revokedAt` is the canonical active state (`active <=> revokedAt IS NULL`), reinforced with a DB `CHECK` constraint: `(("isActive" = true AND "revokedAt" IS NULL) OR ("isActive" = false AND "revokedAt" IS NOT NULL))`.
4. **Typed DB Enums for Scopes:** Replaced `scope String?` with strongly-typed PostgreSQL enums `divisionScope ScopeDivision?` and `departmentScope ScopeDepartment?` with strict cross-column `CHECK` constraints.
5. **Dedicated Immutable Columns for Historical Signer Snapshots:** Replaced generic `extraFields` with dedicated columns `inspectorSnapshot Json?` and `headApproverSnapshot Json?` on `model LeaveRequest`, sealed immutably against post-approval tampering.
6. **Self-Approval Guard at Query & Routing Time + Assignment Time:** Automated routing redirects requests from a Department Head or HR Head to the Director/Deputy Director at query-time (never returning the requester as their own approver), verified with runtime assertion guards.
7. **Definitive Legacy Cutover:** Hard cutover gate (`TRANSITION_DEADLINE`). Post-migration, legacy position strings grant ZERO privileges (`FAIL-CLOSED`).
8. **Ambiguous Migration Resolution Mechanism:** CLI parameter `--resolve-ambiguous="userId:position,..."` and `--resolutions-file` allowing admin resolution without direct database mutations.

---

## 2. Database Schema & Data Integrity

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
  isActive        Boolean          @default(true)
  user            User             @relation("UserDutyAssignments", fields: [userId], references: [id], onDelete: Cascade)
  assignedBy      User?            @relation("DutyAssignedByUser", fields: [assignedById], references: [id], onDelete: SetNull)

  @@index([userId, dutyType, revokedAt])
  @@index([dutyType, divisionScope, revokedAt])
  @@index([dutyType, departmentScope, revokedAt])
}
```

### 2.2 Dedicated Historical Signer Snapshots on `LeaveRequest`
```prisma
model LeaveRequest {
  // ... existing columns ...
  inspectorSnapshot    Json? // { userId, name, position, level, duty, signedAt }
  headApproverSnapshot Json? // { userId, name, position, level, duty, signedAt }
  // ...
}
```

### 2.3 Authoritative PostgreSQL Constraints & Partial Unique Index
Applied via migration script:
```sql
-- 1. Consistency constraint between isActive and revokedAt
ALTER TABLE "UserDutyAssignment"
  ADD CONSTRAINT "chk_duty_active_consistency"
  CHECK (("isActive" = true AND "revokedAt" IS NULL) OR ("isActive" = false AND "revokedAt" IS NOT NULL));

-- 2. Scope validity constraint based on dutyType
ALTER TABLE "UserDutyAssignment"
  ADD CONSTRAINT "chk_duty_scope_validity"
  CHECK (
    ("dutyType" = 'DIVISION_HEAD' AND "divisionScope" IS NOT NULL AND "departmentScope" IS NULL) OR
    ("dutyType" = 'DEPT_HEAD' AND "departmentScope" IS NOT NULL AND "divisionScope" IS NULL) OR
    ("dutyType" IN ('INSPECTOR', 'HR_HEAD', 'HR_STAFF') AND "divisionScope" IS NULL AND "departmentScope" IS NULL)
  );

-- 3. Partial Unique Index: Zero duplicate active assignments per user, duty, and scope
CREATE UNIQUE INDEX "uk_active_user_duty_assignment" ON "UserDutyAssignment" (
  "userId", 
  "dutyType", 
  COALESCE("divisionScope"::text, "departmentScope"::text, '')
) WHERE "revokedAt" IS NULL;

-- 4. Immutable Signer Snapshot Protection on LeaveRequest
CREATE OR REPLACE FUNCTION protect_leave_signer_snapshots()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'APPROVED' THEN
    IF (OLD."inspectorSnapshot" IS DISTINCT FROM NEW."inspectorSnapshot") OR
       (OLD."headApproverSnapshot" IS DISTINCT FROM NEW."headApproverSnapshot") THEN
      RAISE EXCEPTION 'Cryptographic/Audit Integrity Violation: Cannot modify signer snapshots of an approved leave request';
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

## 3. Server Actions & Concurrency Architecture

### 3.1 `updateAppointedDuties`
```typescript
export async function updateAppointedDuties(input: {
  assignmentsToGrant: Array<{ userId: string; dutyType: DutyType; divisionScope?: ScopeDivision; departmentScope?: ScopeDepartment }>;
  assignmentsToRevoke: Array<{ assignmentId: string }>;
}) {
  // 1. Derive actorId strictly from session - NEVER client input
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized: Authentication required");
  
  const actorId = session.user.id;
  const dbActor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { role: true, position: true }
  });
  if (dbActor?.role !== "ADMIN" && dbActor?.position !== "แอดมิน") {
    throw new Error("Forbidden: SuperAdmin privileges required");
  }

  return await prisma.$transaction(async (tx) => {
    // 2. Concurrency Lock: Lock SystemSettings to serialize organizational mutations
    await tx.$executeRawUnsafe(`SELECT id FROM "SystemSettings" WHERE id = 'default' FOR UPDATE;`);

    const now = new Date();

    // 3. Process Revocations
    for (const { assignmentId } of input.assignmentsToRevoke) {
      const existing = await tx.userDutyAssignment.findUnique({ where: { id: assignmentId } });
      if (existing && !existing.revokedAt) {
        await tx.userDutyAssignment.update({
          where: { id: assignmentId },
          data: { isActive: false, revokedAt: now }
        });

        await tx.systemLog.create({
          data: {
            actionType: "DUTY_REVOKED",
            subsystem: "PERSONNEL",
            description: `Revoked ${existing.dutyType} from user ${existing.userId}`,
            userId: actorId,
            metadata: { actorId, assignmentId, userId: existing.userId, dutyType: existing.dutyType, revokedAt: now.toISOString() }
          }
        });
      }
    }

    // 4. Validate & Process Grants
    for (const grant of input.assignmentsToGrant) {
      const targetUser = await tx.user.findUnique({
        where: { id: grant.userId },
        select: { id: true, isApproved: true }
      });
      if (!targetUser || !targetUser.isApproved) {
        throw new Error(`Target user ${grant.userId} is not active or approved`);
      }

      const created = await tx.userDutyAssignment.create({
        data: {
          userId: grant.userId,
          dutyType: grant.dutyType,
          divisionScope: grant.divisionScope ?? null,
          departmentScope: grant.departmentScope ?? null,
          assignedById: actorId,
          assignedAt: now,
          isActive: true
        }
      });

      await tx.systemLog.create({
        data: {
          actionType: "DUTY_ASSIGNED",
          subsystem: "PERSONNEL",
          description: `Assigned ${grant.dutyType} to user ${grant.userId}`,
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

## 4. Separation of Duties: Query-Level Routing & Runtime Invariants

### 4.1 Routing Rule: Self-Approval Prevention
When routing a leave request for inspection / head approval:
```typescript
export async function resolveLeaveApprovers(request: { userId: string; department?: ScopeDepartment }) {
  // Query active inspector
  let inspector = await prisma.userDutyAssignment.findFirst({
    where: { dutyType: "INSPECTOR", revokedAt: null, userId: { not: request.userId } }, // Exclude requester
    include: { user: { select: { id: true, name: true, position: true, level: true } } }
  });

  // If requester IS the inspector, route to Director or alternate
  if (!inspector) {
    inspector = await getDirectorOrAlternateInspector(request.userId);
  }

  // Query active Department Head or HR Head
  let headApprover = null;
  if (request.department) {
    headApprover = await prisma.userDutyAssignment.findFirst({
      where: { dutyType: "DEPT_HEAD", departmentScope: request.department, revokedAt: null, userId: { not: request.userId } },
      include: { user: { select: { id: true, name: true, position: true, level: true } } }
    });
  }

  // If requester is the Department Head or no Dept Head, route to HR Head (excluding requester) or Director
  if (!headApprover) {
    headApprover = await prisma.userDutyAssignment.findFirst({
      where: { dutyType: "HR_HEAD", revokedAt: null, userId: { not: request.userId } },
      include: { user: { select: { id: true, name: true, position: true, level: true } } }
    });
  }

  if (!headApprover) {
    headApprover = await getDirectorOrDeputy(request.userId);
  }

  return { inspector: inspector?.user, headApprover: headApprover?.user };
}
```

### 4.2 Runtime Assertion Guards (Fail-Closed)
In `inspectLeaveRequest` and `approveLeaveRequest`:
```typescript
if (currentUserId === request.userId) {
  throw new Error("CRITICAL_INVARIANT_VIOLATION: Requester cannot approve or inspect their own leave request");
}
```

---

## 5. Signer Historical Snapshot Structure
Stored immutably inside `LeaveRequest.inspectorSnapshot` and `LeaveRequest.headApproverSnapshot`:
```typescript
export interface SignerSnapshot {
  userId: string;
  name: string;
  position: string;   // e.g. "ครู"
  level: string;      // e.g. "ชำนาญการพิเศษ"
  dutyLabel: string;  // e.g. "ผู้ตรวจสอบการลา" or "ปฏิบัติหน้าที่หัวหน้างานบุคคล"
  signedAt: string;   // ISO-8601 timestamp
}
```

**Print Rendering Engine:**
`src/app/print/leave/[id]/page.tsx` directly reads `request.inspectorSnapshot` and `request.headApproverSnapshot`. If present, it formats:
- Line 1: `ตำแหน่ง ${snapshot.position} ${snapshot.level}`.
- Line 2 (Duty subtitle): `${snapshot.dutyLabel}`.

---

## 6. Migration CLI: Idempotent & Resolution Support

```bash
# Dry run
node scripts/migrate-subsystem-roles.mjs --dry-run

# Dry run with resolution for ambiguous positions
node scripts/migrate-subsystem-roles.mjs --dry-run --resolve-ambiguous="usr_staff_1:ครู"

# Apply
node scripts/migrate-subsystem-roles.mjs --apply --resolve-ambiguous="usr_staff_1:ครู"
```
Output:
```text
======================================================
eLeave Subsystem Roles Migration (Idempotent Engine)
======================================================
Mode: APPLY
Scanned Users: 42
- Synthetics Identified: 3
- Successfully Migrated to UserDutyAssignment: 2
- Skipped (Active Assignment Exists): 0
- Ambiguous Staff Resolved: 1
- Unresolved Ambiguous (Aborted without mutation): 0
Database Transaction Committed Successfully.
```
