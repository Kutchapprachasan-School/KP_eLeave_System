import test from 'node:test';
import assert from 'node:assert/strict';
import { CompetencyService } from '../../../src/lib/services/competencyService.js';

test('CompetencyService - calculates 5-dimension competency scores and grade level correctly', () => {
  const result = CompetencyService.calculateCompetencyScore({
    c1_pedagogy: 5,
    c2_innovation: 5,
    c3_classroom: 5,
    c4_evaluation: 5,
    c5_ethics: 5
  });

  assert.equal(result.total, 25);
  assert.equal(result.percentage, 100);
  assert.equal(result.gradeLevel, 'ดีเยี่ยม');
});

test('CompetencyService - generates PA portfolio summary payload', () => {
  const summary = CompetencyService.generatePAPortfolioSummary({
    name: 'ครูสมชาย สายวิทย์',
    department: 'วิทยาศาสตร์'
  });

  assert.ok(summary.portfolioId.startsWith('PA-'));
  assert.equal(summary.teacherName, 'ครูสมชาย สายวิทย์');
  assert.equal(summary.paStatus, 'PASSED_DIRECTOR_REVIEW');
});
