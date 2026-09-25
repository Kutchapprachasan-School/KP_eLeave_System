# ADR-20260925: OMR Rev 11.0 — Full-Page Side-by-Side Multiple-Choice Architecture, Multi-Choice (4/5/6) Templates & Ingestion Invariants

## Status
APPROVED - 2026-09-25

## Context & Problem Statement
During architectural stress-testing (`/grill-doc`) and real-world calibration of the KP e-Leave Optical Mark Recognition (OMR) subsystem, four structural bottlenecks were identified:

1. **Vertical Compression from Half-Page Stacking**:
   - Earlier revisions placed the Header, 5-Digit Student ID matrix (`10` rows), Answer Columns (`20–25` rows), and a Subjective Writing zone (`42.5%` of the page) in a vertical stack.
   - Stacking `10` rows of Student ID on top of `20` rows of Multiple-Choice answers inside only `170 mm` (`57.5%` of A4 height) compressed row pitch to `< 4.5 mm`, shrinking bubble diameter and increasing perspective warp sensitivity on mobile cameras.
2. **Need for Standard 4-Choice (`ก-ง`) and Special 5/6-Choice (`ก-จ`, `ก-ฉ`) Flexibility**:
   - Standard Thai secondary school exams predominantly use **4 choices (`ก ข ค ง`)** as shown in the reference answer sheet, which frees 20% horizontal width and allows large bubbles with generous spacing.
   - However, specialized exams (e.g., O-NET / A-Level / competitive tests) occasionally require **5 choices (`ก ข ค ง จ`)** or **6 choices (`ก ข ค ง จ ฉ`)**.
3. **Auto-Advance Collision on Unidentified Student IDs (`"?????"`)**:
   - When `autoCaptureEnabled` ingested sheets where students forgot to shade one or more digits of their Student ID (`result.studentId` containing `?` or fallback `"00000"`), multiple unidentified sheets shared the same placeholder `studentId`, causing `updateMany({ isLatestAttempt: false })` to overwrite and hide earlier unidentified sheets.
4. **Missing `attemptNo` Auto-Increment & Roster Auto-Enrichment (`เลขประจำตัว` + `เลขที่`)**:
   - Re-scanning a student's sheet defaulted `attemptNo` to `1` instead of `MAX(attemptNo) + 1`, and did not automatically enrich `studentName`, `classroom`, and `seatNo` from `ExamPrintedSheet` or decoded `seatNo` (`เลขที่` 2 digits).

---

## Decisions Crystallized (Grilling Rounds 1 & 2)

### 1. Pure Multiple-Choice Full-Page Side-by-Side Layout (Removing Subjective Section)
- **Decision**: Remove the subjective score bubbles and half-page handwriting lines from the OMR answer sheet and camera scanner flow, dedicating **100% of the A4 portrait sheet (`210 mm × 297 mm`, `CANVAS_W = 1000 × CANVAS_H = 1414`)** to Multiple-Choice OMR.
- **Side-by-Side Topology (Reference Standard Layout)**:
  - **Top Zone (`v = 0.04 .. 0.25`)**:
    - Framed by Top-Left (`TL`) and Top-Right (`TR`) black square fiducial markers (`■`).
    - Grey header banner (`กระดาษคำตอบ`), subject/school metadata, 2B pencil instructions, and a 2-row rounded Student Info box (`ชื่อ-สกุล | ชั้น` and `วันสอบ | วิชา`).
  - **Left Sidebar (`u = 0.08 .. 0.31`, `v = 0.28 .. 0.90`)**:
    1. **`เลขประจำตัว` (5-Digit Student ID Matrix)**: 5 digit boxes `[ _ | _ | _ | _ | _ ]` above a `5 × 10` (`0–9`) bubble grid (`v = 0.315 .. 0.555`).
    2. **`เลขที่` (2-Digit Seat No Matrix) + `รหัสชุด` (4-Version Matrix `ก ข ค ง`)**: Positioned directly below `เลขประจำตัว` (`v = 0.625 .. 0.865`), featuring 2 digit boxes `[ _ | _ ]` (`0–9` × 2 columns) and 1 version box `[ ก ]` (`ก ข ค ง`).
    3. **`ตัวอย่างการระบาย` (Shading Instruction Card)**: Positioned at bottom-left (`v = 0.88 .. 0.93`).
  - **Right Answer Zone (`u = 0.36 .. 0.91`, `v = 0.315 .. 0.895`)**:
    - Multiple-choice answer columns sit **side-by-side** with the Left Sidebar, expanding vertical question space from `80 mm` to **`175 mm`** (>2.1× increase).
    - Every column header features a solid black **Column Header Timing Square (`■`)** alongside choice headers (`ก ข ค ง` / `ก ข ค ง จ` / `ก ข ค ง จ ฉ`).
    - Question rows are visually grouped every **5 items** (`1–5`, `6–10`, `11–14`, etc.) to prevent row-skipping by students and improve row isolation.
    - The right edge (`u = 0.895`) features **Horizontal Row Timing Bars (`▬`)** aligned with every question row (`1..maxRowsPerCol`) for active row y-snap alignment during scanning.

### 2. Multi-Mode Choice Support (`4 ตัวเลือก` Standard + `5–6 ตัวเลือก` Special Sheets) & 5 Tiers
- **Choice Modes (`ChoiceCount = 4 | 5 | 6`)**:
  - **Standard (`4 ตัวเลือก: ก ข ค ง`)**: Default mode matching the reference answer sheet (`A, B, C, D`), maximizing bubble diameter and inter-bubble clearance.
  - **Special (`5 ตัวเลือก: ก ข ค ง จ` / `6 ตัวเลือก: ก ข ค ง จ ฉ`)**: Selectable in both the Print Studio and Camera Scanner for specialized assessments (`A..E` or `A..F`).
- **Tier Column Allocation**:
  - **20 Items (`KP-OMR-A4-20`)**: `2 columns × 10 rows` (`1–10`, `11–20`) + `10` Right Timing Bars `▬`
  - **40 Items (`KP-OMR-A4-40`)**: `3 columns × 14 rows` (`1–14`, `15–28`, `29–40`) + `14` Right Timing Bars `▬` *(Exact match to reference layout)*
  - **60 Items (`KP-OMR-A4-60`)**: `3 columns × 20 rows` (`1–20`, `21–40`, `41–60`) + `20` Right Timing Bars `▬`
  - **80 Items (`KP-OMR-A4-80`)**: `4 columns × 20 rows` (`1–20`, `21–40`, `41–60`, `61–80`) + `20` Right Timing Bars `▬`
  - **100 Items (`KP-OMR-A4-100`)**: `4 columns × 25 rows` (`1–25`, `26–50`, `51–75`, `76–100`) + `25` Right Timing Bars `▬`

### 3. Dual-Mode Auto-Fill (`Pre-filled Roster` vs `Blank Sheet`)
- **Pre-filled Roster Mode**: When printing for a classroom roster (where `studentId`, `seatNo`, and `versionCode` are known), the print layout prints the digits inside the top boxes (`[6|9|0|0|1]`, `[0|1]`, `[ก]`) **and pre-shades the corresponding black bubbles (`●`)** (`#0f172a`). This eliminates student ID shading errors while allowing the optical engine to read pre-shaded bubbles with 100% contrast.
- **Blank Sheet Mode**: When printing spare/blank sheets, digit boxes and bubbles remain unshaded for manual 2B pencil shading.

### 4. Auto-Quarantine for Unidentified IDs (`UNREAD_<shortId>`) & Roster Auto-Enrichment
- **Unidentified Sheet Quarantine**: If `studentId` contains `?` or is `"00000"` (and cannot be uniquely resolved via `seatNo` against `ExamPrintedSheet`), `ingestExamSubmissionAction` generates a unique quarantine identifier `UNREAD_<4-char-hash>` (preserving the raw pattern e.g. `UNREAD_12?45_a8f2`) and sets `hasAnomalies = true`. Multiple unidentified sheets never overwrite each other's `isLatestAttempt = true` status during Auto-Advance scanning.
- **Inline Camera Modal Identity Editor**: Teachers can also immediately edit/confirm the 5-digit `เลขประจำตัว` and 2-digit `เลขที่` directly inside the Camera Scanner modal (`updateSubmissionStudentIdentityAction`).
- **Atomic `attemptNo` & Roster Lookup**: Inside the `pg_advisory_xact_lock` transaction, `ingestExamSubmissionAction`:
  1. Looks up `ExamPrintedSheet` (first by `examPaperId + studentId`, or fallback by `examPaperId + seatNo` if `studentId` was unread but `seatNo` was shaded!) to auto-fill `studentId`, `studentName`, `classroom`, and `seatNo`.
  2. Calculates `attemptNo = COALESCE(MAX(attemptNo), 0) + 1` before archiving previous attempts (`isLatestAttempt = false`).

---

## Invariants Enforced
- **Invariant 1 (Canonical Coordinate Parity)**: Both `OmrAnswerSheetPrintLayout.tsx` (CSS percentage positioning) and `omrTemplateGeometry.ts` (`CANVAS_W = 1000 × CANVAS_H = 1414` normalized `(u, v)` coordinates) MUST share the exact same mathematical generator `getTemplateGeometry(totalItems, numChoices)` so every printed circle aligns within `< 0.5 px` of the scanner's ROI.
- **Invariant 2 (Zero Unidentified Overwrite)**: An `ExamSubmission` whose `studentId` is unresolved (`UNREAD_*`) MUST NEVER mark another student's `UNREAD_*` submission as `isLatestAttempt = false`.
- **Invariant 3 (Monotonic Attempt Numbering)**: Under `pg_advisory_xact_lock(examPaperId:studentId)`, `attemptNo` MUST strictly increment (`MAX(attemptNo) + 1`) and exactly one record per `(examPaperId, studentId)` may hold `isLatestAttempt = true`.
- **Invariant 4 (Choice Count Bounds)**: `configureAnswerKeyAction` and `omrEngine.ts` MUST accept `correctChoices` within `["A", "B", "C", "D", "E", "F"]` (`ก, ข, ค, ง, จ, ฉ`) up to the active sheet's `numChoices` (`4, 5, or 6`).

## Consequences
- **Positive**:
  - Over **2.1× larger vertical row space** and wider horizontal bubble spacing, matching commercial standard Thai OMR sheets and ZipGrade accuracy.
  - Pre-shaded `เลขประจำตัว` and `เลขที่` on roster prints eliminate 99% of student ID shading mistakes.
  - Teachers can seamlessly switch between 4-choice standard sheets (`ก-ง`) and 5/6-choice special sheets (`ก-จ` / `ก-ฉ`).
- **Negative / Trade-offs**:
  - Existing printed sheets from pre-Rev 11 half-page layouts are superseded by the new full-page side-by-side layout; teachers should print the new Rev 11 sheet before scanning.
