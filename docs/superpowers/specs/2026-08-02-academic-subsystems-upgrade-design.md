# Academic Subsystems Comprehensive Upgrade Design Specification

## Overview
This document outlines the architecture, database schema, server actions, and UI management structure for upgrading the Academic Subsystems in the SROP platform:
1. **Facility Catalog & Resource Reservation System**
2. **Exam Configuration & Scheduling System**
3. **PA Competency Portfolio & PD Hours Logging System**

---

## 1. Database Schema Specification (`prisma/schema.prisma`)

```prisma
// ==========================================
// 1. FACILITIES CATALOG & RESOURCE RESERVATION
// ==========================================

enum ResourceType {
  MEETING_ROOM
  CLASSROOM
  LABORATORY
  VEHICLE
  EQUIPMENT
  OTHER
}

enum ResourceStatus {
  AVAILABLE
  UNDER_MAINTENANCE
  OUT_OF_SERVICE
}

enum ReservationStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

model FacilityResource {
  id           String               @id @default(cuid())
  code         String               @unique
  name         String
  type         ResourceType
  capacity     Int?
  location     String?
  description  String?              @db.Text
  status       ResourceStatus       @default(AVAILABLE)
  reservations FacilityReservation[]
  createdAt    DateTime             @default(now())
  updatedAt    DateTime             @updatedAt
}

model FacilityReservation {
  id               String            @id @default(cuid())
  resourceId       String
  resource         FacilityResource  @relation(fields: [resourceId], references: [id], onDelete: Cascade)
  reservedByUserId String
  consumerModule   String            // e.g., "TIMETABLE", "EXAM", "SUPERVISION", "MANUAL"
  title            String
  purpose          String?           @db.Text
  startTime        DateTime
  endTime          DateTime
  status           ReservationStatus @default(PENDING)
  approvedByUserId String?
  approvedAt       DateTime?
  rejectionReason  String?
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  @@index([resourceId, startTime, endTime])
}

// ==========================================
// 2. EXAM CONFIGURATION & SCHEDULING
// ==========================================

enum ExamTerm {
  MIDTERM
  FINAL
  SPECIAL
}

model ExamPeriod {
  id            String              @id @default(cuid())
  academicYear  Int
  term          Int                 // 1 or 2
  examType      ExamTerm
  title         String              // e.g., "การสอบกลางภาคเรียนที่ 1/2026"
  startDate     DateTime
  endDate       DateTime
  desksPerRoom  Int                 @default(30)
  isActive      Boolean             @default(true)
  examSlots     ExamSubjectSlot[]
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt
}

model ExamSubjectSlot {
  id            String                @id @default(cuid())
  examPeriodId  String
  examPeriod    ExamPeriod            @relation(fields: [examPeriodId], references: [id], onDelete: Cascade)
  subjectCode   String
  subjectName   String
  gradeLevel    String                // e.g., "ม.1"
  examDate      DateTime
  startTime     String                // e.g., "08:30"
  endTime       String                // e.g., "10:00"
  durationMins  Int                   @default(90)
  proctors      ExamProctorAssignment[]
  createdAt     DateTime              @default(now())
  updatedAt     DateTime              @updatedAt
}

model ExamProctorAssignment {
  id            String          @id @default(cuid())
  slotId        String
  slot          ExamSubjectSlot @relation(fields: [slotId], references: [id], onDelete: Cascade)
  teacherId     String
  teacherName   String
  roomId        String
  roomName      String
  role          String          @default("MAIN_PROCTOR") // MAIN_PROCTOR, ASSISTANT
  createdAt     DateTime        @default(now())

  @@index([teacherId, slotId])
}

// ==========================================
// 3. PA & COMPETENCY GUIDELINES
// ==========================================

model PaTargetConfig {
  id                  String   @id @default(cuid())
  academicYear        Int      @unique
  targetPdHours       Int      @default(20) // เกณฑ์ชั่วโมง PD ขั้นต่ำต่อปี
  competencyMaxScore  Int      @default(5)  // คะแนนเต็มแต่ละด้าน (1-5)
  description         String?  @db.Text
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

model PaAgreement {
  id                  String                 @id @default(cuid())
  academicYear        Int
  teacherId           String
  teacherName         String
  departmentId        String
  agreementTitle      String
  status              String                 @default("SUBMITTED") // DRAFT, SUBMITTED, APPROVED
  evaluations         CompetencyEvaluation[]
  createdAt           DateTime               @default(now())
  updatedAt           DateTime               @updatedAt

  @@unique([academicYear, teacherId])
}

model PdHourLog {
  id            String   @id @default(cuid())
  teacherId     String
  academicYear  Int
  topic         String
  organizer     String
  hours         Float
  completedDate DateTime
  certificateUrl String?
  isApproved    Boolean  @default(false)
  createdAt     DateTime @default(now())
}

model CompetencyEvaluation {
  id              String      @id @default(cuid())
  paAgreementId   String
  paAgreement     PaAgreement @relation(fields: [paAgreementId], references: [id], onDelete: Cascade)
  evaluatorId     String
  evaluatorRole   String      // SUPERVISOR, DIRECTOR, PEER
  dimension1Score Int         // การจัดการเรียนรู้
  dimension2Score Int         // การบริหารจัดการชั้นเรียน
  dimension3Score Int         // การพัฒนาตนเองและวิชาชีพ
  dimension4Score Int         // การทำงานร่วมกับชุมชน
  dimension5Score Int         // จริยธรรมและวิทยฐานะ
  comments        String?     @db.Text
  evaluatedAt     DateTime    @default(now())
}
```

---

## 2. Server Actions API Specifications (`src/app/actions/`)

### 2.1 `src/app/actions/facility.ts`
- `createFacilityResourceAction(data)`
- `updateFacilityResourceAction(id, data)`
- `deleteFacilityResourceAction(id)`
- `getFacilityResourcesAction(type?)`
- `reserveFacilityAction(data)`
- `approveReservationAction(reservationId, approvedByUserId)`
- `rejectReservationAction(reservationId, reason)`
- `checkFacilityConflictAction(resourceId, startTime, endTime)`

### 2.2 `src/app/actions/exam.ts`
- `configureExamPeriodAction(data)`
- `getActiveExamPeriodAction(academicYear, term)`
- `createExamSlotAction(data)`
- `assignExamProctorsAction(slotId, assignments)`
- `autoDistributeExamProctorsAction(examPeriodId)`
- `getExamScheduleByTeacherAction(teacherId)`

### 2.3 `src/app/actions/competency.ts`
- `setPaTargetConfigAction(data)`
- `getPaTargetConfigAction(academicYear)`
- `submitPaAgreementAction(data)`
- `logPdHoursAction(data)`
- `getTeacherPdSummaryAction(teacherId, academicYear)`
- `submitCompetencyEvaluationAction(data)`

---

## 3. Master Data UI Specifications (`src/app/(app)/academic/settings/page.tsx`)

Tabs included:
1. **🏢 ทรัพยากรส่วนกลาง (Facilities Catalog)**
2. **📝 ระบบสอบส่วนกลาง (Exam Configuration)**
3. **🏆 เกณฑ์ PA & ชั่วโมงพัฒนาตนเอง (PA & Competency Guidelines)**
