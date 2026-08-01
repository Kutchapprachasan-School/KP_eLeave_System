import test from 'node:test';
import assert from 'node:assert/strict';
import { RecommendationService } from '../../src/services/recommendationService.js';

test('RecommendationService - calculates score explainability breakdown correctly', () => {
  const rules = [
    { id: 'r1', field: 'subjectCode', operator: 'equals', weight: 40, name: 'Same Subject' },
    { id: 'r2', field: 'departmentId', operator: 'equals', weight: 25, name: 'Same Department' }
  ];

  const service = new RecommendationService(rules, []);
  const candidate = { id: 't1', subjectCode: 'ว23101', departmentId: 'DEP-SCIENCE' };
  const targetContext = { subjectCode: 'ว23101', departmentId: 'DEP-SCIENCE' };

  const result = service.evaluateCandidate(candidate, targetContext);

  assert.equal(result.totalScore, 65);
  assert.equal(result.explainabilityBreakdown.length, 2);
  assert.deepEqual(result.explainabilityBreakdown[0], { rule: 'Same Subject', score: 40 });
  assert.deepEqual(result.explainabilityBreakdown[1], { rule: 'Same Department', score: 25 });
});

test('RecommendationService - applies Workload Fairness Penalty for frequent past substitutes', () => {
  const rules = [
    { id: 'r1', field: 'subjectCode', operator: 'equals', weight: 40, name: 'Same Subject' }
  ];
  const history = [
    { teacherId: 't1', date: '2026-07-20' },
    { teacherId: 't1', date: '2026-07-22' }
  ];

  const service = new RecommendationService(rules, history);
  const candidate = { id: 't1', subjectCode: 'ว23101' };
  const targetContext = { subjectCode: 'ว23101' };

  const result = service.evaluateCandidate(candidate, targetContext);

  // 40 points - (2 * 10) penalty = 20 points
  assert.equal(result.totalScore, 20);
  assert.equal(result.explainabilityBreakdown.length, 2);
  assert.equal(result.explainabilityBreakdown[1].score, -20);
});
