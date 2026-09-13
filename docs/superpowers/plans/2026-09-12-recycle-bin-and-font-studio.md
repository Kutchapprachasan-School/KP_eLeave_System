# Unified Recycle Bin, Chrono-Sequential Guard & Verified Font Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a 30-day Unified Recycle Bin across Certificate, Document, and Leave modules, enforce Chrono-Sequential Invariants with row-level locks, and resolve the Multilingual Font switching bug via a Centralized Font Registry and verified PDF Canvas Gate.

**Architecture:** 
- **Font Subsystem**: Establish a Single Source of Truth `FontRegistry` with persistent definition catalog (`FONT_MANIFEST` + dynamic fonts), state machine (`IDLE` $\rightarrow$ `LOADING` $\rightarrow$ `READY` / `FAILED`), deduplicated loader cache, and canvas text metric verification for both Studio Preview and the 300 DPI PDF Engine before drawing.
- **Recycle Bin Subsystem**: Add soft-delete lifecycle columns (`isDeleted`, `deletedAt`, `deletedById`, `purgeAt`, `deleteReason`) to `DocumentRecord` and `LeaveRequest` with static `purgeAt` fixation, strict idempotency, and state-bound leave quota refunds.
- **Chrono-Sequential Guard**: Enforce transactional boundary locks (`SELECT ... FOR UPDATE`) on adjacent document sequences for date modifications and atomically reassign restored certificates to the latest timeline tail (`RestoreDate = max(latestDate, today)`, `seqNo = maxSeq + 1`).
- **Attachment Lifecycle**: Ensure hard-purging records delegates to `releaseAttachmentReference()` before deleting DB rows to preserve storage safety and prevent Foreign Key Restrict crashes.

**Tech Stack:** Next.js 16 (App Router, Turbopack, Server Actions), PostgreSQL (Prisma ORM with Row Locks), Web Crypto API, Canvas 2D Font Metric API, jsPDF, Tailwind CSS, Lucide Icons.

## Global Constraints
- Strictly zero duplicate imports across all modules.
- Maintain `node scripts/verify-ui-scope.mjs --deep-audit` 100% passing.
- Maintain all 191 existing automated tests passing with zero regressions.
- No derived or transient URLs stored in `layoutConfig` or `customFonts`.
- Strict Idempotency on all Soft Delete and Restore service actions.

---

## File Structure Map

| File Path | Role / Responsibility |
|---|---|
| `src/app/(app)/document/_components/designer/font-registry.ts` | **[NEW]** Centralized Font Registry SOT, status cache, promise deduplication, and canvas font metric verification. |
| `src/app/(app)/document/_components/designer/font-loader.ts` | **[MODIFY]** Remove Thai-only restriction from font loader, expose universal glyph load. |
| `src/app/(app)/document/_components/designer/cert-pdf-engine.ts` | **[MODIFY]** Integrate verified `FontRegistry.ensureCanvasFontReady` into `drawCertificatePage` and `generateCertificatePdfBatch`. |
| `src/app/(app)/document/_components/designer/cert-designer-studio.tsx` | **[MODIFY]** Connect Canvas Preview and Property Inspector to Font Registry state machine (Loading spinner, Ready trigger, Re-render). |
| `prisma/schema.prisma` | **[MODIFY]** Add soft-delete columns to `DocumentRecord`, `LeaveRequest`, and `recycleBinRetentionDays` to `SystemSettings`. |
| `src/services/recycle-bin/recycle-bin.service.ts` | **[NEW]** Core service for soft-delete, restore, chrono-reassignment, idempotency checks, and purge. |
| `src/app/actions/recycle-bin.ts` | **[NEW]** Server actions for Admin Recycle Bin Center and Teacher Self-Service Trash. |
| `src/app/actions/document.ts` | **[MODIFY]** Integrate Chrono-Sequential Date Guard on date modifications; adapt delete action to call soft delete. |
| `src/app/actions/leave.ts` | **[MODIFY]** Adapt `deleteLeaveRequest` to route through idempotent Soft Delete with quota state binding. |
| `src/app/(app)/admin/recycle-bin/page.tsx` | **[NEW]** Admin Unified Recycle Bin Center UI (KPI cards, tab filtering, countdown badges, modals). |
| `src/app/(app)/document/_components/my-trash-modal.tsx` | **[NEW]** Teacher Self-Service My Trash view (Certificates only). |
| `eLeave/tests/unit/recycleBinAndFontStudio.test.js` | **[NEW]** Automated invariant test suite for Tests 54–63. |

---

## Task Decomposition

### Task 1: Centralized Font Registry & Canvas Metric Verification (Phase 1)

**Files:**
- Create: `src/app/(app)/document/_components/designer/font-registry.ts`
- Modify: `src/app/(app)/document/_components/designer/font-loader.ts`
- Test: `eLeave/tests/unit/certificateDesignerStudio.test.js`

**Interfaces:**
- Produces:
  - `FontRegistry.getFont(family: string): FontRegistryEntry`
  - `FontRegistry.loadFont(family: string): Promise<boolean>`
  - `FontRegistry.ensureCanvasFontReady(ctx: CanvasRenderingContext2D, family: string, weight?: number): Promise<boolean>`
  - `FontRegistry.ensureTemplateFontsReady(families: string[]): Promise<{ allReady: boolean; failed: string[] }>`

- [ ] **Step 1.1: Write unit tests for FontRegistry state machine and canvas metric verification**
  - Verify `IDLE` $\rightarrow$ `LOADING` $\rightarrow$ `READY` state transitions.
  - Verify concurrent `loadFont` calls for the same family return the same shared promise (deduplication).
  - Verify `ensureCanvasFontReady` measures width change against fallback font `sans-serif`.

- [ ] **Step 1.2: Implement `font-registry.ts`**
  - Initialize registry with definitions from `FONT_MANIFEST`.
  - Maintain `statusMap = new Map<string, FontRegistryEntry>()`.
  - In `loadFont`: load via `FontFace` or Google Fonts stylesheet link, capture real `READY` / `FAILED` state without redundant HEAD requests.
  - In `ensureCanvasFontReady`: create test offscreen canvas, measure fallback string width `ctx.font = '16px sans-serif'`, compare with `ctx.font = '16px "${family}", sans-serif'`.

- [ ] **Step 1.3: Update `font-loader.ts`**
  - Remove restrictive `THAI_TEST_GLYPHS` from `document.fonts.load`.
  - Delegate loading to `FontRegistry`.

- [ ] **Step 1.4: Run tests to verify Phase 1 passes**
  - Execute `npm test`.

---

### Task 2: Verified PDF Engine & Studio Preview Integration (Phase 1 Continued)

**Files:**
- Modify: `src/app/(app)/document/_components/designer/cert-pdf-engine.ts`
- Modify: `src/app/(app)/document/_components/designer/cert-designer-studio.tsx`

**Interfaces:**
- Consumes: `FontRegistry.ensureTemplateFontsReady`, `FontRegistry.ensureCanvasFontReady`
- Produces: Canvas preview and PDF batch export with 100% verified fonts.

- [ ] **Step 2.1: Update `cert-pdf-engine.ts`**
  - In `generateCertificatePdfBatch`: extract all unique `fontFamily` from `template.elements`.
  - Call `await FontRegistry.ensureTemplateFontsReady(families)`.
  - If any font fails, log warning and set fallback font with explicit notice; do NOT silently export wrong glyphs.
  - In `drawCertificatePage`: check font ready status on `ctx`.

- [ ] **Step 2.2: Update `cert-designer-studio.tsx`**
  - In `renderCanvas`: preload all active text element fonts via `FontRegistry.loadFont`.
  - In Property Inspector font dropdown: display loading indicator when `entry.status === "LOADING"`, badge when `READY`.
  - When font selection changes, await `FontRegistry.loadFont(newFont)` and trigger canvas re-render immediately upon `READY`.

- [ ] **Step 2.3: Verification**
  - Test selecting English, Japanese, and Chinese fonts in preview. Confirm canvas updates immediately.

---

### Task 3: Database Schema Migration for Soft-Delete Governance (Phase 2)

**Files:**
- Modify: `prisma/schema.prisma`
- Create migration: `prisma db push`

- [ ] **Step 3.1: Update `prisma/schema.prisma`**
  - Add soft-delete columns to `DocumentRecord`:
    - `isDeleted Boolean @default(false)`
    - `deletedAt DateTime?`
    - `deletedById String?`
    - `deletedBy User? @relation("DocDeletedByUser", fields: [deletedById], references: [id], onDelete: SetNull)`
    - `purgeAt DateTime?`
    - `deleteReason String?`
    - Index: `@@index([isDeleted, deletedAt])`, `@@index([isDeleted, purgeAt])`
  - Add soft-delete columns to `LeaveRequest`:
    - `isDeleted Boolean @default(false)`
    - `deletedAt DateTime?`
    - `deletedById String?`
    - `deletedBy User? @relation("LeaveDeletedByUser", fields: [deletedById], references: [id], onDelete: SetNull)`
    - `purgeAt DateTime?`
    - `deleteReason String?`
    - Index: `@@index([isDeleted, deletedAt])`, `@@index([isDeleted, purgeAt])`
  - Add to `SystemSettings`:
    - `recycleBinRetentionDays Int @default(30)`

- [ ] **Step 3.2: Execute `prisma db push` and `prisma generate`**
  - Apply schema changes to database.

---

### Task 4: Service Layer & Business Invariants (Phase 3)

**Files:**
- Create: `src/services/recycle-bin/recycle-bin.service.ts`
- Modify: `src/app/actions/document.ts`
- Modify: `src/app/actions/leave.ts`
- Test: `eLeave/tests/unit/recycleBinAndFontStudio.test.js`

**Interfaces:**
- Produces:
  - `softDeleteService(params): Promise<SoftDeleteResult>`
  - `restoreService(params): Promise<RestoreResult>`
  - `purgeRecycleBinItemService(params): Promise<PurgeResult>`
  - `bulkRestoreService(params): Promise<BulkOperationResult>`
  - `bulkPurgeService(params): Promise<BulkOperationResult>`
  - `validateChronoDateBoundary(params): Promise<void>`
  - `getRecycleBinItemsService(params): Promise<RecycleBinViewModel[]>`

- [x] **Step 4.1: Write failing unit tests for Invariants 54–63**
  - Test 54: Soft-Delete Idempotency & Row Lock (concurrent/repeated deletes execute no-op under `FOR UPDATE` without double-refunding leave quota).
  - Test 55: Restore Idempotency (repeated restores return no-op and do not re-deduct quota or duplicate seq).
  - Test 56: State-Bound Leave Quota (refund on delete only if `APPROVED`; re-deduct on restore only if `APPROVED`).
  - Test 57: Chrono-Sequential Concurrency & Partition Lock Mutual Exclusion Harness (TX-A acquires `DocumentConfig` partition lock, TX-B attempts timeline mutation concurrently and is blocked until TX-A commits; timeline ordering preserved).
  - Test 58: Sole Sequence Allocator Authority & Sanity Healing (`DocumentConfig.currentSeq` is sole authority; `MAX(seqNo)` includes deleted records without `isDeleted` filter; drift triggers audited `AUTO_HEAL_SEQUENCE_DRIFT` under lock).
  - Test 59: Certificate Restore Timeline Tail Re-issuance (`latestActiveDate` strictly filters `isDeleted = false`; deleted batches never affect tail date).
  - Test 60: Atomic In-Transaction Audit Invariant (Certificate restore rolls back if `auditLog` write fails; no restore without audit).
  - Test 61: Official Document Restore Identity Invariant (preserves original `docNo`, rejects with collision error if number taken).
  - Test 62: Bulk Operations Itemized Isolation (per-item atomic transaction, partial success contract with failure diagnostic tooltips).
  - Test 63: Hard Purge Attachment Lifecycle Integration (invokes `releaseAttachmentReference` before row deletion).

- [x] **Step 4.2: Implement `recycle-bin.service.ts`**
  - Enforce global invariant: `NO TIMELINE MUTATION WITHOUT PARTITION LOCK` (Create, Date/Seq Update, Soft Delete, Restore, Hard Purge, Import).
  - Implement `softDeleteService` with authoritative pessimistic row lock (`SELECT ... FOR UPDATE`), static `purgeAt = now + retentionDays`, idempotency check, and state-bound leave refund.
  - Implement `restoreCertificateRecord` with `DocumentConfig` as sole sequence allocator authority:
    - Lock partition `DocumentConfig(docType, year) FOR UPDATE`.
    - Query `MAX(seqNo)` without `isDeleted` filter (counting deleted records).
    - If `maxDbSeq > currentSeq`, trigger atomic in-transaction `CRITICAL INTEGRITY EVENT` audit log and repair `currentSeq = maxDbSeq`.
    - Query `latestActiveDate` with strict `isDeleted = false` filter.
    - Re-issue with `nextSeqNo = currentSeq + 1` and `restoreDate = max(latestActiveDate, today)`.
    - Write atomic `auditLog` inside `tx` (Invariant: No Audit = No Commit).
  - Implement `restoreDocumentRecord` (Admin only) with original identity preservation, collision validation, and atomic audit logging.
  - Implement `restoreLeaveRequest` (Admin only) with quota check, conditional deduction if `APPROVED`, and atomic audit logging.
  - Implement `validateChronoDateBoundary` with partition timeline lock (`DocumentConfig FOR UPDATE`) + real row locks on current, preceding (n-1), and succeeding (n+1) rows.
  - Implement `bulkRestoreService` and `bulkPurgeService` using per-item transaction boundaries returning itemized `BulkOperationResult`.
  - Implement `purgeRecycleBinItemService` with `FileAttachment` release loop.

- [x] **Step 4.3: Integrate into `actions/document.ts` and `actions/leave.ts`**
  - In `cancelDoc`: keep strike-through status `CANCELLED` and preserve number (Invariant).
  - In `deleteDoc`: enforce Admin-only and delegate to `softDeleteService`.
  - In `deleteLeaveRequest`: enforce Admin/HR-only and delegate to `softDeleteService`.
  - In document date modification: invoke `validateChronoDateBoundary`.

- [x] **Step 4.4: Run unit tests to verify Invariants 54–63 pass**

---

### Task 5: Server Actions & Authorization (Phase 4)

**Files:**
- Create: `src/app/actions/recycle-bin.ts`

**Interfaces:**
- Produces:
  - `softDeleteDocumentAction(id: string, reason?: string)`
  - `softDeleteLeaveAction(id: string, reason?: string)`
  - `restoreRecycleBinItemAction(type: "CERTIFICATE" | "DOCUMENT" | "LEAVE", id: string)`
  - `purgeRecycleBinItemAction(type: "CERTIFICATE" | "DOCUMENT" | "LEAVE", id: string)`
  - `emptyRecycleBinAction(type?: string)`
  - `getRecycleBinItemsAction(filters)`
  - `getRecycleBinStatsAction()`
  - `updateRecycleBinRetentionDaysAction(days: number)`

- [x] **Step 5.1: Implement Server Actions in `src/app/actions/recycle-bin.ts`**
  - Enforce session authentication via `getSessionUser()`.
  - Enforce Admin authorization for Document & Leave items.
  - Enforce Self-Service authorization for Certificate batches.

---

### Task 6: UI/UX Implementation (Phase 5)

**Files:**
- Create: `src/app/(app)/admin/recycle-bin/page.tsx`
- Create: `src/app/(app)/document/_components/my-trash-modal.tsx`
- Modify: `src/app/(app)/document/_components/designer/cert-designer-studio.tsx`
- Modify: `src/app/(app)/settings/page.tsx`

- [x] **Step 6.1: Build Admin Recycle Bin Center (`/admin/recycle-bin`)**
  - KPI Stat Badges (Total, Certificates, Documents, Leaves, Expiring Soon).
  - Tabs: `ทั้งหมด`, `เกียรติบัตร`, `เลขหนังสือ`, `ใบลา`.
  - Search input, module badge, retention countdown badge.
  - Modals for Restore (with chrono notice) and Purge (danger confirmation).
  - Batch select checkboxes and actions.

- [x] **Step 6.2: Build Teacher Self-Service Trash (`MyTrashModal`)**
  - Accessible via "ถังขยะของฉัน" button in `/document`.
  - Shows only user's own deleted certificate batches.
  - Allows Restore; hides Purge button.

- [ ] **Step 6.3: Add Retention Days Setting in `/admin/settings`**
  - Number input (7–90 days, default 30).
  - Notice explaining fixation on existing records.

- [ ] **Step 6.4: Add Chrono Guard Helper to Date Picker**
  - Constrain `minDate` and `maxDate` with helper tooltip in certificate date forms.

---

### Task 7: Full System Verification & Git Promotion (Phase 6)

- [x] **Step 7.1: Run all unit tests**
  - `npm test` (Target: >= 201 tests passing, 0 failing).
- [x] **Step 7.2: Run School-Ops UI Scope Audit**
  - `node scripts/verify-ui-scope.mjs --deep-audit`.
- [x] **Step 7.3: Commit, Push, and Merge**
  - Commit on `dev`, push to `origin/dev`.
  - Merge into `main`, push to `origin/main`.
