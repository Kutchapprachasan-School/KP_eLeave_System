# Design Specification: Unified Recycle Bin Architecture & Chrono-Sequential Date Guard

- **Author**: Senior Forensic Full-Stack Architecture Team
- **Date**: 2026-09-12
- **Status**: Approved Design (Ready for Implementation Planning)
- **Target Modules**: Certificates (`CertificateIssuedItem` & `DocumentRecord`), Official Documents (`DocumentRecord`), Leave Requests (`LeaveRequest`)

---

## 1. Executive Summary & Problem Statement

In the school operations environment, accidental deletions of official documents, certificate batches, and leave requests can lead to administrative disruption, audit gaps, and irreversible data loss. Simultaneously, official document registries and certificate issuances require strict chronological linearity (Chrono-Sequential Invariants) to prevent backdated issuance or inconsistent date modifications.

This specification defines two tightly coupled capabilities:
1. **Unified 30-Day Recycle Bin (Soft Delete & Lifecycle Governance)**:
   - Items are soft-deleted from normal user views and held in a 30-day retention holding tank (configurable in `SystemSettings`).
   - Admin-only access for Leave Requests and Official Documents; Self-Service + Admin for Certificate batches.
   - Clean separation between **"Cancel (ขีดฆ่ายกเลิก)"** (preserves number, marked with strike-through) and **"Delete (ลบลงถังขยะ)"** (releases number, moves to Trash).
   - Strict Idempotency, Quota State Integrity, and safe Attachment Lifecycle unlinking on permanent purge.
2. **Chrono-Sequential Date Guard (การคุมช่วงวันที่ตามลำดับเวลา)**:
   - **Issuance Guard**: No backdated issuance allowed ($\text{Date} \ge \text{Date}(\text{LatestBatch})$).
   - **Bounded Modification Guard**: Modifying the date of batch $n$ is strictly bounded by adjacent records ($\text{Date}(n-1) \le \text{NewDate} \le \text{Date}(n+1)$) under database row locks.
   - **Certificate Restore Reassignment**: Restored certificates are dynamically and atomically reassigned to the tail of the timeline ($\text{Date} = \max(\text{LatestDate}, \text{today})$ and $\text{Seq} = \text{MaxSeq} + 1$).

---

## 2. Architectural Decision Records (ADRs)

### ADR-1: Unified Soft Delete on Primary Tables vs Shadow Archive
- **Decision**: Add lifecycle timestamp columns (`isDeleted`, `deletedAt`, `deletedById`, `purgeAt`, `deleteReason`) directly to `DocumentRecord` and `LeaveRequest`.
- **Rationale**: Preserves `FileAttachment` referential integrity (`onDelete: Restrict`), eliminates JSON serialization drift, and preserves relational mappings.

### ADR-2: Immutable `purgeAt` Fixation at Soft Delete Timestamp
- **Decision**: Calculate and fix `purgeAt = now() + (retentionDays * 86400 * 1000)` statically upon soft deletion.
- **Rationale**: Protects existing deleted records from unexpected premature truncation if an administrator subsequently decreases `recycleBinRetentionDays`.

### ADR-3: Strict Idempotency Invariant
- **Decision**:
  - `SoftDelete(id)` when `isDeleted == true` $\rightarrow$ Return immediate success (No-op), do NOT recalculate `purgeAt`, do NOT refund leave quota again.
  - `Restore(id)` when `isDeleted == false` $\rightarrow$ Return immediate success (No-op), do NOT reallocate sequence, do NOT re-deduct leave quota.
- **Rationale**: Immunizes against network retry storms, duplicate button clicks, and asynchronous worker overlaps.

### ADR-4: Atomic Sequence Allocation & Chrono Row Locks
- **Decision**: Sequence increments and boundary checks must execute inside a PostgreSQL serial transaction using `SELECT ... FOR UPDATE` on `DocumentConfig` and adjacent document rows.
- **Rationale**: Prevents race conditions during concurrent restorations or simultaneous issuance requests.

---

## 3. Data Model & Database Schema Changes

### 3.1 Target Models in `prisma/schema.prisma`

```prisma
model DocumentRecord {
  id             String             @id @default(cuid())
  docType        String             // "OUTBOUND", "INBOUND", "MEMO", "CERTIFICATE"
  memoSectionId  String?
  docNo          String?            @unique
  seqNo          Int?
  year           Int
  title          String
  to             String
  origin         String
  date           DateTime
  content        String
  signeeName     String
  signeePosition String
  enclosures     String?
  references     String?
  status         String             @default("DRAFT") // "DRAFT", "ISSUED", "PRINTED", "CANCELLED"
  cancelReason   String?
  isPinned       Boolean            @default(false)
  createdById    String
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt
  department     String?
  requester      String?
  idempotencyKey String?            @unique
  attachmentName String?
  attachmentUrl  String?
  
  // Relations
  user           User               @relation(fields: [createdById], references: [id], onDelete: Cascade)
  memoSection    MemoSection?       @relation(fields: [memoSectionId], references: [id])
  outgoingLinks  DocumentRelation[] @relation("FromDocument")
  incomingLinks  DocumentRelation[] @relation("ToDocument")
  attachments    FileAttachment[]
  certificateItems CertificateIssuedItem[]

  // 🛡️ Recycle Bin & Soft Delete Governance
  isDeleted      Boolean            @default(false)
  deletedAt      DateTime?
  deletedById    String?
  deletedBy      User?              @relation("DocDeletedByUser", fields: [deletedById], references: [id], onDelete: SetNull)
  purgeAt        DateTime?
  deleteReason   String?

  @@index([isDeleted, deletedAt])
  @@index([isDeleted, purgeAt])
  @@index([docType, year, seqNo])
}

model LeaveRequest {
  id             String           @id @default(cuid())
  userId         String
  type           String
  startDate      DateTime
  endDate        DateTime
  reason         String
  status         String           @default("PENDING") // "PENDING", "APPROVED", "REJECTED"
  documentUrl    String?
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  execApproverId String?
  headApproverId String?
  rejectReason   String?
  extraFields    String?
  approvedSeq    Int?
  fiscalYear     Int?
  pendingSeq     Int?
  execApprovedAt DateTime?
  headApprovedAt DateTime?
  user           User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  attachments    FileAttachment[]

  // 🛡️ Recycle Bin & Soft Delete Governance
  isDeleted      Boolean          @default(false)
  deletedAt      DateTime?
  deletedById    String?
  deletedBy      User?            @relation("LeaveDeletedByUser", fields: [deletedById], references: [id], onDelete: SetNull)
  purgeAt        DateTime?
  deleteReason   String?

  @@index([isDeleted, deletedAt])
  @@index([isDeleted, purgeAt])
}

model SystemSettings {
  id                           String   @id @default("default")
  // ... existing fields ...
  recycleBinRetentionDays      Int      @default(30)
}
```

---

## 4. Business Logic & Service Specifications

### 4.1 Permission Matrix (RBAC)

| Subsystem | Soft Delete Permission | Restore Permission | Hard Purge Permission | Number / Quota Policy on Delete |
|---|---|---|---|---|
| **Certificate Batches** | **Admin** OR **Creator** | **Admin** OR **Creator** | **Admin** Only | Number released (Not pre-reserved) |
| **Official Documents** | **Admin** Only | **Admin** Only | **Admin** Only | Number released (Cancel maintains number) |
| **Leave Requests** | **Admin** Only | **Admin** Only | **Admin** Only | Quota refunded if previously `APPROVED` |

### 4.2 Soft-Delete Workflow & Idempotency
```ts
async function softDeleteRecord(tx, { entityType, id, userId, reason, retentionDays }) {
  // 1. Fetch record with Row Lock
  const record = await tx[model].findUnique({ where: { id } });
  if (!record) throw new NotFoundError();

  // 2. Strict Idempotency Check
  if (record.isDeleted) {
    return { status: "NO_OP_ALREADY_DELETED", record };
  }

  // 3. Fixed Purge Deadline
  const now = new Date();
  const purgeAt = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000);

  // 4. State-Bound Leave Quota Handling
  if (entityType === "LEAVE" && record.status === "APPROVED") {
    await refundLeaveDays(tx, record.userId, record.type, record.startDate, record.endDate);
  }

  // 5. Update Record
  return tx[model].update({
    where: { id },
    data: {
      isDeleted: true,
      deletedAt: now,
      deletedById: userId,
      purgeAt,
      deleteReason: reason,
    }
  });
}
```

### 4.3 Restore Workflow & Chrono-Reassignment
```ts
async function restoreCertificateRecord(tx, { id, userId }) {
  // 1. Lock record
  const cert = await tx.documentRecord.findUnique({ where: { id }, include: { certificateItems: true } });
  if (!cert) throw new NotFoundError();
  if (!cert.isDeleted) return { status: "NO_OP_ALREADY_ACTIVE", record: cert };

  // 2. Atomic Allocation & Chrono Anchor
  // Lock config row
  const config = await tx.documentConfig.findFirst({
    where: { docType: "CERTIFICATE", year: cert.year },
  });
  await tx.$queryRaw`SELECT id FROM "DocumentConfig" WHERE id = ${config.id} FOR UPDATE;`;

  // Find latest active certificate batch
  const latestBatch = await tx.documentRecord.findFirst({
    where: { docType: "CERTIFICATE", year: cert.year, isDeleted: false },
    orderBy: { seqNo: "desc" }
  });

  const today = new Date();
  const latestDate = latestBatch ? new Date(latestBatch.date) : today;
  const restoreDate = today > latestDate ? today : latestDate;
  const newSeqNo = (config.currentSeq || 0) + 1;

  // 3. Reassign batch and items
  await tx.documentConfig.update({
    where: { id: config.id },
    data: { currentSeq: newSeqNo }
  });

  return tx.documentRecord.update({
    where: { id },
    data: {
      isDeleted: false,
      deletedAt: null,
      deletedById: null,
      purgeAt: null,
      date: restoreDate,
      seqNo: newSeqNo,
      docNo: `${String(newSeqNo).padStart(3, "0")}/${cert.year + 543}`,
    }
  });
}
```

### 4.4 Chrono-Sequential Date Guard
```ts
async function validateBoundedDateModification(tx, { docId, newDate, year, docType }) {
  const current = await tx.documentRecord.findUnique({ where: { id: docId } });
  if (!current || !current.seqNo) return;

  // Row lock adjacent sequences
  const [prevBatch, nextBatch] = await Promise.all([
    tx.documentRecord.findFirst({
      where: { docType, year, seqNo: { lt: current.seqNo }, isDeleted: false },
      orderBy: { seqNo: "desc" }
    }),
    tx.documentRecord.findFirst({
      where: { docType, year, seqNo: { gt: current.seqNo }, isDeleted: false },
      orderBy: { seqNo: "asc" }
    })
  ]);

  const targetDateStart = new Date(newDate).setHours(0, 0, 0, 0);

  if (prevBatch) {
    const prevDateStart = new Date(prevBatch.date).setHours(0, 0, 0, 0);
    if (targetDateStart < prevDateStart) {
      throw new Error(`CHRONO_VIOLATION: วันที่ไม่สามารถย้อนหลังก่อนชุดที่ ${prevBatch.seqNo} (${new Date(prevBatch.date).toLocaleDateString("th-TH")}) ได้`);
    }
  }

  if (nextBatch) {
    const nextDateStart = new Date(nextBatch.date).setHours(0, 0, 0, 0);
    if (targetDateStart > nextDateStart) {
      throw new Error(`CHRONO_VIOLATION: วันที่ไม่สามารถล่วงหน้าเกินชุดที่ ${nextBatch.seqNo} (${new Date(nextBatch.date).toLocaleDateString("th-TH")}) ได้`);
    }
  } else {
    // Latest batch: bound by min(today, maxBusinessDate)
    const todayStart = new Date().setHours(23, 59, 59, 999);
    if (targetDateStart > todayStart) {
      throw new Error("CHRONO_VIOLATION: ไม่อนุญาตให้ลงวันที่ล่วงหน้าในอนาคต");
    }
  }
}
```

### 4.5 Hard Purge & Storage Lifecycle Cleanup
When a record reaches `purgeAt <= now()` or an Admin clicks "Purge Now":
1. Collect all linked `FileAttachment` IDs.
2. Call `releaseAttachmentReference(tx, attId)` / storage cleanup queue for each attachment.
3. Hard delete `CertificateIssuedItem` children.
4. Hard delete `DocumentRecord` or `LeaveRequest` parent row.
5. Storage cleanup worker purges orphan blobs from Cloudflare R2 / Supabase.

---

## 5. UI/UX Specifications

### 5.1 Admin Unified Recycle Bin Center (`/admin/recycle-bin`)
- **Route**: `src/app/(app)/admin/recycle-bin/page.tsx`
- **Header**:
  - Title: "ศูนย์จัดการถังขยะและกู้คืนข้อมูล (Recycle Bin Management Center)"
  - KPI Stat Badges: Total Items, Certificates, Documents, Leaves, Expiring Soon (< 7 days).
- **Navigation Tabs**:
  - `ทั้งหมด (All)` | `เกียรติบัตร (Certificates)` | `เลขหนังสือ (Documents)` | `ใบลา (Leaves)`
- **Data Table**:
  - Badge Module: Purple (Cert), Blue (Doc), Amber (Leave).
  - Identifier & Title.
  - Deleted By & Deleted At.
  - Remaining Retention Badge: Green (`28 วัน`), Amber/Red (`3 วัน`).
  - Action Buttons: Restore (Primary Green), Purge (Danger Red).
- **Bulk Operations**:
  - Multi-select checkboxes for batch restore or batch purge.

### 5.2 Teacher Self-Service View (`/document`)
- **Action**: "ถังขยะของฉัน (My Trash)" filter/modal.
- **Constraints**:
  - Shows only certificate batches created by the active user.
  - Strictly conceals all Leave Requests (Admin/HR only).
  - Shows Restore button; hides Hard Purge button.

### 5.3 System Settings (`/admin/settings`)
- Number input for `recycleBinRetentionDays` (default: 30, bounds: 7–90).
- Explicit explanatory note that updates apply only to future deletions.

---

## 6. Verification & Automated Test Invariants

The test suite in `eLeave/tests/unit/` will be extended with:
- **Test 54**: Soft-Delete Idempotency (repeated deletes do not alter `purgeAt` or double-refund quota).
- **Test 55**: Restore Idempotency (repeated restores return no-op and do not re-deduct quota).
- **Test 56**: Leave Quota State Binding (Soft-Delete only refunds if `status === 'APPROVED'`; restore re-deducts only if `APPROVED`).
- **Test 57**: Chrono-Sequential Bounded Modification (`prevDate <= targetDate <= nextDate` enforced; violations rejected).
- **Test 58**: Certificate Restore Timeline Reassignment (restored batch receives `RestoreDate = max(latest, today)` and atomic `maxSeq + 1`).
- **Test 59**: Hard Purge Attachment Lifecycle Integration (purging parent safely triggers attachment reference release and prevents FK violation).
- **Test 60**: RBAC Enforcement (Regular teacher blocked from deleting documents or accessing leave trash).

---

## 7. Approval & Next Steps

Upon review and sign-off of this design specification:
1. Commit specification to repository.
2. Transition to `writing-plans` to produce the step-by-step implementation plan.
