import test from 'node:test';
import assert from 'node:assert/strict';
import { AcademicSettingsService } from '../../../src/lib/services/academicSettingsService.js';

test('AcademicSettingsService - returns default settings and updates correctly', () => {
  const settings = AcademicSettingsService.getSettings();
  assert.equal(settings.academicYear, '2569');
  assert.equal(settings.term, 1);
  assert.equal(settings.departments.length, 8);
  assert.equal(settings.workloadLimits.minWeeklyPeriods, 18);

  const updated = AcademicSettingsService.updateSettings({ term: 2 });
  assert.equal(updated.term, 2);

  // Reset back to defaults
  AcademicSettingsService.resetToDefaults();
  assert.equal(AcademicSettingsService.getSettings().term, 1);
});

test('AcademicSettingsService - adds new department and classroom dynamically', () => {
  const newDept = AcademicSettingsService.addDepartment({ name: 'เทคโนโลยีสารสนเทศ', headTeacher: 'ครูสมชาย' });
  assert.ok(newDept.id.startsWith('DEP-'));

  const newClass = AcademicSettingsService.addClassroom({ name: 'ม.3/2', level: 'ม.ต้น', advisorTeacher: 'ครูวิชัย' });
  assert.ok(newClass.id.startsWith('cls-'));
});
