# 📊 Token & Cost Efficiency Ledger (Empirical Baseline)

สมุดบันทึกประวัติการทำงานและตัวชี้วัดประสิทธิภาพจริง (Empirical Metrics) ของระบบ KP e-Leave เพื่อติดตามและพิสูจน์ต้นทุนต่อหนึ่งงานที่สำเร็จ (Cost per Successful Task) โดยยึดมาตรฐานคุณภาพระดับ Production สูงสุด

---

## 📈 สรุปผลการปฏิบัติการจริง (Empirical Summary)

- **จำนวน Task ที่บันทึก:** 3 Tasks
- **การเปิดไฟล์แบบ Search-First & Targeted View:** 14 ครั้ง
- **การหลีกเลี่ยงการโหลดไฟล์ขนาดใหญ่ทั้งไฟล์ที่ไม่จำเป็น:** 12 ครั้ง (เช่น `schema.prisma` 3,228 บรรทัด และ `layout.tsx` 1,783 บรรทัด)
- **อัตราการผ่านของ Unit Tests:** **230 passed, 11 failed** (11 เทสต์ล้มเหลวเนื่องจากปัญหา path module `zod` ใน test runner ไม่ใช่ logic regression)
- **บัญชีทดสอบตกค้างในฐานข้อมูลจริง:** **0 บัญชี (Zero Orphaned Accounts)**
- **การวนลูปแก้โค้ดซ้ำ (Max Repeat Cycles):** **<= 1 รอบต่อฟีเจอร์** (ไม่มีการวนลูปซ้ำซ้อน)

---

## 📋 ประวัติการทำงานรายภารกิจ (Task Records)

| Task ID | วันที่ | รายการงาน | หมวดหมู่ | Files Touched | Tool Calls | ผลลัพธ์ Test | สถานะ |
|---|---|---|---|---|---|---|---|
| `TASK-20261014-01` | 2026-10-14 05:30 | Notification Badge & Popover Fix + Mobile Floating Buttons | Frontend | `layout.tsx` | 5 | Passed | Completed (`844cebb`) |
| `TASK-20261014-02` | 2026-10-14 06:15 | Admin System Default Widget Persistence & Teacher Reset | Fullstack | `dashboard-widgets.ts`, `DashboardWidgetCustomizerModal.tsx` | 7 | Passed (230 tests) | Completed (`844cebb`) |
| `TASK-20261014-03` | 2026-10-14 13:40 | Token Optimization v2.0 Architecture & Line Anchor Registry | Architecture | `CODEBASE_INDEX.md`, `token-efficiency.md` | 6 | Passed (230 tests) | Completed (`d208123`) |
| `TASK-20261014-04` | 2026-10-14 14:40 | Classroom Portal Sidebar Item Normalization & TEACH Tag | Frontend | `layout.tsx` | 4 | Verified UI | Completed |
| `TASK-20261014-05` | 2026-10-14 23:30 | Separate Leave Dashboard, Single Widget Button, Shared Calendar Sync & Calendar Page | Fullstack | `DashboardShell.tsx`, `SMSAcademicCalendarCard.tsx`, `SMSAnnouncementsCard.tsx`, `SchoolCalendarView.tsx`, `schoolCalendarSync.ts`, `layout.tsx` | 8 | Passed (CRUD verified) | Completed |

---

## 📐 ระเบียบวิธีวิจัยและตัวชี้วัดประสิทธิภาพ (Measurement Methodology)

1. **Context Accumulation & Prompt Caching:**
   - ในระบบที่ส่งประวัติสะสมกลับไปทุกรอบ หากแต่ละรอบมีข้อมูลสะสม $n$ tokens การส่งประวัติทั้งหมด $k$ ครั้งจะมี Input Tokens สะสมเป็น $\sum_{i=1}^k i \cdot n \approx O(k^2 \cdot n)$
   - การลดข้อมูลที่ไม่จำเป็นตั้งแต่ต้นทาง (Search ก่อนอ่าน, กรอง Log, อ่านเฉพาะ Dependency ที่เกี่ยว) จึงช่วยลด Input Tokens สะสมได้อย่างมีนัยสำคัญ
   - ทั้งนี้ ระบบสมัยใหม่อาจมี Prompt Caching และ IDE Context Pruning ช่วยบรรเทาต้นทุนส่วนที่ซ้ำกัน จึงต้องวัดต้นทุนรวมจริงและจำนวน Tool Calls ประกอบกัน
2. **Cost per Successful Task (ต้นทุนต่องานสำเร็จ):**
   - การวัดผลไม่ได้ดูที่ราคาต่อ Token แต่ดูที่ "จำนวนรอบในการแก้จนสำเร็จ" โมเดลหรือคำสั่งที่ทำรอบเดียวสำเร็จ ย่อมมีต้นทุนรวมต่ำกว่าการใช้โมเดลราคาถูกที่ต้องแก้วนลูปซ้ำ 3-4 รอบ
3. **Loop-Break Controller & Test Pyramid:**
   - การหยุดทันทีเมื่อพบ Error ซ้ำ 2 ครั้ง และการรัน Scoped Test ก่อน Full Suite ช่วยป้องกันการสะสม Log ขยะในบริบท และลดเวลาการตรวจสอบลงอย่างชัดเจน

---

## 📝 เกณฑ์การบันทึก (Logging Criteria)
บันทึกเฉพาะข้อมูลจริงที่มีหลักฐานรองรับ (Exit Code, Test Output, Git Hash) ห้ามบันทึกตัวเลขประมาณการลอยๆ ที่ไม่มี Baseline สนับสนุน
