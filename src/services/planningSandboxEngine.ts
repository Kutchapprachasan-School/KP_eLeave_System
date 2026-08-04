import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export interface ScenarioMetricsPayload {
  etuTotal: number;
  budgetTotal: number;
  roomUsagePercent: number;
  readinessScore: number;
  teacherCount: number;
  offeringCount: number;
  notes?: string;
  [key: string]: unknown;
}

export interface MetricDelta {
  metricName: string;
  baselineValue: number;
  targetValue: number;
  absoluteDelta: number;
  percentageDelta: number;
  trend: "INCREASE" | "DECREASE" | "NEUTRAL";
}

export interface ScenarioComparisonResult {
  baselineScenarioId: string;
  baselineName: string;
  comparedScenarios: Array<{
    scenarioId: string;
    scenarioName: string;
    metrics: ScenarioMetricsPayload;
    deltasVsBaseline: MetricDelta[];
  }>;
  summaryText: string;
}

export interface OptimizationWeights {
  etuWeight?: number; // e.g. lower ETU/overtime is better or target exact capacity
  budgetWeight?: number; // e.g. lower budget is better
  roomUsageWeight?: number; // e.g. optimal room usage (70-85%)
  readinessWeight?: number; // e.g. higher readiness is better
}

export class PlanningSandboxEngine {
  /**
   * Creates a new Planning Sandbox Scenario in database.
   */
  public async createScenario(data: {
    name: string;
    description?: string;
    academicYear: number;
    term: number;
    payloadJson: ScenarioMetricsPayload;
    createdById?: string;
  }) {
    return prisma.planningSandboxScenario.create({
      data: {
        name: data.name,
        description: data.description || null,
        academicYear: data.academicYear,
        term: data.term,
        payloadJson: data.payloadJson as unknown as Prisma.InputJsonValue,
        createdById: data.createdById || null,
      },
    });
  }

  /**
   * Retrieves and parses metrics payload for a single scenario.
   */
  public async evaluateScenario(scenarioId: string): Promise<{
    id: string;
    name: string;
    academicYear: number;
    term: number;
    isPublished: boolean;
    metrics: ScenarioMetricsPayload;
  }> {
    const scenario = await prisma.planningSandboxScenario.findUnique({
      where: { id: scenarioId },
    });

    if (!scenario) {
      throw new Error(`PlanningSandboxScenario with ID "${scenarioId}" not found.`);
    }

    const metrics = scenario.payloadJson as unknown as ScenarioMetricsPayload;

    return {
      id: scenario.id,
      name: scenario.name,
      academicYear: scenario.academicYear,
      term: scenario.term,
      isPublished: scenario.isPublished,
      metrics,
    };
  }

  /**
   * Evaluates and compares multiple scenarios (Scenario A vs B vs C) against baseline Scenario A.
   */
  public async compareScenarios(scenarioIds: string[]): Promise<ScenarioComparisonResult> {
    if (scenarioIds.length < 2) {
      throw new Error("At least 2 scenario IDs are required for delta comparison.");
    }

    const scenarios = await Promise.all(scenarioIds.map((id) => this.evaluateScenario(id)));

    const baseline = scenarios[0];
    const targetScenarios = scenarios.slice(1);

    const keyMetrics: Array<{ key: keyof ScenarioMetricsPayload; label: string }> = [
      { key: "etuTotal", label: "ETU ภาระงานสอนรวม" },
      { key: "budgetTotal", label: "งบประมาณประมาณการ (บาท)" },
      { key: "roomUsagePercent", label: "อัตราการใช้งานห้องเรียน (%)" },
      { key: "readinessScore", label: "คะแนนความพร้อมวิชาการ (%)" },
      { key: "teacherCount", label: "จำนวนครูผู้สอน" },
      { key: "offeringCount", label: "จำนวนรายวิชาที่เปิด" },
    ];

    const comparedScenarios = targetScenarios.map((target) => {
      const deltasVsBaseline: MetricDelta[] = keyMetrics.map(({ key, label }) => {
        const baseVal = Number(baseline.metrics[key] ?? 0);
        const targetVal = Number(target.metrics[key] ?? 0);
        const absoluteDelta = Math.round((targetVal - baseVal) * 100) / 100;
        const percentageDelta =
          baseVal !== 0 ? Math.round(((targetVal - baseVal) / baseVal) * 10000) / 100 : 0;
        const trend =
          absoluteDelta > 0 ? "INCREASE" : absoluteDelta < 0 ? "DECREASE" : "NEUTRAL";

        return {
          metricName: label,
          baselineValue: baseVal,
          targetValue: targetVal,
          absoluteDelta,
          percentageDelta,
          trend,
        };
      });

      return {
        scenarioId: target.id,
        scenarioName: target.name,
        metrics: target.metrics,
        deltasVsBaseline,
      };
    });

    const summaryText = `เปรียบเทียบ ${scenarios.length} สถานการณ์ โดยมี "${baseline.name}" เป็นฐาน (Baseline). ` +
      comparedScenarios
        .map(
          (c) =>
            `[${c.scenarioName}]: ETU Delta = ${
              c.deltasVsBaseline.find((d) => d.metricName.includes("ETU"))?.absoluteDelta
            }, Budget Delta = ${
              c.deltasVsBaseline.find((d) => d.metricName.includes("งบประมาณ"))?.absoluteDelta
            }, Readiness Delta = ${
              c.deltasVsBaseline.find((d) => d.metricName.includes("ความพร้อม"))?.absoluteDelta
            }%`
        )
        .join("; ");

    return {
      baselineScenarioId: baseline.id,
      baselineName: baseline.name,
      comparedScenarios,
      summaryText,
    };
  }

  /**
   * Computes multi-criteria score to recommend the optimal scenario.
   */
  public async getBestScenario(
    scenarioIds: string[],
    weights: OptimizationWeights = {}
  ): Promise<{
    recommendedScenarioId: string;
    recommendedScenarioName: string;
    rankings: Array<{ scenarioId: string; name: string; score: number }>;
  }> {
    const etuW = weights.etuWeight ?? 0.25;
    const budgetW = weights.budgetWeight ?? 0.25;
    const roomW = weights.roomUsageWeight ?? 0.20;
    const readinessW = weights.readinessWeight ?? 0.30;

    const scenarios = await Promise.all(scenarioIds.map((id) => this.evaluateScenario(id)));

    // Score calculation
    const scoredScenarios = scenarios.map((s) => {
      // Readiness higher is better (0-100)
      const readinessScore = s.metrics.readinessScore;
      // Room usage optimal around 80%
      const roomScore = 100 - Math.abs(80 - s.metrics.roomUsagePercent) * 2;
      // Budget lower is better (normalized scale, fallback 100 if 0)
      const budgetScore = Math.max(0, 100 - (s.metrics.budgetTotal / 10000));
      // ETU lower overtime is better
      const etuScore = Math.max(0, 100 - Math.max(0, s.metrics.etuTotal - 100));

      const compositeScore =
        Math.round(
          (readinessScore * readinessW +
            roomScore * roomW +
            budgetScore * budgetW +
            etuScore * etuW) *
            100
        ) / 100;

      return {
        scenarioId: s.id,
        name: s.name,
        score: compositeScore,
      };
    });

    scoredScenarios.sort((a, b) => b.score - a.score);

    return {
      recommendedScenarioId: scoredScenarios[0].scenarioId,
      recommendedScenarioName: scoredScenarios[0].name,
      rankings: scoredScenarios,
    };
  }
}

export const planningSandboxEngine = new PlanningSandboxEngine();
