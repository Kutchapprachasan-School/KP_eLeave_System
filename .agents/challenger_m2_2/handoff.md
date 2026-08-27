# Challenger Handoff Report — Milestone 2 (M2_2)

## 1. Observation

### Implementation & Test Suite Inspection
- File inspected: `eLeave/src/services/timetableService.js` (187 lines).
- Existing test file inspected: `eLeave/tests/unit/timetableService.test.js` (259 lines).
- Test execution command: `npm test` in `g:\My Drive\01 Web app\01 ระบบการลา`.
- Result of `npm test`: **37/37 passing** (duration ~868ms).

### Code Inspection Highlights (`eLeave/src/services/timetableService.js`)
1. **Line 81**: `s.id !== slotData.id` inside `existingSlotsInTimeSlot` filter.
2. **Line 85**: `const offeringCollision = existingSlotsInTimeSlot.find(s => s.offeringId === offeringId);`
3. **Line 91**: `const roomCollision = existingSlotsInTimeSlot.find(s => s.roomId === roomId);`
4. **Line 46-48**:
   ```javascript
   const matchesScope =
     (!targetSchoolId || v.schoolId === targetSchoolId) &&
     (targetAcademicYear === undefined || v.academicYear === targetAcademicYear) &&
     (targetTerm === undefined || v.term === targetTerm);
   ```

### Empirical Stress Harness Results
Executing custom node stress scenarios revealed 3 specific edge-case failure modes:

- **Observation 1 (Null/Undefined `roomId` Collision)**:
  - Command: `node -e "..."` testing two slots with `roomId: null` or `roomId: undefined` at same version, day 1, period 1.
  - Output: `Collision Error: Room null is already occupied on Day 1, Period 1` and `Collision Error: Room undefined is already occupied on Day 1, Period 1`.
- **Observation 2 (String vs. Number ID Type Mismatch on Self Update)**:
  - Command: `node -e "..."` updating existing slot with `id: 100` (number in store) using `id: "100"` (string in payload).
  - Output: `Collision Error: Offering off-1 is already scheduled on Day 1, Period 1`.
- **Observation 3 (Unscoped Target Version Archiving)**:
  - Command: `node -e "..."` calling `publishVersion('v2')` where `v2` lacks `schoolId`.
  - Output: Archives all versions across all schools (e.g. `v3` from `SCH-X` status changed from `PUBLISHED` to `ARCHIVED`).

- **Observation 4 (Verified Core Functionality Pass)**:
  - Scoped version separation (Slot in `v1` vs `v2` at same day/period): **PASS**.
  - Duplicate offering detection in same time slot: **PASS**.
  - Duplicate physical room detection in same time slot: **PASS**.
  - Duplicate teacher detection (via offering lookup) in same time slot: **PASS**.
  - Duplicate classroom detection (via offering lookup) in same time slot: **PASS**.
  - Updating existing slot without self-collision (matching ID types): **PASS**.

---

## 2. Logic Chain

1. **Self-Collision Exclusion Logic**:
   - Observation: Line 81 uses `s.id !== slotData.id` (strict inequality) to exclude the slot currently being updated from `existingSlotsInTimeSlot`.
   - Deduction: If `slotData.id` is passed as a string `"100"` (e.g., from URL params or API JSON request) while `s.id` stored in memory is a number `100`, strict inequality evaluates to `true`.
   - Consequence: The slot fails to exclude itself from `existingSlotsInTimeSlot`, causing a false positive collision error when updating the slot's details without changing its time/room.

2. **Room and Offering Collision Logic for Unassigned / Null Fields**:
   - Observation: Lines 85 and 91 directly compare `s.offeringId === offeringId` and `s.roomId === roomId` without checking if `offeringId` or `roomId` is truthy/defined.
   - Deduction: In JS, `null === null` and `undefined === undefined` evaluate to `true`. If two slots in the same timetable version, day, and period do not have an assigned room (`roomId: null` or `undefined`), the second slot creation will match the first slot.
   - Consequence: The service throws `Collision Error: Room null is already occupied...`, preventing users from scheduling multiple unassigned-room slots concurrently.

3. **Version Switch Scope Resolution**:
   - Observation: Lines 46-48 evaluate `!targetSchoolId` when matching version scope during `publishVersion`.
   - Deduction: If the target version object does not define `schoolId` (`targetSchoolId = undefined`), `!targetSchoolId` evaluates to `true` for every version in `store.versions`.
   - Consequence: Target version switch unintentionally deactivates and archives published versions from unrelated schools.

4. **Milestone Core Requirements**:
   - Observation: All 37 existing unit and E2E tests pass via `npm test`. Version isolation by `timetableVersionId` and basic 4-way collision protection (offering, room, teacher, classroom) operate as specified.
   - Deduction: Core Milestone 2 functionality is functional under happy-path conditions, but vulnerable under edge cases (unassigned rooms, loose type IDs, incomplete target version metadata).

---

## 3. Caveats

- **No Code Changes Made**: In accordance with the Review-only constraint, no fixes were applied to `timetableService.js`.
- **Database Layer Absence**: The current `timetableService.js` operates on an in-memory `store` object. Production database integration (e.g., Prisma / PostgreSQL) may enforce numeric vs string IDs or schema constraints (e.g., non-null `roomId`).

---

## 4. Conclusion

Milestone 2 (R2 Timetable Core & Version Pointer Switch + Collision Protection) is **PASS WITH CONDITIONAL ISSUES**.

The baseline functionality and all existing test suites (`npm test`) pass completely. Collision protection successfully prevents double-booking of offerings, rooms, teachers, and classrooms, and version separation prevents cross-version collisions. However, empirical stress testing identified three edge-case vulnerabilities that should be remediated in future refactoring:
1. False-positive room collision when `roomId` is `null`/`undefined`.
2. False-positive self-collision when slot `id` types mismatch (string vs number).
3. Overscoped version archiving when target version lacks `schoolId`.

---

## 5. Verification Method

To independently verify these findings, run the following commands in `g:\My Drive\01 Web app\01 ระบบการลา`:

1. **Run full standard test suite**:
   ```bash
   npm test
   ```
   *Expected result*: 37 tests passing.

2. **Run empirical stress test script**:
   ```bash
   node -e "
   import('./eLeave/src/services/timetableService.js').then(({ TimetableService }) => {
     // Test Null RoomId
     const s1 = new TimetableService({ slots: [{ id: 's1', timetableVersionId: 'v1', offeringId: 'off-1', roomId: null, dayOfWeek: 1, periodNumber: 1 }] });
     try { s1.createOrUpdateSlot({ id: 's2', timetableVersionId: 'v1', offeringId: 'off-2', roomId: null, dayOfWeek: 1, periodNumber: 1 }); }
     catch (e) { console.log('Null Room Error:', e.message); }

     // Test Type Mismatch
     const s2 = new TimetableService({ slots: [{ id: 100, timetableVersionId: 'v1', offeringId: 'off-1', roomId: 'r-1', dayOfWeek: 1, periodNumber: 1 }] });
     try { s2.createOrUpdateSlot({ id: '100', timetableVersionId: 'v1', offeringId: 'off-1', roomId: 'r-1', dayOfWeek: 1, periodNumber: 1 }); }
     catch (e) { console.log('Type Mismatch Error:', e.message); }
   });
   "
   ```
   *Expected output*: Output contains `Collision Error: Room null is already occupied` and `Collision Error: Offering off-1 is already scheduled`.
