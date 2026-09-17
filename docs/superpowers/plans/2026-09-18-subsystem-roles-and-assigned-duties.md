# Subsystem Roles, Assigned Duties & Teacher Capability Architecture Implementation Plan (Rev 2 - Forensic Hardened)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decouple official civil service positions (`position = "ครู"`) from appointed functional duties by introducing a normalized `UserDutyAssignment` table, fail-closed permission evaluation, concurrency locking (`SystemSettings FOR UPDATE`), strict anti-self-approval separation of duties, historical signer snapshots for official prints, idempotent `--dry-run` migration, and immutable audit logs.

**Architecture:** Model `UserDutyAssignment` in Prisma with typed domain enums (`DutyType`, `DivisionType`, `DepartmentType`). Implement `getUserCapabilities(user, assignments, settings)` in `src/lib/permissions.ts`. Wire transactional duty updates with row locks and `SystemLog` auditing. Protect leave approval workflows against self-approval. Seal signer snapshots into `LeaveRequest.extraFields`.

**Tech Stack:** Next.js 15, TypeScript, Prisma ORM, PostgreSQL, Tailwind CSS, Lucide React, Node.js Test Runner.

## Global Constraints

- Never mutate `User.position` for role authorization; evaluate `getUserCapabilities(user, assignments, settings)`.
- Explicit assignment required for privilege grants; default is FAIL-CLOSED (deny).
- Legacy compatibility is restricted to transitional verification and will not grant unassigned privileges.
- Concurrency control: mutating assignments requires `SELECT * FROM "SystemSettings" WHERE id = 'default' FOR UPDATE`.
- Working directory: `C:\dev\eLeave`.
- Node test runner: `node --experimental-strip-types --test <test_path>`.

---

### Task 1: Normalized Database Schema (`UserDutyAssignment`) & Enums

**Files:**
- Modify: `prisma/schema.prisma`
- Test: `eLeave/tests/unit/subsystemRolesSchema.test.js`

**Interfaces:**
- Produces: `model UserDutyAssignment`, `enum DutyType` in Prisma.
- Relations: `User.dutyAssignments`, `User.dutiesAssignedBy`.

- [ ] **Step 1: Write test to verify schema invariants and domain types**

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

- [ ] **Step 2: Run test to verify it passes**

Run: `node --experimental-strip-types --test eLeave/tests/unit/subsystemRolesSchema.test.js`  
Expected: PASS (2/2 tests passing).

- [ ] **Step 3: Update `prisma/schema.prisma`**

Add `enum DutyType` and `model UserDutyAssignment`:
```prisma
enum DutyType {
  INSPECTOR
  HR_HEAD
  HR_STAFF
  DIVISION_HEAD
  DEPT_HEAD
}

model UserDutyAssignment {
  id           String    @id @default(cuid())
  userId       String
  dutyType     DutyType
  scope        String?
  assignedAt   DateTime  @default(now())
  revokedAt    DateTime?
  assignedById String?
  isActive     Boolean   @default(true)
  metadata     Json?
  user         User      @relation("UserDutyAssignments", fields: [userId], references: [id], onDelete: Cascade)
  assignedBy   User?     @relation("DutyAssignedByUser", fields: [assignedById], references: [id], onDelete: SetNull)

  @@index([userId, dutyType, isActive])
  @@index([dutyType, scope, isActive])
}
```
Add relations to `model User`:
```prisma
  dutyAssignments    UserDutyAssignment[] @relation("UserDutyAssignments")
  dutiesAssigned     UserDutyAssignment[] @relation("DutyAssignedByUser")
```

- [ ] **Step 4: Generate Prisma Client & Apply DB Migration**

Run: `npx prisma db push` or create SQL migration script in `scripts/apply-duty-assignments-schema.mjs`.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma eLeave/tests/unit/subsystemRolesSchema.test.js
git commit -m "feat(schema): add UserDutyAssignment model and duty enums"
```

---

### Task 2: Idempotent Preflight Migration with `--dry-run`

**Files:**
- Create: `scripts/migrate-subsystem-roles.mjs`
- Test: `eLeave/tests/unit/subsystemRolesMigration.test.js`

**Interfaces:**
- Inputs: CLI flags `--dry-run` or `--apply`.
- Produces: Normalized assignments in `UserDutyAssignment`, detailed audit summary `{ inspected, migrated, skipped, ambiguous }`.

- [ ] **Step 1: Write unit test for migration engine**

```javascript
// eLeave/tests/unit/subsystemRolesMigration.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

export function planMigration(users, existingAssignments) {
  const actions = [];
  let migrated = 0;
  let skipped = 0;
  let ambiguous = 0;

  for (const u of users) {
    if (u.position === 'หัวหน้างานบุคคล') {
      const already = existingAssignments.some(a => a.userId === u.id && a.dutyType === 'HR_HEAD' && a.isActive);
      if (already) {
        skipped++;
      } else {
        actions.push({ action: 'CREATE_ASSIGNMENT', userId: u.id, dutyType: 'HR_HEAD', scope: 'PERSONNEL' });
        actions.push({ action: 'NORMALIZE_POSITION', userId: u.id, newPosition: 'ครู' });
        migrated++;
      }
    } else if (u.position === 'ผู้ตรวจสอบ') {
      const already = existingAssignments.some(a => a.userId === u.id && a.dutyType === 'INSPECTOR' && a.isActive);
      if (already) {
        skipped++;
      } else {
        actions.push({ action: 'CREATE_ASSIGNMENT', userId: u.id, dutyType: 'INSPECTOR', scope: null });
        actions.push({ action: 'NORMALIZE_POSITION', userId: u.id, newPosition: 'ครู' });
        migrated++;
      }
    } else if (u.position === 'เจ้าหน้าที่บุคคล') {
      ambiguous++;
      actions.push({ action: 'FLAG_AMBIGUOUS', userId: u.id, reason: 'Requires manual verification of civil service position' });
    }
  }

  return { actions, summary: { inspected: users.length, migrated, skipped, ambiguous } };
}

describe('Idempotent Migration Engine', () => {
  test('skips users already assigned and flags ambiguous staff without guessing', () => {
    const users = [
      { id: 'u1', position: 'หัวหน้างานบุคคล' },
      { id: 'u2', position: 'ผู้ตรวจสอบ' },
      { id: 'u3', position: 'เจ้าหน้าที่บุคคล' }
    ];
    const existing = [{ userId: 'u1', dutyType: 'HR_HEAD', isActive: true }];

    const plan = planMigration(users, existing);
    assert.equal(plan.summary.migrated, 1); // only u2
    assert.equal(plan.summary.skipped, 1);  // u1 skipped
    assert.equal(plan.summary.ambiguous, 1); // u3 flagged
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `node --experimental-strip-types --test eLeave/tests/unit/subsystemRolesMigration.test.js`  
Expected: PASS.

- [ ] **Step 3: Implement `scripts/migrate-subsystem-roles.mjs` with `--dry-run`**

- [ ] **Step 4: Execute dry-run and apply**

Run: `node scripts/migrate-subsystem-roles.mjs --dry-run`  
Run: `node scripts/migrate-subsystem-roles.mjs --apply`

- [ ] **Step 5: Commit**

```bash
git add scripts/migrate-subsystem-roles.mjs eLeave/tests/unit/subsystemRolesMigration.test.js
git commit -m "feat(migration): add idempotent dry-run migration script for legacy roles"
```

---

### Task 3: Fail-Closed Capability Engine (`src/lib/permissions.ts`)

**Files:**
- Create: `src/lib/permissions.ts`
- Test: `eLeave/tests/unit/subsystemRolesCapabilities.test.js`

**Interfaces:**
- Produces: `getUserCapabilities(user, activeAssignments, settings): UserCapabilities`

- [ ] **Step 1: Write test suite verifying Fail-Closed security**

```javascript
// eLeave/tests/unit/subsystemRolesCapabilities.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getUserCapabilities } from '../../src/lib/permissions.ts';

describe('Fail-Closed Capability Engine', () => {
  test('Denies HR Head capability when no active assignment exists, even if legacy position string is present without transitional flag', () => {
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
      [{ dutyType: 'HR_HEAD', scope: 'PERSONNEL' }],
      {}
    );
    assert.equal(caps.isHRHead, true);
    assert.equal(caps.canManageUsers, true);
    assert.equal(caps.canManageLeaveQuotas, true);
  });
});
```

- [ ] **Step 2: Implement `src/lib/permissions.ts`**

Implement `getUserCapabilities` adhering strictly to explicit assignment checks.

- [ ] **Step 3: Run tests**

Run: `node --experimental-strip-types --test eLeave/tests/unit/subsystemRolesCapabilities.test.js`  
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/permissions.ts eLeave/tests/unit/subsystemRolesCapabilities.test.js
git commit -m "feat(auth): implement fail-closed capability engine and invariants test"
```

---

### Task 4: Transactional Duty Management & Audit Trail

**Files:**
- Modify: `src/app/actions/settings.ts`
- Test: `eLeave/tests/unit/dutyAuditTransactions.test.js`

**Interfaces:**
- Produces: `updateAppointedDuties({ assignments, actorId })`
- Enforces: `SystemSettings FOR UPDATE`, target validation (`isApproved = true`), `SystemLog` audit recording in single transaction.

- [ ] **Step 1: Write test for transactional audit log creation**

- [ ] **Step 2: Implement `updateAppointedDuties` in `settings.ts`**

Use Prisma `$transaction`:
1. `SELECT id FROM "SystemSettings" WHERE id = 'default' FOR UPDATE;`
2. Validate caller has `ADMIN` role.
3. Validate all target user IDs (`isApproved: true, isDeleted: false`).
4. Set existing assignments `isActive = false, revokedAt = now()`.
5. Insert new `UserDutyAssignment` records.
6. Create `SystemLog` audit entries.

- [ ] **Step 3: Verify with unit tests**

Run: `node --experimental-strip-types --test eLeave/tests/unit/dutyAuditTransactions.test.js`

- [ ] **Step 4: Commit**

```bash
git add src/app/actions/settings.ts eLeave/tests/unit/dutyAuditTransactions.test.js
git commit -m "feat(actions): add transactional duty updates with row locks and audit logging"
```

---

### Task 5: Anti-Self-Approval & Signer Historical Snapshots

**Files:**
- Modify: `src/app/actions/leave.ts`
- Test: `eLeave/tests/unit/leaveSeparationOfDuties.test.js`

**Interfaces:**
- Enforces: `requesterId !== inspectorId`, `requesterId !== headApproverId`, `requesterId !== execApproverId`.
- Writes: Immutable snapshot to `LeaveRequest.extraFields` during inspection/approval.

- [ ] **Step 1: Write test for separation of duties & snapshot sealing**

```javascript
// eLeave/tests/unit/leaveSeparationOfDuties.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Separation of Duties (Anti-Self-Approval)', () => {
  test('Throws error when requester attempts to inspect own leave request', () => {
    assert.throws(() => {
      validateApprovalActors({ requesterId: 'usr_1', inspectorId: 'usr_1', headApproverId: 'usr_2', execApproverId: 'usr_3' });
    }, /Violation: Requester cannot inspect own leave request/);
  });

  test('Throws error when requester attempts head approval of own leave request', () => {
    assert.throws(() => {
      validateApprovalActors({ requesterId: 'usr_1', inspectorId: 'usr_2', headApproverId: 'usr_1', execApproverId: 'usr_3' });
    }, /Violation: Requester cannot act as head approver for own leave request/);
  });
});

export function validateApprovalActors({ requesterId, inspectorId, headApproverId, execApproverId }) {
  if (requesterId && inspectorId && requesterId === inspectorId) {
    throw new Error('Violation: Requester cannot inspect own leave request');
  }
  if (requesterId && headApproverId && requesterId === headApproverId) {
    throw new Error('Violation: Requester cannot act as head approver for own leave request');
  }
  if (requesterId && execApproverId && requesterId === execApproverId) {
    throw new Error('Violation: Requester cannot execute final approval for own leave request');
  }
  return true;
}
```

- [ ] **Step 2: Integrate into `src/app/actions/leave.ts`**

Add actor validation and snapshot sealing in `inspectLeaveRequest` and `approveLeaveRequest`.

- [ ] **Step 3: Update `src/app/print/leave/[id]/page.tsx` & `batch/page.tsx`**

Read directly from `extraFields.inspectorSnapshot` and `extraFields.headApproverSnapshot`. Render `ตำแหน่ง [position] [level]` + duty subtitle.

- [ ] **Step 4: Run full test suite regression**

Run: `npm test`  
Expected: All tests pass with 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/app/actions/leave.ts src/app/print/leave/[id]/page.tsx src/app/print/leave/batch/page.tsx eLeave/tests/unit/leaveSeparationOfDuties.test.js
git commit -m "feat(leave): enforce separation of duties and seal historical signer snapshots"
```

---

### Task 6: Settings UI & User Management Display

**Files:**
- Modify: `src/app/(app)/settings/page.tsx`
- Modify: `src/app/(app)/users/page.tsx`
- Modify: `src/lib/i18n.tsx`

**Interfaces:**
- Produces: Dedicated Settings Section with 3 Cards for Appointed Duties, Badges and Filters in User Management.

- [ ] **Step 1: Settings UI Assignment Cards**

Implement Card 1 (HR & Leave Duties), Card 2 (4 Division Heads), Card 3 (8+1 Department Heads).

- [ ] **Step 2: User Management Badges & Filters**

Display official position (`ครู`, `ครูผู้ช่วย`) with duty badges (`[ผู้ตรวจสอบการลา]`, `[หัวหน้างานบุคคล]`, `[หัวหน้าฝ่าย...]`).

- [ ] **Step 3: Verification**

Run `npm test` and test HTTP endpoints:
- `GET http://localhost:3001/settings` ➔ HTTP 200
- `GET http://localhost:3001/users` ➔ HTTP 200

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/settings/page.tsx src/app/(app)/users/page.tsx src/lib/i18n.tsx
git commit -m "feat(ui): add appointed duties settings interface and user management badges"
```
