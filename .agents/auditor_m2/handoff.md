# Forensic Audit Report — Milestone 2 (R2 Timetable Core & Version Pointer Switch + Collision Protection)

**Work Product**: `eLeave/src/services/timetableService.js` and `eLeave/tests/unit/timetableService.test.js`
**Profile**: General Project (Forensic Integrity Audit)
**Verdict**: CLEAN

---

## 1. Observation

### Source Code Analysis (`eLeave/src/services/timetableService.js`)
- **Version Pointer Switch (`publishVersion`, lines 17–66)**:
  - Line 34–37: Locates `targetVersionId` in `store.versions`; throws `Error("TimetableVersion <id> not found")` if missing.
  - Lines 44–63: Scopes versions by `schoolId`, `academicYear`, `term`. For matching versions:
    - Target version: sets `v.status = 'PUBLISHED'`, `v.isCurrentPublished = true`, updates `updatedAt`.
    - Non-target versions: sets `v.isCurrentPublished = false`, changes `status = 'PUBLISHED'` to `status = 'ARCHIVED'`, updates `updatedAt`.
- **4-Way Collision Protection (`createOrUpdateSlot`, lines 73–123)**:
  - Lines 77–82: Filters existing slots in target version, day, and period, excluding self (`s.id !== slotData.id`).
  - Dimension 1 (Offering Collision, lines 85–88): Throws `Collision Error: Offering <id> is already scheduled on Day <day>, Period <period>` if duplicate `offeringId`.
  - Dimension 2 (Room Collision, lines 91–94): Throws `Collision Error: Room <id> is already occupied on Day <day>, Period <period>` if duplicate `roomId`.
  - Lookup Offering Details (lines 97–123): Resolves target offering's `teacherId` and `classRoomId` from `store.offerings`.
  - Dimension 3 (Teacher Collision, lines 101–110): Throws `Collision Error: Teacher <teacherId> is already scheduled on Day <day>, Period <period>` if any scheduled slot's offering shares `teacherId`.
  - Dimension 4 (ClassRoom Collision, lines 113–122): Throws `Collision Error: ClassRoom <classRoomId> is already scheduled on Day <day>, Period <period>` if any scheduled slot's offering shares `classRoomId`.
- **Slot Store Persistence (lines 126–160)**:
  - Updates existing slot if `slotData.id` is provided or pushes new slot record with `createdAt`/`updatedAt`.

### Hardcode and Facade Inspection
- Grep search for `mock`, `dummy`, `todo`, `fixme`, `hardcode` in `eLeave/src/services/timetableService.js` returned **0 results**.
- No static values or facade return statements detected. Logic evaluates dynamic state from `this.store`.

### Independent Test Execution Command & Output
- **Command**: `npm test` in `g:\My Drive\01 Web app\01 ระบบการลา`
- **Output Summary**:
  ```
  ✔ TimetableService - Version Pointer Switch correctly publishes target and archives old version (4-param signature) (5.8292ms)
  ✔ TimetableService - Version Pointer Switch publishVersion(versionId) single-parameter switch (0.4598ms)
  ✔ TimetableService - Version Pointer Switch throws error when target versionId does not exist (0.8477ms)
  ✔ TimetableService - Collision Protection prevents double booking of Offering in same Day & Period (0.5906ms)
  ✔ TimetableService - Collision Protection prevents double booking of Room in same Day & Period (0.3178ms)
  ✔ TimetableService - Collision Protection prevents double booking of Teacher via offering lookup in same Day & Period (0.4182ms)
  ✔ TimetableService - Collision Protection prevents double booking of ClassRoom via offering lookup in same Day & Period (0.3167ms)
  ✔ TimetableService - Allows updating an existing slot without self-collision (0.2957ms)
  ✔ TimetableService - Allows scheduling same offering/room in different periods or timetable versions (0.6574ms)
  ✔ TimetableService - Correctly filters available teachers for a slot (2.1748ms)

  ℹ tests 37
  ℹ pass 37
  ℹ fail 0
  ```

---

## 2. Logic Chain

1. **Version Pointer Switch Verification**:
   - Observation: `publishVersion` iterates over all versions in the specified scope, changing the target version to `PUBLISHED`/`isCurrentPublished = true` and setting previous `PUBLISHED` versions to `ARCHIVED`/`isCurrentPublished = false`.
   - Inference: Pointer switch operation is atomic across the version store scope and guarantees that at most one version is active (`isCurrentPublished = true`) per scope.
2. **4-Way Collision Protection Verification**:
   - Observation: `createOrUpdateSlot` evaluates four distinct collision vectors (Offering ID, Room ID, Teacher ID via offering lookup, and ClassRoom ID via offering lookup) against existing slots in the same timetable version, day, and period.
   - Inference: All four dimensions of slot collision protection are authentically implemented and raise explicit error messages when violated.
3. **Integrity Violations Check**:
   - Observation: Source code analysis confirmed no fixed return values, pre-calculated results, mock facades, or prohibited dependencies.
   - Inference: Implementation is genuine and authentic under standard project integrity standards.
4. **Independent Execution Verification**:
   - Observation: `npm test` ran 37 test cases cleanly, including 10 dedicated `TimetableService` unit test cases.
   - Inference: The functionality operates correctly and passes all automated test suites without regressions.

---

## 3. Caveats

- `TimetableService` operates on an in-memory data store structure (`this.store`). Persistent database transaction isolation (e.g. Prisma DB transactions) should be verified if integrated at the database layer in future milestones.
- No other caveats identified.

---

## 4. Conclusion

**Verdict**: CLEAN

Milestone 2 (`TimetableService`) contains genuine, authentic implementation of atomic version pointer switching and 4-way slot collision protection (Offering, Room, Teacher, and ClassRoom). Zero integrity violations, facades, or hardcoded shortcuts were detected. All unit and E2E tests pass cleanly (37/37).

---

## 5. Verification Method

To independently verify this audit:

1. Inspect source code:
   - View `g:\My Drive\01 Web app\01 ระบบการลา\eLeave\src\services\timetableService.js` (lines 17–161).
2. Inspect unit tests:
   - View `g:\My Drive\01 Web app\01 ระบบการลา\eLeave\tests\unit\timetableService.test.js`.
3. Run automated tests:
   ```bash
   cd "g:\My Drive\01 Web app\01 ระบบการลา"
   npm test
   ```
4. Verify edge cases via Node CLI:
   ```bash
   node -e "import('./eLeave/src/services/timetableService.js').then(({TimetableService}) => { const store = { versions: [{id:'v1', status:'PUBLISHED', isCurrentPublished:true}, {id:'v2', status:'DRAFT', isCurrentPublished:false}], slots: [], offerings: [{id:'o1', teacherId:'t1', classRoomId:'c1'}, {id:'o2', teacherId:'t1', classRoomId:'c2'}], rooms: [] }; const s = new TimetableService(store); s.publishVersion('v2'); s.createOrUpdateSlot({timetableVersionId:'v2', offeringId:'o1', roomId:'r1', dayOfWeek:1, periodNumber:1}); console.log('Store state after operations:', store); })"
   ```
