import test from 'node:test';
import assert from 'node:assert/strict';
import { TimetableService } from '../../src/services/timetableService.js';

test('TimetableService - Version Pointer Switch correctly publishes target and archives old version (4-param signature)', () => {
  const store = {
    versions: [
      { id: 'v1', schoolId: 'SCH-01', academicYear: 2569, term: 1, status: 'PUBLISHED', isCurrentPublished: true },
      { id: 'v2', schoolId: 'SCH-01', academicYear: 2569, term: 1, status: 'DRAFT', isCurrentPublished: false }
    ],
    slots: [],
    offerings: [],
    rooms: []
  };

  const service = new TimetableService(store);
  const published = service.publishVersion('SCH-01', 2569, 1, 'v2');

  assert.equal(published.id, 'v2');
  assert.equal(published.status, 'PUBLISHED');
  assert.equal(published.isCurrentPublished, true);

  const v1 = store.versions.find(v => v.id === 'v1');
  assert.equal(v1.status, 'ARCHIVED');
  assert.equal(v1.isCurrentPublished, false);
});

test('TimetableService - Version Pointer Switch publishVersion(versionId) single-parameter switch', () => {
  const store = {
    versions: [
      { id: 'v1', schoolId: 'SCH-01', academicYear: 2569, term: 1, status: 'PUBLISHED', isCurrentPublished: true },
      { id: 'v2', schoolId: 'SCH-01', academicYear: 2569, term: 1, status: 'DRAFT', isCurrentPublished: false },
      { id: 'v3', schoolId: 'SCH-01', academicYear: 2569, term: 1, status: 'DRAFT', isCurrentPublished: false }
    ],
    slots: [],
    offerings: [],
    rooms: []
  };

  const service = new TimetableService(store);
  const published = service.publishVersion('v2');

  assert.equal(published.id, 'v2');
  assert.equal(published.status, 'PUBLISHED');
  assert.equal(published.isCurrentPublished, true);

  const v1 = store.versions.find(v => v.id === 'v1');
  assert.equal(v1.status, 'ARCHIVED');
  assert.equal(v1.isCurrentPublished, false);

  const v3 = store.versions.find(v => v.id === 'v3');
  assert.equal(v3.status, 'DRAFT');
  assert.equal(v3.isCurrentPublished, false);
});

test('TimetableService - Version Pointer Switch throws error when target versionId does not exist', () => {
  const store = {
    versions: [
      { id: 'v1', schoolId: 'SCH-01', academicYear: 2569, term: 1, status: 'DRAFT', isCurrentPublished: false }
    ],
    slots: [],
    offerings: [],
    rooms: []
  };

  const service = new TimetableService(store);

  assert.throws(() => {
    service.publishVersion('non-existent-version');
  }, /TimetableVersion non-existent-version not found/);
});

test('TimetableService - Collision Protection prevents double booking of Offering in same Day & Period', () => {
  const store = {
    versions: [],
    slots: [
      { id: 's1', timetableVersionId: 'v1', offeringId: 'off-101', roomId: 'r-301', dayOfWeek: 1, periodNumber: 2 }
    ],
    offerings: [],
    rooms: []
  };

  const service = new TimetableService(store);

  assert.throws(() => {
    service.createOrUpdateSlot({
      timetableVersionId: 'v1',
      offeringId: 'off-101',
      roomId: 'r-302',
      dayOfWeek: 1,
      periodNumber: 2
    });
  }, /Collision Error: Offering off-101 is already scheduled/);
});

test('TimetableService - Collision Protection prevents double booking of Room in same Day & Period', () => {
  const store = {
    versions: [],
    slots: [
      { id: 's1', timetableVersionId: 'v1', offeringId: 'off-101', roomId: 'r-301', dayOfWeek: 1, periodNumber: 2 }
    ],
    offerings: [],
    rooms: []
  };

  const service = new TimetableService(store);

  assert.throws(() => {
    service.createOrUpdateSlot({
      timetableVersionId: 'v1',
      offeringId: 'off-102',
      roomId: 'r-301',
      dayOfWeek: 1,
      periodNumber: 2
    });
  }, /Collision Error: Room r-301 is already occupied/);
});

test('TimetableService - Collision Protection prevents double booking of Teacher via offering lookup in same Day & Period', () => {
  const store = {
    versions: [],
    offerings: [
      { id: 'off-101', teacherId: 't-101', classRoomId: 'cr-301' },
      { id: 'off-102', teacherId: 't-101', classRoomId: 'cr-302' }
    ],
    slots: [
      { id: 's1', timetableVersionId: 'v1', offeringId: 'off-101', roomId: 'r-301', dayOfWeek: 1, periodNumber: 2 }
    ],
    rooms: []
  };

  const service = new TimetableService(store);

  assert.throws(() => {
    service.createOrUpdateSlot({
      timetableVersionId: 'v1',
      offeringId: 'off-102',
      roomId: 'r-302',
      dayOfWeek: 1,
      periodNumber: 2
    });
  }, /Collision Error: Teacher t-101 is already scheduled/);
});

test('TimetableService - Collision Protection prevents double booking of ClassRoom via offering lookup in same Day & Period', () => {
  const store = {
    versions: [],
    offerings: [
      { id: 'off-101', teacherId: 't-101', classRoomId: 'cr-301' },
      { id: 'off-103', teacherId: 't-102', classRoomId: 'cr-301' }
    ],
    slots: [
      { id: 's1', timetableVersionId: 'v1', offeringId: 'off-101', roomId: 'r-301', dayOfWeek: 1, periodNumber: 2 }
    ],
    rooms: []
  };

  const service = new TimetableService(store);

  assert.throws(() => {
    service.createOrUpdateSlot({
      timetableVersionId: 'v1',
      offeringId: 'off-103',
      roomId: 'r-302',
      dayOfWeek: 1,
      periodNumber: 2
    });
  }, /Collision Error: ClassRoom cr-301 is already scheduled/);
});

test('TimetableService - Allows updating an existing slot without self-collision', () => {
  const store = {
    versions: [],
    offerings: [
      { id: 'off-101', teacherId: 't-101', classRoomId: 'cr-301' }
    ],
    slots: [
      { id: 's1', timetableVersionId: 'v1', offeringId: 'off-101', roomId: 'r-301', dayOfWeek: 1, periodNumber: 2 }
    ],
    rooms: []
  };

  const service = new TimetableService(store);

  const updatedSlot = service.createOrUpdateSlot({
    id: 's1',
    timetableVersionId: 'v1',
    offeringId: 'off-101',
    roomId: 'r-302',
    dayOfWeek: 1,
    periodNumber: 2
  });

  assert.equal(updatedSlot.id, 's1');
  assert.equal(updatedSlot.roomId, 'r-302');
  assert.equal(store.slots.length, 1);
});

test('TimetableService - Allows scheduling same offering/room in different periods or timetable versions', () => {
  const store = {
    versions: [],
    offerings: [
      { id: 'off-101', teacherId: 't-101', classRoomId: 'cr-301' }
    ],
    slots: [
      { id: 's1', timetableVersionId: 'v1', offeringId: 'off-101', roomId: 'r-301', dayOfWeek: 1, periodNumber: 2 }
    ],
    rooms: []
  };

  const service = new TimetableService(store);

  // Different period
  const slotPeriod3 = service.createOrUpdateSlot({
    timetableVersionId: 'v1',
    offeringId: 'off-101',
    roomId: 'r-301',
    dayOfWeek: 1,
    periodNumber: 3
  });
  assert.equal(slotPeriod3.periodNumber, 3);

  // Different timetable version
  const slotV2 = service.createOrUpdateSlot({
    timetableVersionId: 'v2',
    offeringId: 'off-101',
    roomId: 'r-301',
    dayOfWeek: 1,
    periodNumber: 2
  });
  assert.equal(slotV2.timetableVersionId, 'v2');
});

test('TimetableService - Correctly filters available teachers for a slot', () => {
  const allTeachers = [
    { id: 't1', name: 'ครูสมชาย' },
    { id: 't2', name: 'ครูสมหญิง' },
    { id: 't3', name: 'ครูวิชัย' }
  ];

  const store = {
    versions: [],
    offerings: [
      { id: 'off-1', teacherId: 't1' },
      { id: 'off-2', teacherId: 't2' }
    ],
    slots: [
      { id: 's1', timetableVersionId: 'v1', offeringId: 'off-1', roomId: 'r-101', dayOfWeek: 1, periodNumber: 3 }
    ],
    rooms: []
  };

  const service = new TimetableService(store);
  const available = service.getAvailableTeachers('v1', 1, 3, allTeachers);

  assert.equal(available.length, 2);
  assert.deepEqual(available.map(t => t.id), ['t2', 't3']);
});

test('TimetableService - Direct Move Mode flags collision warning instead of throwing when allowCollisionWarning is true', () => {
  const store = {
    versions: [],
    offerings: [
      { id: 'off-101', teacherId: 't-101', classRoomId: 'cr-301' },
      { id: 'off-102', teacherId: 't-102', classRoomId: 'cr-302' }
    ],
    slots: [
      { id: 's1', timetableVersionId: 'v1', offeringId: 'off-101', roomId: 'r-301', dayOfWeek: 1, periodNumber: 2 },
      { id: 's2', timetableVersionId: 'v1', offeringId: 'off-102', roomId: 'r-302', dayOfWeek: 1, periodNumber: 5 }
    ],
    rooms: []
  };

  const service = new TimetableService(store);

  // Directly move s2 to Day 1, Period 2 into Room r-301 (Collision with s1)
  const movedSlot = service.directMoveSlot('s2', 1, 2, 'r-301');

  assert.equal(movedSlot.id, 's2');
  assert.equal(movedSlot.dayOfWeek, 1);
  assert.equal(movedSlot.periodNumber, 2);
  assert.equal(movedSlot.hasCollision, true);
  assert.ok(movedSlot.collisionWarning.includes('Room r-301 is already occupied'));

  // Get collision list for version
  const collisionSlots = service.getCollisionSlots('v1');
  assert.equal(collisionSlots.length, 1);
  assert.equal(collisionSlots[0].id, 's2');
});

