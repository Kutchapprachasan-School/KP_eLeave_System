import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PrintTemplateService } from '../../../src/lib/services/printTemplateService.js';

describe('Print Template Service Unit Tests', () => {
  it('getDefaultPreset returns complete default preset object', () => {
    const preset = PrintTemplateService.getDefaultPreset();
    assert.strictEqual(preset.schoolName, 'โรงเรียนกุดจับประชาสรรค์');
    assert.strictEqual(preset.orientation, 'LANDSCAPE');
    assert.strictEqual(preset.showSignaturesBlock, true);
  });

  it('calculateWorkloadSummary correctly sums academic and activity periods', () => {
    const blocks = [
      { type: 'ACADEMIC_SUBJECT' },
      { type: 'ACADEMIC_SUBJECT' },
      { type: 'SCOUT' },
      { type: 'LUNCH' }
    ];
    const summary = PrintTemplateService.calculateWorkloadSummary(blocks);
    assert.strictEqual(summary.academicPeriods, 2);
    assert.strictEqual(summary.activityPeriods, 1);
    assert.strictEqual(summary.lunchPeriods, 1);
    assert.strictEqual(summary.totalTeachingPeriods, 3);
  });
});
