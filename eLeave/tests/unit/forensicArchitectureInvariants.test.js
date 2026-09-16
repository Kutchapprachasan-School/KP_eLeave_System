import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FacilityReservationService } from '../../../src/lib/services/facilityReservationService.js';
import {
  evaluateDetectionStatus,
  resolveEffectiveChoice,
  calculateItemScore,
  computeRawImageHash,
  deriveServerPreviousChoice,
  validateOptimisticLock,
  getNextSequenceNo,
  handleIngestIdempotency
} from '../../../src/lib/omr/omrForensicPolicy.ts';
import {
  calculateApprovedCount,
  calculateActualUsageCount,
  calculateCompletedCount,
  calculateNoShowCount,
  calculateUtilizedHours
} from '../../../src/lib/facility/FacilityKpiContract.ts';
import {
  getAcademicYearDateRange,
  getFiscalYearDateRange,
  getCalendarYearDateRange
} from '../../../src/lib/academicYearUtils.ts';

describe('🏛️ Forensic Architecture Invariants & Data Integrity Test Suite', () => {

  // ===========================================================================
  // 1. OMR DETECTION STATUS & ANTI-SILENT-FALLBACK CONTRACT
  // ===========================================================================
  describe('OMR DetectionStatus & Zero Silent Fallback', () => {
    it('1.1 Should correctly identify SINGLE_MARK and use choice', () => {
      const status = evaluateDetectionStatus(['B'], 0.95, { A: 0.05, B: 0.95, C: 0.02, D: 0.01 });
      assert.strictEqual(status, 'SINGLE_MARK');

      const choice = resolveEffectiveChoice({
        detectionStatus: status,
        detectedChoices: ['B'],
        overrides: []
      });
      assert.strictEqual(choice, 'B');

      const score = calculateItemScore(choice, ['B'], 1.00);
      assert.strictEqual(score.isCorrect, true);
      assert.strictEqual(score.scoreEarned, 1.00);
    });

    it('1.2 Should detect MULTIPLE_MARKS and strictly return NULL (Zero Silent Fallback to choice[0])', () => {
      const status = evaluateDetectionStatus(['B', 'C'], 0.88, { A: 0.02, B: 0.88, C: 0.85, D: 0.01 });
      assert.strictEqual(status, 'MULTIPLE_MARKS');

      // ANTI-SILENT-FALLBACK TEST: Must NEVER fall back to 'B'
      const choice = resolveEffectiveChoice({
        detectionStatus: status,
        detectedChoices: ['B', 'C'],
        overrides: []
      });
      assert.strictEqual(choice, null, 'effectiveChoice MUST be null on MULTIPLE_MARKS');

      const score = calculateItemScore(choice, ['B'], 1.00);
      assert.strictEqual(score.isCorrect, false);
      assert.strictEqual(score.scoreEarned, 0.00);
    });

    it('1.3 Should detect AMBIGUOUS when top 2 fill ratios are close due to erasure residue', () => {
      const status = evaluateDetectionStatus(['B'], 0.70, { A: 0.05, B: 0.42, C: 0.35, D: 0.02 });
      assert.strictEqual(status, 'AMBIGUOUS');

      const choice = resolveEffectiveChoice({
        detectionStatus: status,
        detectedChoices: ['B'],
        overrides: []
      });
      assert.strictEqual(choice, null, 'Ambiguous marks must yield null choice until teacher review');
    });

    it('1.4 Should detect NO_MARK when sheet is blank for that item', () => {
      const status = evaluateDetectionStatus([], 0.0, { A: 0.02, B: 0.03, C: 0.01, D: 0.01 });
      assert.strictEqual(status, 'NO_MARK');

      const choice = resolveEffectiveChoice({
        detectionStatus: status,
        detectedChoices: [],
        overrides: []
      });
      assert.strictEqual(choice, null);
      const score = calculateItemScore(choice, ['A'], 1.00);
      assert.strictEqual(score.scoreEarned, 0.00);
    });

    it('1.5 Should detect LOW_CONFIDENCE when mark is too faint', () => {
      const status = evaluateDetectionStatus(['A'], 0.45, { A: 0.22, B: 0.01, C: 0.02, D: 0.01 });
      assert.strictEqual(status, 'LOW_CONFIDENCE');

      const choice = resolveEffectiveChoice({
        detectionStatus: status,
        detectedChoices: ['A'],
        overrides: []
      });
      assert.strictEqual(choice, null);
    });
  });

  // ===========================================================================
  // 2. OVERRIDE LEDGER, MONOTONIC SEQUENCE & SERVER-DERIVED PREVIOUS CHOICE
  // ===========================================================================
  describe('Override Ledger, Monotonic Sequence & Server-Derived Previous Choice', () => {
    it('2.1 Should derive previousChoice on server from effective state, ignoring client forgery', () => {
      const item = {
        detectionStatus: 'SINGLE_MARK',
        detectedChoices: ['B'],
        overrides: []
      };
      const previousChoice = deriveServerPreviousChoice(item);
      assert.strictEqual(previousChoice, 'B', 'Server must derive B as previousChoice');
    });

    it('2.2 Should correctly increment monotonic sequenceNo and resolve latest override', () => {
      const overrides = [];
      const seq1 = getNextSequenceNo(overrides);
      assert.strictEqual(seq1, 1n);

      overrides.push({
        submissionItemId: 'item-1',
        sequenceNo: seq1,
        previousChoice: 'B',
        overrideChoice: 'C',
        reason: 'นักเรียนลบรอย B ไม่หมด และฝน C ชัดเจน',
        actorUserId: 'teacher-1',
        requestId: 'req-001'
      });

      const seq2 = getNextSequenceNo(overrides);
      assert.strictEqual(seq2, 2n);

      overrides.push({
        submissionItemId: 'item-1',
        sequenceNo: seq2,
        previousChoice: 'C',
        overrideChoice: 'D',
        reason: 'ครูหัวหน้าหมวดตรวจสอบซ้ำ พบว่าตอบ D',
        actorUserId: 'head-teacher-1',
        requestId: 'req-002'
      });

      // Latest override by sequenceNo must win
      const effectiveChoice = resolveEffectiveChoice({
        detectionStatus: 'SINGLE_MARK',
        detectedChoices: ['B'],
        overrides
      });
      assert.strictEqual(effectiveChoice, 'D', 'Latest override sequenceNo must take precedence');
    });

    it('2.3 Should reject concurrent modifications using Optimistic Locking (overrideVersion)', () => {
      const currentVersion = 2;
      assert.doesNotThrow(() => validateOptimisticLock(currentVersion, 2));

      assert.throws(
        () => validateOptimisticLock(currentVersion, 1),
        /HTTP 409 Conflict/,
        'Stale expectedVersion must trigger HTTP 409'
      );
    });
  });

  // ===========================================================================
  // 3. RAW IMAGE CHAIN OF CUSTODY & INGEST IDEMPOTENCY
  // ===========================================================================
  describe('Raw Image Chain of Custody & Ingest Idempotency', () => {
    it('3.1 Should compute deterministic SHA-256 for raw image buffer', () => {
      const fakeImageBuffer = Buffer.from('RAW_OMR_SCAN_IMAGE_DATA_2026_TEST');
      const hash = computeRawImageHash(fakeImageBuffer);
      assert.strictEqual(typeof hash, 'string');
      assert.strictEqual(hash.length, 64, 'SHA-256 hex string must be 64 characters');
    });

    it('3.2 Should replay existing submission on duplicate clientScanId without duplicate rows', () => {
      const submissions = [
        { id: 'sub-1', clientScanId: 'SCAN-UUID-999', netScore: 45.00 }
      ];

      const result = handleIngestIdempotency(submissions, 'SCAN-UUID-999');
      assert.strictEqual(result.isDuplicate, true);
      assert.strictEqual(result.existingSubmission.id, 'sub-1');

      const freshResult = handleIngestIdempotency(submissions, 'SCAN-UUID-NEW');
      assert.strictEqual(freshResult.isDuplicate, false);
    });
  });

  // ===========================================================================
  // 4. TRANSACTIONAL REVISION RESUBMISSION WITH IMMUTABLE SNAPSHOT
  // ===========================================================================
  describe('Transactional Revision Resubmission', () => {
    it('4.1 Should save revision 1 snapshot and increment revisionNo on resubmission after rejection', () => {
      const service = new FacilityReservationService();
      service.reservations = [];

      const res = service.createReservation({
        resourceId: 'res-lab-1',
        reservedByUserId: 'teacher-1',
        title: 'กิจกรรมวิทย์ ม.3',
        startAt: new Date(Date.now() + 86400000 * 2).toISOString(),
        endAt: new Date(Date.now() + 86400000 * 2 + 7200000).toISOString(),
        consumerModule: 'LABORATORY'
      });

      assert.strictEqual(res.revisionNo || 1, 1);

      // Director rejects Step 2
      service.reviewByHead(res.reservationId, { comment: 'สถานที่พร้อม' });
      service.rejectReservation(res.reservationId, 'เวลาคาบเกี่ยวกับการทำความสะอาดห้องแล็บ', 'director-1');
      assert.strictEqual(res.status, 'REJECTED');

      // Resubmit under Revision 2
      const newStartAt = new Date(Date.now() + 86400000 * 3).toISOString();
      const newEndAt = new Date(Date.now() + 86400000 * 3 + 7200000).toISOString();

      const resubmitted = service.resubmitRevision(res.reservationId, {
        newStartAt,
        newEndAt,
        revisionReason: 'เลื่อนเวลาไปวันรุ่งขึ้นตามที่ ผอ. แนะนำ'
      });

      assert.strictEqual(resubmitted.revisionNo, 2);
      assert.strictEqual(resubmitted.status, 'PENDING');
      assert.strictEqual(resubmitted.currentStep, 1);
      assert.strictEqual(resubmitted.revisions.length, 1);
      assert.strictEqual(resubmitted.revisions[0].revisionNo, 1);
      assert.strictEqual(resubmitted.revisions[0].snapshotPayload.status, 'REJECTED');
      assert.strictEqual(resubmitted.approvalSteps[0].revisionNo, 2);
    });

    it('4.2 Should reject resubmitting reservations that are not REJECTED', () => {
      const service = new FacilityReservationService();
      service.reservations = [];

      const res = service.createReservation({
        resourceId: 'res-lab-1',
        reservedByUserId: 'teacher-1',
        title: 'กิจกรรมวิทย์',
        startAt: new Date(Date.now() + 86400000 * 2).toISOString(),
        endAt: new Date(Date.now() + 86400000 * 2 + 7200000).toISOString()
      });

      assert.throws(
        () => service.resubmitRevision(res.reservationId),
        /สามารถส่งใหม่ \(Re-submit\) ได้เฉพาะคำขอที่ถูกปฏิเสธแล้วเท่านั้น/
      );
    });
  });

  // ===========================================================================
  // 5. IN-TRANSACTION RBAC + CAS APPROVAL
  // ===========================================================================
  describe('In-Transaction RBAC + CAS Approval', () => {
    it('5.1 Should reject unauthorized roles attempting to review or approve steps', () => {
      const service = new FacilityReservationService();
      service.reservations = [];

      const res = service.createReservation({
        resourceId: 'res-room-audi',
        reservedByUserId: 'teacher-1',
        title: 'ประชุมกลุ่มวิชาการ',
        startAt: new Date(Date.now() + 86400000 * 2).toISOString(),
        endAt: new Date(Date.now() + 86400000 * 2 + 7200000).toISOString()
      });

      // Regular TEACHER trying to approve Step 1 -> MUST BE FORBIDDEN
      assert.throws(
        () => service.approveStepWithRbacCas({
          reservationId: res.reservationId,
          expectedRevisionNo: 1,
          stepNo: 1,
          actorUserId: 'teacher-unauthorized',
          actorRole: 'TEACHER',
          idempotencyKey: 'idem-001',
          comment: 'พยายามอนุมัติ'
        }),
        /HTTP 403: Forbidden - Insufficient permissions to review Step 1/
      );

      // Regular TEACHER trying to approve Step 2 -> MUST BE FORBIDDEN
      assert.throws(
        () => service.approveStepWithRbacCas({
          reservationId: res.reservationId,
          expectedRevisionNo: 1,
          stepNo: 2,
          actorUserId: 'teacher-unauthorized',
          actorRole: 'TEACHER',
          idempotencyKey: 'idem-002',
          comment: 'พยายามอนุมัติ ผอ.'
        }),
        /Step mismatch/
      );
    });

    it('5.2 Should reject approval if expectedRevisionNo does not match current reservation revision', () => {
      const service = new FacilityReservationService();
      service.reservations = [];

      const res = service.createReservation({
        resourceId: 'res-room-audi',
        reservedByUserId: 'teacher-1',
        title: 'ประชุม',
        startAt: new Date(Date.now() + 86400000 * 2).toISOString(),
        endAt: new Date(Date.now() + 86400000 * 2 + 7200000).toISOString()
      });

      assert.throws(
        () => service.approveStepWithRbacCas({
          reservationId: res.reservationId,
          expectedRevisionNo: 99, // Stale revision
          stepNo: 1,
          actorUserId: 'head-fac',
          actorRole: 'HEAD_FACILITY',
          idempotencyKey: 'idem-003',
          comment: 'ตรวจรับรอง'
        }),
        /Revision mismatch/
      );
    });

    it('5.3 Should successfully approve Step 1 and Step 2 with valid roles and CAS sequence', () => {
      const service = new FacilityReservationService();
      service.reservations = [];

      const res = service.createReservation({
        resourceId: 'res-room-audi',
        reservedByUserId: 'teacher-1',
        title: 'การประชุมใหญ่',
        startAt: new Date(Date.now() + 86400000 * 2).toISOString(),
        endAt: new Date(Date.now() + 86400000 * 2 + 7200000).toISOString()
      });

      // Step 1: Head of Facility
      const step1Result = service.approveStepWithRbacCas({
        reservationId: res.reservationId,
        expectedRevisionNo: 1,
        stepNo: 1,
        actorUserId: 'head-fac-1',
        actorRole: 'HEAD_FACILITY',
        idempotencyKey: 'idem-step1',
        comment: 'โสตและสถานที่พร้อมใช้งาน'
      });
      assert.strictEqual(step1Result.currentStep, 2);
      assert.strictEqual(step1Result.approvalSteps[0].status, 'APPROVED');

      // Step 2: School Director
      const step2Result = service.approveStepWithRbacCas({
        reservationId: res.reservationId,
        expectedRevisionNo: 1,
        stepNo: 2,
        actorUserId: 'director-1',
        actorRole: 'DIRECTOR',
        idempotencyKey: 'idem-step2',
        comment: 'อนุมัติการใช้งาน'
      });
      assert.strictEqual(step2Result.status, 'APPROVED');
      assert.strictEqual(step2Result.approvalSteps[1].status, 'APPROVED');
    });
  });

  // ===========================================================================
  // 6. CENTRALIZED COMPLETED CORE IMMUTABILITY GUARD & POST-MISSION DECOUPLING
  // ===========================================================================
  describe('Centralized COMPLETED Core Immutability Guard', () => {
    it('6.1 Should strictly block modifying core fields (time, resource, title, revisionNo) on COMPLETED reservation', () => {
      const service = new FacilityReservationService();
      service.reservations = [];

      const res = service.createReservation({
        resourceId: 'res-room-audi',
        reservedByUserId: 'teacher-1',
        title: 'สัมมนา',
        startAt: new Date(Date.now() + 86400000 * 2).toISOString(),
        endAt: new Date(Date.now() + 86400000 * 2 + 7200000).toISOString(),
        status: 'COMPLETED'
      });

      assert.throws(
        () => service.updateReservationCore(res.reservationId, { startAt: '2026-10-01T00:00:00Z' }),
        /Core fields of COMPLETED reservations are strictly immutable/
      );

      assert.throws(
        () => service.updateReservationCore(res.reservationId, { resourceId: 'res-lab-1' }),
        /Core fields of COMPLETED reservations are strictly immutable/
      );
    });

    it('6.2 Should permit submitting decoupled post-mission report on COMPLETED / IN_USE reservation', () => {
      const service = new FacilityReservationService();
      service.reservations = [];

      const res = service.createReservation({
        resourceId: 'res-veh-bus',
        reservedByUserId: 'teacher-1',
        title: 'นำนักเรียนแข่งขันทักษะ',
        startAt: new Date(Date.now() + 86400000 * 2).toISOString(),
        endAt: new Date(Date.now() + 86400000 * 2 + 7200000).toISOString(),
        status: 'IN_USE'
      });

      const updated = service.submitPostMissionReport(res.reservationId, {
        startMileage: 120500,
        endMileage: 120680,
        fuelCost: 1250.00,
        fuelReceiptKey: 'receipts/2026/fuel_001.pdf',
        incidentNotes: 'การเดินทางราบรื่น ไม่พบอุบัติเหตุ',
        reportedByUserId: 'driver-somchai'
      });

      assert.strictEqual(updated.status, 'COMPLETED');
      assert.ok(updated.postMissionReport);
      assert.strictEqual(updated.postMissionReport.distanceKm, 180);
      assert.strictEqual(updated.postMissionReport.fuelCost, 1250.00);
    });
  });

  // ===========================================================================
  // 7. CANONICAL KPI CONTRACT COMPLIANCE
  // ===========================================================================
  describe('Canonical KPI Contract', () => {
    it('7.1 Should compute disambiguated KPI metrics strictly according to contract', () => {
      const records = [
        { id: '1', status: 'PENDING', startAt: '2026-09-01T08:00:00Z', endAt: '2026-09-01T10:00:00Z' },
        { id: '2', status: 'APPROVED', startAt: '2026-09-02T08:00:00Z', endAt: '2026-09-02T11:00:00Z' },
        { id: '3', status: 'IN_USE', startAt: '2026-09-03T08:00:00Z', endAt: '2026-09-03T12:00:00Z' }, // 4 hrs
        { id: '4', status: 'COMPLETED', startAt: '2026-09-04T08:00:00Z', endAt: '2026-09-04T10:30:00Z' }, // 2.5 hrs
        { id: '5', status: 'REJECTED', startAt: '2026-09-05T08:00:00Z', endAt: '2026-09-05T10:00:00Z' },
        {
          id: '6',
          status: 'CANCELLED',
          startAt: '2026-09-06T08:00:00Z',
          endAt: '2026-09-06T10:00:00Z',
          approvalSteps: [{ status: 'APPROVED' }] // Was approved prior to cancellation = No-Show
        }
      ];

      assert.strictEqual(calculateApprovedCount(records), 3, 'Approved: APPROVED, IN_USE, COMPLETED');
      assert.strictEqual(calculateActualUsageCount(records), 2, 'Actual: IN_USE, COMPLETED');
      assert.strictEqual(calculateCompletedCount(records), 1, 'Completed: COMPLETED only');
      assert.strictEqual(calculateNoShowCount(records), 1, 'No-Show: CANCELLED with previous approval');
      assert.strictEqual(calculateUtilizedHours(records), 6.5, 'Utilized hours = 4 + 2.5 = 6.5 hours');
    });
  });

  // ===========================================================================
  // 8. ACADEMIC & FISCAL YEAR BOUNDARY TESTS
  // ===========================================================================
  describe('Academic & Fiscal Year Boundaries (Asia/Bangkok Standard)', () => {
    it('8.1 Should correctly calculate Thai Academic Year boundary (May 16 - May 15 next year)', () => {
      const range = getAcademicYearDateRange(2569);
      assert.strictEqual(range.label, 'ปีการศึกษา 2569');
      // May 16, 00:00:00 ICT is May 15, 17:00:00 UTC
      assert.ok(range.startUtc.includes('2026-05-15T17:00:00'));
      // May 15, 23:59:59.999 ICT is May 15, 16:59:59.999 UTC next year
      assert.ok(range.endUtc.includes('2027-05-15T16:59:59'));
    });

    it('8.2 Should correctly calculate Thai Fiscal Year boundary (Oct 1 prior year - Sep 30)', () => {
      const range = getFiscalYearDateRange(2569);
      assert.strictEqual(range.label, 'ปีงบประมาณ 2569');
      // Oct 1, 00:00:00 ICT of 2025 is Sep 30, 17:00:00 UTC 2025
      assert.ok(range.startUtc.includes('2025-09-30T17:00:00'));
      // Sep 30, 23:59:59.999 ICT of 2026 is Sep 30, 16:59:59.999 UTC 2026
      assert.ok(range.endUtc.includes('2026-09-30T16:59:59'));
    });

    it('8.3 Should correctly calculate Calendar Year boundary (Jan 1 - Dec 31)', () => {
      const range = getCalendarYearDateRange(2569);
      assert.strictEqual(range.label, 'ปีปฏิทิน 2569');
      assert.ok(range.startUtc.includes('2025-12-31T17:00:00'));
      assert.ok(range.endUtc.includes('2026-12-31T16:59:59'));
    });
  });
});
