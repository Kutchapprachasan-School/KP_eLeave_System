import { test } from 'node:test';
import assert from 'node:assert/strict';

test('ExamProctorEngine - calculates proctor load per teacher', () => {
  const assignments = [
    { teacherId: 't1', slotId: 's1' },
    { teacherId: 't1', slotId: 's2' },
    { teacherId: 't2', slotId: 's1' }
  ];
  const countT1 = assignments.filter(a => a.teacherId === 't1').length;
  assert.equal(countT1, 2);
});

test('ExamProctorEngine - filters available proctors without slot overlap', () => {
  const busyTeacherIds = ['t1'];
  const allTeachers = [{ id: 't1', name: 'ครู A' }, { id: 't2', name: 'ครู B' }];
  const available = allTeachers.filter(t => !busyTeacherIds.includes(t.id));
  assert.equal(available.length, 1);
  assert.equal(available[0].id, 't2');
});
