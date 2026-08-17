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

test('AvailabilityService - does not filter out teacher whose leave is PENDING or REJECTED', () => {
  const store = {
    slots: [],
    offerings: [],
    leaves: [
      { id: 'l1', teacherId: 't1', status: 'PENDING', startDate: '2026-07-27', endDate: '2026-07-28' },
      { id: 'l2', teacherId: 't2', status: 'REJECTED', startDate: '2026-07-27', endDate: '2026-07-28' }
    ]
  };

  const service = new AvailabilityService(store);
  assert.equal(service.isTeacherAvailable('t1', '2026-07-27', 1, 1, 'v1'), true);
  assert.equal(service.isTeacherAvailable('t2', '2026-07-27', 1, 1, 'v1'), true);
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

test('AvailabilityService - respects timetableVersionId filtering on slot booking', () => {
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
  // Checked against v2 where slot is not booked
  const isAvailableV2 = service.isTeacherAvailable('t2', '2026-07-27', 1, 2, 'v2');
  assert.equal(isAvailableV2, true);
});

test('AvailabilityService - filters out teacher who is actively covering a substitute slot (ASSIGNED or ACKNOWLEDGED)', () => {
  const store = {
    slots: [
      { id: 's10', timetableVersionId: 'v1', offeringId: 'off-10', dayOfWeek: 1, periodNumber: 3 }
    ],
    offerings: [],
    leaves: [],
    workflows: [
      {
        id: 'wf-1',
        assignedTeacherId: 't-sub1',
        status: 'ASSIGNED',
        date: '2026-07-27',
        timetableSlotId: 's10'
      },
      {
        id: 'wf-2',
        assignedTeacherId: 't-sub2',
        status: 'ACKNOWLEDGED',
        date: '2026-07-27',
        periodNumber: 4
      },
      {
        id: 'wf-3',
        assignedTeacherId: 't-sub3',
        status: 'REJECTED',
        date: '2026-07-27',
        periodNumber: 3
      }
    ]
  };

  const service = new AvailabilityService(store);

  // t-sub1 is ASSIGNED on date 2026-07-27, slot s10 (Day 1, Period 3) -> busy
  assert.equal(service.isTeacherAvailable('t-sub1', '2026-07-27', 1, 3, 'v1'), false);

  // t-sub1 is FREE on period 4
  assert.equal(service.isTeacherAvailable('t-sub1', '2026-07-27', 1, 4, 'v1'), true);

  // t-sub2 is ACKNOWLEDGED on period 4 -> busy
  assert.equal(service.isTeacherAvailable('t-sub2', '2026-07-27', 1, 4, 'v1'), false);

  // t-sub3 REJECTED the assignment -> free
  assert.equal(service.isTeacherAvailable('t-sub3', '2026-07-27', 1, 3, 'v1'), true);
});

test('AvailabilityService - returns true for free teacher', () => {
  const store = {
    offerings: [],
    slots: [],
    leaves: [],
    workflows: []
  };

  const service = new AvailabilityService(store);
  const isAvailable = service.isTeacherAvailable('t3', '2026-07-27', 1, 2, 'v1');

  assert.equal(isAvailable, true);
});

test('AvailabilityService - getAvailableSubstitutes with CENTRALIZED policy returns all free teachers', () => {
  const teachers = [
    { id: 't1', name: 'ครู ก', departmentId: 'DEP-MATH' },
    { id: 't2', name: 'ครู ข', departmentId: 'DEP-SCI' },
    { id: 't3', name: 'ครู ค (ติดสอน)', departmentId: 'DEP-MATH' }
  ];

  const store = {
    offerings: [{ id: 'off-3', teacherId: 't3' }],
    slots: [{ id: 's1', timetableVersionId: 'v1', offeringId: 'off-3', dayOfWeek: 1, periodNumber: 2 }],
    leaves: [],
    workflows: [],
    teachers
  };

  const service = new AvailabilityService(store);
  const available = service.getAvailableSubstitutes({
    date: '2026-07-27', // Monday (dayOfWeek = 1)
    period: 2,
    departmentId: 'DEP-MATH',
    policy: 'CENTRALIZED',
    timetableVersionId: 'v1',
    teachers
  });

  assert.equal(available.length, 2);
  assert.deepEqual(available.map(t => t.id), ['t1', 't2']);
});

test('AvailabilityService - getAvailableSubstitutes with DEPARTMENT policy returns only same-department free teachers', () => {
  const teachers = [
    { id: 't1', name: 'ครู ก', departmentId: 'DEP-MATH' },
    { id: 't2', name: 'ครู ข', departmentId: 'DEP-SCI' },
    { id: 't3', name: 'ครู ค', departmentId: 'DEP-MATH' }
  ];

  const store = {
    offerings: [],
    slots: [],
    leaves: [],
    workflows: [],
    teachers
  };

  const service = new AvailabilityService(store);
  const available = service.getAvailableSubstitutes({
    date: '2026-07-27',
    period: 1,
    departmentId: 'DEP-MATH',
    policy: 'DEPARTMENT',
    teachers
  });

  assert.equal(available.length, 2);
  assert.deepEqual(available.map(t => t.id), ['t1', 't3']);
});

test('AvailabilityService - getAvailableSubstitutes with HYBRID policy uses department first, fallbacks to all when empty', () => {
  const teachers = [
    { id: 't1', name: 'ครู ก', departmentId: 'DEP-MATH' },
    { id: 't2', name: 'ครู ข', departmentId: 'DEP-SCI' },
    { id: 't3', name: 'ครู ค', departmentId: 'DEP-EN' }
  ];

  const store = {
    offerings: [],
    slots: [],
    leaves: [],
    workflows: [],
    teachers
  };

  const service = new AvailabilityService(store);

  // Case 1: Department has available teachers (DEP-MATH) -> returns t1
  const result1 = service.getAvailableSubstitutes({
    date: '2026-07-27',
    period: 1,
    departmentId: 'DEP-MATH',
    policy: 'HYBRID',
    teachers
  });
  assert.equal(result1.length, 1);
  assert.equal(result1[0].id, 't1');

  // Case 2: Department has NO available teachers (DEP-SOC) -> fallbacks to all free teachers (t1, t2, t3)
  const result2 = service.getAvailableSubstitutes({
    date: '2026-07-27',
    period: 1,
    departmentId: 'DEP-SOC',
    policy: 'HYBRID',
    teachers
  });
  assert.equal(result2.length, 3);
  assert.deepEqual(result2.map(t => t.id), ['t1', 't2', 't3']);
});
