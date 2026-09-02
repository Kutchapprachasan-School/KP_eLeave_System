import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FacilityReservationService } from '../../../src/lib/services/facilityReservationService.js';

test('FacilityConflictEngine - detects exact, partial, and enclosing overlap conflicts with half-open intervals', () => {
  const service = new FacilityReservationService();
  service.reservations = [
    {
      reservationId: 'RES-001',
      resourceId: 'res-room-1',
      startAt: '2026-09-10T09:00:00Z',
      endAt: '2026-09-10T11:00:00Z',
      status: 'APPROVED'
    }
  ];

  // Exact overlap
  assert.equal(service.checkConflict('res-room-1', '2026-09-10T09:00:00Z', '2026-09-10T11:00:00Z'), true);
  // Partial head overlap
  assert.equal(service.checkConflict('res-room-1', '2026-09-10T08:30:00Z', '2026-09-10T09:30:00Z'), true);
  // Partial tail overlap
  assert.equal(service.checkConflict('res-room-1', '2026-09-10T10:30:00Z', '2026-09-10T12:00:00Z'), true);
  // Enclosing overlap
  assert.equal(service.checkConflict('res-room-1', '2026-09-10T08:00:00Z', '2026-09-10T12:00:00Z'), true);
  // Adjacent boundary: [11:00, 13:00) does NOT conflict with [09:00, 11:00)
  assert.equal(service.checkConflict('res-room-1', '2026-09-10T11:00:00Z', '2026-09-10T13:00:00Z'), false);
  // Adjacent boundary: [07:00, 09:00) does NOT conflict with [09:00, 11:00)
  assert.equal(service.checkConflict('res-room-1', '2026-09-10T07:00:00Z', '2026-09-10T09:00:00Z'), false);
});

test('FacilityConflictEngine - inactive states (CANCELLED, REJECTED, COMPLETED) do NOT block slots', () => {
  const service = new FacilityReservationService();
  service.reservations = [
    {
      reservationId: 'RES-CANCELLED',
      resourceId: 'res-room-1',
      startAt: '2026-09-10T09:00:00Z',
      endAt: '2026-09-10T11:00:00Z',
      status: 'CANCELLED'
    },
    {
      reservationId: 'RES-REJECTED',
      resourceId: 'res-room-2',
      startAt: '2026-09-10T09:00:00Z',
      endAt: '2026-09-10T11:00:00Z',
      status: 'REJECTED'
    },
    {
      reservationId: 'RES-COMPLETED',
      resourceId: 'res-room-3',
      startAt: '2026-09-10T09:00:00Z',
      endAt: '2026-09-10T11:00:00Z',
      status: 'COMPLETED'
    }
  ];

  assert.equal(service.checkConflict('res-room-1', '2026-09-10T09:00:00Z', '2026-09-10T11:00:00Z'), false);
  assert.equal(service.checkConflict('res-room-2', '2026-09-10T09:00:00Z', '2026-09-10T11:00:00Z'), false);
  assert.equal(service.checkConflict('res-room-3', '2026-09-10T09:00:00Z', '2026-09-10T11:00:00Z'), false);
});

test('FacilityConflictEngine - detects driver collision across different vehicles', () => {
  const service = new FacilityReservationService();
  service.reservations = [
    {
      reservationId: 'RES-VEH-1',
      resourceId: 'res-veh-van1',
      startAt: '2026-09-10T08:00:00Z',
      endAt: '2026-09-10T16:00:00Z',
      status: 'APPROVED',
      vehicleDetails: { driverProfileId: 'driver-somchai' }
    }
  ];

  // Driver collision on bus
  assert.equal(service.checkDriverConflict('driver-somchai', '2026-09-10T09:00:00Z', '2026-09-10T12:00:00Z'), true);
  // Different driver is free
  assert.equal(service.checkDriverConflict('driver-sompong', '2026-09-10T09:00:00Z', '2026-09-10T12:00:00Z'), false);
});

test('FacilityWorkflow - 2-tier approval lifecycle with snapshot steps', () => {
  const service = new FacilityReservationService();
  service.reservations = [];

  const res = service.createReservation({
    resourceId: 'res-room-audi',
    reservedByUserId: 'teacher-1',
    title: 'อบรมวิชาการ',
    startAt: '2026-09-15T09:00:00Z',
    endAt: '2026-09-15T12:00:00Z',
    consumerModule: 'MEETING_ROOM'
  });

  assert.equal(res.status, 'PENDING');
  assert.equal(res.currentStep, 1);
  assert.equal(res.approvalSteps.length, 2);
  assert.equal(res.approvalSteps[0].status, 'PENDING');

  // Step 1: Head Review
  const headReviewed = service.reviewByHead(res.reservationId, {
    approverUserId: 'head-facility-1',
    layoutNotes: 'จัดโต๊ะแบบ U-Shape',
    audioVisualNotes: 'ไมค์ 4 ตัว',
    comment: 'ตรวจสอบสถานที่เรียบร้อย'
  });
  assert.equal(headReviewed.currentStep, 2);
  assert.equal(headReviewed.approvalSteps[0].status, 'APPROVED');
  assert.equal(headReviewed.status, 'PENDING'); // Master stays PENDING until director

  // Step 2: Director Approval
  const directorApproved = service.approveByDirector(res.reservationId, {
    approverUserId: 'director-1',
    comment: 'อนุมัติตามเสนอ'
  });
  assert.equal(directorApproved.status, 'APPROVED');
  assert.equal(directorApproved.approvalSteps[1].status, 'APPROVED');
  assert.equal(directorApproved.assignments[0].status, 'APPROVED');
});

test('FacilityWorkflow - Director approval atomic re-check prevents race collision', () => {
  const service = new FacilityReservationService();
  service.reservations = [];

  // Teacher A requests 09:00-11:00
  const resA = service.createReservation({
    resourceId: 'res-room-audi',
    reservedByUserId: 'teacher-A',
    title: 'ประชุม A',
    startAt: '2026-09-20T09:00:00Z',
    endAt: '2026-09-20T11:00:00Z',
    consumerModule: 'MEETING_ROOM'
  });

  // Teacher B requests 10:00-12:00 (simulate overlapping pending in memory)
  const resB = {
    reservationId: 'RES-B',
    resourceId: 'res-room-audi',
    reservedByUserId: 'teacher-B',
    title: 'ประชุม B',
    startAt: '2026-09-20T10:00:00Z',
    endAt: '2026-09-20T12:00:00Z',
    status: 'PENDING',
    approvalSteps: [{ stepNo: 2, status: 'PENDING' }],
    assignments: [{ targetType: 'RESOURCE', resourceId: 'res-room-audi', startAt: '2026-09-20T10:00:00Z', endAt: '2026-09-20T12:00:00Z', status: 'PENDING' }]
  };
  service.reservations.push(resB);

  // Director approves A first
  service.approveByDirector(resA.reservationId);
  assert.equal(resA.status, 'APPROVED');

  // Director tries to approve B -> Throws Conflict Error on Re-Check!
  assert.throws(() => {
    service.approveByDirector(resB.reservationId);
  }, /ไม่สามารถอนุมัติได้ เนื่องจากทรัพยากรถูกอนุมัติให้รายการอื่นในช่วงเวลาเดียวกันไปแล้ว/);
});

test('FacilityWorkflow - Strict Cancellation Matrix', () => {
  const service = new FacilityReservationService();
  service.reservations = [
    {
      reservationId: 'RES-PENDING',
      reservedByUserId: 'teacher-1',
      resourceId: 'res-room-audi',
      startAt: '2026-09-25T09:00:00Z',
      endAt: '2026-09-25T11:00:00Z',
      status: 'PENDING'
    },
    {
      reservationId: 'RES-COMPLETED',
      reservedByUserId: 'teacher-1',
      resourceId: 'res-room-audi',
      startAt: '2026-09-01T09:00:00Z',
      endAt: '2026-09-01T11:00:00Z',
      status: 'COMPLETED'
    },
    {
      reservationId: 'RES-IN-USE',
      reservedByUserId: 'teacher-1',
      resourceId: 'res-room-audi',
      startAt: '2026-09-02T08:00:00Z',
      endAt: '2026-09-02T12:00:00Z',
      status: 'IN_USE'
    }
  ];

  // PENDING cancelled by owner -> Success
  const cancelledPending = service.cancelReservation('RES-PENDING', { id: 'teacher-1', role: 'TEACHER' });
  assert.equal(cancelledPending.status, 'CANCELLED');

  // COMPLETED cannot be cancelled -> Throws Immutable error
  assert.throws(() => {
    service.cancelReservation('RES-COMPLETED', { id: 'teacher-1', role: 'TEACHER' });
  }, /Immutable Record/);

  // IN_USE cannot be cancelled by normal teacher -> Throws error
  assert.throws(() => {
    service.cancelReservation('RES-IN-USE', { id: 'teacher-1', role: 'TEACHER' });
  }, /เฉพาะผู้ดูแลระบบเท่านั้น/);

  // IN_USE emergency cancel by Admin -> Success
  const cancelledInUse = service.cancelReservation('RES-IN-USE', { id: 'admin-1', role: 'ADMIN' });
  assert.equal(cancelledInUse.status, 'CANCELLED');
});

test('FacilityWorkflow - SLA Expiry and Idempotent Cleanup', () => {
  const service = new FacilityReservationService();
  service.reservations = [
    {
      reservationId: 'RES-EXPIRED',
      resourceId: 'res-room-audi',
      startAt: '2026-09-20T09:00:00Z',
      endAt: '2026-09-20T11:00:00Z',
      expiresAt: '2026-09-01T00:00:00Z', // Past expiry
      status: 'PENDING'
    },
    {
      reservationId: 'RES-FRESH',
      resourceId: 'res-room-audi',
      startAt: '2026-09-20T13:00:00Z',
      endAt: '2026-09-20T15:00:00Z',
      expiresAt: '2026-09-15T00:00:00Z', // Future expiry
      status: 'PENDING'
    }
  ];

  // Cannot approve expired request
  assert.throws(() => {
    service.approveByDirector('RES-EXPIRED');
  }, /คำขอนี้หมดอายุตาม SLA แล้ว/);

  // Run Idempotent Cleanup at 2026-09-02
  const run1 = service.cleanupExpiredPending(new Date('2026-09-02T00:00:00Z'));
  assert.equal(run1.cancelledCount, 1);
  assert.equal(service.reservations.find(r => r.reservationId === 'RES-EXPIRED').status, 'CANCELLED');

  // Run again -> 0 items processed (Idempotent)
  const run2 = service.cleanupExpiredPending(new Date('2026-09-02T00:00:00Z'));
  assert.equal(run2.cancelledCount, 0);
});
