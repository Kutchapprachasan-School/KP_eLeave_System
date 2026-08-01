import test from 'node:test';
import assert from 'node:assert/strict';
import { SubstituteWorkflowService } from '../../src/services/substituteWorkflowService.js';

test('SubstituteWorkflowService - respects DEPARTMENT assignment policy', () => {
  const candidates = [
    { id: 't1', departmentId: 'DEP-MATH' },
    { id: 't2', departmentId: 'DEP-SCIENCE' },
    { id: 't3', departmentId: 'DEP-MATH' }
  ];

  const service = new SubstituteWorkflowService();
  const filtered = service.filterCandidatesByPolicy(candidates, 'DEP-MATH', 'DEPARTMENT');

  assert.equal(filtered.length, 2);
  assert.deepEqual(filtered.map(c => c.id), ['t1', 't3']);
});

test('SubstituteWorkflowService - workflow assignment and response state transitions', () => {
  const service = new SubstituteWorkflowService();

  const wf = service.assignSubstitute('req-1', 'slot-1', '2026-07-27', 't1', 'user-admin');
  assert.equal(wf.status, 'ASSIGNED');

  const ackWf = service.respondWorkflow(wf.id, 'ACKNOWLEDGED');
  assert.equal(ackWf.status, 'ACKNOWLEDGED');
});
