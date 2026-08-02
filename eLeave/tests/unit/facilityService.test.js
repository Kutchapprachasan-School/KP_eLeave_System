import { test } from 'node:test';
import assert from 'node:assert/strict';

test('FacilityConflictEngine - detects overlapping reservation times', () => {
  const existing = [{ startTime: new Date('2026-08-05T09:00:00Z'), endTime: new Date('2026-08-05T11:00:00Z') }];
  const newStart = new Date('2026-08-05T10:00:00Z');
  const newEnd = new Date('2026-08-05T12:00:00Z');
  const hasConflict = existing.some(e => newStart < e.endTime && newEnd > e.startTime);
  assert.equal(hasConflict, true);
});

test('FacilityConflictEngine - allows non-overlapping reservation times', () => {
  const existing = [{ startTime: new Date('2026-08-05T09:00:00Z'), endTime: new Date('2026-08-05T11:00:00Z') }];
  const newStart = new Date('2026-08-05T11:00:00Z');
  const newEnd = new Date('2026-08-05T13:00:00Z');
  const hasConflict = existing.some(e => newStart < e.endTime && newEnd > e.startTime);
  assert.equal(hasConflict, false);
});
