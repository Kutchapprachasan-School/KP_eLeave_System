# Analysis Report — Requirements R4 & R5

**Date:** 2026-07-27  
**Agent:** Explorer 3  
**Target:** eLeave System & School Resource Orchestration Platform (SROP)  

---

## Executive Summary

This report presents a thorough analysis of **Requirement R4** (Recommendation Engine, Match Score Explainability, Workload Fairness Penalty, and Recommendation Snapshots) and **Requirement R5** (Full Unit Test Verification and Test Suite Configuration in `package.json`).

Key Findings:
1. **R4 Recommendation Engine Core** is implemented in `eLeave/src/services/recommendationService.js` with structured rule evaluation (`equals`, `contains`) and workload fairness penalty deduction (-10 points per substitution in history). However, the **`RecommendationRun` snapshot model** is missing from `prisma/schema.prisma` and requires schema addition and snapshot creation logic in the service.
2. **R5 Unit Test Suite Verification**: The test framework relies on Node.js built-in test runner (`node:test` and `node:assert/strict`). Currently, 31 out of 31 test cases pass across 9 test files via `npm test`. Expanded edge case coverage for `availabilityService`, `recommendationService`, and `substituteWorkflowService` is recommended to ensure robust validation.

---

## 1. Requirement R4 Analysis — Recommendation Engine & Workload Fairness

### 1.1 Existing Architecture & Logic (`eLeave/src/services/recommendationService.js`)

The `RecommendationService` class is designed to score and rank substitute candidate teachers based on structured rules and historical workload.

#### A. Structured Field-Operator-Value Rules Engine
- **Default Rules Configuration** (lines 8–13):
  - `r1`: `subjectCode` `equals` target (Weight: 40, Name: 'Same Subject')
  - `r2`: `departmentId` `equals` target (Weight: 25, Name: 'Same Department')
  - `r3`: `building` `equals` target (Weight: 10, Name: 'Same Building')
- **Rule Evaluation Logic** (lines 24–40):
  - Iterates over defined rules.
  - Supports `equals` (strict equality) and `contains` (substring search).
  - Accumulates `totalScore` and builds an `explainabilityBreakdown` array of matched rule objects: `{ rule: rule.name, score: rule.weight }`.

#### B. Workload Fairness Penalty Logic
- **Subsequent Load Deduction** (lines 42–48):
  - Scans `this.history` log to count prior substitution assignments for the candidate:
    `const recentSubCount = this.history.filter(h => h.teacherId === candidate.id).length;`
  - Applies penalty formula: `penalty = recentSubCount * 10`.
  - Floor protection: `totalScore = Math.max(0, totalScore - penalty)`.
  - Appends penalty item to `explainabilityBreakdown`: `{ rule: 'Workload Fairness Penalty (-' + penalty + ')', score: -penalty }`.

#### C. Score Explainability Output & Ranking
- `evaluateCandidate(candidate, targetContext)` returns:
  ```json
  {
    "candidate": { "id": "t1", "subjectCode": "ว23101", "departmentId": "DEP-SCIENCE" },
    "totalScore": 55,
    "matchPercentage": 55,
    "explainabilityBreakdown": [
      { "rule": "Same Subject", "score": 40 },
      { "rule": "Same Department", "score": 25 },
      { "rule": "Workload Fairness Penalty (-10)", "score": -10 }
    ]
  }
  ```
- `rankCandidates(candidates, targetContext)` sorts evaluated candidates in descending order of `totalScore`.

---

### 1.2 Missing Component: Recommendation Snapshots (`RecommendationRun`)

To audit recommendation decisions and preserve historical match scores at the time a substitute is assigned, a recommendation snapshot mechanism is needed.

#### Schema Audit (`prisma/schema.prisma`)
Currently, `prisma/schema.prisma` contains `SubstituteWorkflow` (lines 234–246) but does **not** include a `RecommendationRun` model.

#### Proposed Prisma Schema Extension
```prisma
model RecommendationRun {
  id                String   @id @default(cuid())
  leaveRequestId    String
  timetableSlotId   String
  targetContext     Json     // Filter & context params used (subjectCode, departmentId, etc.)
  recommendations   Json     // Ranked candidate list with totalScore, matchPercentage, explainabilityBreakdown
  selectedTeacherId String?  // Teacher ID selected for substitution (if finalized)
  createdAt         DateTime @default(now())

  @@index([leaveRequestId, timetableSlotId])
}
```

#### Proposed Service Extension (`eLeave/src/services/recommendationService.js`)
```javascript
createRecommendationRun(leaveRequestId, timetableSlotId, targetContext, rankedCandidates) {
  const run = {
    id: `run-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    leaveRequestId,
    timetableSlotId,
    targetContext,
    recommendations: rankedCandidates,
    selectedTeacherId: null,
    createdAt: new Date().toISOString()
  };
  if (this.store && this.store.recommendationRuns) {
    this.store.recommendationRuns.push(run);
  }
  return run;
}
```

---

## 2. Requirement R5 Analysis — Full Unit Test Suite & Package Setup

### 2.1 Test Framework & Runner Setup
- **Framework**: Node.js Native Test Runner (`node:test` and `node:assert/strict`). No external runner like Jest is required or configured; Node 18+/20+ native runner is lightweight and dependency-free.
- **Execution Script in `package.json`**:
  ```json
  "scripts": {
    "test": "node --test eLeave/tests/unit/deployment.test.js eLeave/tests/unit/supervisionService.test.js eLeave/tests/unit/weeklyTimetable.test.js eLeave/tests/unit/evaluationModal.test.js eLeave/tests/unit/timetableService.test.js eLeave/tests/unit/availabilityService.test.js eLeave/tests/unit/recommendationService.test.js eLeave/tests/unit/substituteWorkflowService.test.js eLeave/tests/e2e/supervision.test.js"
  }
  ```
- **Test Result Verification**:
  - Command: `npm test`
  - Output: **31 tests passed, 0 failed, 0 skipped**. Total duration ~620ms.

---

### 2.2 Detailed Verification of Core Service Tests

#### A. `eLeave/tests/unit/availabilityService.test.js`
- **Current Tests**:
  1. `filters out teacher who is on approved leave` — Verifies approved leave returns `isAvailable = false`.
  2. `filters out teacher who has a booked timetable slot` — Verifies booked timetable slot returns `isAvailable = false`.
  3. `returns true for free teacher` — Verifies unbooked/unleaved teacher returns `isAvailable = true`.
- **Recommended Additional Test Scenarios**:
  - Ignore leaves with status `PENDING` or `REJECTED`.
  - Date boundary tests (leave ends before target date vs leave starts after target date).
  - Slot check across different `timetableVersionId`.
  - `getAvailableCandidates` filtering multiple teachers correctly.

#### B. `eLeave/tests/unit/recommendationService.test.js`
- **Current Tests**:
  1. `calculates score explainability breakdown correctly` — Verifies positive score accumulation and breakdown structure.
  2. `applies Workload Fairness Penalty for frequent past substitutes` — Verifies -10 penalty per substitution history entry.
- **Recommended Additional Test Scenarios**:
  - `contains` operator evaluation.
  - Zero-score candidate handling (does not produce negative `totalScore`).
  - Candidate ranking order (`rankCandidates`).
  - Snapshot creation (`createRecommendationRun`).

#### C. `eLeave/tests/unit/substituteWorkflowService.test.js`
- **Current Tests**:
  1. `respects DEPARTMENT assignment policy` — Verifies candidate filtering under `DEPARTMENT` policy.
  2. `workflow assignment and response state transitions` — Verifies `ASSIGNED` -> `ACKNOWLEDGED` transition.
- **Recommended Additional Test Scenarios**:
  - `CENTRALIZED` policy candidate routing.
  - `HYBRID` policy fallback logic when same department pool is empty.
  - `REJECTED` state transition.
  - Exception handling for invalid status responses or invalid workflow IDs.

---

## 3. Evidence Chain & Summary Matrix

| Requirement Component | File Location | Current Status | Action Required |
| :--- | :--- | :--- | :--- |
| **Field-Operator Rules** | `eLeave/src/services/recommendationService.js:24-40` | Implemented | Add support for additional operators if needed |
| **Match Score Breakdown** | `eLeave/src/services/recommendationService.js:37-39` | Implemented | None (working as expected) |
| **Workload Fairness Penalty** | `eLeave/src/services/recommendationService.js:42-48` | Implemented | Expand time window filtering (e.g. 30 days) |
| **Recommendation Snapshots** | `prisma/schema.prisma` & `recommendationService.js` | **Missing** | Add `RecommendationRun` Prisma model & `createRecommendationRun` method |
| **Availability Unit Tests** | `eLeave/tests/unit/availabilityService.test.js` | 3 tests passing | Add edge case tests (unapproved leave, version filter) |
| **Recommendation Unit Tests** | `eLeave/tests/unit/recommendationService.test.js` | 2 tests passing | Add edge case tests (ranking, snapshots) |
| **Substitute Workflow Tests** | `eLeave/tests/unit/substituteWorkflowService.test.js` | 2 tests passing | Add edge case tests (CENTRALIZED, HYBRID fallback, REJECTED) |
| **npm test script** | `package.json:11` | Working (31/31 pass) | Maintain 100% pass rate when adding new test cases |

---

## 4. Proposed Code Snippets / Patch Suggestions

### 4.1 Schema Modification (`prisma/schema.prisma`)
```prisma
model RecommendationRun {
  id                String   @id @default(cuid())
  leaveRequestId    String
  timetableSlotId   String
  targetContext     Json
  recommendations   Json
  selectedTeacherId String?
  createdAt         DateTime @default(now())

  @@index([leaveRequestId, timetableSlotId])
}
```

### 4.2 Extended RecommendationService Snapshot Method (`eLeave/src/services/recommendationService.js`)
```javascript
  /**
   * Save a snapshot of candidate recommendations for auditability
   */
  createRecommendationRun(leaveRequestId, timetableSlotId, targetContext, candidates) {
    const ranked = this.rankCandidates(candidates, targetContext);
    const run = {
      id: `run-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      leaveRequestId,
      timetableSlotId,
      targetContext,
      recommendations: ranked,
      selectedTeacherId: null,
      createdAt: new Date().toISOString()
    };
    if (this.historyStore && Array.isArray(this.historyStore.recommendationRuns)) {
      this.historyStore.recommendationRuns.push(run);
    }
    return run;
  }
```

---

## Conclusion & Next Steps
- Requirements R4 and R5 have a solid foundation in `eLeave/src/services/recommendationService.js` and `eLeave/tests/unit/`.
- To complete Milestone 4 & 5 implementation:
  1. Add `RecommendationRun` model to `prisma/schema.prisma`.
  2. Implement snapshot logging in `RecommendationService`.
  3. Expand unit test cases for R4 & R5 in `eLeave/tests/unit/`.
  4. Ensure `npm test` passes 100%.
