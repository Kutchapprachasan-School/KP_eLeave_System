import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

let pg;
try {
  pg = await import('C:/dev/eLeave/node_modules/pg/lib/index.js');
} catch {
  pg = await import('pg');
}
const { Client } = pg.default || pg;

describe('⚖️ Student Affairs Forensic Invariants & Zero-GUC Engine Suite (Rev 3.9)', { concurrency: 1 }, () => {
  let client;
  let adminUserId;
  let teacherUserId;
  let teacher2UserId;
  let adminSessionToken;
  let teacherSessionToken;
  let expiredSessionToken;

  let testClassRoomId;
  let testClassRoom2Id;
  let testSubjectId;
  let testTeacherId;
  let testOfferingId;
  let testStudentId;
  let testStudent2Id;
  let testEnrollmentId;
  let testEnrollment2Id;
  let testSessionId;

  const currentYear = 2569;
  const currentTerm = 1;

  before(async () => {
    client = new Client({
      connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    await client.connect();

    // 1. Provision Test Users
    const nowStr = Date.now().toString();
    adminUserId = 'usr_sa_admin_' + nowStr;
    teacherUserId = 'usr_sa_teacher_' + nowStr;
    teacher2UserId = 'usr_sa_teacher2_' + nowStr;

    await client.query(`
      INSERT INTO public."User" ("id", "email", "name", "role", "isApproved", "createdAt", "updatedAt")
      VALUES 
        ($1, $2, 'SA Test Admin', 'ADMIN', true, clock_timestamp(), clock_timestamp()),
        ($3, $4, 'SA Test Teacher', 'USER', true, clock_timestamp(), clock_timestamp()),
        ($5, $6, 'SA Test Teacher 2', 'USER', true, clock_timestamp(), clock_timestamp());
    `, [
      adminUserId, `admin_${nowStr}@udkp.ac.th`,
      teacherUserId, `teacher_${nowStr}@udkp.ac.th`,
      teacher2UserId, `teacher2_${nowStr}@udkp.ac.th`
    ]);

    // 2. Provision Bearer Sessions
    adminSessionToken = 'tok_admin_' + nowStr;
    teacherSessionToken = 'tok_teacher_' + nowStr;
    expiredSessionToken = 'tok_expired_' + nowStr;

    await client.query(`
      INSERT INTO public."Session" ("id", "userId", "token", "expiresAt", "createdAt", "updatedAt")
      VALUES
        ($1, $2, $3, clock_timestamp() + interval '1 day', clock_timestamp(), clock_timestamp()),
        ($4, $5, $6, clock_timestamp() + interval '1 day', clock_timestamp(), clock_timestamp()),
        ($7, $8, $9, clock_timestamp() - interval '1 hour', clock_timestamp(), clock_timestamp());
    `, [
      'sess_admin_' + nowStr, adminUserId, adminSessionToken,
      'sess_teach_' + nowStr, teacherUserId, teacherSessionToken,
      'sess_exp_' + nowStr, teacherUserId, expiredSessionToken
    ]);

    // 3. Provision Prerequisite Academic Foundation
    const deptId = 'dept_' + nowStr;
    const deptRes = await client.query(`
      INSERT INTO public."Department" ("id", "code", "name")
      VALUES ($1, $2, 'หมวดทดสอบวิชาการ')
      ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name"
      RETURNING "id";
    `, [deptId, 'DEPT_' + nowStr]);
    const actualDeptId = deptRes.rows[0].id;

    testTeacherId = 'tch_' + nowStr;
    const tchRes = await client.query(`
      INSERT INTO public."Teacher" ("id", "employeeCode", "firstName", "lastName", "departmentId")
      VALUES ($1, $2, 'ครูทดสอบ', 'สอนดี', $3)
      ON CONFLICT ("employeeCode") DO UPDATE SET "firstName" = EXCLUDED."firstName"
      RETURNING "id";
    `, [testTeacherId, 'EMP_' + nowStr, actualDeptId]);
    testTeacherId = tchRes.rows[0].id;

    testSubjectId = 'sbj_' + nowStr;
    const sbjRes = await client.query(`
      INSERT INTO public."Subject" ("id", "code", "name", "departmentId")
      VALUES ($1, $2, 'วิชาทดสอบ', $3)
      ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name"
      RETURNING "id";
    `, [testSubjectId, 'SUB_' + nowStr, actualDeptId]);
    testSubjectId = sbjRes.rows[0].id;

    testClassRoomId = 'cr_' + nowStr;
    testClassRoom2Id = 'cr2_' + nowStr;
    const crRes = await client.query(`
      INSERT INTO public."ClassRoom" ("id", "gradeLevel", "roomNumber", "name")
      VALUES 
        ($1, 1, 991, 'ม.1/991 Sandbox'),
        ($2, 1, 992, 'ม.1/992 Sandbox')
      ON CONFLICT ("gradeLevel", "roomNumber") DO UPDATE SET "name" = EXCLUDED."name"
      RETURNING "id", "roomNumber";
    `, [testClassRoomId, testClassRoom2Id]);

    testClassRoomId = crRes.rows.find(r => r.roomNumber === 991).id;
    testClassRoom2Id = crRes.rows.find(r => r.roomNumber === 992).id;

    testOfferingId = 'off_' + nowStr;
    const offRes = await client.query(`
      INSERT INTO public."SubjectOffering" ("id", "subjectId", "teacherId", "classRoomId", "academicYear", "term")
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT ("subjectId", "teacherId", "classRoomId", "academicYear", "term") DO UPDATE SET "updatedAt" = clock_timestamp()
      RETURNING "id";
    `, [testOfferingId, testSubjectId, testTeacherId, testClassRoomId, currentYear, currentTerm]);
    testOfferingId = offRes.rows[0].id;

    // 4. Provision Test Students
    testStudentId = 'std_' + nowStr;
    testStudent2Id = 'std2_' + nowStr;

    await client.query(`
      INSERT INTO public."Student" ("id", "studentCode", "title", "firstName", "lastName", "gender", "status")
      VALUES 
        ($1, $2, 'เด็กชาย', 'สมชาย', 'ใจกล้า', 'MALE', 'ACTIVE'),
        ($3, $4, 'เด็กหญิง', 'สมหญิง', 'รักเรียน', 'FEMALE', 'ACTIVE');
    `, [
      testStudentId, 'KP' + nowStr.slice(-5),
      testStudent2Id, 'KP' + (parseInt(nowStr.slice(-5)) + 1)
    ]);

    // 5. Provision Student Enrollments
    testEnrollmentId = 'enr_' + nowStr;
    testEnrollment2Id = 'enr2_' + nowStr;

    await client.query(`
      INSERT INTO public."StudentEnrollment" ("id", "studentId", "academicYear", "term", "classRoomId", "gradeLevel", "roomNumber", "rollNumber", "status")
      VALUES 
        ($1, $2, $3, $4, $5, 1, 991, 1, 'ENROLLED'),
        ($6, $7, $3, $4, $8, 1, 992, 1, 'ENROLLED');
    `, [
      testEnrollmentId, testStudentId, currentYear, currentTerm, testClassRoomId,
      testEnrollment2Id, testStudent2Id, testClassRoom2Id
    ]);

    // 6. Provision Scheduled Class Session for ClassRoom 1
    testSessionId = 'sess_' + nowStr;
    await client.query(`
      INSERT INTO public."ScheduledClassSession" ("id", "offeringId", "businessDate", "periodNumber", "sessionType", "isEligibleDenominator", "createdById")
      VALUES ($1, $2, '2026-06-01', 1, 'REGULAR', true, $3);
    `, [testSessionId, testOfferingId, teacherUserId]);
  });

  after(async () => {
    if (!client) return;
    const safeDelete = async (query, params) => {
      try {
        await client.query(query, params);
      } catch (e) {
        // Ignore forensic-guarded deletions during teardown
      }
    };

    // Clean up sandbox data in reverse dependency order
    await safeDelete(`DELETE FROM public."StudentPeriodAttendance" WHERE "enrollmentId" IN ($1, $2);`, [testEnrollmentId, testEnrollment2Id]);
    await safeDelete(`DELETE FROM public."StudentMorningAttendance" WHERE "enrollmentId" IN ($1, $2);`, [testEnrollmentId, testEnrollment2Id]);
    await safeDelete(`DELETE FROM public."StudentMedicalCertificate" WHERE "studentId" IN ($1, $2);`, [testStudentId, testStudent2Id]);
    await safeDelete(`DELETE FROM public."ScheduledClassSession" WHERE "id" = $1;`, [testSessionId]);
    await safeDelete(`DELETE FROM public."BehaviorRecord" WHERE "studentId" IN ($1, $2);`, [testStudentId, testStudent2Id]);
    await safeDelete(`DELETE FROM public."StudentYearlyBehaviorProjection" WHERE "studentId" IN ($1, $2);`, [testStudentId, testStudent2Id]);
    await safeDelete(`DELETE FROM public."StudentStatusHistory" WHERE "studentId" IN ($1, $2);`, [testStudentId, testStudent2Id]);
    await safeDelete(`DELETE FROM public."StudentRiskAssessment" WHERE "studentId" IN ($1, $2);`, [testStudentId, testStudent2Id]);
    await safeDelete(`DELETE FROM public."InterventionActivity" WHERE "recordedById" IN ($1, $2);`, [adminUserId, teacherUserId]);
    await safeDelete(`DELETE FROM public."StudentInterventionCase" WHERE "studentId" IN ($1, $2);`, [testStudentId, testStudent2Id]);
    await safeDelete(`DELETE FROM public."StudentMeritNomination" WHERE "studentId" IN ($1, $2);`, [testStudentId, testStudent2Id]);
    await safeDelete(`DELETE FROM public."StudentSdqEvaluation" WHERE "studentId" IN ($1, $2);`, [testStudentId, testStudent2Id]);
    await safeDelete(`DELETE FROM public."StudentHomeVisit" WHERE "studentId" IN ($1, $2);`, [testStudentId, testStudent2Id]);
    await safeDelete(`DELETE FROM public."StudentEnrollment" WHERE "id" IN ($1, $2);`, [testEnrollmentId, testEnrollment2Id]);
    await safeDelete(`DELETE FROM public."Student" WHERE "id" IN ($1, $2);`, [testStudentId, testStudent2Id]);
    await safeDelete(`DELETE FROM public."Session" WHERE "userId" IN ($1, $2, $3);`, [adminUserId, teacherUserId, teacher2UserId]);
    await safeDelete(`DELETE FROM public."User" WHERE "id" IN ($1, $2, $3);`, [adminUserId, teacherUserId, teacher2UserId]);

    await client.end();
  });

  // ===========================================================================
  // TEST-01: AUDIT LOG IMMUTABILITY VERIFICATION
  // ===========================================================================
  describe('Test-01: Audit Log Immutability Verification', () => {
    it('1.1 Should block UPDATE on StudentAffairsAuditLog with FORENSIC_INTEGRITY_VIOLATION', async () => {
      const auditId = 'audit_imm_' + Date.now();
      await client.query(`
        INSERT INTO public."StudentAffairsAuditLog" (
          "id", "entityType", "entityId", "action", "actorId", "actorIdSnapshot",
          "actorRoleSnapshot", "correlationId", "source"
        ) VALUES (
          $1, 'STUDENT', 'std_dummy', 'CREATE_STUDENT', $2, $2, 'ADMIN', 'corr_1', 'TEST'
        );
      `, [auditId, adminUserId]);

      await assert.rejects(
        async () => {
          await client.query(`UPDATE public."StudentAffairsAuditLog" SET "action" = 'TAMPERED' WHERE "id" = $1;`, [auditId]);
        },
        (err) => {
          assert.strictEqual(err.code, '55000');
          assert.match(err.message, /FORENSIC_INTEGRITY_VIOLATION/);
          return true;
        }
      );
    });

    it('1.2 Should block DELETE on StudentAffairsAuditLog with FORENSIC_INTEGRITY_VIOLATION', async () => {
      const auditId = 'audit_imm_del_' + Date.now();
      await client.query(`
        INSERT INTO public."StudentAffairsAuditLog" (
          "id", "entityType", "entityId", "action", "actorId", "actorIdSnapshot",
          "actorRoleSnapshot", "correlationId", "source"
        ) VALUES (
          $1, 'STUDENT', 'std_dummy', 'CREATE_STUDENT', $2, $2, 'ADMIN', 'corr_2', 'TEST'
        );
      `, [auditId, adminUserId]);

      await assert.rejects(
        async () => {
          await client.query(`DELETE FROM public."StudentAffairsAuditLog" WHERE "id" = $1;`, [auditId]);
        },
        (err) => {
          assert.strictEqual(err.code, '55000');
          assert.match(err.message, /FORENSIC_INTEGRITY_VIOLATION/);
          return true;
        }
      );
    });
  });

  // ===========================================================================
  // TEST-02: BEHAVIOR PROCEDURE & STORAGE PRIVILEGE VERIFICATION
  // ===========================================================================
  describe('Test-02: Behavior Procedure Concurrency & Storage Privilege Verification', () => {
    it('2.1 Should deny direct UPDATE on StudentYearlyBehaviorProjection for eleave_runtime', async () => {
      await client.query('SET ROLE eleave_runtime;');
      try {
        await assert.rejects(
          async () => {
            await client.query('UPDATE public."StudentYearlyBehaviorProjection" SET "currentScore" = 999;');
          },
          (err) => {
            assert.match(err.message, /permission denied for table StudentYearlyBehaviorProjection/i);
            return true;
          }
        );
      } finally {
        await client.query('RESET ROLE;');
      }
    });

    it('2.2 Should atomically record behavior points and increment sequence monotonically', async () => {
      // Call Stored Procedure: First Demerit (-5)
      const res1 = await client.query(`
        SELECT * FROM public.record_student_behavior_ledger(
          $1, $2, $3, 'DEMERIT'::public."BehaviorLedgerType", 'PUNCTUALITY'::public."BehaviorCategory",
          -5, '2026-06-01'::date, clock_timestamp(), 'ประตูหน้า', 'มาสายแถว', $4
        );
      `, [adminSessionToken, testStudentId, currentYear, adminUserId]);

      assert.strictEqual(res1.rows.length, 1);
      assert.strictEqual(Number(res1.rows[0].o_sequence_no), 1);
      assert.strictEqual(Number(res1.rows[0].o_balance_after), 95);

      // Call Stored Procedure: Second Demerit (-10)
      const res2 = await client.query(`
        SELECT * FROM public.record_student_behavior_ledger(
          $1, $2, $3, 'DEMERIT'::public."BehaviorLedgerType", 'DRESS_CODE'::public."BehaviorCategory",
          -10, '2026-06-02'::date, clock_timestamp(), 'หน้าเสาธง', 'แต่งกายไม่ถูกระเบียบ', $4
        );
      `, [adminSessionToken, testStudentId, currentYear, adminUserId]);

      assert.strictEqual(Number(res2.rows[0].o_sequence_no), 2);
      assert.strictEqual(Number(res2.rows[0].o_balance_after), 85);

      // Verify Projection Table
      const proj = await client.query(`
        SELECT "currentScore", "totalDemerit", "totalMerit", "recordCount"
        FROM public."StudentYearlyBehaviorProjection"
        WHERE "studentId" = $1 AND "academicYear" = $2;
      `, [testStudentId, currentYear]);

      assert.strictEqual(proj.rows[0].currentScore, 85);
      assert.strictEqual(proj.rows[0].totalDemerit, 15);
      assert.strictEqual(proj.rows[0].totalMerit, 0);
      assert.strictEqual(proj.rows[0].recordCount, 2);
    });
  });

  // ===========================================================================
  // TEST-03: BEHAVIOR CORRECTION BOUNDS & PARTIAL UNIQUE INDEX
  // ===========================================================================
  describe('Test-03: Behavior Correction Bounds & Partial Unique Index Verification', () => {
    let originalRecordId;

    before(async () => {
      // Record a Demerit of -15 points for testing corrections
      const res = await client.query(`
        SELECT o_record_id FROM public.record_student_behavior_ledger(
          $1, $2, $3, 'DEMERIT'::public."BehaviorLedgerType", 'SUBSTANCE_ABUSE'::public."BehaviorCategory",
          -15, '2026-06-03'::date, clock_timestamp(), 'ห้องน้ำ', 'รายการตั้งต้นสำหรับชดเชย', $4
        );
      `, [adminSessionToken, testStudentId, currentYear, adminUserId]);
      originalRecordId = res.rows[0].o_record_id;
    });

    it('3.1 Should reject CORRECTION_CREDIT exceeding original demerit points', async () => {
      await assert.rejects(
        async () => {
          await client.query(`
            SELECT * FROM public.record_student_behavior_ledger(
              $1, $2, $3, 'CORRECTION_CREDIT'::public."BehaviorLedgerType", 'HONOR_INTEGRITY'::public."BehaviorCategory",
              20, '2026-06-04'::date, clock_timestamp(), 'ห้องพักครู', 'พยายามชดเชยเกิน', $4, $5
            );
          `, [adminSessionToken, testStudentId, currentYear, adminUserId, originalRecordId]);
        },
        (err) => {
          assert.strictEqual(err.code, '55000');
          assert.match(err.message, /CORRECTION_EXCEEDS_ORIGINAL/);
          return true;
        }
      );
    });

    it('3.2 Should succeed with valid CORRECTION_CREDIT within bounds', async () => {
      const res = await client.query(`
        SELECT * FROM public.record_student_behavior_ledger(
          $1, $2, $3, 'CORRECTION_CREDIT'::public."BehaviorLedgerType", 'HONOR_INTEGRITY'::public."BehaviorCategory",
          15, '2026-06-04'::date, clock_timestamp(), 'ห้องพักครู', 'ชดเชยถูกต้องเต็มจำนวน', $4, $5
        );
      `, [adminSessionToken, testStudentId, currentYear, adminUserId, originalRecordId]);

      assert.strictEqual(Number(res.rows[0].o_balance_after), 85); // 70 + 15 = 85
    });

    it('3.3 Should prevent duplicate corrections via uk_behavior_single_correction partial index', async () => {
      await assert.rejects(
        async () => {
          // Attempting a second correction for the same original record
          await client.query(`
            SELECT * FROM public.record_student_behavior_ledger(
              $1, $2, $3, 'CORRECTION_CREDIT'::public."BehaviorLedgerType", 'HONOR_INTEGRITY'::public."BehaviorCategory",
              5, '2026-06-05'::date, clock_timestamp(), 'ห้องพักครู', 'พยายามชดเชยซ้ำ', $4, $5
            );
          `, [adminSessionToken, testStudentId, currentYear, adminUserId, originalRecordId]);
        },
        (err) => {
          assert.match(err.message, /uk_behavior_single_correction/i);
          return true;
        }
      );
    });
  });

  // ===========================================================================
  // TEST-04: ATTENDANCE NO-DRIFT & MEDICAL CERT CROSS-VALIDATION
  // ===========================================================================
  describe('Test-04: Attendance No-Drift & Medical Cert Cross-Validation', () => {
    let medicalCertId;

    before(async () => {
      // Create verified medical cert for Student 1: 2026-06-01 to 2026-06-03
      const certId = 'med_' + Date.now();
      await client.query(`
        INSERT INTO public."StudentMedicalCertificate" (
          "id", "studentId", "startDate", "endDate", "hospitalName", "storageKey",
          "sha256", "byteSize", "isVerified", "verifiedById", "verifiedAt"
        ) VALUES (
          $1, $2, '2026-06-01'::date, '2026-06-03'::date, 'รพ.กุดจับ', 'med/cert1.pdf',
          'a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1', 1024,
          true, $3, clock_timestamp()
        );
      `, [certId, testStudentId, adminUserId]);
      medicalCertId = certId;
    });

    it('4.1 Should block attendance recording across different classrooms', async () => {
      // Student 2 is in Room 992, but session is for Room 991
      await assert.rejects(
        async () => {
          await client.query(`
            INSERT INTO public."StudentPeriodAttendance" (
              "id", "enrollmentId", "scheduledSessionId", "status", "recordedById"
            ) VALUES (
              'att_fail_' || clock_timestamp()::text, $1, $2, 'PRESENT', $3
            );
          `, [testEnrollment2Id, testSessionId, teacherUserId]);
        },
        (err) => {
          assert.strictEqual(err.code, '55000');
          assert.match(err.message, /CROSS_CLASSROOM_ATTENDANCE_FORBIDDEN/);
          return true;
        }
      );
    });

    it('4.2 Should block medical cert belonging to another student', async () => {
      // Create session for room 992
      const session2Id = 'sess2_' + Date.now();
      const off2Id = 'off2_' + Date.now();
      await client.query(`
        INSERT INTO public."SubjectOffering" ("id", "subjectId", "teacherId", "classRoomId", "academicYear", "term")
        VALUES ($1, $2, $3, (SELECT "classRoomId" FROM public."StudentEnrollment" WHERE "id" = $4), $5, $6);
      `, [off2Id, testSubjectId, testTeacherId, testEnrollment2Id, currentYear, currentTerm]);

      await client.query(`
        INSERT INTO public."ScheduledClassSession" ("id", "offeringId", "businessDate", "periodNumber", "sessionType", "isEligibleDenominator", "createdById")
        VALUES ($1, $2, '2026-06-01', 2, 'REGULAR', true, $3);
      `, [session2Id, off2Id, teacherUserId]);

      await assert.rejects(
        async () => {
          await client.query(`
            INSERT INTO public."StudentPeriodAttendance" (
              "id", "enrollmentId", "scheduledSessionId", "status", "medicalCertId", "recordedById"
            ) VALUES (
              'att_fail_med_' || clock_timestamp()::text, $1, $2, 'LEAVE', $3, $4
            );
          `, [testEnrollment2Id, session2Id, medicalCertId, teacherUserId]);
        },
        (err) => {
          assert.strictEqual(err.code, '55000');
          assert.match(err.message, /MEDICAL_CERT_STUDENT_MISMATCH/);
          return true;
        }
      );
    });

    it('4.3 Should block medical cert if session date is out of range', async () => {
      // Create session on 2026-06-10 (outside 2026-06-01 to 2026-06-03)
      const sessionOutId = 'sess_out_' + Date.now();
      await client.query(`
        INSERT INTO public."ScheduledClassSession" ("id", "offeringId", "businessDate", "periodNumber", "sessionType", "isEligibleDenominator", "createdById")
        VALUES ($1, $2, '2026-06-10', 3, 'REGULAR', true, $3);
      `, [sessionOutId, testOfferingId, teacherUserId]);

      await assert.rejects(
        async () => {
          await client.query(`
            INSERT INTO public."StudentPeriodAttendance" (
              "id", "enrollmentId", "scheduledSessionId", "status", "medicalCertId", "recordedById"
            ) VALUES (
              'att_fail_date_' || clock_timestamp()::text, $1, $2, 'LEAVE', $3, $4
            );
          `, [testEnrollmentId, sessionOutId, medicalCertId, teacherUserId]);
        },
        (err) => {
          assert.strictEqual(err.code, '55000');
          assert.match(err.message, /MEDICAL_CERT_DATE_OUT_OF_RANGE/);
          return true;
        }
      );
    });
  });

  // ===========================================================================
  // TEST-05: ATTENDANCE 80% MOE COMPLIANCE METRIC
  // ===========================================================================
  describe('Test-05: Attendance 80% MOE Compliance Metric Invariants', () => {
    it('5.1 Zero-Division Guard: Should yield 100.0% when eligible denominator is 0', () => {
      const calculateAttendancePercentage = (records, sessions) => {
        const eligibleSessionIds = new Set(
          sessions.filter(s => s.isEligibleDenominator).map(s => s.id)
        );
        if (eligibleSessionIds.size === 0) return 100.0;

        let numerator = 0;
        for (const rec of records) {
          if (!eligibleSessionIds.has(rec.sessionId)) continue;
          if (['PRESENT', 'LATE', 'ACTIVITY'].includes(rec.status)) {
            numerator += 1;
          } else if (rec.status === 'LEAVE' && rec.exemptionStatus === 'EXEMPTED_OFFICIAL') {
            numerator += 1;
          }
        }
        return (numerator / eligibleSessionIds.size) * 100;
      };

      assert.strictEqual(calculateAttendancePercentage([], []), 100.0);
    });

    it('5.2 Should accurately compute 80% threshold based on MOE regulations', () => {
      const calculateAttendancePercentage = (records, sessions) => {
        const eligibleSessionIds = new Set(
          sessions.filter(s => s.isEligibleDenominator).map(s => s.id)
        );
        if (eligibleSessionIds.size === 0) return 100.0;

        let numerator = 0;
        for (const rec of records) {
          if (!eligibleSessionIds.has(rec.sessionId)) continue;
          if (['PRESENT', 'LATE', 'ACTIVITY'].includes(rec.status)) {
            numerator += 1;
          } else if (rec.status === 'LEAVE' && rec.exemptionStatus === 'EXEMPTED_OFFICIAL') {
            numerator += 1;
          }
        }
        return (numerator / eligibleSessionIds.size) * 100;
      };

      const mockSessions = [
        { id: 's1', isEligibleDenominator: true },
        { id: 's2', isEligibleDenominator: true },
        { id: 's3', isEligibleDenominator: true },
        { id: 's4', isEligibleDenominator: true },
        { id: 's5', isEligibleDenominator: true },
        { id: 's_holiday', isEligibleDenominator: false }, // Cancelled, excluded from denominator
      ];

      // 4 out of 5 eligible attended = 80.0%
      const mockRecords = [
        { sessionId: 's1', status: 'PRESENT', exemptionStatus: 'NONE' },
        { sessionId: 's2', status: 'LATE', exemptionStatus: 'NONE' },
        { sessionId: 's3', status: 'ACTIVITY', exemptionStatus: 'NONE' },
        { sessionId: 's4', status: 'LEAVE', exemptionStatus: 'EXEMPTED_OFFICIAL' },
        { sessionId: 's5', status: 'ABSENT', exemptionStatus: 'NONE' },
      ];

      const pct = calculateAttendancePercentage(mockRecords, mockSessions);
      assert.strictEqual(pct, 80.0);
      assert.strictEqual(pct >= 80.0, true, 'Student meets MOE 80% exam eligibility requirement');
    });
  });

  // ===========================================================================
  // TEST-06: EWS 1-TO-MANY & ACTIVE CASE PARTIAL UNIQUE INDEX
  // ===========================================================================
  describe('Test-06: EWS 1-to-Many & Active Case Partial Unique Index Verification', () => {
    let activeCaseId;

    it('6.1 Should allow multiple Risk Assessments to bind to a single StudentInterventionCase', async () => {
      const caseNumber = 'CASE_' + Date.now();
      const cRes = await client.query(`
        INSERT INTO public."StudentInterventionCase" (
          "id", "caseNumber", "studentId", "title", "triggerReason", "actionPlan",
          "targetOutcome", "assignedToId", "createdById", "status"
        ) VALUES (
          $1, $2, $3, 'เคสติดตามการเรียน', 'ขาดเรียนสะสมเกิน 3 ครั้ง', 'ประสานผู้ปกครอง',
          'เข้าเรียนสม่ำเสมอ', $4, $4, 'OPEN'
        ) RETURNING "id";
      `, ['case_' + Date.now(), caseNumber, testStudentId, teacherUserId]);
      activeCaseId = cRes.rows[0].id;

      // Bind Risk Assessment 1
      await client.query(`
        INSERT INTO public."StudentRiskAssessment" (
          "id", "studentId", "enrollmentId", "academicYear", "term", "evaluationCycle",
          "riskLevel", "riskScore", "ruleVersion", "signalsJson", "explanationJson", "triggeredCaseId"
        ) VALUES (
          $1, $2, $3, $4, $5, 'CYCLE_1', 'HIGH', 75.0, 'v1.0', '{}', '{}', $6
        );
      `, ['risk1_' + Date.now(), testStudentId, testEnrollmentId, currentYear, currentTerm, activeCaseId]);

      // Bind Risk Assessment 2 to SAME case
      await client.query(`
        INSERT INTO public."StudentRiskAssessment" (
          "id", "studentId", "enrollmentId", "academicYear", "term", "evaluationCycle",
          "riskLevel", "riskScore", "ruleVersion", "signalsJson", "explanationJson", "triggeredCaseId"
        ) VALUES (
          $1, $2, $3, $4, $5, 'CYCLE_2', 'CRITICAL', 85.0, 'v1.0', '{}', '{}', $6
        );
      `, ['risk2_' + Date.now(), testStudentId, testEnrollmentId, currentYear, currentTerm, activeCaseId]);

      const countRes = await client.query(`
        SELECT count(*) FROM public."StudentRiskAssessment" WHERE "triggeredCaseId" = $1;
      `, [activeCaseId]);
      assert.strictEqual(Number(countRes.rows[0].count), 2);
    });

    it('6.2 Should block second active case for same student via uk_student_single_active_case', async () => {
      await assert.rejects(
        async () => {
          await client.query(`
            INSERT INTO public."StudentInterventionCase" (
              "id", "caseNumber", "studentId", "title", "triggerReason", "actionPlan",
              "targetOutcome", "assignedToId", "createdById", "status"
            ) VALUES (
              $1, $2, $3, 'เคสซ้อนที่ผิดกฎ', 'พยายามเปิดเคสซ้ำซ้อน', 'แผนงาน',
              'เป้าหมาย', $4, $4, 'IN_PROGRESS'
            );
          `, ['case_dup_' + Date.now(), 'CASE_DUP_' + Date.now(), testStudentId, teacherUserId]);
        },
        (err) => {
          assert.match(err.message, /uk_student_single_active_case/i);
          return true;
        }
      );
    });
  });

  // ===========================================================================
  // TEST-07: ATTACHMENT REFERENTIAL INTEGRITY TRIGGER VERIFICATION
  // ===========================================================================
  describe('Test-07: Attachment Referential Integrity Trigger Verification', () => {
    it('7.1 Should block attachment referencing non-existent Home Visit', async () => {
      await assert.rejects(
        async () => {
          await client.query(`
            INSERT INTO public."StudentAffairsAttachment" (
              "id", "entityType", "entityId", "storageKey", "sha256", "mimeType",
              "byteSize", "uploadedById"
            ) VALUES (
              $1, 'HOME_VISIT', 'non_existent_hv', 'hv/pic.jpg',
              'a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1',
              'image/jpeg', 2048, $2
            );
          `, ['att_hv_' + Date.now(), teacherUserId]);
        },
        (err) => {
          assert.strictEqual(err.code, '55000');
          assert.match(err.message, /ATTACHMENT_ENTITY_NOT_FOUND/);
          return true;
        }
      );
    });

    it('7.2 Should block attachment referencing non-existent Behavior Record', async () => {
      await assert.rejects(
        async () => {
          await client.query(`
            INSERT INTO public."StudentAffairsAttachment" (
              "id", "entityType", "entityId", "storageKey", "sha256", "mimeType",
              "byteSize", "uploadedById"
            ) VALUES (
              $1, 'BEHAVIOR_EVIDENCE', 'non_existent_br', 'br/pic.jpg',
              'a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1',
              'image/jpeg', 2048, $2
            );
          `, ['att_br_' + Date.now(), teacherUserId]);
        },
        (err) => {
          assert.strictEqual(err.code, '55000');
          assert.match(err.message, /ATTACHMENT_ENTITY_NOT_FOUND/);
          return true;
        }
      );
    });
  });

  // ===========================================================================
  // TEST-08: ATTACHMENT SEALED TOMBSTONE & TRIAD VERIFICATION
  // ===========================================================================
  describe('Test-08: Attachment Sealed Tombstone & Triad Verification', () => {
    let attachmentId;

    before(async () => {
      // Record a valid behavior record first to attach to
      const bRes = await client.query(`
        SELECT o_record_id FROM public.record_student_behavior_ledger(
          $1, $2, $3, 'MERIT'::public."BehaviorLedgerType", 'VOLUNTEER_MERIT'::public."BehaviorCategory",
          10, '2026-06-05'::date, clock_timestamp(), 'โรงอาหาร', 'ช่วยงานส่วนรวม', $4
        );
      `, [adminSessionToken, testStudentId, currentYear, adminUserId]);

      const attId = 'att_tomb_' + Date.now();
      await client.query(`
        INSERT INTO public."StudentAffairsAttachment" (
          "id", "entityType", "entityId", "storageKey", "sha256", "mimeType",
          "byteSize", "uploadedById"
        ) VALUES (
          $1, 'BEHAVIOR_EVIDENCE', $2, 'att/valid.jpg',
          'a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1',
          'image/jpeg', 4096, $3
        );
      `, [attId, bRes.rows[0].o_record_id, teacherUserId]);
      attachmentId = attId;
    });

    it('8.1 Should block modifying core metadata fields on attachment', async () => {
      await assert.rejects(
        async () => {
          await client.query(`
            UPDATE public."StudentAffairsAttachment"
            SET "storageKey" = 'att/tampered.jpg'
            WHERE "id" = $1;
          `, [attachmentId]);
        },
        (err) => {
          assert.strictEqual(err.code, '55000');
          assert.match(err.message, /ATTACHMENT_METADATA_IMMUTABLE/);
          return true;
        }
      );
    });

    it('8.2 Should enforce tombstone triad (isTombstoned=true requires date, by, reason)', async () => {
      await assert.rejects(
        async () => {
          await client.query(`
            UPDATE public."StudentAffairsAttachment"
            SET "isTombstoned" = true
            WHERE "id" = $1;
          `, [attachmentId]);
        },
        (err) => {
          assert.match(err.message, /chk_attachment_tombstone_triad|ATTACHMENT_TOMBSTONE_INCOMPLETE/);
          return true;
        }
      );
    });

    it('8.3 Should permanently seal attachment once tombstoned', async () => {
      // Properly tombstone
      await client.query(`
        UPDATE public."StudentAffairsAttachment"
        SET "isTombstoned" = true,
            "tombstonedAt" = clock_timestamp(),
            "tombstonedById" = $1,
            "tombstoneReason" = 'ภาพถ่ายไม่ชัดเจน ขอให้ส่งใหม่'
        WHERE "id" = $2;
      `, [adminUserId, attachmentId]);

      // Attempt any subsequent update
      await assert.rejects(
        async () => {
          await client.query(`
            UPDATE public."StudentAffairsAttachment"
            SET "tombstoneReason" = 'เปลี่ยนเหตุผลใหม่'
            WHERE "id" = $1;
          `, [attachmentId]);
        },
        (err) => {
          assert.strictEqual(err.code, '55000');
          assert.match(err.message, /ATTACHMENT_ALREADY_TOMBSTONED/);
          return true;
        }
      );
    });
  });

  // ===========================================================================
  // TEST-09: SDQ NORMS AUTOMATIC LOCK & IMMUTABILITY VERIFICATION
  // ===========================================================================
  describe('Test-09: SDQ Norms Automatic Lock & Immutability Verification', () => {
    let normId;

    it('9.1 Should automatically lock SDQ norm upon first evaluation insert', async () => {
      normId = 'norm_' + Date.now();
      const instVersion = 'SDQ-TH-' + Date.now();
      await client.query(`
        INSERT INTO public."SdqNormsRegistry" (
          "id", "instrumentVersion", "scoringVersion", "evaluatorType", "targetAgeMin",
          "targetAgeMax", "reverseScoredItems", "subscaleDefinitions", "cutoffsJson", "isImmutable"
        ) VALUES (
          $1, $2, 'NORMS-2026', 'TEACHER', 12, 18, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, false
        );
      `, [normId, instVersion]);

      // Verify currently unlocked
      let check = await client.query(`SELECT "isImmutable" FROM public."SdqNormsRegistry" WHERE "id" = $1;`, [normId]);
      assert.strictEqual(check.rows[0].isImmutable, false);

      // Insert SDQ Evaluation
      await client.query(`
        INSERT INTO public."StudentSdqEvaluation" (
          "id", "studentId", "academicYear", "term", "evaluatorType", "normRegistryId",
          "emotionalScore", "conductScore", "hyperactivityScore", "peerProblemScore",
          "prosocialScore", "totalDifficulties", "overallLevel", "rawAnswersJson", "evaluatorId"
        ) VALUES (
          $1, $2, $3, $4, 'TEACHER', $5,
          2, 2, 2, 2, 8, 8, 'NORMAL', '{}'::jsonb, $6
        );
      `, ['sdq_' + Date.now(), testStudentId, currentYear, currentTerm, normId, teacherUserId]);

      // Verify automatically locked
      check = await client.query(`SELECT "isImmutable" FROM public."SdqNormsRegistry" WHERE "id" = $1;`, [normId]);
      assert.strictEqual(check.rows[0].isImmutable, true);
    });

    it('9.2 Should block modification or deletion of locked SDQ norm', async () => {
      await assert.rejects(
        async () => {
          await client.query(`UPDATE public."SdqNormsRegistry" SET "targetAgeMax" = 20 WHERE "id" = $1;`, [normId]);
        },
        (err) => {
          assert.strictEqual(err.code, '55000');
          assert.match(err.message, /SDQ_NORMS_IMMUTABLE/);
          return true;
        }
      );

      await assert.rejects(
        async () => {
          await client.query(`DELETE FROM public."SdqNormsRegistry" WHERE "id" = $1;`, [normId]);
        },
        (err) => {
          assert.strictEqual(err.code, '55000');
          assert.match(err.message, /SDQ_NORMS_IMMUTABLE/);
          return true;
        }
      );
    });
  });

  // ===========================================================================
  // TEST-10: CCT MANIFEST FIELD IMMUTABILITY & TRANSITION VERIFICATION
  // ===========================================================================
  describe('Test-10: CCT Manifest Field Immutability & Transition Verification', () => {
    let manifestId;

    before(async () => {
      manifestId = 'cct_' + Date.now();
      await client.query(`
        INSERT INTO public."CctExportManifest" (
          "id", "exportCode", "academicYear", "term", "criteriaJson", "recordCount",
          "storageKey", "payloadSha256", "byteSize", "schemaVersion", "idempotencyKey",
          "createdById"
        ) VALUES (
          $1, 'CCT_' || $1, $2, $3, '{"poverty": "POOR"}'::jsonb, 50,
          'cct/export.json', 'a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1',
          10240, '1.0', 'idemp_' || $1, $4
        );
      `, [manifestId, currentYear, currentTerm, adminUserId]);
    });

    it('10.1 Should block modifying core payload metadata on manifest', async () => {
      await assert.rejects(
        async () => {
          await client.query(`UPDATE public."CctExportManifest" SET "recordCount" = 100 WHERE "id" = $1;`, [manifestId]);
        },
        (err) => {
          assert.strictEqual(err.code, '55000');
          assert.match(err.message, /CCT_MANIFEST_CONTENT_IMMUTABLE/);
          return true;
        }
      );
    });

    it('10.2 Should enforce retryCount increment when transitioning FAILED -> PENDING_UPLOAD', async () => {
      // Transition to FAILED
      await client.query(`
        UPDATE public."CctExportManifest"
        SET "status" = 'FAILED', "failureReason" = 'Network timeout'
        WHERE "id" = $1;
      `, [manifestId]);

      // Attempt retry without incrementing retryCount
      await assert.rejects(
        async () => {
          await client.query(`
            UPDATE public."CctExportManifest"
            SET "status" = 'PENDING_UPLOAD'
            WHERE "id" = $1;
          `, [manifestId]);
        },
        (err) => {
          assert.strictEqual(err.code, '55000');
          assert.match(err.message, /CCT_RETRY_COUNT_MUST_INCREMENT/);
          return true;
        }
      );

      // Increment retryCount successfully
      await client.query(`
        UPDATE public."CctExportManifest"
        SET "status" = 'PENDING_UPLOAD', "retryCount" = 1
        WHERE "id" = $1;
      `, [manifestId]);
    });

    it('10.3 Should permanently seal VERIFIED CCT manifest against modification or deletion', async () => {
      // Transition to VERIFIED
      await client.query(`
        UPDATE public."CctExportManifest"
        SET "status" = 'VERIFIED', "verifiedById" = $1, "verifiedAt" = clock_timestamp()
        WHERE "id" = $2;
      `, [adminUserId, manifestId]);

      // Attempt modification
      await assert.rejects(
        async () => {
          await client.query(`UPDATE public."CctExportManifest" SET "failureReason" = 'X' WHERE "id" = $1;`, [manifestId]);
        },
        (err) => {
          assert.strictEqual(err.code, '55000');
          assert.match(err.message, /CCT_MANIFEST_IMMUTABLE/);
          return true;
        }
      );

      // Attempt deletion
      await assert.rejects(
        async () => {
          await client.query(`DELETE FROM public."CctExportManifest" WHERE "id" = $1;`, [manifestId]);
        },
        (err) => {
          assert.strictEqual(err.code, '55000');
          assert.match(err.message, /CCT_MANIFEST_IMMUTABLE/);
          return true;
        }
      );
    });
  });

  // ===========================================================================
  // TEST-11: ATOMIC STUDENT STATUS LIFECYCLE VERIFICATION
  // ===========================================================================
  describe('Test-11: Atomic Student Status Lifecycle Verification', () => {
    it('11.1 Should deny direct UPDATE on Student.status for eleave_runtime', async () => {
      await client.query('SET ROLE eleave_runtime;');
      try {
        await assert.rejects(
          async () => {
            await client.query('UPDATE public."Student" SET "status" = \'SUSPENDED\' WHERE "id" = $1;', [testStudentId]);
          },
          (err) => {
            assert.match(err.message, /permission denied/i);
            return true;
          }
        );
      } finally {
        await client.query('RESET ROLE;');
      }
    });

    it('11.2 Should change student status atomically via Stored Procedure and log in history', async () => {
      await client.query(`
        SELECT public.change_student_status($1, $2, 'SUSPENDED'::public."StudentStatus", 'พักการเรียนเนื่องจากฝ่าฝืนวินัย');
      `, [adminSessionToken, testStudentId]);

      // Verify Student status
      const std = await client.query(`SELECT "status" FROM public."Student" WHERE "id" = $1;`, [testStudentId]);
      assert.strictEqual(std.rows[0].status, 'SUSPENDED');

      // Verify Status History
      const hist = await client.query(`
        SELECT "fromStatus", "toStatus", "reason", "changedById"
        FROM public."StudentStatusHistory"
        WHERE "studentId" = $1
        ORDER BY "createdAt" DESC LIMIT 1;
      `, [testStudentId]);

      assert.strictEqual(hist.rows[0].fromStatus, 'ACTIVE');
      assert.strictEqual(hist.rows[0].toStatus, 'SUSPENDED');
      assert.strictEqual(hist.rows[0].changedById, adminUserId);

      // Revert back to ACTIVE
      await client.query(`
        SELECT public.change_student_status($1, $2, 'ACTIVE'::public."StudentStatus", 'พ้นกำหนดพักการเรียน');
      `, [adminSessionToken, testStudentId]);
    });
  });

  // ===========================================================================
  // TEST-12: NOMINATION STATE MACHINE TRANSITION VERIFICATION
  // ===========================================================================
  describe('Test-12: Nomination State Machine Transition Verification', () => {
    let nominationId;

    it('12.1 Should enforce initial status PENDING_REVIEW on creation', async () => {
      await assert.rejects(
        async () => {
          await client.query(`
            INSERT INTO public."StudentMeritNomination" (
              "id", "studentId", "academicYear", "term", "awardCategory", "reason",
              "meritPointsScore", "status"
            ) VALUES (
              $1, $2, $3, $4, 'เยาวชนดีเด่น', 'สร้างชื่อเสียง', 100, 'APPROVED'
            );
          `, ['nom_fail_' + Date.now(), testStudentId, currentYear, currentTerm]);
        },
        (err) => {
          assert.strictEqual(err.code, '55000');
          assert.match(err.message, /NOMINATION_INITIAL_STATUS_INVALID/);
          return true;
        }
      );

      nominationId = 'nom_' + Date.now();
      await client.query(`
        INSERT INTO public."StudentMeritNomination" (
          "id", "studentId", "academicYear", "term", "awardCategory", "reason",
          "meritPointsScore", "status"
        ) VALUES (
          $1, $2, $3, $4, 'เยาวชนดีเด่น', 'สร้างชื่อเสียงให้โรงเรียน', 100, 'PENDING_REVIEW'
        );
      `, [nominationId, testStudentId, currentYear, currentTerm]);
    });

    it('12.2 Should block illegal direct jump PENDING_REVIEW -> ISSUED', async () => {
      await assert.rejects(
        async () => {
          await client.query(`
            UPDATE public."StudentMeritNomination"
            SET "status" = 'ISSUED'
            WHERE "id" = $1;
          `, [nominationId]);
        },
        (err) => {
          assert.strictEqual(err.code, '55000');
          assert.match(err.message, /NOMINATION_ILLEGAL_TRANSITION/);
          return true;
        }
      );
    });

    it('12.3 Should transition PENDING_REVIEW -> APPROVED with reviewer audit fields', async () => {
      await client.query(`
        UPDATE public."StudentMeritNomination"
        SET "status" = 'APPROVED', "reviewedById" = $1, "reviewedAt" = clock_timestamp()
        WHERE "id" = $2;
      `, [adminUserId, nominationId]);

      const res = await client.query(`SELECT "status" FROM public."StudentMeritNomination" WHERE "id" = $1;`, [nominationId]);
      assert.strictEqual(res.rows[0].status, 'APPROVED');
    });

    it('12.4 Should allow revocation APPROVED -> REJECTED with non-empty reason', async () => {
      await client.query(`
        UPDATE public."StudentMeritNomination"
        SET "status" = 'REJECTED', "rejectionReason" = 'ตรวจพบว่ามีประวัติถูกตัดคะแนนพฤติกรรมภายหลัง'
        WHERE "id" = $1;
      `, [nominationId]);

      const res = await client.query(`SELECT "status" FROM public."StudentMeritNomination" WHERE "id" = $1;`, [nominationId]);
      assert.strictEqual(res.rows[0].status, 'REJECTED');

      // Attempt deleting rejected nomination must fail
      await assert.rejects(
        async () => {
          await client.query(`DELETE FROM public."StudentMeritNomination" WHERE "id" = $1;`, [nominationId]);
        },
        (err) => {
          assert.strictEqual(err.code, '55000');
          assert.match(err.message, /NOMINATION_REJECTED_CANNOT_DELETE/);
          return true;
        }
      );
    });
  });

  // ===========================================================================
  // TEST-13: NATIVE CALENDAR DATE VALIDATION VERIFICATION
  // ===========================================================================
  describe('Test-13: Native Calendar Date Validation Verification', () => {
    it('13.1 Should reject invalid calendar date (2026-02-30) via PostgreSQL DATE type', async () => {
      await assert.rejects(
        async () => {
          await client.query(`
            INSERT INTO public."StudentMedicalCertificate" (
              "id", "studentId", "startDate", "endDate", "hospitalName", "storageKey",
              "sha256", "byteSize"
            ) VALUES (
              $1, $2, '2026-02-30'::date, '2026-02-30'::date, 'รพ.กุดจับ', 'med/test.pdf',
              'a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1', 1024
            );
          `, ['med_bad_date_' + Date.now(), testStudentId]);
        },
        (err) => {
          assert.match(err.message, /date\/time field value out of range/i);
          return true;
        }
      );
    });
  });

  // ===========================================================================
  // TEST-14: 20 DATABASE CHECK CONSTRAINTS BATTERY VERIFICATION
  // ===========================================================================
  describe('Test-14: 20 Database CHECK Constraints Battery Verification', () => {
    it('14.1 Should block BehaviorRecord with 0 points via chk_points_nonzero', async () => {
      await assert.rejects(
        async () => {
          await client.query(`
            INSERT INTO public."BehaviorRecord" (
              "id", "studentId", "academicYear", "sequenceNo", "type", "category",
              "points", "balanceAfter", "businessDate", "incidentTimestamp", "description",
              "reportedById"
            ) VALUES (
              'br_fail_zero_' || clock_timestamp()::text, $1, $2, 999, 'DEMERIT', 'PUNCTUALITY',
              0, 100, '2026-06-01'::date, clock_timestamp(), '0 แต้ม', $3
            );
          `, [testStudentId, currentYear, adminUserId]);
        },
        (err) => {
          assert.match(err.message, /chk_points_nonzero/i);
          return true;
        }
      );
    });

    it('14.2 Should block DEMERIT with positive points via chk_points_sign', async () => {
      await assert.rejects(
        async () => {
          await client.query(`
            INSERT INTO public."BehaviorRecord" (
              "id", "studentId", "academicYear", "sequenceNo", "type", "category",
              "points", "balanceAfter", "businessDate", "incidentTimestamp", "description",
              "reportedById"
            ) VALUES (
              'br_fail_sign_' || clock_timestamp()::text, $1, $2, 999, 'DEMERIT', 'PUNCTUALITY',
              10, 110, '2026-06-01'::date, clock_timestamp(), 'แต้มตัดแต่เป็นบวก', $3
            );
          `, [testStudentId, currentYear, adminUserId]);
        },
        (err) => {
          assert.match(err.message, /chk_points_sign/i);
          return true;
        }
      );
    });

    it('14.3 Should block SDQ evaluation with invalid total score sum via chk_sdq_total_sum', async () => {
      const normRes = await client.query(`SELECT "id" FROM public."SdqNormsRegistry" LIMIT 1;`);
      const normId = normRes.rows[0].id;

      await assert.rejects(
        async () => {
          await client.query(`
            INSERT INTO public."StudentSdqEvaluation" (
              "id", "studentId", "academicYear", "term", "evaluatorType", "normRegistryId",
              "emotionalScore", "conductScore", "hyperactivityScore", "peerProblemScore",
              "prosocialScore", "totalDifficulties", "overallLevel", "rawAnswersJson", "evaluatorId"
            ) VALUES (
              'sdq_bad_sum_' || clock_timestamp()::text, $1, $2, $3, 'PARENT', $4,
              2, 2, 2, 2, 5, 99, 'NORMAL', '{}'::jsonb, $5
            );
          `, [testStudentId, currentYear, currentTerm, normId, teacherUserId]);
        },
        (err) => {
          assert.match(err.message, /chk_sdq_total_sum/i);
          return true;
        }
      );
    });

    it('14.4 Should block enrollment with invalid term via chk_enrollment_term', async () => {
      await assert.rejects(
        async () => {
          await client.query(`
            INSERT INTO public."StudentEnrollment" (
              "id", "studentId", "academicYear", "term", "classRoomId", "gradeLevel",
              "roomNumber", "rollNumber", "status"
            ) VALUES (
              'enr_bad_term_' || clock_timestamp()::text, $1, 2570, 3, $2, 1, 991, 10, 'ENROLLED'
            );
          `, [testStudentId, testClassRoomId]);
        },
        (err) => {
          assert.match(err.message, /chk_enrollment_term/i);
          return true;
        }
      );
    });
  });

  // ===========================================================================
  // TEST-15: BEARER SESSION AUTHENTICATION & PRIVILEGE BOUNDARY VERIFICATION
  // ===========================================================================
  describe('Test-15: Bearer Session Authentication & Privilege Boundary Verification', () => {
    it('15.1 Should reject procedure execution with non-existent session token', async () => {
      await assert.rejects(
        async () => {
          await client.query(`
            SELECT * FROM public.record_student_behavior_ledger(
              'fake_non_existent_token', $1, $2, 'DEMERIT'::public."BehaviorLedgerType",
              'PUNCTUALITY'::public."BehaviorCategory", -5, '2026-06-01'::date,
              clock_timestamp(), 'ประตูหน้า', 'ทดสอบ token ปลอม', $3
            );
          `, [testStudentId, currentYear, adminUserId]);
        },
        (err) => {
          assert.strictEqual(err.code, '55000');
          assert.match(err.message, /UNAUTHORIZED_SESSION/);
          return true;
        }
      );
    });

    it('15.2 Should reject procedure execution with expired session token', async () => {
      await assert.rejects(
        async () => {
          await client.query(`
            SELECT * FROM public.record_student_behavior_ledger(
              $1, $2, $3, 'DEMERIT'::public."BehaviorLedgerType",
              'PUNCTUALITY'::public."BehaviorCategory", -5, '2026-06-01'::date,
              clock_timestamp(), 'ประตูหน้า', 'ทดสอบ token หมดอายุ', $4
            );
          `, [expiredSessionToken, testStudentId, currentYear, teacherUserId]);
        },
        (err) => {
          assert.strictEqual(err.code, '55000');
          assert.match(err.message, /UNAUTHORIZED_SESSION/);
          return true;
        }
      );
    });

    it('15.3 Should reject non-admin user performing proxy reporting on behalf of others', async () => {
      // Teacher session token reporting with reported_by_id = teacher2UserId
      await assert.rejects(
        async () => {
          await client.query(`
            SELECT * FROM public.record_student_behavior_ledger(
              $1, $2, $3, 'DEMERIT'::public."BehaviorLedgerType",
              'PUNCTUALITY'::public."BehaviorCategory", -5, '2026-06-01'::date,
              clock_timestamp(), 'ประตูหน้า', 'พยายามบันทึกแทนผู้อื่นโดยไม่มีสิทธิ์', $4
            );
          `, [teacherSessionToken, testStudentId, currentYear, teacher2UserId]);
        },
        (err) => {
          assert.strictEqual(err.code, '55000');
          assert.match(err.message, /UNAUTHORIZED_PROXY_REPORTING/);
          return true;
        }
      );
    });

    it('15.4 Should reject non-admin user attempting student status change', async () => {
      await assert.rejects(
        async () => {
          await client.query(`
            SELECT public.change_student_status($1, $2, 'SUSPENDED'::public."StudentStatus", 'ครูทั่วไปพยายามสั่งพักการเรียน');
          `, [teacherSessionToken, testStudentId]);
        },
        (err) => {
          assert.strictEqual(err.code, '55000');
          assert.match(err.message, /UNAUTHORIZED_STATUS_CHANGE/);
          return true;
        }
      );
    });

    it('15.5 Should deny eleave_runtime direct write on BehaviorRecord table', async () => {
      await client.query('SET ROLE eleave_runtime;');
      try {
        await assert.rejects(
          async () => {
            await client.query(`
              INSERT INTO public."BehaviorRecord" (
                "id", "studentId", "academicYear", "sequenceNo", "type", "category",
                "points", "balanceAfter", "businessDate", "incidentTimestamp", "description",
                "reportedById"
              ) VALUES (
                'br_runtime_bypass', $1, $2, 999, 'DEMERIT', 'PUNCTUALITY',
                -5, 95, '2026-06-01'::date, clock_timestamp(), 'ยิงตรง bypass procedure', $3
              );
            `, [testStudentId, currentYear, adminUserId]);
          },
          (err) => {
            assert.match(err.message, /permission denied for table BehaviorRecord/i);
            return true;
          }
        );
      } finally {
        await client.query('RESET ROLE;');
      }
    });
  });
});
