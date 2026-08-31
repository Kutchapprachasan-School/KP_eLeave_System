# Master Project Handoff: Architecture, Subsystems, Supabase Egress & Workflow Rules

> **คู่มือส่งต่องานฉบับสมบูรณ์ล่าสุด (Latest Master Handoff Document)**
> บันทึกบริบททางเทคนิคทั้งหมดของระบบ **KP e-Leave & Online School Management System (โรงเรียนกุดจับประชาสรรค์)** เพื่อให้ AI Pair Programmer หรือนักพัฒนาสามารถทำงานต่อใน Session ถัดไปได้อย่าง **ไร้รอยต่อ 100%**

---

## 📌 1. ข้อมูลภาพรวมระบบและเทคโนโลยี (System Overview & Tech Stack)

| รายการ | รายละเอียดทางเทคนิค |
| :--- | :--- |
| **ชื่อโปรเจกต์** | **KP e-Leave & Online School Management System (โรงเรียนกุดจับประชาสรรค์)** |
| **Production URL** | [https://e-leave-system-kappa.vercel.app](https://e-leave-system-kappa.vercel.app) |
| **GitHub Repository** | [Kutchapprachasan-School/KP_eLeave_System](https://github.com/Kutchapprachasan-School/KP_eLeave_System) |
| **Active Dev Branch** | `dev` (กฎเหล็ก: พัฒนาและทดสอบในกิ่ง `dev` เท่านั้น) |
| **Production Branch** | `main` |
| **Frontend & Framework** | **Next.js 16.3.1 (App Router)** + **React 19.2.4** + **TypeScript** |
| **Styling & UI** | **Tailwind CSS v4** + CSS Variables + **Framer Motion 12** + **Lucide React** |
| **Authentication** | **Better-Auth v1.6.11** (Prisma Session Adapter + Role-based permissions) |
| **Primary Database** | **Supabase PostgreSQL (ap-southeast-1 สิงคโปร์)** + Connection Pooler (`pgbouncer=true`) |
| **Standby Backup DB** | **Neon PostgreSQL (ap-southeast-1 สิงคโปร์)** + Snapshot file `backup_neon_full.json` |
| **Storage & Egress** | **Supabase Storage** (Public Bucket `data1`) + In-App Realtime Egress Telemetry |

---

## 🗄️ 2. สถาปัตยกรรมฐานข้อมูล (Database Architecture & Credentials)

### 🔑 A. ฐานข้อมูลหลัก (Active Primary Database: Supabase PostgreSQL)
* **Project Ref:** `ngzflajpifmsvhldhviu`
* **Org Slug:** `elhmzcrjulinlolcjkur`
* **App Runtime Connection Pooler (`DATABASE_URL`):**
  ```text
  postgresql://postgres.ngzflajpifmsvhldhviu:YQSmSuCwZ9_iR_!@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
  ```
* **DDL / Migration Direct Endpoint (`DIRECT_URL`):**
  ```text
  postgresql://postgres.ngzflajpifmsvhldhviu:YQSmSuCwZ9_iR_!@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
  ```

### 🛡️ B. ฐานข้อมูลสำรอง (Online Standby Backup: Neon PostgreSQL)
* **Main Standby Endpoint:**
  ```text
  postgresql://neondb_owner:npg_mHKSdpe5IM7i@ep-fancy-pine-aom5dqmg-pooler.c-2.ap-southeast-1.aws.neon.tech/e-Leave?sslmode=require
  ```
* **Dev Standby Endpoint:**
  ```text
  postgresql://neondb_owner:npg_mHKSdpe5IM7i@ep-square-field-ao2pw4kh.c-2.ap-southeast-1.aws.neon.tech/e-Leave?sslmode=require
  ```

---

## ⚡ 3. สรุปฟีเจอร์และงานที่ทำเสร็จสมบูรณ์ล่าสุด (Recent Work Accomplished)

### 1. การย้ายข้อมูลกลับ Supabase 100% และตรวจสอบความถูกต้อง (Full Migration & Sync)
* ตรวจสอบความซ้ำซ้อนของข้อมูล 33 ตารางระหว่าง Neon และ Supabase: ไม่พบข้อมูลซ้ำซ้อน
* ซิงค์ข้อมูลทั้งหมด 1,268 แถวครบถ้วน (LeaveRequest: 104 รายการ, User: 76 คน, DocumentRecord: 41 ฉบับ ฯลฯ)
* เก็บ Standby Backup บน Neon และออฟไลน์สแนปช็อต `backup_neon_full.json` เรียบร้อย

### 2. กู้คืนลายเซ็นต์ต้นฉบับจริง (Authentic Signatures Restored)
* กู้คืนลายเซ็นต์ต้นฉบับคมชัดของครูทั้งหมด 65 คนจาก Supabase Backup
* ยกเลิกระบบ Auto-tracer เดิม และกำหนดระบบสองชั้น: รูปภาพต้นฉบับเดิมคงสภาพ 100% ส่วนลายเซ็นต์ที่วาดใหม่ผ่านหน้าจอจะบันทึกเป็น Vector SVG คุณภาพสูง

### 3. ระบบ Real-Time Supabase Egress & Quota Monitoring Dashboard
* ติดตั้ง Dashboard วัดการใช้งาน Egress และ Disk Size สดสำหรับ Admin ที่หน้า **บันทึกระบบ (System Logs ➔ Egress Telemetry)**
* แสดงหลอดวัด Data Transfer (MB/GB) เทียบกับ Free Quota 5GB หรือ Pro Quota 250GB พร้อมแจ้งเตือนสถานะ 🟢 ปกติ / 🟡 เตือน 80% / 🔴 วิกฤต 95%
* แสดงขนาดพื้นที่ตารางที่มีขนาดใหญ่ที่สุด และปุ่มเปิด Supabase Dashboard ทางการใน 1 คลิก

### 4. แก้ปัญหา Vercel ISR Writes เต็ม (100% Fixed)
* บังคับใช้ `force-dynamic SSR` (`revalidate = 0`, `fetchCache = "force-no-store"`) ที่ Root Layout (`src/app/layout.tsx`)
* ลบคำสั่ง `revalidatePath("/")` ที่เคยล้างแคชทั้งเว็บออกทั้งหมด
* **ผลลัพธ์:** ISR Writes บน Vercel ลดลงเหลือ **0 ครั้ง/เดือน** ไม่กินโควตา Data Cache

### 5. ปรับปรุงหน้า Login และ Network Access
* นำม่าน Splash Screen สีขาวที่ค้างอยู่ออก ทำให้หน้า Login แสดงผลทันทีแบบ **Instant Load** พร้อม UI High-Contrast คมชัด
* ปรับ `package.json` dev script เป็น `next dev -H 0.0.0.0 --port 3001` เพื่อให้สามารถเข้าทดสอบผ่านวง Wi-Fi/LAN ได้อย่างราบรื่น

---

## 🛡️ 4. กฎเหล็กและข้อควรระวังสำหรับ AI และนักพัฒนา (Strict Prompt Rules)

> [!IMPORTANT]
> **กฎเหล็กข้อที่ 1: กฎการแตกกิ่ง (Branch Workflow Rule)**
> *"ต่อไปพัฒนาใน bruch เท่านั้น"*
> ทุกการแก้ไขโค้ด ทดสอบ และ commit ต้องทำบนกิ่ง **`dev`** เสมอ ห้าม push ตรงเข้า `main` จนกว่าผู้ใช้จะสั่งปล่อยขึ้น main

> [!CAUTION]
> **กฎเหล็กข้อที่ 2: ห้ามรันคำสั่ง DDL (`ALTER TABLE`) ใน Request Hot-Path**
> ห้ามใส่คำสั่ง `ALTER TABLE` หรือ DDL ใดๆ ใน Server Actions ที่ถูกเรียกขณะเปิดหน้าเว็บ เพราะจะทำให้ Connection Pooler เกิด Timeout ทันที

> [!IMPORTANT]
> **กฎเหล็กข้อที่ 3: Selective Fields Only ในตาราง `User`**
> ตาราง `User` มีฟิลด์ `signatureUrl` ที่มีขนาดใหญ่ ในการ Query แสดงรายชื่อครูต้องระบุ `select: { id: true, name: true, position: true, hasSignature: true }` เสมอ ห้ามดึง `signatureUrl` มาทั้งตารางในการค้นหาทั่วไป

> [!TIP]
> **กฎเหล็กข้อที่ 4: Data Access Boundary Pattern (Pagination บังคับ)**
> ทุกหน้าตารางข้อมูล (`LeaveRequest`, `DocumentRecord`, `IncomingDocument`, `SystemLog`) ต้องใช้ Server-Side Pagination (`take` / `skip`) พร้อม Secondary Sorter (`orderBy: [{ createdAt: "desc" }, { id: "desc" }]`) เสมอ

---

## 📂 5. โครงสร้างไฟล์และโมดูลสำคัญ (Key File Locations)

| โมดูล / หน้าที่ | เส้นทางไฟล์หลัก |
| :--- | :--- |
| **Database Client** | [`src/lib/db.ts`](file:///C:/dev/eLeave/src/lib/db.ts) (Prisma Client + Connection Pooler) |
| **Egress Telemetry Service** | [`src/services/monitoring/supabase-usage.service.ts`](file:///C:/dev/eLeave/src/services/monitoring/supabase-usage.service.ts) |
| **Monitoring Actions** | [`src/app/actions/monitoring.ts`](file:///C:/dev/eLeave/src/app/actions/monitoring.ts) |
| **Monitoring Dashboard UI** | [`src/app/(app)/logs/_components/SupabaseEgressMonitor.tsx`](file:///C:/dev/eLeave/src/app/(app)/logs/_components/SupabaseEgressMonitor.tsx) |
| **Root Layout & Dynamic SSR** | [`src/app/layout.tsx`](file:///C:/dev/eLeave/src/app/layout.tsx) |
| **User & Signature Actions** | [`src/app/actions/user.ts`](file:///C:/dev/eLeave/src/app/actions/user.ts) |
| **Leave Management Actions** | [`src/app/actions/leave.ts`](file:///C:/dev/eLeave/src/app/actions/leave.ts) |
| **Document & Saraban Actions** | [`src/app/actions/document.ts`](file:///C:/dev/eLeave/src/app/actions/document.ts), [`src/app/actions/incoming.ts`](file:///C:/dev/eLeave/src/app/actions/incoming.ts) |
| **Offline Backup Snapshot** | [`backup_neon_full.json`](file:///C:/dev/eLeave/backup_neon_full.json) |
| **Original Signatures Backup** | [`supabase_original_signatures.json`](file:///C:/dev/eLeave/supabase_original_signatures.json) |

---

## 🚀 6. แผนงานสำหรับ Session ถัดไป (Next Steps Roadmap)

1. **ขยายระบบรายงานสรุปผลการปฏิบัติราชการและการลา (Annual HR Summary Report):** รองรับการออกไฟล์ Excel/PDF ประจำปีงบประมาณ
2. **ระบบการแจ้งเตือนสองทางผ่าน LINE Webhook:** รองรับการกดอนุมัติหรือปฏิเสธใบลาผ่านปุ่มในข้อความ LINE
3. **การตรวจสอบ Egress อย่างต่อเนื่อง:** ติดตามกราฟ Bandwidth ในหน้า Egress Telemetry เป็นประจำ เพื่อรักษาปริมาณข้อมูลให้อยู่ในเกณฑ์ประหยัดสูงสุด (ต่ำกว่า 500 MB/เดือน)
