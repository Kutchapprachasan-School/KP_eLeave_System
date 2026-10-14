---
name: verify-change
description: Scoped verification, test pyramid execution, loop-break control, empirical evidence gathering, and production database hygiene checks.
---

# ✅ Verify-Change Skill (Phase 3: Scoped Verification & Ledger)

## Purpose
ตรวจสอบความถูกต้องของการเปลี่ยนแปลงตามระดับความเสี่ยง (Risk-Adjusted Test Pyramid) รวบรวมหลักฐานเชิงประจักษ์ (Empirical Evidence) ป้องกันการวนลูปแก้ซ้ำ และรักษาความสะอาดของฐานข้อมูล

---

## Workflow Steps

### Step 1: Test Pyramid Execution (เลือกระดับการทดสอบตามความเสี่ยง)
1. **Level 1 (Logic แก้ไขเฉพาะจุด):** รัน Scoped Unit Test ของโมดูลนั้นๆ:
   ```powershell
   npx vitest run path/to/specific.test.ts
   ```
2. **Level 2 (Interface / Type Refactor):** รัน Typecheck พร้อมกรอง Error:
   ```powershell
   npm run typecheck *> scratch/typecheck.log; $ec = $LASTEXITCODE; "ExitCode=$ec"; Select-String -Path scratch/typecheck.log -Pattern "error TS\d+|Error:" | Select-Object -First 15
   ```
3. **Level 3 (Database / Multi-service):** รัน Integration Test ของระบบที่แตะ
4. **Level 4 (Cross-cutting / Release Milestone):** รัน Full Test Suite (`npm test`) ก่อนส่งมอบงานสำคัญ

### Step 2: Loop-Break Controller (หยุดวนลูปแก้ซ้ำ)
- หากรัน Test แล้วพบข้อผิดพลาดเดิมซ้ำกัน **2 ครั้ง**:
  - **ห้าม:** สุ่มแก้โค้ดรอบที่ 3 ต่อไปเรื่อยๆ
  - **บังคับ:** หยุดการรัน แล้วย้อนกลับไปวิเคราะห์ Root Cause หรือรายงานข้อจำกัดให้ผู้ใช้ทราบทันที

### Step 3: Database Cleanliness Verification
- สำหรับงานที่แตะฐานข้อมูล ให้ยืนยันความสะอาด:
  - ไม่มี User ทดสอบหลงเหลือในระบบ: `WHERE email LIKE '%test%' OR name LIKE '%ทดสอบ%' = 0`

### Step 4: Empirical Evidence Standard (หลักฐานเชิงประจักษ์)
- **ห้าม:** สรุปว่า "ระบบทำงานถูกต้องและผ่านการทดสอบแล้ว" หากไม่ได้รันคำสั่งจริง
- การรายงานต้องมี Exit Code, จำนวน Test ที่ผ่าน, หรือ Diff ที่ยืนยันได้จริง
- ระบุตรงไปตรงมาหาก Test ชุดเดิมยังไม่ครอบคลุม Behavior ใหม่ที่เพิ่มเข้ามา (ไม่ทึกทักเอาเองว่าเป็น Zero Regression)

### Step 5: Ledger Recording & Cleanup
1. บันทึกผลลัพธ์ลงใน `.agent/ledger/token-ledger.json` เพื่อเก็บสถิติความคุ้มค่า
2. ลบไฟล์ Log ชั่วคราวใน `scratch/` หลังเสร็จสิ้นการตรวจสอบ
