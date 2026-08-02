import type {
  TimeSlot,
  ScheduleBlock,
  ConstraintDefinition,
  ISchedulingEngine,
  SchedulingOptions,
  EnterpriseSchedulingResult,
  ObjectiveScore,
  ExplainabilityReport,
  DecisionTrace,
  ConstraintViolation
} from "../types.ts";
import { ConstraintPipelineRegistry } from "../constraints/constraintPipeline.ts";

/**
 * Phase 1: Local Search Scheduling Engine Implementation
 * Strategy Pattern Provider: Greedy Constructive + Hill Climbing Neighborhood Search
 */
export class LocalSearchSchedulingEngine implements ISchedulingEngine {
  readonly engineName = "TypeScript Local Search Solver (Phase 1)";

  private registry = new ConstraintPipelineRegistry();

  public async solve(
    timeSlots: TimeSlot[],
    blocks: ScheduleBlock[],
    constraints: ConstraintDefinition[],
    options: SchedulingOptions
  ): Promise<EnterpriseSchedulingResult> {
    const startTimeMs = Date.now();
    const explanations: DecisionTrace[] = [];

    // Clone blocks to prevent side-effects on original input
    let currentBlocks: ScheduleBlock[] = blocks.map(b => ({ ...b }));

    // 1. Separate locked/frozen blocks vs unassigned/unlocked blocks
    const unassignedBlocks = currentBlocks.filter(b => !b.isLocked && !b.isFrozen);

    // 2. Greedy Initial Assignment
    options.onProgress?.(10, "Greedy Construction");
    for (const b of unassignedBlocks) {
      let bestTs: TimeSlot | null = null;
      let minViolations = Infinity;

      for (const ts of timeSlots) {
        // Test placing block in ts
        b.timeSlotId = ts.id;
        b.dayOfWeek = ts.dayOfWeek;
        b.periodIndex = ts.periodIndex;

        const violations = this.registry.evaluateAll(
          { timeSlots, blocks: currentBlocks },
          constraints
        );
        const hardCount = violations.filter(v => v.severity === "HARD").length;

        if (hardCount < minViolations) {
          minViolations = hardCount;
          bestTs = ts;
        }

        if (hardCount === 0) break; // Found clean slot
      }

      if (bestTs) {
        b.timeSlotId = bestTs.id;
        b.dayOfWeek = bestTs.dayOfWeek;
        b.periodIndex = bestTs.periodIndex;
      }
    }

    // 3. Hill Climbing Local Search (Neighborhood Swaps)
    options.onProgress?.(50, "Hill Climbing Optimization");
    let currentViolations = this.registry.evaluateAll(
      { timeSlots, blocks: currentBlocks },
      constraints
    );
    let currentScore = this.calculateObjectiveScore(currentViolations);

    const maxIterations = 500;
    let iterations = 0;

    while (iterations < maxIterations && currentScore.hardViolationsCount > 0) {
      iterations++;
      let improved = false;

      for (let i = 0; i < unassignedBlocks.length; i++) {
        for (let j = i + 1; j < unassignedBlocks.length; j++) {
          const b1 = unassignedBlocks[i];
          const b2 = unassignedBlocks[j];

          // Swap timeSlotIds
          const tempTs = b1.timeSlotId;
          const tempDay = b1.dayOfWeek;
          const tempPeriod = b1.periodIndex;

          b1.timeSlotId = b2.timeSlotId;
          b1.dayOfWeek = b2.dayOfWeek;
          b1.periodIndex = b2.periodIndex;

          b2.timeSlotId = tempTs;
          b2.dayOfWeek = tempDay;
          b2.periodIndex = tempPeriod;

          const newViolations = this.registry.evaluateAll(
            { timeSlots, blocks: currentBlocks },
            constraints
          );
          const newScore = this.calculateObjectiveScore(newViolations);

          if (newScore.totalScore > currentScore.totalScore) {
            currentScore = newScore;
            currentViolations = newViolations;
            improved = true;
            explanations.push({
              subjectCode: b1.subjectCode || b1.title,
              blockId: b1.id,
              action: "MOVED",
              reason: `สลับตำแหน่งระหว่าง ${b1.title} และ ${b2.title} เพื่อแก้ข้อขัดแย้ง (+${(newScore.totalScore - currentScore.totalScore).toFixed(1)} คะแนน)`,
              scoreDelta: Number((newScore.totalScore - currentScore.totalScore).toFixed(1))
            });
            break;
          } else {
            // Revert swap
            b2.timeSlotId = b1.timeSlotId;
            b2.dayOfWeek = b1.dayOfWeek;
            b2.periodIndex = b1.periodIndex;

            b1.timeSlotId = tempTs;
            b1.dayOfWeek = tempDay;
            b1.periodIndex = tempPeriod;
          }
        }
        if (improved) break;
      }

      if (!improved) break;
    }

    options.onProgress?.(100, "Completed");

    const totalExecutionTimeMs = Date.now() - startTimeMs;
    const explainabilityReport = this.generateExplainabilityReport(currentScore, currentViolations, explanations);

    return {
      scenarioId: `scenario-${Date.now()}`,
      blocks: currentBlocks,
      score: currentScore,
      explainabilityReport,
      executionTimeMs: totalExecutionTimeMs,
      solverEngineName: this.engineName
    };
  }

  private calculateObjectiveScore(violations: ConstraintViolation[]): ObjectiveScore {
    let hardViolationsCount = 0;
    let softPenaltyTotal = 0;

    for (const v of violations) {
      if (v.severity === "HARD") {
        hardViolationsCount++;
      } else {
        softPenaltyTotal += v.penaltyScore;
      }
    }

    const normalizationFactor = 100;
    const totalPenalty = (hardViolationsCount * 10000) + softPenaltyTotal;
    const totalScore = Math.max(0, Math.round(100 - (totalPenalty / normalizationFactor)));

    const teacherSatisfaction = Math.max(0, 100 - Math.round((softPenaltyTotal * 0.4) / 10));
    const roomUtilization = Math.max(0, 100 - (hardViolationsCount > 0 ? 20 : 0));
    const workloadBalance = Math.max(0, 100 - Math.round((softPenaltyTotal * 0.3) / 10));
    const gapMinimization = Math.max(0, 100 - Math.round((softPenaltyTotal * 0.3) / 10));

    return {
      totalScore,
      hardViolationsCount,
      softPenaltyTotal,
      categoryScores: {
        teacherSatisfaction,
        roomUtilization,
        workloadBalance,
        gapMinimization
      }
    };
  }

  private generateExplainabilityReport(
    score: ObjectiveScore,
    violations: ConstraintViolation[],
    explanations: DecisionTrace[]
  ): ExplainabilityReport {
    const hardConstraintStatus = score.hardViolationsCount === 0 ? "PASS" : "FAIL";
    const overallSummary = hardConstraintStatus === "PASS"
      ? `ประมวลผลตารางสำเร็จ 100% คะแนนประสิทธิภาพรวม ${score.totalScore}/100 ไม่พบข้อขัดแย้งของครู/ห้อง/กิจกรรม`
      : `พบข้อขัดแย้ง Hard Constraints จำนวน ${score.hardViolationsCount} รายการ กรุณาตรวจสอบรายละเอียด`;

    const suggestions = [];
    if (score.hardViolationsCount > 0) {
      suggestions.push({
        priority: "HIGH" as const,
        suggestion: "ปรับขยายช่วงเวลาห้ามสอนของครู หรือเพิ่มห้องปฏิบัติการรองรับวิชาเฉพาะทาง",
        potentialScoreGain: 40
      });
    }
    if (score.categoryScores.gapMinimization < 80) {
      suggestions.push({
        priority: "MEDIUM" as const,
        suggestion: "เปิดใช้งานสวิตช์ No-Gap Constraint เพื่อกระชับตารางสอนของครูให้เป็นคาบต่อเนื่อง",
        potentialScoreGain: 15
      });
    }

    return {
      overallSummary,
      hardConstraintStatus,
      violations,
      explanations: explanations.slice(0, 10), // Return top 10 decision traces
      suggestions
    };
  }
}
