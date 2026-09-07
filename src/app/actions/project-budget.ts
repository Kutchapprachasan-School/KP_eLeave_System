"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  ProjectBudgetService,
  LedgerLockConflictError,
  FinancialInvariantViolationError,
  UnauthorizedServiceError,
} from "@/services/project-budget.service";

// ==========================================
// 🛡️ AUTH & CAPABILITY AUTHORIZATION
// ==========================================

export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user || null;
}

export interface BudgetAuthContext {
  projectId?: string;
  activityId?: string;
  allocationId?: string;
}

export async function verifyBudgetPermission(
  action: "MANAGE" | "SUBMIT" | "VIEW",
  context?: BudgetAuthContext
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    throw new Error("Unauthorized: กรุณาเข้าสู่ระบบก่อนดำเนินการ");
  }

  const settings = await prisma.systemSettings.findUnique({
    where: { id: "default" },
    select: { enableBudget: true, budgetAdminUserIds: true },
  });

  if (!settings?.enableBudget && user.role !== "ADMIN") {
    throw new Error("ระบบงบประมาณและโครงการถูกปิดการใช้งานชั่วคราว");
  }

  const budgetAdmins = (settings?.budgetAdminUserIds || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const isFinanceAdmin =
    user.role === "ADMIN" ||
    user.role === "FINANCE_OFFICER" ||
    budgetAdmins.includes(user.id);

  if (action === "MANAGE") {
    if (!isFinanceAdmin) {
      throw new Error("Forbidden: คุณไม่มีสิทธิ์จัดการข้อมูลการเงินและงบประมาณ");
    }
    return { user, isFinanceAdmin: true };
  }

  if (action === "SUBMIT") {
    if (isFinanceAdmin) return { user, isFinanceAdmin: true };

    let resolvedActivityId = context?.activityId;
    if (!resolvedActivityId && context?.allocationId) {
      const alloc = await prisma.activityTrancheAllocation.findUnique({
        where: { id: context.allocationId },
        select: { activityId: true },
      });
      if (!alloc) throw new Error("Forbidden: ไม่พบข้อมูลการจัดสรรงบประมาณ");
      resolvedActivityId = alloc.activityId;
    }

    if (resolvedActivityId) {
      const activity = await prisma.projectActivity.findUnique({
        where: { id: resolvedActivityId },
        include: { project: true },
      });
      if (
        activity?.responsibleUserId === user.id ||
        activity?.project.leaderUserId === user.id
      ) {
        return { user, isFinanceAdmin: false };
      }
      throw new Error("Forbidden: คุณไม่มีสิทธิ์ดำเนินการกับกิจกรรมนี้");
    }

    if (context?.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: context.projectId },
        include: { fiscalYear: true },
      });
      if (!project) throw new Error("Forbidden: ไม่พบโครงการ");
      if (project.fiscalYear.status !== "ACTIVE" || project.fiscalYear.isArchived) {
        throw new Error("ไม่สามารถดำเนินการในปีงบประมาณที่ปิดแล้ว");
      }
      if (project.leaderUserId === user.id) {
        return { user, isFinanceAdmin: false };
      }
      throw new Error("Forbidden: คุณไม่มีสิทธิ์ดำเนินการกับโครงการนี้");
    }

    throw new Error("Forbidden: คุณไม่มีสิทธิ์ดำเนินการกับทรัพยากรนี้");
  }

  return { user, isFinanceAdmin: Boolean(isFinanceAdmin) };
}

// ==========================================
// 🔒 ZOD SCHEMAS
// ==========================================

const cuidSchema = z.string().min(1, "ID ไม่ถูกต้อง");
const decimalAmountSchema = z
  .number()
  .positive({ message: "จำนวนเงินต้องมากกว่า 0 บาท" })
  .max(999999999.9999, { message: "จำนวนเงินเกินขีดจำกัดสูงสุด" })
  .refine((val) => Number(val.toFixed(4)) === val, {
    message: "จำนวนเงินรองรับทศนิยมสูงสุด 4 ตำแหน่ง",
  });

export const confirmDepositSchema = z.object({
  idempotencyKey: z.string().trim().min(16, "Idempotency key สั้นเกินไป").max(64),
  budgetTrancheId: cuidSchema,
  amount: decimalAmountSchema,
  receivedDate: z.coerce.date(),
  documentRef: z.string().trim().max(100).optional(),
  bankStatement: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const createProjectSchema = z.object({
  fiscalYearId: cuidSchema,
  budgetSourceId: cuidSchema,
  departmentName: z.string().trim().max(150).optional(),
  leaderUserId: cuidSchema,
  code: z.string().trim().min(1, "กรุณาระบุรหัสโครงการ").max(50),
  name: z.string().trim().min(1, "กรุณาระบุชื่อโครงการ").max(255),
  targetAcademicYear: z.number().int().min(2500).max(2650),
  allocatedAmount: decimalAmountSchema,
});

export const createActivitySchema = z.object({
  projectId: cuidSchema,
  responsibleUserId: cuidSchema,
  activityNo: z.number().int().positive({ message: "ลำดับกิจกรรมต้องเป็นจำนวนเต็มบวก" }),
  name: z.string().trim().min(1, "กรุณาระบุชื่อกิจกรรม").max(255),
  allocatedAmount: decimalAmountSchema,
  plannedStartDate: z.coerce.date().optional(),
  plannedEndDate: z.coerce.date().optional(),
  trancheAllocations: z
    .array(
      z.object({
        budgetTrancheId: cuidSchema,
        allocatedAmount: decimalAmountSchema,
      })
    )
    .min(1, "ต้องระบุการจัดสรรงวดเงินอย่างน้อย 1 งวด"),
});

export const recordExpenseSchema = z.object({
  idempotencyKey: z.string().trim().min(16, "Idempotency key สั้นเกินไป").max(64),
  allocationId: cuidSchema,
  expenseDate: z.coerce.date(),
  title: z.string().trim().min(1, "กรุณาระบุรายการค่าใช้จ่าย").max(255),
  amount: decimalAmountSchema,
  receiptNo: z.string().trim().max(100).optional(),
});

export const reverseExpenseSchema = z.object({
  originalExpenseId: cuidSchema,
  reason: z.string().trim().min(5, "กรุณาระบุเหตุผลการขอยกเลิกอย่างน้อย 5 ตัวอักษร").max(500),
});

export const transferBudgetSchema = z
  .object({
    fiscalYearId: cuidSchema,
    fromAllocationId: cuidSchema,
    toAllocationId: cuidSchema,
    amount: decimalAmountSchema,
    reason: z.string().trim().min(5, "กรุณาระบุเหตุผลการโอนเงินงบประมาณ").max(500),
  })
  .refine((data) => data.fromAllocationId !== data.toAllocationId, {
    message: "ไม่สามารถโอนเงินระหว่างรายการจัดสรรเดียวกันได้",
    path: ["toAllocationId"],
  });

export const attachmentSchema = z.object({
  parentId: cuidSchema, // projectId or expenseId
  storageProvider: z.enum(["LOCAL", "SUPABASE_STORAGE", "GOOGLE_DRIVE_LINK"]),
  objectKey: z.string().trim().min(1, "กรุณาระบุ URL หรือที่อยู่ไฟล์"),
  originalFileName: z.string().trim().min(1, "กรุณาระบุชื่อไฟล์"),
  mimeType: z.string().trim().optional(),
  fileSize: z.number().int().positive().optional(),
});

// ==========================================
// 🛡️ ERROR HANDLER
// ==========================================

function handleActionError(error: any): { success: false; error: string } {
  console.error("[ProjectBudget Action Error]:", error);

  if (error instanceof LedgerLockConflictError) {
    return { success: false, error: error.message };
  }
  if (error instanceof FinancialInvariantViolationError) {
    return { success: false, error: error.message };
  }
  if (error instanceof UnauthorizedServiceError) {
    return { success: false, error: error.message };
  }
  if (error?.code === "55P03" || error?.message?.includes("could not obtain lock")) {
    return {
      success: false,
      error: "ข้อมูลกำลังถูกแก้ไขโดยผู้ใช้อื่นในขณะนี้ กรุณาลองใหม่อีกครั้ง (409 Conflict)",
    };
  }
  if (error?.code === "P2002") {
    return { success: false, error: "ข้อมูลซ้ำซ้อนในระบบ (Duplicate Key Violation)" };
  }
  return {
    success: false,
    error: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการประมวลผล",
  };
}

// ==========================================
// 🚀 SERVER ACTIONS
// ==========================================

/**
 * Confirm money receipt into Budget Tranche
 */
export async function confirmTrancheDepositAction(rawData: z.infer<typeof confirmDepositSchema>) {
  try {
    const { user } = await verifyBudgetPermission("MANAGE");
    const validated = confirmDepositSchema.parse(rawData);

    const receipt = await ProjectBudgetService.confirmTrancheDeposit({
      idempotencyKey: validated.idempotencyKey,
      budgetTrancheId: validated.budgetTrancheId,
      amount: new Prisma.Decimal(validated.amount),
      receivedDate: validated.receivedDate,
      documentRef: validated.documentRef,
      bankStatement: validated.bankStatement,
      notes: validated.notes,
      confirmedByUserId: user.id,
    });

    return { success: true as const, data: receipt };
  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Create a new Project
 */
export async function createProjectAction(rawData: z.infer<typeof createProjectSchema>) {
  try {
    const { user } = await verifyBudgetPermission("MANAGE");
    const validated = createProjectSchema.parse(rawData);

    const project = await ProjectBudgetService.createProject({
      fiscalYearId: validated.fiscalYearId,
      budgetSourceId: validated.budgetSourceId,
      departmentName: validated.departmentName,
      leaderUserId: validated.leaderUserId,
      code: validated.code,
      name: validated.name,
      targetAcademicYear: validated.targetAcademicYear,
      allocatedAmount: new Prisma.Decimal(validated.allocatedAmount),
      actorUserId: user.id,
    });

    return { success: true as const, data: project };
  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Create Activity with Tranche Allocations
 */
export async function createActivityAction(rawData: z.infer<typeof createActivitySchema>) {
  try {
    const { user } = await verifyBudgetPermission("MANAGE");
    const validated = createActivitySchema.parse(rawData);

    const activity = await ProjectBudgetService.createActivityWithAllocations({
      projectId: validated.projectId,
      responsibleUserId: validated.responsibleUserId,
      activityNo: validated.activityNo,
      name: validated.name,
      allocatedAmount: new Prisma.Decimal(validated.allocatedAmount),
      plannedStartDate: validated.plannedStartDate,
      plannedEndDate: validated.plannedEndDate,
      trancheAllocations: validated.trancheAllocations.map((t) => ({
        budgetTrancheId: t.budgetTrancheId,
        allocatedAmount: new Prisma.Decimal(t.allocatedAmount),
      })),
      actorUserId: user.id,
    });

    return { success: true as const, data: activity };
  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Record an Expense (Always creates as SUBMITTED)
 */
export async function recordExpenseAction(rawData: z.infer<typeof recordExpenseSchema>) {
  try {
    const validated = recordExpenseSchema.parse(rawData);
    const { user } = await verifyBudgetPermission("SUBMIT", {
      allocationId: validated.allocationId,
    });

    const expense = await ProjectBudgetService.recordExpense({
      idempotencyKey: validated.idempotencyKey,
      allocationId: validated.allocationId,
      requestedByUserId: user.id,
      expenseDate: validated.expenseDate,
      title: validated.title,
      amount: new Prisma.Decimal(validated.amount),
      receiptNo: validated.receiptNo,
    });

    return { success: true as const, data: expense };
  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Record and Immediately Approve an Expense (For Finance Admins)
 */
export async function recordAndApproveExpenseAction(rawData: z.infer<typeof recordExpenseSchema>) {
  try {
    const { user } = await verifyBudgetPermission("MANAGE");
    const validated = recordExpenseSchema.parse(rawData);

    // Step 1: Record as SUBMITTED
    const expense = await ProjectBudgetService.recordExpense({
      idempotencyKey: validated.idempotencyKey,
      allocationId: validated.allocationId,
      requestedByUserId: user.id,
      expenseDate: validated.expenseDate,
      title: validated.title,
      amount: new Prisma.Decimal(validated.amount),
      receiptNo: validated.receiptNo,
    });

    // Step 2: Approve
    const approved = await ProjectBudgetService.approveExpense(expense.id, user.id);
    return { success: true as const, data: approved };
  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Approve a submitted Expense
 */
export async function approveExpenseAction(expenseId: string) {
  try {
    const { user } = await verifyBudgetPermission("MANAGE");
    const approved = await ProjectBudgetService.approveExpense(expenseId, user.id);
    return { success: true as const, data: approved };
  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Full Reversal of an Approved Expense
 */
export async function reverseExpenseAction(rawData: z.infer<typeof reverseExpenseSchema>) {
  try {
    const { user } = await verifyBudgetPermission("MANAGE");
    const validated = reverseExpenseSchema.parse(rawData);

    const reversal = await ProjectBudgetService.reverseApprovedExpense({
      originalExpenseId: validated.originalExpenseId,
      reason: validated.reason,
      cancelledByUserId: user.id,
      approvedByUserId: user.id,
    });

    return { success: true as const, data: reversal };
  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Transfer Budget between Allocations
 */
export async function transferBudgetAction(rawData: z.infer<typeof transferBudgetSchema>) {
  try {
    const { user } = await verifyBudgetPermission("MANAGE");
    const validated = transferBudgetSchema.parse(rawData);

    const transfer = await ProjectBudgetService.transferBudget({
      fiscalYearId: validated.fiscalYearId,
      fromAllocationId: validated.fromAllocationId,
      toAllocationId: validated.toAllocationId,
      amount: new Prisma.Decimal(validated.amount),
      reason: validated.reason,
      requestedByUserId: user.id,
      approvedByUserId: user.id,
    });

    return { success: true as const, data: transfer };
  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Get Dashboard Analytics for Fiscal Year
 */
export async function getFiscalYearDashboardAction(fiscalYearId: string) {
  try {
    await verifyBudgetPermission("VIEW");
    const metrics = await ProjectBudgetService.getFiscalYearDashboardMetrics(fiscalYearId);
    return { success: true as const, data: metrics };
  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Attach a Link or File to a Project
 */
export async function attachProjectFileAction(rawData: z.infer<typeof attachmentSchema>) {
  try {
    const validated = attachmentSchema.parse(rawData);
    const { user } = await verifyBudgetPermission("SUBMIT", {
      projectId: validated.parentId,
    });

    const attachment = await prisma.projectAttachment.create({
      data: {
        projectId: validated.parentId,
        storageProvider: validated.storageProvider,
        objectKey: validated.objectKey,
        originalFileName: validated.originalFileName,
        mimeType: validated.mimeType,
        fileSize: validated.fileSize,
        uploadedByUserId: user.id,
      },
    });

    return { success: true as const, data: attachment };
  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Ensure Default Fiscal Year and 4 Standard Inflow Tranches Exist (Seed / Setup Helper)
 */
export async function ensureDefaultFiscalYearAction(year = 2569) {
  try {
    const { user } = await verifyBudgetPermission("MANAGE");

    let fy = await prisma.fiscalYear.findUnique({
      where: { year },
      include: { budgetSources: { include: { tranches: true } } },
    });

    if (!fy) {
      fy = await prisma.fiscalYear.create({
        data: {
          year,
          title: `ปีงบประมาณ พ.ศ. ${year}`,
          startDate: new Date(`${year - 544}-10-01T00:00:00.000Z`), // 1 Oct
          endDate: new Date(`${year - 543}-09-30T23:59:59.999Z`),   // 30 Sep
          status: "ACTIVE",
          budgetSources: {
            create: {
              code: "SUBSIDY_PER_HEAD",
              name: "เงินอุดหนุนรายหัว (สพฐ.)",
              totalPlannedAmount: new Prisma.Decimal(1200000),
              tranches: {
                create: [
                  {
                    trancheNo: 1,
                    name: "ภาคเรียนที่ 1 (รอบ 70%)",
                    academicYear: year,
                    semester: 1,
                    expectedStartDate: new Date(`${year - 543}-04-01T00:00:00.000Z`),
                    expectedEndDate: new Date(`${year - 543}-05-31T23:59:59.999Z`),
                    plannedAmount: new Prisma.Decimal(420000),
                  },
                  {
                    trancheNo: 2,
                    name: "ภาคเรียนที่ 1 (รอบ 30%)",
                    academicYear: year,
                    semester: 1,
                    expectedStartDate: new Date(`${year - 543}-07-01T00:00:00.000Z`),
                    expectedEndDate: new Date(`${year - 543}-08-31T23:59:59.999Z`),
                    plannedAmount: new Prisma.Decimal(180000),
                  },
                  {
                    trancheNo: 3,
                    name: "ภาคเรียนที่ 2 (รอบ 70%)",
                    academicYear: year,
                    semester: 2,
                    expectedStartDate: new Date(`${year - 543}-10-01T00:00:00.000Z`),
                    expectedEndDate: new Date(`${year - 543}-11-30T23:59:59.999Z`),
                    plannedAmount: new Prisma.Decimal(420000),
                  },
                  {
                    trancheNo: 4,
                    name: "ภาคเรียนที่ 2 (รอบ 30%)",
                    academicYear: year,
                    semester: 2,
                    expectedStartDate: new Date(`${year - 542}-02-01T00:00:00.000Z`),
                    expectedEndDate: new Date(`${year - 542}-03-31T23:59:59.999Z`),
                    plannedAmount: new Prisma.Decimal(180000),
                  },
                ],
              },
            },
          },
        },
        include: { budgetSources: { include: { tranches: true } } },
      });
    }

    return { success: true as const, data: fy };
  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Get Active Users List for Dropdowns
 */
export async function getBudgetUsersAction() {
  try {
    await verifyBudgetPermission("VIEW");
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        position: true,
        role: true,
        image: true,
      },
      orderBy: { name: "asc" },
    });
    return { success: true as const, data: users };
  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Get Available Fiscal Years List
 */
export async function getFiscalYearsListAction() {
  try {
    await verifyBudgetPermission("VIEW");
    const list = await prisma.fiscalYear.findMany({
      where: { isArchived: false },
      select: { id: true, year: true, title: true, status: true },
      orderBy: { year: "desc" },
    });
    return { success: true as const, data: list };
  } catch (error) {
    return handleActionError(error);
  }
}
