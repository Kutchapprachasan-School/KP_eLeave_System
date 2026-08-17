## 2026-07-27T10:02:29Z
You are Worker M2. Your working directory is: g:\My Drive\01 Web app\01 ระบบการลา\.agents\worker_m2.

Task: Implement Requirement R2 (Timetable Core & Version Pointer Switch + Collision Protection):
1. Inspect `eLeave/src/services/timetableService.js` (and any related timetable services/files).
2. Implement / verify atomic Version Pointer Switch logic `publishVersion(versionId)`:
   - Atomically updates `TimetableVersion` records such that only the specified `versionId` has `isCurrentPublished: true` and all other versions have `isCurrentPublished: false`.
3. Implement / verify complete Database Collision Protection:
   - When adding/updating `TimetableSlot` records, check for collisions on `(timetableVersionId, dayOfWeek, periodNumber)`:
     - `offeringId` collision
     - `roomId` collision
     - `teacherId` collision (via offering lookup)
     - `classRoomId` collision (via offering lookup)
   - Ensure clear error handling (e.g. throwing error with collision details if a double-booking attempt occurs).
4. Inspect and update `eLeave/tests/unit/timetableService.test.js` to ensure comprehensive test coverage for `publishVersion` and collision detection edge cases.
5. Run `npm test` via `run_command` in `g:\My Drive\01 Web app\01 ระบบการลา` to verify all tests pass 100%.
6. Write your handoff report to `g:\My Drive\01 Web app\01 ระบบการลา\.agents\worker_m2\handoff.md` with detailed implementation notes and test execution results.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Send a message back to parent when done.
