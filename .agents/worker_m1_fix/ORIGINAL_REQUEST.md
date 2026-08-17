## 2026-07-27T09:53:55Z
You are Worker M1_fix. Your working directory is: g:\My Drive\01 Web app\01 ระบบการลา\.agents\worker_m1_fix.

Task:
1. Open `g:\My Drive\01 Web app\01 ระบบการลา\package.json` and add `"prisma": "^5.12.0"` and `"@prisma/client": "^5.12.0"` to `"devDependencies"`.
2. Open `g:\My Drive\01 Web app\01 ระบบการลา\prisma\schema.prisma` and update `RecommendationRun` model:
   - Set `onDelete: Cascade` on `timetableSlot` relation:
     `timetableSlot TimetableSlot @relation(fields: [timetableSlotId], references: [id], onDelete: Cascade)`
   - Add indexes: `@@index([leaveRequestId])` and `@@index([timetableSlotId])`.
3. Execute `npx prisma validate` via `run_command` in `g:\My Drive\01 Web app\01 ระบบการลา` to verify.
4. Execute `npm test` to verify all 31 tests pass cleanly.
5. Write your handoff report to `g:\My Drive\01 Web app\01 ระบบการลา\.agents\worker_m1_fix\handoff.md` and send a message back to parent.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
