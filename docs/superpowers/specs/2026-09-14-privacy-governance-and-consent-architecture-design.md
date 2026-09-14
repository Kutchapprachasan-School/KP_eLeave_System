# School Operation Privacy Governance Architecture Specification
## ระบบการกำกับดูแลความเป็นส่วนตัวและการจัดการความยินยอมสำหรับระบบปฏิบัติราชการอิเล็กทรอนิกส์ (KP e-Leave System)

---

### ข้อมูลควบคุมเอกสาร (Document Control Metadata)

| ข้อมูล (Attribute) | รายละเอียด (Specification Details) |
| :--- | :--- |
| **Document ID** | `SPEC-2026-09-14-PRIVACY-GOVERNANCE` |
| **Document Title** | School Operation Privacy Governance & Consent Architecture Specification |
| **Current Revision** | **Rev. 1.0 (Official Baselined Architecture / Architecture Freeze)** |
| **Document Status** | **APPROVED & FROZEN (Issued for Implementation)** |
| **Effective Date** | 14 กันยายน 2569 (2026-09-14) |
| **Target System** | ระบบบริหารจัดการการลาและปฏิบัติราชการอิเล็กทรอนิกส์ โรงเรียนกุดจับประชาสรรค์ (`KP e-Leave`) |
| **ORM & Runtime** | Prisma Client `^7.8.0` (`previewFeatures = ["partialIndexes"]`), PostgreSQL 16+ (Neon/Self-hosted) |
| **Classification** | Internal Institutional Governance Document (เอกสารกำกับมาตรฐานภายในสถานศึกษา) |

---

### ตารางการอนุมัติและควบคุมเอกสาร (Governance & Sign-off)

| บทบาท (Role) | ผู้รับผิดชอบ (Name / Identifier) | ตำแหน่ง / อำนาจหน้าที่ | การดำเนินการ (Action) | วันที่ (Date) |
| :--- | :--- | :--- | :--- | :--- |
| **Prepared By** | System Architect (Antigravity AI) | System Architect & Tech Lead | Submitted for Review | 2026-09-14 |
| **Technical Reviewer** | Lead Architecture Reviewer (USER) | Lead Software Architect | Technical Audit & Sign-off | 2026-09-14 |
| **Compliance Review** | Data Protection & Governance Lead (USER) | School Data Protection Specialist | Legal & PDPA Verification | 2026-09-14 |
| **Approved By** | Head of Architecture & DevOps (USER) | Architecture Review Board | **APPROVED & FROZEN** | 2026-09-14 |

---

### ตารางบันทึกประวัติการเปลี่ยนแปลง (Revision History)

| Revision | วันที่ (Date) | ผู้แก้ไข (Author/Editor) | ผู้อนุมัติ (Approver) | รายละเอียดการเปลี่ยนแปลง (Description of Change) | สถานะเอกสาร (Document Status) |
| :---: | :---: | :--- | :--- | :--- | :---: |
| **Rev. 0.1** | 2026-09-14 | System Architect | Architecture Lead | ร่างข้อกำหนดเริ่มต้น: เสนอ Single Boolean `User.pdpaConsent` และกล่องกดยินยอมรวมในหน้าสมัครสมาชิก | **REJECTED**<br>(Architecture Review 1: ข้อท้วงติงเรื่องการมัดรวม Consent, ฐานภารกิจรัฐ, และขาด Audit Trail) |
| **Rev. 0.2** | 2026-09-14 | System Architect | Architecture Lead | แยก 4 เสาหลัก (Notice, Terms, Signature, Consent), เพิ่ม `ConsentRecord` และ `ConsentAuditLog` แบบพื้นฐาน | **APPROVE WITH CHANGES**<br>(Architecture Review 2: พบปัญหา `@@unique` ชนกับ Lifecycle, ขาด ROPA, และความปลอดภัย Audit ยังไม่พอ) |
| **Rev. 0.3** | 2026-09-14 | System Architect | Architecture Lead | ปรับแก้ตามการ Audit เชิงลึก 17 จุด: เพิ่ม `PolicyDocument` versioning, โครงสร้าง ROPA, แยก E-Signature Domain, ออกแบบ DB Trigger | **REVISE FOR FREEZE**<br>(Architecture Review 3: มี 4 Critical Blocks ที่ต้องระบุในระดับ Database Invariant และ State Constraint) |
| **Rev. 1.0** | 2026-09-14 | System Architect | Lead Architect (USER) | **ฉบับประกาศใช้จริง (Issued for Implementation / Architecture Freeze):**<br>1. ระบุ Prisma `^7.8.0` พร้อมกลยุทธ์ Dual-layer Partial Unique Index สำหรับ `isCurrent`<br>2. ปรับโมเดลความปลอดภัย Append-Only ของ DB Trigger ให้สอดคล้องกับสิทธิ์ Application Role จริง<br>3. แยก `WithdrawalReasonCode` (User) ออกจาก `RevocationReasonCode` (System/Admin) ชัดเจน<br>4. บังคับ State Invariant ด้วย PostgreSQL CHECK Constraints บน `ConsentRecord`<br>5. บังคับความสัมพันธ์ ม.26 กับ Sensitive Data Category ผ่าน DB Constraint<br>6. เปลี่ยน `PolicyAcknowledgment.user` เป็น `onDelete: Restrict` ป้องกันการทำลายหลักฐาน<br>7. กำหนด Independence ของ Audit Snapshot References โดยไม่ใช้ FK Cascade | **APPROVED & FROZEN**<br>(สถานะทางการ: เอกสารฐานเพื่อเริ่ม Implementation Plan) |

---

### ประกาศการยกเลิกและแทนที่เอกสารเดิม (Supersession Notice)
> **สำคัญ:** เอกสารฉบับนี้ (**Rev. 1.0**) ถือเป็น **ฉบับทางการฉบับเดียว (Single Authoritative Baseline)** ที่ได้รับการอนุมัติ (Architecture Freeze) สำหรับการพัฒนา โดยให้ **ยกเลิกและแทนที่ร่างการออกแบบก่อนหน้าทั้งหมด (Draft Rev. 0.1, Rev. 0.2, Rev. 0.3)** โดยเด็ดขาด ห้ามมิให้ทีมพัฒนาหรือผู้มีส่วนเกี่ยวข้องนำแนวคิด โครงสร้าง Schema หรือเนื้อหาในร่างเวอร์ชันเก่ามาอ้างอิงหรือใช้งานในระบบโดยเด็ดขาด

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

### 2.5 Audit Log Snapshot Independence & Subject Exclusivity Constraint
ฟิลด์อ้างอิงใน `ConsentAuditLog` (`purposeId`, `policyDocumentId`, `consentRecordId`) **จงใจไม่สร้าง Foreign Key Relation แบบ Cascade กับตารางต้นทาง** เพื่อป้องกันความเสี่ยงที่การแก้ไข/ลบ/ย้าย Business Entity ในอนาคตจะส่งผลกระทบต่อความสมบูรณ์ของหลักฐาน Audit History ย้อนหลัง

โดยมีการบังคับความถูกต้องของ Resource ที่ Event อ้างอิงผ่าน Database CHECK Constraint:
```sql
ALTER TABLE "ConsentAuditLog" ADD CONSTRAINT "chk_audit_subject_exclusivity" CHECK (
  ("subjectType" = 'POLICY_DOCUMENT' AND "policyDocumentId" IS NOT NULL AND "consentRecordId" IS NULL) OR
  ("subjectType" = 'CONSENT_RECORD' AND "consentRecordId" IS NOT NULL AND "purposeId" IS NOT NULL)
);
```

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

  // 2. Validate that Consent is strictly the applicable legal basis for ALL data categories in this purpose.
  // Invariant: Consent must NEVER be used to authorize or pollute processing governed by statutory obligations or public task.
  if (!purpose.dataCategoryPolicies || purpose.dataCategoryPolicies.length === 0) {
    throw new Error(`Processing purpose '${purpose.code}' has no configured data category policies`);
  }

  const hasNonConsentBasis = purpose.dataCategoryPolicies.some((p) => p.legalBasis !== "CONSENT");
  if (hasNonConsentBasis) {
    throw new Error(
      `Scope violation: Processing purpose '${purpose.code}' contains non-consent legal bases. ` +
      `Consent cannot be recorded for purposes governed by statutory obligations or public task.`
    );
  }

  const allCategoriesConsentEligible = purpose.dataCategoryPolicies.every((p) => {
    const isSensitive = p.dataCategory === "SENSITIVE_HEALTH" || p.dataCategory === "SENSITIVE_BIOMETRIC";
    if (isSensitive) {
      // Sensitive data requires BOTH legalBasis === "CONSENT" AND section26Condition === "EXPLICIT_CONSENT"
      return p.legalBasis === "CONSENT" && p.section26Condition === "EXPLICIT_CONSENT";
    }
    // General data requires legalBasis === "CONSENT" and section26Condition === null
    return p.legalBasis === "CONSENT" && p.section26Condition === null;
  });

  if (!allCategoriesConsentEligible) {
    throw new Error(`Consent is not an applicable legal basis for all data categories under purpose '${purpose.code}'`);
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
    // CAS (Compare-And-Swap) atomic update: only update if status is currently GIVEN (prevents concurrent double-withdraw race)
    const result = await tx.consentRecord.updateMany({
      where: {
        userId: params.userId,
        purposeId: params.purposeId,
        status: "GIVEN", // CAS atomic guard
      },
      data: {
        status: "WITHDRAWN",
        withdrawnAt: new Date(),
        revokedAt: null,
      },
    });

    if (result.count === 0) {
      throw new Error("Consent record state conflict: record is not in GIVEN state or already withdrawn");
    }

    // Retrieve updated record details for audit logging
    const updated = await tx.consentRecord.findUniqueOrThrow({
      where: { userId_purposeId: { userId: params.userId, purposeId: params.purposeId } },
      include: { purpose: true },
    });

    // Audit event is created ONLY when state transition successfully occurred!
    await tx.consentAuditLog.create({
      data: {
        correlationId: params.correlationId,
        eventType: "CONSENT_WITHDRAWN",
        subjectType: "CONSENT_RECORD",
        userId: params.userId,
        purposeId: updated.purpose.id,
        purposeCodeSnapshot: updated.purpose.code,
        consentRecordId: updated.id,
        consentFormVersionSnapshot: updated.consentFormVersion,
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
