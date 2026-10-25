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
export async function getPlanningDashboardDataAction(params?: number | {
  fiscalYear?: number;
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

    const defaultThaiYear =
      new Date().getFullYear() + 543 + (new Date().getMonth() >= 9 ? 1 : 0);
    const targetFiscalYear =
      typeof params === "number"
        ? params
        : (params?.fiscalYear ?? defaultThaiYear);

    const [rawProjects, departments, teachers] = await Promise.all([
      prisma.project.findMany({
        where: {
          fiscalYear: { year: targetFiscalYear },
          deletedAt: null,
        },
        include: {
          department: true,
          leaderUser: true,
          fiscalYear: true,
          budgetSource: true,
          attachments: {
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
        orderBy: { code: "asc" },
      }),
      prisma.user.findMany({
        where: { isApproved: true },
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
export async function getPlanningLedgerAction(filters?: number | {
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

    const normFilters = typeof filters === "number" ? { fiscalYear: filters } : (filters || {});

    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
    };

    if (normFilters.departmentName && normFilters.departmentName !== "ALL") {
      where.departmentName = normFilters.departmentName;
    }

    if (normFilters.budgetSourceType && normFilters.budgetSourceType !== "ALL") {
      where.budgetSourceType = normFilters.budgetSourceType as any;
    }

    if (normFilters.fiscalYear) {
      where.fiscalYear = { year: normFilters.fiscalYear };
    }

    if (normFilters.myProjectsOnly) {
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

    if (allocatedSatang < 0 || adjustedSatang < 0) {
      return {
        success: false,
        error: "วงเงินงบประมาณต้องไม่ติดลบ",
      };
    }

    const existingProject = await prisma.project.findUnique({
      where: { id: input.id },
      select: { allocatedAmount: true, adjustedAmount: true },
    });
    if (!existingProject) {
      return {
        success: false,
        error: "ไม่พบโครงการที่ต้องการแก้ไข",
      };
    }

    const existingAllocatedSatang = toSatang(Number(existingProject.allocatedAmount));
    const existingAdjustedSatang = toSatang(Number(existingProject.adjustedAmount));

    const isAmountChanged =
      existingAllocatedSatang !== allocatedSatang ||
      existingAdjustedSatang !== adjustedSatang;

    if (isAmountChanged && !perms.canAdjustBudget) {
      return {
        success: false,
        error: "คุณไม่มีสิทธิ์ในการแก้ไขข้อมูลจำนวนเงินหรือโอนเปลี่ยนแปลงงบประมาณโครงการ (ต้องได้รับสิทธิ์ผู้แก้ไขจำนวนเงิน)",
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
          title: `ปีงบประมาณ พ.ศ. ${input.fiscalYear}`,
          startDate: new Date(`${input.fiscalYear - 544}-10-01`),
          endDate: new Date(`${input.fiscalYear - 543}-09-30`),
          status: "ACTIVE",
        },
      });
    }

    // 2. Check for duplicate project code in the same fiscal year (including soft-deleted to avoid P2002)
    const existing = await prisma.project.findFirst({
      where: {
        fiscalYearId: fy.id,
        code: cleanCode,
      },
    });

    if (existing) {
      if (existing.deletedAt) {
        return {
          success: false,
          error: `รหัสโครงการ "${cleanCode}" เคยถูกใช้งานและถูกลบไปแล้วในระบบ กรุณาใช้รหัสอื่น`,
        };
      }
      return {
        success: false,
        error: `รหัสโครงการ "${cleanCode}" มีอยู่ในปีงบประมาณ ${input.fiscalYear} แล้ว`,
      };
    }

    // 3. Resolve BudgetSource
    let bs = await prisma.budgetSource.findFirst({
      where: {
        fiscalYearId: fy.id,
        code: bSourceType,
      },
    });
    if (!bs) {
      const bSourceLabel = BUDGET_SOURCE_LABELS[bSourceType as keyof typeof BUDGET_SOURCE_LABELS] || bSourceType;
      bs = await prisma.budgetSource.create({
        data: {
          fiscalYearId: fy.id,
          code: bSourceType,
          name: `งบประมาณประเภท ${bSourceLabel}`,
          totalPlannedAmount: new Prisma.Decimal(10000000),
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

    const existingProject = await prisma.project.findUnique({
      where: { id: input.id },
      select: { allocatedAmount: true, adjustedAmount: true },
    });
    if (!existingProject) {
      return {
        success: false,
        error: "ไม่พบโครงการที่ต้องการแก้ไข",
      };
    }

    const existingAllocatedSatang = toSatang(Number(existingProject.allocatedAmount));
    const existingAdjustedSatang = toSatang(Number(existingProject.adjustedAmount));

    const isAmountChanged =
      existingAllocatedSatang !== allocatedSatang ||
      existingAdjustedSatang !== adjustedSatang;

    if (isAmountChanged && !perms.canAdjustBudget) {
      return {
        success: false,
        error: "คุณไม่มีสิทธิ์ในการแก้ไขข้อมูลจำนวนเงินหรือโอนเปลี่ยนแปลงงบประมาณโครงการ (ต้องได้รับสิทธิ์ผู้แก้ไขจำนวนเงิน)",
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
      if (input.departmentId) {
        dataToUpdate.department = { connect: { id: input.departmentId } };
        let dName = input.departmentName;
        if (!dName) {
          const dept = await prisma.department.findUnique({
            where: { id: input.departmentId },
            select: { name: true },
          });
          dName = dept?.name || null;
        }
        dataToUpdate.departmentName = dName;
      } else {
        dataToUpdate.department = { disconnect: true };
        dataToUpdate.departmentName = null;
      }
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

    const existing = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, code: true },
    });
    if (!existing) {
      return { success: false, error: "ไม่พบข้อมูลโครงการ" };
    }

    const now = new Date();
    // ปลดล็อก Unique Constraint uk_project_fy_code ให้สามารถนำรหัสดั้งเดิมไปใช้ใหม่ได้
    const freedCode = `${existing.code}_DEL_${Date.now()}`;
    await prisma.$transaction([
      prisma.project.update({
        where: { id: projectId },
        data: {
          deletedAt: now,
          status: "CANCELLED",
          code: freedCode,
        },
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

    if (allocatedSatang > 0 && !perms.canAdjustBudget) {
      return {
        success: false,
        error: "คุณไม่มีสิทธิ์ในการกำหนดวงเงินงบประมาณกิจกรรมย่อย (ต้องได้รับสิทธิ์ผู้แก้ไขจำนวนเงิน)",
      };
    }

    let nextActivityNo = input.activityNo;
    if (!nextActivityNo) {
      // ค้นหา activityNo สูงสุดจากทุกแถว (รวมแถวที่ถูก soft-delete) เพื่อป้องกัน P2002 uk_activity_project_no
      const lastActivity = await prisma.projectActivity.findFirst({
        where: { projectId: input.projectId },
        orderBy: { activityNo: "desc" },
        select: { activityNo: true },
      });
      nextActivityNo = (lastActivity?.activityNo ?? 0) + 1;
    } else {
      const existingAct = await prisma.projectActivity.findFirst({
        where: { projectId: input.projectId, activityNo: nextActivityNo },
        select: { id: true },
      });
      if (existingAct) {
        return {
          success: false,
          error: `ลำดับกิจกรรมที่ ${nextActivityNo} มีอยู่แล้วในโครงการนี้ กรุณาระบุลำดับอื่น`,
        };
      }
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

    const currentAct = await prisma.projectActivity.findUnique({
      where: { id: input.id },
      select: {
        projectId: true,
        activityNo: true,
        allocatedAmount: true,
        adjustedAmount: true,
      },
    });
    if (!currentAct) {
      return { success: false, error: "ไม่พบกิจกรรมย่อยที่ต้องการแก้ไข" };
    }

    const existingAllocatedSatang = toSatang(Number(currentAct.allocatedAmount));
    const existingAdjustedSatang = toSatang(Number(currentAct.adjustedAmount));

    const isAmountChanged =
      existingAllocatedSatang !== allocatedSatang ||
      existingAdjustedSatang !== adjustedSatang;

    if (isAmountChanged && !perms.canAdjustBudget) {
      return {
        success: false,
        error: "คุณไม่มีสิทธิ์ในการแก้ไขข้อมูลจำนวนเงินหรือโอนเปลี่ยนแปลงงบประมาณกิจกรรมย่อย (ต้องได้รับสิทธิ์ผู้แก้ไขจำนวนเงิน)",
      };
    }

    if (input.activityNo !== currentAct.activityNo) {
      const conflict = await prisma.projectActivity.findFirst({
        where: {
          projectId: currentAct.projectId,
          activityNo: input.activityNo,
          id: { not: input.id },
        },
      });
      if (conflict) {
        return {
          success: false,
          error: `ลำดับกิจกรรมที่ ${input.activityNo} มีอยู่แล้วในโครงการนี้`,
        };
      }
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
