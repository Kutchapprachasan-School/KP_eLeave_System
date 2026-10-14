---
trigger: glob
globs: "src/app/actions/**, src/app/api/**, src/services/**, lib/auth/**, middleware.ts"
description: "Security invariants, RBAC authorization, session validation, Zod input validation, audit logging, and PDPA privacy."
---

# 🛡️ Security, Authorization & Privacy Rules

> **บังคับใช้เมื่อ:** แก้ไขหรือสร้าง Server Actions, API Route Handlers, Middleware, Auth Handlers, หรือฟังก์ชันที่เกี่ยวข้องกับข้อมูลส่วนบุคคลและสิทธิ์การใช้งาน

---

## 1. Zero Trust Session Validation

- **ห้ามเชื่อถือ Client-Side Identity:** ห้ามรับ `userId` หรือ `role` จาก Client Payload โดยตรง
- **บังคับ:** ดึง session ปัจจุบันจาก Server Context ผ่าน `auth()` หรือ Session Validator ทุกครั้งใน Server Action และ API Route:
  ```typescript
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized: กรุณาเข้าสู่ระบบก่อนดำเนินการ' };
  }
  ```

---

## 2. Role-Based Access Control (RBAC)

- สิทธิ์ในระบบประกอบด้วย:
  - `TEACHER`: ดูข้อมูลตนเอง, ยื่นใบลา, ดูสถานะใบลาตนเอง
  - `DEPARTMENT_HEAD`: อนุมัติเบื้องต้นระดับกลุ่มสาระ/ฝ่าย
  - `DEPUTY_DIRECTOR` / `DIRECTOR`: อนุมัติขั้นสุดท้าย, ดูภาพรวมผู้บริหาร (Executive Dashboard)
  - `ADMIN`: จัดการโครงสร้างองค์กร, ผู้ใช้, สิทธิ์, และ System Defaults
- ก่อนแก้ไขหรือดึงข้อมูลที่ละเอียดอ่อน ต้องตรวจสอบสิทธิ์ทุกครั้ง (Fail-Closed Principle)

---

## 3. Strict Input Validation (Zod)

- ทุกข้อมูลที่รับเข้ามาจากภายนอก (Request Body, Query Parameters, Form Data) ต้องผ่านการ Validate ด้วย **Zod Schema** ก่อนส่งต่อให้ Service หรือ Database
- ป้องกัน Injection Attacks (SQL/Prisma Injection, XSS) และปฏิเสธข้อมูลที่ไม่อยู่ใน Whitelist ทันที

---

## 4. Audit Logging for Sensitive Operations

- การกระทำสำคัญต่อไปนี้ต้องบันทึก Audit Log เสมอ:
  - การอนุมัติ / ปฏิเสธ / ยกเลิกใบลา
  - การแก้ไขสิทธิ์ผู้ใช้ หรือตั้งค่าระบบ
  - การเปลี่ยนแปลงโควตาวันลา หรือประวัติย้อนหลัง
- ข้อมูล Audit Log ต้องระบุ `actorId`, `actionType`, `targetId`, `timestamp`, และ `metadata`

---

## 5. PDPA & Data Privacy (การคุ้มครองข้อมูลส่วนบุคคล)

- ข้อมูลประวัติการรักษาพยาบาล ใบรับรองแพทย์ เลขประจำตัวประชาชน และเบอร์โทรศัพท์ เป็นข้อมูลส่วนบุคคลที่มีความอ่อนไหว (Sensitive Data)
- **ห้าม:** ส่งข้อมูลเหล่านี้ออกทาง API ที่ไม่มีการยืนยันตัวตน หรือพ่นลงใน Client Logs / Console
- ลิงก์แนบไฟล์ใบรับรองแพทย์ต้องมี Time-Limited Signed URL หรือผ่าน Route ที่ตรวจสอบสิทธิ์การเป็นเจ้าของหรือผู้มีอำนาจอนุมัติเท่านั้น
