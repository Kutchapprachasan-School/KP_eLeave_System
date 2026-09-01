# Session Handoff & System Architectural Rulebook

**Project:** KP e-Leave System (ระบบบริหารจัดการการลาออนไลน์ โรงเรียนกุดจับประชาสรรค์)  
**Date:** 2026-09-01  
**Working Branch:** `dev`  
**Production Branch:** `main`  
**Git Remotes:**
- `origin`: `https://github.com/Kutchapprachasan-School/KP_eLeave_System.git`
- `school`: `https://github.com/khamyangpittayaschool-code/e-leave.git`

---

## 1. Strict User Directives & Prompt Rules (กฎเหล็กประจำระบบ)

1. **Development Branch Rule (กฎการพัฒนาบนกิ่ง dev เท่านั้น):**
   > *"ต่อไปพัฒนาใน bruch เท่านั้น"*
   - **กฎ:** งานเขียนโค้ด ทดสอบ แก้ไขไฟล์ทุกชนิด **ต้องทำบนกิ่ง `dev` เท่านั้น**
   - **ห้าม Commit ตรงเข้ากิ่ง `main` โดยเด็ดขาด** (กิ่ง `main` จะใช้เมื่อผู้ใช้สั่งให้ "เอาขึ้น main" หรือ Deploy ขึ้น Production เท่านั้น)
2. **No Egress Inspector / Floating Telemetry:**
   > *"เอา Egress & Data Inspector ออก เริ่มไม่มีประโยชน์เท่าไรแล้วแหละ ตรวจสอบไม่ได้จริง"*
   - **กฎ:** ห้ามเพิ่มวิดเจ็ตลอย (Floating Widget) หรือแท็บ Telemetry Egress Monitor เข้ามาในหน้าเว็บอีก เพื่อรักษาความเร็วและความสะอาดตาของ UI 100%
3. **Standardized Attachment Filename Patterns:**
   > *"คือชื่อเอกสารแนบบางทีก็ยาวเกินไปให้ปรับแก้ชื่อไฟล์เอกสารแนบก่อนการบันทึก ขอเป็นแบบที่มีแพทเทิร์นหน่อยจะได้ดูง่ายๆ"*
   - **กฎ:** ไฟล์แนบการลาที่มาจากกล้องมือถือ/LINE App (เช่น `att.eiUtx0...` หรือ `1788261194741-IMG_...`) **ต้องแปลงเป็นแพทเทิร์นมาตรฐานก่อนบันทึกเสมอ** เช่น `เอกสารแนบ_1.jpeg`, `เอกสารแนบ_2.pdf`
4. **Signature Storage & Size Constraints (กฎขนาดและรูปแบบลายเซ็นต์):**
   > *"ดึง Base64 ต้นฉบับจากฐานข้อมูล ➔ ถอดรหัสเป็น Binary Buffer .png แท้ๆ แบบ 1:1 ... และปรับขนาดคนที่เกิน 50 kb ลงให้ไม่เกิน 50kb และการอัพโหลดในอนาคตให้ปรับขนาดไฟล์ลดลง โดยคงความละเอียดของภาพไว้ให้ได้มากที่สุด"*
   - **กฎ:** 
     - ลายเซ็นต์ทั้งหมดต้องบันทึกเป็น **PNG โปร่งใส (Transparent Alpha) หรือ Vector SVG** และอัปโหลดขึ้น **Supabase Storage** (`Bucket: data1`)
     - **ขนาดไฟล์ต้องถูกควบคุมให้ <= 50 KB ทุกรูปเสมอ** (ผ่าน PNG Palette Quantization)
     - ฐานข้อมูล PostgreSQL ต้องเก็บเป็น Public CDN Link สั้นๆ เท่านั้น (**ห้ามเก็บ Base64 ก้อนใหญ่ในตาราง `User`**)

---

## 2. System & Cloud Architecture Updates (สถาปัตยกรรมระบบล่าสุด)

### 1. Cloud Storage Architecture (Supabase Storage Bucket: `data1`)
* **Public CDN URL Pattern:**
  `https://ngzflajpifmsvhldhviu.supabase.co/storage/v1/object/public/data1/...`
* **Signature Storage Pattern:**
  `signatures/<userId>/signature.png` (Deterministic key — เขียนทับไฟล์เดิมได้ทันที ไม่เกิดไฟล์ขยะสะสม)
* **Leave Attachments Pattern:**
  `leaves/<requestId>/<timestamp>-<cleanFileName>`
* **Universal URL Normalizer ([`attachment-utils.ts`](file:///C:/dev/eLeave/src/lib/attachment-utils.ts)):**
  - ฟังก์ชัน `normalizeStorageUrl(url)` จะแปลง Signed URL ชั่วคราวที่มี Token (`/storage/v1/object/sign/...`) ให้กลายเป็น Permanent Public URL (`/storage/v1/object/public/...`) อัตโนมัติ ป้องกันปัญหา URL หมดอายุ (`InvalidJWT`) 100%

### 2. Database Performance & Optimization
* **Database Reduction:**
  - ลดขนาดตาราง `User` ใน PostgreSQL ลง **99.4%** (จาก 1,207 KB เหลือเพียง ~7.77 KB)
  - ประหยัด Database Egress (Shared Pooler) ได้มากกว่า 90%
* **Connection Strings:**
  - `DATABASE_URL`: `postgresql://postgres.ngzflajpifmsvhldhviu:...@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
  - `DIRECT_URL`: `postgresql://postgres.ngzflajpifmsvhldhviu:...@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`

---

## 3. Key Code Locations & Engines (ไฟล์สำคัญและโมดูลหลัก)

| โมดูล / หน้าที่ | ไฟล์โค้ดหลัก | คำอธิบายการทำงาน |
|---|---|---|
| **Universal Attachment Parser** | [`src/lib/attachment-utils.ts`](file:///C:/dev/eLeave/src/lib/attachment-utils.ts) | แปลงและจัดรูปแบบชื่อไฟล์แนบเป็น `เอกสารแนบ_1.jpeg`, รองรับทั้ง JSON Array, CSV, และ URL |
| **Resilient Storage Upload** | [`src/services/storage/resilient-upload.ts`](file:///C:/dev/eLeave/src/services/storage/resilient-upload.ts) | จัดการอัปโหลดไฟล์ลายเซ็นต์/เอกสารแนบขึ้น Supabase พร้อมระบบ Fallback ป้องกันระบบล่ม |
| **User & Signature Actions** | [`src/app/actions/user.ts`](file:///C:/dev/eLeave/src/app/actions/user.ts) | `setUserSignature` และ `updateProfile` ประมวลผลภาพ PNG โปร่งใส <= 50KB และบันทึก URL ลง Storage |
| **Document Upload Action** | [`src/app/actions/upload.ts`](file:///C:/dev/eLeave/src/app/actions/upload.ts) | อัปโหลดเอกสารแนบใบลาขึ้น Storage พร้อมตั้งชื่อไฟล์ให้สะอาดเรียบร้อย |
| **Leave Request Form** | [`src/app/(app)/request/page.tsx`](file:///C:/dev/eLeave/src/app/(app)/request/page.tsx) | ฟอร์มขอลา ตรวจสอบโควตา และจัดการไฟล์แนบ 2 ไฟล์ |
| **Print & PDF Layouts** | [`src/app/print/leave/[id]/page.tsx`](file:///C:/dev/eLeave/src/app/print/leave/%5Bid%5D/page.tsx) & [`batch/page.tsx`](file:///C:/dev/eLeave/src/app/print/leave/batch/page.tsx) | เทมเพลตใบลามาตรฐานสำหรับพิมพ์และออกไฟล์ PDF รองรับลายเซ็นต์คมชัดระดับสูง |
| **Profile & Signature Canvas** | [`src/app/(app)/profile/page.tsx`](file:///C:/dev/eLeave/src/app/(app)/profile/page.tsx) | หน้าโปรไฟล์และ Canvas วาดลายเซ็นต์ Export เป็น Vector SVG / HD PNG |

---

## 4. Verification & Testing Standards (มาตรฐานการทดสอบ)

1. **Unit Test Suite:**
   ```bash
   node --test eLeave/tests/unit/storageProvider.test.js eLeave/tests/unit/attachmentUtils.test.js eLeave/tests/unit/vectorSignature.test.js
   ```
2. **Storage CDN Integrity Check:**
   - ทุกลายเซ็นต์ต้องคืนค่า `HTTP 200 OK`
   - ขนาดไฟล์ลายเซ็นต์ต้อง **<= 50 KB** ทุกรายการ
3. **Multi-Remote Sync:**
   - เมื่อ Deploy `main` ต้อง Push ให้ครบทั้ง 2 Remotes:
     - `git push origin main`
     - `git push school main`
   - เมื่อ Push เสร็จต้องสลับกลับมาที่ `git checkout dev` เสมอ
