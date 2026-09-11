import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db.ts";

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
   * DB adapter — calculates net spent at the BudgetTranche level across all allocations
   * Formula: SUM(APPROVED/REVERSED expenses in tranche) - SUM(APPROVED reversals in tranche)
   */
  static async calculateTrancheNetSpentFromDB(
    tx: Prisma.TransactionClient,
    budgetTrancheId: string
  ): Promise<Prisma.Decimal> {
    const expenses = await tx.activityExpense.findMany({
      where: {
        allocation: { budgetTrancheId },
        status: { in: ["APPROVED", "REVERSED"] },
      },
      select: { amount: true, status: true },
    });

    const reversals = await tx.expenseReversal.findMany({
      where: {
        originalExpense: { allocation: { budgetTrancheId } },
        status: "APPROVED",
      },
      select: { amount: true, status: true },
    });

    return ProjectBudgetService.calculateNetSpent(expenses, reversals);
  }

  /**
   * Create Budget Tranche with Invariant: SUM(BudgetTranche.plannedAmount) <= BudgetSource.totalPlannedAmount
   */
  static async createBudgetTranche(data: {
    budgetSourceId: string;
    trancheNo: number;
    name: string;
    academicYear: number;
    semester: number;
    plannedAmount: Prisma.Decimal;
    expectedStartDate?: Date;
    expectedEndDate?: Date;
    actorUserId: string;
  }) {
    if (data.plannedAmount.lte(0)) {
      throw new FinancialInvariantViolationError("วงเงินงบประมาณตามแผนของงวดเงินต้องมากกว่า 0 บาท");
    }

    return await prisma.$transaction(async (tx) => {
      await verifyServiceAuth(tx, data.actorUserId, "MANAGE");
      await acquireRowLocks(tx, "BudgetSource", [data.budgetSourceId]);

      const source = await tx.budgetSource.findUniqueOrThrow({
        where: { id: data.budgetSourceId },
        include: { fiscalYear: true, tranches: true },
      });

      if (source.fiscalYear.status !== "ACTIVE" || source.fiscalYear.isArchived) {
        throw new FinancialInvariantViolationError("ไม่สามารถเพิ่มงวดเงินในปีงบประมาณที่ปิดหรือถูกเก็บถาวรแล้ว");
      }

      // INVARIANT: SUM(BudgetTranche.plannedAmount) <= BudgetSource.totalPlannedAmount
      const currentTranchesPlanned = source.tranches.reduce(
        (sum, t) => sum.add(t.plannedAmount),
        new Prisma.Decimal(0)
      );

      if (currentTranchesPlanned.add(data.plannedAmount).gt(source.totalPlannedAmount)) {
        const remaining = source.totalPlannedAmount.sub(currentTranchesPlanned);
        throw new FinancialInvariantViolationError(
          `ผลรวมวงเงินงวดเงินตามแผน (${currentTranchesPlanned.add(data.plannedAmount)}) เกินกรอบวงเงินของแหล่งงบประมาณ "${source.name}" (${source.totalPlannedAmount}) (คงเหลือให้ตั้งงวดได้: ${remaining} บาท, ขอตั้งงวด: ${data.plannedAmount} บาท)`
        );
      }

      const tranche = await tx.budgetTranche.create({
        data: {
          budgetSourceId: data.budgetSourceId,
          trancheNo: data.trancheNo,
          name: data.name,
          academicYear: data.academicYear,
          semester: data.semester,
          plannedAmount: data.plannedAmount,
          expectedStartDate: data.expectedStartDate,
          expectedEndDate: data.expectedEndDate,
        },
      });

      await tx.auditLog.create({
        data: {
          tableName: "BudgetTranche",
          recordId: tranche.id,
          action: "CREATE",
          newValue: JSON.stringify({
            name: tranche.name,
            trancheNo: tranche.trancheNo,
            plannedAmount: data.plannedAmount.toString(),
          }),
          changedBy: data.actorUserId,
          reason: "สร้างงวดเงินงบประมาณ",
        },
      });

      return tranche;
    }, TX_OPTIONS);
  }

  /**
   * Deterministic allocation resolution protocol:
   * 1. If direct allocationId provided: verifies existence.
   * 2. If activityId and budgetTrancheId provided: queries composite unique index.
   * 3. If only activityId provided:
   *    - Exactly 1 allocation: resolves safely.
   *    - More than 1 allocation: REJECTS with error listing the tranches.
   *    - 0 allocations: REJECTS.
   */
  static async resolveAllocationDeterministically(input: {
    allocationId?: string;
    activityId?: string;
    budgetTrancheId?: string;
  }): Promise<string> {
    // 1. Direct allocationId provided
    if (input.allocationId) {
      const alloc = await prisma.activityTrancheAllocation.findUnique({
        where: { id: input.allocationId },
        select: { id: true },
      });
      if (alloc) return alloc.id;
    }

    // 2. Both activityId and budgetTrancheId provided -> deterministic composite match
    if (input.activityId && input.budgetTrancheId) {
      const alloc = await prisma.activityTrancheAllocation.findUnique({
        where: {
          activityId_budgetTrancheId: {
            activityId: input.activityId,
            budgetTrancheId: input.budgetTrancheId,
          },
        },
        select: { id: true },
      });
      if (!alloc) {
        throw new FinancialInvariantViolationError("กิจกรรมนี้ไม่ได้ถูกจัดสรรงบประมาณไว้ในงวดเงินที่ระบุ");
      }
      return alloc.id;
    }

    // 3. Fallback candidate when only activityId (or an activityId passed as allocationId) is provided
    const candidateActivityId = input.activityId || input.allocationId;
    if (candidateActivityId) {
      const allocs = await prisma.activityTrancheAllocation.findMany({
        where: { activityId: candidateActivityId },
        select: { id: true, budgetTranche: { select: { name: true, trancheNo: true } } },
      });

      if (allocs.length === 1) {
        return allocs[0].id;
      }

      if (allocs.length > 1) {
        const trancheNames = allocs.map((a) => a.budgetTranche.name || `งวดที่ ${a.budgetTranche.trancheNo}`).join(", ");
        throw new FinancialInvariantViolationError(
          `กิจกรรมนี้มีการจัดสรรงบประมาณไว้ในหลายงวดเงิน (${trancheNames}) กรุณาระบุงวดเงินที่ต้องการเบิกจ่ายให้ชัดเจน (budgetTrancheId หรือ allocationId)`
        );
      }

      if (allocs.length === 0) {
        throw new FinancialInvariantViolationError("กิจกรรมนี้ยังไม่มีการจัดสรรงบประมาณลงในงวดเงินใดๆ");
      }
    }

    throw new FinancialInvariantViolationError("กรุณาระบุข้อมูลการจัดสรรงวดเงิน (allocationId หรือ activityId)");
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

      // 3. Layer 3 Invariant: Plan Allocation Ceiling Check
      // SUM(existing allocations on this tranche) + newAlloc <= BudgetTranche.plannedAmount
      for (const tAlloc of data.trancheAllocations) {
        if (tAlloc.allocatedAmount.lte(0)) {
          throw new FinancialInvariantViolationError("ยอดจัดสรรแต่ละงวดต้องมากกว่า 0 บาท");
        }

        const tranche = await tx.budgetTranche.findUniqueOrThrow({
          where: { id: tAlloc.budgetTrancheId },
        });

        const existingAllocsAgg = await tx.activityTrancheAllocation.aggregate({
          where: { budgetTrancheId: tAlloc.budgetTrancheId },
          _sum: { allocatedAmount: true },
        });
        const totalAllocated = existingAllocsAgg._sum.allocatedAmount ?? new Prisma.Decimal(0);

        if (totalAllocated.add(tAlloc.allocatedAmount).gt(tranche.plannedAmount)) {
          const availablePlan = tranche.plannedAmount.sub(totalAllocated);
          throw new FinancialInvariantViolationError(
            `ยอดจัดสรรตามแผนในงวดเงิน "${tranche.name}" เกินกรอบวงเงินงบประมาณตามแผน (คงเหลือจัดสรรได้ตามแผน: ${availablePlan} บาท, ขอจัดสรร: ${tAlloc.allocatedAmount} บาท)`
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
   * 5. Approve Expense (Enforces Atomic Lock, State Transition, Layer 4 Plan Ceiling & Layer 5 Cash Inflow Invariant)
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
            include: {
              activity: { include: { project: { include: { fiscalYear: true } } } },
              budgetTranche: true,
            },
          },
        },
      });

      // State Transition Machine Check: SUBMITTED -> APPROVED
      validateExpenseStateTransition(expense.status, "APPROVED");

      const fy = expense.allocation.activity.project.fiscalYear;
      if (fy.status !== "ACTIVE" || fy.isArchived) {
        throw new FinancialInvariantViolationError("ไม่สามารถอนุมัติรายการในปีงบประมาณที่ปิดแล้ว");
      }

      const trancheId = expense.allocation.budgetTrancheId;

      // 2. Lock BudgetTranche row BEFORE calculating cash (Global lock protocol to prevent concurrency race)
      await acquireRowLocks(tx, "BudgetTranche", [trancheId]);
      await acquireRowLocks(tx, "Project", [expense.allocation.activity.projectId]);
      await acquireRowLocks(tx, "ProjectActivity", [expense.allocation.activityId]);
      await acquireRowLocks(tx, "ActivityTrancheAllocation", [expense.allocationId]);

      // 3. Layer 4 Invariant Check: Plan Allocation Ceiling
      // SUM(approved expenses on this allocation) + expense.amount <= allocation.allocatedAmount
      const currentAllocNetSpent = await ProjectBudgetService.calculateAllocationNetSpentFromDB(tx, expense.allocationId);
      if (currentAllocNetSpent.add(expense.amount).gt(expense.allocation.allocatedAmount)) {
        const remainingPlan = expense.allocation.allocatedAmount.sub(currentAllocNetSpent);
        throw new FinancialInvariantViolationError(
          `ยอดเบิกจ่ายเกินวงเงินตามแผนของกิจกรรมในงวดนี้ (คงเหลือให้เบิกตามแผน: ${remainingPlan} บาท, ยอดที่ขออนุมัติ: ${expense.amount} บาท)`
        );
      }

      // 4. Layer 5 Invariant Check: Cash Available / Real Cash Inflow Invariant
      // SUM(approved expenses on this tranche) + expense.amount <= SUM(receipts on this tranche)
      const receiptsAgg = await tx.budgetReceipt.aggregate({
        where: { budgetTrancheId: trancheId },
        _sum: { amount: true },
      });
      const totalCashInflow = receiptsAgg._sum.amount ?? new Prisma.Decimal(0);

      const currentTrancheNetSpent = await ProjectBudgetService.calculateTrancheNetSpentFromDB(tx, trancheId);
      if (currentTrancheNetSpent.add(expense.amount).gt(totalCashInflow)) {
        const availableCash = totalCashInflow.sub(currentTrancheNetSpent);
        throw new FinancialInvariantViolationError(
          `เงินสดรับเข้าจริงในงวดเงิน "${expense.allocation.budgetTranche.name}" ไม่เพียงพอต่อการอนุมัติเบิกจ่าย (เงินสดคงเหลือ: ${availableCash} บาท, ยอดที่ขออนุมัติ: ${expense.amount} บาท)`
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
          allocation: { include: { activity: { include: { project: { include: { fiscalYear: true } } } }, budgetTranche: true } },
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

      // Lock BudgetTranche, Project, Activity, Allocation in global hierarchy order
      await acquireRowLocks(tx, "BudgetTranche", [original.allocation.budgetTrancheId]);
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
          availableToAllocate: tranche.plannedAmount.sub(trancheAllocated).toNumber(),
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

  /**
   * 8. Clone Projects and Activities from a previous Fiscal Year
   */
  static async cloneProjectsFromFiscalYear(data: {
    sourceFiscalYearId: string;
    targetFiscalYearId: string;
    projectIds: string[];
    copyAllocatedAmount?: boolean;
    targetAcademicYear: number;
    actorUserId: string;
  }) {
    const copyAmount = data.copyAllocatedAmount ?? true;

    if (data.sourceFiscalYearId === data.targetFiscalYearId) {
      throw new FinancialInvariantViolationError("ไม่สามารถคัดลอกโครงการภายในปีงบประมาณเดียวกันได้");
    }

    if (!data.projectIds || data.projectIds.length === 0) {
      throw new FinancialInvariantViolationError("กรุณาเลือกโครงการที่ต้องการคัดลอกอย่างน้อย 1 โครงการ");
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Authorization check
      await verifyServiceAuth(tx, data.actorUserId, "MANAGE");

      // 2. Lock target FiscalYear to serialize cloning operations
      await acquireRowLocks(tx, "FiscalYear", [data.targetFiscalYearId]);

      const targetFy = await tx.fiscalYear.findUniqueOrThrow({
        where: { id: data.targetFiscalYearId },
        include: {
          budgetSources: {
            include: { tranches: true },
          },
          projects: {
            select: { code: true },
          },
        },
      });

      if (targetFy.status !== "ACTIVE" || targetFy.isArchived) {
        throw new FinancialInvariantViolationError("ไม่สามารถคัดลอกโครงการไปยังปีงบประมาณที่ปิดหรือถูกเก็บถาวรแล้ว");
      }

      if (targetFy.budgetSources.length === 0) {
        throw new FinancialInvariantViolationError(
          `ปีงบประมาณปลายทาง (${targetFy.title}) ยังไม่มีโครงสร้างแหล่งเงิน กรุณากด "สร้างโครงสร้างงบประมาณเริ่มต้น" ก่อน`
        );
      }

      const existingProjectCodes = new Set(targetFy.projects.map((p) => p.code));

      // 3. Fetch source projects with their activities and allocations
      const sourceProjects = await tx.project.findMany({
        where: {
          id: { in: data.projectIds },
          fiscalYearId: data.sourceFiscalYearId,
        },
        include: {
          budgetSource: true,
          activities: {
            include: {
              trancheAllocations: {
                include: { budgetTranche: true },
              },
            },
            orderBy: { activityNo: "asc" },
          },
        },
      });

      if (sourceProjects.length === 0) {
        throw new FinancialInvariantViolationError("ไม่พบโครงการต้นทางที่เลือกสำหรับคัดลอก");
      }

      const sourceFy = await tx.fiscalYear.findUnique({
        where: { id: data.sourceFiscalYearId },
        select: { year: true },
      });

      // Map target BudgetSources by code
      const targetSourcesByCode = new Map<string, (typeof targetFy.budgetSources)[0]>();
      for (const bs of targetFy.budgetSources) {
        targetSourcesByCode.set(bs.code, bs);
      }

      const clonedProjects: any[] = [];

      for (const sp of sourceProjects) {
        const targetBs = targetSourcesByCode.get(sp.budgetSource.code);
        if (!targetBs) {
          throw new FinancialInvariantViolationError(
            `ไม่พบแหล่งเงินรหัส "${sp.budgetSource.code}" (${sp.budgetSource.name}) ในปีงบประมาณปลายทาง (${targetFy.title})`
          );
        }

        const targetTranchesByNo = new Map<number, (typeof targetBs.tranches)[0]>();
        for (const tr of targetBs.tranches) {
          targetTranchesByNo.set(tr.trancheNo, tr);
        }

        let newCode = sp.code;
        if (existingProjectCodes.has(newCode) && sourceFy) {
          const autoReplaced = newCode.replaceAll(String(sourceFy.year), String(targetFy.year));
          if (!existingProjectCodes.has(autoReplaced)) {
            newCode = autoReplaced;
          }
        }

        if (existingProjectCodes.has(newCode)) {
          throw new FinancialInvariantViolationError(
            `รหัสโครงการ "${newCode}" มีอยู่แล้วในปีงบประมาณปลายทาง (${targetFy.title})`
          );
        }
        existingProjectCodes.add(newCode);

        const projectAllocatedAmount = copyAmount ? sp.allocatedAmount : new Prisma.Decimal(0);

        if (copyAmount && projectAllocatedAmount.gt(0)) {
          const currentTotalAlloc = await tx.project.aggregate({
            where: { budgetSourceId: targetBs.id },
            _sum: { allocatedAmount: true },
          });
          const currentTotal = currentTotalAlloc._sum.allocatedAmount ?? new Prisma.Decimal(0);
          if (currentTotal.add(projectAllocatedAmount).gt(targetBs.totalPlannedAmount)) {
            const remaining = targetBs.totalPlannedAmount.sub(currentTotal);
            throw new FinancialInvariantViolationError(
              `การคัดลอกโครงการ "${sp.name}" ทำให้วงเงินเกินแหล่งเงิน "${targetBs.name}" (คงเหลือจัดสรรได้: ${remaining} บ., ขอจัดสรร: ${projectAllocatedAmount} บ.)`
            );
          }
        }

        const clonedProject = await tx.project.create({
          data: {
            fiscalYearId: targetFy.id,
            budgetSourceId: targetBs.id,
            departmentName: sp.departmentName,
            leaderUserId: sp.leaderUserId,
            leaderName: sp.leaderName,
            code: newCode,
            name: sp.name,
            targetAcademicYear: data.targetAcademicYear,
            allocatedAmount: projectAllocatedAmount,
            status: "APPROVED",
          },
        });

        for (const act of sp.activities) {
          const actAllocatedAmount = copyAmount ? act.allocatedAmount : new Prisma.Decimal(0);

          const trancheAllocationsData: { budgetTrancheId: string; allocatedAmount: Prisma.Decimal }[] = [];

          for (const alloc of act.trancheAllocations) {
            const targetTranche = targetTranchesByNo.get(alloc.budgetTranche.trancheNo);
            if (!targetTranche) {
              throw new FinancialInvariantViolationError(
                `ไม่พบงวดเงินที่ ${alloc.budgetTranche.trancheNo} ของแหล่งเงิน "${targetBs.name}" ในปีงบประมาณปลายทาง`
              );
            }

            const allocAmount = copyAmount ? alloc.allocatedAmount : new Prisma.Decimal(0);
            trancheAllocationsData.push({
              budgetTrancheId: targetTranche.id,
              allocatedAmount: allocAmount,
            });
          }

          await tx.projectActivity.create({
            data: {
              projectId: clonedProject.id,
              responsibleUserId: act.responsibleUserId,
              activityNo: act.activityNo,
              name: act.name,
              allocatedAmount: actAllocatedAmount,
              plannedStartDate: act.plannedStartDate,
              plannedEndDate: act.plannedEndDate,
              status: "NOT_STARTED",
              trancheAllocations: {
                create: trancheAllocationsData,
              },
            },
          });
        }

        await tx.auditLog.create({
          data: {
            tableName: "Project",
            recordId: clonedProject.id,
            action: "CREATE",
            newValue: JSON.stringify({
              action: "CLONE",
              sourceProjectId: sp.id,
              code: clonedProject.code,
              name: clonedProject.name,
              copyAmount,
            }),
            changedBy: data.actorUserId,
            reason: `คัดลอกโครงการจากปีงบประมาณ ${data.sourceFiscalYearId}`,
          },
        });

        clonedProjects.push(clonedProject);
      }

      return {
        clonedCount: clonedProjects.length,
        projects: clonedProjects,
      };
    }, TX_OPTIONS);
  }

  /**
   * 9. Close Fiscal Year and Freeze Records (Strict Financial Freeze)
   */
  static async closeFiscalYear(fiscalYearId: string, actorUserId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Authorization check
      await verifyServiceAuth(tx, actorUserId, "MANAGE");

      // 2. Lock FiscalYear
      await acquireRowLocks(tx, "FiscalYear", [fiscalYearId]);

      const fy = await tx.fiscalYear.findUniqueOrThrow({
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
                        select: { id: true, title: true, amount: true, status: true },
                      },
                    },
                  },
                },
              },
            },
          },
          transfers: {
            where: { status: "PENDING" },
            select: { id: true, amount: true },
          },
        },
      });

      if (fy.status === "CLOSED") {
        throw new FinancialInvariantViolationError(`ปีงบประมาณ พ.ศ. ${fy.year} ถูกปิดรอบบัญชีไปแล้ว`);
      }

      // Check invariant 1: Pending submitted expenses
      const pendingExpenses: Array<{ id: string; title: string; amount: any }> = [];
      let totalReceived = new Prisma.Decimal(0);
      let totalSpent = new Prisma.Decimal(0);

      for (const bs of fy.budgetSources) {
        for (const tr of bs.tranches) {
          for (const rc of tr.receipts) {
            totalReceived = totalReceived.add(rc.amount);
          }
          for (const alloc of tr.activityAllocations) {
            for (const exp of alloc.expenses) {
              if (exp.status === "SUBMITTED") {
                pendingExpenses.push(exp);
              } else if (exp.status === "APPROVED") {
                totalSpent = totalSpent.add(exp.amount);
              }
            }
          }
        }
      }

      if (pendingExpenses.length > 0) {
        throw new FinancialInvariantViolationError(
          `ไม่สามารถปิดปีงบประมาณได้ เนื่องจากยังมีรายการเบิกจ่ายค้างรออนุมัติ (${pendingExpenses.length} รายการ) กรุณาอนุมัติหรือปฏิเสธให้เสร็จสิ้นก่อนปิดปี`
        );
      }

      // Check invariant 2: Pending transfers
      if (fy.transfers.length > 0) {
        throw new FinancialInvariantViolationError(
          `ไม่สามารถปิดปีงบประมาณได้ เนื่องจากยังมีรายการโอนงบประมาณค้างรออนุมัติ (${fy.transfers.length} รายการ)`
        );
      }

      const netSurplus = totalReceived.sub(totalSpent);

      // Close and archive
      const updatedFy = await tx.fiscalYear.update({
        where: { id: fiscalYearId },
        data: {
          status: "CLOSED",
          isArchived: true,
        },
      });

      await tx.auditLog.create({
        data: {
          tableName: "FiscalYear",
          recordId: fiscalYearId,
          action: "UPDATE",
          oldValue: JSON.stringify({ status: fy.status }),
          newValue: JSON.stringify({ status: "CLOSED", isArchived: true, netSurplus: netSurplus.toString() }),
          changedBy: actorUserId,
          reason: `ปิดรอบปีงบประมาณ พ.ศ. ${fy.year} (เงินสดคงเหลือสุทธิ: ${netSurplus.toString()} บาท)`,
        },
      });

      return {
        fiscalYear: {
          id: updatedFy.id,
          year: updatedFy.year,
          title: updatedFy.title,
          status: updatedFy.status,
          isArchived: updatedFy.isArchived,
        },
        summary: {
          totalReceived: totalReceived.toNumber(),
          totalSpent: totalSpent.toNumber(),
          netSurplus: netSurplus.toNumber(),
        },
      };
    }, TX_OPTIONS);
  }
}
