# แผนการพัฒนาระบบ: ระบบแผนงานโครงการและติดตามงบประมาณสถานศึกษา (Implementation Plan) (v1.0 / Rev. 0)

| Version / Rev | วันที่ / เวลา | การเปลี่ยนแปลงสำคัญ (Changelog) | สถานะ (Status) |
|---|---|---|---|
| `v1.0 (Rev. 0)` | 2026-10-24 13:37 | แผนการพัฒนาระบบฉบับสมบูรณ์ 5 Phases / 12 Tasks (Approved for Implementation) | Approved |

* **ไฟล์อ้างอิง Spec:** `docs/superpowers/specs/school-planning-budget-system.md`
* **ไฟล์แผนงาน:** `docs/superpowers/plans/school-planning-budget-plan.md`
* **กฎเหล็กประจำโปรเจกต์:**
1. ห้ามรัน `prisma migrate reset` บนฐานข้อมูล PostgreSQL (Neon) โดยเด็ดขาด
2. ห้ามส่ง `Prisma.Decimal` หรือ `Date` ข้าม Server-Client Boundary ของ Next.js 16 โดยไม่ผ่าน DTO Serializer
3. ทุกการบันทึก/แก้ไข/ยกเลิกค่าใช้จ่าย ต้องอยู่ใน `prisma.$transaction`
4. เมื่อเสร็จสิ้นการพัฒนา ต้องรัน `npx tsc --noEmit` และ `npm run index:sync` เสมอ

---

## ภาพรวมลำดับงาน (Execution Roadmap)

| เฟส (Phase) | ลำดับงาน (Tasks) | เป้าหมายหลัก (Deliverables) |
| --- | --- | --- |
| **Phase 1: Database Layer** | Task 1 | อัปเดต `schema.prisma` และทำ Non-destructive Migration |
| **Phase 2: Core Domain & Tests** | Task 2 – Task 4 | สร้างระบบเช็กสิทธิ์, เอนจินคำนวณระดับสตางค์, DTO Serializer และ Unit Tests |
| **Phase 3: Backend & R2 Storage** | Task 5 – Task 8 | สร้าง Server Actions สำหรับตั้งค่า, โครงการ/กิจกรรม, ไฟล์ R2 และตัดงบประมาณ |
| **Phase 4: Frontend UI & Modals** | Task 9 – Task 11 | สร้างหน้าตั้งค่าแอดมิน, หน้า `/planning`, ตาราง Hierarchical และ Modals/Drawers |
| **Phase 5: Export & Verification** | Task 12 | สร้างระบบส่งออกไฟล์ Excel, ตรวจสอบ Type Safety และซิงก์ `CODEBASE_INDEX.md` |

---

## Phase 1: ชั้นฐานข้อมูลและโครงสร้างข้อมูล (Database Layer)

### Task 1: อัปเดต Prisma Schema และรัน Non-Destructive Migration

* **ไฟล์ที่ต้องแก้ไข:**
  * `prisma/schema.prisma`
* **ขั้นตอนการดำเนินงาน:**
  1. เพิ่ม Enums ทั้ง 6 ตัว (`ProjectStatus`, `BudgetSource`, `ExpenseCategory`, `ExpenseStatus`, `AttachmentType`, `StorageType`)
  2. ในโมเดล `SystemSettings` เพิ่มฟิลด์ `enablePlanning Boolean @default(true)` และ `planningOfficerUserIds String @default("")`
  3. ในโมเดล `User` และ `Department` เพิ่ม Reverse Relations เชื่อมมายังตารางแผนงาน
  4. เพิ่มโมเดล `Project`, `ProjectActivity`, `ProjectAttachment`, และ `ActivityExpense` พร้อมกำหนด `@db.Decimal(12, 2)`, `@default(...)`, และ `@@index(...)` ให้ครบถ้วนตาม Spec
  5. สร้างไฟล์ Migration แบบไม่ทำลายข้อมูลเดิมและอัปเดต Prisma Client:
     ```bash
     npx prisma db push
     npx prisma generate
     ```
* **เกณฑ์การตรวจสอบ (Verification):**
  * ตรวจสอบว่าไม่มีคำสั่งหรือพฤติกรรมที่กระทบข้อมูลเดิม

---

## Phase 2: ตรรกะหลัก เอนจินคำนวณการเงิน และชุดทดสอบ (Core Domain & Unit Tests)

### Task 2: สร้างโมดูลจัดการสิทธิ์การใช้งาน (Permissions Helper)

* **ไฟล์ที่ต้องสร้าง:**
  * `src/lib/planning/permissions.ts`
* **ขั้นตอนการดำเนินงาน:**
  1. สร้างฟังก์ชัน `parseCommaSeparatedIds(rawIds?: string | null): string[]` โดยใช้ `.split(",").map(s => s.trim()).filter(Boolean)` เพื่อป้องกันปัญหา String ว่างกลายเป็น `[""]`
  2. สร้างฟังก์ชัน `formatCommaSeparatedIds(ids: string[]): string` สำหรับแปลง Array กลับเป็น String ก่อนบันทึกลง `SystemSettings`
  3. สร้างฟังก์ชัน `getPlanningPermissions(user, settings, project?, activity?)` คืนค่าสิทธิ์ย่อย 4 ตัว:
     * `canViewModule`: เปิดให้ทุกคนเมื่อ `enablePlanning === true` (หรือเป็น Admin)
     * `canManageProjectsAndBudget`: เฉพาะ Admin และผู้ที่มี ID อยู่ใน `planningOfficerUserIds`
     * `canRecordAndSettleExpenses`: เฉพาะ Admin และผู้ที่มี ID อยู่ใน `planningOfficerUserIds`
     * `canManageAttachments`: เจ้าหน้าที่แผน หรือ หัวหน้าโครงการ/ผู้รับผิดชอบกิจกรรม (เฉพาะเมื่อสถานะโครงการไม่ใช่ `COMPLETED` และไม่ใช่ `CANCELLED`)

### Task 3: สร้าง Satang-Safe Calculation Engine และ DTO Serializer

* **ไฟล์ที่ต้องสร้าง:**
  * `src/lib/planning/types.ts`
  * `src/lib/planning/calculator.ts`
  * `src/lib/planning/serializers.ts`
* **ขั้นตอนการดำเนินงาน:**
  1. ใน `types.ts`: ประกาศ Interfaces สำหรับ Client DTOs ทั้งหมด (`ProjectDTO`, `ProjectActivityDTO`, `ProjectAttachmentDTO`, `ActivityExpenseDTO`, `PortfolioSummaryDTO`) โดยกำหนดให้ฟิลด์เงินทั้งหมดเป็น `number` และวันที่เป็น `string` (ISO 8601)
  2. ใน `calculator.ts`:
     * สร้าง `toSatang(val)` และ `fromSatang(satang)`
     * สร้าง `calculateActivityFinancials(activity)` คำนวณ `effectiveBudget`, `reservedAmount`, `paidAmount`, `totalSpent`, `remainingBalance`, `usagePercentage`, และ `usedCategories` (ข้ามรายการที่ `deletedAt !== null` หรือ `status === "CANCELLED"`)
     * สร้าง `calculateProjectFinancials(project)` คำนวณยอดรวมจากกิจกรรมย่อยที่ไม่ถูกลบ พร้อมคำนวณ `allocatedToActivities`, `unallocatedBudget` ($\text{Effective Budget}_{prj} - \text{Allocated to Activities}_{prj}$), และสถานะความครบถ้วนของเอกสาร SAR (`hasProposal`, `hasApproval`, `hasSummary`)
     * สร้าง `validateExpenseInvariant({ currentRemainingSatang, newAmountSatang, oldActiveAmountSatang })` เพื่อตรวจสอบวงเงินทั้งกรณีสร้างบิลใหม่และกรณีเคลียร์บิลเดิม (`RESERVED` เปลี่ยนเป็น `PAID`)
  3. ใน `serializers.ts`: สร้างฟังก์ชัน `serializeProjectToDTO(rawProject, currentUser, settings)` เพื่อแปลงข้อมูลดิบจาก Prisma พร้อมแนบผลลัพธ์การคำนวณและสิทธิ์ (`permissions`) ของผู้ใช้คนนั้นๆ ให้พร้อมส่งเข้า Client Component

### Task 4: เขียน Unit Tests ทดสอบ Calculation Engine และ Permissions

* **ไฟล์ที่ต้องสร้าง:**
  * `eLeave/tests/unit/planningCore.test.js`
* **ขั้นตอนการดำเนินงาน:**
  1. เขียนชุดทดสอบครอบคลุมกรณีทดสอบ **TC-01 ถึง TC-08** ตามที่ระบุใน Spec:
     * การบวกทศนิยมระดับสตางค์ (`100.25 + 200.50 = 300.75`)
     * การเปลี่ยนสถานะ `RESERVED` (฿10,000) เป็น `PAID` (฿9,500) เมื่อยอดคงเหลือเป็น ฿0 (Settlement Delta Invariant)
     * การปฏิเสธเมื่อเบิกเกินวงเงินคงเหลือ
     * การไม่นำรายการที่ถูก Soft Delete (`deletedAt !== null`) มารวมคำนวณ
     * การคำนวณ `unallocatedBudget` เมื่อตั้งงบโครงการ ฿100,000 แต่เพิ่งจัดสรรลงกิจกรรม ฿60,000
     * การแปลง `planningOfficerUserIds` กรณีค่าว่าง `""` และมีช่องว่างปน
* **เกณฑ์การตรวจสอบ (Verification):**
  * รันชุดทดสอบ Unit Test ต้องผ่านครบทุกข้อก่อนเริ่มเขียน Server Actions

---

## Phase 3: ระบบหลังบ้านและการจัดการไฟล์ (Server Actions & Cloudflare R2)

### Task 5: สร้าง Server Actions สำหรับตั้งค่าระบบแผนงาน

* **ไฟล์ที่ต้องสร้าง:**
  * `src/app/actions/planning-settings.ts`
* **ขั้นตอนการดำเนินงาน:**
  1. สร้าง `updatePlanningSettingsAction({ enablePlanning, planningOfficerUserIds })`
  2. ตรวจสอบสิทธิ์ว่าผู้เรียกต้องเป็น `ADMIN` เท่านั้น
  3. แปลง Array ของ User IDs เป็น Comma-separated String แล้วบันทึกลง `SystemSettings`
  4. เรียก `revalidatePath("/planning")` และ `revalidatePath("/settings")`

### Task 6: สร้าง Server Actions สำหรับจัดการโครงการและกิจกรรมย่อย

* **ไฟล์ที่ต้องสร้าง:**
  * `src/app/actions/planning-project.ts`
* **ขั้นตอนการดำเนินงาน:**
  1. ตรวจสอบสิทธิ์ด้วย `canManageProjectsAndBudget` ทุกฟังก์ชัน
  2. สร้าง `createProjectAction` และ `updateProjectAction`:
     * เมื่อสร้างโครงการใหม่ หากไม่ได้ระบุ `adjustedAmount` ให้ตั้งค่าเริ่มต้น `adjustedAmount = allocatedAmount` เสมอ
     * ตรวจสอบรหัสโครงการซ้ำในปีงบประมาณเดียวกัน
  3. สร้าง `softDeleteProjectAction(projectId)`: ตั้งค่า `deletedAt = new Date()`
  4. สร้าง `createActivityAction`, `updateActivityAction`, และ `softDeleteActivityAction(activityId)`:
     * ตอนสร้างกิจกรรมใหม่ ให้ตั้งค่า `adjustedAmount = allocatedAmount`

### Task 7: สร้าง Server Actions สำหรับแนบเอกสารโครงการและเชื่อมต่อ Cloudflare R2

* **ไฟล์ที่ต้องสร้าง:**
  * `src/app/actions/planning-attachment.ts`
* **ขั้นตอนการดำเนินงาน:**
  1. ดึงข้อมูลโครงการและตรวจสอบสิทธิ์ด้วย `canManageAttachments` (อนุญาตทั้งเจ้าหน้าที่แผน และครูหัวหน้าโครงการ/ผู้รับผิดชอบกิจกรรมในโครงการที่ยังไม่ปิด)
  2. สร้าง `addProjectAttachmentAction(formData)`:
     * กรณี `storageType === "R2_UPLOAD"`: ตรวจสอบชนิดไฟล์ (PDF, Word, Excel, รูปภาพ) และขนาดไฟล์ อัปโหลดขึ้น Cloudflare R2 ผ่าน Storage Service ของระบบโดยใช้ Key รูปแบบ `planning/{fiscalYear}/{projectCode}/{uuid}-{sanitizedFileName}` แล้วบันทึกทั้ง `fileUrl` และ `fileKey`
     * กรณี `storageType === "EXTERNAL_LINK"`: ตรวจสอบความถูกต้องของ URL (`https://...`) แล้วบันทึกลงตาราง `ProjectAttachment`
  3. สร้าง `deleteProjectAttachmentAction(attachmentId)`:
     * หากเป็น `R2_UPLOAD` และมี `fileKey` ให้เรียกคำสั่งลบไฟล์บน Cloudflare R2 ภายในบล็อก `try / catch` (หากลบบน R2 ไม่สำเร็จให้ `console.warn` แล้วดำเนินการลบแถวในฐานข้อมูลต่อทันทีเพื่อไม่ให้ระบบค้าง)

### Task 8: สร้าง Server Actions สำหรับบันทึกการใช้เงิน เคลียร์บิลกันเงิน และยกเลิกบิล

* **ไฟล์ที่ต้องสร้าง:**
  * `src/app/actions/planning-expense.ts`
* **ขั้นตอนการดำเนินงาน:**
  1. ตรวจสอบสิทธิ์ด้วย `canRecordAndSettleExpenses` ทุกฟังก์ชัน
  2. สร้าง `recordExpenseAction(input)` ภายใต้ `prisma.$transaction`:
     * ดึงข้อมูล `ProjectActivity` พร้อมรายการ `expenses` ที่ยังไม่ถูกลบมาคำนวณ `remainingBalance` ล่าสุดใน Transaction
     * ตรวจสอบด้วย `validateExpenseInvariant` หากยอดเงินเกินงบคงเหลือ ให้โยน Error แจ้งจำนวนเงินที่เกินทันที
     * บันทึกรายการลง `ActivityExpense` โดยเก็บทั้ง `requesterUserId` (ครูผู้ขอเบิก) และ `recordedByUserId` (`session.user.id` ของเจ้าหน้าที่ผู้คีย์)
  3. สร้าง `settleReservedExpenseAction({ expenseId, actualAmount, receiptNo, expenseDate, attachmentFile? })` ภายใต้ `prisma.$transaction`:
     * ดึงรายการเดิมและตรวจสอบว่ามีสถานะเป็น `RESERVED`
     * คำนวณวงเงินที่ใช้ได้โดยบวกยอด `RESERVED` เดิมกลับเข้าไปก่อน (`Available = CurrentRemaining + OldReservedAmount`)
     * หาก `actualAmount` ไม่เกินวงเงินที่ใช้ได้ ให้อัปเดตสถานะเป็น `PAID`, อัปเดตยอดเงินจริง, เลขที่ใบเสร็จ, และไฟล์ใบเสร็จ (ถ้ามี)
  4. สร้าง `voidExpenseAction({ expenseId, cancelRemark })`:
     * ตั้งค่า `status = "CANCELLED"`, `deletedAt = new Date()`, และบันทึกเหตุผลลงในฟิลด์ `remark`

---

## Phase 4: ส่วนติดต่อผู้ใช้และตารางแสดงผล (Frontend UI & Modals)

### Task 9: เพิ่มส่วนตั้งค่าระบบแผนงานในหน้า Admin Settings

* **ไฟล์ที่ต้องสร้าง/แก้ไข:**
  * `src/app/(app)/settings/_components/PlanningSettingsCard.tsx`
  * `src/app/(app)/settings/page.tsx`
* **ขั้นตอนการดำเนินงาน:**
  1. สร้าง UI สวิตช์เปิด-ปิดระบบแผนงาน (`enablePlanning`)
  2. สร้างช่องค้นหาและเลือกครูผู้ปฏิบัติงานแผนและการเงิน (Multi-select User Picker) พร้อมปุ่มบันทึกเรียก `updatePlanningSettingsAction`

### Task 10: พัฒนาหน้าหลัก `/planning` และตาราง Hierarchical Ledger Table

* **ไฟล์ที่ต้องสร้าง:**
  * `src/app/(app)/planning/page.tsx` (Server Component ดึงข้อมูลและแปลงผ่าน DTO Serializer)
  * `src/app/(app)/planning/_components/PlanningDashboardClient.tsx` (Client Wrapper จัดการ State ตัวกรองและ Modals)
  * `src/app/(app)/planning/_components/FinancialMetricCards.tsx` (4 กล่องสถิติการเงินรวม)
  * `src/app/(app)/planning/_components/PlanningFilterToolbar.tsx` (ค้นหา, กรองปี/ฝ่าย/แหล่งเงิน, สวิตช์ `[เฉพาะที่ฉันรับผิดชอบ]`, ปุ่ม `[ส่งออก Excel]`)
  * `src/app/(app)/planning/_components/ProjectLedgerTable.tsx` (ตาราง Hierarchical 2 ระดับสำหรับ Desktop และ Card View สำหรับจอมือถือ)
* **ขั้นตอนการดำเนินงาน:**
  1. ใน `ProjectLedgerTable.tsx`:
     * แถวโครงการ (Level 1): กดหุบ-กางดูกิจกรรมย่อยได้ แสดงรหัส/ชื่อโครงการ, แหล่งเงิน, หัวหน้าโครงการ, ป้ายสถานะเอกสาร SAR 3 ช่อง (`เล่มโครงการ`, `ขออนุมัติ`, `สรุปผล SAR`), ป้ายเตือนกรณีงบยังไม่จัดสรรลงกิจกรรม (`unallocatedBudget !== 0`), และ **Stacked Progress Bar** (สีน้ำเงิน = `PAID`, สีส้ม = `RESERVED`)
     * แถวกิจกรรมย่อย (Level 2): แสดงลำดับและชื่อกิจกรรม, ครูผู้รับผิดชอบ, ป้ายหมวดค่าใช้จ่ายที่มีการเบิกจริง (`usedCategories`), ตัวเลขงบประมาณ 4 ช่อง, ปุ่ม `[บันทึกการใช้เงิน]` (แสดงเฉพาะเจ้าหน้าที่แผน), และปุ่ม `[ประวัติเงิน]` (แสดงจำนวนรายการและจำนวนรายการที่รอเคลียร์ `RESERVED`)

### Task 11: พัฒนา Modals และ Drawers สำหรับจัดการข้อมูล

* **ไฟล์ที่ต้องสร้าง:**
  * `src/app/(app)/planning/_components/modals/ProjectFormModal.tsx` (สร้าง/แก้ไขโครงการและโอนเกลี่ยงบ)
  * `src/app/(app)/planning/_components/modals/ActivityFormModal.tsx` (สร้าง/แก้ไขกิจกรรมย่อยและโอนเกลี่ยงบ)
  * `src/app/(app)/planning/_components/modals/AttachmentManagerModal.tsx` (อัปโหลดไฟล์ R2 หรือวางลิงก์ภายนอก แยกตามประเภท `PROPOSAL`, `APPROVAL`, `SUMMARY`)
  * `src/app/(app)/planning/_components/modals/ExpenseFormModal.tsx` (รองรับโหมดบันทึกใหม่ `PAID`/`RESERVED` และโหมดยืนยันเบิกจ่ายจริงจากรายการกันเงิน)
  * `src/app/(app)/planning/_components/modals/ExpenseHistoryDrawer.tsx` (แสดงตารางประวัติการตัดเงิน, ชื่อผู้เบิก/ผู้คีย์, ปุ่มลัด `[ยืนยันเบิกจ่ายจริง]` สำหรับรายการ `RESERVED`, และปุ่ม `[ยกเลิกรายการ]` พร้อมกรอกเหตุผล)

---

## Phase 5: ระบบส่งออกรายงานและการตรวจสอบขั้นสุดท้าย (Export & Verification Gate)

### Task 12: สร้างระบบส่งออกไฟล์ Excel และรัน Verification Gate ครบวงจร

* **ไฟล์ที่ต้องสร้าง/อัปเดต:**
  * `src/lib/planning/export-excel.ts`
  * `src/app/(app)/layout.tsx` (เพิ่มเมนู `/planning` ใน Sidebar)
  * `CODEBASE_INDEX.md` (ผ่านสคริปต์อัตโนมัติ `npm run index:sync`)
* **ขั้นตอนการดำเนินงาน:**
  1. สร้างฟังก์ชัน `exportPlanningToExcel(filteredProjects, fiscalYear)` เพื่อสร้างไฟล์ `.xlsx` ที่ประกอบด้วย 2 Sheets:
     * **Sheet 1 (สรุปแผนงานและงบประมาณ):** แสดงรายการโครงการและกิจกรรมย่อยพร้อมตัวเลข งบตั้งต้น, งบหลังโอนเกลี่ย, กันวงเงิน, เบิกจ่ายจริง, และคงเหลือสุทธิ
     * **Sheet 2 (ประวัติการใช้จ่ายละเอียด):** แสดงรายการบิลทั้งหมดตามตัวกรองเพื่องานตรวจสอบบัญชีการเงิน
  2. เพิ่มเมนู **"แผนงานโครงการ" (`/planning`)** ในแถบ Sidebar เมื่อ `enablePlanning || isAdmin`
  3. รันคำสั่งตรวจสอบความถูกต้องทั้งหมดตามลำดับ:
     * `npx tsc --noEmit`
     * รันชุดทดสอบ Unit Tests ของระบบแผนงาน
     * `npm run index:sync`
     * Zero-Switch Deploy สู่ `origin/dev` และ `origin/main`
