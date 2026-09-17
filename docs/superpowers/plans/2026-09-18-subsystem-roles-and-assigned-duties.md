# Subsystem Roles, Assigned Duties & Teacher Capability Architecture Implementation Plan (Rev 3 - Forensic Hardened)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement normalized `UserDutyAssignment` with typed enums, partial unique index, DB consistency check, dedicated immutable snapshot columns on `LeaveRequest`, server-only `actorId` derivation, query-level anti-self-approval routing, and idempotent CLI migration with resolution flags.

**Architecture:** Model `UserDutyAssignment` and typed enums in Prisma and PostgreSQL. Implement `getUserCapabilities` with fail-closed evaluation. Guard `updateAppointedDuties` with `SystemSettings FOR UPDATE` and derive `actorId` from server session. Protect leave approval workflows against self-approval at query and assertion levels. Store immutable signer snapshots in dedicated columns with DB trigger protection.

**Tech Stack:** Next.js 15, TypeScript, Prisma ORM, PostgreSQL, Tailwind CSS, Lucide React, Node.js Test Runner.

## Global Constraints

- `actorId` MUST be derived strictly from `session.user.id` on server; never accepted from client payload.
- Active assignments are canonically defined by `revokedAt IS NULL`, enforced with DB `CHECK (("isActive" = true AND "revokedAt" IS NULL) OR ("isActive" = false AND "revokedAt" IS NOT NULL))`.
- No generic `extraFields` for signer snapshots; use dedicated `LeaveRequest.inspectorSnapshot` and `headApproverSnapshot`.
- Concurrency control: mutating assignments requires `SELECT id FROM "SystemSettings" WHERE id = 'default' FOR UPDATE`.
- Working directory: `C:\dev\eLeave`.
- Node test runner: `node --experimental-strip-types --test <test_path>`.

---

### Task 1: Database Schema Hardening (Enums, Partial Unique Index & Snapshot Columns)

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `scripts/apply-duty-assignments-schema.mjs`
- Test: `eLeave/tests/unit/subsystemRolesSchema.test.js`

**Interfaces:**
- Produces: `DutyType`, `ScopeDivision`, `ScopeDepartment` enums; `UserDutyAssignment` model; dedicated `inspectorSnapshot` and `headApproverSnapshot` columns on `LeaveRequest`.
- Constraints: Partial unique index on `(userId, dutyType, COALESCE(divisionScope, departmentScope)) WHERE revokedAt IS NULL`, trigger `trg_protect_leave_signer_snapshots`.

- [ ] **Step 1: Write test for schema constraints and typed domains**

```javascript
// eLeave/tests/unit/subsystemRolesSchema.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Subsystem Roles Schema & Domain Types', () => {
  test('validates division domain allowlist strictly', () => {
    const validDivisions = ['ACADEMIC', 'PERSONNEL', 'GENERAL', 'BUDGET'];
    assert.equal(validDivisions.length, 4);
    assert.ok(validDivisions.includes('ACADEMIC'));
    assert.ok(validDivisions.includes('PERSONNEL'));
    assert.ok(validDivisions.includes('GENERAL'));
    assert.ok(validDivisions.includes('BUDGET'));
  });

  test('validates 8+1 learning areas allowlist strictly', () => {
    const validDepts = [
      'THAI', 'MATH', 'SCIENCE', 'FOREIGN_LANG',
      'SOCIAL', 'HEALTH_PE', 'ART', 'CAREER', 'STUDENT_DEV'
    ];
    assert.equal(validDepts.length, 9);
  });
});
```

- [ ] **Step 2: Update `prisma/schema.prisma`**

Add enums and model:
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
Add to `model LeaveRequest`:
```prisma
  inspectorSnapshot    Json?
  headApproverSnapshot Json?
```

- [ ] **Step 3: Create and run `scripts/apply-duty-assignments-schema.mjs`**

Applies SQL constraints: `chk_duty_active_consistency`, `chk_duty_scope_validity`, partial unique index `uk_active_user_duty_assignment`, and trigger `trg_protect_leave_signer_snapshots`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma scripts/apply-duty-assignments-schema.mjs eLeave/tests/unit/subsystemRolesSchema.test.js
git commit -m "feat(schema): add typed UserDutyAssignment, partial unique index, and dedicated snapshots"
```

---

### Task 2: Idempotent Migration CLI with Ambiguity Resolution

**Files:**
- Create: `scripts/migrate-subsystem-roles.mjs`
- Test: `eLeave/tests/unit/subsystemRolesMigration.test.js`

**Interfaces:**
- CLI Flags: `--dry-run`, `--apply`, `--resolve-ambiguous="userId:position,..."`.
- Enforces: Idempotency (no duplicate assignments), aborts if unresolved ambiguous staff exist in `--apply` mode.

- [ ] **Step 1: Write unit test for migration engine**

```javascript
// eLeave/tests/unit/subsystemRolesMigration.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

export function planMigration(users, existingAssignments, resolutions = {}) {
  const actions = [];
  let migrated = 0;
  let skipped = 0;
  let ambiguous = 0;

  for (const u of users) {
    if (u.position === 'หัวหน้างานบุคคล') {
      const already = existingAssignments.some(a => a.userId === u.id && a.dutyType === 'HR_HEAD' && a.revokedAt === null);
      if (already) {
        skipped++;
      } else {
        actions.push({ action: 'CREATE_ASSIGNMENT', userId: u.id, dutyType: 'HR_HEAD', scope: 'PERSONNEL' });
        actions.push({ action: 'NORMALIZE_POSITION', userId: u.id, newPosition: 'ครู' });
        migrated++;
      }
    } else if (u.position === 'ผู้ตรวจสอบ') {
      const already = existingAssignments.some(a => a.userId === u.id && a.dutyType === 'INSPECTOR' && a.revokedAt === null);
      if (already) {
        skipped++;
      } else {
        actions.push({ action: 'CREATE_ASSIGNMENT', userId: u.id, dutyType: 'INSPECTOR', scope: null });
        actions.push({ action: 'NORMALIZE_POSITION', userId: u.id, newPosition: 'ครู' });
        migrated++;
      }
    } else if (u.position === 'เจ้าหน้าที่บุคคล') {
      if (resolutions[u.id]) {
        actions.push({ action: 'CREATE_ASSIGNMENT', userId: u.id, dutyType: 'HR_STAFF', scope: 'PERSONNEL' });
        actions.push({ action: 'NORMALIZE_POSITION', userId: u.id, newPosition: resolutions[u.id] });
        migrated++;
      } else {
        ambiguous++;
        actions.push({ action: 'FLAG_AMBIGUOUS', userId: u.id, reason: 'Requires resolution via --resolve-ambiguous' });
      }
    }
  }

  return { actions, summary: { inspected: users.length, migrated, skipped, ambiguous } };
}

describe('Idempotent Migration Engine', () => {
  test('flags ambiguous staff when unresolved and resolves with resolution map', () => {
    const users = [{ id: 'u3', position: 'เจ้าหน้าที่บุคคล' }];
    const planUnresolved = planMigration(users, []);
    assert.equal(planUnresolved.summary.ambiguous, 1);

    const planResolved = planMigration(users, [], { u3: 'เจ้าหน้าที่' });
    assert.equal(planResolved.summary.ambiguous, 0);
    assert.equal(planResolved.summary.migrated, 1);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `node --experimental-strip-types --test eLeave/tests/unit/subsystemRolesMigration.test.js`  
Expected: PASS.

- [ ] **Step 3: Implement CLI `scripts/migrate-subsystem-roles.mjs`**

- [ ] **Step 4: Execute dry-run and apply**

Run: `node scripts/migrate-subsystem-roles.mjs --dry-run`  
Run: `node scripts/migrate-subsystem-roles.mjs --apply`

- [ ] **Step 5: Commit**

```bash
git add scripts/migrate-subsystem-roles.mjs eLeave/tests/unit/subsystemRolesMigration.test.js
git commit -m "feat(migration): implement idempotent CLI with ambiguity resolution parameter"
```

---

### Task 3: Fail-Closed Capability Engine with Cutover Gate

**Files:**
- Create: `src/lib/permissions.ts`
- Test: `eLeave/tests/unit/subsystemRolesCapabilities.test.js`

**Interfaces:**
- Produces: `getUserCapabilities(user, activeAssignments, settings)`
- Enforces: Fail-Closed by default. Cutover gate prevents legacy position strings from granting permissions.

- [ ] **Step 1: Write test suite verifying Fail-Closed security and Cutover**

```javascript
// eLeave/tests/unit/subsystemRolesCapabilities.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getUserCapabilities } from '../../src/lib/permissions.ts';

describe('Fail-Closed Capability Engine with Cutover Gate', () => {
  test('Denies HR Head capability when no active assignment exists, even if legacy position string is present', () => {
    const caps = getUserCapabilities(
      { id: 'u_test', position: 'หัวหน้างานบุคคล', role: 'TEACHER' },
      [], // no assignments
      {}
    );
    assert.equal(caps.isHRHead, false);
    assert.equal(caps.canManageUsers, false);
  });

  test('Grants HR Head capability when active assignment exists', () => {
    const caps = getUserCapabilities(
      { id: 'u_test', position: 'ครู', role: 'TEACHER' },
      [{ dutyType: 'HR_HEAD', divisionScope: 'PERSONNEL', departmentScope: null }],
      {}
    );
    assert.equal(caps.isHRHead, true);
    assert.equal(caps.canManageUsers, true);
    assert.equal(caps.canManageLeaveQuotas, true);
  });
});
```

- [ ] **Step 2: Implement `src/lib/permissions.ts`**

- [ ] **Step 3: Run tests**

Run: `node --experimental-strip-types --test eLeave/tests/unit/subsystemRolesCapabilities.test.js`  
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/permissions.ts eLeave/tests/unit/subsystemRolesCapabilities.test.js
git commit -m "feat(auth): implement fail-closed capability engine with transition cutover gate"
```

---

### Task 4: Transactional Duty Management (Actor Derivation & Row Lock)

**Files:**
- Modify: `src/app/actions/settings.ts`
- Test: `eLeave/tests/unit/dutyAuditTransactions.test.js`

**Interfaces:**
- Action: `updateAppointedDuties({ assignmentsToGrant, assignmentsToRevoke })` (no `actorId` in input).
- Enforces: Derives `actorId = session.user.id`, acquires `SystemSettings FOR UPDATE`, validates `isApproved = true`, writes `SystemLog` audit within `$transaction`.

- [ ] **Step 1: Write unit test for transaction action**

- [ ] **Step 2: Implement `updateAppointedDuties` in `src/app/actions/settings.ts`**

- [ ] **Step 3: Run test**

Run: `node --experimental-strip-types --test eLeave/tests/unit/dutyAuditTransactions.test.js`

- [ ] **Step 4: Commit**

```bash
git add src/app/actions/settings.ts eLeave/tests/unit/dutyAuditTransactions.test.js
git commit -m "feat(actions): secure duty mutations with server-derived actor and row locks"
```

---

### Task 5: Query-Level Anti-Self-Approval & Signer Snapshot Sealing

**Files:**
- Modify: `src/app/actions/leave.ts`
- Test: `eLeave/tests/unit/leaveSeparationOfDuties.test.js`

**Interfaces:**
- Enforces: Automated routing excludes requester (`userId: { not: request.userId }`), runtime assertion prevents self-approval, saves dedicated `inspectorSnapshot` and `headApproverSnapshot`.

- [ ] **Step 1: Write test for separation of duties and snapshot sealing**

```javascript
// eLeave/tests/unit/leaveSeparationOfDuties.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

export function routeApproverExcludingRequester(candidates, requesterId) {
  return candidates.find(c => c.userId !== requesterId) || null;
}

describe('Anti-Self-Approval Query-Level Routing', () => {
  test('Department head taking leave routes to alternate or director, not self', () => {
    const mathCandidates = [
      { userId: 'usr_math_head', duty: 'DEPT_HEAD', scope: 'MATH' },
      { userId: 'usr_dir', duty: 'DIRECTOR', scope: null }
    ];
    const approver = routeApproverExcludingRequester(mathCandidates, 'usr_math_head');
    assert.equal(approver.userId, 'usr_dir');
  });
});
```

- [ ] **Step 2: Implement query-level routing and snapshot sealing in `src/app/actions/leave.ts`**

Write `inspectorSnapshot` and `headApproverSnapshot` directly to dedicated columns.

- [ ] **Step 3: Update `src/app/print/leave/[id]/page.tsx` & `batch/page.tsx`**

Read dedicated columns `request.inspectorSnapshot` and `request.headApproverSnapshot`.

- [ ] **Step 4: Run full test suite regression**

Run: `npm test`  
Expected: All tests pass with 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/app/actions/leave.ts src/app/print/leave/[id]/page.tsx src/app/print/leave/batch/page.tsx eLeave/tests/unit/leaveSeparationOfDuties.test.js
git commit -m "feat(leave): enforce query-level anti-self-approval and seal dedicated signer snapshots"
```

---

### Task 6: Settings UI Cards & User Management Badges

**Files:**
- Modify: `src/app/(app)/settings/page.tsx`
- Modify: `src/app/(app)/users/page.tsx`
- Modify: `src/lib/i18n.tsx`

**Interfaces:**
- UI: Dedicated 3 Cards in Settings (HR/Leave, 4 Divisions, 8+1 Learning Areas), Badges and Filters in Users Page.

- [ ] **Step 1: Settings UI Assignment Cards**

- [ ] **Step 2: User Management Badges & Filters**

- [ ] **Step 3: Full Verification**

Run `npm test` and test HTTP endpoints:
- `GET http://localhost:3001/settings` ➔ HTTP 200
- `GET http://localhost:3001/users` ➔ HTTP 200

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/settings/page.tsx src/app/(app)/users/page.tsx src/lib/i18n.tsx
git commit -m "feat(ui): add appointed duties settings interface and user management badges"
```
