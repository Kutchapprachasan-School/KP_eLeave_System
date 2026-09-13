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

### ADR-4: Universal Partition Timeline Lock & Sole Sequence Allocator Authority
- **Decision**:
  - **System Invariant**: `NO TIMELINE MUTATION WITHOUT PARTITION LOCK`
    Every operation that alters or evaluates timeline order or document sequence (Create, Update date/seq, Soft Delete, Restore, Hard Purge affecting timeline, Import/Migration) MUST acquire an exclusive transaction-scoped lock on `DocumentConfig` for `(docType, year)` via `SELECT id, "currentSeq" FROM "DocumentConfig" WHERE "docType" = ? AND year = ? FOR UPDATE;`
  - **Sequence Allocator Authority**: `DocumentConfig` is the sole authoritative sequencer. `MAX(seqNo)` from DB (which **strictly includes deleted records**) serves as a disaster recovery check. If drift is detected (`maxDbSeq > currentSeq`), it triggers an atomic, audited `CRITICAL INTEGRITY EVENT` auto-heal inside the same transaction before allocation.
- **Rationale**: Prevents phantom inserts from slipping into timeline intervals, eliminates sequence drift, and maintains an unalterable monotonic sequence across all time.

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

| Subsystem | Soft Delete Permission | Restore Permission | Hard Purge Permission | Restore Business Meaning | Number / Quota Policy on Delete & Restore |
|---|---|---|---|---|---|
| **Certificate Batches** (`CERTIFICATE`) | **Admin** OR **Creator** | **Admin** OR **Creator** | **Admin** Only | **Re-issue at Timeline Tail** (ออกเลขรันใหม่ต่อท้ายสมุดทะเบียน) | **Delete**: ปล่อยเลขทันที (ไม่จองเลข)<br>**Restore**: จัดสรรเลขใหม่ `max(config.currentSeq, maxDbSeq) + 1` และวันที่ใหม่ `max(latestDate, today)` บันทึก `originalDocNo` ใน Audit Log |
| **Official Documents** (`DOCUMENT`: Outbound / Inbound / Memo) | **Admin** Only | **Admin** Only | **Admin** Only | **Restore Original Identity** (กู้ข้อมูลเดิมและคงเลขเดิม) | **Delete**: ย้ายลงถังขยะ เลขถูกปลด<br>**Restore**: ตรวจสอบว่าเลขเดิมว่างอยู่หรือไม่ หากว่างให้กู้คืนเลขเดิม (`docNo` เดิม) หากเลขชนให้ Block และแจ้งเตือน Admin |
| **Leave Requests** (`LEAVE`) | **Admin** Only | **Admin** Only | **Admin** Only | **Restore Exact Request** (กู้คืนคำขอเดิม 100%) | **Delete**: คืนโควตาวันลาเฉพาะเมื่อสถานะคือ `APPROVED`<br>**Restore**: หักโควตากลับเฉพาะเมื่อสถานะคือ `APPROVED` (หากโควตาไม่พอให้ปฏิเสธการกู้คืน) |

---

### 4.2 Soft-Delete Workflow with Authoritative Row-Level Lock & Idempotency
```ts
async function softDeleteRecord(tx: Prisma.TransactionClient, {
  entityType,
  id,
  userId,
  reason,
  retentionDays
}: {
  entityType: "CERTIFICATE" | "DOCUMENT" | "LEAVE";
  id: string;
  userId: string;
  reason?: string;
  retentionDays: number;
}) {
  const now = new Date();
  const purgeAt = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000);

  if (entityType === "DOCUMENT" || entityType === "CERTIFICATE") {
    // 1. Authoritative Pessimistic Row Lock with SELECT ... FOR UPDATE
    const [locked] = await tx.$queryRaw<Array<{
      id: string;
      isDeleted: boolean;
      status: string;
      docType: string;
      docNo: string | null;
      seqNo: number | null;
    }>>`
      SELECT id, "isDeleted", status, "docType", "docNo", "seqNo"
      FROM "DocumentRecord"
      WHERE id = ${id}
      FOR UPDATE;
    `;
    if (!locked) throw new NotFoundError("ไม่พบข้อมูลเอกสารในระบบ");

    // 2. Strict Idempotency Check (under row lock)
    if (locked.isDeleted) {
      return { status: "NO_OP_ALREADY_DELETED", record: locked };
    }

    // 3. Perform Soft Delete
    return await tx.documentRecord.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: now,
        deletedById: userId,
        purgeAt,
        deleteReason: reason,
      }
    });
  } else if (entityType === "LEAVE") {
    // 1. Authoritative Pessimistic Row Lock with SELECT ... FOR UPDATE
    const [locked] = await tx.$queryRaw<Array<{
      id: string;
      isDeleted: boolean;
      status: string;
      userId: string;
      type: string;
      startDate: Date;
      endDate: Date;
    }>>`
      SELECT id, "isDeleted", status, "userId", type, "startDate", "endDate"
      FROM "LeaveRequest"
      WHERE id = ${id}
      FOR UPDATE;
    `;
    if (!locked) throw new NotFoundError("ไม่พบข้อมูลใบลาในระบบ");

    // 2. Strict Idempotency Check (under row lock)
    if (locked.isDeleted) {
      return { status: "NO_OP_ALREADY_DELETED", record: locked };
    }

    // 3. State-Bound Leave Quota Handling under row lock
    // ONLY refund if previously APPROVED (no-op for PENDING / REJECTED)
    if (locked.status === "APPROVED") {
      await refundLeaveDays(tx, locked.userId, locked.type, locked.startDate, locked.endDate);
    }

    return await tx.leaveRequest.update({
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
}
```

---

### 4.3 Restore Workflows: Entity-Specific Invariants & Sequence Allocator Authority

#### 4.3.1 Certificate Restore (Re-issue at Timeline Tail & Atomic Audit Logging)
```ts
async function restoreCertificateRecord(tx: Prisma.TransactionClient, { id, userId }: { id: string; userId: string }) {
  // 1. Lock Target Certificate Batch Row
  const [cert] = await tx.$queryRaw<Array<{
    id: string;
    isDeleted: boolean;
    year: number;
    docType: string;
    docNo: string | null;
    seqNo: number | null;
    date: Date;
  }>>`
    SELECT id, "isDeleted", year, "docType", "docNo", "seqNo", date
    FROM "DocumentRecord"
    WHERE id = ${id}
    FOR UPDATE;
  `;
  if (!cert) throw new NotFoundError("ไม่พบชุดเกียรติบัตร");
  if (!cert.isDeleted) return { status: "NO_OP_ALREADY_ACTIVE", record: cert };

  // 2. Lock DocumentConfig row for this (docType, year) partition
  // DocumentConfig is the SOLE Sequence Allocator Authority
  const [config] = await tx.$queryRaw<Array<{ id: string; currentSeq: number | null }>>`
    SELECT id, "currentSeq"
    FROM "DocumentConfig"
    WHERE "docType" = 'CERTIFICATE' AND year = ${cert.year}
    FOR UPDATE;
  `;
  if (!config) throw new Error("ไม่พบการตั้งค่าเลขทะเบียนเกียรติบัตรประจำปี");

  // 3. Defensive Anti-Drift Integrity Sanity Check (Not a dual SOT)
  // 🛡️ INVARIANT: DO NOT filter isDeleted. All sequences ever issued in history are counted to preserve strict monotonicity.
  const [maxDbRecord] = await tx.$queryRaw<Array<{ maxSeq: number | null }>>`
    SELECT COALESCE(MAX("seqNo"), 0) AS "maxSeq"
    FROM "DocumentRecord"
    WHERE "docType" = 'CERTIFICATE' AND year = ${cert.year};
  `;

  const dbMax = maxDbRecord?.maxSeq || 0;
  let baseSeq = config.currentSeq || 0;

  // If drift detected (e.g. manual DB inserts or untracked legacy records), trigger audited auto-heal
  if (dbMax > baseSeq) {
    // 🚨 CRITICAL INTEGRITY EVENT: Logged & Audited atomically within the same tx under DocumentConfig lock
    console.warn(`[CRITICAL INTEGRITY EVENT] Sequence drift detected for CERTIFICATE (${cert.year}): config.currentSeq=${baseSeq} < maxDbSeq=${dbMax}. Repairing authority under lock.`);
    await tx.auditLog.create({
      data: {
        tableName: "DocumentConfig",
        recordId: config.id,
        action: "AUTO_HEAL_SEQUENCE_DRIFT",
        field: "currentSeq",
        oldValue: String(baseSeq),
        newValue: String(dbMax),
        changedBy: userId,
        reason: `CRITICAL INTEGRITY EVENT: ตรวจพบ seqNo ในประวัติฐานข้อมูล (${dbMax}) สูงกว่า currentSeq (${baseSeq}) ระบบจึงทำการซ่อมแซมตัวเลขรันให้ตรงกับประวัติจริงโดยอัตโนมัติภายใต้ Partition Lock`,
        createdAt: new Date()
      }
    });

    await tx.documentConfig.update({
      where: { id: config.id },
      data: { currentSeq: dbMax }
    });

    baseSeq = dbMax;
  }

  const nextSeqNo = baseSeq + 1;

  // 4. Query Latest ACTIVE Batch for Timeline Chrono Anchor
  // 🛡️ INVARIANT: Strictly active (non-deleted) records only (isDeleted = false). Deleted batches must NOT pull/push timeline.
  const [latestActive] = await tx.$queryRaw<Array<{ date: Date }>>`
    SELECT date FROM "DocumentRecord"
    WHERE "docType" = 'CERTIFICATE' AND year = ${cert.year} AND "isDeleted" = false
    ORDER BY "seqNo" DESC LIMIT 1;
  `;

  const today = new Date();
  const latestActiveDate = latestActive ? new Date(latestActive.date) : today;
  // Restore date is monotonically bounded: cannot precede latest active batch
  const restoreDate = today > latestActiveDate ? today : latestActiveDate;

  // 5. Atomically Synchronize DocumentConfig sequence authority
  await tx.documentConfig.update({
    where: { id: config.id },
    data: { currentSeq: nextSeqNo }
  });

  const originalDocNo = cert.docNo || "-";
  const newDocNo = `${String(nextSeqNo).padStart(3, "0")}/${cert.year + 543}`;

  // 6. Update DocumentRecord with new Tail Sequence & Date
  const restored = await tx.documentRecord.update({
    where: { id },
    data: {
      isDeleted: false,
      deletedAt: null,
      deletedById: null,
      purgeAt: null,
      date: restoreDate,
      seqNo: nextSeqNo,
      docNo: newDocNo,
    }
  });

  // 7. Reassign CertificateIssuedItem running numbers
  await tx.certificateIssuedItem.updateMany({
    where: { documentRecordId: id },
    data: { certificateNumber: newDocNo }
  });

  // 8. 🛡️ ATOMIC IN-TRANSACTION AUDIT LOGGING (Invariant: Missing Audit = Abort Transaction)
  // Must be executed within the exact same `tx` boundary before commit.
  await tx.auditLog.create({
    data: {
      tableName: "DocumentRecord",
      recordId: id,
      action: "RESTORE_REISSUE",
      field: "docNo",
      oldValue: originalDocNo,
      newValue: newDocNo,
      changedBy: userId,
      reason: `กู้คืนจากถังขยะและออกเลขต่อท้ายสมุดทะเบียน (เดิม: ${originalDocNo} วันที่ ${cert.date.toISOString().split("T")[0]} -> ใหม่: ${newDocNo} วันที่ ${restoreDate.toISOString().split("T")[0]})`,
      createdAt: new Date()
    }
  });

  return { status: "RESTORED_REISSUED_AT_TAIL", record: restored, originalDocNo, newDocNo };
}
```

#### 4.3.2 Official Document Restore (Restore Original Identity)
```ts
async function restoreOfficialDocumentRecord(tx: Prisma.TransactionClient, { id, userId }: { id: string; userId: string }) {
  // 1. Lock Target Document Row
  const [doc] = await tx.$queryRaw<Array<{
    id: string;
    isDeleted: boolean;
    year: number;
    docType: string;
    docNo: string | null;
    seqNo: number | null;
  }>>`
    SELECT id, "isDeleted", year, "docType", "docNo", "seqNo"
    FROM "DocumentRecord"
    WHERE id = ${id}
    FOR UPDATE;
  `;
  if (!doc) throw new NotFoundError("ไม่พบเอกสารราชการ");
  if (!doc.isDeleted) return { status: "NO_OP_ALREADY_ACTIVE", record: doc };

  // 2. Collision Check: Verify that original docNo is NOT taken by an active document
  if (doc.docNo) {
    const conflict = await tx.documentRecord.findFirst({
      where: { docNo: doc.docNo, isDeleted: false, id: { not: id } }
    });
    if (conflict) {
      throw new Error(`DOCUMENT_COLLISION: เลขที่หนังสือเดิม (${doc.docNo}) ถูกนำไปออกให้เอกสารอื่นแล้ว ไม่สามารถกู้คืนได้ กรุณาติดต่อผู้ดูแลระบบเพื่อตรวจสอบ`);
    }
  }

  // 3. Restore with Original Identity Preserved
  const restored = await tx.documentRecord.update({
    where: { id },
    data: {
      isDeleted: false,
      deletedAt: null,
      deletedById: null,
      purgeAt: null,
    }
  });

  // 4. Atomic In-Transaction Audit Log
  await tx.auditLog.create({
    data: {
      tableName: "DocumentRecord",
      recordId: id,
      action: "RESTORE_IDENTITY",
      field: "isDeleted",
      oldValue: "true",
      newValue: "false",
      changedBy: userId,
      reason: `กู้คืนเอกสารราชการเดิม เลขที่ ${doc.docNo || "-"}`,
      createdAt: new Date()
    }
  });

  return restored;
}
```

#### 4.3.3 Leave Request Restore (Restore Exact Request & State-Bound Re-deduction)
```ts
async function restoreLeaveRequest(tx: Prisma.TransactionClient, { id, userId }: { id: string; userId: string }) {
  // 1. Lock Target Leave Row
  const [leave] = await tx.$queryRaw<Array<{
    id: string;
    isDeleted: boolean;
    status: string;
    userId: string;
    type: string;
    startDate: Date;
    endDate: Date;
  }>>`
    SELECT id, "isDeleted", status, "userId", type, "startDate", "endDate"
    FROM "LeaveRequest"
    WHERE id = ${id}
    FOR UPDATE;
  `;
  if (!leave) throw new NotFoundError("ไม่พบใบลา");
  if (!leave.isDeleted) return { status: "NO_OP_ALREADY_ACTIVE", record: leave };

  // 2. State-Bound Leave Quota Handling: If previously APPROVED, verify quota and re-deduct
  if (leave.status === "APPROVED") {
    await deductLeaveDaysOrThrow(tx, leave.userId, leave.type, leave.startDate, leave.endDate);
  }

  // 3. Restore Exact Request Record
  const restored = await tx.leaveRequest.update({
    where: { id },
    data: {
      isDeleted: false,
      deletedAt: null,
      deletedById: null,
      purgeAt: null,
    }
  });

  // 4. Atomic In-Transaction Audit Log
  await tx.auditLog.create({
    data: {
      tableName: "LeaveRequest",
      recordId: id,
      action: "RESTORE_LEAVE",
      field: "isDeleted",
      oldValue: "true",
      newValue: "false",
      changedBy: userId,
      reason: `กู้คืนใบลาสถานะ ${leave.status} (ผู้ลา: ${leave.userId}, ประเภท: ${leave.type})`,
      createdAt: new Date()
    }
  });

  return restored;
}
```

---

### 4.4 Chrono-Sequential Date Guard with Partition Lock against Phantom Rows
```ts
async function validateBoundedDateModification(
  tx: Prisma.TransactionClient,
  { docId, newDate, year, docType }: { docId: string; newDate: Date | string; year: number; docType: string }
) {
  // 1. 🛡️ PARTITION TIMELINE LOCK (Immunizes against Phantom Rows)
  // Lock DocumentConfig row for (docType, year) to serialize any timeline-altering operations
  // (create, delete, restore, date change) in this domain. No phantom insert can slip between n-1 and n+1!
  const [partitionLock] = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "DocumentConfig"
    WHERE "docType" = ${docType} AND year = ${year}
    FOR UPDATE;
  `;
  if (!partitionLock) throw new Error("ไม่พบการตั้งค่าสมุดทะเบียนสำหรับปีดังกล่าว");

  // 2. Authoritative Row Lock on the target document (n)
  const [current] = await tx.$queryRaw<Array<{ id: string; seqNo: number; date: Date }>>`
    SELECT id, "seqNo", date FROM "DocumentRecord" WHERE id = ${docId} FOR UPDATE;
  `;
  if (!current || !current.seqNo) return;

  // 3. Lock adjacent preceding row (n-1) with SELECT ... FOR UPDATE
  const [prevBatch] = await tx.$queryRaw<Array<{ id: string; seqNo: number; date: Date }>>`
    SELECT id, "seqNo", date FROM "DocumentRecord"
    WHERE "docType" = ${docType} AND year = ${year} AND "seqNo" < ${current.seqNo} AND "isDeleted" = false
    ORDER BY "seqNo" DESC
    LIMIT 1
    FOR UPDATE;
  `;

  // 4. Lock adjacent succeeding row (n+1) with SELECT ... FOR UPDATE
  const [nextBatch] = await tx.$queryRaw<Array<{ id: string; seqNo: number; date: Date }>>`
    SELECT id, "seqNo", date FROM "DocumentRecord"
    WHERE "docType" = ${docType} AND year = ${year} AND "seqNo" > ${current.seqNo} AND "isDeleted" = false
    ORDER BY "seqNo" ASC
    LIMIT 1
    FOR UPDATE;
  `;

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
    // Latest batch in sequence: bounded by today (no future dating)
    const todayEnd = new Date().setHours(23, 59, 59, 999);
    if (targetDateStart > todayEnd) {
      throw new Error("CHRONO_VIOLATION: ไม่อนุญาตให้ลงวันที่ล่วงหน้าในอนาคต");
    }
  }
}
```

---

### 4.5 Bulk Operations Transaction Strategy: Itemized Isolation with Per-Item Atomic Boundary

To avoid partial failure catastrophe (where 1 invalid item rolls back 49 valid items, or state inconsistencies confuse the UI):
1. **Per-Item Transaction Isolation**:
   Each item within a bulk restore or bulk purge is executed within its own dedicated atomic `prisma.$transaction`.
2. **Itemized Execution Contract**:
   The Server Action returns an itemized execution result contract:
   ```ts
   export interface BulkOperationResult {
     totalRequested: number;
     successCount: number;
     failureCount: number;
     results: Array<{
       id: string;
       entityType: "CERTIFICATE" | "DOCUMENT" | "LEAVE";
       status: "SUCCESS" | "FAILED" | "NO_OP";
       error?: string;
       docNo?: string;
       newDocNo?: string;
     }>;
   }
   ```
3. **UI State Reconciliation**:
   - Items with status `SUCCESS` are immediately removed from the Recycle Bin table.
   - Items with status `FAILED` remain in the table and display an explicit error tooltip explaining the exact validation barrier (e.g. quota limit exceeded, document number collision).

---

### 4.6 Hard Purge & Storage Lifecycle Cleanup
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

The test suite in `eLeave/tests/unit/recycleBinAndFontStudio.test.js` will be extended with:
- **Test 54: Soft-Delete Idempotency & Row Lock**: Concurrent/repeated delete calls execute as no-ops under `FOR UPDATE` row lock, with static `purgeAt` and zero double quota refunds.
- **Test 55: Restore Idempotency**: Repeated restore calls on active items return no-op without re-allocating sequence or re-deducting leave quotas.
- **Test 56: State-Bound Leave Quota**: Refunds leave days on delete and re-deducts on restore ONLY if `status === 'APPROVED'`. Blocked if user lacks quota.
- **Test 57: Chrono-Sequential Concurrency & Partition Lock Mutual Exclusion Harness**:
  - Real Concurrency Harness:
    ```
    TX-A acquires DocumentConfig partition lock FOR UPDATE
    TX-B attempts concurrent timeline mutation (insert/update date)
          ↓
    TX-B is blocked and forced to WAIT
          ↓
    TX-A modifies timeline and COMMITS
          ↓
    TX-B resumes, reads committed state, and enforces bounded order
          ↓
    Final timeline remains strictly monotonic: Date(n-1) <= Date(n) <= Date(n+1)
    ```
- **Test 58: Sole Sequence Allocator Authority & Sanity Healing**:
  - Verifies `DocumentConfig.currentSeq` is the sole allocator authority.
  - Verifies `MAX(seqNo)` strictly counts deleted records (`isDeleted = true`) to prevent sequence re-use.
  - If drift occurs (`maxDbSeq > currentSeq`), triggers atomic in-transaction `AUTO_HEAL_SEQUENCE_DRIFT` audit log before allocation.
- **Test 59: Certificate Restore Timeline Tail Re-issuance**:
  - Restored batch receives `latestActiveDate = MAX(date WHERE isDeleted = false)`.
  - Atomically writes `AuditLog(originalDocNo -> newDocNo)` inside same transaction.
  - Invariant: If audit log creation fails, transaction aborts and rolls back ("No Audit = No Commit").
- **Test 60: Document Restore Collision Guard**:
  - Official document restore preserves original `docNo`; if number was reused by another document, blocks restore with explicit collision error.
- **Test 61: Bulk Operations Itemized Isolation**:
  - Tests 5-item bulk restore (4 valid, 1 quota/collision failure): 4 succeed, 1 fails with itemized failure contract; failure does not rollback successes.
- **Test 62: Hard Purge Attachment Reference Lifecycle**:
  - Purging parent record safely releases attachment reference via `releaseAttachmentReference` before deleting DB row, preventing FK Restrict error.
- **Test 63: RBAC Enforcement**:
  - Regular teachers strictly blocked from deleting official documents or accessing leave recycle bin.

---

## 7. Approval & Next Steps

Upon review and sign-off of this design specification:
1. Commit specification to repository.
2. Transition to `writing-plans` to produce the step-by-step implementation plan.
