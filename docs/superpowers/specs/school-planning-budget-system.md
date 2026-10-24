# เอกสารการออกแบบระบบ: ระบบแผนงานโครงการและติดตามงบประมาณสถานศึกษา (School Planning & Budget Tracking System) (v1.0 / Rev. 0)

| Version / Rev | วันที่ / เวลา | การเปลี่ยนแปลงสำคัญ (Changelog) | สถานะ (Status) |
|---|---|---|---|
| `v1.0 (Rev. 0)` | 2026-10-24 13:25 | บันทึกเอกสารข้อกำหนดการออกแบบระบบฉบับสมบูรณ์ (Approved for Implementation) | Approved |

* **ไฟล์เอกสาร:** `docs/superpowers/specs/school-planning-budget-system.md`
* **สถานะเอกสาร:** Approved for Implementation
* **สถาปัตยกรรมหลัก:** Next.js 16 (App Router / Server Actions), Prisma ORM, PostgreSQL (Neon), Cloudflare R2 Universal Storage
* **เส้นทางระบบหลัก (Route):** `/planning`

---

## ส่วนที่ 1: โครงสร้างข้อมูลและระบบสิทธิ์การใช้งาน (Data Model & Permissions Architecture)

### 1.1 กฎความปลอดภัยของฐานข้อมูล (Zero Breaking Change & DB Hygiene)

1. **Non-Destructive Migration:** ฐานข้อมูลหลักคือ **PostgreSQL (Neon)** ห้ามรันคำสั่ง `prisma migrate reset` โดยเด็ดขาด การเพิ่มตารางและฟิลด์ใหม่ทั้งหมดต้องกำหนดค่า `@default` หรือเป็น Optional (`?`) เพื่อไม่ให้กระทบข้อมูลเดิมในระบบ
2. **มาตรฐาน `SystemSettings`:** ฟิลด์ `planningOfficerUserIds` เก็บข้อมูลในรูปแบบ **Comma-separated String** (`String @default("")`) เพื่อให้เป็นมาตรฐานเดียวกับฟิลด์สิทธิ์อื่นๆ ในระบบเดิม (เช่น `budgetAdminUserIds`, `finalApproverUserIds`)
3. **ชนิดข้อมูลการเงิน:** ใช้ `Decimal(12, 2)` สำหรับทุกฟิลด์ที่เป็นตัวเลขเงินงบประมาณและค่าใช้จ่าย เพื่อป้องกันความคลาดเคลื่อนของทศนิยมระดับสตางค์
4. **การลบข้อมูล (Soft Delete):** ใช้ฟิลด์ `deletedAt DateTime?` ในตาราง `Project`, `ProjectActivity`, และ `ActivityExpense` เพื่อรักษาประวัติการตรวจสอบบัญชี (Audit Trail)

### 1.2 โครงสร้าง Prisma Schema (`schema.prisma`)

```prisma
// ==========================================
// 1. ENUMS (ตัวเลือกมาตรฐานในระบบแผนงาน)
// ==========================================

enum ProjectStatus {
  DRAFT        // ร่างโครงการ
  APPROVED     // อนุมัติตามแผนปฏิบัติการประจำปี
  IN_PROGRESS  // กำลังดำเนินการ
  COMPLETED    // ดำเนินการเสร็จสิ้น (ส่งรายงานสรุปผล SAR แล้ว)
  CANCELLED    // ยกเลิกโครงการ
}

enum BudgetSource {
  SUBSIDY             // เงินอุดหนุนรายหัว
  FREE_EDUCATION_15Y  // เงินเรียนฟรี 15 ปี (อุปกรณ์, เครื่องแบบ, กิจกรรมพัฒนาผู้เรียน)
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

// ==========================================
// 2. MODELS (ตารางข้อมูล)
// ==========================================

// ส่วนขยายเพิ่มเติมในตาราง SystemSettings เดิม
model SystemSettings {
  id                     String   @id @default("default")
  // ... ฟิลด์เดิมของระบบ ...
  enablePlanning         Boolean  @default(true)
  planningOfficerUserIds String   @default("") // เก็บเป็น Comma-separated User IDs เช่น "uid1,uid2"
  updatedAt              DateTime @updatedAt
}

// ส่วนขยายความสัมพันธ์ย้อนกลับในตาราง User เดิม
model User {
  id                    String              @id @default(cuid())
  // ... ฟิลด์เดิมของระบบ ...
  ledProjects           Project[]           @relation("ProjectLeader")
  responsibleActivities ProjectActivity[]   @relation("ActivityResponsible")
  uploadedAttachments   ProjectAttachment[] @relation("AttachmentUploader")
  requestedExpenses     ActivityExpense[]   @relation("ExpenseRequester")
  recordedExpenses      ActivityExpense[]   @relation("ExpenseRecorder")
}

// ตารางฝ่ายงาน / กลุ่มสาระการเรียนรู้ (หากมีอยู่แล้วให้เชื่อมกับตารางเดิม)
model Department {
  id        String    @id @default(cuid())
  code      String    @unique // เช่น "ACAD", "SCI", "MATH"
  name      String    // เช่น "ฝ่ายวิชาการ", "กลุ่มสาระฯ วิทยาศาสตร์และเทคโนโลยี"
  isActive  Boolean   @default(true)
  projects  Project[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

// 1. ตารางโครงการหลัก
model Project {
  id              String        @id @default(cuid())
  fiscalYear      Int           // ปีงบประมาณ พ.ศ. เช่น 2569
  code            String        // รหัสโครงการ เช่น "PRJ-69-001"
  name            String        // ชื่อโครงการ
  
  departmentId    String
  department      Department    @relation(fields: [departmentId], references: [id])
  
  leaderUserId    String
  leader          User          @relation("ProjectLeader", fields: [leaderUserId], references: [id])

  // ข้อมูลเชิงนโยบายและแหล่งเงิน (รองรับการทำรายงาน SAR)
  budgetSource    BudgetSource  @default(SUBSIDY)
  strategyCode    String?       // รหัสกลยุทธ์โรงเรียน เช่น "กลยุทธ์ที่ 1"
  standardTags    String[]      @default([]) // มาตรฐานการศึกษา เช่น ["ม.1", "ม.3"]

  // วงเงินงบประมาณระดับโครงการ
  allocatedAmount Decimal       @default(0.00) @db.Decimal(12, 2) // งบตั้งต้นตามแผน
  adjustedAmount  Decimal       @default(0.00) @db.Decimal(12, 2) // งบสุทธิหลังโอนเกลี่ย (เริ่มต้นเท่ากับ allocatedAmount)
  
  status          ProjectStatus @default(DRAFT)

  activities      ProjectActivity[]
  attachments     ProjectAttachment[]

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  deletedAt       DateTime?

  @@unique([fiscalYear, code])
  @@index([fiscalYear, departmentId])
  @@index([leaderUserId])
  @@index([deletedAt])
}

// 2. ตารางกิจกรรมย่อยภายใต้โครงการ
model ProjectActivity {
  id                String            @id @default(cuid())
  projectId         String
  project           Project           @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  activityNo        Int               // ลำดับที่กิจกรรมย่อย เช่น 1, 2, 3
  name              String            // ชื่อกิจกรรมย่อย
  
  responsibleUserId String
  responsibleUser   User              @relation("ActivityResponsible", fields: [responsibleUserId], references: [id])

  allocatedAmount   Decimal           @default(0.00) @db.Decimal(12, 2) // งบจัดสรรตั้งต้น
  adjustedAmount    Decimal           @default(0.00) @db.Decimal(12, 2) // งบสุทธิหลังโอนเกลี่ย

  expenses          ActivityExpense[]

  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  deletedAt         DateTime?

  @@index([projectId])
  @@index([responsibleUserId])
  @@index([deletedAt])
}

// 3. ตารางเอกสารแนบโครงการ (Cloudflare R2 & External Links)
model ProjectAttachment {
  id               String         @id @default(cuid())
  projectId        String
  project          Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)

  title            String         // ชื่อเอกสารที่แสดงผล
  attachmentType   AttachmentType @default(PROPOSAL)
  storageType      StorageType    @default(R2_UPLOAD)
  
  fileUrl          String         // URL ดาวน์โหลด หรือลิงก์ Google Drive / OneDrive / Canva
  fileKey          String?        // Object Key ใน Cloudflare R2 (ใช้สำหรับสั่งลบไฟล์ใน Bucket)
  fileSize         Int?           // ขนาดไฟล์ (Bytes)
  mimeType         String?        // เช่น "application/pdf"

  uploadedByUserId String
  uploadedBy       User           @relation("AttachmentUploader", fields: [uploadedByUserId], references: [id])

  createdAt        DateTime       @default(now())

  @@index([projectId, attachmentType])
}

// 4. ตารางประวัติการใช้จ่ายเงิน (ตัดยอดงบประมาณ)
model ActivityExpense {
  id               String          @id @default(cuid())
  activityId       String
  activity         ProjectActivity @relation(fields: [activityId], references: [id], onDelete: Cascade)

  expenseDate      DateTime        // วันที่ใช้จ่าย / วันที่ระบุในใบเสร็จ
  title            String          // รายการค่าใช้จ่าย
  expenseCategory  ExpenseCategory @default(MATERIALS)
  amount           Decimal         @db.Decimal(12, 2)
  receiptNo        String?         // เลขที่เอกสารอ้างอิง / ใบเสร็จ / บันทึกข้อความ
  attachmentUrl    String?         // URL ไฟล์ใบเสร็จ (กรณีแนบหลักฐานการจ่าย)
  attachmentKey    String?         // R2 Key ของไฟล์ใบเสร็จ
  status           ExpenseStatus   @default(PAID)
  remark           String?         // หมายเหตุ หรือเหตุผลการยกเลิกรายการ

  requesterUserId  String          // ครูผู้ขอเบิกเงิน
  requester        User            @relation("ExpenseRequester", fields: [requesterUserId], references: [id])
  
  recordedByUserId String          // เจ้าหน้าที่แผน/การเงิน ผู้ลงบันทึกในระบบ
  recordedBy       User            @relation("ExpenseRecorder", fields: [recordedByUserId], references: [id])

  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
  deletedAt        DateTime?

  @@index([activityId, status])
  @@index([expenseDate])
  @@index([deletedAt])
}
```

### 1.3 ตารางกำหนดสิทธิ์และฟังก์ชันตรวจสอบสิทธิ์ (Access Control Matrix)

| การดำเนินการ (Action) | ผู้ดูแลระบบ (Admin) | เจ้าหน้าที่แผน/การเงิน (`planningOfficerUserIds`) | หัวหน้าโครงการ / ผู้รับผิดชอบกิจกรรม | ครูและบุคลากรทั่วไป |
| --- | --- | --- | --- | --- |
| เปิดดูตารางแผนงบประมาณ, ดาวน์โหลดเล่มโครงการ, ดูประวัติการใช้เงิน | ✅ | ✅ | ✅ | ✅ |
| สร้าง/แก้ไขโครงการ, เพิ่มกิจกรรมย่อย, โอนเกลี่ยงบ (`adjustedAmount`) | ✅ | ✅ | ❌ | ❌ |
| แนบไฟล์/ลิงก์เอกสารโครงการ (`ProjectAttachment`) | ✅ | ✅ | ✅ *(เฉพาะโครงการตนเองที่ยังไม่ปิด/ยกเลิก)* | ❌ |
| บันทึกตัดยอดเงิน (`PAID`), กันวงเงิน (`RESERVED`), ยกเลิกบิล (`Soft Delete`) | ✅ | ✅ | ❌ | ❌ |

**ฟังก์ชัน Helper สำหรับแปลงรายชื่อเจ้าหน้าที่แผนและเช็กสิทธิ์:**

```typescript
export function parseCommaSeparatedIds(rawIds?: string | null): string[] {
  if (!rawIds) return [];
  return rawIds
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function getPlanningPermissions(
  user: { id: string; role: string },
  settings: { enablePlanning: boolean; planningOfficerUserIds: string },
  project?: { leaderUserId: string; status: string },
  activity?: { responsibleUserId: string }
) {
  const isAdmin = user.role === "ADMIN";
  const officerIds = parseCommaSeparatedIds(settings.planningOfficerUserIds);
  const isPlanningOfficer = isAdmin || officerIds.includes(user.id);
  const isProjectOwner =
    project?.leaderUserId === user.id || activity?.responsibleUserId === user.id;
  const isEditableProjectStatus =
    project?.status !== "COMPLETED" && project?.status !== "CANCELLED";

  return {
    canViewModule: settings.enablePlanning || isAdmin,
    canManageProjectsAndBudget: isPlanningOfficer,
    canRecordAndSettleExpenses: isPlanningOfficer,
    canManageAttachments: isPlanningOfficer || (isProjectOwner && isEditableProjectStatus),
  };
}
```

---

## ส่วนที่ 2: การออกแบบหน้าจอและตารางแสดงผล (UI/UX & Components Architecture)

### 2.1 โครงสร้างหน้าจอหลัก (`/planning`)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🏛️ ระบบแผนงานโครงการและติดตามงบประมาณ                       ปีงบประมาณ [ 2569 ▼ ]         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 📊 สรุปภาพรวม: [ งบประมาณสุทธิ ฿1,500,000 ] [ เบิกจ่ายจริง (Paid) ฿450,000 ]             │
│               [ กันวงเงินจอง (Reserved) ฿120,000 ] [ คงเหลือสุทธิ ฿930,000 ]              │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 🔍 [ค้นหาโครงการ/กิจกรรม/ชื่อครู...] [ทุกฝ่าย/กลุ่มสาระฯ ▼] [ทุกแหล่งเงิน ▼]                   │
│    [🔘 เฉพาะที่ฉันรับผิดชอบ]          [📥 ส่งออก Excel] [ + สร้างโครงการใหม่ ] (เฉพาะแผน)  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ตารางแผนงานและกิจกรรมย่อย (Hierarchical Ledger Table)                                  │
│ ┌─ โครงการ (Level 1) ────────────────────────────────────────────────────────────────┐ │
│ │ ▼ PRJ-69-001 | โครงการพัฒนาทักษะวิชาการ | ฝ่ายวิชาการ | เงินอุดหนุนรายหัว              │ │
│ │   หัวหน้า: ครูสมศักดิ์ | สถานะ SAR: [✅ เล่มโครงการ] [✅ ขออนุมัติ] [⚪ สรุปผล SAR] [+ แนบ] │ │
│ │   งบสุทธิ: ฿100,000 | กันเงิน: ฿10,000 | จ่ายแล้ว: ฿40,000 | คงเหลือ: ฿50,000        │ │
│ │   แถบความก้าวหน้า: [██████▓▓░░░░░░░░] 40% จ่ายจริง + 10% กันเงิน   [ + เพิ่มกิจกรรมย่อย ] │ │
│ │                                                                                    │ │
│ │   └─ กิจกรรมย่อย (Level 2)                                                          │ │
│ │      1.1 ค่ายคณิตศาสตร์เข้มข้น | ผู้รับผิดชอบ: ครูวิชัย | หมวดที่ใช้: [ค่าใช้สอย] [ค่าวัสดุ]    │ │
│ │          งบสุทธิ: ฿40,000 | กันเงิน: ฿10,000 | จ่ายแล้ว: ฿20,000 | คงเหลือ: ฿10,000   │ │
│ │          ปุ่ม: [ ฿ บันทึกการใช้เงิน ] (เฉพาะแผน)  [ 📋 ประวัติเงิน (5 รายการ / 1 รอเคลียร์) ]│ │
│ │                                                                                    │ │
│ │      1.2 แข่งขันทักษะทางวิชาการ | ผู้รับผิดชอบ: ครูสุภา | หมวดที่ใช้: [ค่าวัสดุ]            │ │
│ │          งบสุทธิ: ฿60,000 | กันเงิน: ฿0      | จ่ายแล้ว: ฿20,000 | คงเหลือ: ฿40,000   │ │
│ │          ปุ่ม: [ ฿ บันทึกการใช้เงิน ] (เฉพาะแผน)  [ 📋 ประวัติเงิน (2 รายการ) ]          │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 รายละเอียด Components และ Visual Indicators

1. **Financial Metric Cards (4 กล่องสถิติด้านบน):**
   * แสดง **งบประมาณสุทธิรวม, เบิกจ่ายจริง (`PAID`), กันวงเงินรอเบิก (`RESERVED`), และคงเหลือสุทธิ (`Remaining`)** คำนวณใหม่ทันทีตามตัวกรองที่ผู้ใช้เลือก

2. **Filter Toolbar & Quick Actions:**
   * ช่องค้นหาข้อความ (ค้นหาจากรหัสโครงการ, ชื่อโครงการ, ชื่อกิจกรรม, หรือชื่อครู)
   * ตัวกรองปีงบประมาณ, ฝ่าย/กลุ่มสาระฯ, แหล่งงบประมาณ
   * สวิตช์ **`[🔘 เฉพาะที่ฉันรับผิดชอบ]`**: กรองเฉพาะโครงการที่ผู้ใช้เป็น `leaderUserId` หรือมีกิจกรรมย่อยที่ผู้ใช้เป็น `responsibleUserId`
   * ปุ่ม **`[📥 ส่งออก Excel]`**: ส่งออกข้อมูลตารางตามตัวกรองปัจจุบันเป็นไฟล์ `.xlsx` สำหรับแนบรายงาน SAR หรือเสนอผู้บริหาร

3. **Visual Indicators ในตาราง Hierarchical:**
   * **Stacked Progress Bar (แถบสถานะงบประมาณ 2 ชั้น):** แสดงสัดส่วน `PAID` (สีน้ำเงินทึบ) ต่อด้วย `RESERVED` (สีส้ม/เหลือง) บนพื้นสีเทาอ่อน
   * **ป้ายกำกับงบโอนเกลี่ย:** หาก `adjustedAmount !== allocatedAmount` ให้แสดงตัวเลข `adjustedAmount` เป็นหลัก และแสดง `(งบตั้งต้น ฿...)` ขนาดเล็กพร้อม Tooltip
   * **ป้ายเตือนงบยังไม่จัดสรรลงกิจกรรม (`Unallocated Budget Badge`):** หากผลรวมงบของกิจกรรมย่อยไม่เท่ากับงบโครงการ ให้แสดง Badge เตือน เช่น `[⚠️ รอจัดสรรลงกิจกรรม ฿10,000]` หรือ `[🚨 จัดสรรเกินงบโครงการ ฿5,000]`
   * **ป้ายตรวจสอบเอกสารประกันคุณภาพ (SAR Readiness Badges):** แสดงสถานะเอกสาร 3 หมวดหลัก (`PROPOSAL`, `APPROVAL`, `SUMMARY`) ว่าแนบครบหรือยัง

4. **Responsive Layout:**
   * **Desktop (ความกว้างตั้งแต่ 1024px ขึ้นไป):** แสดงเป็น Hierarchical Ledger Table เต็มรูปแบบ
   * **Mobile / Tablet (ความกว้างน้อยกว่า 768px):** แปลงแถวตารางเป็น **Collapsible Card Layout** แสดงยอดคงเหลือสุทธิเด่นด้านบน และจัดเรียงตัวเลข งบสุทธิ/กันเงิน/จ่ายแล้ว เป็น Grid 2x2 ด้านใน

### 2.3 หน้าต่างจัดการข้อมูล (Modals & Drawers)

1. **Expense Recording & Settlement Modal (สำหรับเจ้าหน้าที่แผน/การเงิน):**
   * รองรับ 2 โหมด: **สร้างรายการใหม่ (`Create`)** และ **ยืนยันเบิกจ่ายจริงจากรายการกันเงิน (`Settle Reserved → Paid`)**
   * ฟิลด์ข้อมูล: สถานะ (`PAID` / `RESERVED`), หมวดค่าใช้จ่าย (`ExpenseCategory`), วันที่ใช้จ่าย, รายการ, จำนวนเงิน, ครูผู้ขอเบิก (`requesterUserId`), เลขที่ใบเสร็จ/เอกสารอ้างอิง, และอัปโหลดไฟล์ใบเสร็จ (Optional)

2. **Expense History Drawer (เปิดดูได้ทุกคน / จัดการได้เฉพาะเจ้าหน้าที่แผน):**
   * แสดงรายการธุรกรรมทั้งหมดของกิจกรรมย่อย พร้อมแสดงชื่อครูผู้ขอเบิกและชื่อเจ้าหน้าที่ผู้คีย์ตัดยอด
   * หากรายการมีสถานะ `RESERVED` เจ้าหน้าที่แผนจะเห็นปุ่มลัด **`[✅ ยืนยันเบิกจ่ายจริง]`** เพื่อเปิด Modal แก้ไขยอดเงินตามใบเสร็จจริงและเปลี่ยนสถานะเป็น `PAID` ได้ในคลิกเดียว
   * มีปุ่ม **`[🗑️ ยกเลิกรายการ]`** (Soft Delete) พร้อมบังคับกรอกเหตุผลการยกเลิก

3. **Attachment Manager Modal (สำหรับเจ้าหน้าที่แผน + หัวหน้าโครงการ + ผู้รับผิดชอบกิจกรรม):**
   * เลือกประเภทเอกสาร (`PROPOSAL`, `APPROVAL`, `SUMMARY`, `OTHER`)
   * เลือกวิธีแนบ: **อัปโหลดไฟล์ขึ้น Cloudflare R2** (PDF, Word, Excel) หรือ **วางลิงก์ภายนอก** (Google Drive, OneDrive, Canva)

---

## ส่วนที่ 3: สถาปัตยกรรมการประมวลผลและการคำนวณ (Data Flow, Calculation Engine & Invariants)

### 3.1 เอนจินการคำนวณงบประมาณระดับสตางค์ (Satang-Safe Financial Calculation Engine)

เพื่อป้องกันปัญหาทศนิยมคลาดเคลื่อนของ Floating-point ใน JavaScript การบวกลบทั้งหมดต้องคำนวณในหน่วย **สตางค์ (Integer Satang: $1 \text{ บาท} = 100 \text{ สตางค์}$)** หรือใช้เมธอดของ `Prisma.Decimal` ก่อนแปลงเป็น `number` ส่งให้ UI

#### สูตรคำนวณระดับกิจกรรมย่อย (Activity Level)

* **งบประมาณสุทธิของกิจกรรม ($\text{Activity Effective Budget}$):**
$$\text{Effective Budget}_{act} = \text{adjustedAmount}_{act}$$
*(หมายเหตุ: ตอนสร้างกิจกรรม ให้กำหนดค่าเริ่มต้น `adjustedAmount = allocatedAmount` เสมอ)*

* **ยอดกันวงเงิน ($\text{Reserved Amount}$):**
$$\text{Reserved}_{act} = \sum \text{amount} \quad [\text{status} = \text{RESERVED} \land \text{deletedAt IS NULL}]$$

* **ยอดเบิกจ่ายจริง ($\text{Paid Amount}$):**
$$\text{Paid}_{act} = \sum \text{amount} \quad [\text{status} = \text{PAID} \land \text{deletedAt IS NULL}]$$

* **ยอดใช้จ่ายรวม ($\text{Total Spent}$):**
$$\text{Total Spent}_{act} = \text{Reserved}_{act} + \text{Paid}_{act}$$

* **ยอดคงเหลือสุทธิของกิจกรรม ($\text{Remaining Balance}$):**
$$\text{Remaining}_{act} = \text{Effective Budget}_{act} - \text{Total Spent}_{act}$$

#### สูตรคำนวณระดับโครงการ (Project Level)

เฉพาะกิจกรรมย่อยที่ไม่ถูกลบ ($\text{activity.deletedAt IS NULL}$) เท่านั้นที่จะถูกนำมาคำนวณ:

* **งบประมาณสุทธิของโครงการ ($\text{Project Effective Budget}$):**
$$\text{Effective Budget}_{prj} = \text{adjustedAmount}_{prj}$$

* **งบที่จัดสรรลงกิจกรรมแล้ว ($\text{Allocated to Activities}$):**
$$\text{Allocated to Activities}_{prj} = \sum \text{Effective Budget}_{act}$$

* **งบที่รอจัดสรรลงกิจกรรม ($\text{Unallocated Budget}$):**
$$\text{Unallocated Budget}_{prj} = \text{Effective Budget}_{prj} - \text{Allocated to Activities}_{prj}$$

* **ยอดกันเงิน ยอดจ่ายจริง และยอดคงเหลือระดับโครงการ:**
$$\text{Reserved}_{prj} = \sum \text{Reserved}_{act}, \quad \text{Paid}_{prj} = \sum \text{Paid}_{act}$$
$$\text{Remaining}_{prj} = \text{Effective Budget}_{prj} - (\text{Reserved}_{prj} + \text{Paid}_{prj})$$

### 3.2 กฎความถูกต้องทางการเงินและการป้องกัน Race Condition (Financial Invariants)

ทุก Server Action ที่เปลี่ยนแปลงตัวเลขการใช้เงินต้องรันภายใต้ `prisma.$transaction` และตรวจสอบเงื่อนไขต่อไปนี้:

1. **การเพิ่มรายการใช้จ่ายใหม่ (Create Expense Invariant):**
   * ยอดเงินที่บันทึกต้องมากกว่า 0 ($\text{New Amount} \gt 0$)
   * ยอดเงินใหม่ต้องไม่เกินงบคงเหลือปัจจุบันของกิจกรรม:
$$\text{New Amount} \le \text{Remaining}_{act}$$

2. **การแก้ไขยอดเงิน หรือเปลี่ยนสถานะจาก `RESERVED` เป็น `PAID` (Settlement Delta Invariant):**
   * เมื่อนำรายการเดิมที่สถานะเป็น `RESERVED` (หรือ `PAID`) มาแก้ไขยอดเงินเป็น $\text{New Amount}$ ต้องบวกยอดเงินเดิม ($\text{Old Active Amount}$) กลับเข้าไปในวงเงินที่ใช้ได้ก่อนตรวจสอบ เพื่อไม่ให้ระบบฟ้องว่างบไม่พอทั้งที่เป็นรายการเดียวกัน:
$$\text{Available Balance for Update} = \text{Remaining}_{act} + \text{Old Active Amount}$$
$$\text{New Amount} \le \text{Available Balance for Update}$$

### 3.3 โค้ดอ้างอิงสำหรับ Calculation Engine & Next.js 16 DTO Serializer

```typescript
import { Prisma } from "@prisma/client";

// แปลงค่าเงินเป็นหน่วยสตางค์ (Integer) เพื่อคำนวณอย่างแม่นยำ 100%
export function toSatang(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Math.round(Number(value) * 100);
}

// แปลงหน่วยสตางค์กลับเป็นหน่วยบาท (ทศนิยม 2 ตำแหน่ง) สำหรับส่งให้ Client DTO
export function fromSatang(satang: number): number {
  return Number((satang / 100).toFixed(2));
}

export interface ActivityFinancialSummaryDTO {
  allocatedAmount: number;
  effectiveBudget: number;
  isAdjusted: boolean;
  reservedAmount: number;
  paidAmount: number;
  totalSpent: number;
  remainingBalance: number;
  usagePercentage: number;
  usedCategories: string[];
}

export function calculateActivityFinancials(activity: {
  allocatedAmount: Prisma.Decimal | number;
  adjustedAmount: Prisma.Decimal | number;
  expenses: Array<{
    amount: Prisma.Decimal | number;
    status: string;
    expenseCategory: string;
    deletedAt: Date | null;
  }>;
}): ActivityFinancialSummaryDTO {
  const allocatedSatang = toSatang(activity.allocatedAmount);
  const effectiveSatang = toSatang(activity.adjustedAmount);

  let reservedSatang = 0;
  let paidSatang = 0;
  const categoriesSet = new Set<string>();

  for (const exp of activity.expenses) {
    if (exp.deletedAt !== null || exp.status === "CANCELLED") continue;
    const amountSatang = toSatang(exp.amount);
    if (exp.status === "RESERVED") {
      reservedSatang += amountSatang;
      categoriesSet.add(exp.expenseCategory);
    } else if (exp.status === "PAID") {
      paidSatang += amountSatang;
      categoriesSet.add(exp.expenseCategory);
    }
  }

  const totalSpentSatang = reservedSatang + paidSatang;
  const remainingSatang = effectiveSatang - totalSpentSatang;
  const usagePercentage =
    effectiveSatang === 0
      ? 0
      : Math.min(100, Number(((totalSpentSatang / effectiveSatang) * 100).toFixed(1)));

  return {
    allocatedAmount: fromSatang(allocatedSatang),
    effectiveBudget: fromSatang(effectiveSatang),
    isAdjusted: allocatedSatang !== effectiveSatang,
    reservedAmount: fromSatang(reservedSatang),
    paidAmount: fromSatang(paidSatang),
    totalSpent: fromSatang(totalSpentSatang),
    remainingBalance: fromSatang(remainingSatang),
    usagePercentage,
    usedCategories: Array.from(categoriesSet),
  };
}
```

### 3.4 การจัดการไฟล์ Cloudflare R2 อย่างปลอดภัย (Storage Hygiene)

1. **การอัปโหลดไฟล์ (`R2_UPLOAD`):**
   * กำหนดรูปแบบ Object Key ให้เป็นระเบียบ: `planning/{fiscalYear}/{projectCode}/{uuid}-{sanitizedFileName}`
   * บันทึกทั้ง `fileUrl` และ `fileKey` ลงในตาราง `ProjectAttachment`

2. **การลบไฟล์ (Graceful R2 Deletion):**
   * เมื่อผู้ใช้สั่งลบเอกสารแนบที่มี `storageType === "R2_UPLOAD"` และมี `fileKey` ให้เรียกคำสั่งลบไฟล์ออกจาก Cloudflare R2 Bucket ก่อน
   * **Graceful Fallback:** ห่อคำสั่งลบไฟล์บน R2 ด้วย `try / catch` เสมอ หาก R2 คืนค่า Error (เช่น ไฟล์ถูกลบไปแล้ว `NoSuchKey` หรือเน็ตเวิร์กขัดข้องชั่วคราว) ให้บันทึก `console.warn` แล้วดำเนินการลบแถวในฐานข้อมูลต่อไป เพื่อให้ผู้ใช้สามารถจัดการรายการเอกสารบนหน้าเว็บต่อได้โดยไม่ค้าง

---

## ส่วนที่ 4: แผนการทดสอบและการตรวจสอบ (Verification & Test Plan)

### 4.1 ตารางกรณีทดสอบ (Test Cases Matrix)

| รหัสทดสอบ | หมวดการทดสอบ | รายละเอียดการทดสอบ (Test Scenario) | ผลลัพธ์ที่คาดหวัง (Expected Outcome) |
| --- | --- | --- | --- |
| **TC-01** | Financial Engine | คำนวณยอด `RESERVED`, `PAID`, และ `Remaining` ด้วยทศนิยมระดับสตางค์ (เช่น `100.25 + 200.50`) | คำนวณผ่านหน่วยสตางค์ได้แม่นยำ `300.75` บาท ไม่มีทศนิยมเกินเช่น `.75000000001` |
| **TC-02** | Financial Engine | เปลี่ยนสถานะรายการจาก `RESERVED` (฿10,000) เป็น `PAID` (฿9,500) ในขณะที่งบคงเหลือของกิจกรรมเป็น ฿0 | ระบบอนุญาตให้บันทึกผ่าน (ใช้สมการ Settlement Delta) ยอด `Reserved` ลดลง ฿10,000, ยอด `Paid` เพิ่มขึ้น ฿9,500 และงบคงเหลือกลับมาเป็น ฿500 |
| **TC-03** | Financial Engine | บันทึกค่าใช้จ่ายใหม่เกินวงเงินคงเหลือของกิจกรรม | Server Action ปฏิเสธรายการใน `$transaction` และส่งข้อความแจ้งเตือนจำนวนเงินที่เกินกลับมาแสดงบน Modal |
| **TC-04** | Soft Delete Cascade | กดยกเลิกรายการใช้จ่าย (`ActivityExpense.deletedAt !== null`) หรือลบกิจกรรมย่อย (`ProjectActivity.deletedAt !== null`) | ยอดเงินของรายการหรือกิจกรรมย่อยที่ถูก Soft Delete ไม่ถูกนำมารวมในยอดใช้จ่ายระดับกิจกรรมและระดับโครงการ |
| **TC-05** | Project Unallocated | สร้างโครงการตั้งงบไว้ ฿100,000 แต่เพิ่งสร้างกิจกรรมย่อยไป ฿60,000 | งบโครงการยังคงแสดง ฿100,000 และแสดงป้ายเตือน `รอจัดสรรลงกิจกรรม ฿40,000` |
| **TC-06** | Permissions & Auth | ทดสอบเมื่อ `SystemSettings.planningOfficerUserIds` เป็นค่าว่าง `""` หรือมีช่องว่างปน เช่น `" uid1 , uid2 "` | `parseCommaSeparatedIds` คืนค่า `[]` หรือ `["uid1", "uid2"]` ได้ถูกต้อง ไม่เกิด Array `[""]` |
| **TC-07** | Permissions & Auth | ครูทั่วไปที่ไม่ได้เป็นหัวหน้าโครงการ ยิง Server Action แนบไฟล์หรือตัดเงินโดยตรง | Server Action ปฏิเสธด้วย `Unauthorized / Forbidden Error` ทันที |
| **TC-08** | Delegated Upload | ครูหัวหน้าโครงการกดแนบไฟล์เล่มโครงการ (`PROPOSAL`) และลิงก์ Canva ในโครงการตนเอง | อัปโหลดขึ้น Cloudflare R2 และบันทึกลิงก์สำเร็จ แต่เมื่อสถานะโครงการเปลี่ยนเป็น `COMPLETED` จะไม่สามารถลบหรือแก้ไขไฟล์ได้อีก |
| **TC-09** | R2 Storage Hygiene | กดลบเอกสารแนบแบบ `R2_UPLOAD` | ระบบเรียก API ลบ `fileKey` ใน Cloudflare R2 Bucket จริง และลบแถวใน `ProjectAttachment` สำเร็จ |
| **TC-10** | Next.js 16 Boundary | ตรวจสอบ Props ที่ส่งจาก Server Component `/planning/page.tsx` ไปยัง Client Table | ข้อมูลทั้งหมดเป็น Plain Object (`number`, `string`, `boolean`) ไม่มี `Prisma.Decimal` หรือ `Date` หลุดข้าม Boundary |

### 4.2 ขั้นตอนตรวจสอบความพร้อมก่อนส่งมอบ (Pre-Completion Checklist)

1. **Database Migration Check:** ตรวจสอบไฟล์ SQL Migration ว่าไม่มีคำสั่ง `DROP TABLE` หรือ `DROP COLUMN` ที่ทำลายข้อมูลเดิม
2. **TypeScript Type Check:** รันคำสั่ง `npx tsc --noEmit` ต้องผ่าน 100% โดยไม่มี Type Error
3. **Unit & Integration Tests:** รันชุดทดสอบสำหรับ `calculateActivityFinancials`, `calculateProjectFinancials`, และ `getPlanningPermissions`
4. **Codebase Index Sync:** รันคำสั่ง `npm run index:sync` เพื่ออัปเดตสารบัญโค้ดในไฟล์ `CODEBASE_INDEX.md` ให้เป็นปัจจุบันเสมอ
