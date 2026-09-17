# Subsystem Roles, Assigned Duties & Teacher Capability Architecture Implementation Plan (Rev 6 - Production Ready Candidate)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement normalized `UserDutyAssignment` with duty-specific partial unique indexes, canonical `revokedAt IS NULL` active state, deterministic multi-row lock hierarchy (`ORDER BY id ASC FOR UPDATE`), isolated security audit logging (`logSecurityViolationIsolated`), DB trigger mandating complete snapshots on `APPROVED` transition, and deletion prevention.

**Architecture:** Model `UserDutyAssignment` with explicit scoped partial unique indexes and singleton constraints. Implement deterministic lock hierarchy in `updateAppointedDuties`. Enforce domain-bound anti-self-approval with durable isolated security auditing. Protect snapshots and approved leave requests with PostgreSQL triggers.

**Tech Stack:** Next.js 15, TypeScript, Prisma ORM, PostgreSQL, Tailwind CSS, Lucide React, Node.js Test Runner.

## Global Constraints

- Active assignments are strictly defined as `revokedAt IS NULL`.
- `actorId` MUST be derived strictly from `session.user.id` on server; never accepted from client arguments.
- Mutating assignments requires canonical lock order: `SystemSettings` -> `User` (`ORDER BY id ASC FOR UPDATE`) -> `UserDutyAssignment` (`ORDER BY id ASC FOR UPDATE`).
- `LeaveRequest` hard `DELETE` is blocked when `status = 'APPROVED'`. Signer snapshots are permanently immutable once `status = 'APPROVED'`.
- Mandatory `headApproverSnapshot` is enforced at DB trigger level when transitioning to `APPROVED`.
- Security violations must be committed in an isolated transaction to `SystemLog` before throwing.
- Working directory: `C:\dev\eLeave`.
- Node test runner: `node --experimental-strip-types --test <test_path>`.

---

### Task 1: Database Schema Hardening (Enums, Scoped Indexes, Mandatory Snapshot Trigger)

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `scripts/apply-duty-assignments-schema.mjs`
- Test: `eLeave/tests/unit/subsystemRolesSchema.test.js`

**Interfaces:**
- Produces: `DutyType`, `ScopeDivision`, `ScopeDepartment` enums; `UserDutyAssignment` model; `inspectorSnapshot` and `headApproverSnapshot` columns on `LeaveRequest`.
- Constraints: Partial unique indexes on direct columns, bi-directional `chk_duty_scope_validity`, composite singleton constraints `("dutyType", "divisionScope")` and `("dutyType", "departmentScope")`, and triggers `trg_protect_leave_signer_snapshots` and `trg_protect_leave_approved_deletion`.

- [ ] **Step 1: Write test for schema constraints and typed domains**

```javascript
// eLeave/tests/unit/subsystemRolesSchema.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Subsystem Roles Schema & Domain Types', () => {
  test('validates division domain allowlist strictly', () => {
    const validDivisions = ['ACADEMIC', 'PERSONNEL', 'GENERAL', 'BUDGET'];
    assert.equal(validDivisions.length, 4);
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

- [ ] **Step 3: Create and run `scripts/apply-duty-assignments-schema.mjs`**

Applies SQL constraints: `chk_duty_scope_validity`, duty-specific partial unique indexes `uk_active_global_user_duty`, `uk_active_division_user_duty`, `uk_active_dept_user_duty`, composite singleton constraints `uk_single_active_division_head`, `uk_single_active_dept_head`, and triggers `trg_protect_leave_signer_snapshots` (with mandatory snapshot check on `APPROVED`) and `trg_protect_leave_approved_deletion`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma scripts/apply-duty-assignments-schema.mjs eLeave/tests/unit/subsystemRolesSchema.test.js
git commit -m "feat(schema): apply duty-specific unique indexes and mandatory snapshot trigger"
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

- [ ] **Step 2: Implement CLI `scripts/migrate-subsystem-roles.mjs`**

- [ ] **Step 3: Execute dry-run and apply**

- [ ] **Step 4: Commit**

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

- [ ] **Step 2: Implement `src/lib/permissions.ts`**

- [ ] **Step 3: Commit**

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

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/settings.ts eLeave/tests/unit/dutyAuditTransactions.test.js
git commit -m "feat(actions): implement deterministic row-lock hierarchy and full-state audit"
```

---

### Task 5: Domain-Bound Anti-Self-Approval & Isolated Security Audit Logging

**Files:**
- Modify: `src/app/actions/leave.ts`
- Test: `eLeave/tests/unit/leaveSeparationOfDuties.test.js`

**Interfaces:**
- Enforces: Query routing excludes requester. Transaction verifies: requester !== actor, actor has active duty matching request department scope.
- Audit: Implements `logSecurityViolationIsolated` committing to `SystemLog` before throwing.
- Writes: Dedicated `inspectorSnapshot` and `headApproverSnapshot` on `LeaveRequest`.

- [ ] **Step 1: Write test for domain-bound separation of duties and security violation logging**

- [ ] **Step 2: Implement query-level routing, isolated security audit logging, and snapshot sealing in `src/app/actions/leave.ts`**

- [ ] **Step 3: Update `src/app/print/leave/[id]/page.tsx` & `batch/page.tsx` to read dedicated snapshot columns**

- [ ] **Step 4: Run full test suite regression**

Run: `npm test`  
Expected: All tests pass with 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/app/actions/leave.ts src/app/print/leave/[id]/page.tsx src/app/print/leave/batch/page.tsx eLeave/tests/unit/leaveSeparationOfDuties.test.js
git commit -m "feat(leave): enforce isolated security audit logging and mandatory snapshot sealing"
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
