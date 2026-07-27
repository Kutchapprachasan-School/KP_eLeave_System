# E2E Test Infra: Time Attendance System

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| F1 | Biometric Consent & Profile Enrollment | R1 & R3 | 5 | 5 | ✓ |
| F2 | GPS Geofencing & Verification | R2 | 5 | 5 | ✓ |
| F3 | Liveness Challenges | R3 | 5 | 5 | ✓ |
| F4 | AI Face Recognition | R3 | 5 | 5 | ✓ |
| F5 | Anti-Replay Security Nonces | R4 | 5 | 5 | ✓ |
| F6 | Rate Limiting & Blocking | R4 | 5 | 5 | ✓ |
| F7 | Cryptographic Append-Only Logs | R4 | 5 | 5 | ✓ |
| F8 | Shifts, KPI, Cleanup & LINE Alerts | R1 & R5 | 5 | 5 | ✓ |

## Test Architecture
- **Test runner**: `tests/e2e/testRunner.js` (written in native Node.js ESM. Runs all tests, aggregates results, prints dashboard, and returns exit code).
- **Mock Server**: `tests/e2e/mockServer.js` (starts on port 3002, implements the full HTTP API contract for attendance endpoints using in-memory state. Supported endpoints:
  - `GET /api/attendance/nonce`
  - `POST /api/attendance/consent`
  - `POST /api/attendance/register`
  - `POST /api/attendance/clock-in`
  - `POST /api/attendance/clock-out`
  - `GET /api/admin/kpi`
  - `POST /api/admin/shifts`
  - `POST /api/admin/settings`
  - `POST /api/cron/cleanup`
- **Test case format**: Native Node.js fetch-based requests sending structured JSON payloads and validating HTTP status, response body, headers, and database side-effects.
- **Directory layout**:
  - `eLeave/tests/e2e/mockServer.js`
  - `eLeave/tests/e2e/testRunner.js`
  - `eLeave/tests/e2e/tier1.test.js`
  - `eLeave/tests/e2e/tier2.test.js`
  - `eLeave/tests/e2e/tier3.test.js`
  - `eLeave/tests/e2e/tier4.test.js`

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| T4_01 | Normal Workday Flow | F1, F2, F3, F4, F5, F7, F8 | High |
| T4_02 | Late Arrival & Notification Flow | F1, F2, F3, F4, F5, F7, F8 | High |
| T4_03 | Overnight Shift Flow | F2, F5, F7, F8 | High |
| T4_04 | Spoofing & Replay Attack Defense | F2, F3, F4, F5, F6 | High |
| T4_05 | System Settings Override & Maintenance | F2, F3, F4, F5, F8 | Medium |

## Coverage Thresholds
- Tier 1: 5 * N = 40 cases (Actual: 40 cases)
- Tier 2: 5 * N = 40 cases (Actual: 40 cases)
- Tier 3: N = 8 cases (Actual: 8 cases)
- Tier 4: max(5, N/2) = 5 cases (Actual: 5 cases)
- **Total: 93 test cases**
