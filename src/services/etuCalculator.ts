import { prisma } from "@/lib/db";

export interface CourseETUInput {
  subjectCode: string;
  subjectName?: string;
  periodsPerWeek: number;
  isLab?: boolean;
  preparationWeight?: number; // default 1.0
  labWeight?: number;         // default 1.1
  assessmentWeight?: number;  // default 1.0
}

export interface TeacherETUBreakdown {
  teacherId: string;
  teacherName?: string;
  maxWeeklyPeriods: number;
  distinctCourseCount: number;
  multiCoursePenaltyMultiplier: number;
  rawWeightedPeriodsSum: number;
  totalETU: number;
  overtimeETU: number;
  isOverloaded: boolean;
  courses: Array<{
    subjectCode: string;
    subjectName?: string;
    periodsPerWeek: number;
    isLab: boolean;
    preparationWeight: number;
    labWeight: number;
    assessmentWeight: number;
    weightedETU: number;
  }>;
}

export interface DepartmentETUSummary {
  departmentId: string;
  departmentName?: string;
  teacherCount: number;
  totalDepartmentETU: number;
  totalOvertimeETU: number;
  averageETUPerTeacher: number;
  overloadedTeacherCount: number;
  teacherBreakdowns: TeacherETUBreakdown[];
}

export class ETUCalculator {
  /**
   * Pure calculation function implementing the ETU formula.
   */
  public calculateETUDirect(
    courses: CourseETUInput[],
    maxWeeklyPeriods: number = 20
  ): TeacherETUBreakdown {
    const courseBreakdown = courses.map((course) => {
      const prepWeight = course.preparationWeight ?? 1.0;
      const labW = course.isLab ? (course.labWeight ?? 1.1) : 1.0;
      const assessW = course.assessmentWeight ?? 1.0;

      const weightedETU =
        Math.round(course.periodsPerWeek * prepWeight * labW * assessW * 100) / 100;

      return {
        subjectCode: course.subjectCode,
        subjectName: course.subjectName,
        periodsPerWeek: course.periodsPerWeek,
        isLab: course.isLab ?? false,
        preparationWeight: prepWeight,
        labWeight: labW,
        assessmentWeight: assessW,
        weightedETU,
      };
    });

    const rawWeightedPeriodsSum = courseBreakdown.reduce((sum, c) => sum + c.weightedETU, 0);

    // Multi-course penalty: 5% per extra course prep for distinct subject codes
    const distinctSubjectCodes = new Set(courses.map((c) => c.subjectCode));
    const distinctCourseCount = distinctSubjectCodes.size;
    const multiCoursePenaltyMultiplier =
      distinctCourseCount > 1 ? 1.0 + (distinctCourseCount - 1) * 0.05 : 1.0;

    const totalETU = Math.round(rawWeightedPeriodsSum * multiCoursePenaltyMultiplier * 100) / 100;
    const overtimeETU = Math.max(0, Math.round((totalETU - maxWeeklyPeriods) * 100) / 100);
    const isOverloaded = overtimeETU > 0;

    return {
      teacherId: "DIRECT_CALCULATION",
      maxWeeklyPeriods,
      distinctCourseCount,
      multiCoursePenaltyMultiplier: Math.round(multiCoursePenaltyMultiplier * 100) / 100,
      rawWeightedPeriodsSum: Math.round(rawWeightedPeriodsSum * 100) / 100,
      totalETU,
      overtimeETU,
      isOverloaded,
      courses: courseBreakdown,
    };
  }

  /**
   * Calculates ETU for a teacher directly querying database records for subject offerings and weight factors.
   */
  public async calculateTeacherETU(
    teacherId: string,
    academicYear: number,
    term: number
  ): Promise<TeacherETUBreakdown> {
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        offerings: {
          where: { academicYear, term },
          include: {
            subject: true,
            slots: true,
          },
        },
      },
    });

    if (!teacher) {
      throw new Error(`Teacher with ID "${teacherId}" not found.`);
    }

    const weightFactors = await prisma.courseWeightFactor.findMany();
    const weightMap = new Map(weightFactors.map((w) => [w.subjectCode, w]));

    const courses: CourseETUInput[] = teacher.offerings.map((offering) => {
      const subjectCode = offering.subject.code;
      const factor = weightMap.get(subjectCode);
      const periodsPerWeek = offering.slots.length > 0 ? offering.slots.length : 2; // default 2 periods if slots unassigned
      const isLab = offering.subject.name.includes("ปฏิบัติ") || offering.subject.name.includes("แล็บ");

      return {
        subjectCode,
        subjectName: offering.subject.name,
        periodsPerWeek,
        isLab,
        preparationWeight: factor?.preparationWeight ?? 1.0,
        labWeight: factor?.labWeight ?? 1.1,
        assessmentWeight: factor?.assessmentWeight ?? 1.0,
      };
    });

    const result = this.calculateETUDirect(courses, teacher.maxWeeklyPeriods);
    return {
      ...result,
      teacherId: teacher.id,
      teacherName: `${teacher.prefix || ""}${teacher.firstName} ${teacher.lastName}`.trim(),
    };
  }

  /**
   * Aggregates ETU calculation for all teachers within a department.
   */
  public async calculateDepartmentETU(
    departmentId: string,
    academicYear: number,
    term: number
  ): Promise<DepartmentETUSummary> {
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        teachers: true,
      },
    });

    if (!department) {
      throw new Error(`Department with ID "${departmentId}" not found.`);
    }

    const teacherBreakdowns = await Promise.all(
      department.teachers.map((t) => this.calculateTeacherETU(t.id, academicYear, term))
    );

    const totalDepartmentETU =
      Math.round(teacherBreakdowns.reduce((sum, t) => sum + t.totalETU, 0) * 100) / 100;
    const totalOvertimeETU =
      Math.round(teacherBreakdowns.reduce((sum, t) => sum + t.overtimeETU, 0) * 100) / 100;
    const teacherCount = teacherBreakdowns.length;
    const averageETUPerTeacher =
      teacherCount > 0 ? Math.round((totalDepartmentETU / teacherCount) * 100) / 100 : 0;
    const overloadedTeacherCount = teacherBreakdowns.filter((t) => t.isOverloaded).length;

    return {
      departmentId: department.id,
      departmentName: department.name,
      teacherCount,
      totalDepartmentETU,
      totalOvertimeETU,
      averageETUPerTeacher,
      overloadedTeacherCount,
      teacherBreakdowns,
    };
  }

  /**
   * Configures or updates CourseWeightFactor in database for a specific subject code.
   */
  public async upsertCourseWeightFactor(
    subjectCode: string,
    weights: {
      preparationWeight?: number;
      labWeight?: number;
      assessmentWeight?: number;
    }
  ) {
    return prisma.courseWeightFactor.upsert({
      where: { subjectCode },
      update: {
        ...(weights.preparationWeight !== undefined && { preparationWeight: weights.preparationWeight }),
        ...(weights.labWeight !== undefined && { labWeight: weights.labWeight }),
        ...(weights.assessmentWeight !== undefined && { assessmentWeight: weights.assessmentWeight }),
      },
      create: {
        subjectCode,
        preparationWeight: weights.preparationWeight ?? 1.0,
        labWeight: weights.labWeight ?? 1.1,
        assessmentWeight: weights.assessmentWeight ?? 1.0,
      },
    });
  }
}

export const etuCalculator = new ETUCalculator();
