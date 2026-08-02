import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ProgressiveCascadeSolver } from '../../../src/lib/timetable/solvers/progressiveCascadeSolver.ts';

describe('Progressive Cascade Solver Unit Tests (Human Trust Barrier Engine)', () => {
  it('calculateScheduleStabilityScore correctly computes (1 - changed/total)*100%', () => {
    const solver = new ProgressiveCascadeSolver();
    const mockOriginal = Array.from({ length: 100 }, (_, i) => ({ id: `b-${i}`, timeSlotId: `ts-${i}` }));
    
    // 2 changed slots out of 100 active slots -> 98% stability
    const score = solver.calculateScheduleStabilityScore(mockOriginal, 2);
    assert.strictEqual(score, 98.0);
  });

  it('solveCascade executes within Change Budget policy limits', async () => {
    const timeSlots = [
      { id: 'ts-1-1', dayOfWeek: 1, periodIndex: 1, startTime: '08:30', endTime: '09:20', isAcademicSlot: true },
      { id: 'ts-1-2', dayOfWeek: 1, periodIndex: 2, startTime: '09:20', endTime: '10:10', isAcademicSlot: true }
    ];
    const blocks = [
      { id: 'b-1', type: 'ACADEMIC_SUBJECT', title: 'คณิต', timeSlotId: 'ts-1-1', teacherIds: ['t1'], isLocked: false, isFrozen: false }
    ];

    const solver = new ProgressiveCascadeSolver();
    const result = await solver.solveCascade(timeSlots, blocks, [], {
      maxChangedSlots: 5,
      maxChangedTeachers: 2,
      maxChangedRooms: 2,
      freezePublishedClasses: true,
      freezeExamWeeks: true,
      allowCrossDepartmentElectivesOnly: false
    });

    assert.strictEqual(result.scheduleStabilityScore, 100);
    assert.ok(result.impactSummary.changedSlotsCount <= 5);
    assert.ok(result.fairnessIndexAfter >= result.fairnessIndexBefore);
  });
});
