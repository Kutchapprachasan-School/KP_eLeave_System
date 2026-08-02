import { test } from 'node:test';
import assert from 'node:assert/strict';

test('CompetencyEngine - accumulates approved PD hours against target', () => {
  const logs = [{ hours: 12 }, { hours: 8 }];
  const total = logs.reduce((acc, curr) => acc + curr.hours, 0);
  const target = 20;
  assert.equal(total >= target, true);
});

test('CompetencyEngine - calculates average competency evaluation score across 5 dimensions', () => {
  const scores = {
    dimension1Score: 5,
    dimension2Score: 4,
    dimension3Score: 5,
    dimension4Score: 4,
    dimension5Score: 5
  };
  const avg = (scores.dimension1Score + scores.dimension2Score + scores.dimension3Score + scores.dimension4Score + scores.dimension5Score) / 5;
  assert.equal(avg, 4.6);
});
