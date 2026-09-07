# Meeting Room & School Vehicle Booking System Implementation Plan (Production v7.0 - Golden Seal)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Meeting Room and School Vehicle Booking subsystems in KP e-Leave meeting all Production v7.0 Golden Seal requirements: Centralized `transitionReservationStatus` lifecycle helper, Dual PostgreSQL Exclusion Constraints with active predicates `[startAt, endAt)`, SLA Auto-Cancel vs Approval Race Protection (`facilityPendingExpiryApprovalRace.test.js`), and Configurable SLA Policy.

**Architecture:** Extend Prisma schema with clean models (`RoomProfile`, `VehicleProfile`, `DriverProfile`, `FacilityApprovalPolicy`, `FacilityApprovalStep`, `ReservationResourceAssignment`, `RoomReservationDetail`, `VehicleReservationDetail`, `SignatureTokenLog`). Implement Server Actions in `src/app/actions/facility.ts` utilizing `executeReservationMutation` and `transitionReservationStatus` with PostgreSQL code `23P01` catching. Deliver Dropdown Mode Switcher UI and Thai A4 printouts.

**Tech Stack:** Next.js (App Router, Server Actions), Prisma ORM, PostgreSQL ($transaction, Row-Level Locking `FOR UPDATE`, Dual Exclusion Constraints `tstzrange`), Tailwind CSS, Framer Motion, Node.js Native Test Runner.

## Global Constraints

- All development, testing, and commits must be executed on branch `dev` (never commit directly to `main`).
- **PROHIBITED:** PostgreSQL Advisory Locks (`pg_advisory_xact_lock`). Use Row-Level Locking (`SELECT ... FOR UPDATE`) and PostgreSQL Exclusion Constraints on `ReservationResourceAssignment`.
- Active reservation state boundaries: `PENDING`, `APPROVED`, `IN_USE` block slots using half-open intervals `[startAt, endAt)`. `CANCELLED`, `REJECTED`, `COMPLETED` free slots.
- Image signatures must be loaded strictly via `/api/signatures/[userId]` (supporting session cookie & atomic single-use HMAC token).
- Attachments must use pure ASCII storage keys (`facilities/<id>/<timestamp>_<hash>.<ext>`).
- Preserve all existing 76 passing unit tests without regressions.

---

### Task 1: Branch Setup & Production Prisma Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Test: `npm test`

**Interfaces:**
- Consumes: Existing Prisma Schema
- Produces: `ReservationStatus`, `ApprovalStepStatus`, `AssignmentTargetType`, `RoomProfile`, `VehicleProfile`, `DriverProfile`, `FacilityApprovalPolicy`, `FacilityApprovalStep`, `ReservationResourceAssignment`, `RoomReservationDetail`, `VehicleReservationDetail`, `SignatureTokenLog`

- [ ] **Step 1: Switch or create git branch `dev`**

```bash
git checkout -b dev 2>/dev/null || git checkout dev
```

- [ ] **Step 2: Update `prisma/schema.prisma`**

Update `prisma/schema.prisma` with:
- `FacilityResource` + 1:1 `RoomProfile` + 1:1 `VehicleProfile`
- `DriverProfile` linked to `User`
- Clean `ReservationStatus` enum (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`, `IN_USE`, `COMPLETED`)
- `FacilityApprovalPolicy` (Config with `slaHours`, `bufferHoursBefore`)
- `FacilityApprovalStep` (Snapshot with `@@unique([reservationId, stepNo])`)
- Unified `ReservationResourceAssignment` table (with `targetType`, `resourceId`, `driverProfileId`, `startAt`, `endAt`, `status`)
- `FacilityReservation` with dynamic `expiresAt`
- `SignatureTokenLog` (`jti` unique, `consumedAt`, `expiresAt`)

- [ ] **Step 3: Generate Prisma Client & Verify**

```bash
npx prisma generate
npm test
```
Expected: PASS 76/76 tests.

- [ ] **Step 4: Commit on `dev`**

```bash
git add prisma/schema.prisma
git commit -m "feat(facility): add production schema v7 with configurable SLA, approval steps, and resource assignments"
```

---

### Task 2: Unified Concurrency Protocol, SLA Cleanup & Server Actions (TDD)

**Files:**
- Create: `eLeave/tests/unit/facilityReservationWorkflow.test.js`
- Modify: `src/app/actions/facility.ts`
- Modify: `src/lib/services/facilityReservationService.ts`

**Interfaces:**
- Consumes: Prisma Client
- Produces:
  - `transitionReservationStatus(tx, reservationId, newStatus, options)` (Single Source of Truth)
  - `executeReservationMutation(resourceId, driverProfileId, mutationFn)` (Deterministic Lock Protocol with Exclusion catch)
  - `reserveFacilityAction(input)` (Queues PENDING reservation, calculates dynamic SLA expiresAt, creates assignments & snapshot steps)
  - `reviewFacilityReservationHeadAction(reservationId, { driverProfileId, layoutNotes, audioVisualNotes, comment })`
  - `approveFacilityReservationDirectorAction(reservationId, { comment })` (Atomic Re-check, Row Lock, and SLA Freshness validation)
  - `rejectFacilityReservationAction(reservationId, { reason })`
  - `cancelFacilityReservationAction(reservationId)` (Strict Cancellation Matrix)
  - `cleanupExpiredPendingReservationsAction()` (Idempotent SLA Auto-Cancel)
  - `completeVehicleTripAction(reservationId, { startMileage, endMileage, fuelCost, tripNotes })` (Post-trip freezing)

- [ ] **Step 1: Write Unit Test for Concurrency, Driver Collision, Re-check on Approval, Cancellation Matrix, and SLA Expiry**
- [ ] **Step 2: Update `FacilityReservationService` and run test suite**
- [ ] **Step 3: Implement Server Actions in `src/app/actions/facility.ts`**
- [ ] **Step 4: Run full test suite & Commit on `dev`**

```bash
npm test
git add src/app/actions/facility.ts src/lib/services/facilityReservationService.* eLeave/tests/unit/facilityReservationWorkflow.test.js
git commit -m "feat(facility): implement lifecycle status helper, idempotent SLA auto-cancel, and atomic approval re-check"
```

---

### Task 3: Capability Permissions & RBAC Matrix

**Files:**
- Modify: `src/lib/permissions.ts`
- Create: `eLeave/tests/unit/facilityPermissions.test.js`

- [ ] **Step 1: Write Unit Test for Facility Permissions**
- [ ] **Step 2: Add Facility Permission Matrix to `src/lib/permissions.ts`**
- [ ] **Step 3: Run test to verify & Commit on `dev`**

```bash
node --test eLeave/tests/unit/facilityPermissions.test.js
git add src/lib/permissions.ts eLeave/tests/unit/facilityPermissions.test.js
git commit -m "feat(facility): add capability-based permission matrix for facility and vehicle operations"
```

---

### Task 4: Atomic Single-Query Signature Token Engine

**Files:**
- Modify: `src/app/api/signatures/[userId]/route.ts`
- Create: `src/lib/signature-token.ts`
- Create: `eLeave/tests/unit/signatureTokenAuth.test.js`

- [ ] **Step 1: Implement `createScopedSignatureToken` and `verifyAndConsumeSignatureToken` with atomic single-query consumption**
- [ ] **Step 2: Update `/api/signatures/[userId]/route.ts` to support dual authentication**
- [ ] **Step 3: Write Unit Test verifying atomic single-use token consumption and replay rejection**
- [ ] **Step 4: Run test to verify & Commit on `dev`**

```bash
node --test eLeave/tests/unit/signatureTokenAuth.test.js
git add src/lib/signature-token.ts src/app/api/signatures/[userId]/route.ts eLeave/tests/unit/signatureTokenAuth.test.js
git commit -m "feat(facility): implement atomic single-query signature token consumption with anti-replay protection"
```

---

### Task 5: Real PostgreSQL Concurrency & SLA Expiry Race Integration Tests

**Files:**
- Create: `eLeave/tests/integration/facilityPostgreSqlConcurrency.test.js`
- Create: `eLeave/tests/integration/facilityPendingExpiryApprovalRace.test.js`

- [ ] **Step 1: Implement PostgreSQL concurrency test cases (Promise.all racing, code 23P01 catch, boundary half-open intervals)**
- [ ] **Step 2: Implement SLA Cleanup vs Director Approval Race simulation test**
- [ ] **Step 3: Run integration tests against database & Commit on `dev`**

```bash
node --test eLeave/tests/integration/facilityPostgreSqlConcurrency.test.js eLeave/tests/integration/facilityPendingExpiryApprovalRace.test.js
git add eLeave/tests/integration/
git commit -m "test(facility): add real PostgreSQL exclusion and SLA expiry vs approval race integration tests"
```

---

### Task 6: Thai Official A4 Print Layouts with Authorization Guard

**Files:**
- Create: `src/app/print/facility/room/[id]/page.tsx`
- Create: `src/app/print/facility/vehicle/[id]/page.tsx`

- [ ] **Step 1: Implement Authorization Guard on Print Pages**
- [ ] **Step 2: Create Meeting Room Request Print Page (`KP-FR-01`)**
- [ ] **Step 3: Create Vehicle Request & Travel Permit Print Page (`KP-FV-01`)**
- [ ] **Step 4: Commit on `dev`**

```bash
git add src/app/print/facility/
git commit -m "feat(facility): add authorized Thai A4 print layouts for meeting rooms (KP-FR-01) and vehicles (KP-FV-01)"
```

---

### Task 7: Frontend UI - Unified Facility Portal with Dropdown Mode Switcher

**Files:**
- Modify: `src/app/(app)/facility/page.tsx`
- Modify: `src/app/(app)/general/facility/page.tsx`
- Modify: `src/app/(app)/academic/facility/page.tsx`

- [ ] **Step 1: Implement Header Dropdown Mode Switcher (`🏢 ห้องประชุม` <-> `🚐 รถโรงเรียน`)**
- [ ] **Step 2: Implement Real-time Catalog View with Capacity, Equipment & Status Chips**
- [ ] **Step 3: Implement Interactive 24-Hour Timeline & Agenda Calendar Grid**
- [ ] **Step 4: Implement Multi-step Booking Form with Date-Range Picker (`startAt`, `endAt`)**
- [ ] **Step 5: Implement 2-Tier Snapshot Approval Hub with Driver Assignment Modal**
- [ ] **Step 6: Commit on `dev`**

```bash
git add src/app/\(app\)/facility/ src/app/\(app\)/general/facility/ src/app/\(app\)/academic/facility/
git commit -m "feat(facility): deliver unified portal UI with dropdown mode switcher, timeline, and snapshot approvals"
```

---

### Task 8: Full Regression Verification & System Validation

- [ ] **Step 1: Run Full Test Suite (`npm test`)**
- [ ] **Step 2: Verify zero schema, concurrency or security regressions on `dev`**
