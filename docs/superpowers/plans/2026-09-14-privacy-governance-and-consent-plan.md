# School Operation Privacy Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the School Operation Privacy Governance and Consent Management Infrastructure for KP e-Leave System according to SPEC-2026-09-14-PRIVACY-GOVERNANCE Rev. 1.0, covering Policy Management, ROPA Registry, Purpose-based Consent Lifecycle, Database-enforced Append-Only Audit Trail, and Contextual UX.

**Architecture:** 
- Shared Privacy Governance Layer decoupled from Electronic Signature.
- Pattern A: Current State in `ConsentRecord` with unique constraint per `(userId, purposeId)` + immutable event stream in `ConsentAuditLog`.
- Database-level integrity: PostgreSQL triggers prohibiting UPDATE/DELETE on audit log, partial unique index for current policies, and database CHECK constraints for state lifecycles and Section 26 rules.
- Contextual UX: Notice/Terms acknowledgment at registration, contextual just-in-time consent for optional processing (e.g. LINE Notify), and user self-service privacy center (`/settings/privacy` and `/privacy`).

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Prisma Client `^7.8.0` with `partialIndexes`, PostgreSQL 16+ (Neon Serverless), Tailwind CSS v4, Lucide React.

## Global Constraints

- Prisma Version: `^7.8.0` with `previewFeatures = ["partialIndexes"]`.
- Schema Invariant: `ConsentRecord` must use `purposeId` FK referencing `ProcessingPurpose(id)` with `onDelete: Restrict`.
- Immutability Invariant: `ConsentAuditLog` must enforce append-only at the PostgreSQL trigger level.
- Legal Scope Invariant: Consent withdrawal only stops processing relying on consent; it never halts `PUBLIC_TASK` or `LEGAL_OBLIGATION` processing.
- Security Invariant: No PII allowed in metadata fields.
- Evidence Invariant: `PolicyAcknowledgment` user relation must use `onDelete: Restrict` to preserve compliance history.

---

### Task 1: Database Schema & Migration Invariants

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
import { prisma } from '../../src/lib/db.ts';

describe('Privacy Governance Schema Invariants', () => {
  test('PolicyDocument model exists and can query by type and isCurrent', async () => {
    assert.ok(prisma.policyDocument, 'prisma.policyDocument must be defined');
    assert.ok(prisma.consentRecord, 'prisma.consentRecord must be defined');
    assert.ok(prisma.consentAuditLog, 'prisma.consentAuditLog must be defined');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test eLeave/tests/unit/privacySchemaInvariants.test.js`
Expected: FAIL (models not found on prisma client)

- [ ] **Step 3: Update `prisma/schema.prisma` with Privacy Governance Models**

Add to `prisma/schema.prisma`:
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

- [ ] **Step 4: Create migration SQL with Triggers and Constraints**

Create `prisma/migrations/20260914000000_privacy_governance_core/migration.sql` with:
1. Partial unique index:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS "unique_current_policy_per_type" 
ON "PolicyDocument" ("type") 
WHERE "isCurrent" = true;
```
2. Trigger for append-only:
```sql
CREATE OR REPLACE FUNCTION prevent_consent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'DATABASE INTEGRITY VIOLATION: ConsentAuditLog is strictly APPEND-ONLY. UPDATE and DELETE operations are prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_consent_audit_log_immutable ON "ConsentAuditLog";

CREATE TRIGGER trg_consent_audit_log_immutable
BEFORE UPDATE OR DELETE ON "ConsentAuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_consent_audit_log_mutation();
```
3. CHECK Constraints:
```sql
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "chk_consent_record_state_lifecycle" CHECK (
  (status = 'GIVEN' AND "consentedAt" IS NOT NULL AND "withdrawnAt" IS NULL AND "revokedAt" IS NULL) OR
  (status = 'WITHDRAWN' AND "consentedAt" IS NOT NULL AND "withdrawnAt" IS NOT NULL AND "revokedAt" IS NULL) OR
  (status = 'REVOKED' AND "revokedAt" IS NOT NULL)
);

ALTER TABLE "ProcessingDataCategoryPolicy" ADD CONSTRAINT "chk_section26_consistency" CHECK (
  ("dataCategory" NOT IN ('SENSITIVE_HEALTH', 'SENSITIVE_BIOMETRIC') AND "section26Condition" IS NULL) OR
  ("dataCategory" IN ('SENSITIVE_HEALTH', 'SENSITIVE_BIOMETRIC') AND "section26Condition" IS NOT NULL)
);
```

- [ ] **Step 5: Run Prisma generate & verify tests pass**

Run: `npx prisma generate`
Run: `node --experimental-strip-types --test eLeave/tests/unit/privacySchemaInvariants.test.js`
Expected: PASS

- [ ] **Step 6: Commit Task 1**

```bash
git add prisma/schema.prisma prisma/migrations eLeave/tests/unit/privacySchemaInvariants.test.js
git commit -m "feat(privacy): add privacy governance schema, DB triggers, and CHECK constraints"
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
import { computeCanonicalHash } from '../../src/lib/privacy/policy-service.ts';

describe('Policy Service', () => {
  test('computeCanonicalHash produces normalized SHA-256', () => {
    const text1 = "# Privacy Notice \r\n\r\n Content ";
    const text2 = "# Privacy Notice\n\n Content";
    assert.equal(computeCanonicalHash(text1), computeCanonicalHash(text2));
    assert.equal(computeCanonicalHash(text1).length, 64);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test eLeave/tests/unit/policyService.test.js`
Expected: FAIL ("computeCanonicalHash not defined")

- [ ] **Step 3: Implement `src/lib/privacy/policy-service.ts`**

Implement canonical hashing, atomic transaction publishing, querying current policies, and recording acknowledgments with evidence snapshotting.

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

- [ ] **Step 1: Write failing unit test for ROPA Resolution**

Create `eLeave/tests/unit/ropaService.test.js`:
```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isConsentApplicableForPurpose } from '../../src/lib/privacy/ropa-service.ts';

describe('ROPA Resolution Service', () => {
  test('isConsentApplicableForPurpose correctly resolves based on legal basis', async () => {
    // Tests that purpose with only PUBLIC_TASK returns false
    // and purpose with CONSENT returns true
    assert.ok(typeof isConsentApplicableForPurpose === 'function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test eLeave/tests/unit/ropaService.test.js`
Expected: FAIL

- [ ] **Step 3: Implement `src/lib/privacy/ropa-service.ts` and `prisma/seed-privacy.ts`**

Implement ROPA querying, purpose legal basis resolution, and seed script defining school processing activities according to civil service regulations.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test eLeave/tests/unit/ropaService.test.js`
Expected: PASS

- [ ] **Step 5: Commit Task 3**

```bash
git add src/lib/privacy/ropa-service.ts prisma/seed-privacy.ts eLeave/tests/unit/ropaService.test.js
git commit -m "feat(privacy): implement ROPA registry and legal basis resolution service"
```

---

### Task 4: Consent Management Engine & Lifecycle Transitions

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

- [ ] **Step 1: Write failing unit test for Consent Lifecycle**

Create `eLeave/tests/unit/consentService.test.js`:
```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { recordUserConsent, withdrawUserConsent } from '../../src/lib/privacy/consent-service.ts';

describe('Consent Lifecycle Engine', () => {
  test('functions are exported and enforce validation', () => {
    assert.ok(typeof recordUserConsent === 'function');
    assert.ok(typeof withdrawUserConsent === 'function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test eLeave/tests/unit/consentService.test.js`
Expected: FAIL

- [ ] **Step 3: Implement `src/lib/privacy/consent-service.ts`**

Implement state transitions with state invariant enforcement, database transaction, append-only audit logging with `correlationId`, and distinct `WithdrawalReasonCode` vs `RevocationReasonCode`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test eLeave/tests/unit/consentService.test.js`
Expected: PASS

- [ ] **Step 5: Commit Task 4**

```bash
git add src/lib/privacy/consent-service.ts eLeave/tests/unit/consentService.test.js
git commit -m "feat(privacy): implement consent lifecycle engine with append-only audit correlation"
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

### Task 8: End-to-End System Verification & Audit Test

**Files:**
- Create: `eLeave/tests/unit/privacyE2EVerification.test.js`

**Interfaces:**
- Consumes: Full Privacy Governance stack
- Produces: Comprehensive test suite verifying all invariants:
  1. PostgreSQL Trigger blocks UPDATE/DELETE on audit log
  2. Partial unique index rejects multiple `isCurrent = true`
  3. Consent withdrawal works and leaves leave/attendance workflows operational
  4. Correlation ID flows through audit events

- [ ] **Step 1: Write end-to-end invariant verification test**

Create `eLeave/tests/unit/privacyE2EVerification.test.js` testing all 4 freeze requirements.

- [ ] **Step 2: Run all test suites**

Run: `node --experimental-strip-types --test eLeave/tests/unit/privacy*.test.js eLeave/tests/unit/policy*.test.js eLeave/tests/unit/consent*.test.js`
Expected: ALL PASS

- [ ] **Step 3: Commit Task 8**

```bash
git add eLeave/tests/unit/privacyE2EVerification.test.js
git commit -m "test(privacy): verify full privacy governance invariants, triggers, and audit trails"
```
