import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// ==========================================
// 🛡️ DOMAIN ERRORS
// ==========================================

export class LedgerLockConflictError extends Error {
  constructor(message = "ข้อมูลกำลังถูกแก้ไขโดยผู้ใช้อื่นในขณะนี้ กรุณาลองใหม่อีกครั้ง") {
    super(message);
    this.name = "LedgerLockConflictError";
  }
}

export class FinancialInvariantViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinancialInvariantViolationError";
  }
}

export class UnauthorizedServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedServiceError";
  }
}

// ==========================================
// 📊 EXPENSE STATE MACHINE
// ==========================================

export type ExpenseStatus = "DRAFT" | "SUBMITTED" | "REJECTED" | "APPROVED" | "REVERSED";

export const VALID_EXPENSE_TRANSITIONS: Record<ExpenseStatus, readonly ExpenseStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["APPROVED", "REJECTED"],
  REJECTED: ["DRAFT"],
  APPROVED: ["REVERSED"],
  REVERSED: [],
} as const;

export function validateExpenseStateTransition(current: string, target: string): void {
  const validNext = VALID_EXPENSE_TRANSITIONS[current as ExpenseStatus];
  if (!validNext || !validNext.includes(target as ExpenseStatus)) {
    throw new FinancialInvariantViolationError(
      `ไม่สามารถเปลี่ยนสถานะจาก "${current}" เป็น "${target}" ได้ — สถานะที่อนุญาต: [${(validNext || []).join(", ")}]`
    );
  }
}

// ==========================================
// 🔒 CONCURRENCY LOCK PROTOCOL (NOWAIT)
// ==========================================

/**
 * Acquires row-level locks using SELECT ... FOR UPDATE NOWAIT.
 * Sorts IDs in ascending alphanumeric order to prevent deadlocks across concurrent transactions.
 */
export async function acquireRowLocks(
  tx: Prisma.TransactionClient,
  table:
    | "Project"
    | "ProjectActivity"
    | "BudgetTranche"
    | "ActivityTrancheAllocation"
    | "FiscalYear"
    | "BudgetSource"
    | "ActivityExpense",
  ids: string[]
) {
  if (!ids || ids.length === 0) return;
  const sortedIds = [...new Set(ids.filter(Boolean))].sort();

  try {
    for (const id of sortedIds) {
      await tx.$executeRawUnsafe(
        `SELECT "id" FROM "${table}" WHERE "id" = $1 FOR UPDATE NOWAIT;`,
        id
      );
    }
  } catch (error: any) {
    if (error?.code === "55P03" || error?.message?.includes("could not obtain lock")) {
      throw new LedgerLockConflictError(
        `ทรัพยากร ${table} [${sortedIds.join(", ")}] กำลังถูกทำรายการโดยผู้ใช้อื่น (409 Conflict)`
      );
    }
    throw error;
  }
}

// ==========================================
// 🛡️ SERVICE-LEVEL AUTHORIZATION (Authoritative Role Boundary)
// ==========================================

async function isFinanceAdmin(
  tx: Prisma.TransactionClient,
  userId: string
): Promise<boolean> {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user) return false;
  if (user.role === "ADMIN" || user.role === "FINANCE_OFFICER") return true;

  const settings = await tx.systemSettings.findUnique({
    where: { id: "default" },
    select: { budgetAdminUserIds: true },
  });
  const budgetAdmins = (settings?.budgetAdminUserIds || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return budgetAdmins.includes(userId);
}

async function verifyServiceAuth(
  tx: Prisma.TransactionClient,
  actorUserId: string,
  level: "MANAGE" | "SUBMIT",
  resourceOwnership?: {
    responsibleUserId?: string;
    leaderUserId?: string;
  }
): Promise<void> {
  if (await isFinanceAdmin(tx, actorUserId)) return;

  if (level === "MANAGE") {
    throw new UnauthorizedServiceError(
      "ไม่มีสิทธิ์จัดการข้อมูลการเงิน — ต้องเป็นเจ้าหน้าที่การเงินหรือผู้ดูแลระบบที่ได้รับแต่งตั้ง"
    );
  }

  // SUBMIT level: check resource ownership
  if (resourceOwnership) {
    if (
      (resourceOwnership.responsibleUserId && resourceOwnership.responsibleUserId === actorUserId) ||
      (resourceOwnership.leaderUserId && resourceOwnership.leaderUserId === actorUserId)
    ) {
      return;
    }
  }

  throw new UnauthorizedServiceError(
    "ไม่มีสิทธิ์ดำเนินการกับทรัพยากรนี้ — ต้องเป็นผู้รับผิดชอบกิจกรรมหรือหัวหน้าโครงการ"
  );
}

// ==========================================
// 🏛️ CORE FINANCIAL LEDGER SERVICE
// ==========================================

function assertDepositMatch(
  existing: {
    confirmedByUserId: string;
    amount: Prisma.Decimal;
    budgetTrancheId: string;
    receivedDate: Date;
    documentRef: string | null;
  },
  incoming: {
    confirmedByUserId: string;
    amount: Prisma.Decimal;
    budgetTrancheId: string;
    receivedDate: Date;
    documentRef?: string;
  }
) {
  if (existing.confirmedByUserId !== incoming.confirmedByUserId) {
    throw new FinancialInvariantViolationError(
      "Idempotency key ถูกใช้งานโดยผู้ใช้อื่น — ปฏิเสธเพื่อความปลอดภัย"
    );
  }

  const isMismatch =
    !existing.amount.equals(incoming.amount) ||
    existing.budgetTrancheId !== incoming.budgetTrancheId ||
    existing.receivedDate.getTime() !== incoming.receivedDate.getTime() ||
    (existing.documentRef || "") !== (incoming.documentRef || "");

  if (isMismatch) {
    throw new FinancialInvariantViolationError(
      "Idempotency key ซ้ำแต่ข้อมูลเงินเข้าบัญชีไม่ตรง — ปฏิเสธเพื่อป้องกันเงินเข้าซ้ำ"
    );
  }
}

function assertExpenseMatch(
  existing: {
    requestedByUserId: string;
    amount: Prisma.Decimal;
    allocationId: string;
    title: string;
  },
  incoming: {
    requestedByUserId: string;
    amount: Prisma.Decimal;
    allocationId: string;
    title: string;
    idempotencyKey: string;
  }
) {
  if (existing.requestedByUserId !== incoming.requestedByUserId) {
    throw new FinancialInvariantViolationError(
      "Idempotency key ถูกใช้งานโดยผู้ใช้อื่น — ปฏิเสธเพื่อความปลอดภัย"
    );
  }

  const isMismatch =
    !existing.amount.equals(incoming.amount) ||
    existing.allocationId !== incoming.allocationId ||
    existing.title !== incoming.title;

  if (isMismatch) {
    throw new FinancialInvariantViolationError(
      `Idempotency key "${incoming.idempotencyKey}" มีอยู่แล้วแต่ข้อมูลไม่ตรงกับรายการเดิม — ปฏิเสธเพื่อป้องกันข้อมูลทางการเงินผิดพลาด`
    );
  }
}

const TX_OPTIONS = { maxWait: 15000, timeout: 30000 };

export class ProjectBudgetService {
  // ==========================================
  // 💰 CANONICAL NET SPENT FORMULA (Single Source of Truth)
  // ==========================================

  /**
   * Pure calculation — No DB query
   * Formula: SUM(expenses WHERE status IN [APPROVED, REVERSED]).amount - SUM(reversals WHERE status = APPROVED).amount
   */
  static calculateNetSpent(
    expenses: Array<{ amount: Prisma.Decimal; status: string }>,
    reversals: Array<{ amount: Prisma.Decimal; status: string }>
  ): Prisma.Decimal {
    const gross = expenses
      .filter((e) => e.status === "APPROVED" || e.status === "REVERSED")
      .reduce((sum, e) => sum.add(e.amount), new Prisma.Decimal(0));

    const reversed = reversals
      .filter((r) => r.status === "APPROVED")
      .reduce((sum, r) => sum.add(r.amount), new Prisma.Decimal(0));

    return gross.sub(reversed);
  }

  /**
   * DB adapter — queries then calculates via canonical formula
   */
  static async calculateAllocationNetSpentFromDB(
    tx: Prisma.TransactionClient,
    allocationId: string
  ): Promise<Prisma.Decimal> {
    const expenses = await tx.activityExpense.findMany({
      where: { allocationId, status: { in: ["APPROVED", "REVERSED"] } },
      select: { amount: true, status: true },
    });

    const reversals = await tx.expenseReversal.findMany({
      where: { originalExpense: { allocationId }, status: "APPROVED" },
      select: { amount: true, status: true },
    });

    return ProjectBudgetService.calculateNetSpent(expenses, reversals);
  }

  /**
   * 1. Confirm Tranche Deposit (Money Inflow Receipt Ledger)
   */
  static async confirmTrancheDeposit(data: {
    idempotencyKey: string;
    budgetTrancheId: string;
    amount: Prisma.Decimal;
    receivedDate: Date;
    documentRef?: string;
    bankStatement?: string;
    notes?: string;
    confirmedByUserId: string;
  }) {
    if (data.amount.lte(0)) {
      throw new FinancialInvariantViolationError("จำนวนเงินที่เข้าบัญชีต้องมากกว่า 0 บาท");
    }

    // 1. Idempotency Pre-check outside lock
    const existing = await prisma.budgetReceipt.findUnique({
      where: { idempotencyKey: data.idempotencyKey },
    });
    if (existing) {
      assertDepositMatch(existing, data);
      return existing;
    }

    try {
      return await prisma.$transaction(async (tx) => {
        // Security: Service-level authorization
        await verifyServiceAuth(tx, data.confirmedByUserId, "MANAGE");

        await acquireRowLocks(tx, "BudgetTranche", [data.budgetTrancheId]);

        const tranche = await tx.budgetTranche.findUniqueOrThrow({
          where: { id: data.budgetTrancheId },
          include: { budgetSource: { include: { fiscalYear: true } } },
        });

        if (tranche.budgetSource.fiscalYear.status !== "ACTIVE" || tranche.budgetSource.fiscalYear.isArchived) {
          throw new FinancialInvariantViolationError("ไม่สามารถรับเงินเข้าปีงบประมาณที่ปิดหรือถูกเก็บถาวรแล้ว");
        }

        if (tranche.isClosed) {
          throw new FinancialInvariantViolationError("งวดเงินนี้ถูกปิดการรับเงินแล้ว");
        }

        const receipt = await tx.budgetReceipt.create({
          data: {
            idempotencyKey: data.idempotencyKey,
            budgetTrancheId: data.budgetTrancheId,
            amount: data.amount,
            receivedDate: data.receivedDate,
            documentRef: data.documentRef,
            bankStatement: data.bankStatement,
            notes: data.notes,
            confirmedByUserId: data.confirmedByUserId,
          },
        });

        await tx.auditLog.create({
          data: {
            tableName: "BudgetReceipt",
            recordId: receipt.id,
            action: "CREATE",
            newValue: JSON.stringify({
              amount: data.amount.toString(),
              trancheId: data.budgetTrancheId,
              documentRef: data.documentRef,
            }),
            changedBy: data.confirmedByUserId,
            reason: data.notes || "ยืนยันเงินเข้าบัญชีจริง",
          },
        });

        return receipt;
      }, TX_OPTIONS);
    } catch (err: any) {
      if (err?.code === "P2002") {
        const existingRecord = await prisma.budgetReceipt.findUniqueOrThrow({
          where: { idempotencyKey: data.idempotencyKey },
        });
        assertDepositMatch(existingRecord, data);
        return existingRecord;
      }
      throw err;
    }
  }

  /**
   * 2. Create Project
   */
  static async createProject(data: {
    fiscalYearId: string;
    budgetSourceId: string;
    departmentName?: string;
    leaderUserId: string;
    code: string;
    name: string;
    targetAcademicYear: number;
    allocatedAmount: Prisma.Decimal;
    actorUserId: string;
  }) {
    if (data.allocatedAmount.lte(0)) {
      throw new FinancialInvariantViolationError("วงเงินงบประมาณโครงการต้องมากกว่า 0 บาท");
    }

    return await prisma.$transaction(async (tx) => {
      // Security: Service-level authorization
      await verifyServiceAuth(tx, data.actorUserId, "MANAGE");

      // Lock FiscalYear and BudgetSource (PK-ascending order)
      await acquireRowLocks(tx, "FiscalYear", [data.fiscalYearId]);
      await acquireRowLocks(tx, "BudgetSource", [data.budgetSourceId]);

      const fy = await tx.fiscalYear.findUniqueOrThrow({
        where: { id: data.fiscalYearId },
      });

      if (fy.status !== "ACTIVE" || fy.isArchived) {
        throw new FinancialInvariantViolationError("ไม่สามารถสร้างโครงการในปีงบประมาณที่ปิดแล้ว");
      }

      const source = await tx.budgetSource.findUniqueOrThrow({
        where: { id: data.budgetSourceId },
      });

      // Cross-FY Integrity check
      if (source.fiscalYearId !== data.fiscalYearId) {
        throw new FinancialInvariantViolationError(
          "ไม่สามารถสร้างโครงการข้ามปีงบประมาณ — แหล่งเงินไม่ได้อยู่ในปีงบประมาณเดียวกัน"
        );
      }

      // Check duplicate code per FiscalYear
      const existing = await tx.project.findFirst({
        where: { fiscalYearId: data.fiscalYearId, code: data.code },
      });
      if (existing) {
        throw new FinancialInvariantViolationError(`รหัสโครงการ "${data.code}" มีอยู่แล้วในปีงบประมาณนี้`);
      }

      // BudgetSource Ceiling Check: SUM(existing projects) + newAmount <= source.totalPlannedAmount
      const existingProjectsTotal = await tx.project.aggregate({
        where: { budgetSourceId: data.budgetSourceId },
        _sum: { allocatedAmount: true },
      });
      const currentTotal = existingProjectsTotal._sum.allocatedAmount ?? new Prisma.Decimal(0);
      if (currentTotal.add(data.allocatedAmount).gt(source.totalPlannedAmount)) {
        const remaining = source.totalPlannedAmount.sub(currentTotal);
        throw new FinancialInvariantViolationError(
          `วงเงินรวมโครงการเกินงบประมาณแหล่งเงิน "${source.name}" (คงเหลือจัดสรรได้: ${remaining} บาท, ยอดที่ขอจัดสรร: ${data.allocatedAmount} บาท)`
        );
      }

      // Look up leader user name for denormalized display field
      const leaderUser = await tx.user.findUnique({
        where: { id: data.leaderUserId },
        select: { name: true },
      });

      const project = await tx.project.create({
        data: {
          fiscalYearId: data.fiscalYearId,
          budgetSourceId: data.budgetSourceId,
          departmentName: data.departmentName,
          leaderUserId: data.leaderUserId,
          leaderName: leaderUser?.name || "",
          code: data.code,
          name: data.name,
          targetAcademicYear: data.targetAcademicYear,
          allocatedAmount: data.allocatedAmount,
          status: "APPROVED",
        },
      });

      await tx.auditLog.create({
        data: {
          tableName: "Project",
          recordId: project.id,
          action: "CREATE",
          newValue: JSON.stringify({
            code: project.code,
            name: project.name,
            allocatedAmount: data.allocatedAmount.toString(),
          }),
          changedBy: data.actorUserId,
          reason: "สร้างโครงการใหม่",
        },
      });

      return project;
    }, TX_OPTIONS);
  }

  /**
   * 3. Create Activity with Tranche Allocations (Enforces Invariant Layers 1, 2, 3)
   */
  static async createActivityWithAllocations(data: {
    projectId: string;
    responsibleUserId: string;
    activityNo: number;
    name: string;
    allocatedAmount: Prisma.Decimal;
    plannedStartDate?: Date;
    plannedEndDate?: Date;
    trancheAllocations: Array<{ budgetTrancheId: string; allocatedAmount: Prisma.Decimal }>;
    actorUserId: string;
  }) {
    if (data.allocatedAmount.lte(0)) {
      throw new FinancialInvariantViolationError("งบประมาณกิจกรรมต้องมากกว่า 0 บาท");
    }

    // Layer 2 Pre-check: Sum of tranche allocations == Activity allocatedAmount
    const totalTrancheAllocated = data.trancheAllocations.reduce(
      (sum, item) => sum.add(item.allocatedAmount),
      new Prisma.Decimal(0)
    );
    if (!totalTrancheAllocated.eq(data.allocatedAmount)) {
      throw new FinancialInvariantViolationError(
        `ยอดรวมการจัดสรรงวดเงิน (${totalTrancheAllocated}) ไม่เท่ากับงบประมาณกิจกรรม (${data.allocatedAmount})`
      );
    }

    const trancheIds = data.trancheAllocations.map((t) => t.budgetTrancheId);

    return await prisma.$transaction(async (tx) => {
      // Security: Service-level authorization
      await verifyServiceAuth(tx, data.actorUserId, "MANAGE");

      // 1. Lock Project first, then target Tranches (PK-ascending order)
      await acquireRowLocks(tx, "Project", [data.projectId]);
      await acquireRowLocks(tx, "BudgetTranche", trancheIds);

      const project = await tx.project.findUniqueOrThrow({
        where: { id: data.projectId },
        include: {
          activities: { select: { allocatedAmount: true, activityNo: true } },
          fiscalYear: true,
        },
      });

      if (project.fiscalYear.status !== "ACTIVE" || project.fiscalYear.isArchived) {
        throw new FinancialInvariantViolationError("โครงการอยู่ในปีงบประมาณที่ปิดหรือถูกเก็บถาวรแล้ว");
      }

      if (project.status === "CANCELLED" || project.status === "COMPLETED") {
        throw new FinancialInvariantViolationError(`ไม่สามารถเพิ่มกิจกรรมในโครงการที่สถานะเป็น ${project.status}`);
      }

      // Check unique activityNo per Project
      if (project.activities.some((a) => a.activityNo === data.activityNo)) {
        throw new FinancialInvariantViolationError(`ลำดับกิจกรรมที่ ${data.activityNo} มีอยู่แล้วในโครงการนี้`);
      }

      // 2. Layer 1 Invariant: SUM(existing activities) + newAmount <= project.allocatedAmount
      const existingActivityTotal = project.activities.reduce(
        (sum, a) => sum.add(a.allocatedAmount),
        new Prisma.Decimal(0)
      );
      if (existingActivityTotal.add(data.allocatedAmount).gt(project.allocatedAmount)) {
        const remaining = project.allocatedAmount.sub(existingActivityTotal);
        throw new FinancialInvariantViolationError(
          `งบกิจกรรมเกินวงเงินโครงการ (คงเหลือจัดสรรได้: ${remaining} บาท, ขอจัดสรร: ${data.allocatedAmount} บาท)`
        );
      }

      // 3. Layer 3 Invariant: For each tranche, SUM(allocations) + newAlloc <= MAX(plannedAmount, receipts)
      for (const tAlloc of data.trancheAllocations) {
        if (tAlloc.allocatedAmount.lte(0)) {
          throw new FinancialInvariantViolationError("ยอดจัดสรรแต่ละงวดต้องมากกว่า 0 บาท");
        }

        const tranche = await tx.budgetTranche.findUniqueOrThrow({
          where: { id: tAlloc.budgetTrancheId },
        });

        const receiptsAgg = await tx.budgetReceipt.aggregate({
          where: { budgetTrancheId: tAlloc.budgetTrancheId },
          _sum: { amount: true },
        });
        const totalReceived = receiptsAgg._sum.amount ?? new Prisma.Decimal(0);

        const existingAllocsAgg = await tx.activityTrancheAllocation.aggregate({
          where: { budgetTrancheId: tAlloc.budgetTrancheId },
          _sum: { allocatedAmount: true },
        });
        const totalAllocated = existingAllocsAgg._sum.allocatedAmount ?? new Prisma.Decimal(0);

        // Ceiling is the maximum between total cash received and the planned budget of this tranche
        const ceiling = Prisma.Decimal.max(totalReceived, tranche.plannedAmount);
        if (ceiling.gt(0) && totalAllocated.add(tAlloc.allocatedAmount).gt(ceiling)) {
          const availableInflow = ceiling.sub(totalAllocated);
          throw new FinancialInvariantViolationError(
            `งวดเงิน "${tranche.name}" มีงบประมาณไม่เพียงพอ (วงเงินคงเหลือให้จัดสรร: ${availableInflow} บาท, ขอจัดสรร: ${tAlloc.allocatedAmount} บาท)`
          );
        }
      }

      // 4. Create Activity and Allocations
      const activity = await tx.projectActivity.create({
        data: {
          projectId: data.projectId,
          responsibleUserId: data.responsibleUserId,
          activityNo: data.activityNo,
          name: data.name,
          allocatedAmount: data.allocatedAmount,
          plannedStartDate: data.plannedStartDate,
          plannedEndDate: data.plannedEndDate,
          status: "NOT_STARTED",
          trancheAllocations: {
            create: data.trancheAllocations.map((t) => ({
              budgetTrancheId: t.budgetTrancheId,
              allocatedAmount: t.allocatedAmount,
            })),
          },
        },
        include: { trancheAllocations: true },
      });

      await tx.auditLog.create({
        data: {
          tableName: "ProjectActivity",
          recordId: activity.id,
          action: "CREATE",
          newValue: JSON.stringify({
            name: data.name,
            allocatedAmount: data.allocatedAmount.toString(),
            allocationsCount: data.trancheAllocations.length,
          }),
          changedBy: data.actorUserId,
          reason: "เพิ่มกิจกรรมและจัดสรรงวดเงิน",
        },
      });

      return activity;
    }, TX_OPTIONS);
  }

  /**
   * 4. Record Expense (Always created as SUBMITTED)
   */
  static async recordExpense(data: {
    idempotencyKey: string;
    allocationId: string;
    requestedByUserId: string;
    expenseDate: Date;
    title: string;
    amount: Prisma.Decimal;
    receiptNo?: string;
  }) {
    if (data.amount.lte(0)) {
      throw new FinancialInvariantViolationError("ยอดเบิกจ่ายต้องมากกว่า 0 บาท");
    }

    // 1. Check idempotency first outside lock
    const existing = await prisma.activityExpense.findUnique({
      where: { idempotencyKey: data.idempotencyKey },
    });
    if (existing) {
      assertExpenseMatch(existing, data);
      return existing;
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const alloc = await tx.activityTrancheAllocation.findUniqueOrThrow({
          where: { id: data.allocationId },
          include: {
            activity: { include: { project: { include: { fiscalYear: true } } } },
            budgetTranche: true,
          },
        });

        const fy = alloc.activity.project.fiscalYear;
        if (fy.status !== "ACTIVE" || fy.isArchived) {
          throw new FinancialInvariantViolationError("ไม่สามารถเบิกจ่ายในปีงบประมาณที่ปิดหรือถูกเก็บถาวรแล้ว");
        }

        if (alloc.activity.project.status === "CANCELLED") {
          throw new FinancialInvariantViolationError("โครงการถูกยกเลิกแล้ว ไม่สามารถเบิกจ่ายได้");
        }

        // Security: Service-level ownership authorization (verified inside tx)
        await verifyServiceAuth(tx, data.requestedByUserId, "SUBMIT", {
          responsibleUserId: alloc.activity.responsibleUserId,
          leaderUserId: alloc.activity.project.leaderUserId,
        });

        // Lock hierarchy: Project -> Activity -> Allocation (PK-ascending order)
        await acquireRowLocks(tx, "Project", [alloc.activity.projectId]);
        await acquireRowLocks(tx, "ProjectActivity", [alloc.activityId]);
        await acquireRowLocks(tx, "ActivityTrancheAllocation", [data.allocationId]);

        const expense = await tx.activityExpense.create({
          data: {
            idempotencyKey: data.idempotencyKey,
            allocationId: data.allocationId,
            requestedByUserId: data.requestedByUserId,
            expenseDate: data.expenseDate,
            title: data.title,
            amount: data.amount,
            receiptNo: data.receiptNo,
            status: "SUBMITTED",
          },
        });

        await tx.auditLog.create({
          data: {
            tableName: "ActivityExpense",
            recordId: expense.id,
            action: "CREATE",
            newValue: JSON.stringify({
              title: data.title,
              amount: data.amount.toString(),
              status: "SUBMITTED",
            }),
            changedBy: data.requestedByUserId,
            reason: "บันทึกรายการเบิกจ่าย",
          },
        });

        return expense;
      }, TX_OPTIONS);
    } catch (err: any) {
      if (err?.code === "P2002") {
        const existingRecord = await prisma.activityExpense.findUniqueOrThrow({
          where: { idempotencyKey: data.idempotencyKey },
        });
        assertExpenseMatch(existingRecord, data);
        return existingRecord;
      }
      throw err;
    }
  }

  /**
   * 5. Approve Expense (Enforces Atomic Lock, State Transition & Layer 4 Invariant)
   */
  static async approveExpense(expenseId: string, approvedByUserId: string) {
    return await prisma.$transaction(async (tx) => {
      // Security: Service-level authorization
      await verifyServiceAuth(tx, approvedByUserId, "MANAGE");

      // 1. Lock ActivityExpense row first (Pessimistic lock for atomic transition)
      await acquireRowLocks(tx, "ActivityExpense", [expenseId]);

      const expense = await tx.activityExpense.findUniqueOrThrow({
        where: { id: expenseId },
        include: {
          allocation: {
            include: { activity: { include: { project: { include: { fiscalYear: true } } } } },
          },
        },
      });

      // State Transition Machine Check: SUBMITTED -> APPROVED
      validateExpenseStateTransition(expense.status, "APPROVED");

      const fy = expense.allocation.activity.project.fiscalYear;
      if (fy.status !== "ACTIVE" || fy.isArchived) {
        throw new FinancialInvariantViolationError("ไม่สามารถอนุมัติรายการในปีงบประมาณที่ปิดแล้ว");
      }

      await acquireRowLocks(tx, "Project", [expense.allocation.activity.projectId]);
      await acquireRowLocks(tx, "ProjectActivity", [expense.allocation.activityId]);
      await acquireRowLocks(tx, "ActivityTrancheAllocation", [expense.allocationId]);

      // Layer 4 Invariant Check via Canonical Net Spent Function
      const currentNetSpent = await ProjectBudgetService.calculateAllocationNetSpentFromDB(tx, expense.allocationId);
      if (currentNetSpent.add(expense.amount).gt(expense.allocation.allocatedAmount)) {
        const remaining = expense.allocation.allocatedAmount.sub(currentNetSpent);
        throw new FinancialInvariantViolationError(
          `ยอดเบิกจ่ายเกินวงเงินที่จัดสรรไว้ในงวดนี้ (คงเหลือให้เบิกได้: ${remaining} บาท, ยอดที่ขออนุมัติ: ${expense.amount} บาท)`
        );
      }

      // Atomic compare-and-transition update
      const updated = await tx.activityExpense.update({
        where: { id: expenseId },
        data: {
          status: "APPROVED",
          approvedByUserId,
          approvedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          tableName: "ActivityExpense",
          recordId: expenseId,
          action: "APPROVE",
          oldValue: JSON.stringify({ status: "SUBMITTED" }),
          newValue: JSON.stringify({ status: "APPROVED", approvedByUserId }),
          changedBy: approvedByUserId,
          reason: "อนุมัติรายการเบิกจ่าย",
        },
      });

      return updated;
    }, TX_OPTIONS);
  }

  /**
   * 6. Reverse Approved Expense (Full 1:1 Immutable Reversal)
   */
  static async reverseApprovedExpense(data: {
    originalExpenseId: string;
    reason: string;
    cancelledByUserId: string;
    approvedByUserId: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      // Security: Service-level authorization
      await verifyServiceAuth(tx, data.cancelledByUserId, "MANAGE");

      // 1. Lock ActivityExpense row first
      await acquireRowLocks(tx, "ActivityExpense", [data.originalExpenseId]);

      const original = await tx.activityExpense.findUniqueOrThrow({
        where: { id: data.originalExpenseId },
        include: {
          allocation: { include: { activity: { include: { project: { include: { fiscalYear: true } } } } } },
          reversal: true,
        },
      });

      // State Transition Machine Check: APPROVED -> REVERSED
      validateExpenseStateTransition(original.status, "REVERSED");

      if (original.reversal) {
        throw new FinancialInvariantViolationError("รายการนี้มีบันทึกการยกเลิกคืนเงิน (Reversal) ไปแล้ว");
      }

      const fy = original.allocation.activity.project.fiscalYear;
      if (fy.status !== "ACTIVE" || fy.isArchived) {
        throw new FinancialInvariantViolationError("ไม่สามารถยกเลิกรายการเบิกจ่ายในปีงบประมาณที่ปิดแล้ว");
      }

      await acquireRowLocks(tx, "Project", [original.allocation.activity.projectId]);
      await acquireRowLocks(tx, "ProjectActivity", [original.allocation.activityId]);
      await acquireRowLocks(tx, "ActivityTrancheAllocation", [original.allocationId]);

      // Create Reversal Record (Full 1:1 amount, allocation is derived via originalExpense relation)
      const reversal = await tx.expenseReversal.create({
        data: {
          originalExpenseId: original.id,
          amount: original.amount,
          reason: data.reason,
          cancelledByUserId: data.cancelledByUserId,
          approvedByUserId: data.approvedByUserId,
          status: "APPROVED",
          approvedAt: new Date(),
        },
      });

      // Update original status to REVERSED (financial amount & metadata remain immutable)
      await tx.activityExpense.update({
        where: { id: original.id },
        data: { status: "REVERSED" },
      });

      await tx.auditLog.create({
        data: {
          tableName: "ExpenseReversal",
          recordId: reversal.id,
          action: "REVERSE",
          oldValue: JSON.stringify({ status: "APPROVED", amount: original.amount.toString() }),
          newValue: JSON.stringify({ status: "REVERSED", reversalId: reversal.id }),
          changedBy: data.cancelledByUserId,
          reason: data.reason,
        },
      });

      return reversal;
    }, TX_OPTIONS);
  }

  /**
   * 7. Budget Transfer between Allocations
   */
  static async transferBudget(data: {
    fiscalYearId: string;
    fromAllocationId: string;
    toAllocationId: string;
    amount: Prisma.Decimal;
    reason: string;
    requestedByUserId: string;
    approvedByUserId: string;
  }) {
    if (data.fromAllocationId === data.toAllocationId) {
      throw new FinancialInvariantViolationError("ไม่สามารถโอนเงินระหว่างรายการจัดสรรเดียวกันได้");
    }
    if (data.amount.lte(0)) {
      throw new FinancialInvariantViolationError("จำนวนเงินที่โอนต้องมากกว่า 0 บาท");
    }

    return await prisma.$transaction(async (tx) => {
      // Security: Service-level authorization
      await verifyServiceAuth(tx, data.requestedByUserId, "MANAGE");

      // 1. Deadlock Safety: Lock Allocations in PK-ascending order
      await acquireRowLocks(tx, "ActivityTrancheAllocation", [data.fromAllocationId, data.toAllocationId]);

      const fromAlloc = await tx.activityTrancheAllocation.findUniqueOrThrow({
        where: { id: data.fromAllocationId },
        include: { activity: true },
      });

      const toAlloc = await tx.activityTrancheAllocation.findUniqueOrThrow({
        where: { id: data.toAllocationId },
        include: { activity: true, budgetTranche: true },
      });

      // Verify Fiscal Year
      const fy = await tx.fiscalYear.findUniqueOrThrow({ where: { id: data.fiscalYearId } });
      if (fy.status !== "ACTIVE" || fy.isArchived) {
        throw new FinancialInvariantViolationError("ไม่สามารถโอนงบประมาณในปีงบประมาณที่ปิดหรือถูกเก็บถาวรแล้ว");
      }

      // Check remaining uncommitted funds on source allocation via Canonical Net Spent Function
      const fromNetSpent = await ProjectBudgetService.calculateAllocationNetSpentFromDB(tx, data.fromAllocationId);
      const fromRemaining = fromAlloc.allocatedAmount.sub(fromNetSpent);
      if (fromRemaining.lt(data.amount)) {
        throw new FinancialInvariantViolationError(
          `วงเงินคงเหลือของรายการต้นทางไม่เพียงพอ (คงเหลือโอนได้: ${fromRemaining} บาท, ยอดที่ขอโอน: ${data.amount} บาท)`
        );
      }

      // Check Layer 3 on Destination Tranche if transferring across tranches
      if (fromAlloc.budgetTrancheId !== toAlloc.budgetTrancheId) {
        await acquireRowLocks(tx, "BudgetTranche", [toAlloc.budgetTrancheId]);
        const destReceipts = await tx.budgetReceipt.aggregate({
          where: { budgetTrancheId: toAlloc.budgetTrancheId },
          _sum: { amount: true },
        });
        const destAllocs = await tx.activityTrancheAllocation.aggregate({
          where: { budgetTrancheId: toAlloc.budgetTrancheId },
          _sum: { allocatedAmount: true },
        });
        const destLimit = destReceipts._sum.amount ?? new Prisma.Decimal(0);
        const destCurrent = destAllocs._sum.allocatedAmount ?? new Prisma.Decimal(0);

        if (destCurrent.add(data.amount).gt(destLimit)) {
          throw new FinancialInvariantViolationError("งวดเงินปลายทางมีเงินรับเข้าบัญชีไม่เพียงพอรองรับการโอน");
        }
      }

      // Execute Allocation Adjustments
      await tx.activityTrancheAllocation.update({
        where: { id: data.fromAllocationId },
        data: { allocatedAmount: fromAlloc.allocatedAmount.sub(data.amount) },
      });

      await tx.activityTrancheAllocation.update({
        where: { id: data.toAllocationId },
        data: { allocatedAmount: toAlloc.allocatedAmount.add(data.amount) },
      });

      // Synchronize Parent ProjectActivity allocatedAmount if cross-activity transfer (Preserves Layer 2)
      if (fromAlloc.activityId !== toAlloc.activityId) {
        await acquireRowLocks(tx, "ProjectActivity", [fromAlloc.activityId, toAlloc.activityId]);
        await tx.projectActivity.update({
          where: { id: fromAlloc.activityId },
          data: { allocatedAmount: fromAlloc.activity.allocatedAmount.sub(data.amount) },
        });
        await tx.projectActivity.update({
          where: { id: toAlloc.activityId },
          data: { allocatedAmount: toAlloc.activity.allocatedAmount.add(data.amount) },
        });
      }

      const transfer = await tx.budgetTransfer.create({
        data: {
          fiscalYearId: data.fiscalYearId,
          fromAllocationId: data.fromAllocationId,
          toAllocationId: data.toAllocationId,
          amount: data.amount,
          reason: data.reason,
          requestedByUserId: data.requestedByUserId,
          approvedByUserId: data.approvedByUserId,
          status: "APPROVED",
          approvedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          tableName: "BudgetTransfer",
          recordId: transfer.id,
          action: "TRANSFER",
          newValue: JSON.stringify({
            amount: data.amount.toString(),
            fromAllocationId: data.fromAllocationId,
            toAllocationId: data.toAllocationId,
          }),
          changedBy: data.requestedByUserId,
          reason: data.reason,
        },
      });

      return transfer;
    }, TX_OPTIONS);
  }

  /**
   * 8. Aggregate Fiscal Year Metrics for Dashboard (Computed on-the-fly, zero cache drift)
   */
  static async getFiscalYearDashboardMetrics(fiscalYearId: string) {
    const fy = await prisma.fiscalYear.findUniqueOrThrow({
      where: { id: fiscalYearId },
      include: {
        budgetSources: {
          include: {
            tranches: {
              include: {
                receipts: true,
                activityAllocations: {
                  include: {
                    expenses: {
                      where: { status: { in: ["APPROVED", "REVERSED"] } },
                      include: { reversal: true },
                    },
                  },
                },
              },
            },
          },
        },
        projects: {
          include: {
            leaderUser: { select: { id: true, name: true, image: true, position: true } },
            activities: {
              include: {
                responsibleUser: { select: { id: true, name: true, image: true } },
                trancheAllocations: {
                  include: {
                    expenses: {
                      include: {
                        reversal: true,
                        requestedByUser: { select: { id: true, name: true, image: true } },
                        approvedByUser: { select: { id: true, name: true, image: true } },
                      },
                    },
                    budgetTranche: { select: { id: true, trancheNo: true, name: true } },
                  },
                },
              },
            },
            attachments: true,
          },
        },
      },
    });

    // 1. Tranche Breakdown
    const tranchesBreakdown = fy.budgetSources.flatMap((source) =>
      source.tranches.map((tranche) => {
        const trancheReceived = tranche.receipts.reduce(
          (sum, r) => sum.add(r.amount),
          new Prisma.Decimal(0)
        );
        const trancheAllocated = tranche.activityAllocations.reduce(
          (sum, a) => sum.add(a.allocatedAmount),
          new Prisma.Decimal(0)
        );
        let trancheSpent = new Prisma.Decimal(0);
        for (const alloc of tranche.activityAllocations) {
          const reversals = alloc.expenses
            .map((e) => e.reversal)
            .filter((r): r is NonNullable<typeof r> => Boolean(r));
          trancheSpent = trancheSpent.add(ProjectBudgetService.calculateNetSpent(alloc.expenses, reversals));
        }

        let computedStatus: "PLANNED" | "PARTIAL" | "RECEIVED" | "CLOSED" = "PLANNED";
        if (tranche.isClosed) computedStatus = "CLOSED";
        else if (trancheReceived.eq(0)) computedStatus = "PLANNED";
        else if (trancheReceived.lt(tranche.plannedAmount)) computedStatus = "PARTIAL";
        else computedStatus = "RECEIVED";

        return {
          id: tranche.id,
          budgetSourceId: source.id,
          sourceName: source.name,
          sourceCode: source.code,
          trancheNo: tranche.trancheNo,
          name: tranche.name,
          academicYear: tranche.academicYear,
          semester: tranche.semester,
          expectedStartDate: tranche.expectedStartDate,
          expectedEndDate: tranche.expectedEndDate,
          plannedAmount: tranche.plannedAmount.toNumber(),
          receivedAmount: trancheReceived.toNumber(),
          allocatedAmount: trancheAllocated.toNumber(),
          spentAmount: trancheSpent.toNumber(),
          availableToAllocate: trancheReceived.sub(trancheAllocated).toNumber(),
          remainingLiquidity: trancheReceived.sub(trancheSpent).toNumber(),
          status: computedStatus,
          isClosed: tranche.isClosed,
          receipts: tranche.receipts.map((r) => ({
            id: r.id,
            amount: r.amount.toNumber(),
            receivedDate: r.receivedDate,
            documentRef: r.documentRef,
            bankStatement: r.bankStatement,
            notes: r.notes,
          })),
        };
      })
    );

    // 2. Projects Breakdown
    const projectsBreakdown = fy.projects.map((project) => {
      let projectSpent = new Prisma.Decimal(0);
      const activitiesSummary = project.activities.map((act) => {
        let actSpent = new Prisma.Decimal(0);
        for (const alloc of act.trancheAllocations) {
          const reversals = alloc.expenses
            .map((e) => e.reversal)
            .filter((r): r is NonNullable<typeof r> => Boolean(r));
          actSpent = actSpent.add(ProjectBudgetService.calculateNetSpent(alloc.expenses, reversals));
        }
        projectSpent = projectSpent.add(actSpent);
        return {
          id: act.id,
          activityNo: act.activityNo,
          name: act.name,
          allocatedAmount: act.allocatedAmount.toNumber(),
          spentAmount: actSpent.toNumber(),
          remainingAmount: act.allocatedAmount.sub(actSpent).toNumber(),
          status: act.status,
          responsibleUser: act.responsibleUser,
          trancheAllocations: act.trancheAllocations.map((ta) => ({
            id: ta.id,
            budgetTrancheId: ta.budgetTrancheId,
            trancheName: ta.budgetTranche?.name,
            trancheNo: ta.budgetTranche?.trancheNo,
            allocatedAmount: ta.allocatedAmount.toNumber(),
            expenses: ta.expenses.map((e) => ({
              id: e.id,
              title: e.title,
              amount: e.amount.toNumber(),
              expenseDate: e.expenseDate,
              receiptNo: e.receiptNo,
              status: e.status,
              requestedByUser: e.requestedByUser,
              approvedByUser: e.approvedByUser,
              reversal: e.reversal
                ? {
                    id: e.reversal.id,
                    amount: e.reversal.amount.toNumber(),
                    reason: e.reversal.reason,
                  }
                : null,
            })),
          })),
        };
      });

      return {
        id: project.id,
        code: project.code,
        name: project.name,
        departmentName: project.departmentName,
        targetAcademicYear: project.targetAcademicYear,
        allocatedAmount: project.allocatedAmount.toNumber(),
        spentAmount: projectSpent.toNumber(),
        remainingAmount: project.allocatedAmount.sub(projectSpent).toNumber(),
        status: project.status,
        leaderUser: project.leaderUser,
        activities: activitiesSummary,
        attachments: project.attachments,
      };
    });

    // 3. Flat All Expenses for Disbursement & Reports
    const allExpenses = fy.projects.flatMap((p) =>
      p.activities.flatMap((a) =>
        a.trancheAllocations.flatMap((ta) =>
          ta.expenses.map((e) => ({
            id: e.id,
            projectId: p.id,
            projectCode: p.code,
            projectName: p.name,
            departmentName: p.departmentName,
            activityId: a.id,
            activityNo: a.activityNo,
            activityName: a.name,
            allocationId: ta.id,
            budgetTrancheId: ta.budgetTrancheId,
            trancheName: ta.budgetTranche?.name,
            trancheNo: ta.budgetTranche?.trancheNo,
            title: e.title,
            amount: e.amount.toNumber(),
            expenseDate: e.expenseDate,
            receiptNo: e.receiptNo,
            status: e.status,
            requestedByUser: e.requestedByUser,
            approvedByUser: e.approvedByUser,
            reversal: e.reversal
              ? {
                  id: e.reversal.id,
                  amount: e.reversal.amount.toNumber(),
                  reason: e.reversal.reason,
                }
              : null,
          }))
        )
      )
    ).sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());

    // 4. Grand Totals (Directly aggregated from breakdowns — 0 redundant loops)
    const totalPlanned = fy.budgetSources.reduce(
      (sum, s) => sum.add(s.totalPlannedAmount),
      new Prisma.Decimal(0)
    );
    const totalReceived = tranchesBreakdown.reduce(
      (sum, t) => sum.add(new Prisma.Decimal(t.receivedAmount)),
      new Prisma.Decimal(0)
    );
    const totalAllocatedToProjects = fy.projects.reduce(
      (sum, p) => sum.add(p.allocatedAmount),
      new Prisma.Decimal(0)
    );
    const totalSpent = tranchesBreakdown.reduce(
      (sum, t) => sum.add(new Prisma.Decimal(t.spentAmount)),
      new Prisma.Decimal(0)
    );
    const netLiquidity = totalReceived.sub(totalSpent);

    return {
      fiscalYear: {
        id: fy.id,
        year: fy.year,
        title: fy.title,
        startDate: fy.startDate,
        endDate: fy.endDate,
        status: fy.status,
      },
      budgetSources: fy.budgetSources.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        totalPlannedAmount: s.totalPlannedAmount.toNumber(),
      })),
      metrics: {
        totalPlanned: totalPlanned.toNumber(),
        totalReceived: totalReceived.toNumber(),
        totalAllocatedToProjects: totalAllocatedToProjects.toNumber(),
        totalSpent: totalSpent.toNumber(),
        netLiquidity: netLiquidity.toNumber(),
        remainingUnallocatedInflow: totalReceived.sub(totalAllocatedToProjects).toNumber(),
      },
      tranches: tranchesBreakdown,
      projects: projectsBreakdown,
      allExpenses,
    };
  }
}
