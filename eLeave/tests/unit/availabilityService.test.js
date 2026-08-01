import test from 'node:test';
import assert from 'node:assert/strict';
import { AvailabilityService } from '../../src/services/availabilityService.js';

test('AvailabilityService - filters out teacher who is on approved leave', () => {
  const store = {
    slots: [],
    offerings: [],
    leaves: [
      { id: 'l1', teacherId: 't1', status: 'APPROVED', startDate: '2026-07-27', endDate: '2026-07-28' }
    ]
  };

  const service = new AvailabilityService(store);
  const isAvailable = service.isTeacherAvailable('t1', '2026-07-27', 1, 1, 'v1');

  assert.equal(isAvailable, false);
});

test('AvailabilityService - filters out teacher who has a booked timetable slot', () => {
  const store = {
    offerings: [
      { id: 'off-1', teacherId: 't2' }
    ],
    slots: [
      { id: 's1', timetableVersionId: 'v1', offeringId: 'off-1', dayOfWeek: 1, periodNumber: 2 }
    ],
    leaves: []
  };

  const service = new AvailabilityService(store);
  const isAvailable = service.isTeacherAvailable('t2', '2026-07-27', 1, 2, 'v1');

  assert.equal(isAvailable, false);
});

test('AvailabilityService - returns true for free teacher', () => {
  const store = {
    offerings: [],
    slots: [],
    leaves: []
  };

  const service = new AvailabilityService(store);
  const isAvailable = service.isTeacherAvailable('t3', '2026-07-27', 1, 2, 'v1');

  assert.equal(isAvailable, true);
});
