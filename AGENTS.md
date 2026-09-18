<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# KP e-Leave Production & Database Safety Rules

## 1. Zero Orphaned Test Accounts (ห้ามสร้างบัญชีทดสอบตกค้างในฐานข้อมูล)
- **บุคลากรจริงในระบบมี 76 ท่านเท่านั้น (สร้าง ก.ค. 2569)** ห้ามลบหรือแก้ไขบัญชีจริงเหล่านี้เด็ดขาด
- **ห้ามปล่อยให้มีบัญชีทดสอบหลงเหลือในตาราง `User` เด็ดขาด**:
  - ห้ามใส่การทดสอบที่มีการเขียนข้อมูลลง Live Database (เช่น `prisma.user.create/upsert`, `INSERT INTO "User"`) ไว้ใน `npm test` ปกติ
  - หากมีการรันชุดทดสอบเฉพาะกิจที่แตะ Database ต้องมี `after()` hook ทำการ cascade teardown และปิด trigger (`DISABLE TRIGGER USER;`) ก่อนล้างข้อมูลทุกตารางที่เกี่ยวข้อง และลบ `User` ทดสอบออกให้หมด 100%
  - รายละเอียดและขั้นตอนมาตรฐาน ดูใน [.agent/rules/test-data-and-account-safety.md](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/.agent/rules/test-data-and-account-safety.md)

## 2. Git & Deployment Pipeline (กฎการพัฒนาและการขึ้น Production)
- พัฒนาและทดสอบบนกิ่ง `dev` เท่านั้น ห้าม commit ตรงเข้า `main`
- ตรวจสอบยอดบุคลากรใน Database เสมอก่อนส่งมอบงาน ต้องมี 76 คนเท่าเดิมเสมอ (`SELECT count(*) FROM "User" = 76`)
