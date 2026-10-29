# 🗺️ DATA SCHEMA INDEX & CROSS-SYSTEM CONTRACT
> **Single Source of Truth ระหว่าง `09 ระบบจัดการชั้นเรียน` ⟷ `ระบบ SMS (SuraLeave / School-System)`**
> *อัปเดตอัตโนมัติโดย `node scripts/index_data_schema.mjs` — ห้ามแก้ไขส่วน Auto-Generated ด้วยมือ*

---

## 🚨 1. สรุปคำตอบชัดๆ: `"Student"` vs `students` vs `kps_cloud_store` ใช้ตัวไหนกันแน่?

เพื่อให้ทั้ง **ระบบ SMS** และ **ระบบจัดการชั้นเรียน** แสดงผลตรงกัน 100% และไม่เกิดปัญหาข้อมูลตีกัน (Split-Brain) กฎเหล็กของสถาปัตยกรรมคือ:

| ชื่อในฐานข้อมูล | ประเภท (Type) | บทบาทหน้าที่ (Role) | กฎการใช้งาน (Strict Rule) |
| :--- | :--- | :--- | :--- |
| **`"Student"`** | **Base Table (ตารางจริง)** | เก็บประวัติส่วนตัวนักเรียน, รหัสประจำตัว, ชื่อ-สกุล, **เบอร์ผู้ปกครอง (`parentPhone`)**, สถานะศิษย์เก่า (`academic_status`) | ✅ **ตารางหลักสำหรับบันทึก (WRITE)** ข้อมูลตัวตนนักเรียนทั้งจากฝั่ง SMS และระบบจัดการชั้นเรียน |
| **`"StudentEnrollment"`** | **Base Table (ตารางจริง)** | เก็บว่านักเรียนคนไหน อยู่ห้องอะไร (`classRoomId`), เลขที่เท่าไหร่ (`rollNumber`), ปีการศึกษา/เทอมไหน (`status = 'ENROLLED'`) | ✅ **ตารางหลักสำหรับบันทึกสังกัดห้องเรียน** ที่ทั้ง **SMS Dashboard** และ **View `students` / `classrooms`** ใช้ดึงข้อมูล! |
| **`public.students`** | **PostgreSQL VIEW (ตารางเสมือน)** | นำ `"Student"` + `"StudentEnrollment"` มาเชื่อม (JOIN) กันให้อัตโนมัติ พร้อมแปลงชื่อคอลัมน์ให้ระบบจัดการชั้นเรียนใช้งานง่าย | ✅ **ใช้สำหรับดึงข้อมูล (READ)** ในระบบจัดการชั้นเรียน (`masterDataService`, `smsNotificationService`) และมี `INSTEAD OF Trigger` ส่งคำสั่งแก้ไขกลับไปที่ `"Student"` และ `"StudentEnrollment"` |
| **`public.classrooms`** | **PostgreSQL VIEW (ตารางเสมือน)** | นำ `"ClassRoom"` + `COUNT("StudentEnrollment")` มาคำนวณยอดนักเรียนรายห้อง (`student_count`) แบบเรียลไทม์ | ✅ **ใช้สำหรับดึงรายชื่อห้องและจำนวนนักเรียน (READ)** ในระบบจัดการชั้นเรียน (`classroomService.getAll()`) |
| **`public.student_enrollments`** | **Workflow Table (ประวัติเลื่อนชั้น)** | เก็บประวัติการเลื่อนชั้น/ซ้ำชั้น/เกรดเฉลี่ยสะสมรายเทอม ผูกกับ `promotion_batches` | 🔄 **ต้อง Sync อัตโนมัติกับ `"StudentEnrollment"`** เสมอผ่าน Trigger ห้ามปล่อยให้ข้อมูลแยกขาดจากกัน |
| **`public.kps_cloud_store`** | **Key-Value Config Store** | เก็บเฉพาะ **การตั้งค่าหน้าเว็บ (UI Settings, ตารางเสียงออด, แบนเนอร์, ปฏิทินโรงเรียน)** | ⛔ **ห้ามใช้เก็บรายชื่อนักเรียน, ห้องเรียน, คะแนน หรือการเช็คชื่อเป็นอันขาด!** (คีย์ตระกูล `cls_students_*`, `cls_classrooms_data` เป็น Legacy Fallback เท่านั้น ห้ามนำไปทับค่าจากตารางจริง) |

---

## 🔗 2. สัญญาการเชื่อมต่อข้อมูลข้ามระบบ (Cross-System Domain Contract)

### 1. ข้อมูลประวัตินักเรียน & เบอร์ผู้ปกครอง (Student Identity & Parent Contacts)
- **ตารางบันทึกหลัก (Canonical Write)**: `"Student" (Base Table)`
- **ฝั่งระบบจัดการชั้นเรียนอ่านจาก (Classroom Read)**: `public.students (PostgreSQL View + INSTEAD OF Trigger)`
- **ฝั่งระบบ SMS อ่านจาก (SMS Prisma Model)**: `prisma.student ("Student")`
- **สิ่งที่ห้ามทำ (Forbidden)**: ❌ kps_cloud_store (ห้ามใช้ cls_students_* เป็น Source of Truth)
- **กฎการซิงค์ (Sync Rule)**: เมื่อแก้ไขชื่อ/เบอร์โทรผู้ปกครอง/สถานะนักเรียน ต้องเขียนลงตาราง `"Student"` เสมอ (หรือผ่าน View `public.students` ซึ่งมี Trigger `students_view_update_trigger` เขียนลง `"Student"` ให้อัตโนมัติ)

| ความหมายข้อมูล | คอลัมน์ฝั่ง SMS (`Prisma / Base Table`) | คอลัมน์ฝั่งจัดการชั้นเรียน (`View / Service`) |
| :--- | :--- | :--- |
| รหัสอ้างอิงหลัก (PK) | `Student.id` | `students.id` |
| รหัสประจำตัวนักเรียน 5 หลัก | `Student.studentCode` | `students.code / students."studentCode"` |
| คำนำหน้า + ชื่อ-สกุล | `Student.title, firstName, lastName` | `students.name, title, first_name, last_name` |
| ชื่อผู้ปกครอง (SMS) | `Student.parentName` | `students."parentName" / students.parent_name` |
| เบอร์โทรผู้ปกครอง (SMS) | `Student.parentPhone` | `students."parentPhone" / students.parent_phone` |
| สถานะการเรียน/จบการศึกษา | `Student.status, academic_status, graduated_academic_year` | `students.status, academic_status, graduated_academic_year` |

### 2. การสังกัดห้องเรียน, เลขที่ และการเลื่อนชั้น (Class Enrollment & Year-End Promotion)
- **ตารางบันทึกหลัก (Canonical Write)**: `"StudentEnrollment" (Base Table) ⟷ public.student_enrollments (Synced)`
- **ฝั่งระบบจัดการชั้นเรียนอ่านจาก (Classroom Read)**: `public.students (classroom_id, seat_no) & public.classrooms (student_count)`
- **ฝั่งระบบ SMS อ่านจาก (SMS Prisma Model)**: `prisma.studentEnrollment ("StudentEnrollment" WHERE status = 'ENROLLED')`
- **สิ่งที่ห้ามทำ (Forbidden)**: ❌ kps_cloud_store (ห้ามใช้จำนวนนักเรียนจาก localStorage ทับ student_count จาก DB)
- **กฎการซิงค์ (Sync Rule)**: ⚠️ จุดสำคัญที่สุด: ทั้ง View `public.students`, View `public.classrooms (student_count)` และหน้า Dashboard ฝั่ง SMS อ่านห้องเรียนปัจจุบันจาก `"StudentEnrollment"` (status = `ENROLLED`) ดังนั้นทุกการย้ายห้องหรือเลื่อนชั้นใน `student_enrollments` ต้อง Sync กลับไปที่ `"StudentEnrollment"` เสมอ (ผ่าน Trigger ใน `migrations/004_unify_sms_and_classroom_schema.sql`)

| ความหมายข้อมูล | คอลัมน์ฝั่ง SMS (`Prisma / Base Table`) | คอลัมน์ฝั่งจัดการชั้นเรียน (`View / Service`) |
| :--- | :--- | :--- |
| รหัสนักเรียน | `StudentEnrollment.studentId` | `student_enrollments.student_id / students.id` |
| รหัสห้องเรียนปัจจุบัน | `StudentEnrollment.classRoomId` | `student_enrollments.classroom_id / students.classroom_id` |
| เลขที่ในห้องเรียน | `StudentEnrollment.rollNumber` | `student_enrollments.roll_number / students.seat_no` |
| ปีการศึกษา / ภาคเรียน | `StudentEnrollment.academicYear, term` | `student_enrollments.academic_year, semester` |
| สถานะกำลังศึกษาในห้องนี้ | `status = 'ENROLLED'::"EnrollmentStatus"` | `status = 'ACTIVE' (ใน student_enrollments)` |

### 3. ข้อมูลห้องเรียนและครูที่ปรึกษา (Classrooms & Homeroom Advisers)
- **ตารางบันทึกหลัก (Canonical Write)**: `"ClassRoom" (Base Table)`
- **ฝั่งระบบจัดการชั้นเรียนอ่านจาก (Classroom Read)**: `public.classrooms (PostgreSQL View คำนวณ student_count จาก "StudentEnrollment")`
- **ฝั่งระบบ SMS อ่านจาก (SMS Prisma Model)**: `prisma.classRoom ("ClassRoom")`
- **สิ่งที่ห้ามทำ (Forbidden)**: ❌ kps_cloud_store (cls_classrooms_data ใช้เป็นเพียง Local Fallback เมื่อออฟไลน์เท่านั้น)
- **กฎการซิงค์ (Sync Rule)**: การเพิ่ม/ลบ/แก้ชื่อครูที่ปรึกษาห้องเรียน ต้องเขียนลง `"ClassRoom"` และห้ามนำค่า `localStorage` มาทับ `student_count` ที่คำนวณจากฐานข้อมูลจริง

| ความหมายข้อมูล | คอลัมน์ฝั่ง SMS (`Prisma / Base Table`) | คอลัมน์ฝั่งจัดการชั้นเรียน (`View / Service`) |
| :--- | :--- | :--- |
| รหัสห้องเรียน | `ClassRoom.id` | `classrooms.id` |
| ชื่อห้อง (เช่น ม.1/1) | `ClassRoom.name` | `classrooms.name / room_name` |
| ระดับชั้น / ห้องที่ | `ClassRoom.gradeLevel, roomNumber` | `classrooms.grade_level, room_number, level` |
| ครูที่ปรึกษา | `ClassRoom.adviser` | `classrooms.adviser` |
| จำนวนนักเรียนในห้อง | `COUNT(StudentEnrollment WHERE status=ENROLLED)` | `classrooms.student_count` |

### 4. การเช็คชื่อนักเรียน (หน้าเสาธง & รายคาบ) vs การลงเวลาบุคลากร (Attendance)
- **ตารางบันทึกหลัก (Canonical Write)**: `"Attendance" (จัดการชั้นเรียน) ⟷ "StudentMorningAttendance" / "StudentPeriodAttendance" (SMS)`
- **ฝั่งระบบจัดการชั้นเรียนอ่านจาก (Classroom Read)**: `"Attendance" (ผ่าน attendanceService.ts แยกตาม classroomId, date, period)`
- **ฝั่งระบบ SMS อ่านจาก (SMS Prisma Model)**: `prisma.studentMorningAttendance (เช็คชื่อเช้าของนักเรียน) & prisma.attendance (ลงเวลาครู/บุคลากร)`
- **สิ่งที่ห้ามทำ (Forbidden)**: ❌ kps_cloud_store (kp_morning_assembly_records / kp_period_attendance_records)
- **กฎการซิงค์ (Sync Rule)**: ⚠️ ตาราง `"Attendance"` ถูกใช้ร่วมกัน! แถวของครูจะมี `userId IS NOT NULL` ส่วนแถวเช็คชื่อนักเรียนจากระบบจัดการชั้นเรียนจะมี `studentId IS NOT NULL` และเมื่อเช็คชื่อเช้า (`period = 0`) Trigger ใน `004_unify_sms_and_classroom_schema.sql` จะซิงค์เข้า `"StudentMorningAttendance"` เพื่อให้ Dashboard ฝั่ง SMS แสดงยอดมาเรียนวันนี้ตรงกันทันที

| ความหมายข้อมูล | คอลัมน์ฝั่ง SMS (`Prisma / Base Table`) | คอลัมน์ฝั่งจัดการชั้นเรียน (`View / Service`) |
| :--- | :--- | :--- |
| เช็คชื่อหน้าเสาธง (ตอนเช้า) | `StudentMorningAttendance (enrollmentId, businessDate, status)` | `Attendance (studentId, classroomId, date, period = 0, status)` |
| เช็คชื่อรายคาบเรียน | `StudentPeriodAttendance (enrollmentId, scheduledSessionId, status)` | `Attendance (studentId, classroomId, date, period >= 1, status)` |
| ลงเวลาปฏิบัติราชการครู | `Attendance (userId, attendanceDate, checkInTime, status)` | `ไม่ใช้ในฝั่งจัดการชั้นเรียน (ต้องกรอง userId IS NOT NULL ฝั่ง SMS)` |

### 5. คะแนนเก็บ, การตัดเกรด และผลการเรียน (Grades, Scores & Transcripts)
- **ตารางบันทึกหลัก (Canonical Write)**: `"AssessmentColumn" + "StudentScore" (เกรดรายวิชา) & "Assignment" + "Score" (งานมอบหมาย)`
- **ฝั่งระบบจัดการชั้นเรียนอ่านจาก (Classroom Read)**: `"AssessmentColumn", "StudentScore", "Assignment", "Score"`
- **ฝั่งระบบ SMS อ่านจาก (SMS Prisma Model)**: `prisma.examSubmission / "AssessmentColumn" + "StudentScore"`
- **สิ่งที่ห้ามทำ (Forbidden)**: ❌ kps_cloud_store (ห้ามเก็บคะแนนใน JSONB รวม)
- **กฎการซิงค์ (Sync Rule)**: ก่อนสั่งเลื่อนชั้น (Promotion) หรือดูใบเกรดศิษย์เก่า (Alumni Transcript) ระบบจะเรียก `gradeService.flushOutbox()` เพื่อดันคะแนนจาก IndexedDB ขึ้น `"StudentScore"` เสมอ

| ความหมายข้อมูล | คอลัมน์ฝั่ง SMS (`Prisma / Base Table`) | คอลัมน์ฝั่งจัดการชั้นเรียน (`View / Service`) |
| :--- | :--- | :--- |
| ช่องคะแนนเก็บ/สอบ | `AssessmentColumn (id, courseId, classroomId, academicYear, semester, maxScore)` | `AssessmentColumn (gradeService.ts)` |
| คะแนนรายบุคคล | `StudentScore (id, studentId, assignmentId, score)` | `StudentScore (gradeService.ts & studentEnrollmentService.ts)` |

### 6. บัญชีผู้ใช้งานและครูผู้สอน (Users, Teachers & Auth)
- **ตารางบันทึกหลัก (Canonical Write)**: `"User" + "Account" (Better-Auth / Prisma)`
- **ฝั่งระบบจัดการชั้นเรียนอ่านจาก (Classroom Read)**: `"User" + "Account" (authService.ts, classroomService.ts)`
- **ฝั่งระบบ SMS อ่านจาก (SMS Prisma Model)**: `prisma.user + prisma.account + prisma.userDutyAssignment`
- **สิ่งที่ห้ามทำ (Forbidden)**: ❌ kps_cloud_store (kp_teacher_accounts_cache ใช้เป็นเพียงแคชชั่วคราว)
- **กฎการซิงค์ (Sync Rule)**: ใช้ตาราง `"User"` และ `"Account"` ร่วมกัน 100% ระหว่างระบบ SMS และระบบจัดการชั้นเรียน

| ความหมายข้อมูล | คอลัมน์ฝั่ง SMS (`Prisma / Base Table`) | คอลัมน์ฝั่งจัดการชั้นเรียน (`View / Service`) |
| :--- | :--- | :--- |
| บัญชีครู/บุคลากร | `User (id, email, name, username, role)` | `User (id, email, name, username, role)` |
| รหัสผ่านเข้าระบบ | `Account (userId, password)` | `Account (userId, password)` |

---

## 🛠️ 3. แผนผังผลกระทบเมื่อแก้ไข Schema (Impact Analysis Checklist)

> **วิธีใช้**: ก่อนที่คุณหรือ AI Agent จะแก้ไขโครงสร้างตารางหรือเปลี่ยนวิธีคำนวณตัวเลขบน Dashboard ให้ดูตารางนี้เพื่อรู้ทันทีว่าต้องตามไปปรับไฟล์ไหนบ้างในทั้ง 2 ระบบ:

| ถ้ามีการแก้ไขเรื่อง... | ตารางที่เกี่ยวข้อง | ไฟล์ใน `09 ระบบจัดการชั้นเรียน` ที่ต้องตรวจสอบ | ไฟล์ใน `ระบบ SMS (eLeave)` ที่ต้องตรวจสอบ |
| :--- | :--- | :--- | :--- |
| **เพิ่ม/ลบ/ย้ายห้องนักเรียน หรือเลื่อนชั้น** | `"Student"`, `"StudentEnrollment"`, `student_enrollments`, View `students`, View `classrooms` | [`masterDataService.ts`](file:///c:/dev/09%20ระบบจัดการชั้นเรียน/src/services/masterDataService.ts), [`studentService.ts`](file:///c:/dev/09%20ระบบจัดการชั้นเรียน/src/services/studentService.ts), [`classroomService.ts`](file:///c:/dev/09%20ระบบจัดการชั้นเรียน/src/services/classroomService.ts), [`studentPromotionService.ts`](file:///c:/dev/09%20ระบบจัดการชั้นเรียน/src/services/studentPromotionService.ts), [`studentEnrollmentService.ts`](file:///c:/dev/09%20ระบบจัดการชั้นเรียน/src/services/studentEnrollmentService.ts) | `src/app/actions/dashboard-widgets.ts` (`totalActiveStudents`), `src/app/actions/academic-planning.ts` |
| **แก้ไขเบอร์ผู้ปกครอง / ส่งแจ้งเตือน SMS** | `"Student"` (`parentPhone`, `parentName`), View `students` | [`smsNotificationService.ts`](file:///c:/dev/09%20ระบบจัดการชั้นเรียน/src/services/smsNotificationService.ts), [`masterDataService.ts`](file:///c:/dev/09%20ระบบจัดการชั้นเรียน/src/services/masterDataService.ts), [`localCacheDb.ts`](file:///c:/dev/09%20ระบบจัดการชั้นเรียน/src/services/localCacheDb.ts), `migrations/003_sms_and_parent_contacts_view.sql` | โมดูลข้อมูลนักเรียน (`prisma.student`) |
| **เช็คชื่อนักเรียนตอนเช้า (หน้าเสาธง) & รายคาบ** | `"Attendance"` (`period=0` / `period>=1`), `"StudentMorningAttendance"`, `"StudentPeriodAttendance"` | [`attendanceService.ts`](file:///c:/dev/09%20ระบบจัดการชั้นเรียน/src/services/attendanceService.ts), [`MorningAssemblyView.tsx`](file:///c:/dev/09%20ระบบจัดการชั้นเรียน/src/views/MorningAssemblyView.tsx), [`AttendanceView.tsx`](file:///c:/dev/09%20ระบบจัดการชั้นเรียน/src/views/AttendanceView.tsx) | `src/app/actions/dashboard-widgets.ts` (บรรทัด 365 `prisma.attendance` ของครู vs บรรทัด 394 `prisma.studentMorningAttendance` ของนักเรียน) |
| **บันทึกคะแนนเก็บ / ตัดเกรด / ใบปพ.** | `"AssessmentColumn"`, `"StudentScore"`, `"Assignment"`, `"Score"` | [`gradeService.ts`](file:///c:/dev/09%20ระบบจัดการชั้นเรียน/src/services/gradeService.ts), [`scoreService.ts`](file:///c:/dev/09%20ระบบจัดการชั้นเรียน/src/services/scoreService.ts), [`studentEnrollmentService.ts`](file:///c:/dev/09%20ระบบจัดการชั้นเรียน/src/services/studentEnrollmentService.ts) | `src/app/actions/dashboard-widgets.ts` (`getLearningOutcomeStats`), `src/app/actions/omr.ts` |
| **เพิ่ม/แก้ไขห้องเรียน หรือครูที่ปรึกษา** | `"ClassRoom"`, View `classrooms` | [`classroomService.ts`](file:///c:/dev/09%20ระบบจัดการชั้นเรียน/src/services/classroomService.ts), [`masterDataService.ts`](file:///c:/dev/09%20ระบบจัดการชั้นเรียน/src/services/masterDataService.ts) | `src/app/actions/dashboard-widgets.ts`, `src/app/actions/academic-planning.ts` |
| **จัดการบัญชีครู / รหัสผ่าน / สิทธิ์การใช้งาน** | `"User"`, `"Account"`, `"UserDutyAssignment"` | [`authService.ts`](file:///c:/dev/09%20ระบบจัดการชั้นเรียน/src/services/authService.ts), [`classroomService.ts`](file:///c:/dev/09%20ระบบจัดการชั้นเรียน/src/services/classroomService.ts), [`UserAccountsView.tsx`](file:///c:/dev/09%20ระบบจัดการชั้นเรียน/src/views/UserAccountsView.tsx) | `src/app/actions/admin.ts`, `src/app/actions/auth_actions.ts`, `src/lib/auth-session.ts` |

---

## 📍 4. ดัชนีการเรียกใช้ตารางจริงในโค้ด (Auto-Generated Code-to-Schema Map)

### 4.1 ฝั่งระบบจัดการชั้นเรียน (`09 ระบบจัดการชั้นเรียน/src`)

#### 🗂️ ตาราง/View: `Account` (1 จุดเรียกใช้)
- **[READ:SELECT]** [`src/services/authService.ts:106`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/authService.ts#L106)

#### 🗂️ ตาราง/View: `AssessmentColumn` (5 จุดเรียกใช้)
- **[READ:SELECT]** [`src/services/gradeService.ts:415`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/gradeService.ts#L415)
- **[WRITE:UPSERT]** [`src/services/gradeService.ts:546`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/gradeService.ts#L546)
- **[READ:SELECT]** [`src/services/gradeService.ts:592`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/gradeService.ts#L592)
- **[WRITE:UPSERT]** [`src/services/gradeService.ts:623`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/gradeService.ts#L623)
- **[READ:SELECT]** [`src/services/studentEnrollmentService.ts:124`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/studentEnrollmentService.ts#L124)

#### 🗂️ ตาราง/View: `Assignment` (4 จุดเรียกใช้)
- **[READ:SELECT]** [`src/services/assignmentService.ts:75`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/assignmentService.ts#L75)
- **[WRITE:INSERT]** [`src/services/assignmentService.ts:129`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/assignmentService.ts#L129)
- **[WRITE:UPDATE]** [`src/services/assignmentService.ts:162`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/assignmentService.ts#L162)
- **[WRITE:DELETE]** [`src/services/assignmentService.ts:196`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/assignmentService.ts#L196)

#### 🗂️ ตาราง/View: `Attendance` (2 จุดเรียกใช้)
- **[READ:SELECT]** [`src/services/attendanceService.ts:417`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/attendanceService.ts#L417)
- **[WRITE:UPSERT]** [`src/services/attendanceService.ts:593`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/attendanceService.ts#L593)

#### 🗂️ ตาราง/View: `BehaviorRecord` (3 จุดเรียกใช้)
- **[READ:SELECT]** [`src/services/behaviorService.ts:73`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/behaviorService.ts#L73)
- **[WRITE:INSERT]** [`src/services/behaviorService.ts:119`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/behaviorService.ts#L119)
- **[WRITE:DELETE]** [`src/services/behaviorService.ts:151`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/behaviorService.ts#L151)

#### 🗂️ ตาราง/View: `ClassRoom` (8 จุดเรียกใช้)
- **[READ:SELECT]** [`src/services/classroomService.ts:276`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/classroomService.ts#L276)
- **[WRITE:UPDATE]** [`src/services/classroomService.ts:471`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/classroomService.ts#L471)
- **[READ:SELECT]** [`src/services/classroomService.ts:576`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/classroomService.ts#L576)
- **[WRITE:UPDATE]** [`src/services/classroomService.ts:582`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/classroomService.ts#L582)
- **[WRITE:INSERT]** [`src/services/classroomService.ts:591`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/classroomService.ts#L591)
- **[WRITE:UPDATE]** [`src/services/classroomService.ts:692`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/classroomService.ts#L692)
- **[WRITE:UPDATE]** [`src/services/classroomService.ts:817`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/classroomService.ts#L817)
- **[READ:SELECT]** [`src/services/masterDataService.ts:252`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/masterDataService.ts#L252)

#### 🗂️ ตาราง/View: `classrooms` (3 จุดเรียกใช้)
- **[READ:SELECT]** [`src/services/authService.ts:339`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/authService.ts#L339)
- **[READ:SELECT]** [`src/services/classroomService.ts:202`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/classroomService.ts#L202)
- **[READ:SELECT]** [`src/services/classroomService.ts:218`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/classroomService.ts#L218)

#### 🗂️ ตาราง/View: `kps_cloud_store` (12 จุดเรียกใช้)
- **[READ:SELECT]** [`src/lib/universalAdapter.ts:293`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/lib/universalAdapter.ts#L293)
- **[WRITE:UPSERT]** [`src/lib/universalAdapter.ts:428`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/lib/universalAdapter.ts#L428)
- **[WRITE:UPSERT]** [`src/lib/universalAdapter.ts:476`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/lib/universalAdapter.ts#L476)
- **[WRITE:DELETE]** [`src/services/cleanSlateService.ts:130`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/cleanSlateService.ts#L130)
- **[READ:SELECT]** [`src/services/cloudDataService.ts:174`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/cloudDataService.ts#L174)
- **[READ:SELECT]** [`src/services/cloudDataService.ts:191`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/cloudDataService.ts#L191)
- **[READ:SELECT]** [`src/services/cloudDataService.ts:263`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/cloudDataService.ts#L263)
- **[WRITE:UPSERT]** [`src/services/cloudDataService.ts:317`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/cloudDataService.ts#L317)
- **[READ:SELECT]** [`src/services/cloudDataService.ts:363`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/cloudDataService.ts#L363)
- **[READ:SELECT]** [`src/services/cloudDataService.ts:418`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/cloudDataService.ts#L418)
- **[WRITE:DELETE]** [`src/services/cloudDataService.ts:506`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/cloudDataService.ts#L506)
- **[WRITE:DELETE]** [`src/services/cloudDataService.ts:554`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/cloudDataService.ts#L554)

#### 🗂️ ตาราง/View: `promotion_batches` (1 จุดเรียกใช้)
- **[READ:SELECT]** [`src/services/studentPromotionService.ts:259`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/studentPromotionService.ts#L259)

#### 🗂️ ตาราง/View: `Quest` (1 จุดเรียกใช้)
- **[READ:SELECT]** [`src/services/gamificationService.ts:74`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/gamificationService.ts#L74)

#### 🗂️ ตาราง/View: `QuestSubmission` (1 จุดเรียกใช้)
- **[WRITE:INSERT]** [`src/services/gamificationService.ts:117`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/gamificationService.ts#L117)

#### 🗂️ ตาราง/View: `Score` (4 จุดเรียกใช้)
- **[READ:SELECT]** [`src/services/scoreService.ts:99`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/scoreService.ts#L99)
- **[READ:SELECT]** [`src/services/scoreService.ts:130`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/scoreService.ts#L130)
- **[WRITE:UPSERT]** [`src/services/scoreService.ts:289`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/scoreService.ts#L289)
- **[WRITE:UPDATE]** [`src/services/scoreService.ts:347`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/scoreService.ts#L347)

#### 🗂️ ตาราง/View: `ScoreAuditLog` (2 จุดเรียกใช้)
- **[READ:SELECT]** [`src/services/scoreService.ts:160`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/scoreService.ts#L160)
- **[WRITE:INSERT]** [`src/services/scoreService.ts:270`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/scoreService.ts#L270)

#### 🗂️ ตาราง/View: `StorageUploadLog` (2 จุดเรียกใช้)
- **[READ:SELECT]** [`src/services/sgsExportService.ts:58`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/sgsExportService.ts#L58)
- **[WRITE:INSERT]** [`src/services/sgsExportService.ts:143`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/sgsExportService.ts#L143)

#### 🗂️ ตาราง/View: `Student` (8 จุดเรียกใช้)
- **[READ:SELECT]** [`src/services/authService.ts:253`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/authService.ts#L253)
- **[WRITE:UPSERT]** [`src/services/masterDataService.ts:459`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/masterDataService.ts#L459)
- **[READ:SELECT]** [`src/services/studentLifecycleService.ts:729`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/studentLifecycleService.ts#L729)
- **[READ:SELECT]** [`src/services/studentLifecycleService.ts:746`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/studentLifecycleService.ts#L746)
- **[WRITE:UPSERT]** [`src/services/studentService.ts:766`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/studentService.ts#L766)
- **[WRITE:UPDATE]** [`src/services/studentService.ts:832`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/studentService.ts#L832)
- **[WRITE:UPDATE]** [`src/services/studentService.ts:990`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/studentService.ts#L990)
- **[WRITE:UPSERT]** [`src/services/studentService.ts:1090`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/studentService.ts#L1090)

#### 🗂️ ตาราง/View: `StudentEnrollment` (9 จุดเรียกใช้)
- **[READ:SELECT]** [`src/services/authService.ts:263`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/authService.ts#L263)
- **[WRITE:UPSERT]** [`src/services/masterDataService.ts:475`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/masterDataService.ts#L475)
- **[WRITE:UPDATE]** [`src/services/studentLifecycleService.ts:736`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/studentLifecycleService.ts#L736)
- **[WRITE:UPDATE]** [`src/services/studentLifecycleService.ts:753`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/studentLifecycleService.ts#L753)
- **[WRITE:UPSERT]** [`src/services/studentService.ts:782`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/studentService.ts#L782)
- **[WRITE:UPDATE]** [`src/services/studentService.ts:836`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/studentService.ts#L836)
- **[WRITE:UPDATE]** [`src/services/studentService.ts:906`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/studentService.ts#L906)
- **[WRITE:UPDATE]** [`src/services/studentService.ts:984`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/studentService.ts#L984)
- **[WRITE:UPSERT]** [`src/services/studentService.ts:1104`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/studentService.ts#L1104)

#### 🗂️ ตาราง/View: `student_enrollments` (2 จุดเรียกใช้)
- **[READ:SELECT]** [`src/services/studentEnrollmentService.ts:71`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/studentEnrollmentService.ts#L71)
- **[READ:SELECT]** [`src/services/studentEnrollmentService.ts:88`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/studentEnrollmentService.ts#L88)

#### 🗂️ ตาราง/View: `students` (9 จุดเรียกใช้)
- **[READ:SELECT]** [`src/services/authService.ts:245`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/authService.ts#L245)
- **[READ:SELECT]** [`src/services/masterDataService.ts:369`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/masterDataService.ts#L369)
- **[READ:SELECT]** [`src/services/masterDataService.ts:506`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/masterDataService.ts#L506)
- **[READ:SELECT]** [`src/services/smsNotificationService.ts:212`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/smsNotificationService.ts#L212)
- **[WRITE:UPDATE]** [`src/services/smsNotificationService.ts:267`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/smsNotificationService.ts#L267)
- **[READ:SELECT]** [`src/services/studentEnrollmentService.ts:207`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/studentEnrollmentService.ts#L207)
- **[READ:SELECT]** [`src/services/studentLifecycleService.ts:451`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/studentLifecycleService.ts#L451)
- **[WRITE:UPDATE]** [`src/services/studentLifecycleService.ts:713`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/studentLifecycleService.ts#L713)
- **[READ:SELECT]** [`src/services/studentPromotionService.ts:112`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/studentPromotionService.ts#L112)

#### 🗂️ ตาราง/View: `StudentScore` (3 จุดเรียกใช้)
- **[READ:SELECT]** [`src/services/gradeService.ts:431`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/gradeService.ts#L431)
- **[WRITE:UPSERT]** [`src/services/gradeService.ts:630`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/gradeService.ts#L630)
- **[READ:SELECT]** [`src/services/studentEnrollmentService.ts:112`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/studentEnrollmentService.ts#L112)

#### 🗂️ ตาราง/View: `SystemSettings` (4 จุดเรียกใช้)
- **[WRITE:UPSERT]** [`src/config/schoolRoles.ts:238`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/config/schoolRoles.ts#L238)
- **[WRITE:UPSERT]** [`src/config/schoolRoles.ts:265`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/config/schoolRoles.ts#L265)
- **[READ:SELECT]** [`src/config/schoolRoles.ts:287`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/config/schoolRoles.ts#L287)
- **[WRITE:UPSERT]** [`src/config/schoolRoles.ts:317`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/config/schoolRoles.ts#L317)

#### 🗂️ ตาราง/View: `TimetableSlot` (2 จุดเรียกใช้)
- **[READ:SELECT]** [`src/services/attendanceService.ts:677`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/attendanceService.ts#L677)
- **[WRITE:UPDATE]** [`src/services/attendanceService.ts:705`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/attendanceService.ts#L705)

#### 🗂️ ตาราง/View: `TrashLog` (5 จุดเรียกใช้)
- **[READ:SELECT]** [`src/services/trashService.ts:34`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/trashService.ts#L34)
- **[WRITE:INSERT]** [`src/services/trashService.ts:85`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/trashService.ts#L85)
- **[WRITE:DELETE]** [`src/services/trashService.ts:116`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/trashService.ts#L116)
- **[WRITE:DELETE]** [`src/services/trashService.ts:165`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/trashService.ts#L165)
- **[WRITE:DELETE]** [`src/services/trashService.ts:204`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/trashService.ts#L204)

#### 🗂️ ตาราง/View: `User` (2 จุดเรียกใช้)
- **[READ:SELECT]** [`src/services/authService.ts:98`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/authService.ts#L98)
- **[READ:SELECT]** [`src/services/classroomService.ts:141`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/classroomService.ts#L141)

#### 🗂️ ตาราง/View: `XpTransaction` (2 จุดเรียกใช้)
- **[WRITE:INSERT]** [`src/services/behaviorService.ts:195`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/behaviorService.ts#L195)
- **[READ:SELECT]** [`src/services/behaviorService.ts:217`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/behaviorService.ts#L217)

### 4.2 PostgreSQL RPCs ที่เรียกใช้ในระบบจัดการชั้นเรียน
- **RPC `execute_student_promotion_batch()`**:
  - [`src/services/studentPromotionService.ts:241`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/studentPromotionService.ts#L241)
- **RPC `purge_test_student_safely()`**:
  - [`src/services/studentPurgeService.ts:28`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/studentPurgeService.ts#L28)
- **RPC `rollback_student_promotion_batch()`**:
  - [`src/services/studentPromotionService.ts:280`](file:///C:/dev/09 ระบบจัดการชั้นเรียน/src/services/studentPromotionService.ts#L280)

### 4.3 ฝั่งระบบ SMS (`C:/dev/eLeave/src` — ตารางที่ใช้ร่วมกัน)
- **`prisma.student`** (1 calls across 1 file-ops):
  - **[READ:count]** [`eLeave/src/app/actions/dashboard-widgets.ts:382`](file:///C:/dev/eLeave/src/app/actions/dashboard-widgets.ts#L382)
- **`prisma.studentEnrollment`**: *(ยังไม่มีการเรียกใช้โดยตรงใน `eLeave/src` — ต้องระวังหากฝั่งจัดการชั้นเรียนเขียนข้อมูลลงตารางอื่น)*
- **`prisma.classRoom`** (3 calls across 2 file-ops):
  - **[READ:count]** [`eLeave/src/app/actions/academic-planning.ts:41`](file:///C:/dev/eLeave/src/app/actions/academic-planning.ts#L41)
  - **[READ:findMany]** [`eLeave/src/app/actions/dashboard-widgets.ts:632`](file:///C:/dev/eLeave/src/app/actions/dashboard-widgets.ts#L632)
- **`prisma.attendance`** (19 calls across 9 file-ops):
  - **[WRITE:deleteMany]** [`eLeave/src/app/actions/admin.ts:439`](file:///C:/dev/eLeave/src/app/actions/admin.ts#L439)
  - **[READ:findMany]** [`eLeave/src/app/actions/attendance-stats.ts:16`](file:///C:/dev/eLeave/src/app/actions/attendance-stats.ts#L16)
  - **[READ:findUnique]** [`eLeave/src/app/actions/attendance.ts:330`](file:///C:/dev/eLeave/src/app/actions/attendance.ts#L330)
  - **[WRITE:update]** [`eLeave/src/app/actions/attendance.ts:365`](file:///C:/dev/eLeave/src/app/actions/attendance.ts#L365)
  - **[WRITE:create]** [`eLeave/src/app/actions/attendance.ts:373`](file:///C:/dev/eLeave/src/app/actions/attendance.ts#L373)
  - **[READ:findMany]** [`eLeave/src/app/actions/attendance.ts:732`](file:///C:/dev/eLeave/src/app/actions/attendance.ts#L732)
  - **[WRITE:upsert]** [`eLeave/src/app/actions/attendance.ts:990`](file:///C:/dev/eLeave/src/app/actions/attendance.ts#L990)
  - **[WRITE:delete]** [`eLeave/src/app/actions/attendance.ts:1020`](file:///C:/dev/eLeave/src/app/actions/attendance.ts#L1020)
  - **[READ:findMany]** [`eLeave/src/app/actions/dashboard-widgets.ts:356`](file:///C:/dev/eLeave/src/app/actions/dashboard-widgets.ts#L356)
- **`prisma.studentMorningAttendance`** (1 calls across 1 file-ops):
  - **[READ:findMany]** [`eLeave/src/app/actions/dashboard-widgets.ts:385`](file:///C:/dev/eLeave/src/app/actions/dashboard-widgets.ts#L385)
- **`prisma.studentPeriodAttendance`**: *(ยังไม่มีการเรียกใช้โดยตรงใน `eLeave/src` — ต้องระวังหากฝั่งจัดการชั้นเรียนเขียนข้อมูลลงตารางอื่น)*
- **`prisma.studentMedicalCertificate`** (1 calls across 1 file-ops):
  - **[READ:count]** [`eLeave/src/app/actions/dashboard-widgets.ts:397`](file:///C:/dev/eLeave/src/app/actions/dashboard-widgets.ts#L397)
- **`prisma.studentRiskAssessment`** (1 calls across 1 file-ops):
  - **[READ:count]** [`eLeave/src/app/actions/dashboard-widgets.ts:390`](file:///C:/dev/eLeave/src/app/actions/dashboard-widgets.ts#L390)
- **`prisma.studentHomeVisit`**: *(ยังไม่มีการเรียกใช้โดยตรงใน `eLeave/src` — ต้องระวังหากฝั่งจัดการชั้นเรียนเขียนข้อมูลลงตารางอื่น)*
- **`prisma.studentSdqEvaluation`**: *(ยังไม่มีการเรียกใช้โดยตรงใน `eLeave/src` — ต้องระวังหากฝั่งจัดการชั้นเรียนเขียนข้อมูลลงตารางอื่น)*
- **`prisma.behaviorRecord`**: *(ยังไม่มีการเรียกใช้โดยตรงใน `eLeave/src` — ต้องระวังหากฝั่งจัดการชั้นเรียนเขียนข้อมูลลงตารางอื่น)*
- **`prisma.subject`**: *(ยังไม่มีการเรียกใช้โดยตรงใน `eLeave/src` — ต้องระวังหากฝั่งจัดการชั้นเรียนเขียนข้อมูลลงตารางอื่น)*
- **`prisma.subjectOffering`** (4 calls across 2 file-ops):
  - **[READ:count]** [`eLeave/src/app/actions/academic-planning.ts:37`](file:///C:/dev/eLeave/src/app/actions/academic-planning.ts#L37)
  - **[READ:count]** [`eLeave/src/services/readinessEngine.ts:93`](file:///C:/dev/eLeave/src/services/readinessEngine.ts#L93)
- **`prisma.timetableSlot`** (2 calls across 1 file-ops):
  - **[READ:count]** [`eLeave/src/services/readinessEngine.ts:110`](file:///C:/dev/eLeave/src/services/readinessEngine.ts#L110)
- **`prisma.teacher`** (6 calls across 4 file-ops):
  - **[READ:count]** [`eLeave/src/app/actions/academic-planning.ts:42`](file:///C:/dev/eLeave/src/app/actions/academic-planning.ts#L42)
  - **[READ:findMany]** [`eLeave/src/app/actions/workload-policy.ts:186`](file:///C:/dev/eLeave/src/app/actions/workload-policy.ts#L186)
  - **[READ:findUnique]** [`eLeave/src/services/etuCalculator.ts:107`](file:///C:/dev/eLeave/src/services/etuCalculator.ts#L107)
  - **[READ:count]** [`eLeave/src/services/readinessEngine.ts:94`](file:///C:/dev/eLeave/src/services/readinessEngine.ts#L94)
- **`prisma.user`** (127 calls across 52 file-ops):
  - **[READ:findMany]** [`eLeave/src/actions/planning/project-actions.ts:96`](file:///C:/dev/eLeave/src/actions/planning/project-actions.ts#L96)
  - **[READ:findUnique]** [`eLeave/src/actions/planning/project-actions.ts:361`](file:///C:/dev/eLeave/src/actions/planning/project-actions.ts#L361)
  - **[READ:findMany]** [`eLeave/src/actions/planning/settings-actions.ts:35`](file:///C:/dev/eLeave/src/actions/planning/settings-actions.ts#L35)
  - **[READ:findUnique]** [`eLeave/src/app/actions/admin.ts:38`](file:///C:/dev/eLeave/src/app/actions/admin.ts#L38)
  - **[READ:findMany]** [`eLeave/src/app/actions/admin.ts:114`](file:///C:/dev/eLeave/src/app/actions/admin.ts#L114)
  - **[WRITE:update]** [`eLeave/src/app/actions/admin.ts:228`](file:///C:/dev/eLeave/src/app/actions/admin.ts#L228)
  - **[READ:findFirst]** [`eLeave/src/app/actions/admin.ts:319`](file:///C:/dev/eLeave/src/app/actions/admin.ts#L319)
  - **[WRITE:delete]** [`eLeave/src/app/actions/admin.ts:446`](file:///C:/dev/eLeave/src/app/actions/admin.ts#L446)
  - **[WRITE:create]** [`eLeave/src/app/actions/admin.ts:859`](file:///C:/dev/eLeave/src/app/actions/admin.ts#L859)
  - **[READ:findMany]** [`eLeave/src/app/actions/archive.ts:50`](file:///C:/dev/eLeave/src/app/actions/archive.ts#L50)
  - *...และอีก 42 จุด*
- **`prisma.account`** (5 calls across 4 file-ops):
  - **[WRITE:deleteMany]** [`eLeave/src/app/actions/admin.ts:435`](file:///C:/dev/eLeave/src/app/actions/admin.ts#L435)
  - **[WRITE:updateMany]** [`eLeave/src/app/actions/admin.ts:804`](file:///C:/dev/eLeave/src/app/actions/admin.ts#L804)
  - **[WRITE:create]** [`eLeave/src/app/actions/admin.ts:877`](file:///C:/dev/eLeave/src/app/actions/admin.ts#L877)
  - **[WRITE:updateMany]** [`eLeave/src/app/actions/user.ts:238`](file:///C:/dev/eLeave/src/app/actions/user.ts#L238)

---

## 🛡️ 5. ขั้นตอนมาตรฐานเมื่อต้องเพิ่มฟิลด์หรือแก้ตารางในอนาคต (Zero-Bug Workflow)

1. **เช็คไฟล์นี้ก่อนเสมอ (`docs/DATA_SCHEMA_INDEX.md`)**:
   - ห้ามเดาชื่อตารางเองเด็ดขาด! ดูว่าฟีเจอร์ที่จะแก้ต้องเขียนลง Base Table ตัวไหน และอ่านจาก View ตัวไหน
2. **ห้ามสร้างตารางซ้ำซ้อน (No Duplicate snake_case vs PascalCase Tables)**:
   - หากมีตาราง Prisma อยู่แล้ว (เช่น `"Student"`, `"StudentEnrollment"`, `"ClassRoom"`, `"AssessmentColumn"`, `"StudentScore"`) ให้ใช้ตารางนั้นเป็นหลัก หรือสร้างเป็น **PostgreSQL View** เท่านั้น ห้าม `CREATE TABLE` แยกอีกใบโดยไม่มี Trigger Sync
3. **อัปเดต View และ Trigger ทุกครั้งที่เพิ่มคอลัมน์ใน `"Student"` หรือ `"ClassRoom"`**:
   - หากเพิ่มฟิลด์ใน `"Student"` (เช่น `parentPhone`) ต้อง `CREATE OR REPLACE VIEW public.students` และอัปเดต `students_view_update_trigger()` เพื่อให้ระบบจัดการชั้นเรียนมองเห็นฟิลด์นั้นทันที
4. **รันคำสั่งอัปเดตดัชนีทุกครั้งหลังแก้โค้ด**:
   ```bash
   node scripts/index_data_schema.mjs
   node scripts/index_codebase.mjs
   ```
