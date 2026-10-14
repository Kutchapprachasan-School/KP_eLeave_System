<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# KP e-Leave Production & Agent Orchestration Guide

## 1. Core Invariants (กฎเหล็กที่ไม่เปลี่ยนแปลง)
- **Zero Orphaned Test Accounts:** ห้ามสร้างบัญชีทดสอบตกค้างในฐานข้อมูลเด็ดขาด (`WHERE email LIKE '%test%' OR name LIKE '%ทดสอบ%' = 0`). ห้ามแตะ/ลบบัญชีจริงของโรงเรียนเด็ดขาด รายละเอียด: [.agent/rules/database.md](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/.agent/rules/database.md)
- **Git Branch:** ทำงานบนกิ่ง `dev` เท่านั้น ห้าม commit เข้า `main` โดยตรง
- **Zero Quality Compromise:** การประหยัด Token ต้องไม่ลดทอนคุณภาพโค้ดระดับ Production (Type safety, Error handling, Security, UI fidelity)

## 2. 7-Step Risk-Adjusted Execution Protocol (กระบวนการทำงานตามความเสี่ยง)
1. **Classify Scope & Risk:** ประเมินขอบเขต ความเสี่ยง และโมดูลที่เกี่ยวข้อง กำหนด Acceptance Criteria ชัดเจนก่อนแตะโค้ด
2. **Search-First & Callers Check:** ใช้ Single-line search หาจุดนิยามและ Caller เสมอ เลขบรรทัดใน `CODEBASE_INDEX.md` ถือเป็นพิกัดอ้างอิงคร่าวๆ (Hints)
3. **Read-Minimum with Dependencies:** อ่านโค้ดเป้าหมายพร้อม Import, Type และ Context ที่จำเป็น ไม่ตัดอ่านเฉพาะส่วนจนเสียความเข้าใจ
4. **Surgical Modification:** แก้ไขด้วย `replace_file_content` เฉพาะบล็อกที่เปลี่ยนจริง อนุรักษ์ comments เดิม 100%
5. **Risk-Adjusted Verification:** รันชุดทดสอบตาม Test Pyramid (Scoped Unit -> Typecheck -> Full Suite) หากพบ Error เดิมซ้ำ 2 ครั้ง ให้หยุดวิเคราะห์ Root Cause ทันที
6. **Update Stable Index & Ledger:** อัปเดต `CODEBASE_INDEX.md` หากมีโครงสร้างเปลี่ยน และบันทึกผลงานลง `.agent/ledger/token-ledger.json`
7. **Trigger-Based Handoff:** พิจารณา Handoff เมื่อบริบทใกล้เต็ม, พฤติกรรมเริ่มวนซ้ำ, หรือจบ Milestone สำคัญ ไม่บังคับตามจำนวนตัวเลขตายตัว

## 3. Modular Rules Index (โหลดเฉพาะเรื่องที่เกี่ยวข้อง)
- **Database & Prisma:** [.agent/rules/database.md](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/.agent/rules/database.md)
- **Architecture & Services:** [.agent/rules/architecture.md](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/.agent/rules/architecture.md)
- **Security & RBAC & PDPA:** [.agent/rules/security.md](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/.agent/rules/security.md)
- **Frontend & App Router UI:** [.agent/rules/frontend.md](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/.agent/rules/frontend.md)
- **Token Efficiency & Budgeting:** [.agent/rules/token-efficiency.md](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/.agent/rules/token-efficiency.md)
- **Forensic Teardown Safety:** [.agent/rules/test-data-and-account-safety.md](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/.agent/rules/test-data-and-account-safety.md)
