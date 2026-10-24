# แผนการพัฒนาระบบแผนงานโครงการและติดตามงบประมาณสถานศึกษา (School Planning & Budget Ledger) (v1.0 / Rev. 0)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

| Version / Rev | วันที่ / เวลา | การเปลี่ยนแปลงสำคัญ (Changelog) | สถานะ (Status) |
|---|---|---|---|
| `v1.0 (Rev. 0)` | 2026-10-24 13:25 | จัดทำแผนงานพัฒนาระบบแผนงานโครงการและติดตามงบประมาณฉบับสมบูรณ์ (Initial Implementation Plan) 9 Tasks ตาม Design Spec v1.1 | Pending Execution |

**Goal:** พัฒนาระบบแผนงานโครงการและติดตามงบประมาณสถานศึกษา (`/planning`) เพื่อให้ครูผู้จัดทำกิจกรรมตรวจสอบยอดงบประมาณที่ได้รับ ใช้ไป และคงเหลือได้แบบเรียลไทม์ พร้อมตารางแบบลำดับชั้น (Hierarchical Ledger Table), แถบสีแสดงความก้าวหน้า 2 ระดับ (Stacked Progress Bar), ระบบแนบเอกสารโครงการทั้ง R2 และลิงก์ภายนอก, ป้ายเตือน SAR Readiness, และให้เจ้าหน้าที่แผนงาน/การเงินลงบันทึกเบิกจ่ายและกันวงเงินได้อย่างรวดเร็ว

**Architecture:** แยกเป็น 3-Layer Architecture (`Presentation` -> `Domain Service` -> `Data Access Actions`) บนฐานข้อมูล PostgreSQL (Neon) โดยยึดหลัก Invariant Safety, Non-destructive Schema Extension, Decimal Serialization สำหรับ Next.js 16, และ Resilient Storage Management

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Prisma ORM, PostgreSQL (Neon), Tailwind CSS, Lucide React, Cloudflare R2 Universal Storage, SheetJS / XLSX สำหรับ Export

## Global Constraints

- **Rule 1 (AGENTS.md):** ห้ามรัน `prisma migrate reset` หรือคำสั่งทำลายข้อมูลบนฐานข้อมูลจริงเด็ดขาด
- **Rule 2 (AGENTS.md):** ห้ามเปิดไฟล์เกิน 100 บรรทัดแบบเต็มไฟล์ ให้ดูพิกัดใน `CODEBASE_INDEX.md`
- **Rule 3 (AGENTS.md):** พัฒนาบนกิ่ง `dev` เท่านั้น ห้ามสลับไป `main`
- **Rule 4 (AGENTS.md):** ห้าม Commit โฟลเดอร์ `scratch/` หรือทิ้ง Test Account ค้างไว้ใน DB
- **Rule 5 (AGENTS.md):** ห้ามส่งค่า `Decimal` หรือ `BigInt` ข้าม Server-Client Boundary โดยไม่ผ่านการแปลงค่า
- **Rule 6 (AGENTS.md):** จัดเก็บไฟล์ใน Cloudflare R2 เท่านั้น (ห้ามเก็บ Base64 ใน DB)
- **Rule 7 (AGENTS.md):** รัน `npm run index:sync` ทุกครั้งที่แก้ไข Schema หรือโค้ดเสร็จสิ้น

---

## แผนที่ไฟล์ที่ต้องสร้างหรือแก้ไข (File Structure & Boundaries)

```
src/
├── app/
│   ├── (app)/
│   │   ├── layout.tsx                                    # เพิ่มเมนู /planning ใน Sidebar
│   │   ├── planning/
│   │   │   ├── page.tsx                                  # Server Component รวบรวมข้อมูลเริ่มต้น
│   │   │   ├── _components/
│   │   │   │   ├── PlanningDashboardClient.tsx           # Client Component ควบคุม State หลัก
│   │   │   │   ├── PlanningMetricCards.tsx               # การ์ดสถิติ 4 ช่อง Real-time
│   │   │   │   ├── PlanningFilterToolbar.tsx             # แถบค้นหา ตัวกรอง Export Excel
│   │   │   │   ├── PlanningLedgerTable.tsx               # ตารางลำดับชั้น Desktop & Responsive Mobile Card
│   │   │   │   ├── CreateProjectModal.tsx                # หน้าต่างสร้าง/แก้ไขโครงการ
│   │   │   │   ├── CreateActivityModal.tsx               # หน้าต่างสร้างกิจกรรมย่อย
│   │   │   │   ├── DisburseExpenseModal.tsx              # หน้าต่างบันทึกใช้เงิน (PAID / RESERVED)
│   │   │   │   ├── ExpenseHistoryDrawer.tsx              # Drawer ประวัติบิล + ปุ่มลัดยืนยันเบิกจ่ายจริง
│   │   │   │   └── AttachDocumentModal.tsx               # หน้าต่างแนบไฟล์ R2 / ลิงก์ Drive
│   │   └── settings/
│   │       └── page.tsx                                  # เพิ่มช่องตั้งค่าครูผู้ปฏิบัติงานแผน
│   └── actions/
│       ├── school-planning.ts                            # Server Actions สำหรับระบบแผนงาน
│       └── settings.ts                                   # ขยายรองรับ enablePlanning, planningOfficerUserIds
├── services/
│   └── school-planning.service.ts                        # Calculation Engine, Ledger Queries, Invariants
├── lib/
│   └── permissions.ts                                    # ฟังก์ชัน getPlanningPermissions
prisma/
└── schema.prisma                                         # เพิ่มฟิลด์และ Enums ของระบบแผนงาน
eLeave/tests/unit/
└── schoolPlanningFinancials.test.js                      # Unit Tests สำหรับ Financial Invariants & Settlement
```

---

## งานย่อยสำหรับลงมือปฏิบัติ (Bite-Sized Implementation Tasks)

### Task 1: อัปเดตโครงสร้างฐานข้อมูล (Prisma Schema Non-destructive Extension)

- [ ] **Step 1.1:** ตรวจสอบพิกัดโมเดลใน `prisma/schema.prisma` ผ่าน `CODEBASE_INDEX.md`
- [ ] **Step 1.2:** เพิ่ม Enums: `BudgetSourceType`, `ExpenseCategory`, `ExpenseStatus`, `AttachmentType`, `StorageType` ลงใน `prisma/schema.prisma`
- [ ] **Step 1.3:** เพิ่มฟิลด์ `enablePlanning Boolean @default(true)` และ `planningOfficerUserIds String @default("")` ในโมเดล `SystemSettings`
- [ ] **Step 1.4:** เพิ่มฟิลด์ขยายในโมเดล `Project`, `ProjectActivity`, `ProjectAttachment`, และ `ActivityExpense` ให้รองรับ `budgetSourceType`, `strategyCode`, `standardTags`, `adjustedAmount`, `deletedAt`, `expenseCategory`, `status`, `requesterUserId`, `recordedByUserId`, `fileKey`, `fileUrl` (ทั้งหมดเป็น Optional หรือมี `@default`)
- [ ] **Step 1.5:** รันคำสั่ง `npx prisma db push` บน PowerShell เพื่ออัปเดต Database schema แบบปลอดภัย
- [ ] **Step 1.6:** รันคำสั่ง `npx prisma generate` เพื่ออัปเดต Prisma Client
- [ ] **Step 1.7:** รันคำสั่ง `npm run index:sync` เพื่ออัปเดต `CODEBASE_INDEX.md`
- [ ] **Step 1.8:** Commit การเปลี่ยนแปลง: `git commit -m "feat(schema): add school planning and budget tracking models"`

---

### Task 2: พัฒนาเอนจินการคำนวณและบริการแผนงาน (`SchoolPlanningService`)

- [ ] **Step 2.1:** สร้างไฟล์ทดสอบ `eLeave/tests/unit/schoolPlanningFinancials.test.js` เขียน Test Case:
  - คำนวณงบประมาณสุทธิ, ยอดกันเงิน (`RESERVED`), ยอดจ่ายจริง (`PAID`), และยอดคงเหลือสุทธิ
  - ตรวจสอบสูตรงบโครงการ ($\text{Project Remaining} = \text{Project Effective Budget} - (\text{Reserved} + \text{Paid})$) และ $\text{Unallocated Budget}$
  - ตรวจสอบ Settlement Delta Invariant ($\text{New Amount} \le \text{Remaining} + \text{Old Amount}$)
  - ตรวจสอบการคัดกรอง Soft Delete (`deletedAt IS NOT NULL`)
- [ ] **Step 2.2:** รัน `node --test eLeave/tests/unit/schoolPlanningFinancials.test.js` เพื่อยืนยันว่าการทดสอบล้มเหลว (Red Phase)
- [ ] **Step 2.3:** สร้างไฟล์ `src/services/school-planning.service.ts` พร้อมคลาส `SchoolPlanningService` และฟังก์ชันบริสุทธิ์ (Pure Functions):
  - `calculateActivityFinancials(activity)`
  - `calculateProjectFinancials(project)`
  - `assertSettlementDeltaInvariant(currentRemaining, oldExpenseAmount, newExpenseAmount)`
  - `parseOfficerIds(commaSeparatedString)`
- [ ] **Step 2.4:** พัฒนาเมธอดธุรกรรมทางการเงิน:
  - `getPlanningLedger({ fiscalYear, departmentName, budgetSourceType, userId, myProjectsOnly })`
  - `createProject(data)`
  - `createProjectActivity(data)`
  - `recordExpense(data)` (รองรับทั้ง `PAID` และ `RESERVED` ภายใน `prisma.$transaction`)
  - `settleReservedExpense({ expenseId, finalAmount, receiptNo, recordedByUserId })`
  - `voidExpense({ expenseId, reason, recordedByUserId })`
  - `attachProjectDocument(data)`
  - `deleteProjectDocument(attachmentId)` (พร้อม Resilient R2 deletion ครอบด้วย `try/catch`)
- [ ] **Step 2.5:** รัน `node --test eLeave/tests/unit/schoolPlanningFinancials.test.js` เพื่อยืนยันว่าการทดสอบผ่านทั้งหมด 100% (Green Phase)
- [ ] **Step 2.6:** Commit การเปลี่ยนแปลง: `git commit -m "feat(service): implement school planning service and financial invariants"`

---

### Task 3: ระบบสิทธิ์และ Server Actions (`src/app/actions/school-planning.ts`)

- [ ] **Step 3.1:** เพิ่มฟังก์ชัน `getPlanningPermissions` ลงใน `src/lib/permissions.ts` ตรวจสอบสิทธิ์ Admin, เจ้าหน้าที่แผน, และหัวหน้าโครงการ/กิจกรรม
- [ ] **Step 3.2:** สร้างไฟล์ `src/app/actions/school-planning.ts` พร้อม Zod validation schemas สำหรับทุก Action
- [ ] **Step 3.3:** พัฒนา Server Actions พร้อมฟังก์ชัน `serializeForClient`:
  - `getPlanningLedgerAction`
  - `createProjectAction`
  - `createProjectActivityAction`
  - `recordExpenseAction`
  - `settleReservedExpenseAction`
  - `voidExpenseAction`
  - `attachProjectDocumentAction`
  - `deleteProjectDocumentAction`
- [ ] **Step 3.4:** เขียน Unit Tests ตรวจสอบ Permission Boundary ใน `eLeave/tests/unit/schoolPlanningPermissions.test.js`
- [ ] **Step 3.5:** Commit การเปลี่ยนแปลง: `git commit -m "feat(actions): add school planning server actions with strict RBAC"`

---

### Task 4: การเชื่อมโยงการตั้งค่าระบบ (Settings Integration)

- [ ] **Step 4.1:** เปิดอ่าน `src/app/actions/settings.ts` ผ่านพิกัดที่กำหนดใน `CODEBASE_INDEX.md`
- [ ] **Step 4.2:** ปรับปรุง `updateSystemSettings` ให้รองรับการบันทึก `enablePlanning` และ `planningOfficerUserIds`
- [ ] **Step 4.3:** ในหน้า `src/app/(app)/settings/page.tsx` เพิ่มส่วนการตั้งค่า **"ระบบแผนงานโครงการและติดตามงบประมาณ"**:
  - สวิตช์เปิด-ปิดระบบแผนงาน (`enablePlanning`)
  - กล่องค้นหาและเลือกครู **"เจ้าหน้าที่แผนงานและงบประมาณ/การเงิน"** (Multi-select)
- [ ] **Step 4.4:** ทดสอบบันทึกการตั้งค่าและตรวจสอบค่าในฐานข้อมูล
- [ ] **Step 4.5:** Commit การเปลี่ยนแปลง: `git commit -m "feat(settings): integrate school planning officer settings"`

---

### Task 5: หน้าจอหลักและแถบสถิติ/เครื่องมือ (`MetricCards` & `FilterToolbar`)

- [ ] **Step 5.1:** สร้าง `src/app/(app)/planning/_components/PlanningMetricCards.tsx`:
  - แสดง 4 การ์ดสถิติ Real-time: งบรวม, จ่ายแล้ว, กันเงินจอง, และคงเหลือสุทธิ
  - รองรับสีเขียว/แดงตามสถานะคงเหลือ และแสดงผลตัวเลขสวยงามด้วยฟังก์ชันจัดฟอร์แมตเงินบาท
- [ ] **Step 5.2:** สร้าง `src/app/(app)/planning/_components/PlanningFilterToolbar.tsx`:
  - Dropdown เลือกปีงบประมาณ, กลุ่มสาระฯ/ฝ่ายงาน, และแหล่งงบประมาณ
  - ช่องค้นหาโครงการ/กิจกรรม
  - สวิตช์ด่วน `[🔘 เฉพาะที่ฉันรับผิดชอบ]`
  - ปุ่ม `[ 📥 ส่งออก Excel ]` สรุปตามตัวกรอง
  - ปุ่ม `[ + สร้างโครงการใหม่ ]` (แสดงเฉพาะผู้มีสิทธิ์ `canManageStructureAndBudget`)
- [ ] **Step 5.3:** Commit การเปลี่ยนแปลง: `git commit -m "feat(ui): add planning metric cards and filter toolbar"`

---

### Task 6: ตารางแผนงานแบบลำดับชั้นและ Mobile Layout (`PlanningLedgerTable`)

- [ ] **Step 6.1:** สร้าง `src/app/(app)/planning/_components/PlanningLedgerTable.tsx`:
  - **Desktop View (`>= 768px`):**
    - แถวโครงการแม่ (Level 1) กางออกได้ (Accordion)
    - แถบสี 2 ระดับ (Stacked Progress Bar) สำหรับ `PAID` และ `RESERVED`
    - ป้ายสถานะ SAR Readiness 3 ช่อง (`[📄 เล่ม]`, `[📝 ขออนุมัติ]`, `[📊 สรุปผล]`)
    - ป้ายเตือนงบยังไม่จัดสรร `[⚠️ รอจัดสรรลงกิจกรรม ฿xx,xxx]`
    - แสดงข้อความกำกับงบโอนเกลี่ย `฿xxx (เดิม ฿yyy)`
    - แถวกิจกรรมย่อย (Level 2) พร้อมป้ายสรุปหมวดค่าใช้จ่าย และปุ่มดำเนินการ
  - **Mobile Card View (`< 768px`):**
    - การ์ดแบบย่อ แสดงยอดคงเหลือสุทธิเด่นชัด
    - ตารางสรุปงบ 2x2 กะทัดรัด
    - ปุ่มกดไม่น้อยกว่า 44px (`h-11`) รองรับการสัมผัสด้วยนิ้วโป้ง
- [ ] **Step 6.2:** Commit การเปลี่ยนแปลง: `git commit -m "feat(ui): implement hierarchical planning ledger table with mobile card view"`

---

### Task 7: หน้าต่างบันทึกข้อมูลและ Drawer ประวัติเงิน (Modals & Drawers)

- [ ] **Step 7.1:** สร้าง `CreateProjectModal.tsx` และ `CreateActivityModal.tsx` พร้อมการเลือกแหล่งเงินและกลยุทธ์
- [ ] **Step 7.2:** สร้าง `DisburseExpenseModal.tsx`:
  - สวิตช์เลือกสถานะ `PAID` (จ่ายจริง) หรือ `RESERVED` (กันเงิน)
  - Dropdown เลือกหมวดค่าใช้จ่าย และเลือกครูผู้ขอเบิก
  - ป้อนวันที่, รายการ, ยอดเงิน, เลขที่เอกสาร/ใบเสร็จ
- [ ] **Step 7.3:** สร้าง `ExpenseHistoryDrawer.tsx`:
  - รายการประวัติบิลทุกรายการในกิจกรรม
  - ปุ่มลัด **`[ ✅ ยืนยันเบิกจ่ายจริง ]`** สำหรับรายการ `RESERVED` เพื่อแก้ยอดจริงและแนบใบเสร็จ
  - ปุ่ม Soft delete ยกเลิกบิลสำหรับเจ้าหน้าที่แผน
- [ ] **Step 7.4:** สร้าง `AttachDocumentModal.tsx`:
  - แท็บ 1: อัปโหลดไฟล์ PDF/Word/Excel ขึ้น Cloudflare R2 พร้อมเก็บ `fileKey`
  - แท็บ 2: แปะลิงก์ Google Drive, Canva, OneDrive
  - บันทึกประเภทเอกสาร (`PROPOSAL`, `APPROVAL`, `SUMMARY`, `OTHER`)
- [ ] **Step 7.5:** Commit การเปลี่ยนแปลง: `git commit -m "feat(ui): add modals for project creation, expense disbursement, and file attachments"`

---

### Task 8: รวมหน้าระบบและผูกเมนู Sidebar (`/planning`)

- [ ] **Step 8.1:** รวมส่วนประกอบทั้งหมดใน `src/app/(app)/planning/page.tsx` และ `PlanningDashboardClient.tsx`
- [ ] **Step 8.2:** เปิดไฟล์ `src/app/(app)/layout.tsx` ตรวจสอบพิกัด Sidebar เมนู
- [ ] **Step 8.3:** เพิ่มเมนู **"แผนงานโครงการ" (`/planning`)** ไอคอน `ClipboardCheck` หรือ `Wallet` ในแถบ Sidebar เมื่อ `enablePlanning || isAdmin` เป็นจริง
- [ ] **Step 8.4:** ทดสอบการเปลี่ยนหน้าและการทำงานแบบ End-to-End บนเบราว์เซอร์
- [ ] **Step 8.5:** Commit การเปลี่ยนแปลง: `git commit -m "feat(navigation): integrate school planning route into app layout"`

---

### Task 9: ตรวจสอบความถูกต้องรอบด้านและส่งมอบงาน (Full Verification & Sync)

- [ ] **Step 9.1:** รันชุดการทดสอบ Unit Tests ทั้งหมดใน `eLeave/tests/unit` ให้ผ่าน 100%
- [ ] **Step 9.2:** ตรวจสอบ Type Safety ปราศจาก Error ด้วย `tsc --noEmit`
- [ ] **Step 9.3:** รันคำสั่งบังคับ `npm run index:sync` เพื่ออัปเดต `CODEBASE_INDEX.md`
- [ ] **Step 9.4:** ตรวจสอบความสะอาดของ Git Working Tree (`git status`) ให้ไม่มีไฟล์ค้างใน `scratch/`
- [ ] **Step 9.5:** Commit สรุปผลและ Deploy ด้วยคำสั่ง Zero-Switch:
  ```bash
  git add .
  git commit -m "feat(planning): complete school planning and budget ledger subsystem"
  git push origin dev
  git push origin dev:main
  ```
- [ ] **Step 9.6:** จัดทำเอกสารสรุปส่งมอบงาน (Milestone Handoff) ตามสกิล handoff
