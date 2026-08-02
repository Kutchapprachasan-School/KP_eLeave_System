import test from 'node:test';
import assert from 'node:assert/strict';
import { TeacherTimelineService, TeacherCapacityEngine, GenericResourcePlatform } from '../../../src/lib/services/sropCoreService.js';

test('TeacherTimelineService - emits and filters events across modules correctly', () => {
  const service = new TeacherTimelineService();

  service.emitEvent({
    teacherId: 't1',
    eventType: 'LEAVE_APPROVED',
    title: 'ลากิจ',
    startTime: '2026-08-03T08:30:00Z',
    endTime: '2026-08-03T16:30:00Z',
    sourceModule: 'eLeave'
  });

  service.emitEvent({
    teacherId: 't1',
    eventType: 'TIMETABLE_TEACHING',
    title: 'คณิตศาสตร์ 5',
    startTime: '2026-08-04T08:30:00Z',
    endTime: '2026-08-04T09:20:00Z',
    sourceModule: 'Timetable'
  });

  const timeline = service.getTeacherTimeline('t1', '2026-08-01', '2026-08-05');
  assert.equal(timeline.length, 2);
  assert.equal(timeline[0].sourceModule, 'eLeave');
  assert.equal(timeline[1].sourceModule, 'Timetable');
});

test('TeacherCapacityEngine - calculates 360-degree remaining capacity percentage correctly', () => {
  const capacity = TeacherCapacityEngine.calculateCapacityIndex({
    teacherId: 't1',
    weeklyTeachingHours: 18,
    meetingHours: 4,
    committeeHours: 2,
    substituteHours: 2,
    homeroomHours: 2,
    counselingHours: 2,
    otherDutyHours: 0,
    maxWeeklyCapacityHours: 40
  });

  // Total duty hours = 18+4+2+2+2+2 = 30 hours
  // Remaining = 40 - 30 = 10 hours -> (10/40)*100 = 25%
  assert.equal(capacity.totalDutyHours, 30);
  assert.equal(capacity.remainingCapacityPercent, 25);
});

test('GenericResourcePlatform - detects reservation conflict and prevents double booking', () => {
  const platform = new GenericResourcePlatform();

  platform.reserveResource({
    resourceId: 'room-lab-1',
    consumerModule: 'Timetable',
    reservedByUserId: 'admin-1',
    startTime: '2026-08-03T09:00:00Z',
    endTime: '2026-08-03T10:00:00Z'
  });

  assert.equal(platform.hasConflict('room-lab-1', '2026-08-03T09:30:00Z', '2026-08-03T10:30:00Z'), true);
  assert.throws(() => {
    platform.reserveResource({
      resourceId: 'room-lab-1',
      consumerModule: 'Meeting',
      reservedByUserId: 'user-2',
      startTime: '2026-08-03T09:30:00Z',
      endTime: '2026-08-03T10:30:00Z'
    });
  }, /ถูกจองในช่วงเวลาดังกล่าวแล้ว/);
});
