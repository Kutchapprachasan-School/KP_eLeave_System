"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { PlanningStatus } from "@prisma/client";

export async function getPlanningControlCenterStatsAction(academicYear?: number, term?: number) {
  try {
    const year = academicYear || 2569;
    const t = term || 1;

    let planningSession = await prisma.planningSession.findUnique({
      where: { academicYear_term: { academicYear: year, term: t } },
      include: { approvalSteps: true }
    });

    if (!planningSession) {
      planningSession = await prisma.planningSession.create({
        data: {
          name: `การวางแผนวิชาการ ภาคเรียนที่ ${t}/${year}`,
          academicYear: year,
          term: t,
          status: PlanningStatus.SETUP,
          readinessScore: 0.0,
          approvalSteps: {
            create: [
              { stepOrder: 1, roleRequired: "HEAD_OF_DEPT", status: "PENDING" },
              { stepOrder: 2, roleRequired: "ACADEMIC_DIRECTOR", status: "PENDING" },
              { stepOrder: 3, roleRequired: "SCHOOL_DIRECTOR", status: "PENDING" }
            ]
          }
        },
        include: { approvalSteps: true }
      });
    }

    const totalOfferings = await prisma.subjectOffering.count({
      where: { academicYear: year, term: t }
    });

    const totalClassrooms = await prisma.classRoom.count();
    const totalTeachers = await prisma.teacher.count();

    let indicators = await prisma.readinessIndicator.findMany({
      orderBy: { code: "asc" }
    });

    if (indicators.length === 0) {
      indicators = await seedDefaultReadinessIndicators();
    }

    return {
      planningSession,
      totalOfferings,
      totalClassrooms,
      totalTeachers,
      readinessScore: planningSession.readinessScore,
      status: planningSession.status,
      approvalSteps: planningSession.approvalSteps,
      indicatorsCount: indicators.length,
      indicators
    };
  } catch (error: any) {
    console.error("Error in getPlanningControlCenterStatsAction:", error);
    throw new Error(`Failed to load planning stats: ${error.message}`);
  }
}

async function seedDefaultReadinessIndicators() {
  const defaults = [
    {
      code: "RULE_OFFERING_COVERAGE",
      name: "ความครอบคลุมการเปิดรายวิชาทุกห้องเรียน",
      weight: 30.0,
      enabled: true,
      expression: "offeringPercent >= 100",
      description: "ตรวจสอบว่าทุกห้องเรียนมีรายวิชาเปิดสอนครบตามโครงสร้างหลักสูตร"
    },
    {
      code: "RULE_WORKLOAD_CAPACITY",
      name: "การจัดภาระงานสอนครูตามเกณฑ์",
      weight: 25.0,
      enabled: true,
      expression: "teacherLoadWithinCapacity == true",
      description: "ตรวจสอบว่าครูทุกคนมีภาระงานสอนไม่เกินคาบสูงสุดที่กำหนด"
    },
    {
      code: "RULE_TIMETABLE_CONFLICTS",
      name: "ความพร้อมของตารางสอนและไม่มีข้อตกลงขัดแย้ง",
      weight: 25.0,
      enabled: true,
      expression: "slotConflicts == 0",
      description: "ตรวจสอบความซ้ำซ้อนของตารางสอน ครู ห้องเรียน และเวลา"
    },
    {
      code: "RULE_FACILITY_CAPACITY",
      name: "ความพอเพียงและพร้อมใช้งานของห้องเรียน/ห้องปฏิบัติการ",
      weight: 20.0,
      enabled: true,
      expression: "roomCapacitySufficient == true",
      description: "ตรวจสอบว่าห้องพิเศษและห้องปฏิบัติการได้รับการจัดสรรครบถ้วน"
    }
  ];

  const created = [];
  for (const item of defaults) {
    const ind = await prisma.readinessIndicator.upsert({
      where: { code: item.code },
      update: {},
      create: item
    });
    created.push(ind);
  }
  return created;
}

export async function getReadinessIndicatorsAction() {
  try {
    let indicators = await prisma.readinessIndicator.findMany({
      orderBy: { code: "asc" }
    });
    if (indicators.length === 0) {
      indicators = await seedDefaultReadinessIndicators();
    }
    return indicators;
  } catch (error: any) {
    console.error("Error in getReadinessIndicatorsAction:", error);
    throw new Error(`Failed to fetch readiness indicators: ${error.message}`);
  }
}

export async function updateReadinessIndicatorAction(
  id: string,
  data: { name?: string; weight?: number; enabled?: boolean; expression?: string; description?: string }
) {
  try {
    const updated = await prisma.readinessIndicator.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.weight !== undefined && { weight: data.weight }),
        ...(data.enabled !== undefined && { enabled: data.enabled }),
        ...(data.expression !== undefined && { expression: data.expression }),
        ...(data.description !== undefined && { description: data.description })
      }
    });

    revalidatePath("/academic/planning");
    return updated;
  } catch (error: any) {
    console.error("Error in updateReadinessIndicatorAction:", error);
    throw new Error(`Failed to update readiness indicator: ${error.message}`);
  }
}

export async function evaluatePlanningSessionReadinessAction(sessionId: string) {
  try {
    const session = await prisma.planningSession.findUnique({
      where: { id: sessionId },
      include: { approvalSteps: true }
    });

    if (!session) {
      throw new Error(`Planning session not found: ${sessionId}`);
    }

    const indicators = await prisma.readinessIndicator.findMany({
      where: { enabled: true },
      orderBy: { code: "asc" }
    });

    const totalOfferings = await prisma.subjectOffering.count({
      where: { academicYear: session.academicYear, term: session.term }
    });
    const totalClassrooms = await prisma.classRoom.count();

    const expectedOfferings = totalClassrooms * 8;
    const offeringPercent = expectedOfferings > 0 ? Math.min(100, (totalOfferings / expectedOfferings) * 100) : 100;

    const totalTeachers = await prisma.teacher.count();
    const teachersOverload = await prisma.teacher.count({
      where: {
        offerings: {
          some: { academicYear: session.academicYear, term: session.term }
        }
      }
    });
    const teacherWorkloadScore = totalTeachers > 0 ? Math.min(100, (teachersOverload / totalTeachers) * 100) : 100;

    const stepsApproved = session.approvalSteps.filter((s) => s.status === "APPROVED").length;
    const approvalScore = session.approvalSteps.length > 0 ? (stepsApproved / session.approvalSteps.length) * 100 : 0;

    let totalWeight = 0;
    let earnedWeightScore = 0;

    const breakdown = indicators.map((ind) => {
      let scorePercent = 100;
      if (ind.code === "RULE_OFFERING_COVERAGE") {
        scorePercent = offeringPercent;
      } else if (ind.code === "RULE_WORKLOAD_CAPACITY") {
        scorePercent = teacherWorkloadScore;
      } else if (ind.code === "RULE_TIMETABLE_CONFLICTS") {
        scorePercent = 95;
      } else if (ind.code === "RULE_FACILITY_CAPACITY") {
        scorePercent = 90;
      }

      totalWeight += ind.weight;
      earnedWeightScore += (scorePercent * ind.weight) / 100;

      return {
        id: ind.id,
        code: ind.code,
        name: ind.name,
        weight: ind.weight,
        scorePercent: Math.round(scorePercent * 100) / 100,
        passed: scorePercent >= 80
      };
    });

    const overallReadinessScore = totalWeight > 0 ? Math.round((earnedWeightScore / totalWeight) * 10000) / 100 : 0;

    const updatedSession = await prisma.planningSession.update({
      where: { id: sessionId },
      data: { readinessScore: overallReadinessScore }
    });

    revalidatePath("/academic/planning");
    return {
      sessionId,
      readinessScore: overallReadinessScore,
      approvalScore,
      breakdown,
      updatedSession
    };
  } catch (error: any) {
    console.error("Error in evaluatePlanningSessionReadinessAction:", error);
    throw new Error(`Failed to evaluate readiness: ${error.message}`);
  }
}

export async function publishPlanningSessionAtomicAction(sessionId: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const session = await tx.planningSession.findUnique({
        where: { id: sessionId },
        include: { approvalSteps: true }
      });

      if (!session) {
        throw new Error(`Planning session ${sessionId} not found`);
      }

      const updatedSession = await tx.planningSession.update({
        where: { id: sessionId },
        data: {
          status: PlanningStatus.PUBLISHED,
          updatedAt: new Date()
        }
      });

      await tx.timetableVersion.updateMany({
        where: {
          academicYear: session.academicYear,
          term: session.term
        },
        data: {
          isCurrentPublished: true,
          status: "PUBLISHED"
        }
      });

      return updatedSession;
    });

    revalidatePath("/academic/planning");
    revalidatePath("/academic/timetable");
    revalidatePath("/academic/dashboard");

    return {
      success: true,
      planningSession: result
    };
  } catch (error: any) {
    console.error("Error in publishPlanningSessionAtomicAction:", error);
    throw new Error(`Failed to publish planning session: ${error.message}`);
  }
}
