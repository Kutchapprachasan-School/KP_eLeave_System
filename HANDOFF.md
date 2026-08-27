# Project Master Handoff: Architecture, Subsystems, Database & Egress Strategy

> **คู่มือส่งต่องานฉบับสมบูรณ์ (Master Handoff Document)**
> เอกสารฉบับนี้รวบรวมบริบททั้งหมดของระบบ **eLeave (KP e-Leave & School Management System)** ครอบคลุมสถาปัตยกรรมระบบ, ฐานข้อมูล **Neon PostgreSQL**, ระบบย่อยทั้ง 8 ระบบ, มาตรการลดการดึงข้อมูลทรัพยากร (Egress Optimization), และกฎเหล็กทางเทคนิค เพื่อให้ AI Pair Programmer หรือนักพัฒนาสามารถทำงานต่อในแชทใหม่ได้อย่าง **ไร้รอยต่อ 100%**

---

## 📌 1. ข้อมูลภาพรวมระบบและเทคโนโลยี (System Overview & Tech Stack)

| รายการ | รายละเอียดทางเทคนิค |
| :--- | :--- |
| **ชื่อโปรเจกต์** | **KP e-Leave & Online School Management System (โรงเรียนกุดจับประชาสรรค์)** |
| **Production URL** | [https://e-leave-system-kappa.vercel.app](https://e-leave-system-kappa.vercel.app) |
| **GitHub Repository** | [Kutchapprachasan-School/KP_eLeave_System](https://github.com/Kutchapprachasan-School/KP_eLeave_System) (Branch: `main`) |
| **Frontend & Framework** | **Next.js 16.2.6 (App Router)** + **React 19.2.4** + **TypeScript** |
| **Styling & UI** | **Tailwind CSS v4** + Custom CSS Variables + **Framer Motion 12** + **Lucide React** |
| **Charts & Reporting** | **Recharts 3.8.1** + **html2pdf.js** + **jsPDF** + **xlsx** (Dynamic Imports) |
| **Authentication** | **Better-Auth v1.6.11** (Credentials + Session Adapter with Prisma) |
| **Database & ORM** | **Neon Serverless PostgreSQL (ap-southeast-1 สิงคโปร์)** + **Prisma 7.8.0** (`@prisma/adapter-pg`) |
| **Storage & Backups** | **Cloudflare R2 / Supabase Storage** (สำหรับไฟล์แนบ) + **Google Drive Apps Script Proxy** |

---

## 🗄️ 2. สถาปัตยกรรมฐานข้อมูล Neon PostgreSQL (Database Architecture)

### 🔑 A. ข้อมูลการเชื่อมต่อ (Neon Credentials)
*   **Host:** `ep-fancy-pine-aom5dqmg.c-2.ap-southeast-1.aws.neon.tech`
*   **Database:** `e-Leave`
*   **Username:** `neondb_owner`
*   **Vercel `DATABASE_URL` (Connection Pooling):**
    ```text
    postgresql://neondb_owner:npg_mHKSdpe5IM7i@ep-fancy-pine-aom5dqmg-pooler.c-2.ap-southeast-1.aws.neon.tech/e-Leave?sslmode=require
    ```
*   **Vercel `DIRECT_URL` (Direct Endpoint):**
    ```text
    postgresql://neondb_owner:npg_mHKSdpe5IM7i@ep-fancy-pine-aom5dqmg.c-2.ap-southeast-1.aws.neon.tech/e-Leave?sslmode=require
    ```

### 📊 B. ข้อมูลที่ย้ายจาก Supabase สู่ Neon ครบ 100% (รวม 1,153 Records):
*   `User` (76 คน) ↔ `Account` (76 บัญชี) ↔ `Session` (160 รายการ)
*   `LeaveRequest` (88 รายการ: ป่วย 54, กิจ 34) ↔ `LeaveConfig` (11 ประเภท)
*   `IncomingDocument` (234 ฉบับ) ↔ `DocumentRecord` (34 ฉบับ) ↔ `DocumentConfig` (10 หมวด)
*   `MemoSection` (5 กลุ่มสาระ/กลุ่มงาน) ↔ `DocumentRouting` (3 รายการ) ↔ `DocumentAuditLog` (1 รายการ)
*   `SystemSettings` (1 รายการ - โรงเรียนกุดจับประชาสรรค์) ↔ `Holiday` (23 วันหยุดราชการ)
*   `WorkShift` (1 กะเวลา) ↔ `Notification` (3 รายการ) ↔ `SystemLog` (423 บันทึก)

---

## ⚙️ 3. เจาะลึกระบบย่อยทั้ง 8 ระบบ (Active Subsystems Breakdown)

```mermaid
graph TD
    A[Core System / Better-Auth] --> B[ระบบการลา Leave Management]
    A --> C[ระบบงานสารบรรณ Document & Saraban]
    A --> D[ระบบออกเกียรติบัตร Certificate Generator]
    A --> E[ระบบลงเวลาปฏิบัติราชการ Time Attendance]
    A --> F[ระบบแจ้งซ่อมบำรุง Maintenance & Repair]
    A --> G[ระบบตารางสอน & ครูสอนแทน Timetable & Substitution]
    A --> H[ระบบนิเทศการสอน Teacher Supervision]
    A --> I[ระบบซิงค์ AMSS++ & Cloud Backup]
```

### 📝 1. ระบบการลา (Leave Management Subsystem)
*   **หน้าที่:** จัดการใบลาป่วย, ลากิจ, ลาพักผ่อน, ลาคลอด, คำนวณวันลาคงเหลือตามปีงบประมาณ (1 ต.ค. - 30 ก.ย.)
*   **Approval Workflow:** 
    *   `ครูผู้ลา` ➔ `หัวหน้าหมวด/กลุ่มสาระ (INSPECTOR)` ➔ `เจ้าหน้าที่บุคคล (HR)` ➔ `ผู้อำนวยการ/ผู้มีอำนาจอนุมัติ (DIRECTOR)`
*   **ไฟล์สำคัญ:**
    *   Server Actions: [`src/app/actions/leave.ts`](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/src/app/actions/leave.ts)
    *   UI Pages: [`src/app/(app)/dashboard`](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/src/app/(app)/dashboard), [`src/app/(app)/history/page.tsx`](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/src/app/(app)/history/page.tsx), [`src/app/(app)/approvals/page.tsx`](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/src/app/(app)/approvals/page.tsx)
    *   PDF Generation: [`src/app/print/leave/[id]/page.tsx`](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/src/app/print/leave/[id]/page.tsx)

### 📄 2. ระบบงานสารบรรณ (Document & Saraban Subsystem)
*   **หน้าที่:** ออกเลขทะเบียนหนังสือส่ง (`DocumentRecord`), รับหนังสือเข้า (`IncomingDocument`), บันทึกข้อความ (`MemoSection`), เกษียนหนังสือและส่งต่อ (`DocumentRouting`)
*   **Atomic Sequence & Anti-Backdating:**
    *   ใช้ **PostgreSQL Advisory Lock (`pg_advisory_xact_lock`)** ภายใน Prisma `$transaction` ป้องกันเลขซ้ำ 100% แม้จะขอยื่นพร้อมกัน
    *   ตรวจสอบ Anti-Backdating: ห้ามออกเลขย้อนหลังข้ามลำดับเวลาของเลขล่าสุด
*   **ไฟล์สำคัญ:**
    *   Use Case: [`src/features/document/application/use-cases/issue-outbound-doc.use-case.ts`](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/src/features/document/application/use-cases/issue-outbound-doc.use-case.ts)
    *   Actions: [`src/app/actions/document.ts`](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/src/app/actions/document.ts), [`src/app/actions/incoming.ts`](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/src/app/actions/incoming.ts)
    *   UI Pages: [`src/app/(app)/document/page.tsx`](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/src/app/(app)/document/page.tsx), [`src/app/(app)/document/incoming/page.tsx`](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/src/app/(app)/document/incoming/page.tsx)

### 🎖️ 3. ระบบออกเกียรติบัตร (Certificate Generator Subsystem)
*   **หน้าที่:** ออกเลขทะเบียนเกียรติบัตรเดี่ยวและแบบชุด (Batch), ปรับแต่ง Layout, แปลงตัวเลขอารบิกเป็นเลขไทย, ฝังลายเซ็นดิจิทัล
*   **ไฟล์สำคัญ:**
    *   UI Component: [`src/app/(app)/document/_components/cert-generator.tsx`](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/src/app/(app)/document/_components/cert-generator.tsx)
    *   Actions: `issueActivityCertificatesBatch` ใน [`src/app/actions/document.ts`](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/src/app/actions/document.ts)

### ⏰ 4. ระบบลงเวลาปฏิบัติราชการ (Time Attendance Subsystem)
*   **หน้าที่:** เช็คชื่อเข้า-ออกงาน, ตรวจสอบพิกัด GPS Geofencing, ตรวจสอบใบหน้า (Facial Recognition Match) พร้อมระบบตรวจจับความเคลื่อนไหว (Liveness Check)
*   **ไฟล์สำคัญ:**
    *   Actions: [`src/app/actions/attendance.ts`](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/src/app/actions/attendance.ts), [`src/app/actions/attendance-stats.ts`](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/src/app/actions/attendance-stats.ts)
    *   UI Page: [`src/app/(app)/attendance/page.tsx`](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/src/app/(app)/attendance/page.tsx)

### 🔧 5. ระบบแจ้งซ่อมบำรุง (Maintenance & Repair Subsystem)
*   **หน้าที่:** แจ้งซ่อมคอมพิวเตอร์/ไฟฟ้า/ประปา/อาคารสถานที่, กำหนดระดับความเร่งด่วน, ติดตามสถานะช่าง, บันทึกค่าใช้จ่าย, แจ้งเตือนผ่าน LINE Notify
*   **สิทธิ์พิเศษ:** `REPAIR_MANAGER` หรือตำแหน่ง `ผู้ดูแลระบบซ่อม` สามารถจัดการข้อมูลซ่อมได้
*   **ไฟล์สำคัญ:**
    *   Actions: [`src/app/actions/repair/`](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/src/app/actions/repair/)
    *   Service: [`src/services/repair.service.ts`](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/src/services/repair.service.ts)
    *   UI Page: [`src/app/(app)/repair/page.tsx`](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/src/app/(app)/repair/page.tsx)

### 📅 6. ระบบตารางสอน & การสอนแทน (Timetable & Substitution Subsystem)
*   **หน้าที่:** จัดการตารางสอนรายคาบ/รายวัน, ระบบจับคู่ครูสอนแทนอัตโนมัติ (Workload Penalty Balancing), แจ้งเตือนครูสอนแทนผ่าน LINE Notify
*   **ไฟล์สำคัญ:**
    *   Actions: [`src/app/actions/curriculum-workflow.ts`](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/src/app/actions/curriculum-workflow.ts), [`src/app/actions/academic-planning.ts`](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/src/app/actions/academic-planning.ts)
    *   UI Page: [`src/app/(app)/academic/timetable/page.tsx`](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/src/app/(app)/academic/timetable/page.tsx)

### 📋 7. ระบบนิเทศการสอน (Teacher Supervision Subsystem)
*   **หน้าที่:** วางแผนการนิเทศ (On-Site/Online), บันทึกเกณฑ์การประเมิน (Rubrics), การลงนามรับทราบของครูผู้รับการนิเทศ และการลงนามของผู้อำนวยการ
*   **Workflow:** `SCHEDULED` ➔ `WAITING_TEACHER_ACK` ➔ `WAITING_DIRECTOR_SIGN` ➔ `COMPLETED`
*   **ไฟล์สำคัญ:**
    *   Feature Core: [`src/features/supervision/`](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/src/features/supervision/)
    *   UI Page: [`src/app/(app)/supervision/page.tsx`](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/src/app/(app)/supervision/page.tsx)

### ☁️ 8. ระบบเชื่อมโยง AMSS++ และระบบสำรองข้อมูล (AMSS & Cloud Backup)
*   **หน้าที่:** ดึงหนังสือเข้าจากระบบ AMSS สพม.อุดรธานี, ส่งออกประวัติและไฟล์สำรองข้อมูลไปยัง Google Drive อัตโนมัติ
*   **ไฟล์สำคัญ:** [`src/app/actions/archive.ts`](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/src/app/actions/archive.ts), [`src/app/actions/logs.ts`](file:///g:/My%20Drive/01%20Web%20app/01%20ระบบการลา/src/app/actions/logs.ts)

---

## ⚡ 4. ยุทธศาสตร์การประหยัดทรัพยากร (Egress & Resource Optimization Strategy)

### 🏆 ผลลัพธ์เชิงตัวเลข (ครู 100 คน ใช้งานปกติทั้งเดือน):
*   **Egress รวม:** ลดลงจาก **~6.5–8.0 GB/เดือน** เหลือเพียง **~150–250 MB/เดือน (ลดลง 97%)**
*   **Supabase Egress:** ลดเหลือ **0 MB (0%)** หลังย้ายมา Neon

```
+-----------------------------------------------------------------------------------+
| การลด Egress 4 เสาหลัก (The 4 Pillars of Egress Reduction)                        |
+-----------------------------------------------------------------------------------+
| 1. Server-Side Pagination : ใช้ take/skip หน้าละ 10-20 รายการ (ลดขนาด 99.4%)     |
| 2. Client-Side TTL Cache  : แคช Settings/Holidays 12 ชม. ใน LocalStorage (0 KB)   |
| 3. Atomic Advisory Locks  : ขอเลขเอกสารดึงเฉพาะแถวล่าสุด LIMIT 1 (~400 Bytes)     |
| 4. Storage Segregation    : แยกรูปภาพ/PDF ไป CDN เก็บใน DB เฉพาะ Text URL         |
+-----------------------------------------------------------------------------------+
```

---

## 🛡️ 5. กฎเหล็กและข้อควรระวังสำหรับผู้พัฒนาต่อ (Critical Prompt Rules)

> [!CAUTION]
> **กฎเหล็กข้อที่ 1: ห้ามรันคำสั่ง DDL (`ALTER TABLE`) ใน Request Hot-Path เด็ดขาด**
> ห้ามใส่คำสั่ง `ALTER TABLE` หรือ DDL ใดๆ ใน Server Actions ที่ถูกเรียกขณะเปิดหน้าเว็บ (เช่น `getSystemSettings`) เพราะคำสั่ง DDL ก้อนใหญ่จะทำให้ Connection Pooler บน Neon เกิด Timeout ทันที การปรับ Schema ต้องทำผ่าน Migration Scripts เท่านั้น

> [!IMPORTANT]
> **กฎเหล็กข้อที่ 2: บังคับใช้ Pagination ในทุกหน้าตารางข้อมูล**
> ห้ามใช้ `prisma.*.findMany()` แบบ Unbounded (ไม่มี `take` และ `skip`) ในตารางที่มีการเพิ่มขึ้นของข้อมูลตลอดเวลา เช่น `LeaveRequest`, `DocumentRecord`, `IncomingDocument`, `User`

> [!IMPORTANT]
> **กฎเหล็กข้อที่ 3: Selective Fields Only (ห้ามดึง Signature Base64 ใน Bulk Query)**
> ตาราง `User` มีฟิลด์ `signatureUrl` ซึ่งเป็น Base64 ขนาด 50–500 KB ต่อคน ในการ Query แสดงรายชื่อครูต้องระบุ `select: { id: true, name: true, position: true, hasSignature: true }` เสมอ ห้ามดึง `signatureUrl` มาทั้งตาราง

> [!TIP]
> **กฎเหล็กข้อที่ 4: ตรวจสอบ Dynamic Imports สำหรับไลบรารีขนาดใหญ่**
> ไลบรารี `xlsx`, `jspdf`, `html2canvas-pro` ต้องถูกโหลดผ่าน `await import(...)` เฉพาะเมื่อผู้ใช้คลิกปุ่ม Export/Print เท่านั้น เพื่อไม่ให้กระทบขนาด Client Bundle ขนาดใหญ่ตอนเปิดหน้าเว็บ

> [!TIP]
> **กฎเหล็กข้อที่ 5: การจัดการ Client Auth BaseURL**
> ในไฟล์ `src/lib/auth-client.ts` และ `src/app/reset-password/page.tsx` ต้องใช้ `window.location.origin` ในฝั่งเบราว์เซอร์เสมอ ห้ามฮาร์ดโค้ดเป็น `http://localhost:3000` เพื่อให้ระบบล็อกอินทำงานได้ทุกโดเมนบน Vercel

---

## 🏛️ 6. มาตรฐานสถาปัตยกรรม Data Access Boundary (Standard Pattern)

> ได้รับการรับรองอย่างเป็นทางการ: **🟢 LEAVE HISTORY DATA ACCESS BOUNDARY — PRODUCTION APPROVED**

```mermaid
graph TD
    Client[Client UI / React] -->|Bounded Params| ServerAction[Server Action Boundary]
    ServerAction --> Auth[1. Authentication & Role Authorization]
    Auth --> Zod[2. Zod Boundary Validation]
    Zod --> BaseWhere[3. Base WHERE: Cycle + User + Search]
    BaseWhere --> StatsBranch[Stats Query: groupBy by status]
    BaseWhere --> DataWhere[4. Data WHERE: Base + Status Filter]
    DataWhere --> BoundedFind[findMany: take, skip, orderBy createdAt DESC, id DESC]
    StatsBranch & BoundedFind --> BoundedResponse[Bounded Response JSON]
    BoundedResponse --> SequenceGuard[Client: Sequence ID Guard Discard Stale]
```

### 📋 หลักปฏิบัติ 6 ประการของ Data Access Boundary:
1. **Server Action Boundary Security:** ตรวจสอบสิทธิ์ที่ Server Action เสมอ (ห้ามพึ่งพาการซ่อนปุ่มบน UI)
2. **Zod Input Normalization:** กำหนด `page >= 1`, `limit <= 50`, `searchName` trim และแปลง `""` เป็น `undefined`
3. **Model A Stats Semantics:** แยก `baseWhere` (สำหรับคำนวณ Stats รวมของ context) ออกจาก `dataWhere` (สำหรับตารางที่กรองตาม status)
4. **Deterministic Ordering:** ทุก Paginated Query ต้องมี Secondary Unique Sorter เสมอ (`orderBy: [{ createdAt: "desc" }, { id: "desc" }]`)
5. **Sequence ID Race Guard:** Client ใช้ `fetchSequence.current` เพื่อ discard คำขอเก่าที่ตอบกลับช้ากว่า ป้องกัน Race Condition
6. **Observability-First Indexing:** ยึดหลัก **"Observability ➔ Measure ➔ Optimize"** — ห้ามสร้าง Index แบบคาดเดา (Speculative Indexing) ต้องดูผล `EXPLAIN ANALYZE` และ Metrics การใช้งานจริงบนฐานข้อมูลก่อนเสมอ

---

## 🚀 7. แผนงานและสิ่งที่สามารถพัฒนาต่อใน Session ถัดไป (Next Steps Roadmap)

1.  **ขยายระบบรายงานขั้นสูง (Advanced Analytics):** เพิ่มการส่งออกรายงานสรุปการลาประจำปีสำหรับงานบุคคลในรูปแบบ Excel อัตโนมัติ
2.  **ระบบแจ้งเตือนผ่าน LINE OA Webhook:** เพิ่ม Rich Menu และการแจ้งเตือนสองทาง (Two-way Interactive Approval)
3.  **การปรับปรุงระบบแคชระดับ Edge:** พิจารณาใช้ SWR หรือ React Server Component Caching ในหน้าตารางสารบรรณเพื่อเพิ่มความลื่นไหลสูงสุด
4.  **Database Performance Monitoring:** ติดตาม latency ของ `groupBy` และ Query Execution Time เมื่อขนาดข้อมูลเติบโต ก่อนพิจารณา Composite Index หรือ Materialized Aggregation
