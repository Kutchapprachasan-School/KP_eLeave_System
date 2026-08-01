import test from 'node:test';
import assert from 'node:assert/strict';
import { TimetableService } from '../../src/services/timetableService.js';

// ==========================================
// 1. VERSION POINTER SWITCH EMPIRICAL TESTS
// ==========================================

test('Challenger M2 - Version Pointer Switch with Single Timetable Version', () => {
  const store = {
    versions: [
      { id: 'v-single', schoolId: 'SCH-01', academicYear: 2569, term: 1, status: 'DRAFT', isCurrentPublished: false }
    ],
    slots: [], offerings: [], rooms: []
  };
  const service = new TimetableService(store);

  // Single parameter publish
  const published = service.publishVersion('v-single');
  assert.equal(published.id, 'v-single');
  assert.equal(published.status, 'PUBLISHED');
  assert.equal(published.isCurrentPublished, true);
  assert.ok(published.updatedAt);

  // Idempotent publish of already published version
  const republish = service.publishVersion('v-single');
  assert.equal(republish.status, 'PUBLISHED');
  assert.equal(republish.isCurrentPublished, true);
});

test('Challenger M2 - Version Pointer Switch with Multiple Versions (Linear Switching)', () => {
  const store = {
    versions: [
      { id: 'v1', schoolId: 'SCH-01', academicYear: 2569, term: 1, status: 'PUBLISHED', isCurrentPublished: true },
      { id: 'v2', schoolId: 'SCH-01', academicYear: 2569, term: 1, status: 'DRAFT', isCurrentPublished: false },
      { id: 'v3', schoolId: 'SCH-01', academicYear: 2569, term: 1, status: 'ARCHIVED', isCurrentPublished: false },
      { id: 'v4', schoolId: 'SCH-01', academicYear: 2569, term: 1, status: 'DRAFT', isCurrentPublished: false }
    ],
    slots: [], offerings: [], rooms: []
  };
  const service = new TimetableService(store);

  // Switch to v2
  service.publishVersion('v2');
  assert.equal(store.versions.find(v => v.id === 'v2').status, 'PUBLISHED');
  assert.equal(store.versions.find(v => v.id === 'v2').isCurrentPublished, true);
  assert.equal(store.versions.find(v => v.id === 'v1').status, 'ARCHIVED');
  assert.equal(store.versions.find(v => v.id === 'v1').isCurrentPublished, false);
  assert.equal(store.versions.find(v => v.id === 'v3').status, 'ARCHIVED');
  assert.equal(store.versions.find(v => v.id === 'v4').status, 'DRAFT');

  // Verify exactly ONE version is current published
  const currentPublishedCount1 = store.versions.filter(v => v.isCurrentPublished).length;
  assert.equal(currentPublishedCount1, 1);

  // Switch to v4
  service.publishVersion('v4');
  assert.equal(store.versions.find(v => v.id === 'v4').status, 'PUBLISHED');
  assert.equal(store.versions.find(v => v.id === 'v4').isCurrentPublished, true);
  assert.equal(store.versions.find(v => v.id === 'v2').status, 'ARCHIVED');
  assert.equal(store.versions.find(v => v.id === 'v2').isCurrentPublished, false);

  const currentPublishedCount2 = store.versions.filter(v => v.isCurrentPublished).length;
  assert.equal(currentPublishedCount2, 1);
});

test('Challenger M2 - Version Pointer Switch Scoped Isolation (Multi-School & Multi-Year)', () => {
  const store = {
    versions: [
      { id: 'vA1', schoolId: 'SCH-A', academicYear: 2569, term: 1, status: 'PUBLISHED', isCurrentPublished: true },
      { id: 'vA2', schoolId: 'SCH-A', academicYear: 2569, term: 1, status: 'DRAFT', isCurrentPublished: false },
      { id: 'vB1', schoolId: 'SCH-B', academicYear: 2569, term: 1, status: 'PUBLISHED', isCurrentPublished: true },
      { id: 'vA3', schoolId: 'SCH-A', academicYear: 2570, term: 1, status: 'PUBLISHED', isCurrentPublished: true }
    ],
    slots: [], offerings: [], rooms: []
  };
  const service = new TimetableService(store);

  // Publish vA2 with scope matching SCH-A, year 2569, term 1
  service.publishVersion('SCH-A', 2569, 1, 'vA2');

  // SCH-A 2569 versions updated
  assert.equal(store.versions.find(v => v.id === 'vA2').status, 'PUBLISHED');
  assert.equal(store.versions.find(v => v.id === 'vA2').isCurrentPublished, true);
  assert.equal(store.versions.find(v => v.id === 'vA1').status, 'ARCHIVED');
  assert.equal(store.versions.find(v => v.id === 'vA1').isCurrentPublished, false);

  // SCH-B 2569 and SCH-A 2570 versions MUST REMAIN UNTOUCHED
  assert.equal(store.versions.find(v => v.id === 'vB1').status, 'PUBLISHED');
  assert.equal(store.versions.find(v => v.id === 'vB1').isCurrentPublished, true);
  assert.equal(store.versions.find(v => v.id === 'vA3').status, 'PUBLISHED');
  assert.equal(store.versions.find(v => v.id === 'vA3').isCurrentPublished, true);
});

test('Challenger M2 - Version Pointer Switch Error Handling', () => {
  const store = { versions: [], slots: [], offerings: [], rooms: [] };
  const service = new TimetableService(store);

  assert.throws(() => {
    service.publishVersion('non-existent');
  }, /TimetableVersion non-existent not found/);
});

// ===================================================
// 2. DOUBLE-BOOKING COLLISION PROTECTION TESTS
// ===================================================

test('Challenger M2 - Collision Protection: Offering Double-Booking', () => {
  const store = {
    versions: [],
    offerings: [
      { id: 'off-1', teacherId: 't-1', classRoomId: 'cr-1' }
    ],
    slots: [
      { id: 's1', timetableVersionId: 'v1', offeringId: 'off-1', roomId: 'r-101', dayOfWeek: 2, periodNumber: 4 }
    ],
    rooms: []
  };
  const service = new TimetableService(store);

  // Attempting to schedule off-1 again in same version, day, period (different room)
  assert.throws(() => {
    service.createOrUpdateSlot({
      timetableVersionId: 'v1',
      offeringId: 'off-1',
      roomId: 'r-102',
      dayOfWeek: 2,
      periodNumber: 4
    });
  }, /Collision Error: Offering off-1 is already scheduled on Day 2, Period 4/);
});

test('Challenger M2 - Collision Protection: Room Double-Booking', () => {
  const store = {
    versions: [],
    offerings: [
      { id: 'off-10', teacherId: 't-10', classRoomId: 'cr-10' },
      { id: 'off-11', teacherId: 't-11', classRoomId: 'cr-11' }
    ],
    slots: [
      { id: 's1', timetableVersionId: 'v1', offeringId: 'off-10', roomId: 'r-101', dayOfWeek: 3, periodNumber: 1 }
    ],
    rooms: []
  };
  const service = new TimetableService(store);

  // Attempting to schedule off-11 in room r-101 in same version, day, period
  assert.throws(() => {
    service.createOrUpdateSlot({
      timetableVersionId: 'v1',
      offeringId: 'off-11',
      roomId: 'r-101',
      dayOfWeek: 3,
      periodNumber: 1
    });
  }, /Collision Error: Room r-101 is already occupied on Day 3, Period 1/);
});

test('Challenger M2 - Collision Protection: Teacher Double-Booking', () => {
  const store = {
    versions: [],
    offerings: [
      { id: 'off-20', teacherId: 't-99', classRoomId: 'cr-20' },
      { id: 'off-21', teacherId: 't-99', classRoomId: 'cr-21' }
    ],
    slots: [
      { id: 's1', timetableVersionId: 'v1', offeringId: 'off-20', roomId: 'r-201', dayOfWeek: 1, periodNumber: 5 }
    ],
    rooms: []
  };
  const service = new TimetableService(store);

  // Attempting to schedule off-21 (same teacher t-99) in different room r-202 in same version, day, period
  assert.throws(() => {
    service.createOrUpdateSlot({
      timetableVersionId: 'v1',
      offeringId: 'off-21',
      roomId: 'r-202',
      dayOfWeek: 1,
      periodNumber: 5
    });
  }, /Collision Error: Teacher t-99 is already scheduled on Day 1, Period 5/);
});

test('Challenger M2 - Collision Protection: ClassRoom Double-Booking', () => {
  const store = {
    versions: [],
    offerings: [
      { id: 'off-30', teacherId: 't-30', classRoomId: 'cr-4A' },
      { id: 'off-31', teacherId: 't-31', classRoomId: 'cr-4A' }
    ],
    slots: [
      { id: 's1', timetableVersionId: 'v1', offeringId: 'off-30', roomId: 'r-301', dayOfWeek: 4, periodNumber: 3 }
    ],
    rooms: []
  };
  const service = new TimetableService(store);

  // Attempting to schedule off-31 (same classRoom cr-4A) in different room r-302 in same version, day, period
  assert.throws(() => {
    service.createOrUpdateSlot({
      timetableVersionId: 'v1',
      offeringId: 'off-31',
      roomId: 'r-302',
      dayOfWeek: 4,
      periodNumber: 3
    });
  }, /Collision Error: ClassRoom cr-4A is already scheduled on Day 4, Period 3/);
});

test('Challenger M2 - Collision Protection: Non-Overlapping Matrix Checks', () => {
  const store = {
    versions: [],
    offerings: [
      { id: 'off-1', teacherId: 't-1', classRoomId: 'cr-1' }
    ],
    slots: [
      { id: 's1', timetableVersionId: 'v1', offeringId: 'off-1', roomId: 'r-101', dayOfWeek: 1, periodNumber: 1 }
    ],
    rooms: []
  };
  const service = new TimetableService(store);

  // 1. Same parameters but different day -> Success
  const slotDiffDay = service.createOrUpdateSlot({
    timetableVersionId: 'v1',
    offeringId: 'off-1',
    roomId: 'r-101',
    dayOfWeek: 2,
    periodNumber: 1
  });
  assert.ok(slotDiffDay.id);

  // 2. Same parameters but different period -> Success
  const slotDiffPeriod = service.createOrUpdateSlot({
    timetableVersionId: 'v1',
    offeringId: 'off-1',
    roomId: 'r-101',
    dayOfWeek: 1,
    periodNumber: 2
  });
  assert.ok(slotDiffPeriod.id);

  // 3. Same parameters but different timetable version -> Success
  const slotDiffVersion = service.createOrUpdateSlot({
    timetableVersionId: 'v2',
    offeringId: 'off-1',
    roomId: 'r-101',
    dayOfWeek: 1,
    periodNumber: 1
  });
  assert.ok(slotDiffVersion.id);
});

test('Challenger M2 - Collision Protection: Edge Cases (Missing Offering Info / Null Fields)', () => {
  const store = {
    versions: [],
    offerings: [
      { id: 'off-no-teacher', classRoomId: 'cr-5' },
      { id: 'off-no-classroom', teacherId: 't-5' },
      { id: 'off-incomplete' }
    ],
    slots: [
      { id: 's1', timetableVersionId: 'v1', offeringId: 'off-no-teacher', roomId: 'r-1', dayOfWeek: 1, periodNumber: 1 }
    ],
    rooms: []
  };
  const service = new TimetableService(store);

  // Slot with incomplete offering details in another room should not false-trigger teacher collision
  const slot2 = service.createOrUpdateSlot({
    timetableVersionId: 'v1',
    offeringId: 'off-no-classroom',
    roomId: 'r-2',
    dayOfWeek: 1,
    periodNumber: 1
  });
  assert.ok(slot2.id);

  // Slot with offering not found in store should still enforce room and offering collisions
  assert.throws(() => {
    service.createOrUpdateSlot({
      timetableVersionId: 'v1',
      offeringId: 'off-no-teacher', // offering collision
      roomId: 'r-3',
      dayOfWeek: 1,
      periodNumber: 1
    });
  }, /Collision Error: Offering off-no-teacher is already scheduled/);
});

test('Challenger M2 - Empirical Stress & Randomized Collision Harness', () => {
  // Generate 5 teachers, 5 classrooms, 10 offerings, 5 rooms
  const teachers = Array.from({ length: 5 }, (_, i) => `t-stress-${i}`);
  const classRooms = Array.from({ length: 5 }, (_, i) => `cr-stress-${i}`);
  const offerings = Array.from({ length: 10 }, (_, i) => ({
    id: `off-stress-${i}`,
    teacherId: teachers[i % 5],
    classRoomId: classRooms[i % 5]
  }));
  const rooms = Array.from({ length: 5 }, (_, i) => `r-stress-${i}`);

  const store = { versions: [], slots: [], offerings, rooms };
  const service = new TimetableService(store);

  let successCount = 0;
  let collisionCount = 0;

  // Perform 100 random placement attempts across 2 days and 4 periods
  for (let i = 0; i < 100; i++) {
    const offering = offerings[Math.floor(Math.random() * offerings.length)];
    const room = rooms[Math.floor(Math.random() * rooms.length)];
    const day = (i % 2) + 1;
    const period = (i % 4) + 1;

    // Check manually if this placement would collide with existing store slots
    const existingSlots = store.slots.filter(s =>
      s.timetableVersionId === 'v-stress' && s.dayOfWeek === day && s.periodNumber === period
    );

    const isOfferingColliding = existingSlots.some(s => s.offeringId === offering.id);
    const isRoomColliding = existingSlots.some(s => s.roomId === room);
    const isTeacherColliding = existingSlots.some(s => {
      const sOff = offerings.find(o => o.id === s.offeringId);
      return sOff && sOff.teacherId === offering.teacherId;
    });
    const isClassRoomColliding = existingSlots.some(s => {
      const sOff = offerings.find(o => o.id === s.offeringId);
      return sOff && sOff.classRoomId === offering.classRoomId;
    });

    const expectedCollision = isOfferingColliding || isRoomColliding || isTeacherColliding || isClassRoomColliding;

    if (expectedCollision) {
      assert.throws(() => {
        service.createOrUpdateSlot({
          timetableVersionId: 'v-stress',
          offeringId: offering.id,
          roomId: room,
          dayOfWeek: day,
          periodNumber: period
        });
      }, /Collision Error/);
      collisionCount++;
    } else {
      const slot = service.createOrUpdateSlot({
        timetableVersionId: 'v-stress',
        offeringId: offering.id,
        roomId: room,
        dayOfWeek: day,
        periodNumber: period
      });
      assert.ok(slot.id);
      successCount++;
    }
  }

  assert.ok(successCount > 0, 'At least some slots were successfully scheduled');
  assert.ok(collisionCount > 0, 'At least some collisions were caught');
  assert.equal(successCount + collisionCount, 100, 'Total attempts equal 100');
});
