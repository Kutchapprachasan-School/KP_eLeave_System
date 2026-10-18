<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 🤖 AGENTS.md — Master Control & Rule Router (v3.1)

ไฟล์นี้คือศูนย์กลางคำสั่งหลักของระบบบริหารจัดการสถานศึกษา (SODS: ระบบการลา `/request`, จองสถานที่/ยานพาหนะ `/facility`, งบประมาณ `/budget`, และทะเบียนหนังสือราชการ `/document`) AI Agent ทุกตัวต้องปฏิบัติตามขั้นตอนและตารางอ้างอิงนี้โดยไม่มีข้อยกเว้น

---

## ⚡ 1. The 5-Step Execution Workflow (ลำดับการทำงานบังคับ)

1. **🔍 Locate First (`CODEBASE_INDEX.md`):**
   - ห้ามเปิดอ่านไฟล์ที่มีขนาดเกิน 100 บรรทัดแบบเต็มไฟล์ รวมถึงห้ามเปิด `prisma/schema.prisma` ทั้งไฟล์
   - เปิดดูพิกัด `[Lเริ่ม-Lจบ]` ใน `CODEBASE_INDEX.md` ก่อนเสมอ แล้วใช้ `StartLine` และ `EndLine` เจาะอ่านเฉพาะจุด
2. **📝 Plan & Version:**
   - ทุกแผนงาน (`implementation_plan.md`) และเอกสาร ADR ต้องระบุเลข Version (`v1.0 / Rev. 0`) และตาราง Revision History ตามกฎ `.agent/rules/plan-versioning.md`
3. **🛠️ Develop on `dev` (3-Layer Architecture):**
   - เขียนโค้ดบนกิ่ง `dev` เท่านั้น
   - แยกชั้น `Presentation (Server/Client)` -> `Domain/Service` -> `Data Access/Repository` อย่างเคร่งครัด ห้ามใช้ `any` หรือ `@ts-ignore`
4. **🔄 Verify & Auto-Sync Index (`npm run index:sync`):**
   - คำสั่ง Terminal ที่ให้ผลลัพธ์เกิน 50 บรรทัด (`npm test`, `npm run build`) ต้อง Redirect ลง `scratch/[task-name]-[timestamp].log` แล้วเจาะอ่านเฉพาะบรรทัดที่เกิด Error
   - **ทันทีที่แก้ไข เพิ่ม หรือลบโค้ด/Schema เสร็จ บังคับรัน `npm run index:sync` ทุกครั้ง** ห้ามนับหรือแก้เลขบรรทัดใน `CODEBASE_INDEX.md` ด้วยตัวเองเด็ดขาด
5. **🚀 Zero-Switch Deploy & Milestone Handoff:**
   - **เมื่อครบ 3–5 งานย่อย หรือครบ 15 tool calls:** ให้ตัดจบงานและสรุปส่งต่อด้วยสกิล `.agent/skills/handoff/SKILL.md` ทันที
   - **เมื่อสั่ง Deploy:** ห้ามสั่ง `git checkout main` (เพื่อป้องกัน Google Drive ล็อกไฟล์ `.git/index.lock` และป้องกัน Turbopack พัง) ให้รันคำสั่งจากกิ่ง `dev` ตามลำดับนี้เท่านั้น:
     ```bash
     npm run index:sync
     git add . && git commit -m "<commit-message>"
     git push origin dev
     git push origin dev:main
     ```

---

## 🧭 2. Specialized Rules Routing Table (Single Source of Truth)

เมื่อต้องทำงานเกี่ยวข้องกับหมวดใด ให้เปิดอ่านไฟล์กฎเฉพาะทางตามตารางนี้ก่อนลงมือเสมอ:

| หมวดงาน / ขอบเขต | ไฟล์กฎที่ต้องอ้างอิง (Path) | กฎเหล็กสำคัญ (Key Invariants) |
| :--- | :--- | :--- |
| **ภาพรวมระบบ & Pipeline** | `.agent/rules/handoff.md` | แผนผัง 4 Subsystems, ขั้นตอน Zero-Switch Git Deployment |
| **การประหยัด Token & Subagent** | `.agent/rules/token-efficiency.md` | Targeted View, Scratchpad Redirect (`scratch/`), Ephemeral Subagent (Flash) |
| **โครงสร้างโค้ด & Server Action** | `.agent/rules/architecture.md` | 3-Layer Architecture, Lean Server Actions (Auth -> Zod -> Service -> Revalidate) |
| **ฐานข้อมูล & Prisma** | `.agent/rules/database.md` | `$transaction`, `SELECT ... FOR UPDATE NOWAIT` (เรียง PK น้อยไปมาก), ดัก `P2003` ทำ Soft-Delete (`RETIRED`) |
| **ความมั่นคงปลอดภัย & PDPA** | `.agent/rules/security.md` | Zero Trust (`auth()` บน Server เท่านั้น), RBAC 5 ระดับ, คุ้มครองข้อมูลใบรับรองแพทย์ |
| **ข้อมูลทดสอบ & ความปลอดภัย DB** | `.agent/rules/test-data-and-account-safety.md` | ห้ามทิ้ง Test Account ใน DB จริง, ใช้ Transactional Rollback Test, ห้ามสั่ง `DISABLE TRIGGER USER` |
| **Frontend & Next.js 16** | `.agent/rules/frontend.md` | Server Component Default, Serialize `Decimal`/`BigInt`/`Date` ก่อนข้าม Boundary, Hydration-safe `isMounted` |
| **มาตรฐาน UI/UX สถานศึกษา** | `docs/handoff/UI_UX_DESIGN_SYSTEM_GUIDE.md` | โทนสี Indigo/Slate/Emerald, ปุ่ม/Input สูง `h-11` (44px), การ์ด Glassmorphism ทึบแสงอย่างน้อย `bg-white/90` |
| **การกำกับ Version แผนงาน** | `.agent/rules/plan-versioning.md` | กำกับ `vX.Y (Rev. Z)` พร้อมตาราง Added / Changed / Removed |
| **การเขียนสรุปส่งต่องาน** | `.agent/skills/handoff/SKILL.md` | โครงสร้างบันทึก Handoff มาตรฐาน 5 ส่วนเมื่อจบ Milestone |

---

## 🚫 3. Absolute Red Lines (ข้อห้ามเด็ดขาด)

1. **ห้ามรัน `prisma migrate reset`** หรือคำสั่งทำลายข้อมูลบนฐานข้อมูลทุกกรณี
2. **ห้ามแก้ไขไฟล์ `CODEBASE_INDEX.md` ด้วยมือ** ต้องอัปเดตผ่านคำสั่ง `npm run index:sync` เท่านั้น
3. **ห้ามสลับกิ่งไป `main` (`git checkout main`)** ใน Working Tree บน Google Drive ให้ใช้ `git push origin dev:main` เสมอ
4. **ห้าม Commit โฟลเดอร์ `scratch/`** หรือทิ้งบัญชีทดสอบค้างไว้ในฐานข้อมูลจริง
5. **ห้ามส่งค่า `Decimal` หรือ `BigInt` ดิบ** ข้ามจาก Server Component/Action ไปยัง Client Component โดยไม่ผ่านการแปลงค่า
