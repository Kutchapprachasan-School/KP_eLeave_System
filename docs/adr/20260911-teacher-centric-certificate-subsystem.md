# ADR-20260911-02: Teacher-Centric Certificate Register Subsystem (Row Lock, DB Unique Constraint, Committed Snapshot Export & Invariable Lifecycle)

## Status
APPROVED (Senior Review Locks Integrated) - 2026-09-11

## Context & Problem Statement
The school's certificate number registration subsystem (`/document?view=cert`) had critical architectural vulnerabilities and user friction:
1. **Concurrency & Race Condition Risk**: Lack of authoritative sequence locking risked duplicate certificate numbers under concurrent requests.
2. **Missing Database-Level Invariant**: No DB-level unique constraint on `(year, seqNo)` or individual certificate numbers, relying solely on application-level calculations.
3. **Sequence Degradation Risk on Cancellation**: Without explicit invariants, cancelling a batch could lead to recycled or collided sequence numbers.
4. **Export Desynchronization Risk**: Relying on client-side preview calculations for Mail Merge export risked generating spreadsheets divergent from committed database state.
5. **UI Visual Noise & Friction**: Cramped table, multi-colored gradients, lack of instant 1-click Mail Merge roster for Canva Bulk Create / Word Mail Merge.

## Senior Architecture Locks & Key Decisions

### 🔴 1. Authoritative Row-Level Sequence Lock (`SELECT ... FOR UPDATE`)
- Avoid Neon/PgBouncer pooler advisory lock issues by utilizing PostgreSQL **Row-Level Locking** on the authoritative sequence row in `"DocumentConfig"`:
  ```sql
  SELECT id, "currentSeq" FROM "DocumentConfig"
  WHERE "docType" = 'CERTIFICATE'
  FOR UPDATE;
  ```
- Any concurrent batch issuance transaction requesting certificate numbers MUST queue and wait for the authoritative row lock, ensuring sequential atomic increments.

### 🔴 2. DB-Level Final Guard (Unique Constraint)
- Create `CertificateIssuedItem` table with database-enforced unique constraints:
  ```sql
  CONSTRAINT "uk_cert_item_year_seq" UNIQUE(year, "seqNo"),
  CONSTRAINT "uk_cert_item_number" UNIQUE("certificateNumber"),
  CONSTRAINT "uk_cert_item_verify_token" UNIQUE("verifyToken")
  ```
- Every certificate issued within a batch is committed as an individual row in `CertificateIssuedItem`. Even if application code were compromised, PostgreSQL storage engine will reject any duplicate sequence number in the same Buddhist Era year.

### 🔴 3. Cancellation Invariant: Cancelled Numbers are NEVER Recycled
- When a batch is cancelled via `cancelDoc`:
  - `DocumentRecord.status` and all associated `CertificateIssuedItem.status` are transitioned to `"CANCELLED"`.
  - The rows remain permanently in `CertificateIssuedItem`, keeping the unique constraint `(year, seqNo)` populated.
  - `DocumentConfig.currentSeq` is **NEVER decremented**.
  - Cancelled certificate numbers remain in the audit ledger forever with clear visual strikethrough and can never be re-allocated.

### 🔴 4. Mail Merge Export is Exclusively a Snapshot of Committed DB Records
- Flow:
  ```text
  Client submit (with idempotencyKey)
    ↓
  DB Transaction (Lock row -> Calculate -> Insert DocumentRecord + CertificateIssuedItem rows -> Update Seq)
    ↓
  Commit Transaction
    ↓
  Server returns committed records (or Client fetches from getCertificateBatchItems API)
    ↓
  Generate XLSX / CSV from committed DB snapshot
  ```
- The frontend NEVER constructs the Mail Merge roster from ephemeral preview state.

### 🟠 5. Separation of Editable vs Immutable Fields
- **Editable Metadata** via `updateCertificateMetadata`:
  - `title`, `origin`, `requester`, `date`
- **Immutable Fields** (Hard-locked on server, API rejects mutation):
  - `docNo`, `seqNo`, `year`, `idempotencyKey`, `createdById`, `createdAt`, and sequence rows.

### 🟠 6. Batch Idempotency
- Client sends an `idempotencyKey` per issuance intent.
- `DocumentRecord` enforces a unique index on `idempotencyKey`.
- Redundant submissions (user double-click or network retry) safely return the existing committed batch without re-allocating sequence numbers.

### 🟠 7. Cryptographically Unguessable QR Verification Endpoint
- QR code points to `/verify/cert?token=[verifyToken]` using a secure CUID/UUID token.
- Verification endpoint queries status from DB (`ISSUED` or `CANCELLED`) without embedding raw personal information in the QR payload or using sequential numbers that invite enumeration.

### 8. Clean 2-Column Studio Layout
- Apple/Notion-inspired minimalist aesthetic (soft neutral slate and warm amber).
- Left: Clean form with Quick Role Chips (`+ ผู้เข้าร่วม`, `+ วิทยากร`, `+ กรรมการ`, `+ นักเรียนชนะเลิศ`).
- Right: Live Summary Preview showing simulated range and breakdown.

## Invariants Enforced
1. **DB Hard Constraint**: $\forall \text{item}_1, \text{item}_2 \in \text{CertificateIssuedItem}: (item_1.year = item_2.year \land item_1.seqNo = item_2.seqNo) \implies item_1.id = item_2.id$.
2. **Authoritative Lock Order**: Sequence allocation MUST lock `"DocumentConfig"` via `FOR UPDATE` before inserting into `DocumentRecord` and `CertificateIssuedItem`.
3. **Monotonic Ledger Retention**: Sequence numbers for cancelled records are never reused or deleted.
4. **Committed Roster Source of Truth**: Mail Merge spreadsheets must strictly contain rows populated from committed `CertificateIssuedItem` database records.

## Consequences
- **Positive**:
  - Financial/Document-grade integrity: 100% duplicate immunity at database storage layer.
  - Safe across connection poolers (no advisory lock dependency).
  - Eliminates human typing in Canva Bulk Create / Word Mail Merge.
  - Clean, professional teacher experience.
- **Negative / Trade-offs**:
  - One additional child table (`CertificateIssuedItem`) to maintain per-certificate item records.
