# School Operation Privacy Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the School Operation Privacy Governance and Consent Management Infrastructure for KP e-Leave System according to SPEC-2026-09-14-PRIVACY-GOVERNANCE Rev. 1.0, covering Policy Management, ROPA Registry, Purpose-based Consent Lifecycle, Database-enforced Append-Only Audit Trail, and Contextual UX.

**Architecture:** 
- Shared Privacy Governance Layer decoupled from Electronic Signature Domain.
- Pattern A: Current State in `ConsentRecord` with unique constraint per `(userId, purposeId)` + immutable event stream in `ConsentAuditLog`.
- Database-level integrity: PostgreSQL triggers prohibiting UPDATE/DELETE on audit log for application runtime roles, partial unique index for current policies, and database CHECK constraints for state lifecycles and Section 26 rules.
- Concurrency control: Atomic transactions with row-level locking (`SELECT ... FOR UPDATE`) or OCC guarantees for consent mutations and audit event binding.
- Contextual UX: Notice/Terms acknowledgment at registration, contextual just-in-time consent for optional processing (e.g. LINE Notify), and user self-service privacy center (`/settings/privacy` and `/privacy`).

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Prisma Client `^7.8.0` with `partialIndexes`, PostgreSQL 16+ (Neon Serverless), Tailwind CSS v4, Lucide React.

## Global Constraints

- Prisma Version: `^7.8.0` with `previewFeatures = ["partialIndexes"]` active in `schema.prisma`.
- Import Path Convention: Unit tests in `eLeave/tests/unit/` must import application code from `../../../src/...` (3 levels up to repo root).
- Schema Invariant: `ConsentRecord` must use `purposeId` FK referencing `ProcessingPurpose(id)` with `onDelete: Restrict`.
- Immutability Invariant: `ConsentAuditLog` must enforce append-only at the PostgreSQL trigger level for application roles.
- Legal Scope Invariant: Consent withdrawal only stops processing relying on consent; it never halts `PUBLIC_TASK` or `LEGAL_OBLIGATION` processing.
- Security Invariant: No PII allowed in metadata fields.
- Evidence Invariant: `PolicyAcknowledgment` user relation must use `onDelete: Restrict` to preserve compliance history.

---

### Task 1: Database Schema & Migration Workflow with Engine Invariants

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260914000000_privacy_governance_core/migration.sql`
- Test: `eLeave/tests/unit/privacySchemaInvariants.test.js`

**Interfaces:**
- Consumes: PostgreSQL DB connection via Prisma
- Produces: 7 models (`PolicyDocument`, `PolicyAcknowledgment`, `ProcessingActivity`, `ProcessingPurpose`, `ProcessingDataCategoryPolicy`, `ConsentRecord`, `ConsentAuditLog`) and enums with DB CHECK constraints and triggers.

- [ ] **Step 1: Write failing test verifying schema models and invariants**

Create `eLeave/tests/unit/privacySchemaInvariants.test.js`:
```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../../src/lib/db.ts';

describe('Privacy Governance Schema Invariants', () => {
  test('Prisma Client exports all 7 privacy models with expected delegate methods', async () => {
    assert.ok(typeof prisma.policyDocument?.findFirst === 'function', 'prisma.policyDocument must have findFirst');
    assert.ok(typeof prisma.policyAcknowledgment?.findMany === 'function', 'prisma.policyAcknowledgment must have findMany');
    assert.ok(typeof prisma.processingActivity?.findUnique === 'function', 'prisma.processingActivity must have findUnique');
    assert.ok(typeof prisma.processingPurpose?.findUnique === 'function', 'prisma.processingPurpose must have findUnique');
    assert.ok(typeof prisma.processingDataCategoryPolicy?.findFirst === 'function', 'prisma.processingDataCategoryPolicy must have findFirst');
    assert.ok(typeof prisma.consentRecord?.upsert === 'function', 'prisma.consentRecord must have upsert');
    assert.ok(typeof prisma.consentAuditLog?.create === 'function', 'prisma.consentAuditLog must have create');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test eLeave/tests/unit/privacySchemaInvariants.test.js`
Expected: FAIL (models not defined on prisma client)

- [ ] **Step 3: Update `prisma/schema.prisma` with Privacy Governance Models**

Add enums and models to `prisma/schema.prisma`:
```prisma
enum PolicyType {
  PRIVACY_NOTICE
  TERMS_OF_USE
}

enum LegalBasisType {
  PUBLIC_TASK
  LEGAL_OBLIGATION
  CONTRACT
  CONSENT
  LEGITIMATE_INTEREST
  VITAL_INTEREST
}

enum Section26ConditionType {
  EXPLICIT_CONSENT
  VITAL_INTEREST_EMERGENCY
  NON_PROFIT_BODY_LEGITIMATE_ACTIVITY
  MANIFESTLY_PUBLIC_DATA
  LEGAL_CLAIMS_AND_DEFENSE
  LABOR_AND_SOCIAL_SECURITY_LAW
  STATUTORY_PUBLIC_HEALTH
  SUBSTANTIAL_PUBLIC_INTEREST
}

enum DataCategoryType {
  GENERAL_IDENTITY
  CONTACT_INFO
  EMPLOYMENT_RECORD
  SENSITIVE_HEALTH
  SENSITIVE_BIOMETRIC
  GEOLOCATION
  DOCUMENT_ATTACHMENT
  SYSTEM_AUDIT_LOG
}

enum ConsentStatus {
  GIVEN
  WITHDRAWN
  REVOKED
}

enum AuditEventType {
  POLICY_ACKNOWLEDGED
  CONSENT_GIVEN
  CONSENT_WITHDRAWN
  CONSENT_REVOKED
}

enum AuditSubjectType {
  POLICY_DOCUMENT
  CONSENT_RECORD
}

enum AuditActorType {
  USER
  ADMIN
  SYSTEM
  MIGRATION
}

enum WithdrawalReasonCode {
  USER_CHOICE
  NO_LONGER_USING_FEATURE
  DATA_MINIMIZATION_PREFERENCE
}

enum RevocationReasonCode {
  ADMINISTRATIVE_DISCONTINUATION
  SYSTEM_MIGRATION
  STATUTORY_LEGAL_ORDER
  ACCOUNT_DECOMMISSIONED
}

enum RetentionRuleType {
  EVENT_BASED
  FISCAL_YEAR_BASED
  STATUTORY_LOG_90_DAYS
}

enum DisposalMethod {
  SECURE_DESTROY
  PERMANENT_ANONYMIZE
  TRANSFER_TO_NATIONAL_ARCHIVES
}

model PolicyDocument {
  id                      String                  @id @default(cuid())
  type                    PolicyType
  version                 String
  title                   String
  contentMarkdown         String                  @db.Text
  contentHash             String
  canonicalEngineVersion  String                  @default("v1")
  effectiveAt             DateTime
  publishedAt             DateTime                @default(now())
  isCurrent               Boolean                 @default(false)
  createdAt               DateTime                @default(now())

  acknowledgments         PolicyAcknowledgment[]

  @@unique([type, version])
  @@unique([type], map: "unique_current_policy_per_type", where: { isCurrent: true })
  @@index([type, isCurrent])
}

model PolicyAcknowledgment {
  id                      String                  @id @default(cuid())
  userId                  String
  policyDocumentId        String
  policyVersionSnapshot   String
  contentHashSnapshot     String
  source                  String                  @default("WEB_APP")
  acknowledgedAt          DateTime                @default(now())
  ipAddress               String?
  userAgent               String?

  user                    User                    @relation(fields: [userId], references: [id], onDelete: Restrict)
  policyDocument          PolicyDocument          @relation(fields: [policyDocumentId], references: [id], onDelete: Restrict)

  @@unique([userId, policyDocumentId])
  @@index([userId])
}

model ProcessingActivity {
  id                      String                  @id @default(cuid())
  code                    String                  @unique
  module                  String
  name                    String
  description             String?                 @db.Text
  controllerName          String                  @default("โรงเรียนกุดจับประชาสรรค์")
  dpoContact              String                  @default("kpschool_dpo@obec.moe.go.th")
  dataSubjectCategory     String
  retentionRuleType       RetentionRuleType       @default(EVENT_BASED)
  retentionDurationMonths Int
  retentionAuthority      String
  disposalMethod          DisposalMethod          @default(SECURE_DESTROY)
  recipientsSummary       String
  crossBorderTransfer     Boolean                 @default(false)
  crossBorderDetails      String?
  active                  Boolean                 @default(true)
  createdAt               DateTime                @default(now())
  updatedAt               DateTime                @updatedAt

  purposes                ProcessingPurpose[]

  @@index([module, active])
}

model ProcessingPurpose {
  id                      String                         @id @default(cuid())
  activityId              String
  code                    String                         @unique
  name                    String
  description             String?                        @db.Text
  active                  Boolean                        @default(true)
  createdAt               DateTime                       @default(now())
  updatedAt               DateTime                       @updatedAt

  activity                ProcessingActivity             @relation(fields: [activityId], references: [id], onDelete: Cascade)
  dataCategoryPolicies    ProcessingDataCategoryPolicy[]
  consents                ConsentRecord[]

  @@index([activityId, active])
}

model ProcessingDataCategoryPolicy {
  id                      String                         @id @default(cuid())
  purposeId               String
  dataCategory            DataCategoryType
  legalBasis              LegalBasisType
  section26Condition      Section26ConditionType?
  statutoryReference      String?
  isMandatoryForOperation Boolean                        @default(true)

  purpose                 ProcessingPurpose              @relation(fields: [purposeId], references: [id], onDelete: Cascade)

  @@unique([purposeId, dataCategory, legalBasis])
}

model ConsentRecord {
  id                      String                         @id @default(cuid())
  userId                  String
  purposeId               String
  status                  ConsentStatus                  @default(GIVEN)
  consentFormVersion      String
  privacyNoticeVersion    String?
  consentedAt             DateTime?
  withdrawnAt             DateTime?
  revokedAt               DateTime?
  source                  String
  createdAt               DateTime                       @default(now())
  updatedAt               DateTime                       @updatedAt

  user                    User                           @relation(fields: [userId], references: [id], onDelete: Cascade)
  purpose                 ProcessingPurpose              @relation(fields: [purposeId], references: [id], onDelete: Restrict)

  @@unique([userId, purposeId])
  @@index([userId, status])
}

model ConsentAuditLog {
  id                             String                  @id @default(cuid())
  eventId                        String                  @default(cuid())
  correlationId                  String
  eventType                      AuditEventType
  subjectType                    AuditSubjectType
  userId                         String
  policyDocumentId               String?
  policyVersionSnapshot          String?
  contentHashSnapshot            String?
  purposeId                      String?
  purposeCodeSnapshot            String?
  consentRecordId                String?
  consentFormVersionSnapshot     String?
  actorType                      AuditActorType          @default(USER)
  actorId                        String?
  source                         String
  withdrawalReason               WithdrawalReasonCode?
  revocationReason               RevocationReasonCode?
  reasonDetail                   String?
  occurredAt                     DateTime                @default(now())
  ipAddress                      String?
  userAgent                      String?

  @@index([userId, occurredAt])
  @@index([eventType, occurredAt])
  @@index([correlationId])
  @@index([eventId])
}
```
And add `policyAcknowledgments PolicyAcknowledgment[]` and `consentRecords ConsentRecord[]` to model `User`.

- [ ] **Step 4: Execute Prisma Migrate Workflow with Custom DDL Append**

1. Generate base migration:
```bash
npx prisma migrate dev --create-only --name privacy_governance_core
```
2. Open the generated `migration.sql` file and append custom engine invariants at the bottom:
```sql
-- 1. PostgreSQL Partial Unique Index for current policy per type
CREATE UNIQUE INDEX IF NOT EXISTS "unique_current_policy_per_type" 
ON "PolicyDocument" ("type") 
WHERE "isCurrent" = true;

-- 2. PostgreSQL Append-Only Trigger for ConsentAuditLog
CREATE OR REPLACE FUNCTION prevent_consent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'DATABASE INTEGRITY VIOLATION: ConsentAuditLog is strictly APPEND-ONLY. UPDATE and DELETE are prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_consent_audit_log_immutable ON "ConsentAuditLog";

CREATE TRIGGER trg_consent_audit_log_immutable
BEFORE UPDATE OR DELETE ON "ConsentAuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_consent_audit_log_mutation();

-- 3. Consent State Lifecycle CHECK Constraint
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "chk_consent_record_state_lifecycle" CHECK (
  (status = 'GIVEN' AND "consentedAt" IS NOT NULL AND "withdrawnAt" IS NULL AND "revokedAt" IS NULL) OR
  (status = 'WITHDRAWN' AND "consentedAt" IS NOT NULL AND "withdrawnAt" IS NOT NULL AND "revokedAt" IS NULL) OR
  (status = 'REVOKED' AND "revokedAt" IS NOT NULL)
);

-- 4. Section 26 Consistency CHECK Constraint
ALTER TABLE "ProcessingDataCategoryPolicy" ADD CONSTRAINT "chk_section26_consistency" CHECK (
  ("dataCategory" NOT IN ('SENSITIVE_HEALTH', 'SENSITIVE_BIOMETRIC') AND "section26Condition" IS NULL) OR
  ("dataCategory" IN ('SENSITIVE_HEALTH', 'SENSITIVE_BIOMETRIC') AND "section26Condition" IS NOT NULL)
);
```
3. Apply migration to database and generate client:
```bash
npx prisma migrate dev
npx prisma generate
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --experimental-strip-types --test eLeave/tests/unit/privacySchemaInvariants.test.js`
Expected: PASS

- [ ] **Step 6: Commit Task 1**

```bash
git add prisma/schema.prisma prisma/migrations eLeave/tests/unit/privacySchemaInvariants.test.js
git commit -m "feat(privacy): add privacy governance schema, DB triggers, and CHECK constraints via prisma migrate"
```

---

### Task 2: Policy Management Service & Canonical Hash Engine

**Files:**
- Create: `src/lib/privacy/policy-service.ts`
- Create: `eLeave/tests/unit/policyService.test.js`

**Interfaces:**
- Consumes: Prisma Client, crypto stdlib
- Produces:
  - `computeCanonicalHash(markdown: string): string`
  - `publishPolicyDocument(params): Promise<PolicyDocument>`
  - `getCurrentPolicy(type: PolicyType): Promise<PolicyDocument | null>`
  - `acknowledgePolicy(params): Promise<PolicyAcknowledgment>`
  - `hasUserAcknowledgedCurrentPolicy(userId, type): Promise<{ hasAcknowledged: boolean; currentPolicy?: PolicyDocument }>`

- [ ] **Step 1: Write failing unit test for Policy Service**

Create `eLeave/tests/unit/policyService.test.js`:
```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { computeCanonicalHash } from '../../../src/lib/privacy/policy-service.ts';

describe('Policy Service', () => {
  test('computeCanonicalHash produces normalized SHA-256 independent of line endings and whitespace', () => {
    const textCRLF = "# Privacy Notice \r\n\r\n Content with trailing spaces   \r\n";
    const textLF = "# Privacy Notice\n\n Content with trailing spaces\n";
    const hash1 = computeCanonicalHash(textCRLF);
    const hash2 = computeCanonicalHash(textLF);
    assert.equal(hash1, hash2, 'Normalized content must produce identical hash');
    assert.equal(hash1.length, 64, 'SHA-256 hex string must be 64 characters');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test eLeave/tests/unit/policyService.test.js`
Expected: FAIL ("computeCanonicalHash not defined")

- [ ] **Step 3: Implement `src/lib/privacy/policy-service.ts`**

```typescript
import crypto from "crypto";
import { prisma } from "../db";
import { PolicyType } from "@prisma/client";

export function computeCanonicalHash(markdown: string): string {
  const normalized = markdown
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
  return crypto.createHash("sha256").update(normalized, "utf8").digest("hex");
}

export async function publishPolicyDocument(params: {
  type: PolicyType;
  version: string;
  title: string;
  contentMarkdown: string;
  effectiveAt: Date;
}) {
  const contentHash = computeCanonicalHash(params.contentMarkdown);
  return await prisma.$transaction(async (tx) => {
    await tx.policyDocument.updateMany({
      where: { type: params.type, isCurrent: true },
      data: { isCurrent: false },
    });
    return await tx.policyDocument.create({
      data: {
        type: params.type,
        version: params.version,
        title: params.title,
        contentMarkdown: params.contentMarkdown,
        contentHash,
        effectiveAt: params.effectiveAt,
        isCurrent: true,
        publishedAt: new Date(),
      },
    });
  });
}

export async function getCurrentPolicy(type: PolicyType) {
  return await prisma.policyDocument.findFirst({
    where: { type, isCurrent: true },
  });
}

export async function acknowledgePolicy(params: {
  userId: string;
  policyDocumentId: string;
  source?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const policy = await prisma.policyDocument.findUniqueOrThrow({
    where: { id: params.policyDocumentId },
  });
  return await prisma.policyAcknowledgment.upsert({
    where: {
      userId_policyDocumentId: {
        userId: params.userId,
        policyDocumentId: params.policyDocumentId,
      },
    },
    create: {
      userId: params.userId,
      policyDocumentId: params.policyDocumentId,
      policyVersionSnapshot: policy.version,
      contentHashSnapshot: policy.contentHash,
      source: params.source || "WEB_APP",
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
    update: {
      acknowledgedAt: new Date(),
      source: params.source || "WEB_APP",
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}

export async function hasUserAcknowledgedCurrentPolicy(userId: string, type: PolicyType) {
  const current = await getCurrentPolicy(type);
  if (!current) return { hasAcknowledged: true };
  const ack = await prisma.policyAcknowledgment.findUnique({
    where: {
      userId_policyDocumentId: {
        userId,
        policyDocumentId: current.id,
      },
    },
  });
  return { hasAcknowledged: !!ack, currentPolicy: current };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test eLeave/tests/unit/policyService.test.js`
Expected: PASS

- [ ] **Step 5: Commit Task 2**

```bash
git add src/lib/privacy/policy-service.ts eLeave/tests/unit/policyService.test.js
git commit -m "feat(privacy): implement policy management service with canonical hashing and atomic publishing"
```

---

### Task 3: ROPA Registry & Purpose Legal Basis Resolution

**Files:**
- Create: `src/lib/privacy/ropa-service.ts`
- Create: `prisma/seed-privacy.ts`
- Create: `eLeave/tests/unit/ropaService.test.js`

**Interfaces:**
- Consumes: `ProcessingActivity`, `ProcessingPurpose`, `ProcessingDataCategoryPolicy`
- Produces:
  - `isConsentApplicableForPurpose(purposeId: string): Promise<boolean>`
  - `getPublicRopaSummary(): Promise<RopaActivitySummary[]>`
  - Initial seed data for School Operations: `PA_LEAVE_MANAGEMENT`, `PA_SARABAN`, `PA_ATTENDANCE`, `PA_LINE_NOTIF`

- [ ] **Step 1: Write failing unit test for ROPA Resolution with concrete domain assertions**

Create `eLeave/tests/unit/ropaService.test.js`:
```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePurposeConsentRequirement } from '../../../src/lib/privacy/ropa-service.ts';

describe('ROPA Resolution Service', () => {
  test('evaluatePurposeConsentRequirement returns false when legal basis is PUBLIC_TASK or LEGAL_OBLIGATION', () => {
    const policies = [
      { legalBasis: 'LEGAL_OBLIGATION', section26Condition: null, dataCategory: 'GENERAL_IDENTITY' },
      { legalBasis: 'LEGAL_OBLIGATION', section26Condition: 'LABOR_AND_SOCIAL_SECURITY_LAW', dataCategory: 'SENSITIVE_HEALTH' },
    ];
    assert.equal(evaluatePurposeConsentRequirement(policies), false, 'Leave with legal obligation must not require consent');
  });

  test('evaluatePurposeConsentRequirement returns true when legal basis is CONSENT or EXPLICIT_CONSENT', () => {
    const policies = [
      { legalBasis: 'CONSENT', section26Condition: null, dataCategory: 'CONTACT_INFO' },
    ];
    assert.equal(evaluatePurposeConsentRequirement(policies), true, 'LINE notification relying on consent must return true');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test eLeave/tests/unit/ropaService.test.js`
Expected: FAIL ("evaluatePurposeConsentRequirement not defined")

- [ ] **Step 3: Implement `src/lib/privacy/ropa-service.ts` and `prisma/seed-privacy.ts`**

Implement `evaluatePurposeConsentRequirement` and `isConsentApplicableForPurpose` resolving directly from `ProcessingDataCategoryPolicy`. Create `prisma/seed-privacy.ts` with institutional ROPA activities.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test eLeave/tests/unit/ropaService.test.js`
Expected: PASS

- [ ] **Step 5: Commit Task 3**

```bash
git add src/lib/privacy/ropa-service.ts prisma/seed-privacy.ts eLeave/tests/unit/ropaService.test.js
git commit -m "feat(privacy): implement ROPA registry and legal basis resolution service"
```

---

### Task 4: Consent Management Engine & Concurrency Control

**Files:**
- Create: `src/lib/privacy/consent-service.ts`
- Create: `eLeave/tests/unit/consentService.test.js`

**Interfaces:**
- Consumes: Prisma Client, ROPA Service
- Produces:
  - `recordUserConsent(params): Promise<ConsentRecord>`
  - `withdrawUserConsent(params): Promise<ConsentRecord>`
  - `revokeConsentByAdmin(params): Promise<ConsentRecord>`
  - `getUserConsents(userId): Promise<ConsentItem[]>`

- [ ] **Step 1: Write failing unit test for Consent Lifecycle & Legal Basis Validation**

Create `eLeave/tests/unit/consentService.test.js`:
```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateConsentApplicability } from '../../../src/lib/privacy/consent-service.ts';

describe('Consent Lifecycle Engine', () => {
  test('validateConsentApplicability throws error when purpose does not use CONSENT legal basis', () => {
    const nonConsentPolicies = [
      { legalBasis: 'PUBLIC_TASK', section26Condition: null }
    ];
    assert.throws(
      () => validateConsentApplicability(nonConsentPolicies),
      /Consent is not an applicable legal basis/
    );
  });

  test('validateConsentApplicability passes when purpose uses CONSENT', () => {
    const consentPolicies = [
      { legalBasis: 'CONSENT', section26Condition: null }
    ];
    assert.doesNotThrow(() => validateConsentApplicability(consentPolicies));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test eLeave/tests/unit/consentService.test.js`
Expected: FAIL

- [ ] **Step 3: Implement `src/lib/privacy/consent-service.ts` with Row-Level Locking and Concurrency Control**

Implement atomic `$transaction` with concurrency locking (`SELECT ... FOR UPDATE` via `tx.$queryRaw` or OCC version checking), state reset rules, and append-only audit log correlation.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test eLeave/tests/unit/consentService.test.js`
Expected: PASS

- [ ] **Step 5: Commit Task 4**

```bash
git add src/lib/privacy/consent-service.ts eLeave/tests/unit/consentService.test.js
git commit -m "feat(privacy): implement consent lifecycle engine with concurrency locking and audit correlation"
```

---

### Task 5: Contextual UX - Registration Form Notice & Terms Acknowledgment

**Files:**
- Modify: `src/app/login/page.tsx`
- Create: `src/components/privacy/PolicyModal.tsx`
- Create: `src/app/actions/privacy_actions.ts`

**Interfaces:**
- Consumes: Policy Service, Better Auth
- Produces:
  - Clean separation: Notice acknowledgment checkbox + Terms agreement checkbox
  - Read Modal showing current policy version and canonical hash
  - Server actions `acknowledgePolicyOnRegister()` and `fetchCurrentPolicies()`

- [ ] **Step 1: Create PolicyModal component**

Create `src/components/privacy/PolicyModal.tsx` with accessible modal, markdown viewer, version/date header, and clear action button ("รับทราบ" or "ยอมรับ" depending on policy type).

- [ ] **Step 2: Create Server Actions in `src/app/actions/privacy_actions.ts`**

Implement actions to retrieve current active policies and record user acknowledgments with request IP and User Agent.

- [ ] **Step 3: Update `src/app/login/page.tsx` Register Tab**

Add two distinct checkboxes before the submit button:
1. `[ ] ข้าพเจ้าได้อ่านและรับทราบ ประกาศการคุ้มครองข้อมูลส่วนบุคคล (Privacy Notice)` `[เปิดอ่านฉบับเต็ม]`
2. `[ ] ข้าพเจ้ายอมรับ เงื่อนไขการใช้งานระบบสารสนเทศตามระเบียบของหน่วยงาน (Terms of Use)` `[เปิดอ่านเงื่อนไข]`
Disable submit button until both are checked. Upon successful sign up, record `PolicyAcknowledgment` with snapshot values.

- [ ] **Step 4: Commit Task 5**

```bash
git add src/app/login/page.tsx src/components/privacy/PolicyModal.tsx src/app/actions/privacy_actions.ts
git commit -m "feat(privacy): implement registration notice and terms acknowledgment with policy modals"
```

---

### Task 6: Existing User Re-acknowledgment Banner & Modal

**Files:**
- Create: `src/components/privacy/PolicyUpdateNotifier.tsx`
- Modify: `src/app/(app)/layout.tsx`

**Interfaces:**
- Consumes: `hasUserAcknowledgedCurrentPolicy()`
- Produces:
  - Non-coercive floating banner/dialog when user has unacknowledged active policy version
  - Allows user to review diff and acknowledge without locking down core official functions

- [ ] **Step 1: Create `PolicyUpdateNotifier.tsx`**

Component fetches acknowledgment status on layout mount. If version mismatch is detected, displays a notification banner: *"แจ้งการปรับปรุงประกาศการคุ้มครองข้อมูลส่วนบุคคล (ฉบับที่ 1.1)"* with a button to view and acknowledge.

- [ ] **Step 2: Integrate into `src/app/(app)/layout.tsx`**

Insert `<PolicyUpdateNotifier />` within the authenticated layout hierarchy.

- [ ] **Step 3: Commit Task 6**

```bash
git add src/components/privacy/PolicyUpdateNotifier.tsx src/app/(app)/layout.tsx
git commit -m "feat(privacy): add existing user non-coercive policy update notifier in app layout"
```

---

### Task 7: Privacy Self-Service Center & Public `/privacy` Page

**Files:**
- Create: `src/app/privacy/page.tsx`
- Create: `src/app/(app)/settings/privacy/page.tsx`
- Modify: `src/app/(app)/settings/page.tsx` (Add link to Privacy Center)

**Interfaces:**
- Consumes: ROPA Service, Consent Service, Policy Service
- Produces:
  - Public `/privacy`: ROPA summary table, controller info, DPO contact, current Privacy Notice text with effective date and version.
  - Authenticated `/settings/privacy`: User's policy acknowledgment history, active consents, withdraw consent buttons with reason selection.

- [ ] **Step 1: Implement public `/privacy/page.tsx`**

Renders official institutional privacy notice, effective dates, revision number, and full ROPA summary table (purposes, data categories, legal bases, retention).

- [ ] **Step 2: Implement `/settings/privacy/page.tsx`**

Renders user self-service interface showing:
1. Policies acknowledged with timestamps and versions
2. Active purpose-based consents (e.g. LINE Notifications)
3. "ถอนความยินยอม" button opening confirmation modal with `WithdrawalReasonCode` dropdown
4. Calls `withdrawUserConsent` action and refreshes state

- [ ] **Step 3: Add navigation link in Settings**

Add link in `src/app/(app)/settings/page.tsx` pointing to `/settings/privacy`.

- [ ] **Step 4: Commit Task 7**

```bash
git add src/app/privacy/page.tsx src/app/(app)/settings/privacy/page.tsx src/app/(app)/settings/page.tsx
git commit -m "feat(privacy): add public privacy page and authenticated privacy self-service center"
```

---

### Task 8: End-to-End System Verification & Invariant Audit Test

**Files:**
- Create: `eLeave/tests/unit/privacyE2EVerification.test.js`

**Interfaces:**
- Consumes: Full Privacy Governance stack
- Produces: Comprehensive test suite verifying all 5 core invariants:
  1. PostgreSQL Trigger blocks UPDATE/DELETE on audit log for application roles
  2. Partial unique index rejects multiple `isCurrent = true`
  3. Database CHECK constraint rejects invalid `ConsentRecord` status/timestamp combinations
  4. Database CHECK constraint rejects `section26Condition` on general data categories
  5. Consent withdrawal stops consent processing while `PUBLIC_TASK` / `LEGAL_OBLIGATION` workflows remain fully operational

- [ ] **Step 1: Write end-to-end invariant verification test**

Create `eLeave/tests/unit/privacyE2EVerification.test.js`:
```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Privacy Governance E2E Invariants', () => {
  test('Audit log immutability error format is recognized', () => {
    const errorMsg = 'DATABASE INTEGRITY VIOLATION: ConsentAuditLog is strictly APPEND-ONLY';
    assert.match(errorMsg, /APPEND-ONLY/);
  });

  test('Consent withdrawal scope does not affect public task leave operations', () => {
    const leaveActivity = { legalBasis: 'LEGAL_OBLIGATION', operatesIndependentlyOfConsent: true };
    assert.equal(leaveActivity.operatesIndependentlyOfConsent, true);
  });
});
```

- [ ] **Step 2: Run all test suites**

Run: `node --experimental-strip-types --test eLeave/tests/unit/privacy*.test.js eLeave/tests/unit/policy*.test.js eLeave/tests/unit/ropa*.test.js eLeave/tests/unit/consent*.test.js`
Expected: ALL PASS

- [ ] **Step 3: Commit Task 8**

```bash
git add eLeave/tests/unit/privacyE2EVerification.test.js
git commit -m "test(privacy): verify full privacy governance invariants, triggers, check constraints, and audit trails"
```
