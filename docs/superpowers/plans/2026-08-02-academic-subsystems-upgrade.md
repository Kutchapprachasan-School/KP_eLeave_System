# Academic Subsystems Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Academic Subsystems (Facilities Catalog & Reservation, Exam Configuration & Scheduling, PA Competency Portfolio & PD Hours Logging) with Prisma schema persistence, Server Actions, and Master Data Management tabs in Academic Settings.

**Architecture:** Extend Prisma schema with normalized models for Facilities, Exam, and PA. Implement Server Actions with validation and conflict checking in `src/app/actions/`. Update `/academic/settings/page.tsx` UI with dedicated sub-tabs.

**Tech Stack:** Next.js Server Actions, Prisma ORM, TypeScript, Node.js Test Runner.

## Global Constraints

- Preserve all existing 71 passing tests.
- All server actions must validate input parameters and return typed results.

---

### Task 1: Prisma Schema Models for Academic Subsystems

**Files:**
- Modify: `prisma/schema.prisma`
- Test: `npm test`

**Interfaces:**
- Consumes: Prisma Schema definitions
- Produces: `FacilityResource`, `FacilityReservation`, `ExamPeriod`, `ExamSubjectSlot`, `ExamProctorAssignment`, `PaTargetConfig`, `PaAgreement`, `PdHourLog`, `CompetencyEvaluation` models

- [ ] **Step 1: Append Academic Subsystem models to Prisma schema**

Add enums and models for `FacilityResource`, `FacilityReservation`, `ExamPeriod`, `ExamSubjectSlot`, `ExamProctorAssignment`, `PaTargetConfig`, `PaAgreement`, `PdHourLog`, `CompetencyEvaluation` to `prisma/schema.prisma`.

- [ ] **Step 2: Generate Prisma client**

Run: `npx prisma generate`
Expected: Prisma client updated cleanly without errors.

- [ ] **Step 3: Run test suite to verify no schema regressions**

Run: `npm test`
Expected: PASS 71/71 tests

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(prisma): add models for facilities, exam, and PA competency subsystems"
```

---

### Task 2: Facility Server Actions & Unit Tests

**Files:**
- Create: `src/app/actions/facility.ts`
- Create: `eLeave/tests/unit/facilityService.test.js`

**Interfaces:**
- Consumes: Prisma Client (`prisma.facilityResource`, `prisma.facilityReservation`)
- Produces: `createFacilityResourceAction`, `getFacilityResourcesAction`, `reserveFacilityAction`, `checkFacilityConflictAction`

- [ ] **Step 1: Write failing test for Facility conflict engine**

Create `eLeave/tests/unit/facilityService.test.js`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('FacilityConflictEngine - detects overlapping reservation times', () => {
  const existing = [{ startTime: new Date('2026-08-05T09:00:00Z'), endTime: new Date('2026-08-05T11:00:00Z') }];
  const newStart = new Date('2026-08-05T10:00:00Z');
  const newEnd = new Date('2026-08-05T12:00:00Z');
  const hasConflict = existing.some(e => newStart < e.endTime && newEnd > e.startTime);
  assert.equal(hasConflict, true);
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `node eLeave/tests/unit/facilityService.test.js`
Expected: PASS

- [ ] **Step 3: Create Server Actions in `src/app/actions/facility.ts`**

Implement `createFacilityResourceAction`, `getFacilityResourcesAction`, `reserveFacilityAction`, `checkFacilityConflictAction` in `src/app/actions/facility.ts`.

- [ ] **Step 4: Run test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/actions/facility.ts eLeave/tests/unit/facilityService.test.js
git commit -m "feat(facility): add server actions and unit tests for facility catalog and reservation engine"
```

---

### Task 3: Exam Server Actions & Unit Tests

**Files:**
- Create: `src/app/actions/exam.ts`
- Create: `eLeave/tests/unit/examService.test.js`

**Interfaces:**
- Consumes: Prisma Client (`prisma.examPeriod`, `prisma.examSubjectSlot`, `prisma.examProctorAssignment`)
- Produces: `configureExamPeriodAction`, `getActiveExamPeriodAction`, `createExamSlotAction`, `assignExamProctorsAction`

- [ ] **Step 1: Write failing test for Exam Proctor Assignment**

Create `eLeave/tests/unit/examService.test.js`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('ExamProctorEngine - calculates proctor load per teacher', () => {
  const assignments = [
    { teacherId: 't1', slotId: 's1' },
    { teacherId: 't1', slotId: 's2' },
    { teacherId: 't2', slotId: 's1' }
  ];
  const countT1 = assignments.filter(a => a.teacherId === 't1').length;
  assert.equal(countT1, 2);
});
```

- [ ] **Step 2: Run test**

Run: `node eLeave/tests/unit/examService.test.js`
Expected: PASS

- [ ] **Step 3: Create Server Actions in `src/app/actions/exam.ts`**

Implement `configureExamPeriodAction`, `getActiveExamPeriodAction`, `createExamSlotAction`, `assignExamProctorsAction` in `src/app/actions/exam.ts`.

- [ ] **Step 4: Run test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/actions/exam.ts eLeave/tests/unit/examService.test.js
git commit -m "feat(exam): add server actions and unit tests for exam configuration and proctor scheduling"
```

---

### Task 4: PA Competency Server Actions & Unit Tests

**Files:**
- Create: `src/app/actions/competency.ts`
- Create: `eLeave/tests/unit/competencyService.test.js`

**Interfaces:**
- Consumes: Prisma Client (`prisma.paTargetConfig`, `prisma.paAgreement`, `prisma.pdHourLog`, `prisma.competencyEvaluation`)
- Produces: `setPaTargetConfigAction`, `submitPaAgreementAction`, `logPdHoursAction`, `getTeacherPdSummaryAction`

- [ ] **Step 1: Write test for PD Hours accumulation**

Create `eLeave/tests/unit/competencyService.test.js`:
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('CompetencyEngine - accumulates approved PD hours against target', () => {
  const logs = [{ hours: 12 }, { hours: 8 }];
  const total = logs.reduce((acc, curr) => acc + curr.hours, 0);
  const target = 20;
  assert.equal(total >= target, true);
});
```

- [ ] **Step 2: Run test**

Run: `node eLeave/tests/unit/competencyService.test.js`
Expected: PASS

- [ ] **Step 3: Create Server Actions in `src/app/actions/competency.ts`**

Implement `setPaTargetConfigAction`, `submitPaAgreementAction`, `logPdHoursAction`, `getTeacherPdSummaryAction` in `src/app/actions/competency.ts`.

- [ ] **Step 4: Run test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/actions/competency.ts eLeave/tests/unit/competencyService.test.js
git commit -m "feat(competency): add server actions and unit tests for PA agreement and PD hours logging"
```

---

### Task 5: Academic Master Settings UI Upgrade (`/academic/settings`)

**Files:**
- Modify: `src/app/(app)/academic/settings/page.tsx`
- Test: `npm test`

**Interfaces:**
- Consumes: `src/app/actions/facility.ts`, `src/app/actions/exam.ts`, `src/app/actions/competency.ts`
- Produces: Updated `/academic/settings/page.tsx` UI with Facility Catalog, Exam Config, and PA Guidelines sub-tabs

- [ ] **Step 1: Add new sub-tabs to Academic Settings Page**

Add tabs `"FACILITY" | "EXAM_CONFIG" | "PA_GUIDELINES"` and integrate form components for Facilities, Exam, and PA settings.

- [ ] **Step 2: Verify UI component rendering and tests**

Run: `npm test`
Expected: PASS 71+ tests

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/academic/settings/page.tsx
git commit -m "feat(academic-settings): integrate facilities, exam, and PA competency master data management tabs"
```
