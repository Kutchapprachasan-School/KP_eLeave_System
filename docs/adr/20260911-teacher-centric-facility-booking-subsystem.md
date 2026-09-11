# ADR-20260911: Teacher-Centric Facility & Vehicle Booking Subsystem (v7.3)

## Status
APPROVED - 2026-09-11

## Context & Problem Statement
ระบบจองทรัพยากรโรงเรียนกุดจับประชาสรรค์เดิมมีฐานข้อมูลและการป้องกัน Concurrency ที่แข็งแกร่ง (Row-level Locking, Postgres `tstzrange` Exclusion Constraints, 2-Tier Approval Workflow) แต่มีปัญหาสำคัญด้าน **User Experience (UX) สำหรับครูผู้ใช้งาน**:
1. **ความซับซ้อนเกินจำเป็น**: หน้าจออัดแน่นด้วย 4 แท็บ (`CATALOG`, `CRUD`, `TIMELINE`, `APPROVALS`) ทำให้ครูทั่วไปสับสนและเห็นเครื่องมือที่ไม่เกี่ยวกับบทบาทตนเอง
2. **ขาดการแสดงผลคิวว่างจริง (Lack of Visual Availability Matrix)**: แท็บไทม์ไลน์เดิมเป็นเพียงการ์ดยาวๆ ไม่เห็นช่วงเวลาว่าง 08:00 - 17:00 น. ครูต้องเดากรอกเวลาในฟอร์มเอง
3. **ฟอร์มจองเทอะทะ**: บังคับกรอกรายละเอียดเสริมพร้อมกัน ทำให้การจองล่าช้า
4. **สิ่งแปลกปลอมด้านเทคนิค (Technical Debt)**: มีการใช้ Browser Native Dialogs (`alert()`, `confirm()`, `prompt()`) และหน้า `/facility/settings` ยังเป็น Mock State แยกต่างหาก

## Decisions

### 1. Two-Pillars Architecture (โฟกัส 2 เสาหลัก)
- ปรับระบบให้เน้น 2 ทรัพยากรหลักของโรงเรียน ได้แก่:
  1. **🏢 ห้องประชุมและอาคารสถานที่ (`MEETING_ROOM`)**
  2. **🚐 รถโรงเรียนและยานพาหนะ (`VEHICLE`)**
- ใช้ Top-Level Segmented Pill Switcher สลับระหว่าง 2 เสาหลักได้อย่างราบรื่นโดยไม่ต้องรีโหลดหน้าเว็บ

### 2. Role-Adaptive Navigation Structure (UX Layer Only)
- Role-Adaptive UI ทำหน้าที่เป็น UX Layer เท่านั้น ไม่ใช่ Security Layer โดย Server Actions ยังคงตรวจ RBAC อย่างเข้มงวดทุกจุด
- **สำหรับครูทั่วไป (Teacher)**: แสดงเฉพาะ 2 แท็บหลักเพื่อความสบายตาและใช้งานง่าย:
  1. `📅 ปฏิทินตารางคิว & จองทันใจ`: ตาราง Matrix แสดงห้อง/รถ เทียบกับช่วงเวลา 08:00 - 17:00 น. พร้อมคลิกจองใน 1 วินาที
  2. `📑 ประวัติคำขอของฉัน (My Bookings)`: รวมคำขอที่ตนเองยื่น แสดงสถานะ (รอตรวจสอบ / รอ ผอ.อนุมัติ / อนุมัติแล้ว), พิมพ์ A4 เอกสารขอใช้, และปุ่มยกเลิกคำขอ
- **สำหรับผู้ดูแล/หัวหน้าฝ่าย/ผอ. (Head of Facility, Head of Vehicle, Director, Admin)**: แสดงแท็บเพิ่มเติมตามสิทธิ์:
  3. `🛡️ ศูนย์พิจารณาอนุมัติ (Approval Hub)`: จัดสรรรถ/คนขับ (Step 1) และ ผอ.อนุมัติ (Step 2)
  4. `⚙️ จัดการทรัพยากรส่วนกลาง (CRUD & ตั้งค่า)`: ปรับแต่งห้อง/รถ เพิ่ม/ลด/สลับสถานะการซ่อมบำรุง โดยเชื่อมต่อกับฐานข้อมูลจริง 100%

### 3. Visual School Schedule Matrix (ตารางคิว 08:00 - 17:00 น. & Viewport Rule)
- **Schedule Matrix เป็น View Only**: DB Transaction + Row Locking + PostgreSQL Exclusion Constraint เป็น Final Authority เสมอ ปฏิทินช่วยเลือกเวลาแต่ไม่ได้การันตี slot ถ้าชนกันขณะ submit จะมี Toast แจ้งเตือนชัดเจนและรีเฟรชข้อมูลทันที
- **PENDING Blocks the Slot**: คำขอสถานะ `PENDING` ถือว่า **ไม่ว่าง** และห้ามกดจองซ้อนบน Matrix (ระบายสีส้มลายทแยง "⏳ มีผู้ยื่นจองแล้ว")
- **Matrix เป็น Viewport ไม่ใช่ Boundary**: รองรับการจองที่คร่อมหรือเกิน 17:00 น. (เช่น 16:30 - 19:00 น.) โดยบล็อกจะระบายยาวและแสดงป้ายเวลากำกับชัดเจน
- **Lightweight Cell DOM**: ออกแบบ Cell ให้เบา ไม่ยัดเยียดปุ่มหนักทุกช่อง เพื่อรองรับทรัพยากรหลายรายการได้อย่างลื่นไหล

### 4. Simplified Quick Booking Modal with Collapsible Advanced Options
- ส่วนหลัก (จำเป็น): เลือกห้อง/รถ, ชื่องาน/วัตถุประสงค์, วันที่และเวลาเริ่มต้น-สิ้นสุด, จำนวนผู้เข้าร่วม/ปลายทาง
- ส่วนตัวเลือกเพิ่มเติม (พับเก็บได้ - Collapsible Accordion): การจัดโต๊ะเก้าอี้, อุปกรณ์โสตฯ, รายชื่อครู/นักเรียนร่วมเดินทาง เพื่อไม่ให้รกสายตาครู

### 5. My Bookings Session Identity Enforcement (Anti-IDOR)
- แท็บ `MY_BOOKINGS` กรองข้อมูลผ่าน Server Action โดยใช้ `session.user.id` จาก Better-Auth Session บน Server เท่านั้น ห้ามรับ `userId` จาก Client query/body เพื่อป้องกัน IDOR โดยเด็ดขาด

### 6. Single Canonical Source of Truth (`/facility` & `/facility/settings`)
- หน้า `/facility` และ `/facility/settings` ใช้ Server Actions ชุดเดียวกัน (`getFacilityResourcesAction`, `createFacilityResourceAction`, `updateFacilityResourceAction`, `toggleFacilityResourceStatusAction`, `deleteFacilityResourceAction`)
- ทำ Cache Invalidation (`revalidatePath`) ข้ามเส้นทางทุกครั้งที่มี Mutation

### 7. Modern Dialogs & Pure Tailwind Modals
- เลิกใช้ `alert()`, `confirm()`, `prompt()` ทั้งหมด เปลี่ยนเป็น Tailwind Custom Dialogs และ `useToast`
- คง Invariant Concurrency Guard: Global Deterministic Locking (`executeReservationMutation`) และ PostgreSQL `tstzrange` Exclusion Constraints ไว้ 100%

## Consequences
- **ข้อดี**: ครูใช้งานง่ายมาก หน้าตาสะอาด สบายตา มองเห็นคิวว่างได้ทันที จองเสร็จใน 3 ขั้นตอน ไม่สับสน
- **ความปลอดภัย**: ป้องกัน IDOR และ Double-booking 100% ด้วย Server-side session และ DB constraint
- **การคงสภาพ**: ไม่กระทบระบบ Print A4 (KP-FR-01 / KP-FV-01) และไม่กระทบ Concurrency Model ของ Database
