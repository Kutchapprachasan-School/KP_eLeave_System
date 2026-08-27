# Supabase Storage, Vector SVG, and Egress Telemetry Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Modernize signature and leave attachment storage by migrating from in-database Base64 to Supabase Storage + Vector SVG, while installing a real-time Data Transfer / Egress Telemetry Inspector (Dev Floating Widget + Admin Dashboard).

**Architecture:** Decoupled storage pattern using Supabase Storage for binary/vector assets and Neon PostgreSQL for relational metadata. Multi-tier resilient fallback (Supabase -> Cloud Failover -> In-DB Base64) guarantees zero broken submissions. Polymorphic resolver guarantees 100% backward compatibility for historical Base64 data.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Supabase Storage API, Neon PostgreSQL (Prisma 7), Vector SVG (Bezier curves), Lucide Icons, TailwindCSS.

## Global Constraints
- Strictly local development in C:\dev\eLeave on port 3001 (Do NOT git push or deploy to Vercel/GitHub).
- Zero breaking changes for existing Base64 records in the database.
- Every task ends with an independently testable deliverable.
- Maintain strict SVG security (strip scripts/handlers, render via <img>).

---

### Task 1: Storage Provider Enhancement & Multi-Tier Fallback

**Files:**
- Modify: src/services/storage/provider.interface.ts
- Modify: src/services/storage/supabase.provider.ts
- Modify: src/services/storage/failover.provider.ts
- Create: src/services/storage/resilient-upload.ts
- Test: eLeave/tests/unit/storageProvider.test.js

**Interfaces:**
- Produces: uploadLeaveAttachmentWithFallback(...), uploadSignatureWithFallback(...), enhanced StorageProvider with UploadOptions.

- [ ] **Step 1: Write unit tests for resilient upload fallback**
- [ ] **Step 2: Run tests to verify failure**
- [ ] **Step 3: Implement enhanced StorageProvider & resilient-upload.ts**
- [ ] **Step 4: Run tests to verify pass**

---

### Task 2: Polymorphic Storage Resolver & Attachment Normalizer

**Files:**
- Create: src/lib/storage-resolver.ts
- Create: src/lib/attachment-utils.ts
- Test: eLeave/tests/unit/attachmentUtils.test.js

**Interfaces:**
- Produces: isBase64DataUrl(val), esolveFileUrl(val), parseDocumentUrls(docUrl), handleViewAttachment(url, name).

- [ ] **Step 1: Write unit tests for polymorphic resolver and attachment parser**
- [ ] **Step 2: Run tests to verify failure**
- [ ] **Step 3: Implement storage-resolver.ts and attachment-utils.ts**
- [ ] **Step 4: Run tests to verify pass**

---

### Task 3: Vector SVG Signature Exporter & Server Sanitizer

**Files:**
- Create: src/lib/svg-sanitizer.ts
- Create: src/lib/vector-signature.ts
- Test: eLeave/tests/unit/vectorSignature.test.js

**Interfaces:**
- Produces: exportStrokesToSvg(strokes, width, height), sanitizeSvg(svgString).

- [ ] **Step 1: Write unit tests for SVG generator, dimensions, and XSS sanitization**
- [ ] **Step 2: Run tests to verify failure**
- [ ] **Step 3: Implement svg-sanitizer.ts and vector-signature.ts**
- [ ] **Step 4: Run tests to verify pass**

---

### Task 4: Profile Signature Studio & User Action Integration

**Files:**
- Modify: src/app/(app)/profile/page.tsx
- Modify: src/app/actions/user.ts
- Test: Manual verification in browser (/profile)

- [ ] **Step 1: Update profile canvas to record vector strokes alongside visual preview**
- [ ] **Step 2: Connect save action to sanitize SVG and upload to Supabase signatures bucket**
- [ ] **Step 3: Verify preview in both Light and Dark mode**

---

### Task 5: Print Layouts & Iframe Loader Waiter (Google Drive Sync)

**Files:**
- Modify: src/app/print/leave/[id]/page.tsx
- Modify: src/app/print/leave/batch/page.tsx
- Modify: src/app/(app)/approvals/page.tsx

- [ ] **Step 1: Update print templates with crossOrigin="anonymous" and explicit vector dimensions**
- [ ] **Step 2: Add waitForIframeImages in pprovals/page.tsx before html2canvas PDF generation**
- [ ] **Step 3: Test print preview and verify zero blank signatures**

---

### Task 6: Resilient Leave Request Attachment Upload

**Files:**
- Modify: src/app/(app)/request/page.tsx
- Modify: src/app/actions/upload.ts
- Modify: src/app/actions/leave.ts

- [ ] **Step 1: Update file attachment handler in equest/page.tsx to upload to Supabase Storage with graceful Base64 fallback**
- [ ] **Step 2: Update upload.ts to return normalized { name, url, preview }**
- [ ] **Step 3: Verify leave submission with PDF/image attachments**

---

### Task 7: Approvals & History Attachment Viewer Normalization

**Files:**
- Modify: src/app/(app)/approvals/page.tsx
- Modify: src/app/(app)/history/page.tsx

- [ ] **Step 1: Replace legacy inline attachment logic with parseDocumentUrls and handleViewAttachment**
- [ ] **Step 2: Test opening both legacy Base64 attachments and new Supabase URLs**

---

### Task 8: Real-Time Egress Telemetry Middleware & Live Floating Dev Bar Widget

**Files:**
- Create: src/lib/telemetry.ts
- Create: src/components/dev/FloatingEgressWidget.tsx
- Modify: src/app/(app)/layout.tsx
- Test: eLeave/tests/unit/telemetry.test.js

- [ ] **Step 1: Implement in-memory circular ring buffer for action telemetry**
- [ ] **Step 2: Build floating dev bar widget with real-time payload meter (🟢 <50KB, 🟡 50-200KB, 🔴 >200KB)**
- [ ] **Step 3: Mount widget conditionally in dev mode in layout.tsx**

---

### Task 9: Admin Telemetry Dashboard Panel in Logs / Settings

**Files:**
- Create: src/app/actions/telemetry.ts
- Modify: src/app/(app)/logs/page.tsx (or Telemetry tab in settings)

- [ ] **Step 1: Implement getTelemetryStats() Server Action (Top consumers, daily volume, alerts)**
- [ ] **Step 2: Build Telemetry Dashboard UI tab with ranking charts and Neon quota gauge**
- [ ] **Step 3: Verify complete end-to-end telemetry reporting**
