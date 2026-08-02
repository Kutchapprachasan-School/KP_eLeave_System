import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ExcelImportService } from '../../../src/lib/services/excelImportService.js';

describe('Excel Import Service Unit Tests', () => {
  it('parseTeacherRows correctly parses valid teacher rows and flags invalid ones', () => {
    const raw = [
      { teacherId: 't-1', teacherName: 'ครูสมชาย', department: 'วิทยาศาสตร์' },
      { teacherId: '', teacherName: '', department: 'ทั่วไป' }
    ];
    const parsed = ExcelImportService.parseTeacherRows(raw);
    assert.strictEqual(parsed.length, 2);
    assert.strictEqual(parsed[0].isValid, true);
    assert.strictEqual(parsed[1].isValid, false);
    assert.ok(parsed[1].errors.length > 0);
  });

  it('parseOfferingRows and convertOfferingsToScheduleBlocks creates valid ScheduleBlocks', () => {
    const raw = [
      { subjectCode: 'ว23101', subjectName: 'วิทยาศาสตร์ 5', periodsPerWeek: 3, classroomName: 'ม.3/1', teacherId: 't-1', teacherName: 'ครูสมชาย' }
    ];
    const parsed = ExcelImportService.parseOfferingRows(raw);
    assert.strictEqual(parsed[0].isValid, true);

    const blocks = ExcelImportService.convertOfferingsToScheduleBlocks(parsed);
    assert.strictEqual(blocks.length, 3); // 3 periods
    assert.strictEqual(blocks[0].subjectCode, 'ว23101');
    assert.strictEqual(blocks[0].targetClassroomIds[0], 'ม.3/1');
  });

  it('getSampleTemplateCSV returns valid sample CSV string with headers', () => {
    const csv = ExcelImportService.getSampleTemplateCSV();
    assert.ok(csv.includes('รหัสวิชา,ชื่อวิชา'));
    assert.ok(csv.includes('ว23101'));
  });
});
