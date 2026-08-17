# Project: School Resource Orchestration Platform (SROP)

## Architecture
SROP manages school master data, timetables, teacher availability, substitute teacher routing, and recommendation engine for substitute assignments. Built on Prisma schema, Express/Node services (`availabilityService.js`, `recommendationService.js`), and Jest test suites in `eLeave/tests/unit/`.

## Code Layout
- `prisma/schema.prisma` or `eLeave/prisma/schema.prisma` - Master Data, Timetable, Substitute models
- `eLeave/src/services/availabilityService.js` - Availability Engine & Substitute Routing Policies (`CENTRALIZED`, `DEPARTMENT`, `HYBRID`)
- `eLeave/src/services/recommendationService.js` - Field-Operator-Value Rule Engine, Match Score Explainability, Workload Fairness Penalty, Recommendation Snapshots (`RecommendationRun`)
- `eLeave/tests/unit/` - Unit test suites for availabilityService, recommendationService, substituteWorkflow
- `package.json` - `npm test` script configuration

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Master Data & Subject Offering Abstraction (R1) | Verify & maintain normalized models for Teachers, Subjects, ClassRooms, Rooms, Departments, SubjectOfferings in Prisma schema | None | DONE |
| M2 | Timetable Core & Version Pointer Switch (R2) | Complete TimetableSlot and TimetableVersion with `isCurrentPublished` pointer switch & `@@unique` collision protection | M1 | DONE |
| M3 | Substitute Routing & Availability Engine (R3) | Implement availability engine, routing policies (CENTRALIZED, DEPARTMENT, HYBRID) integrated with eLeave approved leaves | M1, M2 | PLANNED |
| M4 | Recommendation Engine & Workload Fairness (R4) | Field-Operator-Value Rule Engine, Match Score Explainability breakdown, Workload Fairness Penalty, Recommendation Snapshots | M1, M2, M3 | PLANNED |
| M5 | Full Test Suite Verification (R5) | Write unit tests in `eLeave/tests/unit/`, update package.json, verify 100% pass on `npm test` | M1, M2, M3, M4 | PLANNED |
| M_E2E | E2E Testing Track | Requirement-driven opaque-box test infra & test suite (Tiers 1-4) published via TEST_READY.md | None | PLANNED |

## Interface Contracts
- `availabilityService.js`: `getAvailableSubstitutes({ date, period, departmentId, policy })`
- `recommendationService.js`: `recommendSubstitutes({ leaveRequestId, timetableSlotId, policy, options })`
