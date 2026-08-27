# Analysis Report: Requirement R3 — Substitute Routing & Assignment Policies and Availability Engine

## Executive Summary
This analysis evaluates Requirement R3 for the School Resource Orchestration Platform (SROP). Requirement R3 encompasses the **Availability Engine** and **Substitute Routing & Assignment Policies** (`CENTRALIZED`, `DEPARTMENT`, `HYBRID`) located in `eLeave/src/services/availabilityService.js` and `eLeave/src/services/substituteWorkflowService.js`.

The analysis establishes that while basic skeleton structures exist in `availabilityService.js` and `substituteWorkflowService.js`, full integration of the routing policies into `availabilityService.js` via the unified contract `getAvailableSubstitutes({ date, period, departmentId, policy, timetableVersionId, teachers })` is required. Furthermore, the Availability Engine must account for active substitute workflow assignments (`SubstituteWorkflow`) to avoid double-booking substitute teachers.

---

## 1. Requirement Scope & Objectives
Requirement R3 mandates:
1. **Availability Engine**: Determining teacher availability for a given date, day of week, and period number based on:
   - Approved eLeave requests (`status === 'APPROVED'`).
   - Published timetable slot bookings (`TimetableSlot` & `SubjectOffering`).
   - Active substitute workflow assignments (`SubstituteWorkflow` with status `ASSIGNED` or `ACKNOWLEDGED`).
2. **Substitute Routing Policies**: Filtering available substitute candidates according to the school's `AssignmentPolicyType`:
   - `CENTRALIZED`: All available teachers across the school are candidates.
   - `DEPARTMENT`: Only available teachers within the same department (`departmentId === targetDepartmentId`) are candidates.
   - `HYBRID`: Tries department-level candidates first; if no teachers in the department are available, falls back to the school-wide candidate pool.
3. **Unified Service Interface**: Exposing `getAvailableSubstitutes({ date, period, departmentId, policy, timetableVersionId, teachers })` in `eLeave/src/services/availabilityService.js`.

---

## 2. Database Models & Schema Relations Analysis
The Prisma schema (`prisma/schema.prisma`) defines all core models required for Requirement R3:

| Enum / Model | Primary Purpose | Key Fields / Relations | Relevant Line Numbers (`schema.prisma`) |
|--------------|-----------------|------------------------|---------------------------------------|
| `AssignmentPolicyType` | Enum defining routing policies | `CENTRALIZED`, `DEPARTMENT`, `HYBRID` | Lines 106–110 |
| `SubstituteWorkflowStatus` | Enum for workflow status | `ASSIGNED`, `ACKNOWLEDGED`, `REJECTED` | Lines 112–116 |
| `Department` | Department master data | `id`, `code`, `name`, `teachers`, `subjects` | Lines 118–126 |
| `Teacher` | Teacher master data | `id`, `employeeCode`, `departmentId`, `maxWeeklyPeriods` | Lines 128–140 |
| `SubjectOffering` | Abstraction linking teacher, subject, classroom | `id`, `subjectId`, `teacherId`, `classRoomId`, `academicYear`, `term` | Lines 177–192 |
| `TimetableVersion` | Versioning for school schedule | `id`, `schoolId`, `academicYear`, `term`, `status`, `isCurrentPublished` | Lines 194–207 |
| `TimetableSlot` | Specific period assignment | `id`, `timetableVersionId`, `offeringId`, `roomId`, `dayOfWeek`, `periodNumber` | Lines 209–224 |
| `SchoolConfig` | School settings including policy | `id`, `schoolId` (@unique), `assignmentPolicy` | Lines 226–232 |
| `SubstituteWorkflow` | Substitute assignment record | `id`, `leaveRequestId`, `timetableSlotId`, `date`, `assignedTeacherId`, `status` | Lines 234–246 |

### Relational Dynamics:
1. **Teacher to TimetableSlot**: `TimetableSlot` -> `SubjectOffering` -> `Teacher`. A teacher is busy during period $P$ on day $D$ of version $V$ if a `TimetableSlot` exists matching $(V, D, P)$ where `offering.teacherId == teacher.id`.
2. **Teacher to Approved Leave**: A teacher is on leave on date $T$ if an eLeave record exists where `leave.teacherId == teacher.id`, `leave.status == 'APPROVED'`, and `startDate <= T <= endDate`.
3. **Teacher to Substitute Assignment**: A teacher is already substituting on date $T$ and slot $S$ if a `SubstituteWorkflow` record exists where `assignedTeacherId == teacher.id`, `date == T`, `timetableSlotId == S`, and `status IN ['ASSIGNED', 'ACKNOWLEDGED']`.

---

## 3. Existing Availability Logic Analysis (`availabilityService.js`)

### Current File Content Inspection
File: `eLeave/src/services/availabilityService.js` (Lines 1–56)
- Implements `AvailabilityService` with `store = { slots: [], offerings: [], leaves: [] }`.
- `isTeacherAvailable(teacherId, dateStr, dayOfWeek, periodNumber, timetableVersionId)`:
  - Step 1: Checks `store.leaves` for `status === 'APPROVED'` and target date within `[startDate, endDate]`.
  - Step 2: Checks `store.slots` for matching `timetableVersionId`, `offering.teacherId`, `dayOfWeek`, and `periodNumber`.
- `getAvailableCandidates(teachers, dateStr, dayOfWeek, periodNumber, timetableVersionId)`:
  - Filters `teachers` using `isTeacherAvailable`.

### Identified Deficiencies & Gaps in `availabilityService.js`:
1. **Missing Substitute Workflow Store & Check**: `store.workflows` (active substitute assignments) is not checked. If Teacher A is already assigned to substitute in Period 2 on Date D, Teacher A would incorrectly be flagged as available for another substitution in Period 2 on Date D.
2. **Missing `getAvailableSubstitutes` Contract Method**: `PROJECT.md` specifies `getAvailableSubstitutes({ date, period, departmentId, policy })`. Currently `availabilityService.js` only provides `getAvailableCandidates(...)` without policy routing.
3. **Automatic `dayOfWeek` Derivation**: `isTeacherAvailable` requires caller to pass `dayOfWeek`. When calling with `dateStr` (e.g. `'2026-07-27'`), the engine should automatically calculate `dayOfWeek` (1 = Monday, ..., 5 = Friday) if `dayOfWeek` is null or undefined.
4. **Current Published Version Fallback**: If `timetableVersionId` is omitted, the engine should automatically target slots under `isCurrentPublished === true` or match any active slot for that version.

---

## 4. Substitute Routing Policies Analysis (`substituteWorkflowService.js` & `availabilityService.js`)

### Current File Content Inspection
File: `eLeave/src/services/substituteWorkflowService.js` (Lines 1–73)
- Implements `filterCandidatesByPolicy(candidates, targetDepartmentId, policyType = 'DEPARTMENT')`:
  - `CENTRALIZED`: Returns `candidates` directly without department filter.
  - `DEPARTMENT`: Filters `candidates` where `c.departmentId === targetDepartmentId`.
  - `HYBRID`: Checks `sameDeptCandidates`. If `sameDeptCandidates.length > 0`, returns `sameDeptCandidates`. Otherwise, returns `candidates` (school-wide fallback).

### Policy Specification & Behavior Matrix

| Policy | Primary Pool | Fallback Pool | Logic |
|--------|--------------|---------------|-------|
| `CENTRALIZED` | All Available Teachers | N/A | Return all teachers who are available at $(date, period)$. |
| `DEPARTMENT` | Available Teachers in `targetDepartmentId` | None | Return only teachers in `targetDepartmentId` who are available at $(date, period)$. |
| `HYBRID` | Available Teachers in `targetDepartmentId` | All Available Teachers | Filter available teachers by department. If count > 0, return them. If count == 0, return all available teachers across school. |

---

## 5. Blueprint for Proposed Implementation

### 5.1 Proposed Code Patch for `eLeave/src/services/availabilityService.js`

```javascript
/**
 * SROP Phase 2 & 3: Availability Engine Service
 * Checks teacher availability across Timetable Slots, Approved Leaves, and Active Substitute Workflows.
 * Implements Policy Routing (CENTRALIZED, DEPARTMENT, HYBRID).
 */

export class AvailabilityService {
  constructor(store = { slots: [], offerings: [], leaves: [], workflows: [] }) {
    this.store = {
      slots: [],
      offerings: [],
      leaves: [],
      workflows: [],
      ...store
    };
  }

  /**
   * Helper to derive 1-indexed dayOfWeek (1=Mon, ..., 5=Fri) from a date string if not explicitly passed
   */
  static getDayOfWeekFromDate(dateStr) {
    const d = new Date(dateStr);
    const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    return day === 0 ? 7 : day;
  }

  /**
   * Check if a specific teacher is available on a given date, dayOfWeek, and periodNumber.
   */
  isTeacherAvailable(teacherId, dateStr, dayOfWeek, periodNumber, timetableVersionId = null, slotId = null) {
    const targetDateStr = typeof dateStr === 'string' ? dateStr.split('T')[0] : new Date(dateStr).toISOString().split('T')[0];
    const computedDayOfWeek = dayOfWeek || AvailabilityService.getDayOfWeekFromDate(dateStr);

    // 1. Check Approved Leaves
    const isLeaved = (this.store.leaves || []).some(leave => {
      if (leave.teacherId !== teacherId) return false;
      if (leave.status !== 'APPROVED') return false;

      const targetTime = new Date(targetDateStr).getTime();
      const startTime = new Date(leave.startDate.split('T')[0]).getTime();
      const endTime = new Date(leave.endDate.split('T')[0]).getTime();

      return targetTime >= startTime && targetTime <= endTime;
    });

    if (isLeaved) return false;

    // 2. Check Timetable Slot booking
    const teacherOfferingIds = new Set(
      (this.store.offerings || []).filter(o => o.teacherId === teacherId).map(o => o.id)
    );

    const isSlotBooked = (this.store.slots || []).some(slot => {
      if (timetableVersionId && slot.timetableVersionId !== timetableVersionId) return false;
      return (
        teacherOfferingIds.has(slot.offeringId) &&
        slot.dayOfWeek === computedDayOfWeek &&
        slot.periodNumber === periodNumber
      );
    });

    if (isSlotBooked) return false;

    // 3. Check Active Substitute Workflows (double-booking protection)
    const isSubbing = (this.store.workflows || []).some(wf => {
      if (wf.assignedTeacherId !== teacherId) return false;
      if (!['ASSIGNED', 'ACKNOWLEDGED'].includes(wf.status)) return false;

      const wfDateStr = typeof wf.date === 'string' ? wf.date.split('T')[0] : new Date(wf.date).toISOString().split('T')[0];
      if (wfDateStr !== targetDateStr) return false;

      if (slotId && wf.timetableSlotId === slotId) return true;

      // If slot details match via slot object lookup
      if (wf.timetableSlotId) {
        const wfSlot = (this.store.slots || []).find(s => s.id === wf.timetableSlotId);
        if (wfSlot && wfSlot.dayOfWeek === computedDayOfWeek && wfSlot.periodNumber === periodNumber) {
          return true;
        }
      }
      return false;
    });

    return !isSubbing;
  }

  /**
   * Filter candidate pool for available teachers
   */
  getAvailableCandidates(teachers, dateStr, dayOfWeek, periodNumber, timetableVersionId = null, slotId = null) {
    return teachers.filter(t =>
      this.isTeacherAvailable(t.id, dateStr, dayOfWeek, periodNumber, timetableVersionId, slotId)
    );
  }

  /**
   * R3 Interface Contract: Combined Availability Engine & Substitute Routing Policy
   */
  getAvailableSubstitutes({ date, period, dayOfWeek, departmentId, policy = 'DEPARTMENT', timetableVersionId = null, slotId = null, teachers = [] }) {
    const computedDayOfWeek = dayOfWeek || AvailabilityService.getDayOfWeekFromDate(date);
    const availableTeachers = this.getAvailableCandidates(teachers, date, computedDayOfWeek, period, timetableVersionId, slotId);

    if (policy === 'CENTRALIZED') {
      return availableTeachers;
    }

    const sameDeptAvailable = availableTeachers.filter(t => t.departmentId === departmentId);

    if (policy === 'DEPARTMENT') {
      return sameDeptAvailable;
    }

    if (policy === 'HYBRID') {
      return sameDeptAvailable.length > 0 ? sameDeptAvailable : availableTeachers;
    }

    return availableTeachers;
  }
}
```

---

## 6. Verification Method & Edge Test Cases

### 6.1 Executable Verification Command
```bash
npm test
```
Or running unit tests explicitly:
```bash
node --test eLeave/tests/unit/availabilityService.test.js eLeave/tests/unit/substituteWorkflowService.test.js
```

### 6.2 Key Test Scenarios for R3:
1. **Leave Filtering Test**: Confirm teacher with `APPROVED` leave in date range returns `false` from `isTeacherAvailable`.
2. **Timetable Collision Test**: Confirm teacher with slot booking at `(dayOfWeek, periodNumber)` returns `false`.
3. **Substitute Workflow Collision Test**: Confirm teacher assigned as substitute on `(date, period)` returns `false` (prevents double-booking).
4. **Policy Routing Tests**:
   - `CENTRALIZED`: Returns all available teachers across departments.
   - `DEPARTMENT`: Returns only available teachers matching `departmentId`.
   - `HYBRID`: Returns department teachers when available; falls back to all school available teachers when department pool is empty.

---

## 7. Conclusion & Next Steps
- **Readiness**: All Prisma schema models (`SchoolConfig`, `AssignmentPolicyType`, `SubstituteWorkflow`, `TimetableSlot`, `Teacher`, `Department`) are already declared and normalized.
- **Service Enhancement**: `eLeave/src/services/availabilityService.js` needs to be updated with `getAvailableSubstitutes` and substitute workflow collision checking.
- **Handoff**: Findings documented in `analysis.md` and summarized in `handoff.md`.
