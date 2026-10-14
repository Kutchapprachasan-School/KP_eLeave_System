---
name: inspect-task
description: Fast, risk-adjusted task inspection and coordinate discovery. Identifies target files, resolves definition and callers via search-first discovery, and establishes a minimal-but-complete dependency reading budget before code modification.
---

# 🔍 Inspect-Task Skill (Phase 1: Discovery & Dependency Budgeting)

## Purpose
สำรวจและระบุพิกัดโค้ดอย่างแม่นยำ พร้อมประเมินผลกระทบ (Blast Radius) โดยโหลด Context เท่าที่จำเป็นต่อความถูกต้อง ไม่ตัดทอนจนขาดความเข้าใจใน Dependencies

---

## Workflow Steps

### Step 1: Task Classification & Risk Profiling
1. วิเคราะห์ User Request และจำแนกประเภทงาน:
   - **Frontend / UI:** Next.js Components, Tailwind, Modals, Hooks
   - **Backend / API:** Server Actions, API Routes, Middleware
   - **Domain / Service:** Business logic, status workflow, calculations
   - **Database / Security:** Prisma schema, repositories, RBAC, PDPA (ความเสี่ยงสูง)
2. กำหนดรายการไฟล์เป้าหมาย และตรวจสอบ Acceptance Criteria

### Step 2: Search-First & Dependency Mapping (Definition + Callers)
ก่อนเปิดอ่านไฟล์ ให้ค้นหาทั้งจุดนิยามและจุดเรียกใช้:
1. **ค้นหาจุดนิยาม (Definition):**
   - ตรวจดูพิกัดอ้างอิงใน `CODEBASE_INDEX.md` (ใช้เป็นพิกัดคร่าวๆ / Hints)
   - ค้นหาด้วย PowerShell เพื่อยืนยันเลขบรรทัดจริง:
     ```powershell
     Select-String -Path "src/path/to/file.tsx" -Pattern "targetFunctionNameOrSymbol" | Select-Object -First 3 LineNumber, Line
     ```
2. **ค้นหาจุดเรียกใช้ (Callers / Usages):**
   - เพื่อประเมินผลกระทบก่อนแก้ Signature หรือ Return Type:
     ```powershell
     Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "targetFunctionName" | Select-Object -First 5 Path, LineNumber
     ```

### Step 3: Read-Minimum with Dependencies (อ่านครบอย่างมีบริบท)
- **อ่านตัวฟังก์ชันพร้อมบริบท:** อ่านตัวฟังก์ชันควบคู่กับ Type Definition, Function Signature, และ Imports ที่จำเป็น
- **ไม่ตัดตอนแบบสุ่มสี่สุ่มห้า:** หลีกเลี่ยงการตัดอ่านเฉพาะ 10 บรรทัดกลางฟังก์ชันโดยไม่รู้ Types เพราะจะทำให้แก้ผิดและต้องวนลูปแก้ซ้ำหลายรอบ
- **ข้อยกเว้น:** หากเป็นไฟล์ขนาดสั้น (< 100-150 บรรทัด) หรือไฟล์ใหม่ สามารถเปิดอ่านทั้งไฟล์ได้

---

## Output Contract
เมื่อจบ Phase นี้ Agent จะต้องมีข้อมูลครบ:
1. ไฟล์และฟังก์ชันเป้าหมาย พร้อมเลขบรรทัดจริง
2. ผลกระทบต่อจุดเรียกใช้ (Callers) และ Type Interfaces
3. แผนการแก้ไขแบบ Minimal Diff ที่คำนึงถึง Dependency และความปลอดภัย
