# School Student Affairs Closed-Loop Architecture Specification
## ระบบบริหารจัดการงานกิจการนักเรียนแบบวงรอบปิด PDCA + Data-Driven (KP Student Affairs System)

---

### ข้อมูลควบคุมเอกสาร (Document Control Metadata)

| ข้อมูล (Attribute) | รายละเอียด (Specification Details) |
| :--- | :--- |
| **Document ID** | `SPEC-2026-09-17-STUDENT-AFFAIRS` |
| **Document Title** | School Student Affairs Closed-Loop Architecture Specification |
| **Current Revision** | **Rev. 3.8 (Trusted Actor & Native Date Edition / Ready for Gate Approval)** |
| **Document Status** | **PENDING REVIEW & PROCEED APPROVAL** |
| **Effective Date** | 17 กันยายน 2569 (2026-09-17) |
| **Target System** | ระบบบริหารจัดการงานกิจการนักเรียน โรงเรียนกุดจับประชาสรรค์ (`KP Student Affairs`) |
| **ORM & Runtime** | Prisma Client `^7.8.0`, PostgreSQL 16+ (Neon/Self-hosted), Next.js App Router |
| **Classification** | Internal Institutional Governance & Engineering Standard Document |

---

### ตารางการอนุมัติและควบคุมเอกสาร (Governance & Sign-off)

| บทบาท (Role) | ผู้รับผิดชอบ (Name / Identifier) | ตำแหน่ง / อำนาจหน้าที่ | การดำเนินการ (Action) | วันที่ (Date) |
| :--- | :--- | :--- | :--- | :--- |
| **Prepared By** | System Architect (Antigravity AI) | System Architect & Tech Lead | Submitted for Review (Rev 3.8) | 2026-09-17 |
| **Technical Reviewer** | Lead Architecture Reviewer (USER) | Lead Software Architect & Forensic Auditor | Forensic Audit & Alignment | 2026-09-17 |
| **Approved By** | Head of Architecture & DevOps (USER) | Architecture Review Board | **Awaiting "Proceed" Sign-off** | 2026-09-17 |

---

### ตารางบันทึกประวัติการเปลี่ยนแปลง (Revision History)

| Revision | วันที่ (Date) | ผู้แก้ไข (Author/Editor) | รายละเอียดการเปลี่ยนแปลง (Description of Change) | สถานะเอกสาร (Status) |
| :---: | :---: | :--- | :--- | :---: |
| **Rev. 3.4** | 2026-09-17 | System Architect | ร่าง DDL และ Triggers พื้นฐาน: ใช้ Session Token (`set_config`), แยก Medical Certificate | **NO PROCEED** (ตรวจพบช่องโหว่ Token Spoofing และ Missing Trigger code) |
| **Rev. 3.5** | 2026-09-17 | System Architect | ขยาย Trigger ครบ 10 ตัว, เพิ่ม 22 CHECK Constraints, State Machine เกียรติบัตร | **NO PROCEED** (ช่องโหว่ Proxy Reporting และ Attendance Data Drift) |
| **Rev. 3.6** | 2026-09-17 | System Architect | ขจัด Attendance Drift (ใช้ ScheduledClassSession เป็นแหล่งความจริงเดียว), เติม 19 Reverse Relations | **NO PROCEED** (ตรวจสอบพบไฟล์เอกสารยังไม่อัปเดตจริง) |
| **Rev. 3.7** | 2026-09-17 | System Architect | นำคำอ้าง "100%" ออก, เพิ่ม Engineering Status Scorecard, บังคับ Privilege Boundary ระดับ Storage Engine | **REVISE FOR TRUSTED ACTOR** (พารามิเตอร์ Procedure ยังรับ `p_actor_id` เสี่ยง Spoofing) |
| **Rev. 3.8** | 2026-09-17 | System Architect | **สถาปัตยกรรม Trusted Actor & Native Date Edition:**<br>1. ตัด `p_actor_id`/`p_actor_role` ออกจากพารามิเตอร์ Procedure ทั้งหมด<br>2. บังคับ Identity ผ่าน `set_current_app_user(p_user_id)` แบบ `SECURITY DEFINER`<br>3. สลับใช้ Native PostgreSQL `DATE` ตัด Regex และฟังก์ชัน `is_valid_iso_date` ออกทั้งหมด (Ponytail Peak Simplification)<br>4. ตัดฟิลด์ตาย `StudentYearlyBehaviorProjection.version` ออก<br>5. บังคับ Global Lock Order (`Student ➔ Projection ➔ Target BehaviorRecord`)<br>6. ใช้ Explicit Signatures ในคำสั่ง `REVOKE/GRANT` เจาะจงไปยัง `eleave_runtime`<br>7. ชี้แจง Test-12: ยืนยันว่า `APPROVED ➔ REJECTED` เป็นคู่สถานะที่อนุญาตเพื่อการเพิกถอน | **READY FOR GATE APPROVAL** |

---

## 1. บริบทระบบและขอบเขตสถาปัตยกรรม (System Context & Architectural Invariants)

ระบบบริหารจัดการงานกิจการนักเรียน โรงเรียนกุดจับประชาสรรค์ ทำหน้าที่ขับเคลื่อนวงรอบ PDCA (Plan-Do-Check-Act) แบบปิด โดยผูกโยงข้อมูล 6 เสาหลัก:
1. **Flagpole Morning Attendance**: การเช็กแถวหน้าเสาธงแบบรายวัน
2. **Authoritative Period Attendance (MOE 80% Rule)**: การบันทึกเวลาเรียนรายคาบตามตารางจริง โดยไม่มีการ Drift ของข้อมูล
3. **CCT & Home Visit (กสศ. นร.01)**: การเยี่ยมบ้าน บันทึกพิกัด และส่งออกข้อมูล CCT Manifest
4. **Behavior Conduct Ledger**: บัญชีแยกประเภทคะแนนพฤติกรรม พร้อมการคำนวณ Projection แบบ Real-time และระบบสิทธิ์ระดับ Storage Engine
5. **Early Warning System (EWS PDCA)**: วงจรตรวจจับความเสี่ยง ➔ เปิดเคสช่วยเหลือ ➔ กิจกรรมดูแล ➔ สรุปผล
6. **Student 360° Analytics & Merit Certification**: การวิเคราะห์ข้อมูลรอบด้านและการเสนอชื่อรับเกียรติบัตรผ่าน State Machine

---

## 2. เสาหลักความมั่นคงปลอดภัยระดับ Forensic (Forensic Security Hardening)

### 2.1 สถาปัตยกรรม Trusted Actor Identity Context
เพื่อป้องกันการสวมรอยตัวตน (Identity Spoofing) ในระดับ Database Procedure ระบบตัดพารามิเตอร์ตัวตนออก และใช้กลไก Session Context:
$$\text{NextAuth Session} \longrightarrow \text{Server Action} \longrightarrow \text{BEGIN TX} \longrightarrow \texttt{set\_current\_app\_user(p\_user\_id)} \longrightarrow \texttt{record\_student\_behavior\_ledger(...)} \longrightarrow \text{COMMIT}$$

* ฟังก์ชัน `set_current_app_user(p_user_id TEXT)` เป็น `SECURITY DEFINER` ตรวจสอบความถูกต้องและสถานะ `isApproved = true` ของผู้ใช้จริง
* Procedure ดึงตัวตนจาก `current_setting('app.current_user_id', true)` และอ่าน Role จริงจากฐานข้อมูลเสมอ
* หากเกิดการรายงานแทนผู้อื่น (`v_actor_id <> p_reported_by_id`) ระบบบังคับให้ผู้กระทำต้องมีบทบาทเป็น `ADMIN` หรือ `HEAD_OF_STUDENT_AFFAIRS` เท่านั้น

### 2.2 การป้องกัน Deadlock ด้วย Global Lock Order
ทุกทรานแซกชันที่เกี่ยวข้องกับข้อมูลพฤติกรรมและสถานะนักเรียน ต้องถือครอง Lock ตามลำดับชั้นเดียวกันอย่างเคร่งครัด:
1. **`Student`**: ล็อกระดับแถวเมื่อมีการเปลี่ยนสถานะนักเรียน (`change_student_status`)
2. **`StudentYearlyBehaviorProjection`**: ล็อกระดับแถว `FOR UPDATE` เป็นอันดับแรกเสมอก่อนดำเนินการใดๆ บนคะแนนพฤติกรรม
3. **`BehaviorRecord`**: ล็อกเฉพาะแถวเป้าหมาย `FOR UPDATE` เมื่อเป็นการทำรายการชดเชย (`CORRECTION_CREDIT` หรือ `CORRECTION_DEBIT`)

### 2.3 การปรับใช้ Native PostgreSQL `DATE` (Ponytail Peak Simplification)
ตัดความซ้ำซ้อนของการเก็บสตริงวันที่และ Regular Expression Validation ออกทั้งหมด โดยใช้งาน Native PostgreSQL `DATE` (`DateTime @db.Date` ใน Prisma):
* รองรับปฏิทินจริงและการตรวจสอบความถูกต้องของวันในแต่ละเดือนโดยอัตโนมัติในระดับ Database Type System
* เปรียบเทียบช่วงวันที่ในระดับ Engine ได้อย่างแม่นยำและรวดเร็ว

---

## 3. The Executable PostgreSQL DDL Pack (Rev 3.8)

```sql
-- ============================================================================
-- 1. DATABASE CHECK CONSTRAINTS BATTERY (19 CONSTRAINTS)
-- ============================================================================

-- Term Constraints (1 - 2)
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "chk_enrollment_term" CHECK ("term" IN (1, 2));
ALTER TABLE "StudentHomeVisit" ADD CONSTRAINT "chk_homevisit_term" CHECK ("term" IN (1, 2));
ALTER TABLE "StudentSdqEvaluation" ADD CONSTRAINT "chk_sdq_term" CHECK ("term" IN (1, 2));
ALTER TABLE "StudentRiskAssessment" ADD CONSTRAINT "chk_risk_term" CHECK ("term" IN (1, 2));
ALTER TABLE "CctExportManifest" ADD CONSTRAINT "chk_cct_term" CHECK ("term" IN (1, 2));
ALTER TABLE "StudentMeritNomination" ADD CONSTRAINT "chk_nomination_term" CHECK ("term" IN (1, 2));

-- Home Visit Round & Non-Negative Amounts
ALTER TABLE "StudentHomeVisit" ADD CONSTRAINT "chk_homevisit_round" CHECK ("visitRound" BETWEEN 1 AND 10);
ALTER TABLE "StudentHomeVisit" ADD CONSTRAINT "chk_homevisit_dependents" CHECK ("dependentCount" >= 0);
ALTER TABLE "StudentHomeVisit" ADD CONSTRAINT "chk_homevisit_income" CHECK ("guardianIncomeMonth" IS NULL OR "guardianIncomeMonth" >= 0);
ALTER TABLE "StudentHomeVisit" ADD CONSTRAINT "chk_homevisit_commute_cost" CHECK ("commuteCostPerDay" IS NULL OR "commuteCostPerDay" >= 0);
ALTER TABLE "StudentHomeVisit" ADD CONSTRAINT "chk_homevisit_distance" CHECK ("distanceKm" IS NULL OR "distanceKm" >= 0);
ALTER TABLE "StudentHomeVisit" ADD CONSTRAINT "chk_homevisit_land" CHECK ("agriculturalLandRai" IS NULL OR "agriculturalLandRai" >= 0);

-- Enrollment Ranges
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "chk_enrollment_grade" CHECK ("gradeLevel" BETWEEN 1 AND 6);
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "chk_enrollment_room" CHECK ("roomNumber" >= 1);
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "chk_enrollment_roll" CHECK ("rollNumber" >= 1);

-- Counts & Metrics Non-Negative
ALTER TABLE "CctExportManifest" ADD CONSTRAINT "chk_cct_retries" CHECK ("retryCount" >= 0);
ALTER TABLE "CctExportManifest" ADD CONSTRAINT "chk_cct_records" CHECK ("recordCount" >= 0);
ALTER TABLE "StudentYearlyBehaviorProjection" ADD CONSTRAINT "chk_projection_counts" CHECK ("recordCount" >= 0 AND "totalDemerit" >= 0 AND "totalMerit" >= 0);

-- Behavior Points Non-Zero & Sign Consistency
ALTER TABLE "BehaviorRecord" ADD CONSTRAINT "chk_points_nonzero" CHECK ("points" != 0);
ALTER TABLE "BehaviorRecord" ADD CONSTRAINT "chk_points_sign" CHECK (
  ("type" IN ('DEMERIT'::"BehaviorLedgerType", 'CORRECTION_DEBIT'::"BehaviorLedgerType") AND "points" < 0)
  OR
  ("type" IN ('MERIT'::"BehaviorLedgerType", 'CORRECTION_CREDIT'::"BehaviorLedgerType") AND "points" > 0)
);

-- Student Soft Delete Triad
ALTER TABLE "Student" ADD CONSTRAINT "chk_student_soft_delete_triad" CHECK (
  ("deletedAt" IS NULL AND "deletedById" IS NULL AND "deletionReason" IS NULL)
  OR
  ("deletedAt" IS NOT NULL AND "deletedById" IS NOT NULL AND "deletionReason" IS NOT NULL)
);

-- Medical Certificate Verification Triad, Dates & Security Formatting (Native DATE)
ALTER TABLE "StudentMedicalCertificate" ADD CONSTRAINT "chk_medcert_dates" CHECK ("startDate" <= "endDate");
ALTER TABLE "StudentMedicalCertificate" ADD CONSTRAINT "chk_medcert_verification_triad" CHECK (
  ("isVerified" = false AND "verifiedById" IS NULL AND "verifiedAt" IS NULL)
  OR
  ("isVerified" = true AND "verifiedById" IS NOT NULL AND "verifiedAt" IS NOT NULL)
);
ALTER TABLE "StudentMedicalCertificate" ADD CONSTRAINT "chk_medcert_byte_size" CHECK ("byteSize" > 0);
ALTER TABLE "StudentMedicalCertificate" ADD CONSTRAINT "chk_medcert_sha256" CHECK ("sha256" ~ '^[a-f0-9]{64}$');
ALTER TABLE "StudentMedicalCertificate" ADD CONSTRAINT "chk_medcert_storage_key" CHECK ("storageKey" ~ '^[a-zA-Z0-9/_.-]+$');

ALTER TABLE "StudentAffairsAttachment" ADD CONSTRAINT "chk_attachment_byte_size" CHECK ("byteSize" > 0);
ALTER TABLE "StudentAffairsAttachment" ADD CONSTRAINT "chk_attachment_sha256" CHECK ("sha256" ~ '^[a-f0-9]{64}$');
ALTER TABLE "StudentAffairsAttachment" ADD CONSTRAINT "chk_attachment_storage_key" CHECK ("storageKey" ~ '^[a-zA-Z0-9/_.-]+$');

ALTER TABLE "CctExportManifest" ADD CONSTRAINT "chk_cct_byte_size" CHECK ("byteSize" > 0);
ALTER TABLE "CctExportManifest" ADD CONSTRAINT "chk_cct_sha256" CHECK ("payloadSha256" ~ '^[a-f0-9]{64}$');

-- Scheduled Class Session Period & Type Eligibility
ALTER TABLE "ScheduledClassSession" ADD CONSTRAINT "chk_session_period" CHECK ("periodNumber" BETWEEN 1 AND 8);
ALTER TABLE "ScheduledClassSession" ADD CONSTRAINT "chk_session_type_eligibility" CHECK (
  ("sessionType" IN ('REGULAR'::"ScheduledSessionType", 'MAKEUP'::"ScheduledSessionType") AND "isEligibleDenominator" = true)
  OR
  ("sessionType" IN ('CANCELLED_HOLIDAY'::"ScheduledSessionType", 'CANCELLED_TEACHER_DUTY'::"ScheduledSessionType", 'CANCELLED_SCHOOL_EVENT'::"ScheduledSessionType") AND "isEligibleDenominator" = false AND "cancellationReason" IS NOT NULL)
);

-- SDQ Subscale Scores Ranges & Total Sum Invariant
ALTER TABLE "StudentSdqEvaluation" ADD CONSTRAINT "chk_sdq_subscale_scores" CHECK (
  "emotionalScore" BETWEEN 0 AND 10 AND
  "conductScore" BETWEEN 0 AND 10 AND
  "hyperactivityScore" BETWEEN 0 AND 10 AND
  "peerProblemScore" BETWEEN 0 AND 10 AND
  "prosocialScore" BETWEEN 0 AND 10
);
ALTER TABLE "StudentSdqEvaluation" ADD CONSTRAINT "chk_sdq_total_sum" CHECK (
  "totalDifficulties" = ("emotionalScore" + "conductScore" + "hyperactivityScore" + "peerProblemScore")
);

-- Risk Score Range, Level Alignment & Nomination Points
ALTER TABLE "StudentRiskAssessment" ADD CONSTRAINT "chk_risk_score" CHECK ("riskScore" >= 0.0 AND "riskScore" <= 100.0);
ALTER TABLE "StudentRiskAssessment" ADD CONSTRAINT "chk_risk_level_score_alignment" CHECK (
  ("riskLevel" = 'CRITICAL'::"RiskLevel" AND "riskScore" >= 80.0) OR
  ("riskLevel" = 'HIGH'::"RiskLevel" AND "riskScore" >= 60.0 AND "riskScore" < 80.0) OR
  ("riskLevel" = 'MEDIUM'::"RiskLevel" AND "riskScore" >= 40.0 AND "riskScore" < 60.0) OR
  ("riskLevel" = 'LOW'::"RiskLevel" AND "riskScore" >= 20.0 AND "riskScore" < 40.0) OR
  ("riskLevel" = 'NORMAL'::"RiskLevel" AND "riskScore" < 20.0)
);

ALTER TABLE "StudentMeritNomination" ADD CONSTRAINT "chk_nomination_points" CHECK ("meritPointsScore" > 0);


-- ============================================================================
-- 2. PARTIAL UNIQUE INDEXES
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS "uk_behavior_single_correction" 
ON "BehaviorRecord" ("correctionForId") 
WHERE "correctionForId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "uk_student_single_active_case"
ON "StudentInterventionCase" ("studentId")
WHERE "status" IN ('DRAFT', 'OPEN', 'IN_PROGRESS', 'FOLLOW_UP', 'ESCALATED');


-- ============================================================================
-- 3. TRIGGER 1: PERIOD ATTENDANCE INTEGRITY (NATIVE DATE & NO DRIFT)
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_enforce_period_attendance_integrity() 
RETURNS TRIGGER AS $$
DECLARE
  v_enr_classroom_id TEXT;
  v_enr_student_id TEXT;
  v_enr_year INT;
  v_enr_term INT;
  v_enr_status "EnrollmentStatus";
  v_offering_classroom_id TEXT;
  v_offering_year INT;
  v_offering_term INT;
  v_session_date DATE;
  v_med_student_id TEXT;
  v_med_start DATE;
  v_med_end DATE;
  v_med_verified BOOLEAN;
BEGIN
  -- 1. Validate Enrollment
  SELECT "classRoomId", "studentId", "academicYear", "term", "status"
  INTO v_enr_classroom_id, v_enr_student_id, v_enr_year, v_enr_term, v_enr_status
  FROM "StudentEnrollment"
  WHERE "id" = NEW."enrollmentId";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ENROLLMENT_NOT_FOUND: Enrollment % does not exist.', NEW."enrollmentId" USING ERRCODE = '55000';
  END IF;

  IF v_enr_status <> 'ENROLLED'::"EnrollmentStatus" THEN
    RAISE EXCEPTION 'ENROLLMENT_INACTIVE: Cannot record attendance for enrollment in status %.', v_enr_status USING ERRCODE = '55000';
  END IF;

  -- 2. Validate Session & Offering (Authoritative Source for Date/Period/Room)
  SELECT o."classRoomId", o."academicYear", o."term", s."businessDate"
  INTO v_offering_classroom_id, v_offering_year, v_offering_term, v_session_date
  FROM "ScheduledClassSession" s
  JOIN "SubjectOffering" o ON o."id" = s."offeringId"
  WHERE s."id" = NEW."scheduledSessionId";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND: Scheduled session % does not exist.', NEW."scheduledSessionId" USING ERRCODE = '55000';
  END IF;

  -- 3. Invariant: Classroom Match
  IF v_enr_classroom_id IS DISTINCT FROM v_offering_classroom_id THEN
    RAISE EXCEPTION 'CROSS_CLASSROOM_ATTENDANCE_FORBIDDEN: Student classroom (%) does not match subject offering classroom (%).',
      v_enr_classroom_id, v_offering_classroom_id USING ERRCODE = '55000';
  END IF;

  -- 4. Invariant: Academic Year & Term Match
  IF v_enr_year IS DISTINCT FROM v_offering_year OR v_enr_term IS DISTINCT FROM v_offering_term THEN
    RAISE EXCEPTION 'ATTENDANCE_TERM_MISMATCH: Enrollment term (%/%) does not match session term (%/%).',
      v_enr_year, v_enr_term, v_offering_year, v_offering_term USING ERRCODE = '55000';
  END IF;

  -- 5. Invariant: Medical Certificate Ownership & Date Bounds
  IF NEW."medicalCertId" IS NOT NULL THEN
    SELECT "studentId", "startDate", "endDate", "isVerified"
    INTO v_med_student_id, v_med_start, v_med_end, v_med_verified
    FROM "StudentMedicalCertificate"
    WHERE "id" = NEW."medicalCertId";

    IF NOT FOUND THEN
      RAISE EXCEPTION 'MEDICAL_CERT_NOT_FOUND: Medical certificate % does not exist.', NEW."medicalCertId" USING ERRCODE = '55000';
    END IF;

    IF v_med_student_id IS DISTINCT FROM v_enr_student_id THEN
      RAISE EXCEPTION 'MEDICAL_CERT_STUDENT_MISMATCH: Medical cert belongs to student %, but attendance is for student %.',
        v_med_student_id, v_enr_student_id USING ERRCODE = '55000';
    END IF;

    IF v_session_date < v_med_start OR v_session_date > v_med_end THEN
      RAISE EXCEPTION 'MEDICAL_CERT_DATE_OUT_OF_RANGE: Session date % is outside certificate range [% to %].',
        v_session_date, v_med_start, v_med_end USING ERRCODE = '55000';
    END IF;

    IF NEW."exemptionStatus" = 'EXEMPTED_OFFICIAL'::"AttendanceExemptionStatus" AND v_med_verified = false THEN
      RAISE EXCEPTION 'MEDICAL_CERT_UNVERIFIED: Cannot grant EXEMPTED_OFFICIAL with unverified medical certificate.' USING ERRCODE = '55000';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_period_attendance_integrity ON "StudentPeriodAttendance";
CREATE TRIGGER trg_period_attendance_integrity
BEFORE INSERT OR UPDATE ON "StudentPeriodAttendance"
FOR EACH ROW EXECUTE FUNCTION trg_enforce_period_attendance_integrity();


-- ============================================================================
-- 4. TRIGGER 2: MORNING ATTENDANCE INTEGRITY GUARD (NATIVE DATE)
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_enforce_morning_attendance_integrity() 
RETURNS TRIGGER AS $$
DECLARE
  v_enr_student_id TEXT;
  v_enr_status "EnrollmentStatus";
  v_med_student_id TEXT;
  v_med_start DATE;
  v_med_end DATE;
  v_med_verified BOOLEAN;
BEGIN
  -- 1. Validate Enrollment
  SELECT "studentId", "status"
  INTO v_enr_student_id, v_enr_status
  FROM "StudentEnrollment"
  WHERE "id" = NEW."enrollmentId";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ENROLLMENT_NOT_FOUND: Enrollment % does not exist.', NEW."enrollmentId" USING ERRCODE = '55000';
  END IF;

  IF v_enr_status <> 'ENROLLED'::"EnrollmentStatus" THEN
    RAISE EXCEPTION 'ENROLLMENT_INACTIVE: Cannot record morning attendance for enrollment in status %.', v_enr_status USING ERRCODE = '55000';
  END IF;

  -- 2. Validate Medical Certificate Ownership & Date Bounds
  IF NEW."medicalCertId" IS NOT NULL THEN
    SELECT "studentId", "startDate", "endDate", "isVerified"
    INTO v_med_student_id, v_med_start, v_med_end, v_med_verified
    FROM "StudentMedicalCertificate"
    WHERE "id" = NEW."medicalCertId";

    IF NOT FOUND THEN
      RAISE EXCEPTION 'MEDICAL_CERT_NOT_FOUND: Medical certificate % does not exist.', NEW."medicalCertId" USING ERRCODE = '55000';
    END IF;

    IF v_med_student_id IS DISTINCT FROM v_enr_student_id THEN
      RAISE EXCEPTION 'MEDICAL_CERT_STUDENT_MISMATCH: Medical cert belongs to student %, but morning attendance is for student %.',
        v_med_student_id, v_enr_student_id USING ERRCODE = '55000';
    END IF;

    IF NEW."businessDate" < v_med_start OR NEW."businessDate" > v_med_end THEN
      RAISE EXCEPTION 'MEDICAL_CERT_DATE_OUT_OF_RANGE: Morning attendance date % is outside certificate range [% to %].',
        NEW."businessDate", v_med_start, v_med_end USING ERRCODE = '55000';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_morning_attendance_integrity ON "StudentMorningAttendance";
CREATE TRIGGER trg_morning_attendance_integrity
BEFORE INSERT OR UPDATE ON "StudentMorningAttendance"
FOR EACH ROW EXECUTE FUNCTION trg_enforce_morning_attendance_integrity();


-- ============================================================================
-- 5. TRIGGER 3: NOMINATION FULL STATE MACHINE MATRIX & IMMUTABILITY
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_enforce_nomination_lifecycle() 
RETURNS TRIGGER AS $$
BEGIN
  -- 1. INSERT Operations
  IF TG_OP = 'INSERT' THEN
    IF NEW."status" <> 'PENDING_REVIEW'::"NominationStatus" THEN
      RAISE EXCEPTION 'NOMINATION_INITIAL_STATUS_INVALID: Initial status must be PENDING_REVIEW (got %).', NEW."status" USING ERRCODE = '55000';
    END IF;
    IF NEW."reviewedById" IS NOT NULL OR NEW."reviewedAt" IS NOT NULL OR NEW."rejectionReason" IS NOT NULL OR NEW."certificateItemId" IS NOT NULL THEN
      RAISE EXCEPTION 'NOMINATION_INITIAL_FIELDS_INVALID: Review and certificate fields must be null on creation.' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
  END IF;

  -- 2. DELETE Operations
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" = 'ISSUED'::"NominationStatus" THEN
      RAISE EXCEPTION 'NOMINATION_SEALED: An issued nomination cannot be deleted.' USING ERRCODE = '55000';
    END IF;
    IF OLD."status" = 'APPROVED'::"NominationStatus" THEN
      RAISE EXCEPTION 'NOMINATION_APPROVED_CANNOT_DELETE: Approved nomination must be rejected/revoked before deletion.' USING ERRCODE = '55000';
    END IF;
    IF OLD."status" = 'REJECTED'::"NominationStatus" THEN
      RAISE EXCEPTION 'NOMINATION_REJECTED_CANNOT_DELETE: Rejected nomination record must be preserved for audit trail.' USING ERRCODE = '55000';
    END IF;
    RETURN OLD;
  END IF;

  -- 3. UPDATE Operations: Transition Matrix
  IF OLD."status" = 'ISSUED'::"NominationStatus" THEN
    RAISE EXCEPTION 'NOMINATION_SEALED: An issued nomination is permanently sealed and immutable.' USING ERRCODE = '55000';
  END IF;

  IF OLD."status" = 'REJECTED'::"NominationStatus" THEN
    RAISE EXCEPTION 'NOMINATION_REJECTED_FINAL: Rejected nominations cannot be modified.' USING ERRCODE = '55000';
  END IF;

  -- Pair: PENDING_REVIEW -> PENDING_REVIEW
  IF OLD."status" = 'PENDING_REVIEW'::"NominationStatus" AND NEW."status" = 'PENDING_REVIEW'::"NominationStatus" THEN
    IF NEW."studentId" IS DISTINCT FROM OLD."studentId" OR 
       NEW."academicYear" IS DISTINCT FROM OLD."academicYear" OR 
       NEW."term" IS DISTINCT FROM OLD."term" THEN
      RAISE EXCEPTION 'NOMINATION_IDENTITY_IMMUTABLE: Cannot change studentId, academicYear, or term.' USING ERRCODE = '55000';
    END IF;
    IF NEW."reviewedById" IS NOT NULL OR NEW."reviewedAt" IS NOT NULL OR NEW."certificateItemId" IS NOT NULL THEN
      RAISE EXCEPTION 'NOMINATION_PENDING_MUTATION_INVALID: Cannot set review or certificate fields while in PENDING_REVIEW.' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
  END IF;

  -- Pair: PENDING_REVIEW -> APPROVED
  IF OLD."status" = 'PENDING_REVIEW'::"NominationStatus" AND NEW."status" = 'APPROVED'::"NominationStatus" THEN
    IF NEW."reviewedById" IS NULL OR NEW."reviewedAt" IS NULL THEN
      RAISE EXCEPTION 'NOMINATION_INVALID_TRANSITION: Approval requires reviewedById and reviewedAt.' USING ERRCODE = '55000';
    END IF;
    IF NEW."rejectionReason" IS NOT NULL THEN
      RAISE EXCEPTION 'NOMINATION_INVALID_TRANSITION: Approved nomination cannot have rejectionReason.' USING ERRCODE = '55000';
    END IF;
    IF NEW."certificateItemId" IS NOT NULL THEN
      RAISE EXCEPTION 'NOMINATION_INVALID_TRANSITION: Certificate cannot be linked at approval stage.' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
  END IF;

  -- Pair: PENDING_REVIEW -> REJECTED
  IF OLD."status" = 'PENDING_REVIEW'::"NominationStatus" AND NEW."status" = 'REJECTED'::"NominationStatus" THEN
    IF NEW."reviewedById" IS NULL OR NEW."reviewedAt" IS NULL OR NEW."rejectionReason" IS NULL OR TRIM(NEW."rejectionReason") = '' THEN
      RAISE EXCEPTION 'NOMINATION_INVALID_TRANSITION: Rejection requires reviewedById, reviewedAt, and non-empty rejectionReason.' USING ERRCODE = '55000';
    END IF;
    IF NEW."certificateItemId" IS NOT NULL THEN
      RAISE EXCEPTION 'NOMINATION_INVALID_TRANSITION: Rejected nomination cannot have certificateItemId.' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
  END IF;

  -- Pair: APPROVED -> APPROVED
  IF OLD."status" = 'APPROVED'::"NominationStatus" AND NEW."status" = 'APPROVED'::"NominationStatus" THEN
    IF NEW."studentId" IS DISTINCT FROM OLD."studentId" OR
       NEW."academicYear" IS DISTINCT FROM OLD."academicYear" OR
       NEW."term" IS DISTINCT FROM OLD."term" OR
       NEW."meritPointsScore" IS DISTINCT FROM OLD."meritPointsScore" OR
       NEW."awardCategory" IS DISTINCT FROM OLD."awardCategory" OR
       NEW."reason" IS DISTINCT FROM OLD."reason" OR
       NEW."reviewedById" IS DISTINCT FROM OLD."reviewedById" OR
       NEW."reviewedAt" IS DISTINCT FROM OLD."reviewedAt" OR
       NEW."rejectionReason" IS NOT NULL OR
       NEW."certificateItemId" IS NOT NULL THEN
      RAISE EXCEPTION 'NOMINATION_APPROVED_IMMUTABLE: Approved nominations only permit editing decisionNotes.' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
  END IF;

  -- Pair: APPROVED -> ISSUED
  IF OLD."status" = 'APPROVED'::"NominationStatus" AND NEW."status" = 'ISSUED'::"NominationStatus" THEN
    IF NEW."certificateItemId" IS NULL THEN
      RAISE EXCEPTION 'NOMINATION_INVALID_TRANSITION: Issuance requires certificateItemId.' USING ERRCODE = '55000';
    END IF;
    IF NEW."rejectionReason" IS NOT NULL THEN
      RAISE EXCEPTION 'NOMINATION_INVALID_TRANSITION: Issued nomination cannot have rejectionReason.' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
  END IF;

  -- Pair: APPROVED -> REJECTED (Allowed Revocation)
  IF OLD."status" = 'APPROVED'::"NominationStatus" AND NEW."status" = 'REJECTED'::"NominationStatus" THEN
    IF NEW."rejectionReason" IS NULL OR TRIM(NEW."rejectionReason") = '' THEN
      RAISE EXCEPTION 'NOMINATION_INVALID_TRANSITION: Revocation requires non-empty rejectionReason.' USING ERRCODE = '55000';
    END IF;
    IF NEW."certificateItemId" IS NOT NULL THEN
      RAISE EXCEPTION 'NOMINATION_INVALID_TRANSITION: Revoked nomination cannot have certificateItemId.' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'NOMINATION_ILLEGAL_TRANSITION: Transition from % to % is strictly forbidden by state machine matrix.',
    OLD."status", NEW."status" USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nomination_lifecycle ON "StudentMeritNomination";
CREATE TRIGGER trg_nomination_lifecycle
BEFORE INSERT OR UPDATE OR DELETE ON "StudentMeritNomination"
FOR EACH ROW EXECUTE FUNCTION trg_enforce_nomination_lifecycle();


-- ============================================================================
-- 6. TRIGGER 4: ATTACHMENT TOMBSTONE & METADATA IMMUTABILITY GUARD
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_enforce_attachment_tombstone() 
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'ATTACHMENT_DELETE_FORBIDDEN: Student affairs attachments are immutable and cannot be deleted. Use tombstoning.' USING ERRCODE = '55000';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD."isTombstoned" = true THEN
      RAISE EXCEPTION 'ATTACHMENT_ALREADY_TOMBSTONED: This attachment has been permanently tombstoned and is sealed against further modifications.' USING ERRCODE = '55000';
    END IF;

    IF NEW."storageKey" IS DISTINCT FROM OLD."storageKey" OR
       NEW."sha256" IS DISTINCT FROM OLD."sha256" OR
       NEW."byteSize" IS DISTINCT FROM OLD."byteSize" OR
       NEW."entityType" IS DISTINCT FROM OLD."entityType" OR
       NEW."entityId" IS DISTINCT FROM OLD."entityId" OR
       NEW."uploadedAt" IS DISTINCT FROM OLD."uploadedAt" OR
       NEW."uploadedById" IS DISTINCT FROM OLD."uploadedById" THEN
      RAISE EXCEPTION 'ATTACHMENT_METADATA_IMMUTABLE: Attachment core metadata (storageKey, sha256, byteSize, entity) cannot be altered after upload.' USING ERRCODE = '55000';
    END IF;

    IF OLD."isTombstoned" = false AND NEW."isTombstoned" = true THEN
      IF NEW."tombstonedAt" IS NULL OR NEW."tombstonedById" IS NULL OR NEW."tombstoneReason" IS NULL OR TRIM(NEW."tombstoneReason") = '' THEN
        RAISE EXCEPTION 'ATTACHMENT_TOMBSTONE_INCOMPLETE: Tombstoning requires tombstonedAt, tombstonedById, and non-empty tombstoneReason.' USING ERRCODE = '55000';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_attachment_tombstone ON "StudentAffairsAttachment";
CREATE TRIGGER trg_attachment_tombstone
BEFORE UPDATE OR DELETE ON "StudentAffairsAttachment"
FOR EACH ROW EXECUTE FUNCTION trg_enforce_attachment_tombstone();


-- ============================================================================
-- 7. TRIGGER 5: ATTACHMENT POLYMORPHIC REFERENTIAL INTEGRITY (TEST-07 REALIZED)
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_enforce_attachment_entity_integrity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."entityType" = 'HOME_VISIT'::"AttachmentEntityType" THEN
    IF NOT EXISTS (SELECT 1 FROM "StudentHomeVisit" WHERE "id" = NEW."entityId") THEN
      RAISE EXCEPTION 'ATTACHMENT_ENTITY_NOT_FOUND: Home visit % does not exist.', NEW."entityId" USING ERRCODE = '55000';
    END IF;
  ELSIF NEW."entityType" = 'BEHAVIOR_EVIDENCE'::"AttachmentEntityType" THEN
    IF NOT EXISTS (SELECT 1 FROM "BehaviorRecord" WHERE "id" = NEW."entityId") THEN
      RAISE EXCEPTION 'ATTACHMENT_ENTITY_NOT_FOUND: Behavior record % does not exist.', NEW."entityId" USING ERRCODE = '55000';
    END IF;
  ELSIF NEW."entityType" = 'CASE_DOC'::"AttachmentEntityType" THEN
    IF NOT EXISTS (SELECT 1 FROM "StudentInterventionCase" WHERE "id" = NEW."entityId") THEN
      RAISE EXCEPTION 'ATTACHMENT_ENTITY_NOT_FOUND: Intervention case % does not exist.', NEW."entityId" USING ERRCODE = '55000';
    END IF;
  ELSE
    RAISE EXCEPTION 'ATTACHMENT_INVALID_ENTITY_TYPE: Unknown entity type %.', NEW."entityType" USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_attachment_entity_integrity ON "StudentAffairsAttachment";
CREATE TRIGGER trg_attachment_entity_integrity
BEFORE INSERT OR UPDATE OF "entityType", "entityId" ON "StudentAffairsAttachment"
FOR EACH ROW EXECUTE FUNCTION trg_enforce_attachment_entity_integrity();


-- ============================================================================
-- 8. TRIGGER 6: APPEND-ONLY AUDIT LOG GUARD
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'FORENSIC_INTEGRITY_VIOLATION: Student affairs audit logs are strictly append-only and cannot be modified or deleted.' USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_log_immutable ON "StudentAffairsAuditLog";
CREATE TRIGGER trg_audit_log_immutable
BEFORE UPDATE OR DELETE ON "StudentAffairsAuditLog"
FOR EACH ROW EXECUTE FUNCTION trg_prevent_audit_log_mutation();


-- ============================================================================
-- 9. TRIGGER 7: PROJECTION GUARD (INSERT, UPDATE, DELETE DEFENSE-IN-DEPTH)
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_enforce_projection_guard()
RETURNS TRIGGER AS $$
DECLARE
  v_token TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'PROJECTION_DELETE_FORBIDDEN: Behavior projection records cannot be deleted.' USING ERRCODE = '55000';
  END IF;

  v_token := current_setting('app.behavior_ledger_token', true);
  IF v_token IS NULL OR v_token <> 'AUTHORIZED_LEDGER_TX' THEN
    RAISE EXCEPTION 'PROJECTION_DIRECT_MUTATION_FORBIDDEN: StudentYearlyBehaviorProjection can only be modified via record_student_behavior_ledger().' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projection_guard ON "StudentYearlyBehaviorProjection";
CREATE TRIGGER trg_projection_guard
BEFORE INSERT OR UPDATE OR DELETE ON "StudentYearlyBehaviorProjection"
FOR EACH ROW EXECUTE FUNCTION trg_enforce_projection_guard();


-- ============================================================================
-- 10. TRIGGER 8: SDQ NORMS DUAL GUARD (AUTO-LOCK & IMMUTABILITY)
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_auto_lock_sdq_norm()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE "SdqNormsRegistry"
  SET "isImmutable" = true
  WHERE "id" = NEW."normRegistryId" AND "isImmutable" = false;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sdq_eval_locks_norm ON "StudentSdqEvaluation";
CREATE TRIGGER trg_sdq_eval_locks_norm
AFTER INSERT ON "StudentSdqEvaluation"
FOR EACH ROW EXECUTE FUNCTION trg_auto_lock_sdq_norm();

CREATE OR REPLACE FUNCTION trg_enforce_sdq_norms_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."isImmutable" = true THEN
      RAISE EXCEPTION 'SDQ_NORMS_IMMUTABLE: Cannot delete locked SDQ norms registry.' USING ERRCODE = '55000';
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD."isImmutable" = false AND NEW."isImmutable" = true THEN
      RETURN NEW;
    END IF;
    IF OLD."isImmutable" = true THEN
      RAISE EXCEPTION 'SDQ_NORMS_IMMUTABLE: Cannot modify locked SDQ norms registry.' USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sdq_norms_immutability ON "SdqNormsRegistry";
CREATE TRIGGER trg_sdq_norms_immutability
BEFORE UPDATE OR DELETE ON "SdqNormsRegistry"
FOR EACH ROW EXECUTE FUNCTION trg_enforce_sdq_norms_immutability();


-- ============================================================================
-- 11. TRIGGER 9: CCT MANIFEST TWO-PHASE SEAL GUARD
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_enforce_cct_manifest_guard()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" = 'VERIFIED'::"CctManifestStatus" THEN
      RAISE EXCEPTION 'CCT_MANIFEST_IMMUTABLE: Cannot delete verified CCT manifest.' USING ERRCODE = '55000';
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD."status" = 'VERIFIED'::"CctManifestStatus" THEN
      RAISE EXCEPTION 'CCT_MANIFEST_IMMUTABLE: A verified CCT export manifest is permanently sealed.' USING ERRCODE = '55000';
    END IF;
    IF OLD."status" = 'FAILED'::"CctManifestStatus" AND NEW."status" = 'PENDING_UPLOAD'::"CctManifestStatus" THEN
      RETURN NEW;
    END IF;
    IF OLD."status" = 'PENDING_UPLOAD'::"CctManifestStatus" AND NEW."status" IN ('VERIFIED'::"CctManifestStatus", 'FAILED'::"CctManifestStatus") THEN
      RETURN NEW;
    END IF;
    IF OLD."status" = NEW."status" THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'CCT_MANIFEST_ILLEGAL_TRANSITION: Invalid status transition from % to %.', OLD."status", NEW."status" USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cct_manifest_guard ON "CctExportManifest";
CREATE TRIGGER trg_cct_manifest_guard
BEFORE UPDATE OR DELETE ON "CctExportManifest"
FOR EACH ROW EXECUTE FUNCTION trg_enforce_cct_manifest_guard();


-- ============================================================================
-- 12. TRIGGER 10: ATOMIC STUDENT STATUS HISTORY GUARD
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_enforce_student_status_atomic()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."status" IS DISTINCT FROM NEW."status" THEN
    IF current_setting('app.student_status_authorized', true) IS DISTINCT FROM 'TRUE' THEN
      RAISE EXCEPTION 'STUDENT_STATUS_DIRECT_MUTATION_FORBIDDEN: Student status must be changed via change_student_status() to ensure atomic history logging.' USING ERRCODE = '55000';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_student_status_atomic ON "Student";
CREATE TRIGGER trg_student_status_atomic
BEFORE UPDATE OF "status" ON "Student"
FOR EACH ROW EXECUTE FUNCTION trg_enforce_student_status_atomic();


-- ============================================================================
-- 13. CONTEXT SETTER: SET CURRENT APP USER (TRUSTED IDENTITY CONTEXT)
-- ============================================================================

CREATE OR REPLACE FUNCTION set_current_app_user(p_user_id TEXT)
RETURNS VOID AS $$
DECLARE
  v_is_approved BOOLEAN;
BEGIN
  IF p_user_id IS NULL OR TRIM(p_user_id) = '' THEN
    RAISE EXCEPTION 'INVALID_USER_ID: User ID cannot be null or empty.' USING ERRCODE = '55000';
  END IF;

  SELECT "isApproved" INTO v_is_approved
  FROM "User"
  WHERE "id" = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND: User % does not exist.', p_user_id USING ERRCODE = '55000';
  END IF;

  IF v_is_approved IS NOT TRUE THEN
    RAISE EXCEPTION 'USER_NOT_APPROVED: User % is not approved.', p_user_id USING ERRCODE = '55000';
  END IF;

  PERFORM set_config('app.current_user_id', p_user_id, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- ============================================================================
-- 14. STORED PROCEDURE: CHANGE STUDENT STATUS (ATOMIC CO-MUTATION & TRUSTED ACTOR)
-- ============================================================================

CREATE OR REPLACE FUNCTION change_student_status(
  p_student_id TEXT,
  p_to_status "StudentStatus",
  p_reason TEXT
) RETURNS VOID AS $$
DECLARE
  v_actor_id TEXT;
  v_actor_role TEXT;
  v_is_approved BOOLEAN;
  v_old_status "StudentStatus";
  v_history_id TEXT;
BEGIN
  -- 1. Extract and verify trusted actor from session context
  v_actor_id := current_setting('app.current_user_id', true);
  IF v_actor_id IS NULL OR TRIM(v_actor_id) = '' THEN
    RAISE EXCEPTION 'CONTEXT_USER_NOT_SET: Execution context app.current_user_id must be set via set_current_app_user().' USING ERRCODE = '55000';
  END IF;

  SELECT "role", "isApproved" INTO v_actor_role, v_is_approved
  FROM "User"
  WHERE "id" = v_actor_id;

  IF NOT FOUND OR v_is_approved IS NOT TRUE THEN
    RAISE EXCEPTION 'ACTOR_NOT_FOUND: Current actor % is invalid or unapproved.', v_actor_id USING ERRCODE = '55000';
  END IF;

  IF v_actor_role NOT IN ('ADMIN', 'HEAD_OF_STUDENT_AFFAIRS') THEN
    RAISE EXCEPTION 'UNAUTHORIZED_STATUS_CHANGE: Only ADMIN or HEAD_OF_STUDENT_AFFAIRS can change student status.' USING ERRCODE = '55000';
  END IF;

  -- 2. Validate student & lock row (Global Lock Order: 1. Student)
  SELECT "status" INTO v_old_status
  FROM "Student"
  WHERE "id" = p_student_id AND "deletedAt" IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'STUDENT_NOT_FOUND: Student % not found or decommissioned.', p_student_id USING ERRCODE = '55000';
  END IF;

  IF v_old_status = p_to_status THEN
    RAISE EXCEPTION 'STUDENT_STATUS_SAME: Status is already %.', p_to_status USING ERRCODE = '55000';
  END IF;

  IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
    RAISE EXCEPTION 'STUDENT_STATUS_REASON_REQUIRED: Status change requires a non-empty reason.' USING ERRCODE = '55000';
  END IF;

  -- 3. Insert Status History with real actor ID
  v_history_id := 'shist_' || md5(random()::text || clock_timestamp()::text);
  INSERT INTO "StudentStatusHistory" (
    "id", "studentId", "fromStatus", "toStatus", "effectiveDate", "reason", "changedById", "createdAt"
  ) VALUES (
    v_history_id, p_student_id, v_old_status, p_to_status, clock_timestamp(), p_reason, v_actor_id, clock_timestamp()
  );

  -- 4. Set authorization token for status trigger
  PERFORM set_config('app.student_status_authorized', 'TRUE', true);

  -- 5. Update Student Status
  UPDATE "Student"
  SET "status" = p_to_status, "updatedAt" = clock_timestamp()
  WHERE "id" = p_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- ============================================================================
-- 15. STORED PROCEDURE: RECORD STUDENT BEHAVIOR LEDGER (REV 3.8 TRUSTED ACTOR)
-- ============================================================================

CREATE OR REPLACE FUNCTION record_student_behavior_ledger(
  p_student_id TEXT,
  p_academic_year INT,
  p_type "BehaviorLedgerType",
  p_category "BehaviorCategory",
  p_points INT,
  p_business_date DATE,
  p_incident_timestamp TIMESTAMPTZ,
  p_location TEXT,
  p_description TEXT,
  p_reported_by_id TEXT,
  p_correction_for_id TEXT DEFAULT NULL,
  p_correlation_id TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS TABLE (
  o_record_id TEXT,
  o_sequence_no BIGINT,
  o_balance_after INT
) AS $$
DECLARE
  v_actor_id TEXT;
  v_actor_role TEXT;
  v_is_approved BOOLEAN;

  v_target_student_id TEXT;
  v_target_academic_year INT;
  v_target_type "BehaviorLedgerType";
  v_target_points INT;
  v_target_correction_for_id TEXT;
  
  v_proj_id TEXT;
  v_current_score INT;
  v_total_demerit INT;
  v_total_merit INT;
  v_record_count INT;
  
  v_new_balance INT;
  v_new_seq BIGINT;
  v_new_record_id TEXT;
  v_audit_id TEXT;
BEGIN
  -- 1. Input Validation
  IF p_points = 0 THEN
    RAISE EXCEPTION 'POINTS_ZERO_FORBIDDEN: Behavior points cannot be 0.' USING ERRCODE = '55000';
  END IF;

  IF p_business_date IS NULL THEN
    RAISE EXCEPTION 'DATE_REQUIRED: Business date is required.' USING ERRCODE = '55000';
  END IF;

  -- 2. Extract and verify Trusted Actor from session context (No Spoofing)
  v_actor_id := current_setting('app.current_user_id', true);
  IF v_actor_id IS NULL OR TRIM(v_actor_id) = '' THEN
    RAISE EXCEPTION 'CONTEXT_USER_NOT_SET: Execution context app.current_user_id must be set via set_current_app_user().' USING ERRCODE = '55000';
  END IF;

  SELECT "role", "isApproved" INTO v_actor_role, v_is_approved
  FROM "User"
  WHERE "id" = v_actor_id;

  IF NOT FOUND OR v_is_approved IS NOT TRUE THEN
    RAISE EXCEPTION 'ACTOR_NOT_FOUND: Current actor % is invalid or unapproved.', v_actor_id USING ERRCODE = '55000';
  END IF;

  -- If reporting on-behalf-of another user, require administrative authority
  IF v_actor_id <> p_reported_by_id AND v_actor_role NOT IN ('ADMIN', 'HEAD_OF_STUDENT_AFFAIRS') THEN
    RAISE EXCEPTION 'UNAUTHORIZED_PROXY_REPORTING: User % cannot record behavior on behalf of %.', v_actor_id, p_reported_by_id USING ERRCODE = '55000';
  END IF;

  -- 3. Verify Student Exists and is NOT Decommissioned (Global Lock Order: 1. Student)
  IF NOT EXISTS (SELECT 1 FROM "Student" WHERE "id" = p_student_id AND "deletedAt" IS NULL) THEN
    RAISE EXCEPTION 'STUDENT_NOT_ACTIVE: Student % does not exist or has been decommissioned.', p_student_id USING ERRCODE = '55000';
  END IF;

  -- 4. Global Lock Order: 2. Lock StudentYearlyBehaviorProjection FOR UPDATE
  SELECT "id", "currentScore", "totalDemerit", "totalMerit", "recordCount"
  INTO v_proj_id, v_current_score, v_total_demerit, v_total_merit, v_record_count
  FROM "StudentYearlyBehaviorProjection"
  WHERE "studentId" = p_student_id AND "academicYear" = p_academic_year
  FOR UPDATE;

  -- Set Transaction-Local Session Token for trg_projection_guard
  PERFORM set_config('app.behavior_ledger_token', 'AUTHORIZED_LEDGER_TX', true);

  IF NOT FOUND THEN
    INSERT INTO "StudentYearlyBehaviorProjection" (
      "id", "studentId", "academicYear", "startingScore", "currentScore",
      "totalDemerit", "totalMerit", "recordCount", "lastCalculatedAt"
    ) VALUES (
      'proj_' || md5(random()::text || clock_timestamp()::text),
      p_student_id, p_academic_year, 100, 100, 0, 0, 0, clock_timestamp()
    )
    RETURNING "id", "currentScore", "totalDemerit", "totalMerit", "recordCount"
    INTO v_proj_id, v_current_score, v_total_demerit, v_total_merit, v_record_count;
  END IF;

  -- 5. Global Lock Order: 3. Type Validation & Target Row Locking (Only for corrections)
  IF p_type = 'DEMERIT'::"BehaviorLedgerType" THEN
    IF p_points >= 0 THEN
      RAISE EXCEPTION 'DEMERIT_POINTS_MUST_BE_NEGATIVE: Demerit points must be negative.' USING ERRCODE = '55000';
    END IF;
    IF p_correction_for_id IS NOT NULL THEN
      RAISE EXCEPTION 'DEMERIT_CANNOT_HAVE_CORRECTION_FOR: Regular demerit cannot reference correctionForId.' USING ERRCODE = '55000';
    END IF;

  ELSIF p_type = 'MERIT'::"BehaviorLedgerType" THEN
    IF p_points <= 0 THEN
      RAISE EXCEPTION 'MERIT_POINTS_MUST_BE_POSITIVE: Merit points must be positive.' USING ERRCODE = '55000';
    END IF;
    IF p_correction_for_id IS NOT NULL THEN
      RAISE EXCEPTION 'MERIT_CANNOT_HAVE_CORRECTION_FOR: Regular merit cannot reference correctionForId.' USING ERRCODE = '55000';
    END IF;

  ELSIF p_type = 'CORRECTION_CREDIT'::"BehaviorLedgerType" THEN
    IF p_points <= 0 THEN
      RAISE EXCEPTION 'CORRECTION_CREDIT_MUST_BE_POSITIVE: Correction credit points must be positive.' USING ERRCODE = '55000';
    END IF;
    IF p_correction_for_id IS NULL THEN
      RAISE EXCEPTION 'CORRECTION_REQUIRES_TARGET: Correction credit must specify correctionForId.' USING ERRCODE = '55000';
    END IF;

    -- Lock target record FOR UPDATE
    SELECT "studentId", "academicYear", "type", "points", "correctionForId"
    INTO v_target_student_id, v_target_academic_year, v_target_type, v_target_points, v_target_correction_for_id
    FROM "BehaviorRecord"
    WHERE "id" = p_correction_for_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'TARGET_RECORD_NOT_FOUND: Behavior record % not found.', p_correction_for_id USING ERRCODE = '55000';
    END IF;

    IF v_target_student_id <> p_student_id THEN
      RAISE EXCEPTION 'CORRECTION_STUDENT_MISMATCH: Target record belongs to student %, not %.', v_target_student_id, p_student_id USING ERRCODE = '55000';
    END IF;
    IF v_target_academic_year <> p_academic_year THEN
      RAISE EXCEPTION 'CORRECTION_YEAR_MISMATCH: Target record belongs to year %, not %.', v_target_academic_year, p_academic_year USING ERRCODE = '55000';
    END IF;
    IF v_target_type <> 'DEMERIT'::"BehaviorLedgerType" THEN
      RAISE EXCEPTION 'INVALID_CORRECTION_TARGET: CORRECTION_CREDIT can only correct DEMERIT (target is %).', v_target_type USING ERRCODE = '55000';
    END IF;
    IF v_target_correction_for_id IS NOT NULL THEN
      RAISE EXCEPTION 'CANNOT_CORRECT_A_CORRECTION: Cannot chain corrections on record %.', p_correction_for_id USING ERRCODE = '55000';
    END IF;
    IF p_points > ABS(v_target_points) THEN
      RAISE EXCEPTION 'CORRECTION_EXCEEDS_ORIGINAL: Cannot credit % points for an original demerit of % points.', p_points, v_target_points USING ERRCODE = '55000';
    END IF;

  ELSIF p_type = 'CORRECTION_DEBIT'::"BehaviorLedgerType" THEN
    IF p_points >= 0 THEN
      RAISE EXCEPTION 'CORRECTION_DEBIT_MUST_BE_NEGATIVE: Correction debit points must be negative.' USING ERRCODE = '55000';
    END IF;
    IF p_correction_for_id IS NULL THEN
      RAISE EXCEPTION 'CORRECTION_REQUIRES_TARGET: Correction debit must specify correctionForId.' USING ERRCODE = '55000';
    END IF;

    -- Lock target record FOR UPDATE
    SELECT "studentId", "academicYear", "type", "points", "correctionForId"
    INTO v_target_student_id, v_target_academic_year, v_target_type, v_target_points, v_target_correction_for_id
    FROM "BehaviorRecord"
    WHERE "id" = p_correction_for_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'TARGET_RECORD_NOT_FOUND: Behavior record % not found.', p_correction_for_id USING ERRCODE = '55000';
    END IF;

    IF v_target_student_id <> p_student_id THEN
      RAISE EXCEPTION 'CORRECTION_STUDENT_MISMATCH: Target record belongs to student %, not %.', v_target_student_id, p_student_id USING ERRCODE = '55000';
    END IF;
    IF v_target_academic_year <> p_academic_year THEN
      RAISE EXCEPTION 'CORRECTION_YEAR_MISMATCH: Target record belongs to year %, not %.', v_target_academic_year, p_academic_year USING ERRCODE = '55000';
    END IF;
    IF v_target_type <> 'MERIT'::"BehaviorLedgerType" THEN
      RAISE EXCEPTION 'INVALID_CORRECTION_TARGET: CORRECTION_DEBIT can only correct MERIT (target is %).', v_target_type USING ERRCODE = '55000';
    END IF;
    IF v_target_correction_for_id IS NOT NULL THEN
      RAISE EXCEPTION 'CANNOT_CORRECT_A_CORRECTION: Cannot chain corrections on record %.', p_correction_for_id USING ERRCODE = '55000';
    END IF;
    IF ABS(p_points) > v_target_points THEN
      RAISE EXCEPTION 'CORRECTION_EXCEEDS_ORIGINAL: Cannot debit % points for an original merit of % points.', ABS(p_points), v_target_points USING ERRCODE = '55000';
    END IF;
  END IF;

  -- 6. Calculate Sequence & New Conduct Balance
  v_new_balance := v_current_score + p_points;
  v_new_seq := v_record_count + 1;
  v_new_record_id := 'br_' || md5(random()::text || clock_timestamp()::text);

  -- 7. Insert BehaviorRecord
  INSERT INTO "BehaviorRecord" (
    "id", "studentId", "academicYear", "sequenceNo", "type", "category",
    "points", "balanceAfter", "businessDate", "incidentTimestamp", "location",
    "description", "correctionForId", "reportedById", "createdAt"
  ) VALUES (
    v_new_record_id, p_student_id, p_academic_year, v_new_seq, p_type, p_category,
    p_points, v_new_balance, p_business_date, p_incident_timestamp, p_location,
    p_description, p_correction_for_id, p_reported_by_id, clock_timestamp()
  );

  -- 8. Update Projection (No dead version field)
  UPDATE "StudentYearlyBehaviorProjection" SET
    "currentScore" = v_new_balance,
    "recordCount" = v_record_count + 1,
    "totalDemerit" = CASE 
      WHEN p_type = 'DEMERIT'::"BehaviorLedgerType" THEN "totalDemerit" + ABS(p_points)
      WHEN p_type = 'CORRECTION_CREDIT'::"BehaviorLedgerType" THEN GREATEST(0, "totalDemerit" - p_points)
      ELSE "totalDemerit"
    END,
    "totalMerit" = CASE 
      WHEN p_type = 'MERIT'::"BehaviorLedgerType" THEN "totalMerit" + p_points
      WHEN p_type = 'CORRECTION_DEBIT'::"BehaviorLedgerType" THEN GREATEST(0, "totalMerit" - ABS(p_points))
      ELSE "totalMerit"
    END,
    "lastCalculatedAt" = clock_timestamp()
  WHERE "id" = v_proj_id;

  -- 9. Insert Immutable Audit Log (Real Actor Verified)
  v_audit_id := 'audit_' || md5(random()::text || clock_timestamp()::text);
  INSERT INTO "StudentAffairsAuditLog" (
    "id", "entityType", "entityId", "action", "actionVersion",
    "actorId", "actorIdSnapshot", "actorRoleSnapshot", "correlationId",
    "source", "payload", "ipAddress", "createdAt"
  ) VALUES (
    v_audit_id, 'BEHAVIOR_RECORD', v_new_record_id, 'RECORD_BEHAVIOR_LEDGER', '1.0',
    v_actor_id, v_actor_id, v_actor_role,
    COALESCE(p_correlation_id, md5(random()::text)), 'STORED_PROCEDURE',
    json_build_object('type', p_type, 'points', p_points, 'balanceAfter', v_new_balance, 'seq', v_new_seq),
    p_ip_address, clock_timestamp()
  );

  -- 10. Return Result
  o_record_id := v_new_record_id;
  o_sequence_no := v_new_seq;
  o_balance_after := v_new_balance;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- ============================================================================
-- 16. PRIVILEGE BOUNDARY HARDSHELL (TYPED SIGNATURES TO ELEAVE_RUNTIME)
-- ============================================================================

-- Projection table: Revoke mutation privileges from PUBLIC and runtime
REVOKE INSERT, UPDATE, DELETE ON "StudentYearlyBehaviorProjection" FROM PUBLIC, eleave_runtime;
GRANT SELECT ON "StudentYearlyBehaviorProjection" TO eleave_runtime;

-- Context setter execution grant
REVOKE ALL ON FUNCTION set_current_app_user(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_current_app_user(TEXT) TO eleave_runtime;

-- Stored procedure execution grants with full signatures
REVOKE ALL ON FUNCTION record_student_behavior_ledger(TEXT, INT, "BehaviorLedgerType", "BehaviorCategory", INT, DATE, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_student_behavior_ledger(TEXT, INT, "BehaviorLedgerType", "BehaviorCategory", INT, DATE, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO eleave_runtime;

REVOKE ALL ON FUNCTION change_student_status(TEXT, "StudentStatus", TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION change_student_status(TEXT, "StudentStatus", TEXT) TO eleave_runtime;
```

---

## 4. Prisma Schema Specification (Rev 3.8)

### 4.1 Reverse Relations ที่ต้องเพิ่มในโมเดลเดิม

```prisma
// ==========================================
// 1. model User (prisma/schema.prisma)
// ==========================================
model User {
  // ... (ฟิลด์เดิมคงไว้ทั้งหมด) ...

  // Forensic Student Affairs Reverse Relations
  deletedStudents             Student[]                   @relation("StudentDeleter")
  studentStatusHistories      StudentStatusHistory[]
  advisedEnrollments          StudentEnrollment[]         @relation("AdvisorEnrollments")
  behaviorRecords             BehaviorRecord[]
  createdScheduledSessions    ScheduledClassSession[]     @relation("CreatedScheduledSessions")
  morningAttendancesRecorded  StudentMorningAttendance[]
  periodAttendancesRecorded   StudentPeriodAttendance[]
  verifiedMedicalCertificates StudentMedicalCertificate[] @relation("MedicalCertVerifier")
  homeVisits                  StudentHomeVisit[]
  sdqEvaluations              StudentSdqEvaluation[]
  assignedCases               StudentInterventionCase[]   @relation("CaseAssignee")
  createdCases                StudentInterventionCase[]   @relation("CaseCreator")
  interventionActivities      InterventionActivity[]
  verifiedCctManifests        CctExportManifest[]         @relation("CctManifestVerifier")
  createdCctManifests         CctExportManifest[]         @relation("CctManifestCreator")
  reviewedNominations         StudentMeritNomination[]    @relation("NominationReviewer")
}

// ==========================================
// 2. model ClassRoom (prisma/schema.prisma)
// ==========================================
model ClassRoom {
  // ... (ฟิลด์เดิมคงไว้ทั้งหมด) ...
  studentEnrollments          StudentEnrollment[]
}

// ==========================================
// 3. model SubjectOffering (prisma/schema.prisma)
// ==========================================
model SubjectOffering {
  // ... (ฟิลด์เดิมคงไว้ทั้งหมด) ...
  scheduledSessions           ScheduledClassSession[]
}

// ==========================================
// 4. model CertificateIssuedItem (prisma/schema.prisma)
// ==========================================
model CertificateIssuedItem {
  // ... (ฟิลด์เดิมคงไว้ทั้งหมด) ...
  meritNomination             StudentMeritNomination?
}
```

---

## 5. แผนการตรวจสอบระดับ Forensic (Forensic Test Plan)

| รหัสทดสอบ | โดเมนที่ทดสอบ | สิ่งที่ตรวจวัดและคาดหวัง |
| :---: | :--- | :--- |
| **Test-01** | Audit Log Immutability | คำสั่ง `UPDATE`/`DELETE` บน `StudentAffairsAuditLog` จะต้องถูกยกเลิกด้วย Error `55000` (`FORENSIC_INTEGRITY_VIOLATION`) |
| **Test-02** | Behavior Procedure Concurrency & Storage Privilege | Direct `UPDATE` บน Projection ติด `permission denied`; Concurrent Call 10 ครั้ง ผ่าน Procedure ลำดับ Sequence เรียง 1-10 ไม่ชนกัน |
| **Test-03** | Behavior Correction Bounds | ตรวจสอบการปรับลดยอดรวม `totalDemerit`/`totalMerit` ถูกต้อง; ส่งแต้มเกินติด `CORRECTION_EXCEEDS_ORIGINAL`; แก้อ้างอิงซ้ำติด Partial Unique Index |
| **Test-04** | Attendance No-Drift & Medical Cert Fraud | เช็กชื่อข้ามห้องติด `CROSS_CLASSROOM_ATTENDANCE_FORBIDDEN`; นำใบรับรองแพทย์คนอื่นมาแนบติด `MEDICAL_CERT_STUDENT_MISMATCH`; เช็กชื่อนอกช่วงวันติด `MEDICAL_CERT_DATE_OUT_OF_RANGE` |
| **Test-05** | Attendance 80% MOE Compliance | คำนวณคาบ 0 คาบคืนค่า 100.0%; นับสาย/กิจกรรมเป็นเวลาเรียน; นับลาเฉพาะกรณีมีใบรับรองแพทย์ตรวจรับรองแล้ว (`EXEMPTED_OFFICIAL`) |
| **Test-06** | EWS 1-to-Many & Single Active Case | หลายผลประเมินผูกได้ 1 เคส; พยายามเปิดเคสซ้ำซ้อนในขณะที่ยังมีเคสเดิมเปิดอยู่ติด Partial Unique Index `uk_student_single_active_case` |
| **Test-07** | Attachment Referential Integrity Trigger | ส่ง Foreign Key ข้ามตารางของ entityId ที่ไม่มีอยู่จริง ➔ ติด Trigger `ATTACHMENT_ENTITY_NOT_FOUND` |
| **Test-08** | Attachment Sealed Tombstone Trigger | ไม่อนุญาตให้แก้ metadata หรือลบไฟล์; แถวที่ tombstone แล้วจะกลายเป็น Read-Only ถาวร |
| **Test-09** | SDQ Norms Automatic Lock & Immutability | เมื่อมีการประเมินอ้างอิง Norm แล้ว แถว Norm นั้นจะถูกล็อกเป็น `isImmutable = true` และห้ามแก้ไข/ลบถาวร |
| **Test-10** | CCT Two-Phase Status Guard | ข้อมูลที่อยู่ในสถานะ `VERIFIED` ห้ามแก้ไขหรือลบ; อนุญาตให้ Retry จาก `FAILED` กลับเป็น `PENDING_UPLOAD` ได้ |
| **Test-11** | Atomic Student Status Lifecycle | ห้ามแก้ไข `Student.status` ตรงๆ; เรียกผ่าน Stored Procedure โดยผู้ดูแลระบบเท่านั้นที่จะสร้างแถวประวัติพร้อมกัน |
| **Test-12** | Nomination Full State Machine Matrix | ทดสอบ Transition Matrix ครบทุกคู่; **อนุญาตให้ `APPROVED ➔ REJECTED`** (เพิกถอนก่อนพิมพ์เกียรติบัตร); ห้าม Transition ผิดกฎอื่นๆ |
| **Test-13** | Native Calendar Date Validation Engine | ส่งวันที่ลวง เช่น `'2026-02-30'` ➔ PostgreSQL Type System ปฏิเสธทันทีด้วย `date/time field value out of range` |
| **Test-14** | Comprehensive 19 DB CHECK Constraints Battery | ทดสอบ 19 Constraints: ช่วงเทอม (1-2), คาบ (1-8), คะแนนพฤติกรรม, ผลรวม SDQ, คะแนนความเสี่ยง, รูปแบบ path |
| **Test-15** | Trusted Actor Context & Runtime Boundaries | รันคำสั่งโดยไม่ตั้ง Context ➔ ติด `CONTEXT_USER_NOT_SET`; สวมสิทธิ์ครูท่านอื่น ➔ ติด `UNAUTHORIZED_PROXY_REPORTING`; ใช้สิทธิ์ `eleave_runtime` แก้ไข Projection ตรง ➔ ติด `permission denied` |

---

### ประกาศข้อผูกพันด้านการดำเนินงาน (Execution Safeguards)
1. **ห้ามรัน Prisma Migration หรือสร้างตารางในฐานข้อมูลจริง** จนกว่าจะได้รับคำสั่ง **Proceed** หรือความเห็นชอบอย่างเป็นทางการจากผู้ใช้
2. ดำเนินการพัฒนางานทั้งหมดบน Git Branch **`dev`** โดยเด็ดขาด ห้ามแตะต้อง `main`
3. ข้อมูลในระบบต้องเป็นข้อมูลจริงและตรรกะระดับการผลิต ปราศจาก Mock Data
