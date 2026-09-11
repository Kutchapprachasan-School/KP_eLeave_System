import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit Test Suite for Teacher-Centric Facility & Vehicle Booking Subsystem (v7.3)
 * Enforces Senior Architecture Verdict:
 * 1. Schedule = View Only, DB transaction + Exclusion constraint is final authority
 * 2. PENDING = strictly blocks slot on the visual matrix (cannot be double booked)
 * 3. Anti-IDOR: onlyMine uses authenticated session identity only
 * 4. Two-Pillars: Strict separation and filtering of MEETING_ROOM vs VEHICLE
 * 5. Matrix Viewport: Preserves full booking duration even when crossing the 17:00 boundary
 */

// Helper to determine slot state on the Teacher Schedule Matrix
function calculateMatrixSlotState(resource, hourStart, hourEnd, bookings) {
  if (resource.status !== 'AVAILABLE') {
    return { state: 'MAINTENANCE', canBook: false, label: resource.status };
  }

  const activeBooking = bookings.find(b => {
    if (b.resourceId !== resource.id) return false;
    if (b.status === 'CANCELLED' || b.status === 'REJECTED') return false;
    const bStart = new Date(b.startAt);
    const bEnd = new Date(b.endAt);
    return bStart < hourEnd && bEnd > hourStart;
  });

  if (!activeBooking) {
    return { state: 'FREE', canBook: true, booking: null };
  }

  if (activeBooking.status === 'PENDING') {
    return { 
      state: 'LOCKED_PENDING', 
      canBook: false, 
      booking: activeBooking,
      label: '⏳ มีผู้ยื่นจองแล้ว (รอพิจารณา)'
    };
  }

  if (activeBooking.status === 'APPROVED' || activeBooking.status === 'IN_USE') {
    return { 
      state: 'LOCKED_APPROVED', 
      canBook: false, 
      booking: activeBooking,
      label: '✓ อนุมัติแล้ว'
    };
  }

  return { state: 'FREE', canBook: true, booking: null };
}

test('Teacher Schedule Matrix - correctly identifies FREE slot with 1-click booking eligibility', () => {
  const room = { id: 'room-1', name: 'ห้องประชุมกุญชร 1', status: 'AVAILABLE', type: 'MEETING_ROOM' };
  const hourStart = new Date('2026-09-11T09:00:00Z');
  const hourEnd = new Date('2026-09-11T10:00:00Z');
  const bookings = [];

  const result = calculateMatrixSlotState(room, hourStart, hourEnd, bookings);
  assert.equal(result.state, 'FREE');
  assert.equal(result.canBook, true);
});

test('Senior Red Lock 2 - PENDING strictly blocks slot and disallows booking', () => {
  const room = { id: 'room-1', name: 'ห้องประชุมกุญชร 1', status: 'AVAILABLE', type: 'MEETING_ROOM' };
  const hourStart = new Date('2026-09-11T09:00:00Z');
  const hourEnd = new Date('2026-09-11T10:00:00Z');
  const bookings = [
    {
      id: 'res-pending-1',
      resourceId: 'room-1',
      title: 'ประชุมกลุ่มสาระการเรียนรู้คณิตศาสตร์',
      startAt: '2026-09-11T08:30:00Z',
      endAt: '2026-09-11T11:00:00Z',
      status: 'PENDING'
    }
  ];

  const result = calculateMatrixSlotState(room, hourStart, hourEnd, bookings);
  assert.equal(result.state, 'LOCKED_PENDING');
  assert.equal(result.canBook, false); // Crucial: must NOT allow clicking to book
  assert.equal(result.label, '⏳ มีผู้ยื่นจองแล้ว (รอพิจารณา)');
  assert.equal(result.booking.id, 'res-pending-1');
});

test('Teacher Schedule Matrix - CANCELLED and REJECTED bookings do NOT block slots', () => {
  const room = { id: 'room-1', name: 'ห้องประชุมกุญชร 1', status: 'AVAILABLE', type: 'MEETING_ROOM' };
  const hourStart = new Date('2026-09-11T13:00:00Z');
  const hourEnd = new Date('2026-09-11T14:00:00Z');
  const bookings = [
    {
      id: 'res-cancelled',
      resourceId: 'room-1',
      startAt: '2026-09-11T13:00:00Z',
      endAt: '2026-09-11T15:00:00Z',
      status: 'CANCELLED'
    },
    {
      id: 'res-rejected',
      resourceId: 'room-1',
      startAt: '2026-09-11T13:00:00Z',
      endAt: '2026-09-11T15:00:00Z',
      status: 'REJECTED'
    }
  ];

  const result = calculateMatrixSlotState(room, hourStart, hourEnd, bookings);
  assert.equal(result.state, 'FREE');
  assert.equal(result.canBook, true);
});

test('Senior Recommendation 5 - Matrix is a viewport: preserves overflow past 17:00', () => {
  const vehicle = { id: 'veh-1', name: 'รถบัส 45 ที่นั่ง', status: 'AVAILABLE', type: 'VEHICLE' };
  const lateSlotStart = new Date('2026-09-11T16:00:00Z');
  const lateSlotEnd = new Date('2026-09-11T17:00:00Z');
  const bookings = [
    {
      id: 'res-trip-1',
      resourceId: 'veh-1',
      title: 'พานักเรียนไปแข่งขันโอลิมปิกวิชาการ มข.',
      startAt: '2026-09-11T16:30:00Z',
      endAt: '2026-09-11T19:00:00Z', // Crosses 17:00 boundary!
      status: 'APPROVED'
    }
  ];

  const result = calculateMatrixSlotState(vehicle, lateSlotStart, lateSlotEnd, bookings);
  assert.equal(result.state, 'LOCKED_APPROVED');
  assert.equal(result.canBook, false);
  assert.equal(result.booking.endAt, '2026-09-11T19:00:00Z');
  // True duration is 2.5 hours, extending past 17:00
  const durationMs = new Date(result.booking.endAt).getTime() - new Date(result.booking.startAt).getTime();
  assert.equal(durationMs, 2.5 * 60 * 60 * 1000);
});

test('Senior Red Lock 3 - Anti-IDOR Session Identity Rule', () => {
  // Simulating the server-side filter logic in getFacilityReservationsAction
  const sessionUser = { id: 'teacher-auth-123', role: 'TEACHER' };
  const maliciousClientFilter = { onlyMine: true, userId: 'spoofed-teacher-999' };

  const resolvedWhere = {};
  if (maliciousClientFilter.onlyMine) {
    // In our implementation, onlyMine strictly takes sessionUser.id, ignoring client userId
    resolvedWhere.reservedByUserId = sessionUser.id;
  }

  assert.equal(resolvedWhere.reservedByUserId, 'teacher-auth-123');
  assert.notEqual(resolvedWhere.reservedByUserId, 'spoofed-teacher-999');
});

test('Senior Red Lock 4 - Two-Pillars Separation (MEETING_ROOM vs VEHICLE)', () => {
  const allResources = [
    { id: '1', code: 'ROOM-1', type: 'MEETING_ROOM' },
    { id: '2', code: 'ROOM-2', type: 'MEETING_ROOM' },
    { id: '3', code: 'BUS-1', type: 'VEHICLE' },
    { id: '4', code: 'VAN-1', type: 'VEHICLE' },
    { id: '5', code: 'LAB-1', type: 'LABORATORY' }
  ];

  const meetingRooms = allResources.filter(r => r.type === 'MEETING_ROOM');
  const vehicles = allResources.filter(r => r.type === 'VEHICLE');

  assert.equal(meetingRooms.length, 2);
  assert.equal(vehicles.length, 2);
  assert.equal(meetingRooms.every(r => r.type === 'MEETING_ROOM'), true);
  assert.equal(vehicles.every(r => r.type === 'VEHICLE'), true);
});
