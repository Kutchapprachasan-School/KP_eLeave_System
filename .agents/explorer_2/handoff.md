# Handoff Report: Requirement R3 — Substitute Routing & Assignment Policies and Availability Engine

## 1. Observation
1. **Prisma Schema Location & Models (`prisma/schema.prisma`)**:
   - `AssignmentPolicyType` enum (Lines 106–110): `CENTRALIZED`, `DEPARTMENT`, `HYBRID`.
   - `SubstituteWorkflowStatus` enum (Lines 112–116): `ASSIGNED`, `ACKNOWLEDGED`, `REJECTED`.
   - `SchoolConfig` model (Lines 226–232): `assignmentPolicy AssignmentPolicyType @default(DEPARTMENT)`.
   - `SubstituteWorkflow` model (Lines 234–246): `id`, `leaveRequestId`, `timetableSlotId`, `date`, `assignedTeacherId`, `assignedBy`, `status`.
   - `TimetableSlot` & `TimetableVersion` models (Lines 194–224): Timetable scheduling structure with `isCurrentPublished` pointer.
   - `Teacher` & `Department` models (Lines 118–140): `Teacher.departmentId` reference to `Department.id`.

2. **Availability Engine Service (`eLeave/src/services/availabilityService.js`)**:
   - Lines 6–55: Implements `AvailabilityService` class.
   - `isTeacherAvailable(teacherId, dateStr, dayOfWeek, periodNumber, timetableVersionId)` checks `store.leaves` for approved leave and `store.slots` for slot bookings.
   - Currently lacks `store.workflows` integration for active substitute double-booking protection.
   - Lacks `getAvailableSubstitutes({ date, period, departmentId, policy })` unified interface method specified in `PROJECT.md` line 24.

3. **Substitute Workflow Service (`eLeave/src/services/substituteWorkflowService.js`)**:
   - Lines 17–33: `filterCandidatesByPolicy(candidates, targetDepartmentId, policyType)` correctly handles `CENTRALIZED`, `DEPARTMENT`, and `HYBRID` logic.

4. **Unit Tests (`eLeave/tests/unit/availabilityService.test.js` & `substituteWorkflowService.test.js`)**:
   - Basic unit tests exist for `isTeacherAvailable` and `filterCandidatesByPolicy`.

---

## 2. Logic Chain
1. **From Observation 1**: The data models in `prisma/schema.prisma` already support all attributes required for R3 (routing policies, teacher departments, timetable slots, substitute workflows). No additions to the database schema are required for R3.
2. **From Observation 2 & 3**: While `substituteWorkflowService.js` contains `filterCandidatesByPolicy`, `availabilityService.js` is the primary entry point for candidate availability queries required by downstream modules like `recommendationService.js`.
3. **From Observation 2**: If a teacher is already assigned to cover a substitution in `SubstituteWorkflow` (`status === 'ASSIGNED'` or `'ACKNOWLEDGED'`) on date $D$ and period $P$, they are busy. Failing to check `store.workflows` risks double-booking substitute teachers.
4. **From Observation 2 & `PROJECT.md` line 24**: Adding `getAvailableSubstitutes({ date, period, departmentId, policy, timetableVersionId, teachers })` directly to `AvailabilityService` provides the exact interface contract specified for Milestone 3 (R3), combining availability filtering and policy-based routing in a single call.

---

## 3. Caveats
- **Date Format Assumption**: `dateStr` is expected to be ISO format (e.g. `'2026-07-27'`). Automatic derivation of `dayOfWeek` relies on JavaScript `Date.prototype.getDay()` (1 = Monday, ..., 5 = Friday).
- **Recommendation Engine Integration**: Milestone 4 (`recommendationService.js`) will consume `getAvailableSubstitutes` from `availabilityService.js` to get the initial candidate pool before applying match scores and workload fairness penalties.

---

## 4. Conclusion
Requirement R3 is architecturally clear and ready for implementation during M3. The database schema in `prisma/schema.prisma` is fully prepared. The required implementation scope for M3 involves:
1. Enhancing `eLeave/src/services/availabilityService.js` to check active substitute assignments in `store.workflows`.
2. Exposing `getAvailableSubstitutes({ date, period, departmentId, policy, timetableVersionId, slotId, teachers })` in `AvailabilityService` with `CENTRALIZED`, `DEPARTMENT`, and `HYBRID` policy routing.
3. Updating unit tests in `eLeave/tests/unit/availabilityService.test.js` to cover all three policies and substitute workflow collision prevention.

---

## 5. Verification Method
1. **Files to inspect**:
   - `eLeave/src/services/availabilityService.js`
   - `eLeave/src/services/substituteWorkflowService.js`
   - `eLeave/tests/unit/availabilityService.test.js`
2. **Execution command**:
   ```bash
   npm test
   ```
   or:
   ```bash
   node --test eLeave/tests/unit/availabilityService.test.js eLeave/tests/unit/substituteWorkflowService.test.js
   ```
3. **Invalidation condition**: Any test failure or failure of `getAvailableSubstitutes` to fall back to school-wide pool when `HYBRID` policy encounters an empty department candidate pool.
