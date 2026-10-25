---
target: src/app/(app)/planning/page.tsx
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:G:\\My Drive\\01 Web app\\01 ระบบการลา\\src\\app\\(app)\\planning\\page.tsx"
target_fingerprint: "sha256:a8ce01ab2bc3dfd493e9828ac894cc64ccb042b0f55a4e40fd640d91180a7558"
target_path: "G:\\My Drive\\01 Web app\\01 ระบบการลา\\src\\app\\(app)\\planning\\page.tsx"
timestamp: 2026-10-25T05-48-47Z
slug: src-app-app-planning-page-tsx
---
# Design Critique: Planning Dashboard (`src/app/(app)/planning/page.tsx`)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|:-----:|-----------|
| 1 | Visibility of System Status | 2.5 | ขาด Skeleton loader ตอนสลับปีงบฯ และไม่มี Toast แจ้งเตือนเมื่อบันทึกข้อมูล |
| 2 | Match System / Real World | 3.3 | สอดคล้องกับระเบียบงบประมาณสถานศึกษาไทยดีมาก หักเล็กน้อยเรื่องศัพท์เทคนิคภาษาอังกฤษ (PAID/RESERVED) |
| 3 | User Control and Freedom | 2.2 | ใช้ `window.confirm()` แบบ native ในการยืนยันลบ และยังไม่มี Undo |
| 4 | Consistency and Standards | 2.7 | แถบเครื่องมือได้มาตรฐาน h-11 แต่ปุ่มในตารางเล็กกว่าเกณฑ์ และ Dark mode มีสีม่วงแปลกแยก |
| 5 | Error Prevention | 3.2 | ระบบสกัดกั้นการใช้เงินเกินงบ (Overspend) ทำงานได้ยอดเยี่ยม แต่ Modal ปิดได้ง่ายเกินไปเมื่อคลิกพื้นหลัง |
| 6 | Recognition Rather Than Recall | 3.0 | แสดงงบที่ใช้ได้และคำนวณยอดคงเหลือล่วงหน้าในฟอร์มเบิกจ่ายได้ชัดเจน |
| 7 | Flexibility and Efficiency | 3.2 | มีตัวกรอง "เฉพาะที่ฉันรับผิดชอบ" และปุ่มส่งออก Excel ขาดปุ่มลัดคีย์บอร์ด |
| 8 | Aesthetic and Minimalist Design | 2.3 | การกางโครงการทั้งหมดตั้งแต่เริ่มต้น (Default Expand All) ทำให้ตารางยาวเกินไปและเกิด visual noise |
| 9 | Error Recovery | 2.6 | แสดง Error banner รวมด้านบน แต่ยังขาดการชี้เป้าลงรายฟิลด์ที่กรอกผิด |
| 10 | Help and Documentation | 1.8 | ขาด Tooltip อธิบายความต่างระหว่าง "กันวงเงิน (RESERVED)" กับ "เบิกจ่ายจริง (PAID)" |
| **Total** | | **27/40** | **Acceptable (สมบูรณ์เชิงฟังก์ชัน ต้องการการขัดเกลา UX)** |

## Design Specificity Verdict

**LLM Assessment (Qualitative):**
โครงสร้างเชิงลึก (Domain Architecture) มีความเฉพาะเจาะจงกับระบบงบประมาณสถานศึกษาไทย (SODS) สูงมาก ทั้งรอบปีงบประมาณ 1 ต.ค., การควบคุมความพร้อม SAR, การโอนเกลี่ยงบประมาณ และการกันวงเงิน อย่างไรก็ตาม เปลือกนอกทางสายตายังคงใช้รูปแบบมาตรฐานของ SaaS ทั่วไป และพบการใช้คำศัพท์เทคนิคภาษาอังกฤษปะปนกับภาษาไทยราชการ

**Deterministic Scan (Automated Detector):**
- ตรวจสอบไฟล์ทั้งหมด 13 ไฟล์ในโมดูล Planning
- สแกนพบ 1 แจ้งเตือน: `gray-on-color` ใน `AttachmentManagerModal.tsx:330`
- **การพิสูจน์:** เป็น **False Positive** จาก Regex ของตัวตรวจจับ เนื่องจาก Tailwind CSS ใช้ pseudo-element `file:` แยกสไตล์ปุ่ม (`dark:file:text-blue-300` บน `dark:file:bg-blue-950` อัตราคอนทราสต์ 8.05:1 AAA) ออกจากกล่องอินพุต (`dark:text-slate-300` บน `dark:bg-gray-800` อัตราคอนทราสต์ 9.24:1 AAA)
- **สรุปทางเทคนิค:** โค้ดผ่านเกณฑ์ Contrast และ Accessibility 100% ไม่มีปัญหาการแสดงผลจริง

## Overall Impression
ระบบมีสถาปัตยกรรมทางธุรกิจและฟังก์ชันการเงินที่แข็งแกร่งมาก ป้องกันเงินรั่วไหลได้จริง แต่ขาดความประณีตในการสื่อสารกับผู้ใช้ (Micro-feedback), กล่องยืนยันแบบ Native Browser ที่ดูไม่เป็นมืออาชีพ, และการกางแถวตารางทั้งหมดตั้งแต่แรกที่ทำให้ผู้ใช้เกิด Cognitive Overload

## What's Working
1. **Real-time Settlement Delta Guard:** การคำนวณและสกัดกั้นการใช้เงินเกินงบประมาณแบบ Real-time พร้อมแสดงผลลัพธ์ล่วงหน้าใน Modal
2. **Context-Aware Quick Filters:** ปุ่ม "เฉพาะที่ฉันรับผิดชอบ" ช่วยให้ครูผู้สอนคัดกรองเฉพาะงานของตนเองได้ในคลิกเดียว
3. **SAR Readiness Triad:** การเชื่อมโยงสถานะการใช้เงินเข้ากับการประกันคุณภาพการศึกษา (เล่มโครงการ ➔ ขออนุมัติ ➔ สรุปผล SAR)

## Priority Issues
- **[P1] Jarring Browser `window.confirm()` & `window.alert()`:** มีการเรียกใช้กล่องแจ้งเตือนของเบราว์เซอร์เมื่อลบโครงการ/กิจกรรม  
  *Fix:* เปลี่ยนไปใช้ Custom Accessible `<AlertDialog>` หรือ Modal ยืนยันที่สวยงามและรองรับ Screen Reader  
  *Suggested Command:* `/impeccable polish`
- **[P1] Information Avalanche (Default Expand All):** ระบบกางกิจกรรมย่อยของทุกโครงการตั้งแต่เริ่มโหลดหน้าจอ ทำให้ตารางยาวหลายร้อยแถว  
  *Fix:* ปรับให้เริ่มต้นด้วยสถานะพับ (Collapsed) หรือกางเฉพาะโครงการที่ผู้ใช้เป็นผู้รับผิดชอบ  
  *Suggested Command:* `/impeccable distill`
- **[P2] Variable-Width Numbers & Visual Jitter:** ตัวเลขจำนวนเงินขาดคลาส `tabular-nums` ทำให้ตัวเลขในตารางไม่ตรงแนวเมื่อกวาดสายตาดู  
  *Fix:* เพิ่มคลาส `tabular-nums` และจัดตำแหน่ง Right-align ให้กับยอดเงินทั้งหมด  
  *Suggested Command:* `/impeccable typeset`
- **[P2] Missing Feedback Loop on Mutation:** การบันทึกเบิกจ่ายหรือแก้ไขโครงการทำแบบเงียบๆ ไม่มีการแสดง Toast แจ้งเตือน  
  *Fix:* เชื่อมต่อ Toast Notification (เช่น Sonner) แจ้งผลสำเร็จพร้อม Highlight แถวที่อัปเดต  
  *Suggested Command:* `/impeccable polish`
- **[P3] Sub-44px Touch Targets on Table Actions:** ปุ่มไอคอนแก้ไข/ลบในตารางมีพื้นที่แตะเพียง ~28px ทำให้กดยากบนแท็บเล็ต/iPad  
  *Fix:* ขยาย Touch Target ให้ได้อย่างน้อย 44×44px ตามมาตรฐาน SODS  
  *Suggested Command:* `/impeccable adapt`

## Persona Red Flags
- **Alex (Planning Officer / Power User):** รำคาญที่ต้องเลื่อนหน้าจอผ่านหลายร้อยแถวกิจกรรมที่กางออกทั้งหมด และไม่มีคีย์บอร์ดชอร์ตคัต
- **Jordan (Teacher / First-Timer):** สับสนว่าตนเองควรเลือก "กันวงเงิน" หรือ "เบิกจ่ายจริง" เพราะไม่มีคำอธิบายระเบียบพัสดุประกอบ และกังวลเมื่อกดบันทึกแล้วหน้าต่างปิดเงียบไป
- **Sam (A11y User):** ปุ่มกางตารางขาด `aria-expanded` และ Progress Bar ขาด `role="progressbar"` พร้อม `aria-valuenow`

## Minor Observations
- การกรอกมาตรฐานการศึกษา (SAR Tags) เป็นกล่อง Text ธรรมดาที่เสี่ยงต่อการสะกดผิด ขาดตัวเลือกอัตโนมัติ (มฐ.1, มฐ.2, มฐ.3)
- ใน Dark mode มีการใช้สีม่วง (`bg-purple-950/60`) กับรหัสโครงการ ซึ่งหลุดออกจากโทนหลัก Slate/Blue

## Questions to Consider
1. ควรแยกมุมมองแบบง่าย "รายการของฉัน (My Expenses)" ให้ครูผู้สอนทั่วไปเพื่อลดความซับซ้อนของตารางภาพรวมโรงเรียนหรือไม่?
2. ควรเพิ่มขั้นตอน "การตรวจสอบรับรองการเบิกจ่าย (Audit Cleared)" เพื่อให้เจ้าหน้าที่การเงินตรวจสอบบิลก่อนตัดงบสำเร็จหรือไม่?
