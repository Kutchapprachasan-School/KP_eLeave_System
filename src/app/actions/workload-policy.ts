"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type TeachingLoadPolicy = {
  id: string;
  name: string;
  minWeeklyPeriods: number;
  maxWeeklyPeriods: number;
  targetWeeklyPeriods: number;
  overtimeThreshold: number;
  isDefault: boolean;
  departmentId?: string;
};

let inMemoryTeachingPolicies: TeachingLoadPolicy[] = [
  {
    id: "policy-standard",
    name: "นโยบายภาระงานสอนมาตรฐานครูประจำการ",
    minWeeklyPeriods: 18,
    maxWeeklyPeriods: 24,
    targetWeeklyPeriods: 20,
    overtimeThreshold: 20,
    isDefault: true
  },
  {
    id: "policy-head-dept",
    name: "นโยบายภาระงานสอนหัวหน้ากลุ่มสาระฯ",
    minWeeklyPeriods: 14,
    maxWeeklyPeriods: 18,
    targetWeeklyPeriods: 16,
    overtimeThreshold: 16,
    isDefault: false
  },
  {
    id: "policy-special",
    name: "นโยบายภาระงานสอนครูพิเศษ/ปฏิบัติการ",
    minWeeklyPeriods: 12,
    maxWeeklyPeriods: 20,
    targetWeeklyPeriods: 15,
    overtimeThreshold: 18,
    isDefault: false
  }
];

export async function getTeachingLoadPoliciesAction(): Promise<TeachingLoadPolicy[]> {
  try {
    return inMemoryTeachingPolicies;
  } catch (error: any) {
    console.error("Error in getTeachingLoadPoliciesAction:", error);
    return inMemoryTeachingPolicies;
  }
}

export async function saveTeachingLoadPolicyAction(data: TeachingLoadPolicy) {
  try {
    if (!data.name || !data.maxWeeklyPeriods) {
      throw new Error("Missing required policy fields: name, maxWeeklyPeriods");
    }

    const policyId = data.id || `policy-${Date.now()}`;
    const updatedPolicy: TeachingLoadPolicy = {
      ...data,
      id: policyId,
      minWeeklyPeriods: data.minWeeklyPeriods || 18,
      maxWeeklyPeriods: data.maxWeeklyPeriods || 24,
      targetWeeklyPeriods: data.targetWeeklyPeriods || 20,
      overtimeThreshold: data.overtimeThreshold || 20,
      isDefault: data.isDefault ?? false
    };

    if (updatedPolicy.isDefault) {
      inMemoryTeachingPolicies = inMemoryTeachingPolicies.map((p) => ({ ...p, isDefault: false }));
    }

    const existingIdx = inMemoryTeachingPolicies.findIndex((p) => p.id === policyId);
    if (existingIdx >= 0) {
      inMemoryTeachingPolicies[existingIdx] = updatedPolicy;
    } else {
      inMemoryTeachingPolicies.push(updatedPolicy);
    }

    revalidatePath("/academic/policy");
    revalidatePath("/academic/workload");
    return updatedPolicy;
  } catch (error: any) {
    console.error("Error in saveTeachingLoadPolicyAction:", error);
    throw new Error(`Failed to save teaching load policy: ${error.message}`);
  }
}

export async function getCourseWeightFactorsAction() {
  try {
    let factors = await prisma.courseWeightFactor.findMany({
      orderBy: { subjectCode: "asc" }
    });

    if (factors.length === 0) {
      const defaultFactors = [
        { subjectCode: "SCI101", preparationWeight: 1.2, labWeight: 1.3, assessmentWeight: 1.1 },
        { subjectCode: "MATH101", preparationWeight: 1.1, labWeight: 1.0, assessmentWeight: 1.2 },
        { subjectCode: "ENG101", preparationWeight: 1.0, labWeight: 1.1, assessmentWeight: 1.0 },
        { subjectCode: "COMP101", preparationWeight: 1.2, labWeight: 1.4, assessmentWeight: 1.1 },
        { subjectCode: "THAI101", preparationWeight: 1.0, labWeight: 1.0, assessmentWeight: 1.0 }
      ];

      const created = [];
      for (const item of defaultFactors) {
        const factor = await prisma.courseWeightFactor.upsert({
          where: { subjectCode: item.subjectCode },
          update: {},
          create: item
        });
        created.push(factor);
      }
      factors = created;
    }

    return factors;
  } catch (error: any) {
    console.error("Error in getCourseWeightFactorsAction:", error);
    throw new Error(`Failed to fetch course weight factors: ${error.message}`);
  }
}

export type SaveCourseWeightFactorInput = {
  id?: string;
  subjectCode: string;
  preparationWeight?: number;
  labWeight?: number;
  assessmentWeight?: number;
};

export async function saveCourseWeightFactorAction(data: SaveCourseWeightFactorInput) {
  try {
    if (!data.subjectCode) {
      throw new Error("subjectCode is required");
    }

    const factor = await prisma.courseWeightFactor.upsert({
      where: { subjectCode: data.subjectCode },
      update: {
        preparationWeight: data.preparationWeight ?? 1.0,
        labWeight: data.labWeight ?? 1.0,
        assessmentWeight: data.assessmentWeight ?? 1.0
      },
      create: {
        subjectCode: data.subjectCode,
        preparationWeight: data.preparationWeight ?? 1.0,
        labWeight: data.labWeight ?? 1.0,
        assessmentWeight: data.assessmentWeight ?? 1.0
      }
    });

    revalidatePath("/academic/policy");
    revalidatePath("/academic/workload");
    return factor;
  } catch (error: any) {
    console.error("Error in saveCourseWeightFactorAction:", error);
    throw new Error(`Failed to save course weight factor: ${error.message}`);
  }
}

export async function calculateTeacherEtuWorkloadAction(
  teacherId: string,
  academicYear?: number,
  term?: number
) {
  try {
    const year = academicYear || 2569;
    const t = term || 1;

    const weightFactorsList = await prisma.courseWeightFactor.findMany();
    const weightMap = new Map<string, { prep: number; lab: number; assess: number }>();
    for (const wf of weightFactorsList) {
      weightMap.set(wf.subjectCode, {
        prep: wf.preparationWeight,
        lab: wf.labWeight,
        assess: wf.assessmentWeight
      });
    }

    const teacherWhere = teacherId && teacherId !== "ALL" ? { id: teacherId } : {};

    const teachers = await prisma.teacher.findMany({
      where: teacherWhere,
      include: {
        department: true,
        offerings: {
          where: { academicYear: year, term: t },
          include: {
            subject: true,
            classRoom: true,
            slots: true
          }
        }
      },
      orderBy: { employeeCode: "asc" }
    });

    const results = teachers.map((teacher) => {
      let rawWeeklyPeriods = 0;
      let totalEtu = 0;

      const offeringBreakdown = teacher.offerings.map((offering) => {
        const periods = offering.slots.length > 0 ? offering.slots.length : Math.round(offering.subject.credits * 2) || 2;
        rawWeeklyPeriods += periods;

        const wf = weightMap.get(offering.subject.code) || { prep: 1.0, lab: 1.0, assess: 1.0 };
        const combinedFactor = wf.prep * wf.lab * wf.assess;
        const effectiveEtu = Math.round(periods * combinedFactor * 100) / 100;

        totalEtu += effectiveEtu;

        return {
          offeringId: offering.id,
          subjectCode: offering.subject.code,
          subjectName: offering.subject.name,
          classRoomName: offering.classRoom.name,
          rawPeriods: periods,
          weightFactors: wf,
          effectiveEtu
        };
      });

      totalEtu = Math.round(totalEtu * 100) / 100;
      const maxPeriods = teacher.maxWeeklyPeriods || 20;
      const capacityPercent = Math.round((totalEtu / maxPeriods) * 10000) / 100;

      let status = "BALANCED";
      if (capacityPercent < 70) {
        status = "UNDERLOAD";
      } else if (capacityPercent > 105) {
        status = "OVERLOAD";
      } else if (capacityPercent >= 90 && capacityPercent <= 105) {
        status = "OPTIMAL";
      }

      return {
        teacherId: teacher.id,
        employeeCode: teacher.employeeCode,
        teacherName: `${teacher.prefix || ""}${teacher.firstName} ${teacher.lastName}`.trim(),
        departmentName: teacher.department?.name || "-",
        maxWeeklyPeriods: maxPeriods,
        rawWeeklyPeriods,
        totalEtu,
        capacityPercent,
        status,
        offeringBreakdown
      };
    });

    return {
      academicYear: year,
      term: t,
      evaluatedTeachersCount: results.length,
      teachers: results
    };
  } catch (error: any) {
    console.error("Error in calculateTeacherEtuWorkloadAction:", error);
    throw new Error(`Failed to calculate teacher ETU workload: ${error.message}`);
  }
}
