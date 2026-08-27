# Original User Request

## 2026-07-27T09:47:03Z

Execute the complete implementation of the School Resource Orchestration Platform (SROP) for the repository at g:\My Drive\01 Web app\01 ระบบการลา according to the updated implementation plan.

Working directory: g:\My Drive\01 Web app\01 ระบบการลา
Integrity mode: development

Requirements:
R1. Core Master Data & Subject Offering Abstraction: Verify and maintain normalized models for Teachers, Subjects, ClassRooms, Rooms, Departments, and SubjectOfferings in Prisma schema.
R2. Timetable Core & Version Pointer Switch: Complete TimetableSlot and TimetableVersion with Version Pointer Switch (`isCurrentPublished`) and Database Collision Protection (`@@unique`).
R3. Substitute Routing & Assignment Policies: Implement Availability Engine (`eLeave/src/services/availabilityService.js`), Substitute Workflow, and Assignment Policies (`CENTRALIZED`, `DEPARTMENT`, `HYBRID`) integrating with eLeave approved leaves.
R4. Recommendation Engine & Workload Fairness: Implement Field-Operator-Value Rule Engine (`eLeave/src/services/recommendationService.js`), Match Score Explainability breakdown, Workload Fairness Penalty based on past substitution history, and Recommendation Snapshots (`RecommendationRun`).
R5. Full Test Verification: Write unit tests in `eLeave/tests/unit/` for availabilityService, recommendationService, and substituteWorkflow, update package.json test script, and verify `npm test` passes 100%.

Return a summary of all implemented modules and test results.
