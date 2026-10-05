# Mobile-Optimized OMR Robust Camera Scanner (Rev 11.1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure teachers can reliably scan and grade printed exam answer sheets using smartphone mobile cameras in real-world classroom conditions (on dark desks, under uneven lighting, and with phone tilt).

**Architecture:** Replace the global Otsu thresholding in `omrMarkerDetector.ts` with a high-performance $O(N)$ Bradley-Roth local adaptive thresholding engine; fix the mathematical aspect ratio inversion in `omrEngine.ts` Image Quality Gate; calibrate marker size boundaries for 480p mobile video; add real-time Augmented Reality (AR) visual marker tracking reticles and fix video viewport clipping in `OmrCameraScanner.tsx`.

**Tech Stack:** Next.js 16 (App Router), TypeScript, HTML5 Canvas 2D / MediaStream API, Web Audio API, Prisma ORM, PostgreSQL.

## Global Constraints

- Develop and test on `dev` branch only; never commit directly to `main`.
- Rule: Zero Orphaned Test Accounts (`WHERE email LIKE '%test%' OR name LIKE '%ทดสอบ%' = 0`).
- Maintain canonical coordinate parity with `OmrAnswerSheetPrintLayout.tsx` (`CANVAS_W = 1000 × CANVAS_H = 1414`).
- All user-facing scanner labels and diagnostic messages must be in Thai.
- Frame analysis must execute in $\le 60\text{ ms}$ on mobile browsers.

---

### Task 1: Fix Image Quality Gate (IQG) Aspect Ratio Math & Lighting Tolerances

**Files:**
- Modify: `src/lib/omr/omrEngine.ts`
- Modify: `eLeave/tests/unit/omrEngine.test.js`

- [x] **Step 1: Write failing test in `eLeave/tests/unit/omrEngine.test.js`**
  Add a test verifying that `evaluateImageQuality` passes when given realistic full-page A4 corners (height: 1287px, width: 870px, aspect: ~1.48) with `expectedAspectRatio = 0.6761` (Width/Height) or `1.479` (Height/Width).
- [x] **Step 2: Run test to confirm it fails**
  Run `node --test eLeave/tests/unit/omrEngine.test.js` and verify it fails with `"สัดส่วนกระดาษบิดเบี้ยวเกินเกณฑ์"`.
- [x] **Step 3: Fix aspect ratio math and lighting tolerances in `src/lib/omr/omrEngine.ts`**
  - Compute `observedRatio = Math.max(avgW, avgH) / Math.max(1, Math.min(avgW, avgH))`
  - Compute `expectedRatio = Math.max(expectedAspect, 1 / expectedAspect)`
  - Compare `aspectDiff = Math.abs(observedRatio - expectedRatio) / expectedRatio` (limit 0.22)
  - Raise specular glare threshold from 4.0% to 15.0%
  - Raise illumination delta threshold from 85.0 to 120.0
- [x] **Step 4: Run test to confirm it passes**
  Run `node --test eLeave/tests/unit/omrEngine.test.js` and confirm all tests pass.
- [x] **Step 5: Commit changes**
  `git add src/lib/omr/omrEngine.ts eLeave/tests/unit/omrEngine.test.js && git commit -m "fix(omr): resolve IQG aspect ratio calculation bug and relax glare threshold"`

---

### Task 2: Implement Bradley-Roth Local Adaptive Thresholding & Calibrated Marker Detection

**Files:**
- Modify: `src/lib/omr/omrMarkerDetector.ts`
- Modify: `eLeave/tests/unit/omrMarkerDetector.test.js`

- [x] **Step 1: Write failing test in `eLeave/tests/unit/omrMarkerDetector.test.js`**
  Add a test simulating a camera frame with a dark desk background (`intensity = 65`) and an A4 white sheet with 6 fiducial markers (width: 7px, area: 49px). Verify that the test currently fails with `markersDetected = 0`.
- [x] **Step 2: Run test to confirm failure**
  Run `node --test eLeave/tests/unit/omrMarkerDetector.test.js` and verify failure.
- [x] **Step 3: Implement Bradley-Roth adaptive thresholding and calibrated marker bounds in `src/lib/omr/omrMarkerDetector.ts`**
  - Compute 2D integral image of the downsampled grayscale frame in $O(N)$
  - Apply local adaptive thresholding: $T = 0.82 \times \text{mean}_{\text{local}}$ with window $S = \text{round}(\text{width} / 16)$
  - Calibrate `filterSquareMarkers`: `minArea = Math.max(12, Math.round(totalArea * 0.00008))`, `maxArea = Math.round(totalArea * 0.05)`, aspect ratio `0.55 .. 1.85`, solidity $\ge 0.68$
  - Enhance `assignMarkers`:
    - First locate the 4 extreme convex corners (Top-Left, Top-Right, Bottom-Left, Bottom-Right)
    - If 6 markers exist, locate `midLeft` along the left segment and `midRight` along the right segment
    - Fall back to clean 4-corner homography if 1 or 2 midpoints are occluded, without rejecting the scan!
- [x] **Step 4: Run test to confirm it passes**
  Run `node --test eLeave/tests/unit/omrMarkerDetector.test.js` and confirm all tests pass.
- [x] **Step 5: Commit changes**
  `git add src/lib/omr/omrMarkerDetector.ts eLeave/tests/unit/omrMarkerDetector.test.js && git commit -m "feat(omr): replace Otsu with Bradley-Roth adaptive threshold and robust 4/6-point marker detection"`

---

### Task 3: Implement Live AR Marker Visualizer & Viewfinder Stream Fixes

**Files:**
- Modify: `src/components/omr/OmrCameraScanner.tsx`

- [x] **Step 1: Update camera viewport and styling in `src/components/omr/OmrCameraScanner.tsx`**
  - Replace `object-cover` with `object-contain` on `<video>` so that the camera stream is never cropped.
  - Set container background to black with letterboxing.
- [x] **Step 2: Add Real-Time AR Reticle Overlay `<canvas>`**
  - Overlay an absolute `<canvas>` matching video dimensions.
  - When `detectFiducialMarkers` finds candidate points, draw live glowing green/cyan rings over detected marker coordinates.
  - Draw a polygon connecting the 4 corners so teachers see exactly what the computer vision engine sees.
- [x] **Step 3: Add Torch / Flashlight Toggle & Manual Capture Enhancements**
  - Support torch toggle for mobile back cameras via `track.applyConstraints({ advanced: [{ torch: isTorchOn }] })`.
  - When manual capture button is clicked, immediately run high-res adaptive detection on the full frame even if auto-lock was pending.
- [x] **Step 4: Verify syntax & component compilation**
  Run `npx next lint` or test page compilation.
- [x] **Step 5: Commit changes**
  `git add src/components/omr/OmrCameraScanner.tsx && git commit -m "feat(omr): add live AR marker reticles, torch toggle, and object-contain camera viewfinder"`

---

### Task 4: End-to-End Test Suite Verification & DB Safety

**Files:**
- Test suite: `npm test`
- Verification script: check zero test accounts

- [x] **Step 1: Run full test suite**
  Run `npm test` and verify that all 382+ unit tests pass.
- [x] **Step 2: Check database cleanliness**
  Verify `WHERE email LIKE '%test%' OR name LIKE '%ทดสอบ%' = 0`.
- [x] **Step 3: Final commit and push to dev**
  Push `dev` to `origin` and `school` remotes.
