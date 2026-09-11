# ADR-20260911-03: Certificate Visual Mail-Merge Designer & High-Fidelity Thai PDF Studio (Version 4.5 — Golden Sealed & Final)

## Status
APPROVED & GOLDEN SEALED (Version 4.5 Final Production Specification) — 2026-09-11

## Context & Problem Statement
Teachers require an in-browser Certificate Designer and Mail-Merge Studio to produce finished PDF certificates from issued batches and external Excel rosters.

Version 4.5 Final seals all forensic reviews, establishes strict `SYSTEM_PRESET` immutability, cleans schema redundancy, audits the complete 37-invariant registry, and freezes the design for execution.

---

## 🏆 Final Forensic Patches

### 🔴 1. Strict `SYSTEM_PRESET` Immutability Policy
In `certificate-template.service.ts`:
- **Generic mutation blocked:** Any generic template update on a `SYSTEM_PRESET` or attempt to mutate targetScope to `SYSTEM_PRESET` is rejected unconditionally with `PRESET_IMMUTABLE`. Super Admins cannot alter presets via the studio editor.
- **Provisioning isolation:** `SYSTEM_PRESET` records can only be seeded or modified via dedicated system migration/provisioning scripts. Users interact with presets strictly via the Fork protocol.

### 🟠 2. Redundant Index Elimination
- In `model FileAttachment`, `objectKey String @unique` already establishes a unique B-Tree index. The redundant `@@index([objectKey])` is removed to reduce write I/O overhead on PostgreSQL.

---

## 🏛️ Comprehensive Architecture Registry (37 Audited Invariants)

```
                            FileAttachment
                                  │
         ┌────────────────────────┴────────────────────────┐
         │                                                 │
   Reference Lifecycle                               Upload Lifecycle
         │                                                 │
         ▼                                                 ▼
    ACTIVE only                                      UPLOAD_PENDING
   (counters reset                                         │
    on revival #34)                          (FOR UPDATE + lease check)
         │                                                 │
         ▼                                                 ▼
   PENDING_DELETE                                    UPLOAD_CLEANUP
         │                                                 │
(re-check refs under lock)                                 ▼
         │                                             R2 DELETE
         ▼                                    (DeleteObjectResult contract #31)
     DELETING                                              │
(with deletionLeaseId #36)                          ┌──────┴──────┐
         │                                          │             │
   ┌─────┴─────┐                                 success       failure
   │           │                                    │             │
success     failure                                 ▼             ▼
   │           │                                DELETE DB      retry
   ▼           ▼                            (cleanupAttempts (cleanupAttempts
DELETE DB    retry                                 ++ #35)        ++ #35)
 (guarded    (guarded
  by lease    by lease
  token #36)  token #36)
```

| # | Code | Category | Invariant Summary |
|:---:|:---|:---|:---|
| 1 | **1** | Storage SOT | `backgroundStorageKey` deleted; `FileAttachment.objectKey` is single Source of Truth |
| 2 | **A** | Concurrency | Bilateral row locks (`FOR UPDATE`) in both Fork & Delete |
| 3 | **B** | Concurrency | Atomic CAS `updateMany` checking `id`, `templateVersion`, and mutable fields |
| 4 | **C** | Lifecycle | `countAttachmentReferences()` deterministically checks CertificateTemplate and direct FK columns |
| 5 | **D** | Storage | Storage deletion strictly post-commit |
| 6 | **E** | Rendering | Dynamic A4: Portrait (`2480×3508`) & Landscape (`3508×2480`) |
| 7 | **F** | Rendering | Single reusable canvas, `setTimeout(0)` event-loop yielding, zero retained buffers |
| 8 | **G** | Data Integrity | Non-mutating export copy; raw domain roster values remain pristine |
| 9 | **H** | CORS / Storage | Playwright E2E verifies R2 `crossOrigin` $\rightarrow$ `drawImage` $\rightarrow$ `toBlob` |
| 10 | **I** | Typography | `ensureFontsLoaded()` returns shared `LoadedFontSet` (Sarabun & Prompt 400/700) |
| 11 | **J** | Testing | Tri-layer test plan (Unit / Prisma Integration / Playwright Browser E2E) |
| 12 | **K** | Database | Prisma enums: `TemplateOrientation`, `TemplateScope`, `AttachmentStatus` |
| 13 | **L** | Scope Control | Sequence issuance remains in `DocumentConfig`; no studio sequence creep |
| 14 | **M** | Lifecycle | Explicit state machine: `UPLOAD_PENDING → ACTIVE → PENDING_DELETE → DELETING` |
| 15 | **N** | Architecture | Centralized `acquireAttachmentReference()` & `releaseAttachmentReference()` |
| 16 | **O** | Concurrency | Worker row lock + reference re-check gate (revives if referenced) |
| 17 | **P** | Lifecycle | DB-first upload with `UPLOAD_PENDING` state |
| 18 | **R** | Security/CORS | Transparent CORS error; removed pseudo-blob fetch illusion |
| 19 | **S** | Authorization | `SYSTEM_PRESET` immutable predicate embedded in atomic CAS `WHERE` |
| 20 | **U** | Data Integrity | Single-quote (`'`) prefix formula injection protection without mutating numeric values |
| 21 | **V** | Typography | Font sizes stored in `pt`, converted via `ptToCanvasPx(pt, dpi)` |
| 22 | **W** | Concurrency | Fork acquires row lock first, then re-reads source template data |
| 23 | **X** | Integration Test| 4 assertions + 3-way concurrent scenario (Fork + Delete + Worker) |
| 24 | **Y** | Crash Recovery | `deletingAt` timed lease allows reclaiming stale `DELETING` rows |
| 25 | **Z** | Storage | Stale upload cleanup physically deletes cloud bytes before database deletion |
| 26 | **AA**| Concurrency | Ascending lexicographical sort before `FOR UPDATE` prevents swap deadlocks |
| 27 | **AB**| Architecture | Subsystem boundary: Studio is exclusive adapter of existing attachments |
| 28 | **AC**| Concurrency | CAS update + attachment swap in single atomic transaction |
| 29 | **AD**| Architecture | Dedicated `certificate-template.service.ts` domain service layer |
| 30 | **AE**| Lifecycle | Two-phase upload cleanup: `UPLOAD_PENDING → UPLOAD_CLEANUP` under lock |
| 31 | **AF**| Storage | `DeleteObjectResult` contract; DB row preserved on transient R2 failure |
| 32 | **AG**| Reliability | Durable periodic cleanup worker (`/api/cron/attachment-cleanup`) |
| 33 | **AH**| Hardening | `uploadSessionId @unique` enables safe client upload retries |
| 34 | **#1** | Lifecycle | All failure/lease counters reset upon attachment revival to `ACTIVE` |
| 35 | **#2** | Tracking | Unified `cleanupAttempts` and `lastCleanupError` metadata across lifecycles |
| 36 | **#3** | Concurrency | Fenced `deletionLeaseId` claim token prevents split-brain finalize collisions |
| 37 | **#4** | Authorization | Strict `SYSTEM_PRESET` immutability + RBAC policy in service transaction |

---

## Final Decision
**GOLDEN SEALED — SPECIFICATION FROZEN FOR IMPLEMENTATION**.
Proceeding directly to coding.
