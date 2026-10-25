"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  calculatePortfolioSummary,
  fromSatang,
  toSatang,
} from "@/lib/planning/calculator";
import {
  getPlanningPermissions,
  PlanningUserPermissions,
} from "@/lib/planning/permissions";
import { serializeProjectToDTO } from "@/lib/planning/serializers";
import {
  BudgetSourceType,
  DepartmentDTO,
  PortfolioSummaryDTO,
  ProjectDTO,
  ProjectStatusType,
  SimpleUserDTO,
} from "@/lib/planning/types";
import { ActionResult, getPlanningActionContext } from "./_context";

export interface PlanningDashboardPayload {
  projects: ProjectDTO[];
  portfolioSummary: PortfolioSummaryDTO;
  departments: DepartmentDTO[];
  teachers: SimpleUserDTO[];
  modulePermissions: PlanningUserPermissions;
  currentUserId: string;
}

/**
 * ดึงข้อมูลทั้งหมดสำหรับหน้า /planning พร้อมแปลงผ่าน DTO Serializer
 */
export async function getPlanningDashboardDataAction(params: {
  fiscalYear: number;
}): Promise<ActionResult<PlanningDashboardPayload>> {
  try {
    const { user, settings } = await getPlanningActionContext();
    const modulePermissions = getPlanningPermissions(user, settings);

    if (!modulePermissions.canViewModule) {
      return {
        success: false,
        error: "ระบบแผนงานโครงการและงบประมาณถูกปิดใช้งานชั่วคราว",
      };
    }

    const [rawProjects, departments, teachers] = await Promise.all([
      prisma.project.findMany({
        where: {
          fiscalYear: { year: params.fiscalYear },
          deletedAt: null,
        },
        include: {
          department: true,
          leaderUser: true,
          fiscalYear: true,
          budgetSource: true,
          attachments: {
            where: { deletedAt: null },
            include: { uploadedByUser: true },
            orderBy: { createdAt: "desc" },
          },
          activities: {
            where: { deletedAt: null },
            orderBy: { activityNo: "asc" },
            include: {
              responsibleUser: true,
              expenses: {
                where: { deletedAt: null },
                orderBy: { expenseDate: "desc" },
                include: {
                  requestedByUser: true,
                  recordedByUser: true,
                },
              },
            },
          },
        },
        orderBy: [{ code: "asc" }],
      }),
      prisma.department.findMany({
        where: { isActive: true },
        orderBy: { code: "asc" },
      }),
      prisma.user.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true, position: true },
      }),
    ]);

    const projects = rawProjects.map((prj) =>
      serializeProjectToDTO(prj, user, settings)
    );
    const portfolioSummary = calculatePortfolioSummary(projects);

    return {
      success: true,
      data: {
        projects,
        portfolioSummary,
        departments: departments.map((d) => ({
          id: d.id,
          code: d.code,
          name: d.name,
        })),
        teachers: teachers.map((t) => ({
          id: t.id,
          name: t.name || "ไม่ระบุชื่อ",
          email: t.email,
          position: t.position || null,
        })),
        modulePermissions,
        currentUserId: user.id,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "ไม่สามารถโหลดข้อมูลแผนงานและงบประมาณได้",
    };
  }
}

/**
 * ดึงข้อมูลเฉพาะบัญชีโครงการ (Get Ledger Action)
 */
export async function getPlanningLedgerAction(filters?: {
  fiscalYear?: number;
  departmentName?: string;
  budgetSourceType?: string;
  searchQuery?: string;
  myProjectsOnly?: boolean;
}) {
  try {
    const { user, settings } = await getPlanningActionContext();
    const perms = getPlanningPermissions(user, settings);

    if (!perms.canViewModule) {
      return { success: false as const, error: "Forbidden: ระบบแผนงานโครงการปิดการใช้งานชั่วคราว" };
    }

    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
    };

    if (filters?.departmentName && filters.departmentName !== "ALL") {
      where.departmentName = filters.departmentName;
    }

    if (filters?.budgetSourceType && filters.budgetSourceType !== "ALL") {
      where.budgetSourceType = filters.budgetSourceType as any;
    }

    if (filters?.fiscalYear) {
      where.fiscalYear = { year: filters.fiscalYear };
    }

    if (filters?.myProjectsOnly) {
      where.OR = [
        { leaderUserId: user.id },
        { activities: { some: { responsibleUserId: user.id, deletedAt: null } } },
      ];
    }

    const projectsRaw = await prisma.project.findMany({
      where,
      include: {
        department: true,
        leaderUser: true,
        fiscalYear: true,
        budgetSource: true,
        activities: {
          where: { deletedAt: null },
          orderBy: { activityNo: "asc" },
          include: {
            responsibleUser: true,
            expenses: {
              where: { deletedAt: null },
              orderBy: { expenseDate: "desc" },
              include: {
                requestedByUser: { select: { id: true, name: true } },
                recordedByUser: { select: { id: true, name: true } },
              },
            },
          },
        },
        attachments: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          include: {
            uploadedByUser: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ code: "asc" }, { createdAt: "desc" }],
    });

    const projects = projectsRaw.map((p) => serializeProjectToDTO(p, user, settings));
    const portfolioSummary = calculatePortfolioSummary(projects);

    return {
      success: true as const,
      data: {
        projects,
        portfolioSummary,
        currentUser: { id: user.id, role: user.role, name: user.name },
        permissions: perms,
      },
    };
  } catch (error: any) {
    console.error("getPlanningLedgerAction error:", error);
    return { success: false as const, error: error.message || "เกิดข้อผิดพลาดในการโหลดข้อมูลแผนงาน" };
  }
}

export interface CreateProjectInput {
  fiscalYear: number;
  code: string;
  name: string;
  departmentId?: string;
  departmentName?: string;
  leaderUserId: string;
  budgetSourceType?: BudgetSourceType;
  budgetSource?: BudgetSourceType;
  strategyCode?: string | null;
  standardTags?: string[];
  allocatedAmount: number;
  adjustedAmount?: number;
  status?: ProjectStatusType;
}

/**
 * สร้างโครงการใหม่ (เฉพาะเจ้าหน้าที่แผนงานและแอดมิน)
 */
export async function createProjectAction(
  input: CreateProjectInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user, settings } = await getPlanningActionContext();
    const perms = getPlanningPermissions(user, settings);

    if (!perms.canManageProjectsAndBudget) {
      return {
        success: false,
        error: "คุณไม่มีสิทธิ์ในการสร้างโครงการ",
      };
    }

    const cleanCode = input.code.trim().toUpperCase();
    if (!cleanCode || !input.name.trim()) {
      return {
        success: false,
        error: "กรุณาระบุรหัสโครงการและชื่อโครงการให้ครบถ้วน",
      };
    }

    const allocatedSatang = toSatang(input.allocatedAmount);
    if (allocatedSatang < 0) {
      return {
        success: false,
        error: "วงเงินงบประมาณต้องไม่ติดลบ",
      };
    }

    const adjustedSatang =
      input.adjustedAmount !== undefined
        ? toSatang(input.adjustedAmount)
        : allocatedSatang;

    const bSourceType = input.budgetSourceType || input.budgetSource || "SUBSIDY";

    // 1. Resolve or create FiscalYear
    let fy = await prisma.fiscalYear.findFirst({
      where: { year: input.fiscalYear },
    });
    if (!fy) {
      fy = await prisma.fiscalYear.create({
        data: {
          year: input.fiscalYear,
          startDate: new Date(`${input.fiscalYear - 544}-10-01`),
          endDate: new Date(`${input.fiscalYear - 543}-09-30`),
          isActive: true,
        },
      });
    }

    // 2. Check for duplicate project code in the same fiscal year
    const existing = await prisma.project.findFirst({
      where: {
        fiscalYearId: fy.id,
        code: cleanCode,
        deletedAt: null,
      },
    });

    if (existing) {
      return {
        success: false,
        error: `รหัสโครงการ "${cleanCode}" มีอยู่ในปีงบประมาณ ${input.fiscalYear} แล้ว`,
      };
    }

    // 3. Resolve BudgetSource
    let bs = await prisma.budgetSource.findFirst({
      where: { sourceType: bSourceType },
    });
    if (!bs) {
      bs = await prisma.budgetSource.create({
        data: {
          name: `งบประมาณประเภท ${bSourceType}`,
          sourceType: bSourceType,
          totalBudget: new Prisma.Decimal(10000000),
        },
      });
    }

    // 4. Resolve Leader snapshot & Department
    let leaderName = "";
    if (input.leaderUserId) {
      const leader = await prisma.user.findUnique({
        where: { id: input.leaderUserId },
        select: { name: true },
      });
      leaderName = leader?.name || "";
    }

    let deptName = input.departmentName;
    if (input.departmentId && !deptName) {
      const dept = await prisma.department.findUnique({
        where: { id: input.departmentId },
        select: { name: true },
      });
      deptName = dept?.name || undefined;
    }

    const created = await prisma.project.create({
      data: {
        fiscalYearId: fy.id,
        budgetSourceId: bs.id,
        budgetSourceType: bSourceType,
        code: cleanCode,
        name: input.name.trim(),
        departmentId: input.departmentId || null,
        departmentName: deptName || null,
        leaderUserId: input.leaderUserId,
        leaderName,
        targetAcademicYear: input.fiscalYear,
        strategyCode: input.strategyCode?.trim() || null,
        standardTags: input.standardTags ?? [],
        allocatedAmount: fromSatang(allocatedSatang),
        adjustedAmount: fromSatang(adjustedSatang),
        status: input.status ?? "APPROVED",
      },
    });

    revalidatePath("/planning");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาดในการสร้างโครงการ",
    };
  }
}

export interface UpdateProjectInput {
  id: string;
  code: string;
  name: string;
  departmentId?: string;
  departmentName?: string;
  leaderUserId: string;
  fiscalYear?: number;
  budgetSourceType?: BudgetSourceType;
  budgetSource?: BudgetSourceType;
  strategyCode?: string | null;
  standardTags?: string[];
  allocatedAmount: number;
  adjustedAmount?: number;
  status?: ProjectStatusType;
}

/**
 * แก้ไขข้อมูลโครงการ หรือโอนเกลี่ยงบประมาณระดับโครงการ (adjustedAmount)
 */
export async function updateProjectAction(
  input: UpdateProjectInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user, settings } = await getPlanningActionContext();
    const perms = getPlanningPermissions(user, settings);

    if (!perms.canManageProjectsAndBudget) {
      return {
        success: false,
        error: "คุณไม่มีสิทธิ์ในการแก้ไขข้อมูลโครงการ",
      };
    }

    const allocatedSatang = toSatang(input.allocatedAmount);
    const adjustedSatang =
      input.adjustedAmount !== undefined
        ? toSatang(input.adjustedAmount)
        : allocatedSatang;

    if (allocatedSatang < 0 || adjustedSatang < 0) {
      return {
        success: false,
        error: "วงเงินงบประมาณต้องไม่ติดลบ",
      };
    }

    const dataToUpdate: Prisma.ProjectUpdateInput = {
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      strategyCode: input.strategyCode?.trim() || null,
      standardTags: input.standardTags ?? [],
      allocatedAmount: fromSatang(allocatedSatang),
      adjustedAmount: fromSatang(adjustedSatang),
    };

    if (input.status) {
      dataToUpdate.status = input.status;
    }

    if (input.departmentId !== undefined) {
      dataToUpdate.department = input.departmentId ? { connect: { id: input.departmentId } } : { disconnect: true };
    }

    if (input.leaderUserId) {
      dataToUpdate.leaderUser = { connect: { id: input.leaderUserId } };
      const leader = await prisma.user.findUnique({
        where: { id: input.leaderUserId },
        select: { name: true },
      });
      if (leader?.name) {
        dataToUpdate.leaderName = leader.name;
      }
    }

    const bSourceType = input.budgetSourceType || input.budgetSource;
    if (bSourceType) {
      dataToUpdate.budgetSourceType = bSourceType;
    }

    const updated = await prisma.project.update({
      where: { id: input.id },
      data: dataToUpdate,
    });

    revalidatePath("/planning");
    return { success: true, data: { id: updated.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาดในการแก้ไขโครงการ",
    };
  }
}

/**
 * ลบโครงการแบบ Soft Delete (ตั้งค่า deletedAt ทั้งโครงการและกิจกรรมย่อย)
 */
export async function softDeleteProjectAction(
  projectId: string
): Promise<ActionResult> {
  try {
    const { user, settings } = await getPlanningActionContext();
    const perms = getPlanningPermissions(user, settings);

    if (!perms.canManageProjectsAndBudget) {
      return {
        success: false,
        error: "คุณไม่มีสิทธิ์ในการลบโครงการ",
      };
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.project.update({
        where: { id: projectId },
        data: { deletedAt: now, status: "CANCELLED" },
      }),
      prisma.projectActivity.updateMany({
        where: { projectId, deletedAt: null },
        data: { deletedAt: now },
      }),
    ]);

    revalidatePath("/planning");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "ไม่สามารถลบโครงการได้",
    };
  }
}

export interface CreateActivityInput {
  projectId: string;
  activityNo?: number;
  name: string;
  responsibleUserId: string;
  allocatedAmount: number;
  adjustedAmount?: number;
}

/**
 * เพิ่มกิจกรรมย่อยภายใต้โครงการ (เฉพาะเจ้าหน้าที่แผนงานและแอดมิน)
 */
export async function createActivityAction(
  input: CreateActivityInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user, settings } = await getPlanningActionContext();
    const perms = getPlanningPermissions(user, settings);

    if (!perms.canManageProjectsAndBudget) {
      return {
        success: false,
        error: "คุณไม่มีสิทธิ์ในการเพิ่มกิจกรรมย่อย",
      };
    }

    if (!input.name.trim()) {
      return {
        success: false,
        error: "กรุณาระบุชื่อกิจกรรมย่อย",
      };
    }

    const allocatedSatang = toSatang(input.allocatedAmount);
    const adjustedSatang =
      input.adjustedAmount !== undefined
        ? toSatang(input.adjustedAmount)
        : allocatedSatang;

    if (allocatedSatang < 0 || adjustedSatang < 0) {
      return {
        success: false,
        error: "วงเงินงบประมาณกิจกรรมต้องไม่ติดลบ",
      };
    }

    let nextActivityNo = input.activityNo;
    if (!nextActivityNo) {
      const lastActivity = await prisma.projectActivity.findFirst({
        where: { projectId: input.projectId, deletedAt: null },
        orderBy: { activityNo: "desc" },
        select: { activityNo: true },
      });
      nextActivityNo = (lastActivity?.activityNo ?? 0) + 1;
    }

    const created = await prisma.projectActivity.create({
      data: {
        projectId: input.projectId,
        activityNo: nextActivityNo,
        name: input.name.trim(),
        responsibleUserId: input.responsibleUserId,
        allocatedAmount: fromSatang(allocatedSatang),
        adjustedAmount: fromSatang(adjustedSatang),
      },
    });

    revalidatePath("/planning");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาดในการสร้างกิจกรรมย่อย",
    };
  }
}

export interface UpdateActivityInput {
  id: string;
  activityNo: number;
  name: string;
  responsibleUserId: string;
  allocatedAmount: number;
  adjustedAmount?: number;
}

/**
 * แก้ไขกิจกรรมย่อย หรือโอนเกลี่ยงบประมาณระดับกิจกรรม
 */
export async function updateActivityAction(
  input: UpdateActivityInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user, settings } = await getPlanningActionContext();
    const perms = getPlanningPermissions(user, settings);

    if (!perms.canManageProjectsAndBudget) {
      return {
        success: false,
        error: "คุณไม่มีสิทธิ์ในการแก้ไขกิจกรรมย่อย",
      };
    }

    const allocatedSatang = toSatang(input.allocatedAmount);
    const adjustedSatang =
      input.adjustedAmount !== undefined
        ? toSatang(input.adjustedAmount)
        : allocatedSatang;

    if (allocatedSatang < 0 || adjustedSatang < 0) {
      return {
        success: false,
        error: "วงเงินงบประมาณต้องไม่ติดลบ",
      };
    }

    const updated = await prisma.projectActivity.update({
      where: { id: input.id },
      data: {
        activityNo: input.activityNo,
        name: input.name.trim(),
        responsibleUserId: input.responsibleUserId,
        allocatedAmount: fromSatang(allocatedSatang),
        adjustedAmount: fromSatang(adjustedSatang),
      },
    });

    revalidatePath("/planning");
    return { success: true, data: { id: updated.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาดในการแก้ไขกิจกรรมย่อย",
    };
  }
}

/**
 * ลบกิจกรรมย่อยแบบ Soft Delete
 */
export async function softDeleteActivityAction(
  activityId: string
): Promise<ActionResult> {
  try {
    const { user, settings } = await getPlanningActionContext();
    const perms = getPlanningPermissions(user, settings);

    if (!perms.canManageProjectsAndBudget) {
      return {
        success: false,
        error: "คุณไม่มีสิทธิ์ในการลบกิจกรรมย่อย",
      };
    }

    await prisma.projectActivity.update({
      where: { id: activityId },
      data: { deletedAt: new Date() },
    });

    revalidatePath("/planning");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "ไม่สามารถลบกิจกรรมย่อยได้",
    };
  }
}
