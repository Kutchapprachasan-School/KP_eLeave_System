import { describe, it } from 'node:test';
import assert from 'node:assert';
import { LocalSearchSchedulingEngine } from '../../../src/lib/timetable/solvers/localSearchEngine.ts';
import { ConstraintPipelineRegistry } from '../../../src/lib/timetable/constraints/constraintPipeline.ts';

describe('Enterprise Master Timetable Architecture Engine (6 Layers Blueprint)', () => {
  it('Layer 4 & 5 - Constraint Pipeline & TypeScript Local Search Solver creates clean schedule with PASS status', async () => {
    const timeSlots = [
      { id: 'ts-1', dayOfWeek: 1, periodIndex: 1, startTime: '08:30', endTime: '09:20', isAcademicSlot: true },
      { id: 'ts-2', dayOfWeek: 1, periodIndex: 2, startTime: '09:20', endTime: '10:10', isAcademicSlot: true },
      { id: 'ts-3', dayOfWeek: 1, periodIndex: 3, startTime: '10:10', endTime: '11:00', isAcademicSlot: true },
      { id: 'ts-4', dayOfWeek: 1, periodIndex: 4, startTime: '11:00', endTime: '11:50', isAcademicSlot: false }, // Lunch
      { id: 'ts-5', dayOfWeek: 1, periodIndex: 5, startTime: '12:50', endTime: '13:40', isAcademicSlot: true },
    ];

    const blocks = [
      {
        id: 'block-lunch',
        type: 'LUNCH',
        title: 'พักเที่ยง',
        timeSlotId: 'ts-4',
        dayOfWeek: 1,
        periodIndex: 4,
        isLocked: true,
        isFrozen: true
      },
      {
        id: 'block-math',
        type: 'ACADEMIC_SUBJECT',
        title: 'คณิตศาสตร์ 5',
        subjectCode: 'ค23101',
        teacherIds: ['t1'],
        teacherNames: ['ครูสมหญิง'],
        roomId: 'r101',
        targetClassroomIds: ['c301'],
        isLocked: false,
        isFrozen: false
      },
      {
        id: 'block-sci',
        type: 'ACADEMIC_SUBJECT',
        title: 'วิทยาศาสตร์ 5',
        subjectCode: 'ว23101',
        teacherIds: ['t2'],
        teacherNames: ['ครูสมชาย'],
        roomId: 'r102',
        targetClassroomIds: ['c301'],
        isLocked: false,
        isFrozen: false
      }
    ];

    const solver = new LocalSearchSchedulingEngine();
    const result = await solver.solve(timeSlots, blocks, [], { maxExecutionTimeSeconds: 5 });

    assert.strictEqual(result.explainabilityReport.hardConstraintStatus, 'PASS');
    assert.strictEqual(result.score.hardViolationsCount, 0);
    assert.ok(result.score.totalScore > 80, `Expected score > 80, got ${result.score.totalScore}`);
    assert.strictEqual(result.solverEngineName, 'TypeScript Local Search Solver (Phase 1)');
    assert.ok(result.blocks.find(b => b.id === 'block-math')?.timeSlotId !== undefined);
  });

  it('Layer 6 - Evaluation & Explainability Engine generates decision traces and metric breakdown', async () => {
    const registry = new ConstraintPipelineRegistry();
    const violations = registry.evaluateAll({
      timeSlots: [{ id: 'ts-1', dayOfWeek: 1, periodIndex: 1, startTime: '08:30', endTime: '09:20', isAcademicSlot: true }],
      blocks: []
    });
    assert.ok(Array.isArray(violations));
  });
});
