## 2026-07-27T09:48:52Z
You are Worker M1. Your working directory is: g:\My Drive\01 Web app\01 ระบบการลา\.agents\worker_m1.

Task: Implement Milestone 1 (R1 & R2 Schema Updates):
1. Open `g:\My Drive\01 Web app\01 ระบบการลา\prisma\schema.prisma`.
2. Inspect model `SubjectOffering` and add the compound unique constraint:
   `@@unique([subjectId, teacherId, classRoomId, academicYear, term])`
3. Inspect `prisma/schema.prisma` and add model `RecommendationRun` for Recommendation Snapshots (R4 requirement):
   Check existing models (`LeaveRequest`, `TimetableSlot`) to ensure relation fields or ID fields match appropriately.
   For instance:
   ```prisma
   model RecommendationRun {
     id              String   @id @default(cuid())
     leaveRequestId  String
     timetableSlotId String
     policy          String
     candidatesJson  String
     createdAt       DateTime @default(now())

     leaveRequest    LeaveRequest  @relation(fields: [leaveRequestId], references: [id])
     timetableSlot   TimetableSlot @relation(fields: [timetableSlotId], references: [id])
   }
   ```
   Add inverse relation fields on `LeaveRequest` (e.g. `recommendationRuns RecommendationRun[]`) and `TimetableSlot` (e.g. `recommendationRuns RecommendationRun[]`) if required by Prisma validation.
4. Execute `npx prisma validate` using `run_command` in `g:\My Drive\01 Web app\01 ระบบการลา` to verify the schema is 100% valid.
5. Execute `npm test` to ensure zero test regressions.
6. Write your handoff report to `g:\My Drive\01 Web app\01 ระบบการลา\.agents\worker_m1\handoff.md` with build/validation output and test results.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Send a message back to parent when done.
