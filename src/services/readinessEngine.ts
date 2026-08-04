import { prisma } from "@/lib/db";
import {
  PlatformEventType,
  createPlatformEvent,
  ReadinessPassedPayload,
  ReadinessFailedPayload,
  PlatformEventEnvelope,
} from "@/events/eventCatalog";

export interface ReadinessCheckResult {
  indicatorId: string;
  code: string;
  name: string;
  weight: number;
  score: number;
  passed: boolean;
  expression: string;
  details?: string;
}

export interface ReadinessEvaluationReport {
  sessionId: string;
  overallScore: number;
  isPassed: boolean;
  passThreshold: number;
  totalWeightEvaluated: number;
  checks: ReadinessCheckResult[];
  failedIndicators: string[];
  evaluatedAt: string;
  event: PlatformEventEnvelope<ReadinessPassedPayload | ReadinessFailedPayload>;
}

export interface MetricsContext {
  [key: string]: number | boolean;
}

/**
 * Safely evaluates simple mathematical and logical comparison expressions.
 * Supported variables: dynamic keys from MetricsContext
 * Supported operators: >=, <=, >, <, ==, ===, !=, !==
 */
export function evaluateExpression(expression: string, context: MetricsContext): boolean {
  try {
    const trimmed = expression.trim();
    const match = trimmed.match(/^([a-zA-Z0-9_]+)\s*(>=|<=|>|<|===|==|!==|!=)\s*([0-9.]+|true|false)$/);
    if (!match) {
      // Fallback: evaluate boolean metric key directly if expression matches single variable
      if (context[trimmed] !== undefined) {
        return Boolean(context[trimmed]);
      }
      return false;
    }

    const [, varName, operator, rawVal] = match;
    const actualVal = context[varName];
    if (actualVal === undefined) return false;

    let targetVal: number | boolean;
    if (rawVal === "true") targetVal = true;
    else if (rawVal === "false") targetVal = false;
    else targetVal = parseFloat(rawVal);

    switch (operator) {
      case ">=":
        return Number(actualVal) >= Number(targetVal);
      case "<=":
        return Number(actualVal) <= Number(targetVal);
      case ">":
        return Number(actualVal) > Number(targetVal);
      case "<":
        return Number(actualVal) < Number(targetVal);
      case "==":
      case "===":
        return actualVal === targetVal;
      case "!=":
      case "!==":
        return actualVal !== targetVal;
      default:
        return false;
    }
  } catch (error) {
    console.error(`[ReadinessEngine] Error evaluating expression "${expression}":`, error);
    return false;
  }
}

export class ReadinessEngine {
  /**
   * Automatically computes metrics context from database for a given session / academic year / term.
   */
  public async computeDatabaseMetrics(academicYear: number, term: number): Promise<MetricsContext> {
    const [totalOfferings, totalTeachers, totalRooms, calendarEvents, approvalSteps] = await Promise.all([
      prisma.subjectOffering.count({ where: { academicYear, term } }),
      prisma.teacher.count(),
      prisma.room.count(),
      prisma.academicCalendar.findFirst({
        where: { academicYear, term },
        include: { events: true },
      }),
      prisma.planningSession.findFirst({
        where: { academicYear, term },
        include: { approvalSteps: true },
      }),
    ]);

    const teacherAssignedOfferings = await prisma.subjectOffering.count({
      where: { academicYear, term, teacherId: { not: "" } },
    });

    const roomAssignedSlots = await prisma.timetableSlot.count({
      where: {
        timetableVersion: { academicYear, term },
        roomId: { not: "" },
      },
    });

    const totalSlots = await prisma.timetableSlot.count({
      where: { timetableVersion: { academicYear, term } },
    });

    const offeringPercent = totalOfferings > 0 ? 100 : 0;
    const teacherAssignPercent = totalOfferings > 0 ? (teacherAssignedOfferings / totalOfferings) * 100 : 0;
    const roomAssignPercent = totalSlots > 0 ? (roomAssignedSlots / totalSlots) * 100 : 100;
    const calendarConfigured = (calendarEvents?.events?.length ?? 0) > 0;

    const totalSteps = approvalSteps?.approvalSteps?.length ?? 0;
    const approvedSteps = approvalSteps?.approvalSteps?.filter((s) => s.status === "APPROVED").length ?? 0;
    const workflowApproved = totalSteps > 0 && approvedSteps === totalSteps;

    return {
      offeringPercent,
      teacherAssignPercent,
      roomAssignPercent,
      calendarConfigured: calendarConfigured ? 100 : 0,
      workflowApproved: workflowApproved ? 100 : 0,
      totalOfferings,
      totalTeachers,
      totalRooms,
    };
  }

  /**
   * Evaluates readiness score (0-100%) dynamically reading indicators from database.
   */
  public async evaluateSessionReadiness(
    sessionId: string,
    customMetrics?: MetricsContext,
    passThreshold: number = 80.0
  ): Promise<ReadinessEvaluationReport> {
    const session = await prisma.planningSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error(`Planning session with ID "${sessionId}" not found.`);
    }

    // 1. Fetch enabled ReadinessIndicators from database
    const indicators = await prisma.readinessIndicator.findMany({
      where: { enabled: true },
    });

    // Seed default indicators if database has none
    if (indicators.length === 0) {
      await this.seedDefaultIndicators();
      return this.evaluateSessionReadiness(sessionId, customMetrics, passThreshold);
    }

    // 2. Gather metrics context
    const metrics = customMetrics || (await this.computeDatabaseMetrics(session.academicYear, session.term));

    // 3. Evaluate each indicator
    let weightedScoreSum = 0;
    let totalWeight = 0;
    const checks: ReadinessCheckResult[] = [];
    const failedIndicators: string[] = [];

    for (const indicator of indicators) {
      const isPassed = evaluateExpression(indicator.expression, metrics);
      const score = isPassed ? indicator.weight : 0;
      weightedScoreSum += score;
      totalWeight += indicator.weight;

      checks.push({
        indicatorId: indicator.id,
        code: indicator.code,
        name: indicator.name,
        weight: indicator.weight,
        score,
        passed: isPassed,
        expression: indicator.expression,
        details: `Rule: "${indicator.expression}", Evaluated Score: ${score}/${indicator.weight}`,
      });

      if (!isPassed) {
        failedIndicators.push(indicator.code);
      }
    }

    // 4. Calculate overall normalized score (0 - 100%)
    const overallScore = totalWeight > 0 ? Math.round((weightedScoreSum / totalWeight) * 10000) / 100 : 0;
    const isPassed = overallScore >= passThreshold;

    // 5. Update score in database
    await prisma.planningSession.update({
      where: { id: sessionId },
      data: { readinessScore: overallScore },
    });

    // 6. Generate Event Payload
    let event: PlatformEventEnvelope<ReadinessPassedPayload | ReadinessFailedPayload>;
    if (isPassed) {
      event = createPlatformEvent<ReadinessPassedPayload>({
        aggregateType: "READINESS",
        aggregateId: sessionId,
        eventType: PlatformEventType.READINESS_PASSED,
        payload: {
          sessionId,
          overallScore,
          checks,
        },
      });
    } else {
      event = createPlatformEvent<ReadinessFailedPayload>({
        aggregateType: "READINESS",
        aggregateId: sessionId,
        eventType: PlatformEventType.READINESS_FAILED,
        payload: {
          sessionId,
          overallScore,
          checks,
          failedIndicators,
        },
      });
    }

    return {
      sessionId,
      overallScore,
      isPassed,
      passThreshold,
      totalWeightEvaluated: totalWeight,
      checks,
      failedIndicators,
      evaluatedAt: new Date().toISOString(),
      event,
    };
  }

  /**
   * Seeds default readiness indicators into database if missing.
   */
  public async seedDefaultIndicators(): Promise<void> {
    const defaults = [
      {
        code: "RULE_OFFERING_COVERAGE",
        name: "ความครอบคลุมการเปิดรายวิชา",
        weight: 30.0,
        expression: "offeringPercent >= 100",
        description: "ต้องมีการเปิดรายวิชาครอบคลุมตามหลักสูตรอย่างน้อย 100%",
      },
      {
        code: "RULE_TEACHER_ASSIGNMENT",
        name: "การมอบหมายครูผู้สอน",
        weight: 30.0,
        expression: "teacherAssignPercent >= 90",
        description: "สัดส่วนครูผู้สอนประจำรายวิชาต้องไม่น้อยกว่า 90%",
      },
      {
        code: "RULE_ROOM_ASSIGNMENT",
        name: "การจัดสรรห้องเรียน",
        weight: 20.0,
        expression: "roomAssignPercent >= 80",
        description: "คาบเรียนต้องจัดสรรห้องเรียนสำเร็จไม่น้อยกว่า 80%",
      },
      {
        code: "RULE_CALENDAR_SET",
        name: "การกำหนดปฏิทินวิชาการ",
        weight: 10.0,
        expression: "calendarConfigured >= 100",
        description: "ปฏิทินวิชาการต้องได้รับการกำหนดวันเปิด-ปิดและวันสอบ",
      },
      {
        code: "RULE_WORKFLOW_APPROVAL",
        name: "การอนุมัติขั้นตอนการเสนอ",
        weight: 10.0,
        expression: "workflowApproved >= 100",
        description: "ผ่านการอนุมัติตามลำดับขั้นเรียบร้อยแล้ว",
      },
    ];

    for (const item of defaults) {
      await prisma.readinessIndicator.upsert({
        where: { code: item.code },
        update: { name: item.name, weight: item.weight, expression: item.expression, description: item.description },
        create: item,
      });
    }
  }
}

export const readinessEngine = new ReadinessEngine();
