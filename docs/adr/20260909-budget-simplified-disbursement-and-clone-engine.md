# ADR-001: Simplified Budget Disbursement, Cash-Gated Approvals, Fiscal Year Closure, and Project Clone Engine

## Status
APPROVED - 2026-09-09

## Context & Problem Statement
ระบบบริหารงานงบประมาณและแผนงานโรงเรียน (`Project Planning & Budget Ledger System`) ได้รับการติดตั้ง 5-Layer Financial Invariants และ Row-Level Pessimistic Locking ไว้อย่างรัดกุมในระดับฐานข้อมูล อย่างไรก็ดี จากการวิเคราะห์กระบวนการทำงานจริงของฝ่ายบริหารงานงบประมาณในโรงเรียน พบปัญหาทางสถาปัตยกรรม 4 ด้าน:

1. **ความยุ่งยากในการบันทึกการเบิกจ่าย (Disbursement Usability)**: เดิมระบบต้องการ `allocationId` ซึ่งผูกลึกถึงระดับงวดเงิน ทำให้ผู้ใช้ต้องทราบโครงสร้างเบื้องหลัง ทั้งที่ในทางปฏิบัติเจ้าหน้าที่การเงินต้องการเพียงเลือก "โครงการ" และ "กิจกรรม" ที่จะเบิกจ่ายเท่านั้น
2. **ช่องว่างระหว่างแผนกับเงินสดจริง (Cash Inflow Timing Invariant)**: เงินอุดหนุนรายหัวและงบประมาณจากหน่วยงานต้นสังกัด (สพฐ.) มักโอนเข้าบัญชีล่าช้ากว่ากำหนดกิจกรรม หากระบบบล็อกตั้งแต่ขั้นตอนวางแผนจะทำให้การดำเนินงานของโรงเรียนชะงัก แต่หากยอมให้ตัดจ่ายโดยไม่มีเงินสดจริงจะผิดวินัยการเงินการคลัง
3. **การสิ้นสุดปีงบประมาณ (Fiscal Year Closure Integrity)**: เมื่องวดปีงบประมาณสิ้นสุด (30 ก.ย.) ต้องมีกระบวนการ Freeze ข้อมูลไม่ให้แก้ไขย้อนหลัง และมีกลไกยกยอดเงินสดคงเหลือสุทธิ (Surplus Cash on Hand) ไปตั้งต้นเป็นเงินรายได้สถานศึกษาสะสมในปีถัดไป
4. **ความซ้ำซ้อนของการตั้งโครงการใหม่ทุกปี (Annual Project Duplication)**: โรงเรียนกว่า 85-90% ใช้โครงการและกิจกรรมเดิมซ้ำๆ ในแต่ละปีงบประมาณ โดยเพียงแต่ปรับปรุงตัวเลขวงเงินงบประมาณ การต้องคีย์ข้อมูลใหม่ตั้งแต่ต้นสร้างภาระงานมหาศาลและเสี่ยงต่อความผิดพลาดของรหัสโครงการ

---

## Decisions & Architectural Invariants

### Decision 1: Simplified Disbursement & Smart Allocation Resolution
- **User Experience**: ในหน้าต่างบันทึกการเบิกจ่าย ผู้ใช้เลือกเพียง:
  1. โครงการ (`projectId`)
  2. กิจกรรม (`activityId`)
- **Smart Tranche Selector**:
  - หากกิจกรรมนั้นได้รับการจัดสรรงบประมาณไว้ **เพียงงวดเดียว** $\rightarrow$ ระบบจะ Resolve `allocationId` ให้โดยอัตโนมัติ 100%
  - หากกิจกรรมนั้นมีการจัดสรรไว้ **หลายงวดเงิน** $\rightarrow$ ระบบจะ Default เป็นงวดเงินที่เปิดอยู่ของภาคเรียนปัจจุบัน พร้อมแสดง Dropdown รายชื่องวดและยอดเงินคงเหลือตามแผนและเงินสดคงเหลือจริง (เช่น *"งวดที่ 1 (คงเหลือ 15,000 บ.)"*) เพื่อให้ผู้ใช้สลับได้หากเป็นบิลตกค้าง
- **Role Boundary**: เจ้าหน้าที่การเงิน (`FINANCE_OFFICER` / `ADMIN`) เป็นผู้บันทึกและอนุมัติการเบิกจ่ายโดยตรง (`MANAGE` capability)

### Decision 2: Cash-Gated Disbursement Invariant
- **Plan vs Cash Guard**:
  - เมื่อบันทึกการเบิกจ่าย ระบบจะตรวจสอบ Invariant ชั้นที่ 4 (Plan Allocation Ceiling) และชั้นที่ 5 (Cash Inflow Invariant)
  - หากวงเงินตามแผนเพียงพอ แต่เงินสดจริงในบัญชีงวดนั้น (`BudgetReceipt - NetSpent`) ยังไม่พอจ่าย:
    - ระบบจะปฏิเสธการตัดยอดเงินพร้อมแสดงข้อความแจ้งเตือนที่ชัดเจน: *"เงินสดรับเข้าจริงในงวดเงินไม่เพียงพอ (เงินสดคงเหลือ: X บาท, ยอดที่ขอเบิก: Y บาท) กรุณาบันทึกเงินรับเข้าบัญชีก่อน"*
    - เจ้าหน้าที่การเงินต้องไปบันทึกเงินสดรับเข้าผ่านเมนู "บันทึกเงินงวดเข้าบัญชี" (`confirmTrancheDepositAction`) พร้อมแนบเลขอ้างอิงก่อนจึงจะทำรายการเบิกจ่ายได้

### Decision 3: Fiscal Year Closure & Surplus Inflow
- **Closure Pre-conditions**:
  1. ตรวจสอบว่าไม่มีรายการเบิกจ่ายค้างในสถานะ `SUBMITTED` ในปีงบประมาณนั้น
  2. ต้องไม่มีรายการโอนงบประมาณค้างในสถานะ `PENDING`
- **Closure Execution**:
  1. ปรับสถานะ `FiscalYear.status = "CLOSED"` และ `isArchived = true` ภายใต้ Pessimistic Lock
  2. ทุกโครงการ (`Project`), กิจกรรม (`ProjectActivity`), และการจัดสรร (`ActivityTrancheAllocation`) ในปีนั้นจะถูกล็อกให้อยู่ในสถานะ Immutable ห้ามแก้ไขหรือเบิกจ่ายเพิ่มโดยเด็ดขาด
  3. ระบบจะสรุปยอดเงินสดคงเหลือสุทธิของปีที่ปิด และสามารถสร้างรายการยอดยกไปเป็น `BudgetReceipt` (หมวดเงินรายได้สถานศึกษา/เงินสะสม) ในปีงบประมาณใหม่ได้

### Decision 4: Selective Batch Project & Activity Clone Engine
- **Engine Architecture**:
  - เพิ่ม Service Method: `ProjectBudgetService.cloneProjectsFromFiscalYear()`
  - เพิ่ม Server Action: `cloneProjectsFromFiscalYearAction()`
- **Parameters**:
  - `sourceFiscalYearId`: ปีงบประมาณต้นทาง
  - `targetFiscalYearId`: ปีงบประมาณปลายทาง (ต้องมีสถานะ `ACTIVE`)
  - `projectIds`: รายชื่อโครงการที่เลือกคัดลอก (รองรับ Select All)
  - `copyAllocatedAmount`: Boolean (`true` = ก๊อปปี้ตัวเลขวงเงินเดิมมาเพื่อปรับแก้, `false` = ตั้งค่าเป็น 0 บาท)
  - `targetAcademicYear`: ปีการศึกษาเป้าหมายของปีใหม่
- **Automatic Mapping Invariants**:
  - แมป `BudgetSource` ข้ามปีโดยใช้ `code` เดียวกัน (เช่น `SUBSIDY_PER_HEAD` $\rightarrow$ `SUBSIDY_PER_HEAD`)
  - แมป `BudgetTranche` ข้ามปีโดยใช้ `trancheNo` เดียวกัน (งวด 1 $\rightarrow$ งวด 1)
  - หากปีงบประมาณปลายทางยังไม่มี `BudgetSource` ที่ตรงกัน ระบบจะปฏิเสธพร้อมแนะนำให้กดปุ่ม "สร้างโครงสร้างงบประมาณเริ่มต้น" (`ensureDefaultFiscalYearAction`) ก่อน
  - รหัสโครงการ (`Project.code`) ในปีใหม่จะได้รับการตรวจสอบไม่ให้ซ้ำซ้อนกับโครงการที่มีอยู่แล้วในปีใหม่
- **Transactional & Locking**:
  - ครอบด้วย `prisma.$transaction` พร้อม Acquire Row Lock บน `FiscalYear` ปลายทางเพื่อป้องกัน Concurrency Race Condition

---

## Consequences

### Positive
- **ลดเวลาการตั้งค่าปีใหม่จากหลายวันเหลือเพียง 1 นาที**: เจ้าหน้าที่สามารถโคลนโครงการทั้ง 50 โครงการข้ามปีได้ในคลิกเดียว
- **ใช้งานง่ายขึ้นอย่างก้าวกระโดด**: หน้าเบิกจ่ายไม่ต้องงมหารหัส Allocation เพียงเลือกโครงการและกิจกรรม ระบบจัดสรรงวดให้อัตโนมัติ
- **ปลอดภัย 100% ต่อระเบียบการเงิน**: รักษา Invariants ทางการเงินทั้ง 5 ชั้นอย่างสมบูรณ์ ข้อมูลปีเก่าถูก Freeze อัตโนมัติ ป้องกันการทุจริตหรือแก้ไขงบย้อนหลัง

### Trade-offs & Complexity
- ในกรณีที่ปีงบประมาณปลายทางมีการปรับเปลี่ยนโครงสร้างงวดเงิน (เช่น จาก 4 งวด เหลือ 2 งวด) การ Auto-map อาจต้องตกหล่นงวดที่ไม่มีอยู่จริง ซึ่งระบบจะแจ้งเตือน (Graceful Validation Error)
- การ Clone ข้อมูลจำนวนมากในคราวเดียวต้องจำกัด Timeout ของ Database Transaction (ตั้ง `timeout: 30000ms`)
