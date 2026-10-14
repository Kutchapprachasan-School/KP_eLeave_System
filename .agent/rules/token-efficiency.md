---
trigger: always_on
description: "Risk-adjusted context orchestration, search-first reading, trigger-based handoff, subagent cost control, and empirical verification."
---

# นโยบายจัดการบริบทและต้นทุนตามความเสี่ยง (Token & Context Policy v3.0)

**บังคับใช้กับ:** ทุก Session การพัฒนาในโปรเจกต์ KP e-Leave  
**หลักการสำคัญ:** ไม่มุ่งลด Token ในทุก Tool Call จนเสียงาน แต่จงทำให้ Agent ใช้ Token น้อยที่สุดเท่าที่จำเป็นเพื่อส่งมอบงานที่ **ถูกต้อง ปลอดภัย และมีหลักฐานตรวจสอบได้จริง**

---

## 🎯 1. Search-First, Read-Minimum, Expand-by-Dependency (การอ่านโค้ดตามความสัมพันธ์)

- **ค้นหาก่อนอ่าน (Search-First):**
  - ใช้ Single-line search (เช่น `Select-String`, `grep`) เพื่อหาจุดนิยาม (Definition) และจุดเรียกใช้ (Caller) ก่อนเปิดอ่านไฟล์
  - ปฏิบัติต่อเลขบรรทัดใน `CODEBASE_INDEX.md` เป็น **"พิกัดคร่าวๆ (Hints)"** ไม่ใช่ความจริงสัมบูรณ์ เพราะเลขบรรทัดอาจขยับได้หลังการแก้ไข
- **อ่านขั้นต่ำแต่ครบ Dependency (Read-Minimum with Context):**
  - เมื่อพบเป้าหมาย ให้อ่านตัวฟังก์ชันพร้อม Imports, Type Interfaces, และ Parameters ที่เกี่ยวข้อง
  - **ห้าม:** ตัดอ่านเฉพาะบอดี้ฟังก์ชันโดยไม่อ่าน Type หรือ Context รอบข้าง เพราะจะนำไปสู่การแก้ผิดและต้องเสีย Token แก้ซ้ำหลายรอบ (Cost per completed task สูงขึ้น)
- **ข้อยกเว้นการเปิดทั้งไฟล์:**
  - ไฟล์ขนาดสั้น (< 100-150 บรรทัด)
  - ไฟล์ที่สร้างขึ้นใหม่ หรือไฟล์ที่มี Coupling สูงระหว่างฟังก์ชันภายใน สามารถเปิดทั้งไฟล์ได้เพื่อความเข้าใจที่ถูกต้องครบถ้วน

---

## 🔄 2. Trigger-Based Handoff (การส่งต่องานตามเงื่อนไขจริง)

ยกเลิกการนับจำนวน Task หรือ Tool Calls แบบตายตัว (เช่น ทุก 15 ครั้ง) เพราะงานแต่ละประเภทมีปริมาณผลลัพธ์ไม่เท่ากัน ให้พิจารณา Handoff เมื่อเกิด **Trigger** ข้อใดข้อหนึ่ง:
1. **Context Saturation Risk:** ปริมาณข้อความใน Session เริ่มยาวจนเสี่ยงต่อการถูกตัดทอน (Truncation)
2. **Behavioral Degradation:** Agent เริ่มอ่านข้อมูลเดิมซ้ำ หรือเริ่มลืมกฎ/คำสั่งก่อนหน้า
3. **Phase Transition:** เมื่อเปลี่ยนจาก "Phase สำรวจ/ออกแบบ" เข้าสู่ "Phase ลงมือแก้โค้ดจริง (Implementation)"
4. **Milestone Boundary:** เมื่อจบงานชิ้นใหญ่ที่ผ่านการทดสอบแล้ว และสามารถสรุปสถานะสั้นๆ เพื่อส่งต่อ Session ใหม่ได้อย่างหมดจด
5. **Context Pollution:** มี Error Logs เก่า หรือข้อมูลจากการทดลองที่ไม่เกี่ยวข้องกับงานถัดไปสะสมมากเกินไป

---

## 🧠 3. Task-to-Tool Efficiency Matrix (เลือกเครื่องมือให้ตรงจุด)

วัดความคุ้มค่าที่ **"ต้นทุนรวมต่อหนึ่งงานที่สำเร็จ (Cost per Successful Task)"** ไม่ใช่ราคา Token ต่อครั้ง:

| ประเภทงาน | เครื่องมือที่เหมาะสม | เหตุผลด้านต้นทุน |
|---|---|---|
| ค้นหาชื่อฟังก์ชัน / สัญลักษณ์ | PowerShell / `Select-String` | กิน 0 Model Tokens, รวดเร็ว แม่นยำ |
| นับไฟล์ / ตรวจโครงสร้าง Directory | Shell Commands | กิน 0 Model Tokens |
| กรอง Error จาก Build / Test | Regex / Shell Pipelines | ลด Log ที่จะไหลเข้า Context ได้ 80%+ |
| แก้ไข UI / Logic เฉพาะจุด | Targeted Model Edit | แก้ตรงจุด ไม่ต้องพึ่ง Reasoning ซับซ้อน |
| แก้ไข Transaction, RBAC, Data Migration | High-Reasoning Execution | ป้องกันบั๊กราคาแพง การทำรอบเดียวผ่านคุ้มค่ากว่าโมเดลเล็กที่แก้ซ้ำ 4 รอบ |

---

## 🗄️ 4. Output Filtering & Scratch Hygiene (การคัดกรอง Log)

- เมื่อรันคำสั่งที่เสี่ยงต่อ Log ยาว (Build, Typecheck, Full Test) ให้ Redirect ลงไฟล์ชั่วคราวใน `scratch/` และคัดกรองเฉพาะข้อมูลสำคัญก่อนส่งกลับเข้า Context:
  ```powershell
  npm run typecheck *> scratch/typecheck.log; $ec = $LASTEXITCODE
  "ExitCode=$ec"
  Select-String -Path scratch/typecheck.log -Pattern "error TS\d+|Error:|FAILED|Exception" | Select-Object -First 20
  ```
- **Scratch Hygiene:** ลบไฟล์ Log เก่าที่ไม่ได้ใช้งานหลังจบภารกิจ เพื่อไม่ให้สะสมมลพิษใน Workspace

---

## 🐝 5. Subagent Prudence Policy (ใช้อย่างระมัดระวัง ไม่เปิดพร่ำเพรื่อ)

ต้นทุนรวมของการเปิด Subagent คือ:
$$C_{\text{total}} = C_{\text{main}} + \sum_{i=1}^{k} C_{\text{subagent},i} + C_{\text{coordination}}$$

- Subagent แต่ละตัวต้องโหลดกฎและ Context พื้นฐานใหม่เสมอ หากเปิดซ้ำซ้อนจะกลายเป็นการเพิ่ม Token สะสม
- **เกณฑ์การใช้ Subagent:** ใช้เมื่อครบ 3 เงื่อนไขเท่านั้น:
  1. งานย่อยเป็นอิสระต่อกันจริง (Decoupled & Parallelizable)
  2. มีขอบเขตไฟล์ คำถาม และ Output ที่ชัดเจน
  3. คาดว่าผลลัพธ์จะประหยัดเวลา/Token มากกว่า Overhead ในการเรียก
- **Default:** เริ่มต้นด้วย Agent เดียวก่อนเสมอ
- **ห้าม:** Kill Subagent ทันทีโดยไม่ตรวจดูว่ามีงานหรือผลลัพธ์สำคัญค้างอยู่หรือไม่

---

## 📑 6. Stable Architecture Index vs Dynamic Discovery

แบ่งแยกระหว่าง "แผนที่ระบบ" กับ "พิกัดโค้ด":
1. **Stable Architecture Index ([`CODEBASE_INDEX.md`](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/CODEBASE_INDEX.md)):**
   - เก็บผังโมดูล, หน้าที่หลัก, สถาปัตยกรรม 3 ชั้น, และกฎเกณฑ์คงทน (Invariants)
   - อัปเดตเฉพาะเมื่อมีการเปลี่ยนแปลงโครงสร้างระดับสถาปัตยกรรม หรือเพิ่มโมดูลใหม่ ไม่ต้องอัปเดตทุกครั้งที่แก้ฟังก์ชันเล็กน้อย
2. **Dynamic Discovery:**
   - ใช้ Search Tool ค้นหาเลขบรรทัดและ Symbol แบบ On-Demand ขณะทำงานจริง เพื่อหลีกเลี่ยงภาระดูแล Line Anchor ที่ล้าสมัยได้ง่าย

---

## 🧪 7. Risk-Adjusted Test Pyramid (การทดสอบตามระดับความเสี่ยง)

| ระดับ | ขอบเขตการรัน | จังหวะเวลาที่เหมาะสม |
|---|---|---|
| **Level 1: Scoped Unit Test** | เฉพาะไฟล์ทดสอบของโมดูลที่แก้ | ทุกรอบที่มีการแก้ Logic |
| **Level 2: Typecheck & Lint** | Scoped หรือโปรเจกต์ย่อย | เมื่อเปลี่ยน Interface / Types |
| **Level 3: Integration Test** | ฟังก์ชันที่ต่อ DB หรือหลาย Service | เมื่อแตะ Transaction / Repository |
| **Level 4: Security / Forensic** | RBAC, Audit, Zero Orphaned Check | เมื่อแตะสิทธิ์, ข้อมูลส่วนบุคคล, DB |
| **Level 5: Full Test Suite** | ทุกเทสต์ทั้งระบบ (`npm test`) | ก่อนส่งมอบ Milestone หรือ Merge เข้ากิ่งหลัก |

> **หมายเหตุ:** การที่ชุดทดสอบผ่านหมด (Pass) ไม่ได้แปลว่า "Zero Regression" เสมอไป หาก Test ไม่ครอบคลุม Behavior ที่เปลี่ยน จึงต้องตรวจ Diff ควบคู่เสมอ

---

## 🏆 8. Zero-Compromise Quality Invariants (กฎคุณภาพสัมบูรณ์)

1. **ห้ามตัดทอนความปลอดภัย:** ห้ามตัด Security Checks, Zod Validation, หรือ Error Handling ออกเพื่อประหยัดโค้ดหรือ Token
2. **ห้ามอ้างผลลอยๆ:** ห้ามกล่าวอ้างว่า "เทสต์ผ่านแล้ว" โดยไม่ได้รันคำสั่งทดสอบจริง และห้ามใช้ข้อสรุปจินตนาการแทนหลักฐาน Output
3. **Loop-Break Rule:** หากแก้โค้ดแล้วพบ Error ซ้ำเดิมเกิน **2 ครั้ง** ให้หยุดทันที วิเคราะห์ Root Cause ใหม่ หรือปรึกษาผู้ใช้
4. **ความโปร่งใสด้านขีดจำกัด:** หากไม่สามารถตรวจสอบโค้ดได้อย่างมั่นใจภายในขอบเขต ให้รายงานข้อจำกัดอย่างตรงไปตรงมา
