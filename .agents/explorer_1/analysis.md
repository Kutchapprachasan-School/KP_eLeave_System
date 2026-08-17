# Analysis Report: SROP Requirements R1 & R2 Prisma Schema Audit

**Author:** Explorer 1  
**Date:** 2026-07-27  
**Repository Location:** `g:\My Drive\01 Web app\01 ระบบการลา`  
**Prisma Schema File Path:** `g:\My Drive\01 Web app\01 ระบบการลา\prisma\schema.prisma`  

---

## Executive Summary

A comprehensive forensic audit of the Prisma database schema (`prisma/schema.prisma`) was conducted to evaluate readiness for **Requirement R1 (Core Master Data & Subject Offering Abstraction)** and **Requirement R2 (Timetable Core, Version Pointer Switch & Database Collision Protection)**. 

The schema is situated at `prisma/schema.prisma`. Models for `Department`, `Teacher`, `Subject`, `ClassRoom`, `Room`, `SubjectOffering`, `TimetableVersion`, `TimetableSlot`, `SchoolConfig`, and `SubstituteWorkflow` already exist in the file. However, specific structural gaps and collision protection edge-cases were identified that require schema enhancements and service-level guarantees.

---

## 1. Schema Location & Context

- **Active Schema Path:** `g:\My Drive\01 Web app\01 ระบบการลา\prisma\schema.prisma`
- **Database Provider:** PostgreSQL (`datasource db { provider = "postgresql" }`)
- **Prisma Client Generator:** `prisma-client-js`

---

## 2. Analysis of Requirement R1: Core Master Data & Subject Offering Abstraction

### Existing Models & Structures

1. **`Department`** (Lines 118–126)
   - **Fields:** `id` (cuid), `code` (String, @unique), `name` (String), `teachers` (Teacher[]), `subjects` (Subject[]), `createdAt`, `updatedAt`.
   - **Assessment:** Properly normalized. Serves as the organizational parent for teachers and subject offerings.

2. **`Teacher`** (Lines 128–140)
   - **Fields:** `id` (cuid), `employeeCode` (String, @unique), `prefix`, `firstName`, `lastName`, `departmentId`, `department` (Relation), `maxWeeklyPeriods` (Int, default 20), `offerings` (SubjectOffering[]).
   - **Assessment:** `maxWeeklyPeriods` is defined, which directly supports workload fairness calculations in Requirement R4. Department association is intact.

3. **`Subject`** (Lines 142–152)
   - **Fields:** `id` (cuid), `code` (String, @unique), `name`, `credits` (Float, default 1.0), `departmentId`, `department` (Relation), `offerings` (SubjectOffering[]).
   - **Assessment:** Standard curriculum item abstraction, linked to Department.

4. **`ClassRoom`** (Lines 154–164)
   - **Fields:** `id` (cuid), `gradeLevel` (Int), `roomNumber` (Int), `name` (String), `offerings` (SubjectOffering[]).
   - **Constraints:** `@@unique([gradeLevel, roomNumber])`.
   - **Assessment:** Ensures physical class cohort uniqueness (e.g. Grade 3, Room 1 -> "ม.3/1").

5. **`Room`** (Lines 166–175)
   - **Fields:** `id` (cuid), `code` (String, @unique), `name`, `building`, `roomType` (default "REGULAR"), `slots` (TimetableSlot[]).
   - **Assessment:** Defines physical instructional locations (regular classrooms, computer labs, science labs).

6. **`SubjectOffering`** (Lines 177–192)
   - **Fields:** `id` (cuid), `subjectId`, `subject` (Relation), `teacherId`, `teacher` (Relation), `classRoomId`, `classRoom` (Relation), `academicYear` (Int), `term` (Int), `slots` (TimetableSlot[]).
   - **Current Index:** `@@index([academicYear, term])`.

### Gaps & Schema Recommendations for R1
- **Missing Compound Unique Constraint on SubjectOffering:**
  Currently, `SubjectOffering` lacks a `@@unique` constraint to prevent duplicate assignment entries.
  - **Proposed Modification:** Add `@@unique([subjectId, teacherId, classRoomId, academicYear, term])` or `@@unique([subjectId, classRoomId, academicYear, term])` to enforce database-level duplicate assignment protection.

---

## 3. Analysis of Requirement R2: Timetable Core, Version Pointer Switch & Database Collision Protection

### Existing Models & Structures

1. **`TimetableVersion`** (Lines 194–207)
   - **Fields:** `id` (cuid), `schoolId`, `academicYear`, `term`, `versionName`, `status` (`DRAFT`, `PUBLISHED`, `ARCHIVED`), `isCurrentPublished` (Boolean, default false), `slots` (TimetableSlot[]).
   - **Current Index:** `@@index([schoolId, academicYear, term, status])`.

2. **`TimetableSlot`** (Lines 209–224)
   - **Fields:** `id` (cuid), `timetableVersionId`, `timetableVersion` (Relation), `offeringId`, `offering` (Relation), `roomId`, `room` (Relation), `dayOfWeek` (Int 1-5), `periodNumber` (Int 1-8).
   - **Current Unique Constraints:**
     - `@@unique([timetableVersionId, offeringId, dayOfWeek, periodNumber])`
     - `@@unique([timetableVersionId, roomId, dayOfWeek, periodNumber])`

### Deep-Dive Critical Gaps for R2

#### Gap A: Version Pointer Switch Integrity (`isCurrentPublished`)
- **Problem:** `isCurrentPublished` is a boolean flag on `TimetableVersion`. There can only be **one** current published timetable per `(schoolId, academicYear, term)`.
- **Current Defect:** No database constraint prevents multiple `TimetableVersion` rows for the same `(schoolId, academicYear, term)` from simultaneously having `isCurrentPublished = true`.
- **Proposed Solution:**
  1. **Service Layer Transaction:** In the version publishing logic, execute a 2-step atomic transaction:
     ```typescript
     await prisma.$transaction([
       prisma.timetableVersion.updateMany({
         where: { schoolId, academicYear, term, isCurrentPublished: true },
         data: { isCurrentPublished: false, status: 'ARCHIVED' }
       }),
       prisma.timetableVersion.update({
         where: { id: targetVersionId },
         data: { isCurrentPublished: true, status: 'PUBLISHED' }
       })
     ]);
     ```
  2. **PostgreSQL Partial Unique Index (Optional DB Native Guard):**
     Add a raw SQL migration for partial index:
     `CREATE UNIQUE INDEX "unique_current_published_version" ON "TimetableVersion" ("schoolId", "academicYear", "term") WHERE "isCurrentPublished" = true;`

#### Gap B: Database Collision Protection Gaps in `TimetableSlot`
- **Problem:** `TimetableSlot` currently has two `@@unique` constraints:
  - `@@unique([timetableVersionId, offeringId, dayOfWeek, periodNumber])` (Prevents duplicate scheduling of the same offering in the same version/slot).
  - `@@unique([timetableVersionId, roomId, dayOfWeek, periodNumber])` (Prevents double-booking the same room in the same version/slot).
- **Hidden Defect #1: Teacher Collision Risk:**
  Because `teacherId` is nested inside `SubjectOffering`, if Teacher T teaches `Offering A` (ม.3/1) and `Offering B` (ม.3/2), the database currently **allows** `Offering A` and `Offering B` to be scheduled at the exact same `dayOfWeek` and `periodNumber`! The database has no constraint checking `teacherId` across different `offeringId`s.
- **Hidden Defect #2: ClassRoom Collision Risk:**
  Similarly, because `classRoomId` is nested inside `SubjectOffering`, if ClassRoom C (ม.3/1) is assigned `Offering A` (Math) and `Offering C` (Science), the database allows both offerings to be scheduled at the exact same `dayOfWeek` and `periodNumber`!
- **Proposed Modification Options:**
  - **Option 1 (Denormalization for Strict DB Enforcement):**
    Add `teacherId` and `classRoomId` directly to `TimetableSlot` and add:
    ```prisma
    @@unique([timetableVersionId, teacherId, dayOfWeek, periodNumber])
    @@unique([timetableVersionId, classRoomId, dayOfWeek, periodNumber])
    ```
  - **Option 2 (Service Layer Validation Guard):**
    Keep schema lean, and enforce teacher/classroom collision checks programmatically inside `timetableService` or `availabilityService` prior to slot creation/updating.

---

## 4. Summary Table of Requirements vs Schema Status

| Requirement | Target Model | Current Status | Missing / Required Action |
|-------------|--------------|----------------|---------------------------|
| **R1** Master Data | `Department`, `Teacher`, `Subject`, `ClassRoom`, `Room` | ✅ Present & Normalized | None (schema fully ready) |
| **R1** Offering Abstraction | `SubjectOffering` | ⚠️ Present | Add `@@unique([subjectId, teacherId, classRoomId, academicYear, term])` for duplicate protection |
| **R2** Timetable Core | `TimetableVersion`, `TimetableSlot` | ✅ Present | Structural foundation complete |
| **R2** Pointer Switch | `TimetableVersion.isCurrentPublished` | ⚠️ Field present, no constraint | Implement atomic transaction switch in service layer + partial unique index guard |
| **R2** DB Collision Protection | `TimetableSlot` | ⚠️ Partial (Offering & Room unique) | Missing Teacher & ClassRoom double-booking protection (Add service validation or denormalized `@@unique` keys) |

---

## 5. Verification Commands & Next Steps

To verify schema validity with Prisma CLI when executing migrations:
```bash
npx prisma validate
npx prisma format
```

This report provides the exact blueprint for implementers working on Milestones M1 and M2.
