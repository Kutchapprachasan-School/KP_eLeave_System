# Session Handoff & Architectural Rulebook (v3.1 / Rev. 1)

## 1. Strict Deployment Principles (Google Drive Safe)
- **Active Branch:** พัฒนาและทดสอบบนกิ่ง `dev` เสมอ ห้าม commit ลง `main` โดยตรง
- **Zero-Switch Deployment:** เพื่อป้องกันปัญหา `.git/index.lock` ค้างจากการ Sync ของ Google Drive และป้องกัน Turbopack Cache พัง **ห้ามสั่ง `git checkout main` เพื่อสลับไฟล์ในเครื่อง** ให้ส่งโค้ดขึ้น Production จากกิ่ง `dev` โดยตรงตามลำดับนี้:
  1. `npm run index:sync` (อัปเดตสารบัญโค้ดและ commit ให้เรียบร้อย)
  2. `git push origin dev`
  3. `git push origin dev:main` (ดันโค้ดจาก `dev` เข้า `main` บน Remote โดยที่เครื่องยังอยู่กิ่ง `dev` เพื่อให้ Vercel Build และให้ GitHub Actions Mirror ไปยัง `school/main`)

## 2. Core Subsystems Map
1. **ระบบวันลา (`/dashboard`, `/request`):** คำนวณวันลา ตรวจสอบโควตา และลำดับการอนุมัติ
2. **ระบบจองยานพาหนะและสถานที่ (`/facility`):** ตรวจสอบตารางเวลาซ้ำซ้อนและผู้อนุมัติ
3. **ระบบงบประมาณและสมุดบัญชีย่อย (`/budget`):** อิงตาม ADR-001 (Simplified Disbursement & Clone Engine)
4. **ระบบออกเลขและทะเบียนหนังสือราชการ (`/document`):** รันเลขทะเบียนอัตโนมัติป้องกันเลขซ้ำ

## 3. Specialized Rule Pointers (Single Source of Truth)
- **โครงสร้าง 3-Layer & Server Actions:** ดูที่ `.agent/rules/architecture.md`
- **Database Locking, Transaction & Soft-Delete:** ดูที่ `.agent/rules/database.md`
- **Next.js 16 Boundary, Serialization & UI:** ดูที่ `.agent/rules/frontend.md` และ `docs/handoff/UI_UX_DESIGN_SYSTEM_GUIDE.md`
- **Zero Trust Auth, RBAC & PDPA:** ดูที่ `.agent/rules/security.md`
- **การประหยัด Token & การใช้ `CODEBASE_INDEX.md`:** ดูที่ `.agent/rules/token-efficiency.md`
- **การกำกับ Version แผนงาน:** ดูที่ `.agent/rules/plan-versioning.md`
