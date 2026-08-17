# Challenger Report — Milestone 1 (R1 & R2 Schema Updates)

## 1. Observation
- Tested `npx prisma validate` in project root `g:\My Drive\01 Web app\01 ระบบการลา`:
  - Bare command `npx prisma validate` downloads Prisma CLI 7.9.0 and fails with:
    `Error code: P1012 error: The datasource property url is no longer supported in schema files.`
  - Pinned command `npx --yes prisma@5 validate` without `DATABASE_URL` fails with:
    `Error code: P1012 error: Environment variable not found: DATABASE_URL.`
  - Command with dummy env variable `$env:DATABASE_URL='postgresql://dummy:dummy@localhost:5432/dummy'; npx --yes prisma@5 validate` succeeds with:
    `Prisma schema loaded from prisma\schema.prisma`
    `The schema at prisma\schema.prisma is valid 🚀`
- Tested `npm test`:
  - 9 test files executed (31 unit/E2E tests total).
  - All 31 tests passed in 531ms (0 failures, 0 skipped).
- Inspected `prisma/schema.prisma` model definitions:
  - `SubjectOffering` contains compound constraint `@@unique([subjectId, teacherId, classRoomId, academicYear, term])`.
  - `RecommendationRun` contains `timetableSlot TimetableSlot @relation(fields: [timetableSlotId], references: [id])`.
  - `RecommendationRun` lacks `onDelete: Cascade` or `onDelete: SetNull`.
  - `RecommendationRun` lacks index `@@index([leaveRequestId])` and `@@index([timetableSlotId])`.
- Checked `package.json`:
  - `prisma` and `@prisma/client` are missing from `dependencies` and `devDependencies`.

## 2. Logic Chain
1. Requirement R1 & R2 specified schema models for core master data, timetable core, version pointer switch, and recommendation snapshot logging (`RecommendationRun`).
2. Schema validation check confirmed `prisma/schema.prisma` is syntactically valid under Prisma 5 syntax, provided `DATABASE_URL` is set in the shell environment.
3. Test suite execution via `npm test` passed 31/31 tests, confirming zero regressions in existing code.
4. Stress-testing schema relational cascade rules revealed that deleting a `TimetableVersion` cascades deletion to its `TimetableSlot` records (`onDelete: Cascade`). However, because `RecommendationRun.timetableSlot` relation has no explicit `onDelete` policy, PostgreSQL will default to `RESTRICT` (`NoAction`), causing `DELETE FROM "TimetableVersion"` queries to crash with foreign key constraint errors whenever recommendation snapshot rows exist.
5. Query pattern analysis revealed `RecommendationRun` will be queried by `leaveRequestId` or `timetableSlotId` during substitute recommendation audits. The absence of `@@index([leaveRequestId])` and `@@index([timetableSlotId])` will cause linear table scans.
6. Execution environment analysis revealed that without `prisma` pinned in `package.json`, running `npx prisma` executes the latest unpinned Prisma CLI (v7.9.0), breaking `schema.prisma` parsing due to Prisma v7's removal of `url = env("DATABASE_URL")`.

## 3. Caveats
- Real PostgreSQL database execution of `prisma migrate dev` could not be tested directly because a live PostgreSQL server was not running during this static/CLI verification step.
- `LeaveRequest` continues to be modeled as an external scalar string `leaveRequestId String` in `RecommendationRun` and `SubstituteWorkflow`. If a standalone Prisma `LeaveRequest` model is created in future milestones, foreign keys and index strategies will need to be aligned.

## 4. Conclusion
Milestone 1 schema updates are **syntactically valid under Prisma v5** and **all 31 automated tests pass**. However, **two medium schema vulnerabilities** and **one environment vulnerability** were discovered:
1. **Foreign Key Cascade Risk**: Deleting a `TimetableVersion` or `TimetableSlot` will fail if `RecommendationRun` records exist, because `RecommendationRun.timetableSlot` lacks `onDelete: Cascade`.
2. **Missing Database Indexes**: `RecommendationRun` lacks indexes on `leaveRequestId` and `timetableSlotId`.
3. **Prisma CLI Version Drift**: Missing `prisma` dependency in `package.json` causes `npx prisma validate` to fail on newer Prisma CLI versions.

## 5. Verification Method
- Execute Prisma 5 validation with environment setup:
  ```powershell
  $env:DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"; npx --yes prisma@5 validate
  ```
- Execute automated test suite:
  ```powershell
  npm test
  ```
- Execute empirical schema check script:
  ```powershell
  node ".agents/challenger_m1_1/test_schema_edge_cases.js"
  ```

---

## Challenge Summary

**Overall risk assessment**: MEDIUM

## Challenges

### [Medium] Challenge 1: Unhandled Foreign Key Cascade on `RecommendationRun`
- **Assumption challenged**: Assuming `TimetableVersion` can be deleted or replaced safely when `RecommendationRun` snapshot rows exist.
- **Attack scenario**: A user creates recommendation runs for a timetable slot, then an admin archives or deletes the `TimetableVersion`. PostgreSQL rejects the delete operation with foreign key error `violates foreign key constraint`.
- **Blast radius**: Admin operations deleting draft/archived timetable versions will fail unexpectedly.
- **Mitigation**: Add `onDelete: Cascade` to `RecommendationRun.timetableSlot`:
  ```prisma
  timetableSlot TimetableSlot @relation(fields: [timetableSlotId], references: [id], onDelete: Cascade)
  ```

### [Medium] Challenge 2: Missing Indexes on `RecommendationRun` Lookup Keys
- **Assumption challenged**: Assuming `RecommendationRun` table lookups will remain performant without database indexes.
- **Attack scenario**: As substitute recommendations accumulate over multiple academic terms, querying recommendation runs by `leaveRequestId` or `timetableSlotId` will perform full table scans, increasing DB query latency.
- **Blast radius**: Performance degradation on substitute audit and history queries.
- **Mitigation**: Add indexes to `RecommendationRun`:
  ```prisma
  @@index([leaveRequestId])
  @@index([timetableSlotId])
  ```

### [Low] Challenge 3: Unpinned Prisma CLI Version in Project Dependencies
- **Assumption challenged**: Assuming `npx prisma` will consistently run a compatible Prisma version across developer machines and CI pipelines.
- **Attack scenario**: `npx prisma validate` or `npx prisma generate` runs Prisma 7.x by default, failing due to breaking changes in `schema.prisma` syntax (`url` in `datasource`).
- **Blast radius**: Build and deployment pipeline failures on systems without global/local Prisma 5 installation.
- **Mitigation**: Add `"prisma": "^5.22.0"` and `"@prisma/client": "^5.22.0"` to `package.json` `devDependencies` / `dependencies`.

## Stress Test Results

| Scenario | Expected Behavior | Actual Behavior | Result |
| :--- | :--- | :--- | :--- |
| `npx prisma validate` without pinned version | Clean validation output | Fails on Prisma 7.9.0 with `P1012: url no longer supported` | ❌ FAIL (Env Dependency) |
| `npx --yes prisma@5 validate` with `DATABASE_URL` | Schema validation succeeds | Returns `The schema at prisma\schema.prisma is valid 🚀` | ✅ PASS |
| `npm test` execution | All 31 tests pass | 31 passed, 0 failed (duration 531ms) | ✅ PASS |
| `SubjectOffering` compound unique check | `@@unique` constraint present | Found `@@unique([subjectId, teacherId, classRoomId, academicYear, term])` | ✅ PASS |
| `RecommendationRun` relational integrity | Cascade delete configured | Missing `onDelete` rule (defaults to restrict) | ⚠️ WARN |
| `RecommendationRun` lookup indexing | Indexes present on foreign keys | No `@@index` defined on `RecommendationRun` | ⚠️ WARN |

## Unchallenged Areas
- Direct SQL schema migration generation (`prisma migrate dev`) — Reason: Live PostgreSQL connection not available in local environment.
