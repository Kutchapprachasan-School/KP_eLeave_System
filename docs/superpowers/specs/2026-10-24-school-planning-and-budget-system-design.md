# ระบบแผนงานโครงการและติดตามงบประมาณสถานศึกษา (School Planning & Budget Ledger) (v1.0 / Rev. 0)

| Version / Rev | วันที่ / เวลา | การเปลี่ยนแปลงสำคัญ (Changelog) | สถานะ (Status) |
|---|---|---|---|
| `v1.0 (Rev. 0)` | 2026-10-24 13:20 | บันทึกการออกแบบระบบแผนงานโครงการและติดตามงบประมาณฉบับสมบูรณ์ (Initial Design Spec) ผนวกรวมโครงสร้าง Data Schema, สิทธิ์การใช้งาน, Stacked Progress Bar, ป้าย SAR Readiness, ปุ่มลัดยืนยันเบิกจ่ายจริง, และ Export Excel | Pending Review |

---

## 1. บทสรุปและที่มาของระบบ (Executive Summary & Problem Statement)

ในสถานศึกษา งานแผนงานและงบประมาณมีความจำเป็นต้องเผยแพร่ข้อมูลตัวเลขงบประมาณของโครงการและกิจกรรมย่อยให้ครูผู้จัดทำกิจกรรมรับทราบแบบเรียลไทม์ เพื่อให้ทราบว่างบประมาณที่ได้รับจัดสรรถูกใช้ไปเท่าใดและเหลือเท่าใด อีกทั้งต้องมีระบบแนบเอกสารโครงการทั้งในรูปแบบการอัปโหลดไฟล์จริง (PDF/Word/Excel) และการแปะลิงก์ภายนอก (Google Drive, Canva, OneDrive) สำหรับงานประกันคุณภาพการศึกษา (SAR)

ระบบนี้ออกแบบขึ้นเป็นหน้าระบบเฉพาะ **`/planning` (ระบบแผนงานโครงการและติดตามงบประมาณ)** แยกออกจากระบบพัสดุและงวดเงินเดิม โดยให้:
1. **ครูทั่วไปและผู้รับผิดชอบกิจกรรม:** เข้าดูตารางแผนงานแบบลำดับชั้น (Hierarchical Ledger Table), กรองเฉพาะงานของตนเอง, ดูยอดเงินคงเหลือสุทธิ, ตรวจสอบประวัติบิลที่ถูกตัดยอด, และแนบเอกสารโครงการของตนเองได้
2. **ครูผู้ปฏิบัติงานแผนงานและการเงิน (Planning & Finance Officers):** มีสิทธิ์สร้าง/แก้ไขโครงการ, เพิ่มกิจกรรมย่อย, กำหนดวงเงิน, และลงบันทึกการใช้เงิน (ตัดยอดทันที หรือกันวงเงินจองไว้)

---

## 2. โครงสร้างสถาปัตยกรรมและเส้นทาง (System Architecture & Routing)

* **URL Route:** `/planning` (ระบบแผนงานโครงการและติดตามงบประมาณ)
* **Sidebar Integration:** เพิ่มเมนู "แผนงานโครงการ" ภายใต้กลุ่มบริหารงานของโรงเรียนใน `src/app/(app)/layout.tsx` โดยเปิดให้แสดงตามเงื่อนไข `enablePlanning || isAdmin`
* **การแยก Layer (3-Layer Architecture):**
  1. **Presentation Layer:** `src/app/(app)/planning/page.tsx`, `PlanningLedgerTable.tsx`, `FinancialMetricCards.tsx`, `ExpenseHistoryDrawer.tsx`, `AttachDocumentModal.tsx`, `DisburseExpenseModal.tsx`
  2. **Domain/Service Layer:** `src/services/school-planning.service.ts` (ตรรกะการคำนวณงบประมาณ, ตรวจสอบ Invariants, สรุปเมตริก, และจัดการไฟล์ R2)
  3. **Data Access Layer:** `src/app/actions/school-planning.ts` (Server Actions พร้อม Lean validation, Auth check ผ่าน `getPlanningPermissions`, และ Decimal serialization)

---

## 3. โครงสร้างฐานข้อมูล (Database Schema - PostgreSQL Prisma)

โครงสร้างฐานข้อมูลอิง **PostgreSQL (Neon)** เพิ่มเติมนิยามอย่างปลอดภัย (Non-destructive) เพื่อไม่ให้กระทบข้อมูลเดิมในระบบ:

### 3.1 Enums (ตัวเลือกมาตรฐาน)
```prisma
enum ProjectStatus {
  DRAFT        // ร่างโครงการ
  APPROVED     // อนุมัติตามแผนปฏิบัติการ
  IN_PROGRESS  // กำลังดำเนินการ
  COMPLETED    // ดำเนินการเสร็จสิ้น (ส่งสรุปผลแล้ว)
  CANCELLED    // ยกเลิกโครงการ
}

enum BudgetSourceType {
  SUBSIDY             // เงินอุดหนุนรายหัว
  FREE_EDUCATION_15Y  // เงินเรียนฟรี 15 ปี
  SCHOOL_INCOME       // เงินรายได้สถานศึกษา
  LOCAL_GOV           // เงินอุดหนุน อปท. / อบจ.
  OTHER               // แหล่งงบประมาณอื่นๆ
}

enum ExpenseCategory {
  REMUNERATION  // ค่าตอบแทน (เช่น ค่าวิทยากร)
  OPERATING     // ค่าใช้สอย (เช่น ค่าจ้างเหมา, ค่าอาหาร, ค่าเดินทาง)
  MATERIALS     // ค่าวัสดุ (เช่น วัสดุสำนักงาน, วัสดุการศึกษา)
  EQUIPMENT     // ค่าครุภัณฑ์
  UTILITIES     // ค่าสาธารณูปโภค
  OTHER         // อื่นๆ
}

enum ExpenseStatus {
  RESERVED   // กันวงเงิน (ขออนุมัติหลักการแล้ว รอใบเสร็จ/รอเบิกจริง)
  PAID       // เบิกจ่ายจริง (ตัดยอดเงินและมีหลักฐานใบเสร็จแล้ว)
  CANCELLED  // ยกเลิกรายการ
}

enum AttachmentType {
  PROPOSAL   // เล่มโครงการฉบับเต็ม
  APPROVAL   // บันทึกข้อความขออนุมัติโครงการ
  SUMMARY    // รายงานสรุปผลโครงการ (SAR) / รูปภาพกิจกรรม
  RECEIPT    // หลักฐานใบสำคัญรับเงิน / ใบเสร็จ
  OTHER      // เอกสารอื่นๆ
}

enum StorageType {
  R2_UPLOAD      // อัปโหลดไฟล์เก็บไว้บน Cloudflare R2
  EXTERNAL_LINK  // ลิงก์ภายนอก (Google Drive, OneDrive, Canva)
}
```

### 3.2 Models (ตารางข้อมูล)
```prisma
// ส่วนขยายใน SystemSettings
model SystemSettings {
  // ... ฟิลด์เดิมในระบบ ...
  enablePlanning         Boolean  @default(true)
  planningOfficerUserIds String   @default("") // Comma-separated User IDs
}

// โครงการหลัก
model Project {
  id                 String              @id @default(cuid())
  fiscalYear         Int                 // ปีงบประมาณ พ.ศ. เช่น 2569
  code               String              // รหัสโครงการ เช่น "69-ACAD-001"
  name               String              // ชื่อโครงการ
  departmentName     String?             // ฝ่าย/กลุ่มสาระฯ เช่น "ฝ่ายวิชาการ", "กลุ่มสาระฯ วิทยาศาสตร์ฯ"
  leaderUserId       String
  leaderUser         User                @relation("ProjectLeader", fields: [leaderUserId], references: [id], onDelete: Restrict)
  leaderName         String              @default("")
  
  budgetSourceType   BudgetSourceType    @default(SUBSIDY)
  strategyCode       String?             // กลยุทธ์โรงเรียน เช่น "ยุทธศาสตร์ที่ 1"
  standardTags       String[]            @default([]) // มาตรฐาน สมศ. เช่น ["ม.1", "ม.3"]

  allocatedAmount    Decimal             @default(0) @db.Decimal(19, 4) // งบตั้งต้นตามแผน
  adjustedAmount     Decimal?            @db.Decimal(19, 4)             // งบสุทธิหลังโอนเกลี่ย
  status             ProjectStatus       @default(APPROVED)

  activities         ProjectActivity[]
  attachments        ProjectAttachment[]

  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt
  deletedAt          DateTime?           // Soft Delete

  @@unique([fiscalYear, code], map: "uk_project_fy_code_custom")
  @@index([fiscalYear, departmentName])
  @@index([leaderUserId])
  @@index([deletedAt])
}

// กิจกรรมย่อยภายใต้โครงการ
model ProjectActivity {
  id                String          @id @default(cuid())
  projectId         String
  project           Project         @relation(fields: [projectId], references: [id], onDelete: Restrict)
  activityNo        Int             // ลำดับกิจกรรม เช่น 1, 2, 3
  name              String          // ชื่อกิจกรรมย่อย
  responsibleUserId String
  responsibleUser   User            @relation("ActivityResponsible", fields: [responsibleUserId], references: [id], onDelete: Restrict)

  allocatedAmount   Decimal         @default(0) @db.Decimal(19, 4) // งบจัดสรรตั้งต้น
  adjustedAmount    Decimal?        @db.Decimal(19, 4)             // งบหลังปรับปรุง/โอนเกลี่ย

  expenses          ActivityExpense[]

  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  deletedAt         DateTime?       // Soft Delete

  @@unique([projectId, activityNo], map: "uk_activity_project_no_custom")
  @@index([projectId])
  @@index([responsibleUserId])
  @@index([deletedAt])
}

// เอกสารแนบโครงการ
model ProjectAttachment {
  id               String         @id @default(cuid())
  projectId        String
  project          Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  title            String         // ชื่อเอกสาร เช่น "เล่มโครงการฉบับอนุมัติ"
  attachmentType   AttachmentType @default(PROPOSAL)
  storageType      StorageType    @default(R2_UPLOAD)
  fileUrl          String         // URL เปิดดู หรือ External URL
  fileKey          String?        // Object Key ใน Cloudflare R2 สำหรับลบไฟล์
  fileSize         Int?
  mimeType         String?
  uploadedByUserId String
  uploadedByUser   User           @relation("AttachmentUploader", fields: [uploadedByUserId], references: [id], onDelete: Restrict)
  createdAt        DateTime       @default(now())

  @@index([projectId, attachmentType])
  @@index([uploadedByUserId])
}

// ประวัติการใช้จ่ายและการตัดยอดงบประมาณ
model ActivityExpense {
  id               String          @id @default(cuid())
  activityId       String
  activity         ProjectActivity @relation(fields: [activityId], references: [id], onDelete: Restrict)
  expenseDate      DateTime
  title            String
  expenseCategory  ExpenseCategory @default(MATERIALS)
  amount           Decimal         @db.Decimal(19, 4)
  receiptNo        String?
  status           ExpenseStatus   @default(PAID)
  remark           String?

  requesterUserId  String          // ครูผู้ขอเบิกเงิน/จัดทำกิจกรรม
  requesterUser    User            @relation("ExpenseRequester", fields: [requesterUserId], references: [id], onDelete: Restrict)
  recordedByUserId String          // เจ้าหน้าที่แผน/การเงินผู้คีย์บันทึก
  recordedByUser   User            @relation("ExpenseRecorder", fields: [recordedByUserId], references: [id], onDelete: Restrict)

  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
  deletedAt        DateTime?       // Soft Delete / Void history

  @@index([activityId, status])
  @@index([expenseDate])
  @@index([requesterUserId])
  @@index([recordedByUserId])
  @@index([deletedAt])
}
```

---

## 4. สถาปัตยกรรม UI/UX และคอมโพเนนต์ (UI/UX & Component Architecture)

### 4.1 หน้าจอหลัก (`/planning`)
1. **Financial Metric Cards (4 การ์ดสถิติ Real-time):**
   * **งบประมาณทั้งสิ้น:** รวม `Effective Budget` ตามตัวกรอง
   * **เบิกจ่ายจริงแล้ว (`PAID`):** ยอดตัดจ่ายสมบูรณ์
   * **กันวงเงินจอง (`RESERVED`):** ยอดที่ขออนุมัติไว้รอเคลียร์ใบเสร็จ
   * **คงเหลือสุทธิ:** $(\text{งบประมาณ} - (\text{เบิกจ่ายจริง} + \text{กันเงิน}))$ แสดงสีเขียวสดใสเมื่อบวก และสีแดงเตือนเมื่อเกินงบ

2. **Filter & Action Toolbar:**
   * เลือกปีงบประมาณ (เช่น 2569, 2568)
   * ค้นหาทันที (ชื่อโครงการ, กิจกรรม, ชื่อครู)
   * กรองตามกลุ่มสาระฯ/ฝ่ายงาน และแหล่งงบประมาณ
   * สวิตช์ด่วน `[🔘 เฉพาะที่ฉันรับผิดชอบ]` (My Projects)
   * ปุ่ม `[ 📥 ส่งออก Excel ]` (Export เป็นไฟล์ Spreadsheet ตามตัวกรองปัจจุบัน)
   * ปุ่ม `[ + สร้างโครงการใหม่ ]` (แสดงเฉพาะเจ้าหน้าที่แผนงานและแอดมิน)

3. **Hierarchical Master Ledger Table (ตารางแผนงานและกิจกรรมย่อย):**
   * **แถวโครงการ (Level 1 - Parent):**
     * ตัวขยาย Accordion `>` แสดงรหัสโครงการ + ชื่อโครงการ + Badge ฝ่ายงาน + แหล่งเงิน
     * ป้ายกำกับ **SAR Readiness 3 ช่อง:** `[📄 เล่มโครงการ]` `[📝 ขออนุมัติ]` `[📊 สรุปผล SAR]` (สีเขียวเมื่อมีไฟล์, เทาจางเมื่อยังไม่มี)
     * ข้อมูลผู้รับผิดชอบ: รูปครูหัวหน้าโครงการ + ชื่อ
     * การแสดงยอดงบ: แสดงงบสุทธิ พร้อมข้อความกำกับหากมีการโอนเกลี่ย เช่น `฿120,000 (เดิม ฿100,000)`
     * ป้ายเตือนยอดจัดสรรไม่ตรง: `[⚠️ รอจัดสรรลงกิจกรรม ฿10,000]` หากผลรวมกิจกรรม $\ne$ งบโครงการ
     * **Stacked Progress Bar:** แถบสี 2 ระดับ (น้ำเงินทึบ = เบิกจ่ายจริง, เหลือง/ส้มลายทแยง = กันวงเงิน, เทา = คงเหลือ)
     * ปุ่ม `+ แนบเอกสาร` (เปิดให้ทั้งเจ้าหน้าที่แผนและหัวหน้าโครงการ)
     * ปุ่ม `+ เพิ่มกิจกรรมย่อย` (เฉพาะเจ้าหน้าที่แผน)
   * **แถวกิจกรรมย่อย (Level 2 - Child):**
     * ลำดับที่ & ชื่อกิจกรรมย่อย
     * ครูผู้รับผิดชอบกิจกรรม
     * หมวดค่าใช้จ่ายที่เคยเบิกจ่าย (Summary Category Tags)
     * งบกิจกรรม, ยอดกันเงิน, ยอดจ่ายแล้ว, และยอดคงเหลือสุทธิ
     * ปุ่ม `[ ฿ บันทึกการใช้เงิน ]` (เฉพาะเจ้าหน้าที่แผนงานและการเงิน)
     * ปุ่ม `[ 📋 ประวัติเงิน (n รายการ) ]` (ครูทุกคนกดเปิด Drawer ดูรายละเอียดบิลได้)

4. **การรองรับ Mobile Responsive (`< 768px`):**
   * ยุบแถวตารางเป็น **Card Layout** อัตโนมัติ แสดงชื่อโครงการและตัวเลข **"คงเหลือสุทธิ"** โดดเด่น
   * ตัวเลขงบตั้งต้น/กันเงิน/จ่ายแล้ว จัดแสดงเป็นตาราง 2x2 กะทัดรัด
   * ปุ่มกดขนาดใหญ่ไม่น้อยกว่า 44px (`h-11`) ใช้งานด้วยนิ้วโป้งได้อย่างคล่องตัว

### 4.2 หน้าต่างจัดการข้อมูล (Modals & Drawers)
1. **Expense Recording Modal (บันทึกการใช้เงิน):**
   * เลือกระหว่าง: **"เบิกจ่ายจริง (PAID)"** หรือ **"กันวงเงินจองไว้ (RESERVED)"**
   * หมวดค่าใช้จ่าย (ค่าตอบแทน, ค่าใช้สอย, ค่าวัสดุ, ค่าครุภัณฑ์ ฯลฯ)
   * วันที่ใช้จ่าย, รายการ, จำนวนเงิน (บาท)
   * เลือกครูผู้ขอเบิก (`requesterUserId`) และระบบผูกผู้คีย์ (`recordedByUserId`) อัตโนมัติ
   * เลขที่เอกสารอ้างอิง/ใบเสร็จ
2. **Expense History Drawer & ปุ่มลัดยืนยันเบิกจ่ายจริง:**
   * ตารางประวัติทุกบิลในกิจกรรม
   * สำหรับรายการที่เป็น `RESERVED`: มีปุ่มลัด **`[ ✅ ยืนยันเบิกจ่ายจริง ]`** เพื่อเปิดฟอร์มแก้ตัวเลขตามใบเสร็จจริง แนบเลขที่ใบเสร็จ แล้วอัปเดตเป็น `PAID` ในขั้นตอนเดียว
   * ปุ่ม Soft Delete / Void รายการ (เฉพาะเจ้าหน้าที่แผน) พร้อมบันทึกเหตุผล
3. **Upload & Link Modal (แนบเอกสารโครงการ):**
   * สิทธิ์: **เจ้าหน้าที่แผนงาน + ครูหัวหน้าโครงการ + ผู้รับผิดชอบกิจกรรม**
   * แท็บ 1: อัปโหลดไฟล์ตรงเข้า Cloudflare R2 (PDF, Word, Excel) พร้อมเก็บ `fileKey`
   * แท็บ 2: แปะลิงก์ภายนอก (Google Drive, OneDrive, Canva)
   * เลือกประเภทเอกสาร: `PROPOSAL`, `APPROVAL`, `SUMMARY`, `OTHER`

---

## 5. สิทธิ์การใช้งานและความปลอดภัย (Permissions & Security)

### 5.1 ฟังก์ชัน Helper ตรวจสอบสิทธิ์ (`getPlanningPermissions`)
```typescript
export interface PlanningAuthContext {
  leaderUserId?: string;
  responsibleUserId?: string;
  projectStatus?: ProjectStatus;
}

export function getPlanningPermissions(
  user: { id: string; role: string },
  settings: { enablePlanning: boolean; planningOfficerUserIds: string },
  context?: PlanningAuthContext
) {
  const isAdmin = user.role === "ADMIN";
  const officerIds = (settings.planningOfficerUserIds || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const isPlanningOfficer = isAdmin || officerIds.includes(user.id);
  const isOwner =
    context?.leaderUserId === user.id ||
    context?.responsibleUserId === user.id;

  return {
    canView: settings.enablePlanning || isAdmin,
    canManageStructureAndBudget: isPlanningOfficer, // สร้างโครงการ, กิจกรรม, ปรับงบ
    canDisburseAndRecord: isPlanningOfficer,        // คีย์ตัดยอดเงิน, กันวงเงิน, ยกเลิกบิล
    canManageAttachments:
      isPlanningOfficer ||
      (isOwner &&
        context?.projectStatus !== "COMPLETED" &&
        context?.projectStatus !== "CANCELLED"),
  };
}
```

### 5.2 การมอบหมายสิทธิ์ในหน้า Settings
* ในหน้า **Settings (ตั้งค่าระบบ)** เพิ่มหัวข้อ **"ตั้งค่าระบบแผนงานโครงการและงบประมาณ"**
* ช่องเลือกรายชื่อ **"เจ้าหน้าที่แผนงานและงบประมาณ/การเงิน"** สามารถค้นหาและเลือกครูได้หลายท่าน
* สวิตช์เปิด-ปิดระบบแผนงาน (`enablePlanning`)

---

## 6. เอนจินการคำนวณและ Invariants ทางการเงิน (Financial Calculation Engine)

1. **สูตรการคำนวณระดับกิจกรรม (Activity):**
   $$\text{Effective Budget} = \text{adjustedAmount} \text{ ?? } \text{allocatedAmount}$$
   $$\text{Reserved Amount} = \sum \text{amount} \quad [\text{status} = \text{RESERVED} \land \text{deletedAt IS NULL}]$$
   $$\text{Paid Amount} = \sum \text{amount} \quad [\text{status} = \text{PAID} \land \text{deletedAt IS NULL}]$$
   $$\text{Total Spent} = \text{Reserved Amount} + \text{Paid Amount}$$
   $$\text{Remaining Balance} = \text{Effective Budget} - \text{Total Spent}$$

2. **สูตรการคำนวณระดับโครงการ (Project):**
   $$\text{Project Effective Budget} = \text{adjustedAmount} \text{ ?? } \text{allocatedAmount}$$
   $$\text{Project Total Activities Budget} = \sum \text{Activity.Effective Budget}$$
   $$\text{Project Unallocated} = \text{Project Effective Budget} - \text{Project Total Activities Budget}$$
   $$\text{Project Reserved} = \sum \text{Activity.Reserved Amount}$$
   $$\text{Project Paid} = \sum \text{Activity.Paid Amount}$$
   $$\text{Project Remaining} = \text{Project Effective Budget} - (\text{Project Reserved} + \text{Project Paid})$$

3. **Financial Invariants & Safety:**
   * ทุกการบันทึกหรือปรับปรุงเงินดำเนินการใน `prisma.$transaction`
   * การลบรายการใช้จ่ายเป็นการ Soft Delete (`deletedAt = now()`) เพื่อรักษา Audit Trail ย้อนหลัง
   * แปลงค่า `Decimal` เป็น Number / String ใน Server Action ก่อนส่งไป Client Components ตามกฎ Frontend

---

## 7. แผนการตรวจสอบและการทดสอบ (Verification & Testing Plan)

1. **Financial Precision & Invariant Unit Tests:**
   * คำนวณยอดเงินคงเหลือสุทธิระดับกิจกรรมและโครงการตรงตามทศนิยม 2 ตำแหน่ง
   * ทดสอบปุ่มลัดแปลง `RESERVED` $\to$ `PAID` พร้อมปรับเปลี่ยนยอดเงินจริง ยอดคงเหลือต้องหักลบแม่นยำ
   * ทดสอบการกดยกเลิกรายการ (Soft delete): ยอดเงินคงเหลือต้องคืนกลับทันที
2. **Permission Boundary Tests:**
   * ครูทั่วไปเข้าดูตารางและแนบไฟล์เล่มโครงการของตนเองได้ แต่ถูกบล็อกเมื่อพยายามยิง Server Action บันทึกค่าใช้จ่าย
   * เจ้าหน้าที่แผนงานสามารถเพิ่มโครงการ กิจกรรม และตัดยอดเงินได้สมบูรณ์
3. **Cloudflare R2 Storage Hygiene Tests:**
   * ทดสอบอัปโหลดไฟล์ PDF/Word เข้า R2 ได้รับ `fileKey`
   * ทดสอบการลบเอกสารแนบ ต้องส่ง `DeleteObjectCommand` ลบไฟล์ออกจาก R2 จริง ไม่ค้างเป็นไฟล์ขยะ
4. **Export Excel Verification:**
   * ทดสอบปุ่ม Export Excel ส่งออกข้อมูลโครงการและกิจกรรมพร้อมยอดเงินตามตัวกรองที่เลือก
5. **Codebase Index Synchronization:**
   * รันคำสั่ง `npm run index:sync` หลังการแก้ไขโค้ดทุกครั้งตามกฎ AGENTS.md
