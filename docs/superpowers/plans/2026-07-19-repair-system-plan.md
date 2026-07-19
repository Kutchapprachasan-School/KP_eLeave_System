# ระบบแจ้งซ่อม (Repair Request System) Implementation Plan v6.0

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้างระบบแจ้งซ่อมสำหรับโรงเรียนแบบประสิทธิภาพสูง ตามพิมพ์เขียว Master Architecture Blueprint v6.0 โดยรองรับการบันทึกภาพแบบ Binary (BYTEA) จำกัดจำนวน BEFORE 2 รูป และ AFTER 2 รูป ย่อยรูปบน Canvas ฝั่งไคลเอนต์ ควบคุมสิทธิ์ด้วย Capability Permissions และมีระบบจดหมายเหตุย้ายความสัมพันธ์รูปภาพด้วยความปลอดภัยผ่าน Transaction

**Architecture:** 
- ตาราง `RepairRequest`, `RepairPhoto` (ไม่มีการเกาะ archiveId, non-nullable repairId เพื่อป้องรูปกำพร้า, index คู่ repairId & photoType, ฟิลด์บันทึกขนาด fileSize) และ `RepairArchive` (เพิ่ม oldestRecordAt และ newestRecordAt)
- API Stream รูปภาพและแคชถาวร 7 วัน พร้อมระบบดักสิทธิ์เข้าถึง แคชบัสเตอร์ `?v={createdAt}` และ ETag + 304 Not Modified
- Server Action สำหรับย้ายข้อมูลเก่า (>180 วัน) ผ่าน Prisma Transaction สรุปข้อมูลลง JSON payload หุ้มด้วย `{ version: 1, records: [...] }` ลบภาพออกโดย CASCADE คิวรีเรียงลำดับตาม `updatedAt: "asc"` และมีลิมิต `MAX_BATCHES = 100` ในการประมวลผลพร้อม timeout 30 วินาทีและ pg_advisory_lock
- สิทธิ์การทำงานอิงตาม Permissions: `repair:view.own`, `repair:view.all`, `repair:create`, `repair:assign`, `repair:update`, `repair:archive`
- ระบบตรวจสอบและอัปเดตข้อมูลแบบป้องกัน Lost Update โดยใช้คำสั่ง Atomic Compare-And-Swap ในคำสั่ง `updateMany`
- เสริมระบบความปลอดภัยของรูปภาพในระดับฐานข้อมูลและจำกัดขนาดรูปภาพ fileSize > 0

**Tech Stack:** Next.js (App Router), Prisma, PostgreSQL (BYTEA), Framer Motion, Tailwind CSS, Lucide React

---

## Global Constraints
- **จำกัดรูปภาพ**: ก่อนซ่อม (BEFORE) สูงสุด 2 รูป และหลังซ่อม (AFTER) สูงสุด 2 รูป (รวม 4 รูปต่อใบงาน) โดยมีการเช็คนับใน Transaction เสมอก่อนบันทึกลงฐานข้อมูล
- **การบีบอัดรูปภาพ**: ด้านยาวสุดไม่เกิน 800px บีบอัดเป็น JPEG (Quality = 0.7) ขนาดหลังย่อ $\le 100\text{ KB}$ ต่อรูป โดยไม่มีการจำกัดขนาดไฟล์รูปต้นฉบับของผู้ใช้
- **ระบบการเงิน**: ใช้ประเภท `Decimal` (Prisma `@db.Decimal(10,2)`) สำหรับฟิลด์ค่าใช้จ่าย `cost` ของใบแจ้งซ่อม โดยต้องมีระบบ Serialize แปลงเป็นตัวเลข (`toNumber()`) ก่อนส่งข้อมูลไปยัง Client Components เสมอ
- **สิทธิ์เข้าใช้ระบบ**: ควบคุมระดับ Capability-based Permissions ผ่านการตรวจสอบฟังก์ชัน `hasPermission` ในไฟล์ `src/lib/permissions.ts` (ใช้สิทธิ์ `repair:view.own` และ `repair:view.all` เท่านั้น ห้ามใช้สิทธิ์ `repair:view`)
- **Audit Logs**: ทุกการเปลี่ยนแปลงใบแจ้งซ่อมต้องบันทึกลงตาราง `SystemLog` ในรหัสกิจกรรม: `REPAIR_CREATED`, `REPAIR_ASSIGNED`, `REPAIR_STARTED`, `REPAIR_COMPLETED`, `REPAIR_CANCELLED`, และ `REPAIR_ARCHIVED` พร้อมเขียนข้อความอ้างอิง ID ในรูปแบบโครงสร้าง `[REPAIR_ID:${id}][ACTOR_ID:${userId}][ACTION:${action}] ...` และบันทึก JSON Metadata ลงฟิลด์ `metadata` ของ `SystemLog`

---

## Proposed Changes & Tasks

### Task 1: Database Schema & Migration

**Files:**
- Modify: [prisma/schema.prisma](file:///C:/dev/eLeave/prisma/schema.prisma)
- Create: Migration files via Prisma CLI

**Interfaces:**
- Produces: `RepairStatus`, `RepairUrgency`, `RepairPhotoType` enums, `RepairRequest`, `RepairPhoto`, and `RepairArchive` models.

- [ ] **Step 1: Edit `schema.prisma`**
  - เพิ่มฟิลด์ `enableRepair Boolean @default(false)` ในตาราง `SystemSettings`
  - เพิ่มฟิลด์ `metadata Json?` ในโมเดล `SystemLog`
  - อัปเดตความสัมพันธ์ในโมเดล `User`:
    ```prisma
    requestsCreated  RepairRequest[] @relation("RequestCreatedBy")
    requestsAssigned RepairRequest[] @relation("RequestAssignedTo")
    ```
  - เพิ่มโมเดลและโครงสร้างตารางแจ้งซ่อมตามสเปก v6.0:
    ```prisma
    enum RepairStatus {
      PENDING
      ASSIGNED
      IN_PROGRESS
      COMPLETED
      CANCELLED
    }

    enum RepairUrgency {
      NORMAL
      URGENT
      URGENT_MOST
    }

    enum RepairPhotoType {
      BEFORE
      AFTER
    }

    model RepairRequest {
      id             String          @id @default(cuid())
      title          String
      description    String          @db.Text
      location       String
      urgency        RepairUrgency   @default(NORMAL)
      status         RepairStatus    @default(PENDING)
      requesterId    String
      requester      User            @relation("RequestCreatedBy", fields: [requesterId], references: [id], onDelete: Cascade)
      assigneeId     String?
      assignee       User?           @relation("RequestAssignedTo", fields: [assigneeId], references: [id], onDelete: SetNull)
      resolutionNote String?         @db.Text
      cost           Decimal?        @db.Decimal(10, 2)
      materialsUsed  String?         @db.Text
      cancelReason   String?         @db.Text
      assignedAt     DateTime?
      finishedAt     DateTime?
      createdAt      DateTime        @default(now())
      updatedAt      DateTime        @updatedAt
      photos         RepairPhoto[]

      @@index([status, createdAt(sort: Desc)])
      @@index([status, updatedAt])
      @@index([assigneeId, status])
      @@index([requesterId, status])
      @@index([updatedAt])
    }

    model RepairPhoto {
      id        String          @id @default(cuid())
      repairId  String
      photoType RepairPhotoType
      mimeType  String
      fileSize  Int
      imageData Bytes
      createdAt DateTime        @default(now())
      
      repair    RepairRequest   @relation(fields: [repairId], references: [id], onDelete: Cascade)

      @@index([repairId])
      @@index([repairId, photoType])
    }

    model RepairArchive {
      id             String        @id @default(cuid())
      archivedAt     DateTime      @default(now())
      itemCount      Int
      completedCount Int
      cancelledCount Int
      totalCost      Decimal?      @db.Decimal(12, 2)
      oldestRecordAt DateTime?
      newestRecordAt DateTime?
      payload        Json
    }
    ```

- [ ] **Step 2: Run dry-run migration check**
  - Run: `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script`
  - Verify: ตรวจทานคำสั่ง SQL ว่าไม่มีการ DROP ตารางที่สำคัญ

- [ ] **Step 3: Create the migration package and edit the migration script**
  - Run: `npx prisma migrate dev --create-only --name add_repair_engine_v6`
  - แก้ไขไฟล์ `.sql` ในโฟลเดอร์ `prisma/migrations/...` ที่เพิ่งเกิดขึ้น:
    1. เพิ่ม CHECK Constraint:
       ```sql
       ALTER TABLE "RepairPhoto" ADD CONSTRAINT repair_photo_filesize_chk CHECK ("fileSize" > 0);
       ```
    2. เพิ่ม Partial Index สำหรับ Archiver Candidates:
       ```sql
       CREATE INDEX idx_repair_archive_candidates ON "RepairRequest" ("updatedAt") WHERE status IN ('COMPLETED', 'CANCELLED');
       ```
  - Verify: ไฟล์ `.sql` มีคำสั่ง Custom SQL ครบถ้วน

- [ ] **Step 4: Execute migration to database**
  - Run: `npx prisma migrate dev`
  - Verify: การรันผ่านสำเร็จและสร้าง Prisma Client สำเร็จ

- [ ] **Step 5: Commit changes**
  - Run: `git add prisma/schema.prisma prisma/migrations/`
  - Run: `git commit -m "db: add enums, models, checks, and partial indexes for Repair engine v6.0"`

---

### Task 2: Implement Permissions & Actions & Secure Photo API

**Files:**
- Create: [src/lib/permissions.ts](file:///C:/dev/eLeave/src/lib/permissions.ts)
- Create: [src/app/api/repair/photo/[photoId]/route.ts](file:///C:/dev/eLeave/src/app/api/repair/photo/%5BphotoId%5D/route.ts)
- Create: [src/app/actions/repair.ts](file:///C:/dev/eLeave/src/app/actions/repair.ts)

**Interfaces:**
- Consumes: Prisma models
- Produces: `hasPermission` helper, photo stream GET endpoint, and Server Actions for RepairRequest

- [ ] **Step 1: Write `src/lib/permissions.ts`**
  - เขียนออบเจกต์และฟังก์ชันตรวจสอบสิทธิ์ `hasPermission` ตามพิมพ์เขียว v6.0 (มีเฉพาะ `repair:view.own` และ `repair:view.all` สำหรับสิทธิ์ในการมองเห็น)

- [ ] **Step 2: Create Photo Streaming API Route with ETag Support**
  - เขียนโค้ดใน `src/app/api/repair/photo/[photoId]/route.ts` เพื่อส่งภาพกลับเป็น Binary Response
  - นำเข้า ETag logic: คำนวณ ETag จากไอดีและ timestamp และเปรียบเทียบกับ `If-None-Match` หากตรงกันให้ส่งกลับ `304 Not Modified` ทันทีเพื่อประหยัดแบนด์วิดท์
  - บังคับใช้การตรวจสอบสิทธิ์แบบ Ownership และตั้งค่า Cache-Control 7 วันตามพิมพ์เขียว (`max-age=604800`)

- [ ] **Step 3: Write Server Actions in `src/app/actions/repair.ts`**
  - ฟังก์ชัน `createRepairRequest` เพื่อบันทึกงานใหม่:
    - ตรวจสอบสิทธิ์และจำนวนรูป BEFORE ใน transaction:
      ```typescript
      const count = await tx.repairPhoto.count({ where: { repairId, photoType: "BEFORE" } });
      if (count >= 2) throw new Error("สามารถแนบรูปภาพก่อนซ่อมได้สูงสุด 2 รูปเท่านั้น");
      ```
    - แปลงรูปและคำนวณ `fileSize` (ใช้ `buffer.length`)
    - แทรก SystemLog พร้อม JSON metadata: `{ repairId, actorId: user.id, action: "REPAIR_CREATED" }`
  - ฟังก์ชัน `getRepairRequests` ดึงข้อมูลรายการแจ้งซ่อม (ห้ามดึงตารางความสัมพันธ์รูปภาพ `photos` เพื่อประสิทธิภาพ)
  - ฟังก์ชัน `getRepairRequestDetails` ดึงข้อมูลเดี่ยวแสดงผล (ต้องทำการ Serialize ฟิลด์ `cost` ในออบเจกต์ด้วยคำสั่ง `cost.toNumber()` ก่อนส่งออก)
  - ฟังก์ชัน `assignRepairRequest` สำหรับมอบหมายช่าง
  - ฟังก์ชัน `updateRepairStatus` อัปเดตงานสำหรับช่าง (รวมบันทึกรายละเอียดซ่อม, แนบรูปภาพ AFTER - ตรวจสอบนับ transactional count $\le 2$, บันทึกขนาดไฟล์ใน `fileSize` บันทึกค่าซ่อมแปลงเป็น `Decimal` และ Serialize `cost.toNumber()` ขากลับ)
  - **การป้องกัน Lost Update (Compare-And-Swap)**: ในการอัปเดตสถานะของใบแจ้งซ่อม ให้ทำการตรวจสอบสถานะแบบ Atomic Compare-And-Swap เสมอ หลีกเลี่ยง Read->Check->Write:
    ```typescript
    const result = await prisma.repairRequest.updateMany({
      where: {
        id: repairId,
        status: expectedPreviousStatus
      },
      data: {
        status: nextStatus,
        // ... updates
      }
    });
    if (result.count === 0) {
      throw new Error("สถานะงานมีการเปลี่ยนแปลงโดยผู้ใช้อื่น กรุณารีเฟรชหน้าจอใหม่อีกครั้ง");
    }
    ```
  - แทรกคำสั่งสร้าง Audit Logs ในตาราง `SystemLog` ในรูปแบบโครงสร้าง `[REPAIR_ID:${repairId}][ACTOR_ID:${userId}][ACTION:${action}] ...` และบันทึก JSON Metadata เสมอในแต่ละขั้นตอน

- [ ] **Step 4: Commit changes**
  - Run: `git add src/lib/permissions.ts src/app/api/repair/photo/ src/app/actions/repair.ts`
  - Run: `git commit -m "feat: add permissions helper, secure photo streaming API with ETag, and repair actions with atomic Compare-And-Swap checks and DB-level count counts"`

---

### Task 3: Implement ETL Transactional Archiver Job

**Files:**
- Create: [src/app/actions/archive.ts](file:///C:/dev/eLeave/src/app/actions/archive.ts)

- [ ] **Step 1: Implement `archiveRepairsJob`**
  - ใช้สิทธิ์ตรวจสอบ `repair:archive`
  - อ่านใบแจ้งซ่อมที่ซ่อมเสร็จ/ยกเลิก และอายุ > 180 วัน ครั้งละ 200 รายการ โดยมีการเรียงลำดับ `orderBy: { updatedAt: "asc" }`
  - จำกัดลูปประมวลผลสูงสุด `for (let batchNo = 0; batchNo < 100; batchNo++)` เพื่อป้องกันลูปอินฟินิตี้
  - เขียนการจัดส่งข้อมูลใน `prisma.$transaction` โดยล็อกด้วย pg_advisory_lock เพื่อความ Idempotent:
    ```typescript
    await prisma.$transaction(async (tx) => {
      // 1. Lock concurrent executions atomically using PostgreSQL Advisory Locks
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(45729);');
      // ... archiver logic
    }, { timeout: 30000 });
    ```
  - ดึงข้อมูล `oldestRecordAt` (จากเอกสารใบงานแรก `batch[0].createdAt`) และ `newestRecordAt` (จากเอกสารใบงานสุดท้าย `batch[batch.length - 1].createdAt`) บันทึกลงตาราง `RepairArchive`
  - ทำลายใบแจ้งซ่อมหลักใน `RepairRequest` (ซึ่งจะ Cascade Delete รูปภาพที่เกี่ยวข้องออกไปโดยอัตโนมัติ) และบันทึก Log ลง `SystemLog` ในรูปแบบโครงสร้างพร้อม Metadata
  - จัดโครงสร้าง JSON ในฟิลด์ `payload` ให้อยู่ในฟอร์แมต Schema Evolution:
    ```typescript
    const payload = {
      version: 1,
      records: sanitizedPayload
    }
    ```

- [ ] **Step 2: Commit changes**
  - Run: `git add src/app/actions/archive.ts`
  - Run: `git commit -m "feat: implement transaction-safe ETL Archiver job with advisory locks, range metadata, batch limit, versioned payload, and 30s timeout"`

---

### Task 4: UI Integration (Sidebar, Settings, Forms, & Dashboard)

**Files:**
- Modify: [src/app/(app)/layout.tsx](file:///C:/dev/eLeave/src/app/(app)/layout.tsx)
- Modify: [src/app/(app)/settings/page.tsx](file:///C:/dev/eLeave/src/app/(app)/settings/page.tsx)
- Create: `src/app/(app)/repair/page.tsx`
- Create: `src/app/(app)/repair/new/page.tsx`

- [ ] **Step 1: Update Sidebar layout menu**
  - ตรวจเช็คสิทธิ์ `repair:view.own` หรือ `repair:view.all` เพื่อเรนเดอร์เมนู "ระบบแจ้งซ่อม" (ใช้ไอคอน `Wrench`) ภายใต้เมนู "งานทั่วไป"

- [ ] **Step 2: Update Settings Page**
  - สวิตช์เปิด/ปิด `enableRepair` และแผงสั่งงานคลังจดหมายเหตุปุ่มกด "Archive Now" สำหรับผู้ดูแลระบบ

- [ ] **Step 3: Implement Request Form Page (`new/page.tsx`)**
  - ฟอร์มระบุข้อมูลพร้อม Canvas Auto Resizing (JPEG, Quality 0.7, ดันคุณภาพลงมาหากขนาดหลังย่อเกิน 100 KB)
  - จำกัดการเพิ่มรูปภาพ BEFORE ไม่เกิน 2 รูป

- [ ] **Step 4: Implement Dashboard & List View Page (`repair/page.tsx`)**
  - การ์ดสถิติ `.stat-card` และตารางรายการซ่อมแยกตามสิทธิ์ (`repair:view.own` หรือ `repair:view.all`)
  - หน้ารายละเอียดงานซ่อมพร้อม Thumbnail 120x120 และ Lightbox Modal ขยายภาพเมื่อคลิก
  - ช่องอัปเดตสถานะของช่างพร้อมใส่ภาพ AFTER ไม่เกิน 2 รูป และค่าใช้จ่าย

- [ ] **Step 5: Verify build stability**
  - Run: `npm run build`
  - Verify: Build สำเร็จโดยไม่มีข้อผิดพลาด

- [ ] **Step 6: Commit changes**
  - Run: `git add src/app/(app)/layout.tsx src/app/(app)/settings/page.tsx src/app/(app)/repair/`
  - Run: `git commit -m "feat: integrate repair frontend UI components and pages"`

---

## Verification Plan

### Automated Verification
- ตรวจทานความถูกต้องด้วย `npm run build` เพื่อตรวจสอบ Type ล่าสุดของ Decimal และ BYTEA ในหน้าเพจต่างๆ

### Manual Verification
1. **การแจ้งซ่อมใหม่และระบบบีบอัดภาพอัตโนมัติ**:
   - ลองแนบไฟล์ภาพขนาดใหญ่ (5 MB) ภาพจะถูก Canvas ย่อให้เหลือกว้าง 800px เป็นไฟล์ JPEG ขนาด < 100 KB ทันที
   - ตรวจสอบว่าไม่สามารถส่งรูปภาพ BEFORE เกิน 2 รูป และ AFTER เกิน 2 รูป
2. **การดึงภาพปลอดภัย (Stream API)**:
   - ทดสอบเข้าดู URL `/api/repair/photo/[id]` ของผู้ใช้อื่นที่ไม่ใช่เจ้าของงานและไม่มีสิทธิ์ `repair:view.all` ต้องถูกส่งกลับเป็น 403
   - ตรวจดู Cache-Control headers ของภาพถ่ายในเครือข่ายเบราว์เซอร์ (ต้องแสดงอายุ 7 วัน) และมี ETag ทำงาน
3. **ETL Archive**:
   - กดปุ่ม "Archive Now" และตรวจสอบในฐานข้อมูลว่าประวัติการแจ้งซ่อมที่เก่าที่สุดถูกย้ายก่อนและประวัติตาราง `RepairPhoto` ถูกลบออกถาวรอย่างถูกต้อง
   - ตรวจดูบันทึก SystemLog ว่าขึ้นข้อมูลที่มีโครงสร้างสมบูรณ์และถูกต้อง
4. **Lost Update Protection**:
   - เปิดหน้าแก้ไขงานแจ้งซ่อมเดียวกันในเบราว์เซอร์ 2 แท็บ (หรือ 2 บัญชี) แท็บแรกกดยืนยันปิดงาน แท็บที่สองกดอัปเดตเป็นดำเนินการ แท็บที่สองต้องแสดงความผิดพลาดและปฏิเสธไม่ให้บันทึกทับข้อมูลเดิม
