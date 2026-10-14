---
trigger: glob
globs: "prisma/**, src/repositories/**, src/services/**, src/app/actions/**, lib/services/**"
description: "Database integrity, Prisma transactions, zero orphaned accounts, and data safety rules."
---

# 🗄️ Database Safety & Persistence Rules

> **บังคับใช้เมื่อ:** แก้ไขโค้ดที่แตะ `prisma`, `schema.prisma`, Repository, Service หรือ Server Action ที่มีการ Query/Mutate ฐานข้อมูล

## 1. Zero Orphaned Test Accounts (เด็ดขาด 100%)
- **ห้ามสร้างบัญชีทดสอบตกค้างในฐานข้อมูลจริงเด็ดขาด**
- **ห้ามใส่โค้ดสร้าง User ทดสอบลงใน `npm test` ปกติ**
- หากมีการรันชุดทดสอบเฉพาะกิจที่แตะ DB ต้องมี `after()` hook ทำการ cascade teardown และปิด trigger (`DISABLE TRIGGER USER;`) ก่อนล้างข้อมูลทุกตารางที่เกี่ยวข้อง และลบ `User` ทดสอบออกให้หมด 100%
- ตรวจสอบความสะอาดเสมอ: `WHERE email LIKE '%test%' OR name LIKE '%ทดสอบ%' = 0`

## 2. Transaction Integrity (ธุรกรรมที่สมบูรณ์)
- หากมีการเปลี่ยนแปลงข้อมูลที่เกี่ยวข้องกันมากกว่า 1 ตาราง (Multi-table mutation) ให้ใช้ `prisma.$transaction([ ... ])` หรือ Interactive Transaction เสมอ เพื่อป้องกันข้อมูลกำพร้าหรือ Data Corruption

## 3. Targeted Schema Inspection (การตรวจสอบ Schema)
- ห้ามเปิดไฟล์ `prisma/schema.prisma` ทั้งไฟล์ (มีมากกว่า 3,200 บรรทัด)
- ให้ดูเลขบรรทัดจาก **Line Anchor Registry** ใน `CODEBASE_INDEX.md` แล้วใช้ `view_file` เจาะดูเฉพาะ Model ที่เกี่ยวข้องเท่านั้น

## 4. Migration & Production Safety
- ห้ามสั่ง `prisma migrate reset` บน Production หรือฐานข้อมูลหลักของโรงเรียนเด็ดขาด
- การแก้ไขฟิลด์ใน Schema ต้องคำนึงถึง Backward Compatibility เสมอ (ใช้ Default value หรือ Optional field)
- หลีกเลี่ยงการเปลี่ยน Schema หากสามารถแก้ปัญหาในระดับ Application logic ได้
