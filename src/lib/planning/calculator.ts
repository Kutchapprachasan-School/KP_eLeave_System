/**
 * School Planning & Budget Tracking - Satang-Safe Financial Calculator
 * Module: src/lib/planning/calculator.ts
 */

import type { Prisma } from "@prisma/client";
import type {
  ActivityFinancialSummaryDTO,
  ProjectFinancialSummaryDTO,
  ExpenseCategoryType,
  ProjectDTO,
  PortfolioSummaryDTO,
} from "./types";

/**
 * Convert any decimal/number/string representation of Baht into integer Satang.
 * 1 Baht = 100 Satang. Rounding handles floating-point anomalies.
 */
export function toSatang(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const num = typeof value === "object" && "toNumber" in value ? value.toNumber() : Number(value);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Convert integer Satang back to Baht with 2 decimal precision.
 */
export function fromSatang(satang: number): number {
  return Number((satang / 100).toFixed(2));
}

export interface RawExpenseItem {
  amount: Prisma.Decimal | number | string;
  status: string;
  expenseCategory: string;
  deletedAt: Date | string | null;
}

export interface RawActivityItem {
  allocatedAmount: Prisma.Decimal | number | string;
  adjustedAmount?: Prisma.Decimal | number | string | null;
  expenses: RawExpenseItem[];
  deletedAt?: Date | string | null;
}

export interface RawAttachmentItem {
  attachmentType: string;
}

export interface RawProjectItem {
  allocatedAmount: Prisma.Decimal | number | string;
  adjustedAmount?: Prisma.Decimal | number | string | null;
  activities: RawActivityItem[];
  attachments?: RawAttachmentItem[];
  deletedAt?: Date | string | null;
}

/**
 * Calculate Activity-level financial aggregates (in integer satang).
 */
export function calculateActivityFinancials(activity: RawActivityItem): ActivityFinancialSummaryDTO {
  const allocatedSatang = toSatang(activity.allocatedAmount);
  const effectiveSatang =
    activity.adjustedAmount !== undefined && activity.adjustedAmount !== null
      ? toSatang(activity.adjustedAmount)
      : allocatedSatang;

  let reservedSatang = 0;
  let paidSatang = 0;
  const categoriesSet = new Set<ExpenseCategoryType>();

  for (const exp of activity.expenses || []) {
    if (exp.deletedAt !== null && exp.deletedAt !== undefined) continue;
    if (exp.status === "CANCELLED" || exp.status === "REJECTED") continue;

    const amountSatang = toSatang(exp.amount);
    if (exp.status === "RESERVED" || exp.status === "SUBMITTED") {
      reservedSatang += amountSatang;
      if (exp.expenseCategory) {
        categoriesSet.add(exp.expenseCategory as ExpenseCategoryType);
      }
    } else if (exp.status === "PAID" || exp.status === "APPROVED") {
      paidSatang += amountSatang;
      if (exp.expenseCategory) {
        categoriesSet.add(exp.expenseCategory as ExpenseCategoryType);
      }
    }
  }

  const totalSpentSatang = reservedSatang + paidSatang;
  const remainingSatang = effectiveSatang - totalSpentSatang;
  const usagePercentage =
    effectiveSatang === 0
      ? 0
      : Math.min(100, Number(((totalSpentSatang / effectiveSatang) * 100).toFixed(1)));

  return {
    allocatedAmount: fromSatang(allocatedSatang),
    effectiveBudget: fromSatang(effectiveSatang),
    isAdjusted: allocatedSatang !== effectiveSatang,
    reservedAmount: fromSatang(reservedSatang),
    paidAmount: fromSatang(paidSatang),
    totalSpent: fromSatang(totalSpentSatang),
    remainingBalance: fromSatang(remainingSatang),
    usagePercentage,
    usedCategories: Array.from(categoriesSet),
  };
}

/**
 * Calculate Project-level financial aggregates.
 * Invariant: Project effective budget is authoritative; activity sum is tracked for unallocated checking.
 */
export function calculateProjectFinancials(project: RawProjectItem): ProjectFinancialSummaryDTO {
  const allocatedSatang = toSatang(project.allocatedAmount);
  const effectiveSatang =
    project.adjustedAmount !== undefined && project.adjustedAmount !== null
      ? toSatang(project.adjustedAmount)
      : allocatedSatang;

  let totalAllocatedToActivitiesSatang = 0;
  let totalReservedSatang = 0;
  let totalPaidSatang = 0;

  for (const act of project.activities || []) {
    if (act.deletedAt !== null && act.deletedAt !== undefined) continue;
    const actSummary = calculateActivityFinancials(act);
    totalAllocatedToActivitiesSatang += toSatang(actSummary.effectiveBudget);
    totalReservedSatang += toSatang(actSummary.reservedAmount);
    totalPaidSatang += toSatang(actSummary.paidAmount);
  }

  const unallocatedSatang = effectiveSatang - totalAllocatedToActivitiesSatang;
  const totalSpentSatang = totalReservedSatang + totalPaidSatang;
  const remainingSatang = effectiveSatang - totalSpentSatang;
  const usagePercentage =
    effectiveSatang === 0
      ? 0
      : Math.min(100, Number(((totalSpentSatang / effectiveSatang) * 100).toFixed(1)));

  // Check SAR readiness
  const attachmentTypes = new Set((project.attachments || []).map((a) => a.attachmentType));
  const sarReadiness = {
    hasProposal: attachmentTypes.has("PROPOSAL"),
    hasApproval: attachmentTypes.has("APPROVAL"),
    hasSummary: attachmentTypes.has("SUMMARY"),
  };

  return {
    allocatedAmount: fromSatang(allocatedSatang),
    effectiveBudget: fromSatang(effectiveSatang),
    isAdjusted: allocatedSatang !== effectiveSatang,
    allocatedToActivities: fromSatang(totalAllocatedToActivitiesSatang),
    unallocatedBudget: fromSatang(unallocatedSatang),
    isFullyAllocated: unallocatedSatang === 0,
    isOverAllocated: unallocatedSatang < 0,
    reservedAmount: fromSatang(totalReservedSatang),
    paidAmount: fromSatang(totalPaidSatang),
    totalSpent: fromSatang(totalSpentSatang),
    remainingBalance: fromSatang(remainingSatang),
    usagePercentage,
    sarReadiness,
  };
}

/**
 * Validate expense invariant before recording or updating.
 * For updates / settlement, old active amount is released back to available balance.
 */
export function validateExpenseInvariant(params: {
  currentRemainingSatang: number;
  newAmountSatang: number;
  oldActiveAmountSatang?: number;
}): { valid: boolean; availableSatang: number; deltaSatang: number; reason?: string } {
  const { currentRemainingSatang, newAmountSatang, oldActiveAmountSatang = 0 } = params;

  if (newAmountSatang <= 0) {
    return {
      valid: false,
      availableSatang: currentRemainingSatang + oldActiveAmountSatang,
      deltaSatang: 0,
      reason: "จำนวนเงินที่ใช้จ่ายต้องมากกว่า 0 บาท",
    };
  }

  const availableSatang = currentRemainingSatang + oldActiveAmountSatang;
  if (newAmountSatang > availableSatang) {
    const deficitBaht = fromSatang(newAmountSatang - availableSatang);
    return {
      valid: false,
      availableSatang,
      deltaSatang: newAmountSatang - availableSatang,
      reason: `งบประมาณคงเหลือไม่เพียงพอ (ต้องการ ${fromSatang(newAmountSatang)} บาท แต่มีให้ใช้ได้ ${fromSatang(availableSatang)} บาท, ขาดอยู่ ${deficitBaht} บาท)`,
    };
  }

  return {
    valid: true,
    availableSatang,
    deltaSatang: availableSatang - newAmountSatang,
  };
}

export function computePortfolioSummary(projects: ProjectDTO[]): PortfolioSummaryDTO {
  let totalEffectiveSatang = 0;
  let totalReservedSatang = 0;
  let totalPaidSatang = 0;
  let totalRemainingSatang = 0;
  let activityCount = 0;

  for (const prj of projects) {
    if (prj.deletedAt) continue;
    totalEffectiveSatang += toSatang(prj.financials.effectiveBudget);
    totalReservedSatang += toSatang(prj.financials.reservedAmount);
    totalPaidSatang += toSatang(prj.financials.paidAmount);
    totalRemainingSatang += toSatang(prj.financials.remainingBalance);
    activityCount += prj.activities?.length || 0;
  }

  const totalSpentSatang = totalReservedSatang + totalPaidSatang;

  return {
    totalEffectiveBudget: fromSatang(totalEffectiveSatang),
    totalReservedAmount: fromSatang(totalReservedSatang),
    totalPaidAmount: fromSatang(totalPaidSatang),
    totalSpentAmount: fromSatang(totalSpentSatang),
    totalRemainingBalance: fromSatang(totalRemainingSatang),
    projectCount: projects.filter((p) => !p.deletedAt).length,
    activityCount,
  };
}

export const calculatePortfolioSummary = computePortfolioSummary;
