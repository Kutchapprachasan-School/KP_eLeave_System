import test from 'node:test';
import assert from 'node:assert/strict';
import { ExamService } from '../../../src/lib/services/examService.js';

test('ExamService - generates exam timetable slots correctly', () => {
  const offerings = [
    { subjectCode: 'ว23101', subjectName: 'วิทยาศาสตร์ 5', targetClassrooms: ['ม.3/1'] },
    { subjectCode: 'ค23101', subjectName: 'คณิตศาสตร์ 5', targetClassrooms: ['ม.3/1'] }
  ];

  const slots = ExamService.generateExamSlots(offerings, 2);
  assert.equal(slots.length, 2);
  assert.equal(slots[0].subjectCode, 'ว23101');
  assert.equal(slots[1].subjectCode, 'ค23101');
});

test('ExamService - generates alternating seating matrix with seat numbers', () => {
  const matrix = ExamService.generateSeatingMatrix(5, 6, []);
  assert.equal(matrix.length, 5);
  assert.equal(matrix[0].length, 6);
  assert.equal(matrix[0][0].seatNumber, 'A1-1');
  assert.equal(matrix[0][1].seatNumber, 'A1-2');
});

test('ExamService - assigns non-conflicting exam supervisors', () => {
  const teachers = [{ name: 'ครูสมชาย' }, { name: 'ครูสมหญิง' }, { name: 'ครูวิชัย' }];
  const slots = [
    { examSlotId: 's1', subjectCode: 'ว23101' },
    { examSlotId: 's2', subjectCode: 'ค23101' }
  ];

  const assigned = ExamService.assignExamSupervisors(teachers, slots);
  assert.equal(assigned[0].supervisors.length, 2);
  assert.equal(assigned[0].supervisors[0], 'ครูสมชาย');
  assert.equal(assigned[0].supervisors[1], 'ครูสมหญิง');
});
