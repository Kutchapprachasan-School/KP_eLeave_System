# School Operation Privacy Governance & Consent Architecture Specification
## ระบบการกำกับดูแลความเป็นส่วนตัวและการจัดการความยินยอมสำหรับระบบปฏิบัติราชการอิเล็กทรอนิกส์ (KP e-Leave System)

- **Document ID:** SPEC-2026-09-14-PRIVACY-GOVERNANCE
- **Status:** DRAFT (Ready for Architecture Freeze)
- **Author:** System Architect / Antigravity AI
- **Date:** 2026-09-14
- **Regulatory Framework:** 
  - พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
  - พระราชบัญญัติว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์ พ.ศ. 2544 และที่แก้ไขเพิ่มเติม
  - แนวปฏิบัติและมาตรฐานแพลตฟอร์ม GPPC สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส.)
  - ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ พ.ศ. 2555 และระเบียบงานสารบรรณ

---

## 1. บทนำและปัญหาเดิม (Background & Problem Statement)

### 1.1 สภาพเดิมของระบบ
ในระบบเดิมของโรงเรียนกุดจับประชาสรรค์ (`KP e-Leave System`):
1. หน้าสมัครสมาชิก (`/login` Register Tab) ทำการบันทึกข้อมูลบุคลากรลงฐานข้อมูลโดยไม่มีการแจ้งรายละเอียดตามมาตรา 23 (Privacy Notice) และไม่มีการจัดการความยินยอม (Consent)
2. ปัญหาเชิงสถาปัตยกรรมที่ต้องหลีกเลี่ยง:
   - **ห้ามใช้ Single Boolean Flag** เช่น `user.pdpaConsent = true/false` เพราะการยินยอมไม่ใช่ฐานกฎหมายเดียว และการมี boolean ตัวเดียวไม่สะท้อนการปฏิบัติตาม PDPA
   - **ห้ามมัดรวม (No Tied-in / Bundled Consent):** ประกาศความเป็นส่วนตัว (Privacy Notice) $\neq$ เงื่อนไขการใช้ระบบ (Terms of Use) $\neq$ ข้อกำหนดลายมือชื่อ (E-Signature) $\neq$ ความยินยอมเฉพาะเรื่อง (Consent)
   - **ห้ามใช้ Consent เป็นเงื่อนไขบังคับเข้าสู่ระบบราชการ:** การปฏิบัติหน้าที่ของข้าราชการครูและบุคลากรมีฐานกฎหมายรองรับ (Public Task / Legal Obligation / Contract) หากกิจกรรมใดมีฐานกฎหมายรองรับอยู่แล้ว ห้ามบังคับให้ผู้ใช้ต้องกดยินยอมเพื่อเข้าใช้งานระบบ
   - **ต้องมีวงจรชีวิตความยินยอม (Consent Lifecycle):** รองรับ `GIVEN` และ `WITHDRAWN` (การถอนความยินยอมตามสิทธิ ม.19 วรรคห้า)

---

## 2. โครงสร้างสถาปัตยกรรม 5 โดเมน (The 5 Privacy Domains Architecture)

ระบบถูกออกแบบเป็น **Shared Privacy Infrastructure** สำหรับทุกโมดูลในระบบโรงเรียน (Leave, Attendance, Saraban, Repair, Facility/Vehicle, Certificate, Supervision):

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   School Operation Privacy Governance Platform                   │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 1. Policy Management Domain                                                      │
│    ├── PolicyDocument (Immutable, Versioned, Content Hashed)                     │
│    ├── PolicyAcknowledgment (Current Acknowledged Version per User)              │
│    └── Version Discrepancy & Re-acknowledgment Engine                            │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 2. Processing Governance & ROPA Domain (Authoritative Source of Truth)           │
│    ├── Record of Processing Activities (ROPA / ProcessingActivity)               │
│    ├── ProcessingPurpose (Purpose Registry)                                      │
│    ├── Multi-DataCategory Mapping (General, Sensitive Health, Biometrics, etc.)   │
│    └── LegalBasis Mapping (Public Task, Legal Obligation, Contract, Consent)     │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 3. Purpose-based Consent Management Domain                                       │
│    ├── ConsentRecord (Current State per User + Purpose, with GIVEN/WITHDRAWN)    │
│    ├── Granular Consent Form Versioning (consentFormVersion vs noticeVersion)    │
│    └── Consent Withdrawal Engine (สิทธิในการถอนความยินยอมได้ทุกเมื่อ)             │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 4. Audit & Compliance Evidence Domain                                            │
│    ├── ConsentAuditLog (Append-Only Event Stream: ACK, GIVEN, WITHDRAWN, REVOKED)│
│    └── Actor, Source, Reason & Environmental Evidence Tracking                   │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 5. Electronic Signature Governance Domain (Independent Domain)                   │
│    ├── SigningPolicy & Signature Terms of Agreement                              │
│    ├── Signature Token & Verification Service (`SignatureTokenLog`)              │
│    └── Cryptographic/Audit Evidence Binding for Documents                        │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. หลักการออกแบบสำคัญ (Architectural Principles & Invariants)

1. **Invariance of Policy Immutability:** Published `PolicyDocument` ห้ามแก้ไขเนื้อหาแบบ In-place (ห้าม UPDATE row เดิม) หากมีการแก้ไขข้อความ ต้องสร้าง Version ใหม่ (`v1.0` $\rightarrow$ `v1.1`) พร้อมคำนวณ `contentHash` (SHA-256) ทุกครั้ง
2. **Current State vs. Event History (Pattern A):**
   - `ConsentRecord` เก็บสถานะปัจจุบัน (`GIVEN` / `WITHDRAWN`) มี `@@unique([userId, purposeCode])`
   - `ConsentAuditLog` เก็บประวัติการเปลี่ยนแปลงทุก Transaction แบบ Append-Only ห้ามมี API หรือ Method ใดทำการ UPDATE หรือ DELETE ข้อมูลในตารางนี้เด็ดขาด
3. **No Coercive Consent Invariant:** ระบบต้องไม่กำหนดให้ Consent เป็นฐานบังคับสำหรับ Processing Activity ที่มีฐานกฎหมายอื่นรองรับอยู่แล้ว โดย Legal Basis และเงื่อนไขเพิ่มเติมสำหรับข้อมูลอ่อนไหวต้องได้รับการกำหนดใน Processing Activity Registry เป็นรายกิจกรรม
4. **Decoupled Versioning:** แยก `consentFormVersion` (เวอร์ชันของถ้อยคำขอความยินยอม) ออกจาก `privacyNoticeVersion` (เวอร์ชันของประกาศความเป็นส่วนตัวที่อ้างอิงขณะนั้น)
5. **Just-in-Time Contextual UX:** ไม่ยัดเยียดทุกความยินยอมและข้อตกลงลงหน้าสมัครสมาชิก (Registration) แต่ขอตามบริบทการใช้งานจริง (Contextual Opt-in)

---

## 4. โครงสร้างฐานข้อมูล (Prisma Schema Specification)

```prisma
// ==========================================
// 1. CONTROLLED VOCABULARY (ENUMS)
// ==========================================

enum PolicyType {
  PRIVACY_NOTICE      // ประกาศการคุ้มครองข้อมูลส่วนบุคคล (การแจ้งรายละเอียดตาม ม.23)
  TERMS_OF_USE        // เงื่อนไขการใช้งานระบบสารสนเทศตามระเบียบโรงเรียน
  SIGNATURE_POLICY    // ข้อกำหนดและแนวปฏิบัติการใช้ลายมือชื่ออิเล็กทรอนิกส์
}

enum LegalBasisType {
  PUBLIC_TASK           // ภารกิจเพื่อประโยชน์สาธารณะ หรือการใช้อำนาจรัฐ (ม.24(4))
  LEGAL_OBLIGATION      // หน้าที่ตามกฎหมาย (ม.24(6))
  CONTRACT              // สัญญา หรือการปฏิบัติตามคำขอก่อนเข้าทำสัญญา (ม.24(3))
  CONSENT               // ความยินยอมโดยชัดแจ้ง (ม.19 / ม.26)
  LEGITIMATE_INTEREST   // ประโยชน์โดยชอบด้วยกฎหมาย (ม.24(5))
  VITAL_INTEREST        // การป้องกันหรือระงับอันตรายต่อชีวิต ร่างกาย หรือสุขภาพ (ม.24(2))
}

enum DataCategoryType {
  GENERAL_IDENTITY      // ชื่อ-สกุล, ตำแหน่ง, วิทยฐานะ, สังกัดกลุ่มสาระ
  CONTACT_INFO          // เบอร์โทรศัพท์, ที่อยู่, อีเมล, LINE ID
  EMPLOYMENT_RECORD     // สถิติการมาทำงาน, การลา, ประวัติการสอนแทน, งานวิชาการ
  SENSITIVE_HEALTH      // ใบรับรองแพทย์, ข้อมูลสุขภาพและการรักษาพยาบาล (ม.26)
  SENSITIVE_BIOMETRIC   // ข้อมูลชีวมิติ/โครงร่างใบหน้า (Face Descriptor) (ม.26)
  GEOLOCATION           // พิกัด GPS ณ ขณะลงเวลาปฏิบัติราชการ
  DOCUMENT_ATTACHMENT   // ไฟล์แนบเอกสารราชการ, คำสั่ง, ภาพถ่ายแจ้งซ่อม
  SYSTEM_LOG            // บันทึกการจราจรทางคอมพิวเตอร์, IP, Session
}

enum ConsentStatus {
  GIVEN
  WITHDRAWN
}

enum AuditAction {
  ACKNOWLEDGED
  CONSENT_GIVEN
  CONSENT_WITHDRAWN
  CONSENT_REVOKED
}

enum AuditActorType {
  USER
  ADMIN
  SYSTEM
  MIGRATION
}

// ==========================================
// 2. DOMAIN 1: POLICY MANAGEMENT
// ==========================================

model PolicyDocument {
  id              String         @id @default(cuid())
  type            PolicyType
  version         String         // e.g. "2026.09.1"
  title           String
  contentMarkdown String         @db.Text
  contentHash     String         // SHA-256 hash ของเนื้อหาเพื่อเป็นหลักฐานความถูกต้อง
  effectiveAt     DateTime
  publishedAt     DateTime       @default(now())
  isCurrent       Boolean        @default(false)
  createdAt       DateTime       @default(now())

  acknowledgments PolicyAcknowledgment[]

  @@unique([type, version])
  @@index([type, isCurrent])
}

model PolicyAcknowledgment {
  id                String          @id @default(cuid())
  userId            String
  policyDocumentId  String
  acknowledgedAt    DateTime        @default(now())
  ipAddress         String?
  userAgent         String?

  user              User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  policyDocument    PolicyDocument  @relation(fields: [policyDocumentId], references: [id], onDelete: Restrict)

  @@unique([userId, policyDocumentId])
  @@index([userId])
}

// ==========================================
// 3. DOMAIN 2: PROCESSING GOVERNANCE & ROPA
// ==========================================

model ProcessingActivity {
  id                    String              @id @default(cuid())
  code                  String              @unique // e.g. "PA_LEAVE_MANAGEMENT", "PA_LINE_NOTIFY"
  module                String              // "LEAVE", "ATTENDANCE", "SARABAN", etc.
  name                  String
  description           String?             @db.Text
  retentionPeriodDays   Int                 // ระยะเวลาจัดเก็บข้อมูลตามระเบียบสารบรรณ (เช่น 1825 หรือ 3650 วัน)
  retentionPolicyNote   String?             @db.Text
  recipientsDescription String?             // ผู้รับข้อมูล: สายการบังคับบัญชา, สพม.อุดรธานี, สพฐ.
  crossBorderTransfer   Boolean             @default(false)
  active                Boolean             @default(true)
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  purposes              ProcessingPurpose[]

  @@index([module, active])
}

model ProcessingPurpose {
  id                    String                         @id @default(cuid())
  activityId            String
  code                  String                         @unique // e.g. "PURPOSE_LEAVE_SICK_CERT", "PURPOSE_LINE_NOTIF"
  name                  String
  description           String?                        @db.Text
  isConsentRequired     Boolean                        @default(false)
  active                Boolean                        @default(true)
  createdAt             DateTime                       @default(now())
  updatedAt             DateTime                       @updatedAt

  activity              ProcessingActivity             @relation(fields: [activityId], references: [id], onDelete: Cascade)
  dataCategories        PurposeDataCategoryMapping[]
  legalBases            PurposeLegalBasisMapping[]
  consents              ConsentRecord[]

  @@index([activityId, active])
}

model PurposeDataCategoryMapping {
  id                    String              @id @default(cuid())
  purposeId             String
  dataCategory          DataCategoryType

  purpose               ProcessingPurpose   @relation(fields: [purposeId], references: [id], onDelete: Cascade)

  @@unique([purposeId, dataCategory])
}

model PurposeLegalBasisMapping {
  id                    String              @id @default(cuid())
  purposeId             String
  legalBasis            LegalBasisType
  section26Condition    String?             // อ้างอิงเงื่อนไข ม.26 เฉพาะกรณี Sensitive Data
  isPrimary             Boolean             @default(true)

  purpose               ProcessingPurpose   @relation(fields: [purposeId], references: [id], onDelete: Cascade)

  @@unique([purposeId, legalBasis])
}

// ==========================================
// 4. DOMAIN 3: CONSENT MANAGEMENT
// ==========================================

model ConsentRecord {
  id                    String              @id @default(cuid())
  userId                String
  purposeCode           String
  status                ConsentStatus       @default(GIVEN)
  consentFormVersion    String              // เวอร์ชันข้อความที่ใช้ขอความยินยอม (e.g. "v1.0")
  privacyNoticeVersion  String?             // เวอร์ชัน Privacy Notice ที่อ้างอิงขณะให้ความยินยอม
  consentedAt           DateTime?
  withdrawnAt           DateTime?
  source                String              // "REGISTRATION", "SETTINGS_PAGE", "FEATURE_MODAL"
  metadata              Json?               // ข้อมูลแวดล้อมเพิ่มเติม (Non-coercive)
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt

  user                  User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  purpose               ProcessingPurpose   @relation(fields: [purposeCode], references: [code], onDelete: Restrict)

  @@unique([userId, purposeCode])
  @@index([userId, status])
}

// ==========================================
// 5. DOMAIN 4: IMMUTABLE AUDIT TRAIL
// ==========================================

model ConsentAuditLog {
  id                    String              @id @default(cuid())
  eventId               String              @default(cuid())
  userId                String
  targetType            String              // "POLICY" หรือ "CONSENT"
  targetCode            String              // e.g. "PRIVACY_NOTICE", "PURPOSE_LINE_NOTIF"
  action                AuditAction
  policyVersion         String              // Policy หรือ Form version ขณะเกิดเหตุการณ์
  actorType             AuditActorType      @default(USER)
  actorId               String?             // userId ของผู้กระทำ (ถ้า admin หรือ system)
  source                String?             // จุดเกิดเหตุการณ์
  reason                String?             // เหตุผล (เช่น กรณี revoke หรือ withdrawal)
  ipAddress             String?             // Evidence เท่าที่จำเป็น (Nullable)
  userAgent             String?             // Evidence เท่าที่จำเป็น (Nullable)
  timestamp             DateTime            @default(now())

  @@index([userId, timestamp])
  @@index([targetCode, action])
  @@index([eventId])
}
```

---

## 5. แผนภูมิการไหลของข้อมูลและ UX (Just-in-Time Contextual Flow)

### 5.1 หน้าลงทะเบียน (`/login` Register Tab)
- **ไม่บังคับ Consent ที่ไม่จำเป็น**
- แสดง 2 รายการแยกกันชัดเจน:
  1. `[ ] ข้าพเจ้าได้อ่านและรับทราบ ประกาศการคุ้มครองข้อมูลส่วนบุคคล (Privacy Notice)` `[เปิดอ่านฉบับเต็ม v1.0]`
  2. `[ ] ข้าพเจ้ายอมรับ เงื่อนไขการใช้งานระบบสารสนเทศตามระเบียบของหน่วยงาน (Terms of Use)` `[เปิดอ่านเงื่อนไข v1.0]`
- หากผู้ใช้ยังไม่ทำเครื่องหมายรับทราบ/ยอมรับ ปุ่ม "สมัครสมาชิก" จะปิดการใช้งาน (Disabled)
- เมื่อกดส่งข้อมูล ระบบจะสร้าง User พร้อมบันทึก `PolicyAcknowledgment` ลงฐานข้อมูล

### 5.2 การจัดการผู้ใช้งานเดิม (Existing Users Policy Verification)
1. เมื่อผู้ใช้ที่มีบัญชีอยู่แล้วล็อกอินเข้าสู่ระบบ Layout (`(app)/layout.tsx`) จะตรวจสอบ:
   `hasAcknowledgedCurrentPolicy(userId, PolicyType.PRIVACY_NOTICE)`
2. หากมีการประกาศ Policy ฉบับใหม่ (`isCurrent = true` แต่ยังไม่มี Acknowledgment):
   - แสดง **Notification Banner / Dialog:** *"แจ้งปรับปรุงประกาศการคุ้มครองข้อมูลส่วนบุคคล (ฉบับที่ 1.1 มีผลบังคับใช้ 1 ต.ค. 2569)"*
   - สรุปหัวข้อที่มีการปรับปรุง
   - ปุ่มกด: **"อ่านประกาศฉบับเต็ม"** และ **"รับทราบและปิดหน้าต่าง"**
   - ไม่บล็อกการทำงานราชการหลักของผู้ใช้แบบมัดมือชก

### 5.3 บริบทการขอความยินยอมแบบ Just-in-Time (Contextual Consents)
- **การแจ้งเตือนผ่าน LINE:** เมื่อครูเข้าสู่หน้าตั้งค่าการแจ้งเตือน LINE (`/settings`) หรือกดยืนยันเชื่อมต่อ LINE Notify ระบบจะแสดงข้อความขอความยินยอมสำหรับ Purpose `PURPOSE_LINE_NOTIF` โดยเฉพาะ
- **การสแกนใบหน้า (Biometrics):** เมื่อครูเข้าสู่ระบบลงเวลาและเลือกเปิดใช้งานสแกนใบหน้า ระบบจะแสดง Consent Modal สำหรับ `PURPOSE_BIOMETRIC_ATTENDANCE`
- **การจัดเก็บใบรับรองแพทย์:** ดำเนินการภายใต้ฐานหน้าที่ตามกฎหมาย/ภารกิจรัฐ (Public Task / Legal Obligation) และระเบียบสำนักนายกฯ โดยแสดงคำชี้แจงด้านความเป็นส่วนตัวที่จุดอัปโหลดเอกสาร

### 5.4 ศูนย์จัดการความเป็นส่วนตัวของผู้ใช้ (Privacy & Consent Self-Service)
- ตำแหน่ง: เมนูโปรไฟล์/ตั้งค่า (`/settings/privacy`)
- ฟังก์ชัน:
  1. แสดงประวัติและเวอร์ชันของ Privacy Notice และ Terms of Use ที่เคยรับทราบ
  2. แสดงรายการ Consent ที่เคยให้ความยินยอมไว้ (เช่น LINE Notification)
  3. **ปุ่ม "ถอนความยินยอม" (Withdraw Consent):** เมื่อกดถอนความยินยอม ระบบจะเปลี่ยนสถานะใน `ConsentRecord` เป็น `WITHDRAWN`, บันทึก `withdrawnAt = new Date()`, หยุดการประมวลผลในฟีเจอร์นั้นทันที และบันทึก `ConsentAuditLog` เหตุการณ์ `CONSENT_WITHDRAWN`

### 5.5 หน้าประกาศสาธารณะ (`/privacy`)
- แสดงเนื้อหา Privacy Notice ปัจจุบัน
- แสดง Version Number, วันที่มีผลบังคับใช้ (Effective Date), วันที่ปรับปรุงล่าสุด
- แสดง **ตารางแสดงรายการกิจกรรมการประมวลผล (ROPA Summary Table):**
  - กิจกรรม / วัตถุประสงค์
  - ประเภทข้อมูลส่วนบุคคล
  - ฐานทางกฎหมายในการประมวลผล (Public Task, Legal Obligation, Contract, Consent)
  - ระยะเวลาการจัดเก็บ
  - ช่องทางการติดต่อเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO) และการใช้สิทธิเจ้าของข้อมูล (DSAR)

---

## 6. ข้อกำหนดด้านความมั่นคงปลอดภัยและความถูกต้องของ Audit Log (Security & Invariants)

1. **Application-Level Append-Only Enforcement:**
   - ใน Service Layer (`src/lib/privacy/audit-service.ts`) จะมีเฉพาะฟังก์ชัน `createAuditLogEntry()` เท่านั้น
   - ห้าม Expose หรือเขียนฟังก์ชัน `updateAuditLogEntry()` หรือ `deleteAuditLogEntry()` โดยเด็ดขาด
2. **Hash Verification:**
   - ทุกครั้งที่มีการโหลด `PolicyDocument` มาแสดง ระบบสามารถคำนวณ Hash เพื่อยืนยันว่าเนื้อหาของนโยบายไม่ถูกดัดแปลงแก้ไขในฐานข้อมูล
3. **Data Retention & Soft Deletion:**
   - บันทึก `ConsentAuditLog` ต้องจัดเก็บไม่น้อยกว่าระยะเวลาอายุความตามกฎหมาย (อย่างน้อย 10 ปี สำหรับหลักฐานทางราชการ)

---

## 7. แผนการทดสอบและการตรวจสอบ (Verification Plan)

1. **Unit & Logic Tests:**
   - ทดสอบการเปลี่ยนสถานะ Consent จาก `GIVEN` $\rightarrow$ `WITHDRAWN` $\rightarrow$ `GIVEN` และตรวจสอบว่า `ConsentAuditLog` มีประวัติครบทุก Step
   - ทดสอบการตรวจจับ Version Mismatch เมื่อระบบเปลี่ยน `PolicyDocument.version`
2. **Schema & Migration Safety:**
   - ตรวจสอบความถูกต้องของ Foreign Keys และ Partial Indexes
   - รันการ Seed ข้อมูลเบื้องต้นสำหรับ `ProcessingActivity` และ `PolicyDocument` ฉบับเริ่มต้น (v1.0)
3. **End-to-End User Verification:**
   - ตรวจสอบ Flow การสมัครสมาชิกใหม่ว่ามีช่องรับทราบ Notice และยอมรับ Terms แยกกันอย่างถูกต้อง
   - ตรวจสอบ Flow ในหน้า `/settings/privacy` ว่าสามารถถอนความยินยอมและให้ความยินยอมใหม่ได้จริง
