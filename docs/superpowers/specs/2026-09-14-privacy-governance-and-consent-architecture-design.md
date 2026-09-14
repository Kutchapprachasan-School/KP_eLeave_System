# School Operation Privacy Governance Architecture Specification
## ระบบการกำกับดูแลความเป็นส่วนตัวและการจัดการความยินยอมสำหรับระบบปฏิบัติราชการอิเล็กทรอนิกส์ (KP e-Leave System)

- **Document ID:** SPEC-2026-09-14-PRIVACY-GOVERNANCE
- **Revision:** 2.0 (Post-Deep-Audit Refinement)
- **Status:** READY FOR FINAL FREEZE
- **Author:** System Architect / Antigravity AI
- **Date:** 2026-09-14
- **Regulatory Framework:** 
  - พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
  - พระราชบัญญัติว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์ พ.ศ. 2544 และที่แก้ไขเพิ่มเติม
  - แนวปฏิบัติและมาตรฐานแพลตฟอร์ม GPPC สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส.)
  - ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ พ.ศ. 2555 และระเบียบงานสารบรรณ

---

## 1. บทนำและการแยกขอบเขตโดเมน (Separation of Domains)

### 1.1 การแยก Privacy Governance ออกจาก Electronic Signature Governance
เอกสารข้อกำหนดนี้กำกับดูแลเฉพาะ **School Operation Privacy Governance Platform** เท่านั้น 
ส่วน **Electronic Signature Governance Domain** (การสร้าง, ประทับ, ยืนยัน Token ลายเซ็นผ่าน `SignatureTokenLog` และการผูกเจตนาทางนิติวิธีตาม พ.ร.บ.ธุรกรรมอิเล็กทรอนิกส์) ถือเป็น **โดเมนอิสระภายนอก** โดย Privacy Governance จะเชื่อมต่อกับ Electronic Signature ในฐานะหนึ่งในกิจกรรมการประมวลผล (Processing Activity) ภายใต้บันทึกรายการกิจกรรม (ROPA) เท่านั้น

```
┌────────────────────────────────────────────────────────┐      ┌────────────────────────────────────────────────────────┐
│             Privacy Governance Platform                │      │         Electronic Signature Governance Domain         │
│  (Policy, ROPA, Legal Basis, Purpose, Consent, Audit)  │◄────►│   (Signing Policy, Signature Token, Evidence Binding)  │
└────────────────────────────────────────────────────────┘      └────────────────────────────────────────────────────────┘
```

### 1.2 วัตถุประสงค์และหลักการพื้นฐาน
1. **No Single-Boolean Consent:** ข้อมูล `User.pdpaConsent` ถูกยกเลิกเด็ดขาด การปฏิบัติตามกฎหมายต้องบริหารผ่านสถาปัตยกรรม 4 ชั้น: Policy Management, ROPA Registry, Contextual Consent Lifecycle และ Immutable Audit Trail
2. **Authoritative Source of Truth:** ฐานทางกฎหมาย (Legal Basis) และเงื่อนไขการประมวลผลข้อมูลส่วนบุคคลที่มีความอ่อนไหว (Section 26 Condition) ถูกกำหนดไว้ที่ชั้น **ProcessingDataCategoryPolicy** เท่านั้น โดยระบบต้องไม่มีฟิลด์ Boolean เช่น `isConsentRequired` เป็น Authoritative State อีกต่อไป แต่ต้อง Derive จากนโยบายกฎหมายของกิจกรรมนั้นโดยตรง
3. **No Coercive Consent Invariant:** การปฏิบัติงานของบุคลากรทางการศึกษาที่มีฐานกฎหมายรองรับ (หน้าที่ตามกฎหมาย / ภารกิจเพื่อประโยชน์สาธารณะตามระเบียบราชการ) **ต้องไม่ถูกนำไปผูกมัดเป็นการขอความยินยอม (Consent)** และผู้ใช้ต้องไม่ถูกบังคับให้กดยินยอมเพื่อแลกกับการเข้าใช้งานระบบ
4. **Legal Scope of Consent Withdrawal:** การถอนความยินยอม (Withdrawal) ของผู้ใช้ **มีผลระงับเฉพาะการประมวลผลที่อาศัยฐานความยินยอม (Consent) เป็นฐานกฎหมายเท่านั้น** ไม่ส่งผลกระทบย้อนหลังต่อการประมวลผลที่ชอบด้วยกฎหมายก่อนการถอน (ตาม ม.19 วรรคห้า) และ**ไม่มีผลระงับการประมวลผลที่มีฐานหน้าที่ตามกฎหมาย (Legal Obligation) หรือภารกิจเพื่อประโยชน์สาธารณะ/อำนาจรัฐ (Public Task)** เช่น ประวัติการลาป่วยตามระเบียบสำนักนายกรัฐมนตรีฯ และการจัดเก็บ Log คอมพิวเตอร์ตามกฎหมาย

---

## 2. โครงสร้างสถาปัตยกรรม (Architectural Structure)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   School Operation Privacy Governance Platform                   │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 1. Policy Management Domain                                                      │
│    ├── PolicyDocument (Immutable, Versioned, Partial Unique Index isCurrent)     │
│    ├── Canonical Content Hash (SHA-256 Normalized Text Engine)                   │
│    └── PolicyAcknowledgment (Snapshot Version & Hash per User Acknowledgment)    │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 2. Processing Governance & ROPA Domain                                           │
│    ├── ProcessingActivity (ROPA Core: Controller, DPO, Subject, Recipients)      │
│    ├── ProcessingPurpose (Immutable Business Key + Purpose ID)                   │
│    └── ProcessingDataCategoryPolicy (Mapping Category + LegalBasis + Section 26) │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 3. Contextual Consent Management Domain                                          │
│    ├── ConsentRecord (Current State per User + Purpose ID, GIVEN/WITHDRAWN/REVOKED)│
│    ├── Explicit Form Versioning (consentFormVersion vs privacyNoticeVersion)     │
│    └── Strict Legal Withdrawal Engine                                            │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 4. Immutable Audit & Incident Traceability Domain                                │
│    ├── Database-Level Trigger Enforcement (Revoke/Block UPDATE & DELETE)         │
│    ├── Request/Transaction Correlation ID Traceability                           │
│    └── Explicit Actor, Action, Subject & Snapshot Evidence                       │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. กฎเหล็กเชิงสถาปัตยกรรม (Architectural Invariants)

1. **DB-Level Immutability Invariant:** ตาราง `ConsentAuditLog` ต้องถูกบังคับด้วย Database Trigger ในระดับ PostgreSQL ห้ามให้มีการแก้ไข (`UPDATE`) หรือลบ (`DELETE`) แถวข้อมูลในตารางนี้เด็ดขาด ไม่ว่าจะผ่าน Application, Prisma, Admin Role หรือ Manual SQL Execution
2. **Partial Unique Current Policy Invariant:** ฟิลด์ `isCurrent` บน `PolicyDocument` ต้องถูกควบคุมด้วย Partial Unique Index:
   `CREATE UNIQUE INDEX unique_current_policy_per_type ON "PolicyDocument" ("type") WHERE "isCurrent" = true;`
   และการเผยแพร่นโยบายใหม่ (Publishing) ต้องกระทำภายใน Database Transaction เดียวกันเสมอ
3. **Foreign Key Integrity Invariant:** `ConsentRecord` ต้องผูก Foreign Key กับ `ProcessingPurpose.id` (ไม่ใช่ Business Code ที่อาจถูก Migrate) โดย `ProcessingPurpose.code` ต้องถูกกำหนดให้เป็น **Immutable Business Key** ห้ามแก้ไขหลังจากถูกสร้าง
4. **Strict Semantic Differentiation:**
   - `WITHDRAWN`: เจ้าของข้อมูลส่วนบุคคล (User) ใช้สิทธิถอนความยินยอมด้วยความสมัครใจ
   - `REVOKED`: ระบบ (System) หรือผู้ควบคุมข้อมูล (Admin/Controller) สั่งเพิกถอนสถานะความยินยอมอันเนื่องมาจากเหตุทางกฎหมาย การปรับโครงสร้าง หรือการระงับบัญชี
5. **No PII in Metadata Invariant:** ห้ามจัดเก็บข้อมูลระบุตัวตน (PII), เบอร์โทร, LINE ID หรือ Sensitive Data ในฟิลด์ Metadata โดยเด็ดขาด Metadata อนุญาตให้เก็บเฉพาะ Operational Context เช่น `{ clientTimezone, flowOrigin }`

---

## 4. ข้อกำหนดฐานข้อมูล (Prisma Schema Specification)

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
  USER_PREFERENCE
  NO_LONGER_USING_FEATURE
  DATA_MINIMIZATION_REQUEST
  ADMINISTRATIVE_DISCONTINUATION
  SYSTEM_MIGRATION
  LEGAL_REVOCATION
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

  user                    User                    @relation(fields: [userId], references: [id], onDelete: Cascade)
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
  dataSubjectCategory     String                  // "ข้าราชการครู บุคลากรทางการศึกษา และลูกจ้าง"
  retentionRuleType       RetentionRuleType       @default(EVENT_BASED)
  retentionDurationMonths Int                     // e.g. 120 (10 ปี)
  retentionAuthority      String                  // ระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ
  disposalMethod          DisposalMethod          @default(SECURE_DESTROY)
  recipientsSummary       String                  // สายการบังคับบัญชา, สพม.อุดรธานี, สพฐ.
  crossBorderTransfer     Boolean                 @default(false)
  crossBorderDetails      String?                 // รายละเอียดปลายทาง/กลไกความปลอดภัย (ถ้ามี)
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
  section26Condition      Section26ConditionType?        // ระบุเฉพาะเมื่อ dataCategory เป็น Sensitive Data
  statutoryReference      String?                        // อ้างอิงมาตรา/ระเบียบกฎหมาย เช่น ม.26(5)(ฉ)
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
  purposeId               String                         // FK เชื่อมตรงกับ ProcessingPurpose.id
  status                  ConsentStatus                  @default(GIVEN)
  consentFormVersion      String                         // เวอร์ชันข้อความคำขอความยินยอม (e.g. "v1.0")
  privacyNoticeVersion    String?                        // เวอร์ชัน Privacy Notice ที่อ้างอิงขณะยินยอม
  consentedAt             DateTime?
  withdrawnAt             DateTime?
  revokedAt               DateTime?
  source                  String                         // "SETTINGS_PAGE", "FEATURE_MODAL"
  createdAt               DateTime                       @default(now())
  updatedAt               DateTime                       @updatedAt

  user                    User                           @relation(fields: [userId], references: [id], onDelete: Cascade)
  purpose                 ProcessingPurpose              @relation(fields: [purposeId], references: [id], onDelete: Restrict)

  @@unique([userId, purposeId])                          // Pattern A: Current State per User + Purpose ID
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
  policyDocumentId               String?
  policyVersionSnapshot          String?
  contentHashSnapshot            String?
  purposeId                      String?                 // FK Reference
  purposeCodeSnapshot            String?                 // Snapshot Business Key
  consentRecordId                String?
  consentFormVersionSnapshot     String?
  actorType                      AuditActorType          @default(USER)
  actorId                        String?
  source                         String
  reasonCode                     WithdrawalReasonCode?
  reasonDetail                   String?
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

## 5. แผนการบังคับใช้ระดับฐานข้อมูล (PostgreSQL Database Triggers & Security)

### 5.1 Append-Only Enforcement SQL Migration
ไฟล์ Migration ของ PostgreSQL จะบรรจุฟังก์ชันและ Trigger เพื่อสกัดกั้นการแก้ไขหรือลบในตาราง Audit Log:

```sql
-- Create trigger function to enforce append-only invariant on ConsentAuditLog
CREATE OR REPLACE FUNCTION prevent_consent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'DATABASE INTEGRITY VIOLATION: ConsentAuditLog is strictly APPEND-ONLY. UPDATE and DELETE operations are prohibited by institutional security policy.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_consent_audit_log_immutable ON "ConsentAuditLog";

CREATE TRIGGER trg_consent_audit_log_immutable
BEFORE UPDATE OR DELETE ON "ConsentAuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_consent_audit_log_mutation();
```

### 5.2 Atomic Policy Publishing Strategy
การเปลี่ยนเวอร์ชันของนโยบายจะกระทำผ่าน Transaction ใน Prisma Client:

```typescript
export async function publishNewPolicyDocument(data: {
  type: PolicyType;
  version: string;
  title: string;
  contentMarkdown: string;
  contentHash: string;
  effectiveAt: Date;
}) {
  return await prisma.$transaction(async (tx) => {
    // 1. ปลดสถานะ isCurrent ของเวอร์ชันเดิม
    await tx.policyDocument.updateMany({
      where: { type: data.type, isCurrent: true },
      data: { isCurrent: false },
    });

    // 2. บันทึกและเปิดใช้งานเวอร์ชันใหม่ (Atomic Guarantee)
    return await tx.policyDocument.create({
      data: {
        ...data,
        isCurrent: true,
        publishedAt: new Date(),
      },
    });
  });
}
```

---

## 6. ข้อกำหนด UX & Just-in-Time Flow

### 6.1 หน้าสมัครสมาชิก (`/login` Register Tab)
- **แยก Notice ออกจาก Agreement ชัดเจน:**
  * การแจ้งตามมาตรา 23 (Privacy Notice): แสดงลิงก์และกล่องรับทราบ `[ ] ข้าพเจ้าได้อ่านและรับทราบ ประกาศการคุ้มครองข้อมูลส่วนบุคคล (Privacy Notice v1.0)`
  * ข้อกำหนดการใช้บริการ (Terms of Use): แสดงลิงก์และกล่องยอมรับ `[ ] ข้าพเจ้ายอมรับ เงื่อนไขการใช้งานระบบสารสนเทศตามระเบียบโรงเรียน (Terms of Use)`
- **ไม่ผูก Consent ที่ไม่จำเป็น:** ไม่มีการใส่ Checkbox ขอความยินยอมข้อมูลสุขภาพ, ลายเซ็น หรือ LINE ในหน้านี้
- เมื่อผู้ใช้กดยืนยัน ระบบจะสร้างบัญชีและบันทึก `PolicyAcknowledgment` 2 รายการ (Notice + Terms) พร้อมบันทึก Snapshot เวอร์ชันและ Hash

### 6.2 การขอความยินยอมตามบริบท (Contextual Just-in-Time Consents)
- **การแจ้งเตือนผ่าน LINE:** เมื่อผู้ใช้เข้าไปเชื่อมต่อ LINE ในหน้าตั้งค่า ระบบจะแสดง Consent Form เฉพาะสำหรับ `PURPOSE_LINE_NOTIF`
- **การสแกนใบหน้า (Biometrics):** เมื่อผู้ใช้เข้าสู่ระบบลงเวลาและเลือกเปิดใช้การตรวจจับใบหน้า ระบบจะแสดง Consent Form เฉพาะสำหรับ `PURPOSE_BIOMETRIC_ATTENDANCE`
- **การลาป่วยและใบรับรองแพทย์:** ไม่ขอ Consent ซ้ำซ้อน แต่แสดงข้อความแจ้งความโปร่งใส (Notice at Collection) ในหน้าอัปโหลดเอกสาร ระบุว่าประมวลผลข้อมูลตามระเบียบสำนักนายกรัฐมนตรีฯ และ ม.26(5)(ฉ)

### 6.3 ศูนย์จัดการความเป็นส่วนตัวของผู้ใช้ (Privacy Self-Service at `/settings/privacy`)
- ผู้ใช้สามารถเปิดดู:
  1. นโยบายที่เคยรับทราบ และวันที่รับทราบ
  2. รายการความยินยอมที่เคยให้ไว้ พร้อมปุ่ม **"ถอนความยินยอม (Withdraw)"**
- เมื่อผู้ใช้กดถอนความยินยอม:
  1. ระบบอัปเดต `ConsentRecord.status = WITHDRAWN`, `withdrawnAt = new Date()`
  2. ระบบหยุดเฉพาะฟังก์ชันที่ใช้ฐาน Consent (เช่น ยกเลิกการส่งข้อความเข้า LINE)
  3. ฟังก์ชันราชการหลัก (การลา, งานสารบรรณ, การลงเวลาปกติ) ยังคงทำงานได้ตามกฎหมาย
  4. บันทึก Transaction ลง `ConsentAuditLog` ด้วย `eventType = CONSENT_WITHDRAWN` และสร้าง `correlationId` สำหรับสอบย้อนรอย

---

## 7. แผนการตรวจสอบและยืนยันผล (Verification & Test Matrix)

1. **Database Trigger Verification:**
   - เขียน Unit/Integration Test สั่งคำสั่ง `prisma.consentAuditLog.delete()` และ `update()` เพื่อยืนยันว่า PostgreSQL Trigger โยน Exception และปฏิเสธการแก้ไข 100%
2. **Partial Unique Index Verification:**
   - ทดสอบ Insert `PolicyDocument` 2 แถวที่มี `type` เดียวกันและ `isCurrent = true` เพื่อยืนยันว่า Database Constraint ปฏิเสธการบันทึก
3. **Correlation ID & Audit Tracing:**
   - ยืนยันว่าทุกการ Acknowledge หรือ Consent Mutation มี `correlationId` ส่งต่อตั้งแต่ Request Context จนถึง Audit Log
4. **Legal Scope Verification:**
   - ทดสอบถอนความยินยอม `PURPOSE_LINE_NOTIF` แล้วทดลองยื่นใบลาป่วย ยืนยันว่าระบบยังสามารถบันทึกคำขอลาและแนบใบรับรองแพทย์ได้ตามปกติ
