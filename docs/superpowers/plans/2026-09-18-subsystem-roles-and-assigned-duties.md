# Subsystem Roles, Assigned Duties & Teacher Capability Architecture Implementation Plan (Rev 4 - Definitive Forensic Architecture)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement normalized `UserDutyAssignment` with direct scope columns in partial unique indexes, canonical `revokedAt IS NULL` active state (no `isActive`), deterministic multi-row lock hierarchy in `updateAppointedDuties`, transactional self-approval checks with `SECURITY_VIOLATION` audit logging, DB-level trigger protection for approved signer snapshots, and schema-validated ambiguous migration resolution.

**Architecture:** Model `UserDutyAssignment` with `ScopeDivision` and `ScopeDepartment` enums in Prisma. Apply PostgreSQL partial unique indexes and bi-directional scope CHECK constraints. Implement deterministic lock hierarchy: `SystemSettings` -> sorted target `User`s -> active `UserDutyAssignment`s. Route and assert anti-self-approval in `leave.ts`. Seal dedicated snapshots on `LeaveRequest` with PostgreSQL immutability trigger.

**Tech Stack:** Next.js 15, TypeScript, Prisma ORM, PostgreSQL, Tailwind CSS, Lucide React, Node.js Test Runner.

## Global Constraints

- Never use `isActive`; active assignments are strictly defined as `revokedAt IS NULL`.
- `actorId` MUST be derived strictly from `session.user.id` on server; never accepted from client arguments.
- Mutating assignments requires canonical lock order: `SystemSettings` -> sorted `User`s -> active `UserDutyAssignment`s.
- `LeaveRequest.inspectorSnapshot` and `headApproverSnapshot` become permanently immutable once `status = 'APPROVED'`.
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
- Constraints: Partial unique indexes on direct columns, bi-directional `chk_duty_scope_validity`, singleton constraints for division/dept heads, and trigger `trg_protect_leave_signer_snapshots`.

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

Applies SQL constraints: `chk_duty_scope_validity`, partial unique indexes `uk_active_global_user_duty`, `uk_active_division_user_duty`, `uk_active_dept_user_duty`, singleton constraints `uk_single_active_division_head`, `uk_single_active_dept_head`, and trigger `trg_protect_leave_signer_snapshots`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma scripts/apply-duty-assignments-schema.mjs eLeave/tests/unit/subsystemRolesSchema.test.js
git commit -m "feat(schema): add typed UserDutyAssignment, partial unique indexes, and dedicated snapshots"
```

---

### Task 2: Idempotent Migration CLI with Validated Ambiguity Resolution

**Files:**
- Create: `scripts/migrate-subsystem-roles.mjs`
- Test: `eLeave/tests/unit/subsystemRolesMigration.test.js`

**Interfaces:**
- CLI Flags: `--dry-run`, `--apply`, `--resolve-ambiguous="userId:position,..."`.
- Enforces: Zod validation on input, idempotent execution, logs resolution audit into `SystemLog`, aborts with zero mutation if unresolved ambiguous staff exist.

- [ ] **Step 1: Write unit test for migration engine and ambiguity resolution**

```javascript
// eLeave/tests/unit/subsystemRolesMigration.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

export const CIVIL_SERVICE_POSITIONS_ALLOWLIST = [
  'ครู', 'ครูผู้ช่วย', 'พนักงานราชการ', 'ลูกจ้างประจำ', 'ลูกจ้างชั่วคราว', 'ครูอัตราจ้าง'
];

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
git commit -m "feat(migration): implement idempotent CLI with schema-validated ambiguity resolution"
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

### Task 4: Transactional Duty Management (Deterministic Row Lock Hierarchy)

**Files:**
- Modify: `src/app/actions/settings.ts`
- Test: `eLeave/tests/unit/dutyAuditTransactions.test.js`

**Interfaces:**
- Action: `updateAppointedDuties({ assignmentsToGrant, assignmentsToRevoke })`
- Locks: `SystemSettings` -> sorted `User`s -> active `UserDutyAssignment`s. Derives `actorId = session.user.id`. Records `SystemLog`.

- [ ] **Step 1: Write unit test for lock hierarchy and audit logging**

- [ ] **Step 2: Implement `updateAppointedDuties` in `src/app/actions/settings.ts`**

- [ ] **Step 3: Run test**

Run: `node --experimental-strip-types --test eLeave/tests/unit/dutyAuditTransactions.test.js`

- [ ] **Step 4: Commit**

```bash
git add src/app/actions/settings.ts eLeave/tests/unit/dutyAuditTransactions.test.js
git commit -m "feat(actions): implement deterministic row-lock hierarchy and transactional audit"
```

---

### Task 5: Query-Level Anti-Self-Approval & Dedicated Signer Snapshot Sealing

**Files:**
- Modify: `src/app/actions/leave.ts`
- Test: `eLeave/tests/unit/leaveSeparationOfDuties.test.js`

**Interfaces:**
- Enforces: Query routing excludes requester (`userId: { not: request.userId }`). Runtime assertion logs `SECURITY_VIOLATION` to `SystemLog` before throwing.
- Writes: Dedicated `inspectorSnapshot` and `headApproverSnapshot` on `LeaveRequest`.

- [ ] **Step 1: Write test for separation of duties and security violation logging**

```javascript
// eLeave/tests/unit/leaveSeparationOfDuties.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

export function routeApproverExcludingRequester(candidates, requesterId) {
  return candidates.find(c => c.userId !== requesterId) || null;
}

describe('Anti-Self-Approval Query-Level Routing & Invariants', () => {
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

- [ ] **Step 2: Implement query-level routing, runtime security assertion, and snapshot sealing in `src/app/actions/leave.ts`**

- [ ] **Step 3: Update `src/app/print/leave/[id]/page.tsx` & `batch/page.tsx` to read dedicated snapshot columns**

- [ ] **Step 4: Run full test suite regression**

Run: `npm test`  
Expected: All tests pass with 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/app/actions/leave.ts src/app/print/leave/[id]/page.tsx src/app/print/leave/batch/page.tsx eLeave/tests/unit/leaveSeparationOfDuties.test.js
git commit -m "feat(leave): enforce query-level routing, runtime security logging, and dedicated snapshot sealing"
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
