"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getPlanningPermissions } from "@/lib/planning/permissions";
import { serializeProjectToDTO, computePortfolioSummary } from "@/lib/planning/serializers";
import type { BudgetSourceCategoryType, ProjectStatusType } from "@/lib/planning/types";

async function getCurrentUserAndSettings() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const user = session?.user || null;

  const settings = await prisma.systemSettings.findUnique({
    where: { id: "default" },
    select: { enablePlanning: true, planningOfficerUserIds: true },
  });

  return {
    user,
    settings: {
      enablePlanning: settings?.enablePlanning ?? true,
      planningOfficerUserIds: settings?.planningOfficerUserIds || "",
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ZOD SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const createProjectSchema = z.object({
  code: z.string().trim().min(1, "กรุณาระบุรหัสโครงการ").max(50),
  name: z.string().trim().min(1, "กรุณาระบุชื่อโครงการ").max(255),
  fiscalYear: z.number().int().min(2500).max(2650).default(2569),
  departmentName: z.string().trim().optional(),
  departmentId: z.string().trim().optional(),
  leaderUserId: z.string().min(1, "กรุณาเลือกหัวหน้าโครงการ"),
  budgetSourceType: z.enum(["SUBSIDY", "FREE_EDUCATION_15Y", "SCHOOL_INCOME", "LOCAL_GOV", "OTHER"]).default("SUBSIDY"),
  strategyCode: z.string().trim().optional(),
  standardTags: z.array(z.string()).default([]),
  allocatedAmount: z.number().min(0, "วงเงินต้องไม่ติดลบ"),
  adjustedAmount: z.number().min(0, "วงเงินต้องไม่ติดลบ").optional(),
});

const updateProjectSchema = z.object({
  id: z.string().min(1),
  code: z.string().trim().min(1, "กรุณาระบุรหัสโครงการ").max(50),
  name: z.string().trim().min(1, "กรุณาระบุชื่อโครงการ").max(255),
  departmentName: z.string().trim().optional(),
  departmentId: z.string().trim().optional(),
  leaderUserId: z.string().min(1, "กรุณาเลือกหัวหน้าโครงการ"),
  budgetSourceType: z.enum(["SUBSIDY", "FREE_EDUCATION_15Y", "SCHOOL_INCOME", "LOCAL_GOV", "OTHER"]).default("SUBSIDY"),
  strategyCode: z.string().trim().optional(),
  standardTags: z.array(z.string()).default([]),
  status: z.enum(["DRAFT", "APPROVED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).default("APPROVED"),
  allocatedAmount: z.number().min(0),
  adjustedAmount: z.number().min(0).optional(),
});

const createActivitySchema = z.object({
  projectId: z.string().min(1, "กรุณาระบุโครงการ"),
  name: z.string().trim().min(1, "กรุณาระบุชื่อกิจกรรม").max(255),
  activityNo: z.number().int().min(1).default(1),
  responsibleUserId: z.string().min(1, "กรุณาเลือกผู้รับผิดชอบกิจกรรม"),
  allocatedAmount: z.number().min(0, "วงเงินต้องไม่ติดลบ"),
  adjustedAmount: z.number().min(0, "วงเงินต้องไม่ติดลบ").optional(),
});

const updateActivitySchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "กรุณาระบุชื่อกิจกรรม").max(255),
  activityNo: z.number().int().min(1),
  responsibleUserId: z.string().min(1, "กรุณาเลือกผู้รับผิดชอบกิจกรรม"),
  allocatedAmount: z.number().min(0),
  adjustedAmount: z.number().min(0).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET PLANNING LEDGER ACTION
// ─────────────────────────────────────────────────────────────────────────────

export async function getPlanningLedgerAction(filters?: {
  fiscalYear?: number;
  departmentName?: string;
  budgetSourceType?: string;
  searchQuery?: string;
  myProjectsOnly?: boolean;
}) {
  try {
    const { user, settings } = await getCurrentUserAndSettings();
    if (!user) {
      return { success: false as const, error: "Unauthorized: กรุณาเข้าสู่ระบบก่อนดำเนินการ" };
    }

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

    if (filters?.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { code: { contains: q, mode: "insensitive" } },
        { leaderName: { contains: q, mode: "insensitive" } },
        { leaderUser: { name: { contains: q, mode: "insensitive" } } },
        { activities: { some: { name: { contains: q, mode: "insensitive" }, deletedAt: null } } },
      ];
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
        fiscalYear: true,
        budgetSource: true,
        department: true,
        leaderUser: { select: { id: true, name: true, image: true, role: true } },
        activities: {
          where: { deletedAt: null },
          orderBy: { activityNo: "asc" },
          include: {
            responsibleUser: { select: { id: true, name: true, image: true } },
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
    const portfolioSummary = computePortfolioSummary(projects);

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

// ─────────────────────────────────────────────────────────────────────────────
// 2. CREATE PROJECT ACTION
// ─────────────────────────────────────────────────────────────────────────────

export async function createProjectAction(rawData: z.infer<typeof createProjectSchema>) {
  try {
    const { user, settings } = await getCurrentUserAndSettings();
    if (!user) return { success: false as const, error: "Unauthorized: กรุณาเข้าสู่ระบบก่อนดำเนินการ" };

    const perms = getPlanningPermissions(user, settings);
    if (!perms.canManageProjectsAndBudget) {
      return { success: false as const, error: "Forbidden: คุณไม่มีสิทธิ์สร้างโครงการ (ต้องเป็นเจ้าหน้าที่แผนงาน)" };
    }

    const validated = createProjectSchema.parse(rawData);

    // Resolve or create FiscalYear and BudgetSource if not existing
    let fiscalYear = await prisma.fiscalYear.findFirst({
      where: { year: validated.fiscalYear },
    });

    if (!fiscalYear) {
      fiscalYear = await prisma.fiscalYear.create({
        data: {
          year: validated.fiscalYear,
          title: `ปีงบประมาณ ${validated.fiscalYear}`,
          startDate: new Date(`${validated.fiscalYear - 543 - 1}-10-01`),
          endDate: new Date(`${validated.fiscalYear - 543}-09-30`),
          status: "ACTIVE",
        },
      });
    }

    let budgetSource = await prisma.budgetSource.findFirst({
      where: { fiscalYearId: fiscalYear.id, code: validated.budgetSourceType },
    });

    if (!budgetSource) {
      const sourceNameMap: Record<string, string> = {
        SUBSIDY: "เงินอุดหนุนรายหัว",
        FREE_EDUCATION_15Y: "เงินเรียนฟรี 15 ปี",
        SCHOOL_INCOME: "เงินรายได้สถานศึกษา",
        LOCAL_GOV: "เงินอุดหนุน อปท. / อบจ.",
        OTHER: "แหล่งงบประมาณอื่นๆ",
      };
      budgetSource = await prisma.budgetSource.create({
        data: {
          fiscalYearId: fiscalYear.id,
          code: validated.budgetSourceType,
          name: sourceNameMap[validated.budgetSourceType] || "งบประมาณสถานศึกษา",
        },
      });
    }

    const leader = await prisma.user.findUnique({
      where: { id: validated.leaderUserId },
      select: { name: true },
    });

    const effectiveAdjusted = validated.adjustedAmount !== undefined ? validated.adjustedAmount : validated.allocatedAmount;

    const project = await prisma.project.create({
      data: {
        fiscalYearId: fiscalYear.id,
        budgetSourceId: budgetSource.id,
        budgetSourceType: validated.budgetSourceType as any,
        code: validated.code,
        name: validated.name,
        targetAcademicYear: validated.fiscalYear,
        departmentName: validated.departmentName || null,
        departmentId: validated.departmentId || null,
        leaderUserId: validated.leaderUserId,
        leaderName: leader?.name || "",
        strategyCode: validated.strategyCode || null,
        standardTags: validated.standardTags,
        allocatedAmount: new Prisma.Decimal(validated.allocatedAmount),
        adjustedAmount: new Prisma.Decimal(effectiveAdjusted),
        status: "APPROVED",
      },
    });

    revalidatePath("/planning");
    return { success: true as const, data: { id: project.id, code: project.code, name: project.name } };
  } catch (error: any) {
    console.error("createProjectAction error:", error);
    if (error.code === "P2002") {
      return { success: false as const, error: "รหัสโครงการนี้มีอยู่แล้วในปีงบประมาณที่เลือก กรุณาใช้รหัสอื่น" };
    }
    return { success: false as const, error: error.message || "เกิดข้อผิดพลาดในการสร้างโครงการ" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. UPDATE PROJECT ACTION
// ─────────────────────────────────────────────────────────────────────────────

export async function updateProjectAction(rawData: z.infer<typeof updateProjectSchema>) {
  try {
    const { user, settings } = await getCurrentUserAndSettings();
    if (!user) return { success: false as const, error: "Unauthorized: กรุณาเข้าสู่ระบบก่อนดำเนินการ" };

    const perms = getPlanningPermissions(user, settings);
    if (!perms.canManageProjectsAndBudget) {
      return { success: false as const, error: "Forbidden: คุณไม่มีสิทธิ์แก้ไขโครงการ" };
    }

    const validated = updateProjectSchema.parse(rawData);

    const leader = await prisma.user.findUnique({
      where: { id: validated.leaderUserId },
      select: { name: true },
    });

    const updated = await prisma.project.update({
      where: { id: validated.id },
      data: {
        code: validated.code,
        name: validated.name,
        departmentName: validated.departmentName || null,
        departmentId: validated.departmentId || null,
        leaderUserId: validated.leaderUserId,
        leaderName: leader?.name || "",
        budgetSourceType: validated.budgetSourceType as any,
        strategyCode: validated.strategyCode || null,
        standardTags: validated.standardTags,
        status: validated.status,
        allocatedAmount: new Prisma.Decimal(validated.allocatedAmount),
        adjustedAmount: validated.adjustedAmount !== undefined ? new Prisma.Decimal(validated.adjustedAmount) : undefined,
      },
    });

    revalidatePath("/planning");
    return { success: true as const, data: { id: updated.id } };
  } catch (error: any) {
    console.error("updateProjectAction error:", error);
    return { success: false as const, error: error.message || "เกิดข้อผิดพลาดในการอัปเดตโครงการ" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SOFT DELETE PROJECT ACTION
// ─────────────────────────────────────────────────────────────────────────────

export async function softDeleteProjectAction(projectId: string) {
  try {
    const { user, settings } = await getCurrentUserAndSettings();
    if (!user) return { success: false as const, error: "Unauthorized: กรุณาเข้าสู่ระบบก่อนดำเนินการ" };

    const perms = getPlanningPermissions(user, settings);
    if (!perms.canManageProjectsAndBudget) {
      return { success: false as const, error: "Forbidden: คุณไม่มีสิทธิ์ลบโครงการ" };
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date() },
    });

    revalidatePath("/planning");
    return { success: true as const };
  } catch (error: any) {
    console.error("softDeleteProjectAction error:", error);
    return { success: false as const, error: error.message || "เกิดข้อผิดพลาดในการลบโครงการ" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CREATE ACTIVITY ACTION
// ─────────────────────────────────────────────────────────────────────────────

export async function createActivityAction(rawData: z.infer<typeof createActivitySchema>) {
  try {
    const { user, settings } = await getCurrentUserAndSettings();
    if (!user) return { success: false as const, error: "Unauthorized: กรุณาเข้าสู่ระบบก่อนดำเนินการ" };

    const perms = getPlanningPermissions(user, settings);
    if (!perms.canManageProjectsAndBudget) {
      return { success: false as const, error: "Forbidden: คุณไม่มีสิทธิ์เพิ่มกิจกรรมย่อย" };
    }

    const validated = createActivitySchema.parse(rawData);
    const effectiveAdjusted = validated.adjustedAmount !== undefined ? validated.adjustedAmount : validated.allocatedAmount;

    // Check project exists
    const project = await prisma.project.findUnique({
      where: { id: validated.projectId },
      select: { id: true, activities: { select: { activityNo: true } } },
    });

    if (!project) return { success: false as const, error: "ไม่พบโครงการที่ระบุ" };

    // Resolve unique activityNo
    const existingNos = project.activities.map((a) => a.activityNo);
    let targetNo = validated.activityNo;
    while (existingNos.includes(targetNo)) {
      targetNo++;
    }

    const activity = await prisma.projectActivity.create({
      data: {
        projectId: validated.projectId,
        name: validated.name,
        activityNo: targetNo,
        responsibleUserId: validated.responsibleUserId,
        allocatedAmount: new Prisma.Decimal(validated.allocatedAmount),
        adjustedAmount: new Prisma.Decimal(effectiveAdjusted),
      },
    });

    revalidatePath("/planning");
    return { success: true as const, data: { id: activity.id, name: activity.name, activityNo: activity.activityNo } };
  } catch (error: any) {
    console.error("createActivityAction error:", error);
    return { success: false as const, error: error.message || "เกิดข้อผิดพลาดในการสร้างกิจกรรมย่อย" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. UPDATE ACTIVITY ACTION
// ─────────────────────────────────────────────────────────────────────────────

export async function updateActivityAction(rawData: z.infer<typeof updateActivitySchema>) {
  try {
    const { user, settings } = await getCurrentUserAndSettings();
    if (!user) return { success: false as const, error: "Unauthorized: กรุณาเข้าสู่ระบบก่อนดำเนินการ" };

    const perms = getPlanningPermissions(user, settings);
    if (!perms.canManageProjectsAndBudget) {
      return { success: false as const, error: "Forbidden: คุณไม่มีสิทธิ์แก้ไขกิจกรรมย่อย" };
    }

    const validated = updateActivitySchema.parse(rawData);

    const updated = await prisma.projectActivity.update({
      where: { id: validated.id },
      data: {
        name: validated.name,
        activityNo: validated.activityNo,
        responsibleUserId: validated.responsibleUserId,
        allocatedAmount: new Prisma.Decimal(validated.allocatedAmount),
        adjustedAmount: validated.adjustedAmount !== undefined ? new Prisma.Decimal(validated.adjustedAmount) : undefined,
      },
    });

    revalidatePath("/planning");
    return { success: true as const, data: { id: updated.id } };
  } catch (error: any) {
    console.error("updateActivityAction error:", error);
    return { success: false as const, error: error.message || "เกิดข้อผิดพลาดในการแก้ไขกิจกรรมย่อย" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. SOFT DELETE ACTIVITY ACTION
// ─────────────────────────────────────────────────────────────────────────────

export async function softDeleteActivityAction(activityId: string) {
  try {
    const { user, settings } = await getCurrentUserAndSettings();
    if (!user) return { success: false as const, error: "Unauthorized: กรุณาเข้าสู่ระบบก่อนดำเนินการ" };

    const perms = getPlanningPermissions(user, settings);
    if (!perms.canManageProjectsAndBudget) {
      return { success: false as const, error: "Forbidden: คุณไม่มีสิทธิ์ลบกิจกรรมย่อย" };
    }

    await prisma.projectActivity.update({
      where: { id: activityId },
      data: { deletedAt: new Date() },
    });

    revalidatePath("/planning");
    return { success: true as const };
  } catch (error: any) {
    console.error("softDeleteActivityAction error:", error);
    return { success: false as const, error: error.message || "เกิดข้อผิดพลาดในการลบกิจกรรมย่อย" };
  }
}
