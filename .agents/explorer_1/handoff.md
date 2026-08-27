# Handoff Report: SROP Requirements R1 & R2 Prisma Schema Audit

## 1. Observation
- **Prisma Schema Location**: `g:\My Drive\01 Web app\01 ระบบการลา\prisma\schema.prisma`
- **Line 118–192 (Master Data & Offering Abstraction)**:
  - Models `Department` (line 118), `Teacher` (line 128), `Subject` (line 142), `ClassRoom` (line 154), `Room` (line 166), and `SubjectOffering` (line 177) exist.
  - `ClassRoom` has `@@unique([gradeLevel, roomNumber])` (line 163).
  - `SubjectOffering` (line 177) only has `@@index([academicYear, term])` (line 191) with no compound `@unique` constraint.
- **Line 194–225 (Timetable Core & Version Switch)**:
  - Model `TimetableVersion` (line 194) contains `isCurrentPublished Boolean @default(false)` (line 201).
  - Model `TimetableSlot` (line 209) contains two unique constraints:
    - `@@unique([timetableVersionId, offeringId, dayOfWeek, periodNumber])` (line 223)
    - `@@unique([timetableVersionId, roomId, dayOfWeek, periodNumber])` (line 224)
- **Codebase Scope**:
  - `eLeave/prisma/schema.prisma` does not exist; only root `prisma/schema.prisma` is used.
  - SROP service specifications are defined in `.agents/orchestrator/PROJECT.md` and `.agents/orchestrator/plan.md`.

## 2. Logic Chain
1. **R1 Evaluation**:
   - Master Data models (`Teacher`, `Subject`, `ClassRoom`, `Room`, `Department`) are defined with primary keys and relationships.
   - `SubjectOffering` acts as an abstraction layer binding subject, teacher, classroom, academic year, and term.
   - Without `@@unique([subjectId, teacherId, classRoomId, academicYear, term])`, duplicate offerings for the same teacher/classroom/subject within the same term can be created.
2. **R2 Evaluation**:
   - `TimetableVersion.isCurrentPublished` allows tagging active timetable versions. However, because SQL boolean flags without partial unique indexes do not restrict `true` to a single row, version pointer switching must be managed via an atomic update transaction (`updateMany` to false, then `update` to true).
   - `TimetableSlot` prevents duplicate slot booking for the *same* `offeringId` and double booking of the *same* `roomId`.
   - However, since `teacherId` and `classRoomId` live inside `SubjectOffering`, scheduling two different offerings (`Offering A` and `Offering B`) taught by the same teacher (or assigned to the same classroom) at the same `dayOfWeek` and `periodNumber` is NOT blocked by DB constraints. Therefore, teacher/classroom collision checks must be enforced at the service layer or via denormalized unique constraints.

## 3. Caveats
- Database migration (`npx prisma migrate dev`) was not run as this is a read-only investigation task.
- PostgreSQL-specific partial unique index syntax requires raw SQL migration if enforced at the database engine level instead of Prisma client application level.

## 4. Conclusion
- The Prisma schema at `prisma/schema.prisma` already contains all core models for Requirement R1 and Requirement R2.
- **R1 Required Enhancement**: Add compound unique constraint `@@unique([subjectId, teacherId, classRoomId, academicYear, term])` to `SubjectOffering`.
- **R2 Required Enhancement**: Implement atomic pointer-switch logic in the service layer for `isCurrentPublished` and implement teacher/classroom collision validation in the timetable service to complement the existing room and offering DB constraints.

## 5. Verification Method
1. Inspect `prisma/schema.prisma` at lines 118–225 to verify models and constraints.
2. Run `npx prisma validate` from `g:\My Drive\01 Web app\01 ระบบการลา` to verify Prisma schema syntax correctness.
3. Reference `analysis.md` in `g:\My Drive\01 Web app\01 ระบบการลา\.agents\explorer_1\analysis.md` for complete breakdown.
