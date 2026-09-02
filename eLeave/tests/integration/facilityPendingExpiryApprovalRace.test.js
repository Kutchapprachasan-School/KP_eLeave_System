import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FacilityReservationService } from '../../../src/lib/services/facilityReservationService.js';

test('SLA Expiry vs Director Approval Race Condition Guard', async () => {
  const service = new FacilityReservationService();
  service.reservations = [];

  // Create a reservation that is expired
  const res = service.createReservation({
    resourceId: 'res-room-audi',
    reservedByUserId: 'teacher-1',
    title: 'ประชุมด่วน',
    startAt: '2026-10-20T09:00:00Z',
    endAt: '2026-10-20T11:00:00Z',
    expiresAt: '2026-08-01T12:00:00Z' // Past expiry
  });

  const simulatedClockNow = new Date('2026-08-02T00:00:00Z');

  // Director attempt must be rejected because expiresAt has lapsed
  assert.throws(() => {
    service.approveByDirector(res.reservationId);
  }, /คำขอนี้หมดอายุตาม SLA แล้ว/);

  // Cleanup runs and cancels it
  const cleanupResult = service.cleanupExpiredPending(simulatedClockNow);
  assert.equal(cleanupResult.cancelledCount, 1);
  assert.equal(res.status, 'CANCELLED');
});

test('Concurrent Director Approval vs SLA Cleanup Execution Race', async () => {
  const service = new FacilityReservationService();
  service.reservations = [];

  const res = service.createReservation({
    resourceId: 'res-room-audi',
    reservedByUserId: 'teacher-1',
    title: 'ประชุมด่วน 2',
    startAt: '2026-10-20T09:00:00Z',
    endAt: '2026-10-20T11:00:00Z',
    expiresAt: '2026-10-15T12:00:00Z'
  });

  // Simulated Director approval executed BEFORE expiry threshold
  const directorApprove = () => {
    return service.approveByDirector(res.reservationId);
  };

  // Simulated Cleanup executed AFTER approval has already transitioned state
  const slaCleanup = () => {
    return service.cleanupExpiredPending(new Date('2026-10-15T12:05:00Z'));
  };

  // Step 1: Director Approves
  const approved = directorApprove();
  assert.equal(approved.status, 'APPROVED');

  // Step 2: Cleanup job runs -> sees status is APPROVED (not PENDING) -> skips it safely (0 cancelled)
  const cleanup = slaCleanup();
  assert.equal(cleanup.cancelledCount, 0);
  assert.equal(res.status, 'APPROVED');
});
