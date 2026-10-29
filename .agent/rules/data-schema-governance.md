# Cross-System Data Schema Governance Rule (กฎเหล็กการเชื่อมโยง Schema ระหว่าง ระบบจัดการชั้นเรียน ⟷ ระบบ SMS)

ระบบ `09 ระบบจัดการชั้นเรียน` และ `ระบบบริหารจัดการโรงเรียน (SMS / SuraLeave)` ใช้ฐานข้อมูล **Neon PostgreSQL ก้อนเดียวกัน**
เพื่อป้องกันปัญหา **Split-Brain Schema** (บันทึกตารางหนึ่งแต่อีกระบบไปอ่านอีกตารางหนึ่ง ทำให้ Dashboard แสดงผลไม่ตรงกัน) นักพัฒนาและ AI Agent ทุกตัวต้องปฏิบัติตามกฎเหล็กลำดับนี้โดยไม่มีข้อยกเว้น:

---

## 1. 🗺️ ต้องตรวจสอบ `docs/DATA_SCHEMA_INDEX.md` ก่อนแก้โค้ดฐานข้อมูลทุกครั้ง
- ก่อนเขียนหรือแก้ไขคำสั่ง `.from(...)`, `.rpc(...)`, หรือ `prisma.<model>` **ต้องเปิดอ่าน [`docs/DATA_SCHEMA_INDEX.md`](../../docs/DATA_SCHEMA_INDEX.md) เสมอ**
- ห้ามเดาชื่อตารางเองเด็ดขาดว่าควรใช้ `Student` หรือ `students` หรือ `StudentEnrollment` หรือ `student_enrollments`

---

## 2. 🏛️ กฎการแยกบทบาทตาราง (Single Source of Truth Contract)

| หมวดหมู่ข้อมูล | ตารางหลักสำหรับบันทึก (Canonical Write) | ตาราง/View สำหรับดึงแสดงผล (Read) | ตารางที่ห้ามใช้เก็บข้อมูลจริง (Forbidden) |
| :--- | :--- | :--- | :--- |
| **1. ข้อมูลส่วนตัวนักเรียน & เบอร์ผู้ปกครอง** | `"Student"` (หรือผ่าน `INSTEAD OF UPDATE` บน View `public.students`) | **จัดการชั้นเรียน**: `public.students` (View)<br>**SMS**: `prisma.student` (`"Student"`) | ⛔ ห้ามใช้ `kps_cloud_store` (`cls_students_*`) เป็น Source of Truth |
| **2. สังกัดห้องเรียนปัจจุบัน & เลขที่** | `"StudentEnrollment"` (`status = 'ENROLLED'`) ⟷ `public.student_enrollments` (`status = 'ACTIVE'`) | **จัดการชั้นเรียน**: `public.students` (`classroom_id`, `seat_no`) & `public.classrooms` (`student_count`)<br>**SMS**: `prisma.studentEnrollment` | ⛔ ห้ามนำจำนวนนักเรียนจาก `localStorage` ไปทับ `student_count` จากฐานข้อมูล |
| **3. ข้อมูลห้องเรียน & ครูที่ปรึกษา** | `"ClassRoom"` | **จัดการชั้นเรียน**: `public.classrooms` (View)<br>**SMS**: `prisma.classRoom` (`"ClassRoom"`) | ⛔ ห้ามใช้ `kps_cloud_store` (`cls_classrooms_data`) ทับตาราง `"ClassRoom"` |
| **4. การเช็คชื่อนักเรียน (หน้าเสาธง & รายคาบ)** | `"Attendance"` (`period = 0` เช้า, `period >= 1` รายคาบ) ⟷ ซิงค์เข้า `"StudentMorningAttendance"` | **จัดการชั้นเรียน**: `"Attendance"` (`studentId IS NOT NULL`)<br>**SMS Dashboard**: `"StudentMorningAttendance"` (นักเรียน) แยกจาก `"Attendance"` (`userId IS NOT NULL` ของครู) | ⛔ ห้ามปนแถวเช็คชื่อนักเรียน (`studentId`) กับเวลาเข้างานครู (`userId`) |
| **5. คะแนนเก็บ & การตัดเกรด** | `"AssessmentColumn"` + `"StudentScore"` | `"AssessmentColumn"` + `"StudentScore"` (ทั้งหน้าปพ.5 และหน้าทำเนียบศิษย์เก่า) | ⛔ ห้ามเก็บคะแนนรายวิชาใน `kps_cloud_store` |
| **6. ตั้งค่าหน้าเว็บ (UI Config / เสียงออด / แบนเนอร์)** | `public.kps_cloud_store` | `public.kps_cloud_store` (Delta Sync เฉพาะคีย์ตั้งค่า) | ⛔ ห้ามนำข้อมูล Relational (นักเรียน/ห้อง/คะแนน) ยัดลง `kps_cloud_store` |

---

## 3. 🚫 ข้อห้ามเด็ดขาด (Strict Prohibitions)
1. **ห้ามสร้างตารางซ้ำซ้อน (No Duplicate Tables)**:
   - หากมีตาราง Prisma อยู่แล้ว (เช่น `"Student"`, `"StudentEnrollment"`, `"ClassRoom"`, `"AssessmentColumn"`, `"StudentScore"`) ห้ามสร้างตาราง `snake_case` แยกต่างหากโดยไม่มี PostgreSQL Trigger ซิงค์ข้อมูลแบบอัตโนมัติ 100%
2. **ห้ามให้ Local Fallback ทับค่าจริงจากฐานข้อมูล**:
   - เมื่อดึงข้อมูลจาก PostgreSQL สำเร็จ (เช่น `classrooms.student_count` หรือรายชื่อนักเรียนจาก `masterDataService`) ห้ามเขียนโค้ดให้ค่าใน `localStorage` มาทับตัวเลขจากฐานข้อมูลเด็ดขาด
3. **ห้ามลืมอัปเดต View เมื่อเพิ่มคอลัมน์ใน Base Table**:
   - ทุกครั้งที่ `ALTER TABLE "Student"` หรือ `"ClassRoom"` เพื่อเพิ่มฟิลด์ที่ต้องใช้ร่วมกัน ต้องอัปเดต `CREATE OR REPLACE VIEW public.students` (หรือ `public.classrooms`) และ `INSTEAD OF UPDATE` Trigger เสมอ

---

## 4. 🔄 ขั้นตอนบังคับหลังแก้ไขโค้ดฐานข้อมูล (Mandatory Verification)
ทุกครั้งที่มีการเพิ่ม/แก้ไขไฟล์ใน `src/services/`, `migrations/`, หรือ `prisma/schema.prisma` ต้องรันคำสั่งต่อไปนี้เพื่ออัปเดตแผนผังผลกระทบข้ามระบบให้เป็นปัจจุบันเสมอ:
```bash
node scripts/index_data_schema.mjs
node scripts/index_codebase.mjs
```
