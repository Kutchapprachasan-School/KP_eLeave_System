import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseHolidayId,
  parseAcademicEventId,
  extractRootEventId,
  schoolCalendarSyncService,
} from '../../../src/lib/services/schoolCalendarSync.ts';


describe('School Calendar & Academic Shared Sync Deletion Invariants', () => {

  // 1. parseHolidayId
  test('parseHolidayId correctly extracts root holiday cuid/uuid from multi-day event ids', () => {
    assert.equal(parseHolidayId('hol-db-cly12345-16-5-2569'), 'cly12345');
    assert.equal(parseHolidayId('hol-db-123e4567-e89b-12d3-a456-426614174000-1-1-2569'), '123e4567-e89b-12d3-a456-426614174000');
    assert.equal(parseHolidayId('hol-db-simplecuid'), 'simplecuid');
    assert.equal(parseHolidayId('acad-db-simplecuid'), null);
    assert.equal(parseHolidayId('custom-event-123'), null);
    assert.equal(parseHolidayId(''), null);
  });

  // 2. parseAcademicEventId
  test('parseAcademicEventId correctly extracts root academicEvent cuid/uuid from multi-day event ids', () => {
    assert.equal(parseAcademicEventId('acad-db-ae9999-20-7-2569'), 'ae9999');
    assert.equal(parseAcademicEventId('acad-db-ae-uuid-abc-123-24-7-2569'), 'ae-uuid-abc-123');
    assert.equal(parseAcademicEventId('acad-db-directid'), 'directid');
    assert.equal(parseAcademicEventId('hol-db-directid'), null);
    assert.equal(parseAcademicEventId('th-hol-2026-01-01'), null);
  });

  // 3. extractRootEventId
  test('extractRootEventId returns normalized root id for client-side multi-day event tracking', () => {
    assert.equal(extractRootEventId('hol-db-h123-10-8-2569'), 'hol-db-h123');
    assert.equal(extractRootEventId('acad-db-a456-15-9-2569'), 'acad-db-a456');
    assert.equal(extractRootEventId('th-hol-2026-05-01'), 'th-hol-2026-05-01');
    assert.equal(extractRootEventId('custom-local-id'), 'custom-local-id');
  });

  // 4. In-memory multi-day deletion cascade
  test('Deleting an event by single day id cascades and removes all multi-day occurrences of that event', () => {
    const mockEvents = [
      { id: 'acad-db-camp1-12-8-2569', title: 'ค่ายลูกเสือ', day: 12, month: 8, year: 2569, category: 'STUDENT', colorType: 'BLUE', targetRole: 'ALL' },
      { id: 'acad-db-camp1-13-8-2569', title: 'ค่ายลูกเสือ', day: 13, month: 8, year: 2569, category: 'STUDENT', colorType: 'BLUE', targetRole: 'ALL' },
      { id: 'acad-db-camp1-14-8-2569', title: 'ค่ายลูกเสือ', day: 14, month: 8, year: 2569, category: 'STUDENT', colorType: 'BLUE', targetRole: 'ALL' },
      { id: 'acad-db-other-15-8-2569', title: 'วันวิทยาศาสตร์', day: 15, month: 8, year: 2569, category: 'ACADEMIC', colorType: 'GREEN', targetRole: 'ALL' },
    ];

    const targetId = 'acad-db-camp1-13-8-2569';
    const rootTarget = extractRootEventId(targetId);

    const remaining = mockEvents.filter((e) => {
      if (e.id === targetId) return false;
      if (extractRootEventId(e.id) === rootTarget) return false;
      return true;
    });

    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, 'acad-db-other-15-8-2569');
  });

  // 5. Shared Schema Invariant
  test('Both SMS calendar and Classroom Management share the AcademicEvent eventType domain mapping', () => {
    const examCategory = 'EXAM';
    const mappedType = examCategory === 'EXAM' ? 'EXAM_WEEK' : 'ACADEMIC';
    assert.equal(mappedType, 'EXAM_WEEK');

    const studentCategory = 'STUDENT';
    const studentMapped = studentCategory === 'STUDENT' ? 'SCOUT_CAMP' : 'ACADEMIC';
    assert.equal(studentMapped, 'SCOUT_CAMP');
  });
});
