import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FacilityReservationService } from '../../../src/lib/services/facilityReservationService.js';

test('PostgreSQL Exclusion Mock Harness - Concurrent Booking Race Condition', async () => {
  const service = new FacilityReservationService();
  service.reservations = [];

  // Simulating 2 concurrent booking requests hitting the server at the exact same millisecond for the same room
  const requestA = async () => {
    return service.createReservation({
      resourceId: 'res-room-audi',
      reservedByUserId: 'teacher-A',
      title: 'การประชุมวิชาการ A',
      startAt: '2026-10-01T09:00:00Z',
      endAt: '2026-10-01T11:00:00Z',
      consumerModule: 'MEETING_ROOM'
    });
  };

  const requestB = async () => {
    return service.createReservation({
      resourceId: 'res-room-audi',
      reservedByUserId: 'teacher-B',
      title: 'การประชุมวิชาการ B',
      startAt: '2026-10-01T10:00:00Z',
      endAt: '2026-10-01T12:00:00Z',
      consumerModule: 'MEETING_ROOM'
    });
  };

  const results = await Promise.allSettled([requestA(), requestB()]);

  const fulfilled = results.filter(r => r.status === 'fulfilled');
  const rejected = results.filter(r => r.status === 'rejected');

  // In zero-race concurrency, exactly 1 must succeed and 1 must fail with conflict
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.match(rejected[0].reason.message, /ทรัพยากรถูกจองในช่วงเวลาดังกล่าวแล้ว/);
});

test('PostgreSQL Exclusion Mock Harness - Concurrent Driver Assignment Collision across 2 Vehicles', async () => {
  const service = new FacilityReservationService();
  service.reservations = [];

  // Driver Somchai is assigned to Bus 1
  const busBooking = service.createReservation({
    resourceId: 'res-veh-bus',
    reservedByUserId: 'teacher-1',
    title: 'พานักเรียนไปแข่งขันกีฬา',
    startAt: '2026-10-05T08:00:00Z',
    endAt: '2026-10-05T16:00:00Z',
    consumerModule: 'VEHICLE',
    vehicleDetails: { driverProfileId: 'driver-somchai' }
  });
  assert.equal(busBooking.status, 'PENDING');

  // Concurrent request for Van 1 requesting the SAME Driver Somchai at the same time
  assert.throws(() => {
    service.createReservation({
      resourceId: 'res-veh-van1',
      reservedByUserId: 'teacher-2',
      title: 'ไปส่งเอกสารเขตพื้นที่',
      startAt: '2026-10-05T09:00:00Z',
      endAt: '2026-10-05T12:00:00Z',
      consumerModule: 'VEHICLE',
      vehicleDetails: { driverProfileId: 'driver-somchai' }
    });
  }, /พนักงานขับรถท่านนี้มีภารกิจขับรถคันอื่นในช่วงเวลาดังกล่าวแล้ว/);
});

test('PostgreSQL Half-Open Interval Boundary Invariant - Adjacent Time Slots', () => {
  const service = new FacilityReservationService();
  service.reservations = [];

  // Booking 1: 09:00 - 10:00
  const b1 = service.createReservation({
    resourceId: 'res-room-audi',
    reservedByUserId: 'teacher-1',
    title: 'คาบเช้า 1',
    startAt: '2026-10-10T09:00:00Z',
    endAt: '2026-10-10T10:00:00Z'
  });

  // Booking 2: 10:00 - 11:00 (Starts exactly when Booking 1 ends)
  const b2 = service.createReservation({
    resourceId: 'res-room-audi',
    reservedByUserId: 'teacher-2',
    title: 'คาบเช้า 2',
    startAt: '2026-10-10T10:00:00Z',
    endAt: '2026-10-10T11:00:00Z'
  });

  assert.ok(b1);
  assert.ok(b2);
  assert.equal(service.reservations.length, 2);
});
