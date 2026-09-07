# Session Handoff & System Architectural Rulebook (v2.0)

**Project:** KP e-Leave System (ระบบบริหารจัดการการลาออนไลน์ โรงเรียนกุดจับประชาสรรค์)  
**Date:** 2026-09-02  
**Working Branch:** `dev`  
**Production Branch:** `main`  
**Git Remotes:**
- `origin`: `https://github.com/Kutchapprachasan-School/KP_eLeave_System.git`
- `school`: `https://github.com/khamyangpittayaschool-code/e-leave.git`

---

## 1. Strict User Directives & Prompt Rules (กฎเหล็กประจำระบบ)

1. **Development Branch Rule (กฎการพัฒนาบนกิ่ง dev เท่านั้น):**
   > *"ต่อไปพัฒนาใน bruch เท่านั้น"*
   - งานเขียนโค้ด ทดสอบ แก้ไขไฟล์ทุกชนิด **ต้องทำบนกิ่ง `dev` เท่านั้น**
   - **ห้าม Commit ตรงเข้ากิ่ง `main` โดยเด็ดขาด** (กิ่ง `main` จะใช้เมื่อผู้ใช้สั่งให้ "เอาขึ้น main" หรือ Deploy ขึ้น Production เท่านั้น)
2. **Private & Authenticated Signature Access (กฎความปลอดภัยลายเซ็นต์):**
   - **ห้ามเปิด Public URL ให้กับภาพลายเซ็นต์เด็ดขาด** เพื่อป้องกันการถูกสุ่มเดาหรือดาวน์โหลดไปปลอมแปลง
   - ทุกการเรียกดูภาพลายเซ็นต์ต้องผ่าน Route [`/api/signatures/[userId]`](file:///C:/dev/eLeave/src/app/api/signatures/%5BuserId%5D/route.ts) ซึ่งตรวจสอบ Session (`auth.api.getSession`) เสมอ
   - มีระบบ In-Memory Fast Cache และ ETag เพื่อรองรับการเปิดหรือพิมพ์ PDF แบบกลุ่ม (Batch Print 50-100 ใบ) ได้ในเวลา < 1ms โดยไม่เกิด Serverless Timeout
3. **Immutable Versioned Signatures (กฎห้ามเขียนทับลายเซ็นต์เดิม):**
   - การบันทึกลายเซ็นต์ต้องเป็นแบบ **Immutable** โดยใส่ Timestamp และ Hash ทุกครั้ง (`signatures/<userId>/sig_<timestamp>_<hash>.png`)
   - **ห้ามเขียนทับไฟล์เดิม** เพื่อให้ใบลาและประวัติในอดีตคงลายเซ็นต์ ณ วันที่ลงนามไว้ 100% ตามระเบียบงานสารบรรณ
4. **Pure ASCII Storage Keys for Attachments (กฎความปลอดภัยของ URL ภาษาไทย):**
   - ไฟล์ที่อัปโหลดขึ้น Storage ต้องใช้ชื่อไฟล์และโฟลเดอร์เป็น **ASCII + UUID Hash ล้วนๆ** (`leaves/<reqId>/<timestamp>_<hash>.<ext>`)
   - เพื่อป้องกันปัญหา Percent-Encoding (`%E0%B8...`) ใน PDF Generators, HTTP Headers และ Mobile Browsers
   - ชื่อภาษาไทย (เช่น `เอกสารแนบ_1.jpeg`, `ใบรับรองแพทย์.pdf`) จะถูกเก็บไว้เฉพาะในฟิลด์ `displayName` ในฐานข้อมูลเพื่อแสดงผลบนหน้าเว็บเท่านั้น
5. **Automated CI/CD Dual-Remote Sync (ระบบซิงก์กิ่งอัตโนมัติ):**
   - ยกเลิกการ Push 2 Remotes แบบ Manual โดยเด็ดขาด เพื่อป้องกัน Human Error
   - มี GitHub Actions Workflow [`.github/workflows/mirror-to-school.yml`](file:///C:/dev/eLeave/.github/workflows/mirror-to-school.yml) ทำหน้าที่ Mirror โค้ดจาก `origin/main` ไปยัง `school/main` โดยอัตโนมัติเมื่อมีการ Merge เข้า `main`
6. **No Floating Telemetry Widgets:**
   - ห้ามเพิ่ม Floating Widget หรือแท็บมอนิเตอร์ Egress เข้ามาในหน้าเว็บ เพื่อรักษาความเร็วและความสะอาดตาของ UI

---

## 2. System Architecture & Cloud Locations

```mermaid
flowchart TD
    subgraph Client["Client / Browser / PDF Print"]
        Viewer["Leave View / PDF Generator"]
    end

    subgraph Security["1. Authenticated API Layer"]
        SigAPI["GET /api/signatures/[userId]"]
        AuthCheck{"auth.api.getSession<br/>(Is Authenticated?)"}
        SigAPI --> AuthCheck
    end

    subgraph Storage["2. Supabase Storage (Bucket data1)"]
        Supa[(Supabase Storage)]
        SigStore["signatures/<userId>/sig_<timestamp>_<hash>.png<br/>(Immutable Versioned)"]
        LeaveStore["leaves/<reqId>/<timestamp>_<hash>.<ext><br/>(Pure ASCII Path)"]
        Supa --- SigStore
        Supa --- LeaveStore
    end

    subgraph Database["3. PostgreSQL Database"]
        UserTable["User.signatureUrl = /api/signatures/<userId>"]
        LeaveTable["LeaveRequest.documentUrl = JSON with displayName & ASCII url"]
    end

    Viewer -->|1. Authenticated Request| SigAPI
    AuthCheck -->|2. Authorized| Supa
    AuthCheck -->|3. Unauthorized| Deny[401 / 403 Forbidden]
    Supa -->|4. Stream Transparent PNG / SVG (<1ms Cached)| Viewer
```

---

## 3. Key Code Locations & Engines

| โมดูล / หน้าที่ | ไฟล์โค้ดหลัก | คำอธิบายการทำงาน |
|---|---|---|
| **Private Signature Streaming API** | [`src/app/api/signatures/[userId]/route.ts`](file:///C:/dev/eLeave/src/app/api/signatures/%5BuserId%5D/route.ts) | สตรีมลายเซ็นต์เฉพาะผู้มีสิทธิ์ พร้อม In-Memory Fast Cache ป้องกัน Timeout ตอน Batch PDF |
| **Resilient Storage Upload** | [`src/services/storage/resilient-upload.ts`](file:///C:/dev/eLeave/src/services/storage/resilient-upload.ts) | จัดการอัปโหลดไฟล์ลายเซ็นต์ (Immutable) และเอกสารแนบ (ASCII Key) พร้อมระบบ Fallback |
| **User Signature Actions** | [`src/app/actions/user.ts`](file:///C:/dev/eLeave/src/app/actions/user.ts) | บันทึกลายเซ็นต์ใหม่ และอัปเดตฐานข้อมูลให้ชี้มาที่ `/api/signatures/[userId]` |
| **Document Upload Action** | [`src/app/actions/upload.ts`](file:///C:/dev/eLeave/src/app/actions/upload.ts) | อัปโหลดเอกสารแนบโดยแยก `displayName` ภาษาไทยกับ `storageKey` ASCII ปลอดภัย 100% |
| **Attachment Normalizer** | [`src/lib/attachment-utils.ts`](file:///C:/dev/eLeave/src/lib/attachment-utils.ts) | ตัวแปลง URL สากล รองรับทั้ง JSON, CSV, และถอดรหัส `displayName` |
| **Print & Batch Layouts** | [`src/app/print/leave/[id]/page.tsx`](file:///C:/dev/eLeave/src/app/print/leave/%5Bid%5D/page.tsx) & [`batch/page.tsx`](file:///C:/dev/eLeave/src/app/print/leave/batch/page.tsx) | ระบบออกเอกสารใบลาเดี่ยวและกลุ่ม ดึงลายเซ็นต์ผ่าน Private Stream ไวระดับมิลลิวินาที |
| **CI/CD Mirror Pipeline** | [`.github/workflows/mirror-to-school.yml`](file:///C:/dev/eLeave/.github/workflows/mirror-to-school.yml) | GitHub Actions ทำหน้าที่ซิงก์โค้ด `main` ไปยัง `school/main` โดยอัตโนมัติ |

---

## 4. Verification & Testing Standards

1. **Unit Test Suite:**
   ```bash
   node --test eLeave/tests/unit/storageProvider.test.js eLeave/tests/unit/attachmentUtils.test.js eLeave/tests/unit/vectorSignature.test.js eLeave/tests/unit/signatureApiSecurity.test.js
   ```
2. **Security Checks:**
   - คำขอที่ไม่ผ่านการล็อกอิน (`Unauthenticated`) เมื่อเรียก `/api/signatures/[userId]` ต้องได้รับ `HTTP 401 Unauthorized` ทันที
3. **Deployment Rule:**
   - พัฒนาและทดสอบบนกิ่ง `dev`
   - เมื่อต้องการ Deploy เข้า `main` ให้ทำการ Merge `dev` ➔ `main` และผลักดันขึ้น `origin main` ซึ่ง CI/CD จะทำการ Mirror ไปที่ `school main` ให้อัตโนมัติ
