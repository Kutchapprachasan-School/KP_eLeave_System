# Implementation Plan — SROP (Requirements R1 - R5)

## Overview
This plan breaks down the School Resource Orchestration Platform (SROP) implementation into milestone phases following the Project Orchestrator pattern.

## Milestone Breakdown

### Milestone 1 (R1): Core Master Data & Subject Offering Abstraction
- Objective: Verify and maintain normalized Prisma schema models for Teacher, Subject, ClassRoom, Room, Department, and SubjectOffering.
- Verification: Prisma validation/migration check.

### Milestone 2 (R2): Timetable Core & Version Pointer Switch
- Objective: Implement `TimetableSlot` and `TimetableVersion` models with `isCurrentPublished` version pointer switch and `@@unique` collision protection constraints.
- Verification: Schema constraint validation and unit tests for version switching.

### Milestone 3 (R3): Substitute Routing & Assignment Policies & Availability Engine
- Objective: Implement `eLeave/src/services/availabilityService.js` and substitute workflow policies (`CENTRALIZED`, `DEPARTMENT`, `HYBRID`). Integrate with eLeave approved leaves.
- Verification: Availability engine logic tests and policy routing verification.

### Milestone 4 (R4): Recommendation Engine & Workload Fairness
- Objective: Implement `eLeave/src/services/recommendationService.js` with Field-Operator-Value Rule Engine, Match Score Explainability breakdown, Workload Fairness Penalty based on substitution history, and Recommendation Snapshots (`RecommendationRun`).
- Verification: Recommendation engine tests and score explainability verification.

### Milestone 5 (R5): Full Test Suite Verification & Package Update
- Objective: Create comprehensive unit tests in `eLeave/tests/unit/` for `availabilityService`, `recommendationService`, and `substituteWorkflow`. Update `package.json` test script and ensure `npm test` passes 100%.
- Verification: `npm test` execution returning 100% pass rate.

### Parallel Track: E2E Testing Track
- Objective: Opaque-box requirement-driven test suite (Tiers 1-4) published via `TEST_READY.md`.

## Execution Topology
- Phase 1: Explorer investigation on existing repo structure.
- Phase 2: Sequential Milestone implementation (M1 -> M2 -> M3 -> M4 -> M5).
- Phase 3: Forensic audit and final verification.
