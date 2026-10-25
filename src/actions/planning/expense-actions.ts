"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  calculateActivityFinancials,
  fromSatang,
  toSatang,
  validateExpenseInvariant,
} from "@/lib/planning/calculator";
import { getPlanningPermissions } from "@/lib/planning/permissions";
import { serializeExpenseToDTO } from "@/lib/planning/serializers";
import {
  ActivityExpenseDTO,
  ExpenseCategoryType,
  ExpenseStatusType,
} from "@/lib/planning/types";
import { ActionResult, getPlanningActionContext } from "./_context";

// Helper to ensure an allocation exists for this activity
async function ensureActivityAllocation(tx: Prisma.TransactionClient, activityId: string, projectId: string) {
  let allocation = await tx.activityTrancheAllocation.findFirst({
    where: { activityId },
  });

  if (!allocation) {
    const project = await tx.project.findUnique({
      where: { id: projectId },
      select: { fiscalYearId: true, budgetSourceId: true, targetAcademicYear: true },
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
          academicYear: project.targetAcademicYear || 2569,
          semester: 1,
          plannedAmount: new Prisma.Decimal(1000000),
          isClosed: false,
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

export interface RecordExpenseInput {
  activityId: string;
  expenseDate: string | Date; // ISO Date String or Date
  title: string;
  expenseCategory: ExpenseCategoryType;
  amount: number;
  status: Extract<ExpenseStatusType, "PAID" | "RESERVED">;
  requesterUserId: string;
  receiptNo?: string | null;
  attachmentUrl?: string | null;
  attachmentKey?: string | null;
  remark?: string | null;
}

/**
 * บันทึกการใช้จ่ายเงินใหม่ (เบิกจ่ายจริง PAID หรือ กันวงเงิน RESERVED)
 * รันภายใน prisma.$transaction เพื่อป้องกันการเบิกเกินงบจาก Race Condition
 */
export async function recordExpenseAction(
  input: RecordExpenseInput
): Promise<ActionResult<ActivityExpenseDTO>> {
  try {
    const { user, settings } = await getPlanningActionContext();
    const perms = getPlanningPermissions(user, settings);

    if (!perms.canRecordAndSettleExpenses) {
      return {
        success: false,
        error:
          "เฉพาะเจ้าหน้าที่แผนงานและการเงินเท่านั้นที่สามารถบันทึกตัดงบประมาณได้",
      };
    }

    if (!input.title.trim()) {
      return {
        success: false,
        error: "กรุณาระบุรายการค่าใช้จ่าย",
      };
    }

    const amountSatang = toSatang(input.amount);
    if (amountSatang <= 0) {
      return {
        success: false,
        error: "จำนวนเงินต้องมากกว่า 0.00 บาท",
      };
    }

    const createdExpense = await prisma.$transaction(async (tx) => {
      // 1. ดึงข้อมูลกิจกรรมและรายการใช้จ่ายล่าสุดภายใน Transaction
      const activity = await tx.projectActivity.findFirst({
        where: { id: input.activityId, deletedAt: null },
        include: {
          project: { select: { id: true, deletedAt: true, status: true } },
          expenses: {
            where: { deletedAt: null },
          },
        },
      });

      if (!activity || activity.project.deletedAt !== null) {
        throw new Error("ไม่พบกิจกรรมย่อยที่ต้องการตัดงบประมาณ");
      }

      if (activity.project.status === "CANCELLED") {
        throw new Error("ไม่สามารถบันทึกค่าใช้จ่ายในโครงการที่ยกเลิกแล้วได้");
      }

      // 2. คำนวณยอดคงเหลือปัจจุบันของกิจกรรม
      const financials = calculateActivityFinancials(activity as any);

      // 3. ตรวจสอบ Financial Invariant ว่ายอดเบิกใหม่ไม่เกินยอดคงเหลือ
      const check = validateExpenseInvariant({
        currentRemainingSatang: toSatang(financials.remainingBalance),
        newAmountSatang: amountSatang,
      });

      if (!check.valid) {
        throw new Error(check.reason || "งบประมาณคงเหลือไม่เพียงพอ");
      }

      // 4. Resolve allocation id
      const allocationId = await ensureActivityAllocation(tx, activity.id, activity.project.id);
      const idempotencyKey = `EXP-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      const isPaid = input.status === "PAID";

      // 5. บันทึกรายการใช้จ่าย
      const expDate = typeof input.expenseDate === "string" ? new Date(input.expenseDate) : input.expenseDate;

      return tx.activityExpense.create({
        data: {
          idempotencyKey,
          allocationId,
          activityId: activity.id,
          expenseDate: expDate,
          title: input.title.trim(),
          expenseCategory: input.expenseCategory,
          amount: new Prisma.Decimal(input.amount),
          status: input.status,
          requestedByUserId: input.requesterUserId,
          recordedByUserId: user.id,
          approvedByUserId: isPaid ? user.id : null,
          approvedAt: isPaid ? new Date() : null,
          receiptNo: input.receiptNo?.trim() || null,
          attachmentUrl: input.attachmentUrl || null,
          remark: input.remark?.trim() || null,
        },
        include: {
          requestedByUser: { select: { id: true, name: true } },
          recordedByUser: { select: { id: true, name: true } },
        },
      });
    });

    revalidatePath("/planning");
    return {
      success: true,
      data: serializeExpenseToDTO(createdExpense as any),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาดในการบันทึกการใช้จ่ายเงิน",
    };
  }
}

export interface SettleReservedExpenseInput {
  expenseId: string;
  actualAmount: number;
  expenseDate?: string | Date;
  receiptNo?: string;
  expenseCategory?: ExpenseCategoryType;
  title?: string;
  attachmentUrl?: string | null;
  attachmentKey?: string | null;
  remark?: string | null;
}

/**
 * ยืนยันเบิกจ่ายจริงจากรายการที่เคยกันวงเงินไว้ (เปลี่ยนสถานะ RESERVED -> PAID)
 * ใช้สมการ Settlement Delta Invariant: Available = CurrentRemaining + OldReservedAmount
 */
export async function settleReservedExpenseAction(
  input: SettleReservedExpenseInput
): Promise<ActionResult<ActivityExpenseDTO>> {
  try {
    const { user, settings } = await getPlanningActionContext();
    const perms = getPlanningPermissions(user, settings);

    if (!perms.canRecordAndSettleExpenses) {
      return {
        success: false,
        error:
          "เฉพาะเจ้าหน้าที่แผนงานและการเงินเท่านั้นที่สามารถยืนยันการเบิกจ่ายจริงได้",
      };
    }

    const actualSatang = toSatang(input.actualAmount);
    if (actualSatang <= 0) {
      return {
        success: false,
        error: "จำนวนเงินที่เบิกจ่ายจริงต้องมากกว่า 0.00 บาท",
      };
    }

    const updatedExpense = await prisma.$transaction(async (tx) => {
      // 1. ดึงรายการกันเงินเดิมพร้อมข้อมูลกิจกรรมแม่และบิลทั้งหมดในกิจกรรมนั้น
      const existingExpense = await tx.activityExpense.findFirst({
        where: { id: input.expenseId, deletedAt: null },
        include: {
          activity: {
            include: {
              expenses: {
                where: { deletedAt: null },
              },
            },
          },
        },
      });

      if (!existingExpense) {
        throw new Error("ไม่พบรายการกันวงเงินที่ต้องการเคลียร์ยอด");
      }

      if (existingExpense.status !== "RESERVED" && existingExpense.status !== "SUBMITTED") {
        throw new Error(
          "รายการนี้ไม่ใช่สถานะกันวงเงิน (RESERVED) จึงไม่สามารถเคลียร์ยอดซ้ำได้"
        );
      }

      // 2. คำนวณยอดคงเหลือปัจจุบันของกิจกรรม (ซึ่งหักยอด RESERVED เดิมไปแล้ว)
      const financials = calculateActivityFinancials(existingExpense.activity as any);

      // 3. ตรวจสอบด้วย Settlement Delta Invariant
      const check = validateExpenseInvariant({
        currentRemainingSatang: toSatang(financials.remainingBalance),
        newAmountSatang: actualSatang,
        oldActiveAmountSatang: toSatang(existingExpense.amount),
      });

      if (!check.valid) {
        throw new Error(check.reason || "งบประมาณคงเหลือไม่เพียงพอสำหรับยอดเงินใหม่");
      }

      // 4. อัปเดตสถานะเป็น PAID พร้อมบันทึกยอดจ่ายจริงและเลขที่ใบเสร็จ
      const expDate = input.expenseDate
        ? typeof input.expenseDate === "string"
          ? new Date(input.expenseDate)
          : input.expenseDate
        : existingExpense.expenseDate;

      return tx.activityExpense.update({
        where: { id: existingExpense.id },
        data: {
          status: "PAID",
          amount: new Prisma.Decimal(input.actualAmount),
          expenseDate: expDate,
          receiptNo: input.receiptNo?.trim() || existingExpense.receiptNo,
          expenseCategory:
            input.expenseCategory ?? existingExpense.expenseCategory,
          title: input.title?.trim() || existingExpense.title,
          attachmentUrl:
            input.attachmentUrl !== undefined
              ? input.attachmentUrl
              : existingExpense.attachmentUrl,
          remark:
            input.remark !== undefined
              ? input.remark?.trim() || null
              : existingExpense.remark,
          recordedByUserId: user.id,
          approvedByUserId: user.id,
          approvedAt: new Date(),
        },
        include: {
          requestedByUser: { select: { id: true, name: true } },
          recordedByUser: { select: { id: true, name: true } },
        },
      });
    });

    revalidatePath("/planning");
    return {
      success: true,
      data: serializeExpenseToDTO(updatedExpense as any),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาดในการยืนยันเบิกจ่ายจริง",
    };
  }
}

export interface VoidExpenseInput {
  expenseId: string;
  cancelRemark: string;
}

/**
 * ยกเลิกรายการใช้จ่ายแบบมีประวัติ (Soft Delete / Void)
 * เมื่อยกเลิกแล้ว ยอดเงินจะถูกคืนกลับเข้ายอดคงเหลือของกิจกรรมทันที
 */
export async function voidExpenseAction(
  input: VoidExpenseInput
): Promise<ActionResult> {
  try {
    const { user, settings } = await getPlanningActionContext();
    const perms = getPlanningPermissions(user, settings);

    if (!perms.canRecordAndSettleExpenses) {
      return {
        success: false,
        error:
          "เฉพาะเจ้าหน้าที่แผนงานและการเงินเท่านั้นที่สามารถยกเลิกรายการตัดเงินได้",
      };
    }

    const cleanReason = input.cancelRemark.trim();
    if (!cleanReason) {
      return {
        success: false,
        error: "กรุณาระบุเหตุผลในการยกเลิกรายการใช้จ่ายเพื่อเก็บเป็นประวัติตรวจสอบ",
      };
    }

    await prisma.$transaction(async (tx) => {
      const existing = await tx.activityExpense.findFirst({
        where: { id: input.expenseId, deletedAt: null },
      });

      if (!existing) {
        throw new Error("ไม่พบรายการใช้จ่าย หรือรายการนี้ถูกยกเลิกไปแล้ว");
      }

      const combinedRemark = existing.remark
        ? `${existing.remark} | [ยกเลิก: ${cleanReason}]`
        : `[ยกเลิก: ${cleanReason}]`;

      await tx.activityExpense.update({
        where: { id: existing.id },
        data: {
          status: "CANCELLED",
          deletedAt: new Date(),
          remark: combinedRemark,
          recordedByUserId: user.id,
        },
      });
    });

    revalidatePath("/planning");
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาดในการยกเลิกรายการใช้จ่าย",
    };
  }
}
