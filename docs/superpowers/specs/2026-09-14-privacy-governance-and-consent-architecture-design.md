# School Operation Privacy Governance Architecture Specification
## ระบบการกำกับดูแลความเป็นส่วนตัวและการจัดการความยินยอมสำหรับระบบปฏิบัติราชการอิเล็กทรอนิกส์ (KP e-Leave System)

- **Document ID:** SPEC-2026-09-14-PRIVACY-GOVERNANCE
- **Revision:** 2.1 (Architecture Freeze Candidate)
- **Status:** APPROVED & FROZEN
- **Author:** System Architect / Antigravity AI
- **Date:** 2026-09-14
- **ORM & Runtime Environment:**
  - Prisma Version: `^7.8.0` (with `previewFeatures = ["partialIndexes"]` active in `schema.prisma`)
  - Database: PostgreSQL 16+ (Neon Serverless / Hosted PG)
- **Regulatory Framework:** 
  - พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
  - พระราชบัญญัติว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์ พ.ศ. 2544 และที่แก้ไขเพิ่มเติม
  - แนวปฏิบัติและมาตรฐานแพลตฟอร์ม GPPC สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส.)
  - ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ พ.ศ. 2555 และระเบียบงานสารบรรณ

---

## 1. การแยกขอบเขตโดเมนและหลักการทางกฎหมาย (Domain Boundaries & Legal Invariants)

### 1.1 การแยก Privacy Governance ออกจาก Electronic Signature Domain
ระบบนี้เป็น **Shared Privacy Governance Platform** โดยแยกขอบเขตออกจาก **Electronic Signature Governance Domain** อย่างเด็ดขาด:
* **Privacy Governance:** กำกับดูแล Policy Management, ROPA Registry, Legal Basis Mapping, Purpose Management, Consent Lifecycle และ Audit Trail
* **Electronic Signature Domain:** กำกับดูแล Signing Policy, การผูกเจตนาทางนิติวิธีตาม พ.ร.บ.ธุรกรรมทางอิเล็กทรอนิกส์, การตรวจสอบ Cryptographic Token ผ่าน `SignatureTokenLog`
* สองโดเมนเชื่อมโยงกันเฉพาะในฐานะที่การประมวลผลลายเซ็นเป็นหนึ่งในกิจกรรม (Processing Activity) ภายใต้ ROPA เท่านั้น

### 1.2 กฎเหล็กขอบเขตการถอนความยินยอม (Consent Withdrawal Legal Scope)
> **Invariant:** การถอนความยินยอม (Withdrawal) ตาม ม.19 วรรคห้า มีผลระงับเฉพาะกิจกรรมหรือชุดข้อมูล (Data Category) ที่อาศัยฐานความยินยอม (Consent Basis) เป็นฐานกฎหมายเท่านั้น โดย:
> 1. ไม่มีผลกระทบย้อนหลังต่อการประมวลผลที่ชอบด้วยกฎหมายก่อนการถอน
> 2. **ไม่มีผลระงับหรือขัดขวางการประมวลผลที่มีฐานหน้าที่ตามกฎหมาย (Legal Obligation) หรือภารกิจเพื่อประโยชน์สาธารณะ/อำนาจรัฐ (Public Task)** เช่น การจัดเก็บสถิติวันลา, การตรวจสอบสิทธิการลาตามระเบียบสำนักนายกรัฐมนตรีฯ และการจัดเก็บ Log คอมพิวเตอร์ 90 วันตามกฎหมาย

### 1.3 การกำหนดฐานทางกฎหมายและข้อยกเว้น ม.26 (No Blanket Legal Assumptions)
ระบบจะไม่ Hard-code หรือเหมารวมว่ากิจกรรมใดใช้มาตรา 26 ข้อใดเป็นการถาวร แต่:
> **Rule:** Legal Basis และ Section 26 Condition ต้องถูกกำหนดเป็นรายกิจกรรม (Per Processing Activity) ภายใน ROPA Registry ตามข้อเท็จจริงทางกฎหมายที่กำหนดโดยผู้ควบคุมข้อมูล (Data Controller) หรือฝ่ายนิติการ

---

## 2. โครงสร้างสถาปัตยกรรมและกลไกความมั่นคงปลอดภัย (Security & Architecture Invariants)

### 2.1 Prisma Version & Partial Index Strategy
* **Prisma Context:** โปรเจกต์ใช้งาน Prisma Client `^7.8.0` และเปิด `previewFeatures = ["partialIndexes"]` ใน `schema.prisma`
* **Dual-Layer Enforcement:**
  1. ในระดับ Prisma Schema ระบุ:
     `@@unique([type], map: "unique_current_policy_per_type", where: { isCurrent: true })`
  2. ในระดับ DDL Migration SQL ระบุคำสั่งสร้าง Partial Unique Index โดยตรง เพื่อป้องกันความคลาดเคลื่อนของ Generator:
     ```sql
     CREATE UNIQUE INDEX IF NOT EXISTS "unique_current_policy_per_type" 
     ON "PolicyDocument" ("type") 
     WHERE "isCurrent" = true;
     ```
  3. การเปลี่ยนสถานะ `isCurrent = true` ต้องกระทำผ่าน **Database Transaction (`prisma.$transaction`)** แบบ Atomic เสมอ

### 2.2 Database-Level Audit Append-Only & Privilege Separation
* **Realistic Security Model:**
  - ตาราง `ConsentAuditLog` ถูกออกแบบให้เป็น **Strictly Append-Only** สำหรับ Application Runtime Role (`app_user`)
  - มี Trigger บังคับสกัดกั้นคำสั่ง `UPDATE` และ `DELETE` ในระดับ PostgreSQL:
    ```sql
    CREATE OR REPLACE FUNCTION prevent_consent_audit_log_mutation()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'DATABASE INTEGRITY VIOLATION: ConsentAuditLog is strictly APPEND-ONLY. UPDATE and DELETE are prohibited.';
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_consent_audit_log_immutable
    BEFORE UPDATE OR DELETE ON "ConsentAuditLog"
    FOR EACH ROW EXECUTE FUNCTION prevent_consent_audit_log_mutation();
    ```
  - **Role Privilege Separation:**
    * `app_user` (Application): ได้รับสิทธิ์ `SELECT`, `INSERT` เท่านั้น (ถูก `REVOKE UPDATE, DELETE ON "ConsentAuditLog"`)
    * `migration_role` (CI/CD / Schema Push): สำหรับรัน DDL migrations
    * `audit_reader`: Read-only สำหรับการตรวจสอบ compliance
    * `db_owner / superuser`: ควบคุมแยกต่างหากผ่าน Infrastructure Access Policy นอกเหนือจากตัวแอพพลิเคชัน

### 2.3 Consent State Lifecycle & DB CHECK Constraints
ตาราง `ConsentRecord` บังคับความถูกต้องของวงจรชีวิตข้อมูล (Lifecycle State Invariant) ด้วย Database CHECK Constraint:
```sql
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "chk_consent_record_state_lifecycle" CHECK (
  (status = 'GIVEN' AND "consentedAt" IS NOT NULL AND "withdrawnAt" IS NULL AND "revokedAt" IS NULL) OR
  (status = 'WITHDRAWN' AND "consentedAt" IS NOT NULL AND "withdrawnAt" IS NOT NULL AND "revokedAt" IS NULL) OR
  (status = 'REVOKED' AND "revokedAt" IS NOT NULL)
);
```

**State Transition Rules:**
* เมื่อผู้ใช้ให้ความยินยอมใหม่ (`WITHDRAWN` $\rightarrow$ `GIVEN`):
  ระบบต้อง Reset:
  `status = GIVEN`, `consentedAt = new Date()`, `withdrawnAt = null`, `revokedAt = null`, `consentFormVersion = currentFormVersion`, `privacyNoticeVersion = currentNoticeVersion`

### 2.4 Section 26 Consistency Invariant
ในตาราง `ProcessingDataCategoryPolicy`:
```sql
ALTER TABLE "ProcessingDataCategoryPolicy" ADD CONSTRAINT "chk_section26_consistency" CHECK (
  ("dataCategory" NOT IN ('SENSITIVE_HEALTH', 'SENSITIVE_BIOMETRIC') AND "section26Condition" IS NULL) OR
  ("dataCategory" IN ('SENSITIVE_HEALTH', 'SENSITIVE_BIOMETRIC') AND "section26Condition" IS NOT NULL)
);
```

### 2.5 Audit Log Snapshot Independence (No FK Cascade Hazard)
ฟิลด์อ้างอิงใน `ConsentAuditLog` (`purposeId`, `policyDocumentId`, `consentRecordId`) **จงใจไม่สร้าง Foreign Key Relation แบบ Cascade กับตารางต้นทาง** เพื่อป้องกันความเสี่ยงที่การแก้ไข/ลบ/ย้าย Business Entity ในอนาคตจะส่งผลกระทบต่อความสมบูรณ์ของหลักฐาน Audit History ย้อนหลัง

### 2.6 หลักฐานการรับทราบต้องไม่สูญหาย (`PolicyAcknowledgment.onDelete: Restrict`)
ความสัมพันธ์ระหว่าง `User` และ `PolicyAcknowledgment` ถูกเปลี่ยนเป็น **`onDelete: Restrict`** เพื่อป้องกันไม่ให้การลบบัญชีผู้ใช้ทำลายหลักฐานทางกฎหมายว่าเคยมีการรับทราบนโยบายฉบับใด (ระบบต้องใช้แนวทาง User Deactivation / Soft Anonymization แทน Hard Deletion)

---

## 3. ข้อกำหนดฐานข้อมูลฉบับสมบูรณ์ (Prisma Schema Specification)

```prisma
// ==========================================
// 1. CONTROLLED VOCABULARY (ENUMS)
// ==========================================

enum PolicyType {
  PRIVACY_NOTICE      // การแจ้งรายละเอียดตามมาตรา 23
  TERMS_OF_USE        // ข้อกำหนดและเงื่อนไขการใช้งานระบบสารสนเทศตามระเบียบโรงเรียน
}

enum LegalBasisType {
  PUBLIC_TASK           // ภารกิจเพื่อประโยชน์สาธารณะ หรือการใช้อำนาจรัฐ (ม.24(4))
  LEGAL_OBLIGATION      // หน้าที่ตามกฎหมาย (ม.24(6))
  CONTRACT              // สัญญา หรือการปฏิบัติตามคำขอก่อนเข้าทำสัญญา (ม.24(3))
  CONSENT               // ความยินยอมโดยชัดแจ้ง (ม.19)
  LEGITIMATE_INTEREST   // ประโยชน์โดยชอบด้วยกฎหมาย (ม.24(5))
  VITAL_INTEREST        // การป้องกันหรือระงับอันตรายต่อชีวิต ร่างกาย หรือสุขภาพ (ม.24(2))
}

enum Section26ConditionType {
  EXPLICIT_CONSENT                      // ความยินยอมโดยชัดแจ้ง (ม.26 วรรคหนึ่ง)
  VITAL_INTEREST_EMERGENCY              // ป้องกันอันตรายต่อชีวิตในกรณีไม่สามารถให้ความยินยอมได้ (ม.26(5)(ก))
  NON_PROFIT_BODY_LEGITIMATE_ACTIVITY  // องค์กรไม่แสวงหากำไร (ม.26(5)(ข))
  MANIFESTLY_PUBLIC_DATA                // ข้อมูลที่เปิดเผยต่อสาธารณะด้วยความยินยอมชัดแจ้ง (ม.26(5)(ค))
  LEGAL_CLAIMS_AND_DEFENSE              // ก่อตั้งหรือใช้สิทธิเรียกร้องตามกฎหมาย (ม.26(5)(ง))
  LABOR_AND_SOCIAL_SECURITY_LAW         // ปฏิบัติตามกฎหมายแรงงานและการคุ้มครองทางสังคม (ม.26(5)(จ))
  STATUTORY_PUBLIC_HEALTH               // ประโยชน์สาธารณะด้านการสาธารณสุข (ม.26(5)(ฉ))
  SUBSTANTIAL_PUBLIC_INTEREST           // ประโยชน์สาธารณะที่สำคัญตามที่กฎหมายบัญญัติ
}

enum DataCategoryType {
  GENERAL_IDENTITY      // ชื่อ-สกุล, ตำแหน่ง, วิทยฐานะ, สังกัดกลุ่มสาระ
  CONTACT_INFO          // เบอร์โทรศัพท์, ที่อยู่, อีเมล
  EMPLOYMENT_RECORD     // สถิติการมาทำงาน, วันลา, ประวัติการสอนแทน, งานวิชาการ
  SENSITIVE_HEALTH      // ใบรับรองแพทย์, ประวัติการรักษาพยาบาล (ม.26)
  SENSITIVE_BIOMETRIC   // ข้อมูลชีวมิติ/โครงร่างใบหน้า (Face Descriptor) (ม.26)
  GEOLOCATION           // พิกัด GPS ณ ขณะลงเวลาปฏิบัติราชการ
  DOCUMENT_ATTACHMENT   // ไฟล์แนบเอกสารราชการ, คำสั่ง
  SYSTEM_AUDIT_LOG      // บันทึกการจราจรทางคอมพิวเตอร์, IP, Session
}

enum ConsentStatus {
  GIVEN                 // ผู้ใช้ให้ความยินยอม
  WITHDRAWN             // ผู้ใช้ถอนความยินยอมด้วยตนเอง (ม.19 วรรคห้า)
  REVOKED               // ผู้ควบคุมข้อมูล/ระบบเพิกถอนสถานะตามกฎหมายหรือระเบียบ
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
  USER_CHOICE                       // ผู้ใช้เลือกถอนความยินยอมตามสิทธิ
  NO_LONGER_USING_FEATURE           // ไม่ประสงค์ใช้งานฟีเจอร์เสริมนั้นต่อ
  DATA_MINIMIZATION_PREFERENCE      // ประสงค์จำกัดปริมาณข้อมูลส่วนบุคคล
}

enum RevocationReasonCode {
  ADMINISTRATIVE_DISCONTINUATION    // โรงเรียนยกเลิกการให้บริการฟีเจอร์หรือการเชื่อมต่อ
  SYSTEM_MIGRATION                  // มีการเปลี่ยนระบบงานหรือโครงสร้างฐานข้อมูล
  STATUTORY_LEGAL_ORDER             // มีคำสั่งตามกฎหมายหรือระเบียบทางราชการ
  ACCOUNT_DECOMMISSIONED            // บัญชีผู้ใช้พ้นสภาพการปฏิบัติหน้าที่
}

enum RetentionRuleType {
  EVENT_BASED           // เช่น สิ้นสุดสภาพการเป็นบุคลากร + 5 ปี
  FISCAL_YEAR_BASED     // เช่น สิ้นสุดปีงบประมาณ + 10 ปี
  STATUTORY_LOG_90_DAYS // Log พ.ร.บ.คอมพิวเตอร์ 90 วัน
}

enum DisposalMethod {
  SECURE_DESTROY
  PERMANENT_ANONYMIZE
  TRANSFER_TO_NATIONAL_ARCHIVES
}

// ==========================================
// 2. DOMAIN 1: POLICY MANAGEMENT
// ==========================================

model PolicyDocument {
  id                      String                  @id @default(cuid())
  type                    PolicyType
  version                 String                  // e.g. "2026.09.1"
  title                   String
  contentMarkdown         String                  @db.Text
  contentHash             String                  // SHA-256 ของ Canonical Normalized Content
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
  policyVersionSnapshot   String                  // Snapshot เวอร์ชัน ณ วันที่รับทราบ
  contentHashSnapshot     String                  // Snapshot Hash ณ วันที่รับทราบ
  source                  String                  @default("WEB_APP") // "REGISTRATION", "MODAL_NOTICE", "SETTINGS"
  acknowledgedAt          DateTime                @default(now())
  ipAddress               String?
  userAgent               String?

  user                    User                    @relation(fields: [userId], references: [id], onDelete: Restrict)
  policyDocument          PolicyDocument          @relation(fields: [policyDocumentId], references: [id], onDelete: Restrict)

  @@unique([userId, policyDocumentId])
  @@index([userId])
}

// ==========================================
// 3. DOMAIN 2: PROCESSING GOVERNANCE & ROPA
// ==========================================

model ProcessingActivity {
  id                      String                  @id @default(cuid())
  code                    String                  @unique // Immutable Business Key (e.g. "PA_LEAVE_MANAGEMENT")
  module                  String                  // "LEAVE", "ATTENDANCE", "SARABAN", etc.
  name                    String
  description             String?                 @db.Text
  controllerName          String                  @default("โรงเรียนกุดจับประชาสรรค์")
  dpoContact              String                  @default("kpschool_dpo@obec.moe.go.th")
  dataSubjectCategory     String                  // "ข้าราชการครู บุคลากรทางการศึกษา และลูกจ้าง" (Presentation Metadata)
  retentionRuleType       RetentionRuleType       @default(EVENT_BASED)
  retentionDurationMonths Int                     // e.g. 120 (10 ปี)
  retentionAuthority      String                  // ระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ (Presentation Metadata)
  disposalMethod          DisposalMethod          @default(SECURE_DESTROY)
  recipientsSummary       String                  // สายการบังคับบัญชา, สพม.อุดรธานี, สพฐ. (Presentation Metadata)
  crossBorderTransfer     Boolean                 @default(false)
  crossBorderDetails      String?                 // รายละเอียดปลายทาง/กลไกความปลอดภัย (Presentation Metadata)
  active                  Boolean                 @default(true)
  createdAt               DateTime                @default(now())
  updatedAt               DateTime                @updatedAt

  purposes                ProcessingPurpose[]

  @@index([module, active])
}

model ProcessingPurpose {
  id                      String                         @id @default(cuid())
  activityId              String
  code                    String                         @unique // Immutable Business Key (e.g. "PURPOSE_LEAVE_APPROVAL")
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
  section26Condition      Section26ConditionType?        // Nullable สำหรับ non-sensitive; ต้องมีค่าสำหรับ sensitive data
  statutoryReference      String?                        // อ้างอิงระเบียบหรือมาตราทางกฎหมาย
  isMandatoryForOperation Boolean                        @default(true)

  purpose                 ProcessingPurpose              @relation(fields: [purposeId], references: [id], onDelete: Cascade)

  @@unique([purposeId, dataCategory, legalBasis])
}

// ==========================================
// 4. DOMAIN 3: CONSENT MANAGEMENT
// ==========================================

model ConsentRecord {
  id                      String                         @id @default(cuid())
  userId                  String
  purposeId               String                         // FK ชี้ ProcessingPurpose.id (Immutable ID)
  status                  ConsentStatus                  @default(GIVEN)
  consentFormVersion      String                         // เวอร์ชันข้อความคำขอความยินยอม (e.g. "v1.0")
  privacyNoticeVersion    String?                        // เวอร์ชัน Privacy Notice ขณะให้ความยินยอม
  consentedAt             DateTime?
  withdrawnAt             DateTime?
  revokedAt               DateTime?
  source                  String                         // "SETTINGS_PAGE", "FEATURE_MODAL"
  createdAt               DateTime                       @default(now())
  updatedAt               DateTime                       @updatedAt

  user                    User                           @relation(fields: [userId], references: [id], onDelete: Cascade)
  purpose                 ProcessingPurpose              @relation(fields: [purposeId], references: [id], onDelete: Restrict)

  @@unique([userId, purposeId])                          // Pattern A: Current State per User + Purpose
  @@index([userId, status])
}

// ==========================================
// 5. DOMAIN 4: IMMUTABLE AUDIT TRAIL
// ==========================================

model ConsentAuditLog {
  id                             String                  @id @default(cuid())
  eventId                        String                  @default(cuid())
  correlationId                  String                  // Request/Transaction Traceability ID
  eventType                      AuditEventType
  subjectType                    AuditSubjectType
  userId                         String
  policyDocumentId               String?                 // Snapshot Reference (No Foreign Key cascade)
  policyVersionSnapshot          String?
  contentHashSnapshot            String?
  purposeId                      String?                 // Snapshot Reference (No Foreign Key cascade)
  purposeCodeSnapshot            String?
  consentRecordId                String?
  consentFormVersionSnapshot     String?
  actorType                      AuditActorType          @default(USER)
  actorId                        String?
  source                         String
  withdrawalReason               WithdrawalReasonCode?   // ใช้เฉพาะเมื่อ eventType = CONSENT_WITHDRAWN
  revocationReason               RevocationReasonCode?   // ใช้เฉพาะเมื่อ eventType = CONSENT_REVOKED
  reasonDetail                   String?                 // คำอธิบายเพิ่มเติมตามบริบท
  occurredAt                     DateTime                @default(now())
  ipAddress                      String?
  userAgent                      String?

  // Enforcement: ห้ามมี Mutation API ใน Application และตั้ง DB Trigger ป้องกัน UPDATE/DELETE
  @@index([userId, occurredAt])
  @@index([eventType, occurredAt])
  @@index([correlationId])
  @@index([eventId])
}
```

---

## 4. ข้อกำหนดทางธุรกิจและการประมวลผล (Service Layer Specifications)

### 4.1 ฟังก์ชันการให้ความยินยอม (`createOrUpdateConsent`)
```typescript
/**
 * บันทึกความยินยอมของผู้ใช้งาน
 * Invariant Rule: ต้องตรวจสอบก่อนว่า Purpose นั้นเปิดให้ใช้ฐาน Consent หรือไม่
 */
export async function recordUserConsent(params: {
  userId: string;
  purposeId: string;
  consentFormVersion: string;
  privacyNoticeVersion: string;
  source: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  // 1. Resolve Purpose & Data Category Policies
  const purpose = await prisma.processingPurpose.findUnique({
    where: { id: params.purposeId, active: true },
    include: { dataCategoryPolicies: true },
  });

  if (!purpose) throw new Error("Processing purpose not found or inactive");

  // 2. Validate that Consent is actually a legal basis for this purpose
  const isConsentApplicable = purpose.dataCategoryPolicies.some(
    (p) => p.legalBasis === "CONSENT" || p.section26Condition === "EXPLICIT_CONSENT"
  );
  if (!isConsentApplicable) {
    throw new Error("Consent is not an applicable legal basis for this operational purpose");
  }

  // 3. Upsert Current State in ConsentRecord with State Invariant guarantees
  return await prisma.$transaction(async (tx) => {
    const record = await tx.consentRecord.upsert({
      where: {
        userId_purposeId: {
          userId: params.userId,
          purposeId: params.purposeId,
        },
      },
      create: {
        userId: params.userId,
        purposeId: params.purposeId,
        status: "GIVEN",
        consentedAt: new Date(),
        withdrawnAt: null,
        revokedAt: null,
        consentFormVersion: params.consentFormVersion,
        privacyNoticeVersion: params.privacyNoticeVersion,
        source: params.source,
      },
      update: {
        status: "GIVEN",
        consentedAt: new Date(),
        withdrawnAt: null,
        revokedAt: null,
        consentFormVersion: params.consentFormVersion,
        privacyNoticeVersion: params.privacyNoticeVersion,
        source: params.source,
      },
    });

    // 4. Append Immutable Audit Log
    await tx.consentAuditLog.create({
      data: {
        correlationId: params.correlationId,
        eventType: "CONSENT_GIVEN",
        subjectType: "CONSENT_RECORD",
        userId: params.userId,
        purposeId: purpose.id,
        purposeCodeSnapshot: purpose.code,
        consentRecordId: record.id,
        consentFormVersionSnapshot: params.consentFormVersion,
        actorType: "USER",
        actorId: params.userId,
        source: params.source,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });

    return record;
  });
}
```

### 4.2 ฟังก์ชันการถอนความยินยอม (`withdrawUserConsent`)
```typescript
export async function withdrawUserConsent(params: {
  userId: string;
  purposeId: string;
  reasonCode: WithdrawalReasonCode;
  reasonDetail?: string;
  source: string;
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.consentRecord.findUnique({
      where: { userId_purposeId: { userId: params.userId, purposeId: params.purposeId } },
      include: { purpose: true },
    });

    if (!existing || existing.status !== "GIVEN") {
      throw new Error("No active consent record found to withdraw");
    }

    const updated = await tx.consentRecord.update({
      where: { id: existing.id },
      data: {
        status: "WITHDRAWN",
        withdrawnAt: new Date(),
        revokedAt: null,
      },
    });

    await tx.consentAuditLog.create({
      data: {
        correlationId: params.correlationId,
        eventType: "CONSENT_WITHDRAWN",
        subjectType: "CONSENT_RECORD",
        userId: params.userId,
        purposeId: existing.purpose.id,
        purposeCodeSnapshot: existing.purpose.code,
        consentRecordId: updated.id,
        consentFormVersionSnapshot: existing.consentFormVersion,
        actorType: "USER",
        actorId: params.userId,
        withdrawalReason: params.reasonCode,
        reasonDetail: params.reasonDetail,
        source: params.source,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });

    return updated;
  });
}
```

---

## 5. การตรวจสอบและอนุมัติ (Architecture Freeze Gate Checklist)

| ข้อกำหนด | กลไกควบคุม (Enforcement Mechanism) | สถานะ |
| :--- | :--- | :--- |
| **1. Prisma Version & Partial Index** | Prisma `^7.8.0` + Migration DDL `CREATE UNIQUE INDEX ... WHERE isCurrent = true` | ✅ VERIFIED |
| **2. DB Role & Trigger Wording** | Append-only ผ่าน Trigger + `REVOKE UPDATE, DELETE` สำหรับ app role | ✅ VERIFIED |
| **3. Separation of Reason Enums** | แยก `WithdrawalReasonCode` (User) ออกจาก `RevocationReasonCode` (Admin/System) | ✅ VERIFIED |
| **4. State Invariant CHECK Constraint** | PostgreSQL `chk_consent_record_state_lifecycle` และ State Reset Rules | ✅ VERIFIED |
| **5. Section 26 Category Constraint** | PostgreSQL `chk_section26_consistency` ห้ามใส่ condition ม.26 กับข้อมูลทั่วไป | ✅ VERIFIED |
| **6. Legal Scope of Withdrawal** | สเปกระบุชัดว่าระงับเฉพาะ Consent processing ไม่กระทบภารกิจรัฐ/กฎหมาย | ✅ VERIFIED |
| **7. Policy Evidence Retention** | `PolicyAcknowledgment.onDelete: Restrict` ห้ามทำลายหลักฐานเมื่อผู้ใช้ถูกลบ | ✅ VERIFIED |
| **8. Decoupled Audit Snapshot** | ไม่ผูก Foreign Key Cascade ในตาราง `ConsentAuditLog` | ✅ VERIFIED |
| **9. Purpose Legal Basis Validation** | Service Layer ตรวจสอบ `legalBasis === CONSENT` ก่อนอนุญาตให้บันทึก | ✅ VERIFIED |

**Architecture Freeze Determination: READY FOR IMPLEMENTATION PLAN**
