---
trigger: glob
globs: "src/**, lib/**"
description: "Clean architecture, service layer decoupling, repository patterns, strong typing, and modular boundaries."
---

# 🏗️ Architecture & Clean Code Rules

> **บังคับใช้เมื่อ:** ออกแบบหรือแก้ไขโครงสร้างระบบ, Services, Repositories, Server Actions, หรือ Utility Functions ในโปรเจกต์ KP e-Leave

---

## 1. Layered Architecture & Separation of Concerns

ระบบ KP e-Leave ยึดสถาปัตยกรรม 3 ชั้นแบบแยกส่วนชัดเจน:
1. **Presentation / Interface Layer (`src/app/`):**
   - Next.js Server Components, Client Components (`_components/`), และ Route Handlers
   - มีหน้าที่รับ input, ตรวจสอบ session, เรียก Server Actions/Services และแสดงผล UI
   - **ห้าม:** ใส่ business logic หรือ direct DB transaction ที่ซับซ้อนไว้ใน UI Component
2. **Domain / Service Layer (`src/services/`, `lib/services/`):**
   - รวม Business Logic, กฎการอนุมัติการลา, การคำนวณวันลาคงเหลือ, และการแปลงสถานะ
   - แต่ละ Service มีหน้าที่เดี่ยว (Single Responsibility) และสามารถทดสอบแบบ Unit Test ได้โดยไม่ต้องต่อ DB จริง
3. **Data Access / Repository Layer (`src/repositories/`, `prisma/`):**
   - รับผิดชอบการติดต่อกับ PostgreSQL ผ่าน Prisma Client
   - รวมการ Query ที่ใช้ซ้ำ, Transaction Management, และ Pagination

---

## 2. Server Action Best Practices

- **Lean Server Actions:** ให้ Server Action ทำหน้าที่เป็น Adapter สั้นๆ:
  1. ตรวจสอบสิทธิ์ผู้ใช้ (`auth()`, RBAC)
  2. Validate Input ด้วย Zod Schema
  3. เรียกใช้ Service ฟังก์ชันเพื่อประมวลผล
  4. เรียก `revalidatePath` หรือ `revalidateTag` เฉพาะ path ที่จำเป็น
  5. ส่งผลลัพธ์กลับในรูป `{ success: true, data }` หรือ `{ success: false, error }`
- **ห้าม:** ละเลย Error Handling — ทุก Server Action ต้องมี `try / catch` ที่ปลอดภัย ไม่พ่น internal error stack trace ออกไปยัง client

---

## 3. Strict Type Safety & No `any`

- ใช้ TypeScript อย่างเคร่งครัด ห้ามใช้ `any` หรือ `@ts-ignore` เพื่อเลี่ยงปัญหา Type
- โมเดลและ Type กลางต้องกำหนดไว้ใน `src/types/` หรือได้มาจากการ Export ของ Prisma Client
- ฟังก์ชันระดับ Service และ Utility ต้องระบุ Type ของ Parameters และ Return Type เสมอ

---

## 4. Event-Driven Decoupling (Non-blocking Operations)

- การส่งแจ้งเตือน (Notifications), LINE Messaging API, และ Audit Logging ต้องไม่ขัดขวาง (Non-blocking) กระบวนการหลักของการทำธุรกรรม
- ใช้ Background Tasks หรือ Asynchronous Dispatch สำหรับการส่งข้อความภายนอก เพื่อไม่ให้ผู้ใช้ต้องรอ Network Latency
