# กฎประหยัด Token & ป้องกัน Quadratic Context Explosion (v1.0)

**บังคับใช้กับ:** ทุก Session การพัฒนาในโปรเจกต์นี้  
**สาเหตุ:** ~90% ของ Token ถูกใช้ไปกับการอ่าน Context ซ้ำ ยิ่งแชทยาว ยิ่งเปลือง Token แบบ O(n²)

---

## ✂️ 1. Targeted View — ห้ามเปิดดูทั้งไฟล์ (Surgical File Reading)

- **บังคับ:** ใช้ `StartLine` + `EndLine` ทุกครั้งที่อ่านไฟล์ที่รู้ตำแหน่งแล้ว
- **ห้าม:** เปิดไฟล์ทั้งหมดเมื่อต้องการแก้ไขแค่บางส่วน
- **ก่อนเปิดไฟล์:** ค้นหาเลขบรรทัดด้วย `Select-String`, `grep`, หรือดูจาก [CODEBASE_INDEX.md](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/CODEBASE_INDEX.md) ก่อนเสมอ
- **ไฟล์ใหม่ที่ไม่เคยเปิด:** ครั้งแรกเปิดทั้งไฟล์ได้ แต่ถ้าเปิดซ้ำต้อง Targeted View เท่านั้น
- **เกณฑ์:** ไฟล์ > 100 บรรทัด ห้ามเปิดทั้งไฟล์ซ้ำโดยไม่จำเป็น

## 🔄 2. Milestone Handoff / Compact Cadence (ตัดตอนก่อน Context บวม)

- **ทุก 3-5 task** หรือเมื่อรู้สึกว่า Context เริ่มหนัก ให้:
  1. สรุปงานที่ทำไปแล้วเป็น Handoff Note สั้นๆ
  2. แนะนำผู้ใช้เริ่ม Session ใหม่พร้อม Handoff Note
- **เมื่อ Session ดำเนินไป > 15 tool calls** ให้เตือนผู้ใช้ว่าถึงจุดที่ควร Handoff
- **อย่ารอจน Context ล้น:** ป้องกัน ดีกว่า แก้

## 🧠 3. Smart Model Routing (ใช้สมองให้ถูกเบอร์)

- **งานง่าย (research, อ่านไฟล์, ค้นหา, สรุป):** ส่ง subagent ด้วย `model: "flash"` หรือ `model: "flash_lite"`
- **งานซับซ้อน (refactor, debug, architecture):** ใช้ `model: "pro"` หรือ `model: "inherit"`
- **หลักการ:** ไม่ใช้ปืนใหญ่ยิงนก — ประหยัด Token ด้วยการเลือก Model ที่เหมาะกับงาน

## 🗄️ 4. Scratchpad Output Redirect (ซ่อน Log ยาวไว้ในไฟล์)

- **Output ยาว > 50 บรรทัด:** Redirect ลงไฟล์ใน `scratch/` แทนการพ่นลงแชท
  ```powershell
  some-command | Out-File scratch/result.txt
  ```
- **หลังจาก Redirect:** ใช้ `view_file` ดูเฉพาะส่วนที่ต้องการ (Targeted View)
- **ห้าม:** ปล่อยให้ command output ยาวๆ ไหลเข้า Context โดยไม่จำเป็น
- **ใช้ `| Select-Object -First N` หรือ `| head -n N`:** เมื่อต้องการแค่ผลลัพธ์บางส่วน

## 🐝 5. Ephemeral Subagent Swarm (ฝูงบินสลายตัว)

- **งานที่เป็นอิสระจากกัน:** ส่ง Subagent ทำแยก ไม่สะสม Context ในแชทหลัก
- **Subagent ควรจบตัวเองแล้วรายงานกลับสั้นๆ** ไม่ dump ข้อมูลดิบกลับมา
- **ใช้ `model: "flash"` สำหรับ Subagent งาน research** เพื่อประหยัด Token
- **Kill subagent ทันทีเมื่อได้คำตอบ:** ไม่ปล่อยค้าง

## 📑 6. Codebase Navigation Index (สารบัญโค้ด — ต้องอัปเดตทุกครั้ง)

- **ไฟล์ [`CODEBASE_INDEX.md`](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/CODEBASE_INDEX.md)** คือแผนที่หลักของโปรเจกต์
- **ก่อนเปิดไฟล์ใดๆ:** ดู Index ก่อนว่าไฟล์เป้าหมายอยู่ตรงไหน มีฟังก์ชันอะไรบ้าง บรรทัดไหน
- **ทุกครั้งที่มีการ:**
  - ✅ สร้างไฟล์ใหม่
  - ✅ ลบไฟล์
  - ✅ ย้ายไฟล์
  - ✅ เพิ่ม/ลบ/เปลี่ยนชื่อ function สำคัญ
  - ✅ เปลี่ยนโครงสร้าง directory
  
  **→ ต้องอัปเดต `CODEBASE_INDEX.md` ให้ตรงกับสถานะปัจจุบันทันที**
- **ห้าม:** ปล่อยให้ Index ล้าสมัย — ถ้า Index ผิด = Agent ต้องไล่อ่านไฟล์ใหม่ = เสีย Token ซ้ำ
- **โครงสร้าง Index:** แบ่งตาม module/feature พร้อมระบุ path, Line Anchor Registry สำหรับไฟล์แกนหลัก (>300 บรรทัด), และหน้าที่หลัก

## 🔍 7. Single-Line Pre-filter Search (ห้ามสุ่มเดาช่วงบรรทัด)

- **ห้าม:** สุ่มเปิด `view_file` ทีละ 200 บรรทัดเพื่อคลำหาฟังก์ชัน เพราะเสีย Token ไปเปล่าประโยชน์
- **ถ้าไม่รู้เลขบรรทัด:** ให้ใช้ PowerShell 1 บรรทัดยิงหา LineNumber ทันทีก่อนอ่าน:
  ```powershell
  Select-String -Path "path/to/file.tsx" -Pattern "TargetFunction|TargetSymbol" | Select-Object -First 3 LineNumber, Line
  ```
- **กิน Token เพียง ~30-50 tokens** แล้วสามารถใช้ `view_file` ไปยัง `StartLine/EndLine` ได้ตรงเป้าในครั้งเดียว 100%

## 🧪 8. Scoped Test Filter (ห้าม Dump Full Test Suite พร่ำเพรื่อ)

- **เมื่อแก้โค้ดเฉพาะจุด:** ให้รันเฉพาะไฟล์ทดสอบที่เกี่ยวข้อง เช่น:
  ```powershell
  node --test eLeave/tests/unit/specificModule.test.js
  ```
- **รัน Full Suite (`npm test`):** เฉพาะก่อน Commit สุดท้ายเพื่อยืนยัน Zero Regression เท่านั้น
- **ลด Log สะสมใน Context:** ได้นับหมื่น Tokens ต่อรอบ

## 🏆 9. Zero-Compromise Quality Invariant (ประหยัดแต่คุณภาพต้องเทียบเท่าหรือดีกว่ามาตรฐาน)

- **ไม่ตัดทอน Architecture:** การประหยัด Token ต้องไม่ตัด Type safety, Error handling, PDPA Security หรือสถาปัตยกรรม Clean Architecture
- **Response ที่กระชับและอุดมข้อมูล:** สรุปตรงประเด็น เน้นผลลัพธ์ที่เป็นรูปธรรมและ GitHub links ชี้ตรงบรรทัด (`file:///...#L123`) ไม่ Dump โค้ดยาวซ้ำในคำตอบโดยไม่จำเป็น

---

## 📊 สรุปเป้าหมาย Token Efficiency v2.0

| ปัญหา | วิธีแก้ | เป้าหมาย |
|---|---|---|
| อ่านไฟล์ซ้ำทั้งไฟล์ | Targeted View + Line Anchors | ลด Token อ่านไฟล์ 85%+ |
| คลำหาฟังก์ชันในไฟล์ใหญ่ | Single-Line Pre-filter Search | ตรงจุดใน 1 ครั้ง ไม่เสีย Token เดา |
| Context บวมจนล้น | Milestone Handoff (ทุก 3-5 tasks) | Context สะอาด ไม่เกิด Truncation |
| รันเทสต์พ่น Log บวม | Scoped Test Filter | รันเฉพาะจุดที่แตะ |
| ใช้ Model ใหญ่ทุกงาน | Smart Model Routing (Flash/Pro) | Flash สำหรับงานสแกน |
| ไม่รู้ว่าอะไรอยู่ไหน | CODEBASE_INDEX.md + Line Anchor Registry | อัปเดตผังบรรทัดทุกครั้ง |
| ลด Token จนงานหยาบ | Zero-Compromise Quality Invariant | คุณภาพมาตรฐาน Enterprise 100% |
