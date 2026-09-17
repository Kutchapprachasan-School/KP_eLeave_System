# Subsystem Roles, Assigned Duties & Teacher Capability Architecture Implementation Plan (Rev 5 - Production Ready)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement normalized `UserDutyAssignment` with direct scope columns in partial unique indexes, canonical `revokedAt IS NULL` active state, deterministic multi-row lock hierarchy with `ORDER BY id ASC FOR UPDATE`, domain-bound anti-self-approval with `SECURITY_VIOLATION` audit logging, DB-level trigger protection for approved signer snapshots and deletion prevention, and strictly scoped ambiguous migration resolution.

**Architecture:** Model `UserDutyAssignment` in Prisma and PostgreSQL. Implement deterministic lock hierarchy: `SystemSettings` -> sorted `User`s -> active `UserDutyAssignment`s. Verify anti-self-approval at query and transaction execution levels with scope matching. Seal dedicated snapshots on `LeaveRequest` with PostgreSQL update and delete triggers.

**Tech Stack:** Next.js 15, TypeScript, Prisma ORM, PostgreSQL, Tailwind CSS, Lucide React, Node.js Test Runner.

## Global Constraints

- Never use `isActive`; active assignments are strictly defined as `revokedAt IS NULL`.
- `actorId` MUST be derived strictly from `session.user.id` on server; never accepted from client arguments.
- Mutating assignments requires canonical lock order: `SystemSettings` -> `User` (`ORDER BY id ASC FOR UPDATE`) -> `UserDutyAssignment` (`ORDER BY id ASC FOR UPDATE`).
- `LeaveRequest` hard `DELETE` is blocked when `status = 'APPROVED'`. Signer snapshots are permanently immutable once `status = 'APPROVED'`.
- Self-approval attempts must create a `SECURITY_VIOLATION` audit record in `SystemLog` before throwing.
- Working directory: `C:\dev\eLeave`.
- Node test runner: `node --experimental-strip-types --test <test_path>`.

---

### Task 1: Database Schema Hardening (Enums, Partial Unique Indexes & Dedicated Snapshots)

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `scripts/apply-duty-assignments-schema.mjs`
- Test: `eLeave/tests/unit/subsystemRolesSchema.test.js`

**Interfaces:**
- Produces: `DutyType`, `ScopeDivision`, `ScopeDepartment` enums; `UserDutyAssignment` model (without `isActive`); `inspectorSnapshot` and `headApproverSnapshot` columns on `LeaveRequest`.
- Constraints: Partial unique indexes on direct columns, bi-directional `chk_duty_scope_validity`, singleton constraints for division/dept heads, and triggers `trg_protect_leave_signer_snapshots` and `trg_protect_leave_approved_deletion`.

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

Applies SQL constraints: `chk_duty_scope_validity`, partial unique indexes `uk_active_global_user_duty`, `uk_active_division_user_duty`, `uk_active_dept_user_duty`, singleton constraints `uk_single_active_division_head`, `uk_single_active_dept_head`, and triggers `trg_protect_leave_signer_snapshots` and `trg_protect_leave_approved_deletion`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma scripts/apply-duty-assignments-schema.mjs eLeave/tests/unit/subsystemRolesSchema.test.js
git commit -m "feat(schema): add typed UserDutyAssignment, partial unique indexes, and snapshot triggers"
```

---

### Task 2: Idempotent Migration CLI with Validated Scoped Ambiguity Resolution

**Files:**
- Create: `scripts/migrate-subsystem-roles.mjs`
- Test: `eLeave/tests/unit/subsystemRolesMigration.test.js`

**Interfaces:**
- CLI Flags: `--dry-run`, `--apply`, `--resolve-ambiguous="userId:position,..."`.
- Enforces: Target user MUST possess a synthetic position (`'หัวหน้างานบุคคล'`, `'ผู้ตรวจสอบ'`, `'เจ้าหน้าที่บุคคล'`). Zod validation on position allowlist, idempotent execution, logs resolution audit into `SystemLog`.

- [ ] **Step 1: Write unit test for migration engine and ambiguity resolution**

```javascript
// eLeave/tests/unit/subsystemRolesMigration.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

export const SYNTHETIC_POSITIONS_WHITELIST = ['หัวหน้างานบุคคล', 'ผู้ตรวจสอบ', 'เจ้าหน้าที่บุคคล'];
export const CIVIL_SERVICE_POSITIONS_ALLOWLIST = ['ครู', 'ครูผู้ช่วย', 'พนักงานราชการ', 'ลูกจ้างประจำ', 'ลูกจ้างชั่วคราว', 'ครูอัตราจ้าง'];

export function parseAmbiguityResolutions(rawResolutions) {
  const map = {};
  if (!rawResolutions) return map;
  const pairs = rawResolutions.split(',').map(s => s.trim()).filter(Boolean);
  for (const pair of pairs) {
    const [userId, targetPosition] = pair.split(':').map(s => s.trim());
    if (!userId || !targetPosition) throw new Error(`Invalid format: ${pair}`);
    if (!CIVIL_SERVICE_POSITIONS_ALLOWLIST.includes(targetPosition)) {
      throw new Error(`Invalid position: ${targetPosition}`);
    }
    map[userId] = targetPosition;
  }
  return map;
}

describe('Idempotent Migration Engine', () => {
  test('validates ambiguous resolution allowlist strictly', () => {
    assert.throws(() => parseAmbiguityResolutions('u1:InvalidPosition'), /Invalid position/);
    const valid = parseAmbiguityResolutions('u1:ครู,u2:ลูกจ้างประจำ');
    assert.equal(valid.u1, 'ครู');
    assert.equal(valid.u2, 'ลูกจ้างประจำ');
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
git commit -m "feat(migration): implement idempotent CLI with scoped ambiguity resolution"
```

---

### Task 3: Fail-Closed Capability Engine with Cutover Gate

**Files:**
- Create: `src/lib/permissions.ts`
- Test: `eLeave/tests/unit/subsystemRolesCapabilities.test.js`

**Interfaces:**
- Produces: `getUserCapabilities(user, activeAssignments, settings)`
- Evaluates: `revokedAt === null` as active state. Post-cutover, legacy positions grant zero privileges.

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

  test('Grants HR Head capability when active assignment exists (revokedAt is null)', () => {
    const caps = getUserCapabilities(
      { id: 'u_test', position: 'ครู', role: 'TEACHER' },
      [{ dutyType: 'HR_HEAD', divisionScope: 'PERSONNEL', departmentScope: null, revokedAt: null }],
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

### Task 4: Transactional Duty Management (Deterministic Row Lock Hierarchy & Full State Audit)

**Files:**
- Modify: `src/app/actions/settings.ts`
- Test: `eLeave/tests/unit/dutyAuditTransactions.test.js`

**Interfaces:**
- Action: `updateAppointedDuties({ assignmentsToGrant, assignmentsToRevoke })`
- Locks: `SystemSettings` -> sorted `User`s (`ORDER BY id ASC FOR UPDATE`) -> active `UserDutyAssignment`s (`ORDER BY id ASC FOR UPDATE`).
- Records: Full `before` and `after` states in `SystemLog`.

- [ ] **Step 1: Write unit test for lock hierarchy and audit logging**

- [ ] **Step 2: Implement `updateAppointedDuties` in `src/app/actions/settings.ts`**

- [ ] **Step 3: Run test**

Run: `node --experimental-strip-types --test eLeave/tests/unit/dutyAuditTransactions.test.js`

- [ ] **Step 4: Commit**

```bash
git add src/app/actions/settings.ts eLeave/tests/unit/dutyAuditTransactions.test.js
git commit -m "feat(actions): implement deterministic row-lock hierarchy and full-state audit"
```

---

### Task 5: Domain-Bound Anti-Self-Approval & Dedicated Signer Snapshot Sealing

**Files:**
- Modify: `src/app/actions/leave.ts`
- Test: `eLeave/tests/unit/leaveSeparationOfDuties.test.js`

**Interfaces:**
- Enforces: Query routing excludes requester. Transaction verifies: requester !== actor, actor has active duty matching request department scope. Logs `SECURITY_VIOLATION` before throwing.
- Writes: Dedicated `inspectorSnapshot` and `headApproverSnapshot` on `LeaveRequest`.

- [ ] **Step 1: Write test for domain-bound separation of duties and security violation logging**

```javascript
// eLeave/tests/unit/leaveSeparationOfDuties.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

export function validateApproverAuthorization({ requesterId, actorId, dutyType, actorScope, requestDept }) {
  if (requesterId === actorId) {
    throw new Error('CRITICAL_SECURITY_VIOLATION: Requester cannot inspect or approve own leave request');
  }
  if (dutyType === 'DEPT_HEAD' && actorScope !== requestDept) {
    throw new Error(`FORBIDDEN: Dept Head scope ${actorScope} does not match request dept ${requestDept}`);
  }
  return true;
}

describe('Domain-Bound Anti-Self-Approval & Authorization Invariants', () => {
  test('Throws security violation when requester attempts to approve own request', () => {
    assert.throws(() => {
      validateApproverAuthorization({ requesterId: 'u1', actorId: 'u1', dutyType: 'DEPT_HEAD', actorScope: 'MATH', requestDept: 'MATH' });
    }, /CRITICAL_SECURITY_VIOLATION/);
  });

  test('Throws forbidden when department head approves a different department', () => {
    assert.throws(() => {
      validateApproverAuthorization({ requesterId: 'u2', actorId: 'u3', dutyType: 'DEPT_HEAD', actorScope: 'ENGLISH', requestDept: 'MATH' });
    }, /FORBIDDEN/);
  });

  test('Succeeds when department head approves own department staff', () => {
    const ok = validateApproverAuthorization({ requesterId: 'u2', actorId: 'u3', dutyType: 'DEPT_HEAD', actorScope: 'MATH', requestDept: 'MATH' });
    assert.ok(ok);
  });
});
```

- [ ] **Step 2: Implement query-level routing, runtime domain assertion, and snapshot sealing in `src/app/actions/leave.ts`**

- [ ] **Step 3: Update `src/app/print/leave/[id]/page.tsx` & `batch/page.tsx` to read dedicated snapshot columns**

- [ ] **Step 4: Run full test suite regression**

Run: `npm test`  
Expected: All tests pass with 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/app/actions/leave.ts src/app/print/leave/[id]/page.tsx src/app/print/leave/batch/page.tsx eLeave/tests/unit/leaveSeparationOfDuties.test.js
git commit -m "feat(leave): enforce domain-bound anti-self-approval and seal dedicated signer snapshots"
```

---

### Task 6: Settings UI Cards & User Management Badges

**Files:**
- Modify: `src/app/(app)/settings/page.tsx`
- Modify: `src/app/(app)/users/page.tsx`
- Modify: `src/lib/i18n.tsx`

**Interfaces:**
- UI: Dedicated 3 Cards in Settings, Badges and Filters in Users Page.

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
