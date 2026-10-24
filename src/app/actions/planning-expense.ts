"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getPlanningPermissions } from "@/lib/planning/permissions";
import {
  toSatang,
  fromSatang,
  calculateActivityFinancials,
  validateExpenseInvariant,
} from "@/lib/planning/calculator";
import crypto from "crypto";

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

// Helper to ensure an allocation exists for this activity
async function ensureActivityAllocation(tx: Prisma.TransactionClient, activityId: string, projectId: string) {
  let allocation = await tx.activityTrancheAllocation.findFirst({
    where: { activityId },
  });

  if (!allocation) {
    // Find project and tranche
    const project = await tx.project.findUnique({
      where: { id: projectId },
      select: { fiscalYearId: true, budgetSourceId: true },
    });

    if (!project) throw new Error("ไม่พบโครงการ");

    let tranche = await tx.budgetTranche.findFirst({
      where: { budgetSourceId: project.budgetSourceId },
    });

    if (!tranche) {
      tranche = await tx.budgetTranche.create({
        data: {
          budgetSourceId: project.budgetSourceId,
          trancheNo: 1,
          name: "งวดงบประมาณประจำปี",
          allocatedAmount: new Prisma.Decimal(1000000),
          status: "RECEIVED",
        },
      });
    }

    allocation = await tx.activityTrancheAllocation.create({
      data: {
        activityId,
        budgetTrancheId: tranche.id,
        allocatedAmount: new Prisma.Decimal(1000000),
      },
    });
  }

  return allocation.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// ZOD SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const recordExpenseSchema = z.object({
  activityId: z.string().min(1, "กรุณาระบุกิจกรรม"),
  expenseDate: z.coerce.date(),
  title: z.string().trim().min(1, "กรุณาระบุรายการค่าใช้จ่าย").max(255),
  expenseCategory: z.enum(["REMUNERATION", "OPERATING", "MATERIALS", "EQUIPMENT", "UTILITIES", "OTHER"]).default("MATERIALS"),
  amount: z.number().positive("จำนวนเงินต้องมากกว่า 0 บาท"),
  status: z.enum(["PAID", "RESERVED"]).default("PAID"),
  receiptNo: z.string().trim().optional(),
  attachmentUrl: z.string().trim().optional(),
  remark: z.string().trim().optional(),
  requesterUserId: z.string().min(1, "กรุณาเลือกครูผู้ขอใช้เงิน"),
});

const settleReservedExpenseSchema = z.object({
  expenseId: z.string().min(1, "กรุณาระบุรายการ"),
  actualAmount: z.number().positive("จำนวนเงินจริงต้องมากกว่า 0 บาท"),
  receiptNo: z.string().trim().optional(),
  expenseDate: z.coerce.date().optional(),
  remark: z.string().trim().optional(),
});

const voidExpenseSchema = z.object({
  expenseId: z.string().min(1, "กรุณาระบุรายการ"),
  cancelRemark: z.string().trim().min(1, "กรุณาระบุเหตุผลการยกเลิกรายการ"),
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. RECORD EXPENSE ACTION (PAID or RESERVED)
// ─────────────────────────────────────────────────────────────────────────────

export async function recordExpenseAction(rawData: z.infer<typeof recordExpenseSchema>) {
  try {
    const { user, settings } = await getCurrentUserAndSettings();
    if (!user) return { success: false as const, error: "Unauthorized: กรุณาเข้าสู่ระบบก่อนดำเนินการ" };

    const perms = getPlanningPermissions(user, settings);
    if (!perms.canRecordAndSettleExpenses) {
      return { success: false as const, error: "Forbidden: คุณไม่มีสิทธิ์บันทึกการใช้เงิน (ต้องเป็นเจ้าหน้าที่แผนงานและการเงิน)" };
    }

    const validated = recordExpenseSchema.parse(rawData);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Load activity with expenses
      const activity = await tx.projectActivity.findUnique({
        where: { id: validated.activityId },
        include: {
          expenses: {
            where: { deletedAt: null },
          },
        },
      });

      if (!activity || activity.deletedAt) {
        throw new Error("ไม่พบกิจกรรมย่อยหรือกิจกรรมถูกลบแล้ว");
      }

      // 2. Invariant validation
      const fin = calculateActivityFinancials(activity as any);
      const remainingSatang = toSatang(fin.remainingBalance);
      const newAmountSatang = toSatang(validated.amount);

      const check = validateExpenseInvariant({
        currentRemainingSatang: remainingSatang,
        newAmountSatang,
      });

      if (!check.valid) {
        throw new Error(check.reason || "งบประมาณคงเหลือไม่เพียงพอ");
      }

      // 3. Resolve allocation id
      const allocationId = await ensureActivityAllocation(tx, validated.activityId, activity.projectId);

      // 4. Create expense
      const idempotencyKey = `EXP-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      const isPaid = validated.status === "PAID";

      const expense = await tx.activityExpense.create({
        data: {
          idempotencyKey,
          allocationId,
          activityId: validated.activityId,
          requestedByUserId: validated.requesterUserId,
          recordedByUserId: user.id,
          approvedByUserId: isPaid ? user.id : null,
          approvedAt: isPaid ? new Date() : null,
          expenseDate: validated.expenseDate,
          title: validated.title,
          expenseCategory: validated.expenseCategory as any,
          amount: new Prisma.Decimal(validated.amount),
          receiptNo: validated.receiptNo || null,
          attachmentUrl: validated.attachmentUrl || null,
          status: validated.status,
          remark: validated.remark || null,
        },
      });

      return expense;
    });

    revalidatePath("/planning");
    return { success: true as const, data: { id: result.id } };
  } catch (error: any) {
    console.error("recordExpenseAction error:", error);
    return { success: false as const, error: error.message || "เกิดข้อผิดพลาดในการบันทึกค่าใช้จ่าย" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SETTLE RESERVED EXPENSE ACTION (RESERVED -> PAID)
// ─────────────────────────────────────────────────────────────────────────────

export async function settleReservedExpenseAction(rawData: z.infer<typeof settleReservedExpenseSchema>) {
  try {
    const { user, settings } = await getCurrentUserAndSettings();
    if (!user) return { success: false as const, error: "Unauthorized: กรุณาเข้าสู่ระบบก่อนดำเนินการ" };

    const perms = getPlanningPermissions(user, settings);
    if (!perms.canRecordAndSettleExpenses) {
      return { success: false as const, error: "Forbidden: คุณไม่มีสิทธิ์ยืนยันเบิกจ่ายจริง" };
    }

    const validated = settleReservedExpenseSchema.parse(rawData);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Load target expense
      const expense = await tx.activityExpense.findUnique({
        where: { id: validated.expenseId },
      });

      if (!expense || expense.deletedAt) {
        throw new Error("ไม่พบรายการค่าใช้จ่ายนี้");
      }

      if (expense.status !== "RESERVED" && expense.status !== "SUBMITTED") {
        throw new Error(`รายการนี้อยู่ในสถานะ ${expense.status} ไม่สามารถยืนยันเบิกจ่ายซ้ำได้`);
      }

      const activityId = expense.activityId;
      if (!activityId) throw new Error("ไม่พบข้อมูลกิจกรรมของรายการนี้");

      // 2. Load activity with expenses
      const activity = await tx.projectActivity.findUnique({
        where: { id: activityId },
        include: {
          expenses: {
            where: { deletedAt: null },
          },
        },
      });

      if (!activity || activity.deletedAt) {
        throw new Error("ไม่พบกิจกรรมย่อย");
      }

      // 3. Settlement Delta Invariant check
      const fin = calculateActivityFinancials(activity as any);
      const remainingSatang = toSatang(fin.remainingBalance);
      const oldActiveSatang = toSatang(expense.amount);
      const newAmountSatang = toSatang(validated.actualAmount);

      const check = validateExpenseInvariant({
        currentRemainingSatang: remainingSatang,
        newAmountSatang,
        oldActiveAmountSatang: oldActiveSatang,
      });

      if (!check.valid) {
        throw new Error(check.reason || "งบประมาณคงเหลือไม่เพียงพอสำหรับยอดเงินใหม่");
      }

      // 4. Update expense to PAID
      const updated = await tx.activityExpense.update({
        where: { id: validated.expenseId },
        data: {
          status: "PAID",
          amount: new Prisma.Decimal(validated.actualAmount),
          receiptNo: validated.receiptNo || expense.receiptNo,
          expenseDate: validated.expenseDate || expense.expenseDate,
          remark: validated.remark || expense.remark,
          recordedByUserId: user.id,
          approvedByUserId: user.id,
          approvedAt: new Date(),
        },
      });

      return updated;
    });

    revalidatePath("/planning");
    return { success: true as const, data: { id: result.id } };
  } catch (error: any) {
    console.error("settleReservedExpenseAction error:", error);
    return { success: false as const, error: error.message || "เกิดข้อผิดพลาดในการยืนยันเบิกจ่ายจริง" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. VOID EXPENSE ACTION (Soft Delete / Cancel)
// ─────────────────────────────────────────────────────────────────────────────

export async function voidExpenseAction(rawData: z.infer<typeof voidExpenseSchema>) {
  try {
    const { user, settings } = await getCurrentUserAndSettings();
    if (!user) return { success: false as const, error: "Unauthorized: กรุณาเข้าสู่ระบบก่อนดำเนินการ" };

    const perms = getPlanningPermissions(user, settings);
    if (!perms.canRecordAndSettleExpenses) {
      return { success: false as const, error: "Forbidden: คุณไม่มีสิทธิ์ยกเลิกรายการนี้" };
    }

    const validated = voidExpenseSchema.parse(rawData);

    await prisma.activityExpense.update({
      where: { id: validated.expenseId },
      data: {
        status: "CANCELLED",
        deletedAt: new Date(),
        remark: validated.cancelRemark,
        recordedByUserId: user.id,
      },
    });

    revalidatePath("/planning");
    return { success: true as const };
  } catch (error: any) {
    console.error("voidExpenseAction error:", error);
    return { success: false as const, error: error.message || "เกิดข้อผิดพลาดในการยกเลิกรายการ" };
  }
}
