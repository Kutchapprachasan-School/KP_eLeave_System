/**
 * 🏛️ Budget Disbursement & 1-Click Clone Engine (ADR-001)
 * School Planning & Budget Ledger Subsystem - Kut Chap Prachasan School
 */

export class FinancialInvariantViolationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FinancialInvariantViolationError';
  }
}

export class LedgerLockConflictError extends Error {
  constructor(message = 'ข้อมูลกำลังถูกแก้ไขโดยผู้ใช้อื่นในขณะนี้ กรุณาลองใหม่อีกครั้ง') {
    super(message);
    this.name = 'LedgerLockConflictError';
  }
}

export class UnauthorizedServiceError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnauthorizedServiceError';
  }
}

export const VALID_EXPENSE_TRANSITIONS = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['APPROVED', 'REJECTED'],
  REJECTED: ['DRAFT'],
  APPROVED: ['REVERSED'],
  REVERSED: [],
};

export function validateExpenseStateTransition(current, target) {
  const validNext = VALID_EXPENSE_TRANSITIONS[current];
  if (!validNext || !validNext.includes(target)) {
    throw new FinancialInvariantViolationError(
      `ไม่สามารถเปลี่ยนสถานะจาก "${current}" เป็น "${target}" ได้ — สถานะที่อนุญาต: [${(validNext || []).join(', ')}]`
    );
  }
}

export class BudgetDisbursementEngine {
  constructor() {
    this.fiscalYears = [];
    this.budgetSources = [];
    this.budgetTranches = [];
    this.budgetReceipts = [];
    this.projects = [];
    this.activities = [];
    this.allocations = [];
    this.expenses = [];
    this.reversals = [];
    this.transfers = [];
  }

  // ==========================================
  // 💰 CANONICAL NET SPENT FORMULA
  // ==========================================
  static calculateNetSpent(expenses = [], reversals = []) {
    const gross = expenses
      .filter((e) => e.status === 'APPROVED' || e.status === 'REVERSED')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const reversed = reversals
      .filter((r) => r.status === 'APPROVED')
      .reduce((sum, r) => sum + Number(r.amount), 0);

    return Math.max(0, gross - reversed);
  }

  // ==========================================
  // 🎯 SMART ALLOCATION RESOLUTION (Decision 1)
  // ==========================================
  resolveAllocation(activityId, budgetTrancheId, allocationId) {
    if (allocationId) {
      const found = this.allocations.find((a) => a.id === allocationId);
      if (found) return found;
      throw new FinancialInvariantViolationError(`ไม่พบข้อมูลการจัดสรรงบประมาณรหัส ${allocationId}`);
    }

    if (activityId && budgetTrancheId) {
      const match = this.allocations.find(
        (a) => a.activityId === activityId && a.budgetTrancheId === budgetTrancheId
      );
      if (!match) {
        throw new FinancialInvariantViolationError('กิจกรรมนี้ไม่ได้ถูกจัดสรรงบประมาณไว้ในงวดเงินที่ระบุ');
      }
      return match;
    }

    if (activityId) {
      const actAllocs = this.allocations.filter((a) => a.activityId === activityId);
      if (actAllocs.length === 0) {
        throw new FinancialInvariantViolationError('กิจกรรมนี้ยังไม่มีการจัดสรรงบประมาณลงในงวดเงินใดๆ');
      }
      if (actAllocs.length === 1) {
        return actAllocs[0];
      }
      // Ambiguous multiple tranches without specifying tranche
      const trancheNames = actAllocs
        .map((a) => {
          const tr = this.budgetTranches.find((t) => t.id === a.budgetTrancheId);
          return tr ? tr.name || `งวดที่ ${tr.trancheNo}` : a.budgetTrancheId;
        })
        .join(', ');
      throw new FinancialInvariantViolationError(
        `กิจกรรมนี้มีการจัดสรรงบประมาณไว้ในหลายงวดเงิน (${trancheNames}) กรุณาระบุงวดเงินที่ต้องการเบิกจ่ายให้ชัดเจน`
      );
    }

    throw new FinancialInvariantViolationError('กรุณาระบุข้อมูลการจัดสรรงวดเงิน (allocationId หรือ activityId)');
  }

  // ==========================================
  // ⚡ SIMPLIFIED DISBURSEMENT (Decision 1 & 2)
  // ==========================================
  disburseBudget({
    idempotencyKey,
    activityId,
    budgetTrancheId,
    allocationId,
    amount,
    title,
    expenseDate = new Date(),
    receiptNo,
    receiptAttachmentId,
    actorUserId,
    isFinanceAdmin = true,
  }) {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new FinancialInvariantViolationError('ยอดเบิกจ่ายต้องมากกว่า 0 บาท');
    }

    // Check idempotency
    const existing = this.expenses.find((e) => e.idempotencyKey === idempotencyKey);
    if (existing) {
      return existing;
    }

    // 1. Resolve Allocation
    const allocation = this.resolveAllocation(activityId, budgetTrancheId, allocationId);
    const activity = this.activities.find((a) => a.id === allocation.activityId);
    const project = activity ? this.projects.find((p) => p.id === activity.projectId) : null;
    const fy = project ? this.fiscalYears.find((f) => f.id === project.fiscalYearId) : null;

    if (!fy || fy.status !== 'ACTIVE' || fy.isArchived) {
      throw new FinancialInvariantViolationError('ไม่สามารถเบิกจ่ายในปีงบประมาณที่ปิดหรือถูกเก็บถาวรแล้ว');
    }

    if (project && project.status === 'CANCELLED') {
      throw new FinancialInvariantViolationError('โครงการถูกยกเลิกแล้ว ไม่สามารถเบิกจ่ายได้');
    }

    const tranche = this.budgetTranches.find((t) => t.id === allocation.budgetTrancheId);
    if (!tranche) {
      throw new FinancialInvariantViolationError('ไม่พบข้อมูลภาคงวดเงินที่เกี่ยวข้อง');
    }

    // 2. Layer 4 Invariant: Plan Allocation Ceiling
    const allocExpenses = this.expenses.filter((e) => e.allocationId === allocation.id);
    const allocReversals = this.reversals.filter((r) =>
      allocExpenses.some((e) => e.id === r.originalExpenseId)
    );
    const currentAllocNetSpent = BudgetDisbursementEngine.calculateNetSpent(allocExpenses, allocReversals);
    const remainingPlan = Number(allocation.allocatedAmount) - currentAllocNetSpent;

    if (currentAllocNetSpent + numAmount > Number(allocation.allocatedAmount)) {
      throw new FinancialInvariantViolationError(
        `ยอดเบิกจ่ายเกินวงเงินตามแผนของกิจกรรมในงวดนี้ (คงเหลือให้เบิกตามแผน: ${remainingPlan} บาท, ยอดที่ขออนุมัติ: ${numAmount} บาท)`
      );
    }

    // 3. Layer 5 Invariant: Real Cash Inflow Guard
    const trancheReceipts = this.budgetReceipts
      .filter((r) => r.budgetTrancheId === tranche.id)
      .reduce((sum, r) => sum + Number(r.amount), 0);

    const trancheAllocIds = this.allocations
      .filter((a) => a.budgetTrancheId === tranche.id)
      .map((a) => a.id);

    const trancheExpenses = this.expenses.filter((e) => trancheAllocIds.includes(e.allocationId));
    const trancheReversals = this.reversals.filter((r) =>
      trancheExpenses.some((e) => e.id === r.originalExpenseId)
    );
    const currentTrancheNetSpent = BudgetDisbursementEngine.calculateNetSpent(trancheExpenses, trancheReversals);
    const availableCash = trancheReceipts - currentTrancheNetSpent;

    if (currentTrancheNetSpent + numAmount > trancheReceipts) {
      throw new FinancialInvariantViolationError(
        `เงินสดรับเข้าจริงในงวดเงิน "${tranche.name}" ไม่เพียงพอ (เงินสดคงเหลือ: ${availableCash} บาท, ยอดที่ขอเบิก: ${numAmount} บาท) กรุณาบันทึกเงินรับเข้าบัญชีก่อน`
      );
    }

    // 4. Create expense
    const newExpense = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      idempotencyKey,
      allocationId: allocation.id,
      requestedByUserId: actorUserId,
      approvedByUserId: isFinanceAdmin ? actorUserId : null,
      approvedAt: isFinanceAdmin ? new Date() : null,
      expenseDate,
      title,
      amount: numAmount,
      receiptNo: receiptNo || null,
      receiptAttachmentId: receiptAttachmentId || null,
      status: isFinanceAdmin ? 'APPROVED' : 'SUBMITTED',
      createdAt: new Date(),
    };

    this.expenses.push(newExpense);
    return newExpense;
  }

  // ==========================================
  // 🔒 FISCAL YEAR CLOSURE (Decision 3)
  // ==========================================
  closeFiscalYear(fiscalYearId, actorUserId) {
    const fy = this.fiscalYears.find((f) => f.id === fiscalYearId);
    if (!fy) {
      throw new FinancialInvariantViolationError(`ไม่พบปีงบประมาณรหัส ${fiscalYearId}`);
    }

    if (fy.status === 'CLOSED') {
      throw new FinancialInvariantViolationError(`ปีงบประมาณ พ.ศ. ${fy.year} ถูกปิดรอบบัญชีไปแล้ว`);
    }

    // Check invariant 1: Pending submitted expenses
    const fyProjects = this.projects.filter((p) => p.fiscalYearId === fiscalYearId);
    const fyProjectIds = fyProjects.map((p) => p.id);
    const fyActivities = this.activities.filter((a) => fyProjectIds.includes(a.projectId));
    const fyActivityIds = fyActivities.map((a) => a.id);
    const fyAllocs = this.allocations.filter((a) => fyActivityIds.includes(a.activityId));
    const fyAllocIds = fyAllocs.map((a) => a.id);

    const pendingExpenses = this.expenses.filter(
      (e) => fyAllocIds.includes(e.allocationId) && e.status === 'SUBMITTED'
    );
    if (pendingExpenses.length > 0) {
      throw new FinancialInvariantViolationError(
        `ไม่สามารถปิดปีงบประมาณได้ เนื่องจากยังมีรายการเบิกจ่ายค้างรออนุมัติ (${pendingExpenses.length} รายการ) กรุณาอนุมัติหรือปฏิเสธให้เสร็จสิ้นก่อนปิดปี`
      );
    }

    // Check invariant 2: Pending transfers
    const pendingTransfers = this.transfers.filter(
      (t) => t.fiscalYearId === fiscalYearId && t.status === 'PENDING'
    );
    if (pendingTransfers.length > 0) {
      throw new FinancialInvariantViolationError(
        `ไม่สามารถปิดปีงบประมาณได้ เนื่องจากยังมีรายการโอนงบประมาณค้างรออนุมัติ (${pendingTransfers.length} รายการ)`
      );
    }

    // Calculate total receipts and total net spent
    const fySources = this.budgetSources.filter((s) => s.fiscalYearId === fiscalYearId);
    const fySourceIds = fySources.map((s) => s.id);
    const fyTranches = this.budgetTranches.filter((t) => fySourceIds.includes(t.budgetSourceId));
    const fyTrancheIds = fyTranches.map((t) => t.id);

    const totalReceived = this.budgetReceipts
      .filter((r) => fyTrancheIds.includes(r.budgetTrancheId))
      .reduce((sum, r) => sum + Number(r.amount), 0);

    const fyApprovedExpenses = this.expenses.filter(
      (e) => fyAllocIds.includes(e.allocationId) && (e.status === 'APPROVED' || e.status === 'REVERSED')
    );
    const fyApprovedReversals = this.reversals.filter(
      (r) => r.status === 'APPROVED' && fyApprovedExpenses.some((e) => e.id === r.originalExpenseId)
    );
    const totalSpent = BudgetDisbursementEngine.calculateNetSpent(fyApprovedExpenses, fyApprovedReversals);
    const netSurplus = totalReceived - totalSpent;

    fy.status = 'CLOSED';
    fy.isArchived = true;
    fy.closedAt = new Date();
    fy.closedBy = actorUserId;

    return {
      fiscalYear: {
        id: fy.id,
        year: fy.year,
        title: fy.title,
        status: fy.status,
        isArchived: fy.isArchived,
      },
      summary: {
        totalReceived,
        totalSpent,
        netSurplus,
      },
    };
  }

  // ==========================================
  // 📋 1-CLICK PROJECT CLONE ENGINE (Decision 4)
  // ==========================================
  cloneProjectsFromFiscalYear({
    sourceFiscalYearId,
    targetFiscalYearId,
    projectIds = [],
    copyAllocatedAmount = true,
    targetAcademicYear,
    actorUserId,
  }) {
    if (sourceFiscalYearId === targetFiscalYearId) {
      throw new FinancialInvariantViolationError('ไม่สามารถคัดลอกโครงการภายในปีงบประมาณเดียวกันได้');
    }

    if (!projectIds || projectIds.length === 0) {
      throw new FinancialInvariantViolationError('กรุณาเลือกโครงการที่ต้องการคัดลอกอย่างน้อย 1 โครงการ');
    }

    const targetFy = this.fiscalYears.find((f) => f.id === targetFiscalYearId);
    if (!targetFy) {
      throw new FinancialInvariantViolationError(`ไม่พบปีงบประมาณปลายทางรหัส ${targetFiscalYearId}`);
    }

    if (targetFy.status !== 'ACTIVE' || targetFy.isArchived) {
      throw new FinancialInvariantViolationError('ไม่สามารถคัดลอกโครงการไปยังปีงบประมาณที่ปิดหรือถูกเก็บถาวรแล้ว');
    }

    const targetSources = this.budgetSources.filter((s) => s.fiscalYearId === targetFiscalYearId);
    if (targetSources.length === 0) {
      throw new FinancialInvariantViolationError(
        `ปีงบประมาณปลายทาง (${targetFy.title}) ยังไม่มีโครงสร้างแหล่งเงิน กรุณากด "สร้างโครงสร้างงบประมาณเริ่มต้น" ก่อน`
      );
    }

    const sourceFy = this.fiscalYears.find((f) => f.id === sourceFiscalYearId);
    const sourceProjects = this.projects.filter(
      (p) => projectIds.includes(p.id) && p.fiscalYearId === sourceFiscalYearId
    );

    if (sourceProjects.length === 0) {
      throw new FinancialInvariantViolationError('ไม่พบโครงการต้นทางที่เลือกสำหรับคัดลอก');
    }

    const existingProjectCodes = new Set(
      this.projects.filter((p) => p.fiscalYearId === targetFiscalYearId).map((p) => p.code)
    );

    const clonedProjects = [];
    let clonedActivitiesCount = 0;
    let clonedAllocationsCount = 0;

    for (const sp of sourceProjects) {
      const sourceBs = this.budgetSources.find((s) => s.id === sp.budgetSourceId);
      const targetBs = targetSources.find((s) => s.code === (sourceBs ? sourceBs.code : ''));

      if (!targetBs) {
        throw new FinancialInvariantViolationError(
          `ไม่พบแหล่งเงินรหัส "${sourceBs ? sourceBs.code : ''}" ในปีงบประมาณปลายทาง (${targetFy.title})`
        );
      }

      const targetTranches = this.budgetTranches.filter((t) => t.budgetSourceId === targetBs.id);

      let newCode = sp.code;
      if (sourceFy && targetFy && sourceFy.year !== targetFy.year) {
        const autoReplaced = newCode.replaceAll(String(sourceFy.year), String(targetFy.year));
        if (!existingProjectCodes.has(autoReplaced)) {
          newCode = autoReplaced;
        }
      } else if (existingProjectCodes.has(newCode) && sourceFy) {
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

      const projectAmount = copyAllocatedAmount ? Number(sp.allocatedAmount) : 0;

      // Check target BudgetSource ceiling
      if (copyAllocatedAmount && projectAmount > 0) {
        const currentTargetAlloc = this.projects
          .filter((p) => p.budgetSourceId === targetBs.id)
          .reduce((sum, p) => sum + Number(p.allocatedAmount), 0);

        if (currentTargetAlloc + projectAmount > Number(targetBs.totalPlannedAmount)) {
          const remaining = Number(targetBs.totalPlannedAmount) - currentTargetAlloc;
          throw new FinancialInvariantViolationError(
            `การคัดลอกโครงการ "${sp.name}" ทำให้วงเงินเกินแหล่งเงิน "${targetBs.name}" (คงเหลือจัดสรรได้: ${remaining} บ., ขอจัดสรร: ${projectAmount} บ.)`
          );
        }
      }

      const clonedProject = {
        id: `prj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        fiscalYearId: targetFiscalYearId,
        budgetSourceId: targetBs.id,
        departmentName: sp.departmentName,
        leaderUserId: sp.leaderUserId,
        leaderName: sp.leaderName,
        code: newCode,
        name: sp.name,
        targetAcademicYear: targetAcademicYear || targetFy.year,
        allocatedAmount: projectAmount,
        status: 'APPROVED',
        createdAt: new Date(),
      };
      this.projects.push(clonedProject);
      clonedProjects.push(clonedProject);

      // Clone activities
      const spActivities = this.activities.filter((a) => a.projectId === sp.id);
      for (const act of spActivities) {
        const actAmount = copyAllocatedAmount ? Number(act.allocatedAmount) : 0;
        const clonedActivity = {
          id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          projectId: clonedProject.id,
          responsibleUserId: act.responsibleUserId,
          activityNo: act.activityNo,
          name: act.name,
          allocatedAmount: actAmount,
          status: 'NOT_STARTED',
          createdAt: new Date(),
        };
        this.activities.push(clonedActivity);
        clonedActivitiesCount++;

        // Clone allocations
        const actAllocs = this.allocations.filter((a) => a.activityId === act.id);
        for (const alloc of actAllocs) {
          const sourceTr = this.budgetTranches.find((t) => t.id === alloc.budgetTrancheId);
          const targetTr = targetTranches.find((t) => t.trancheNo === (sourceTr ? sourceTr.trancheNo : -1));

          if (!targetTr) {
            throw new FinancialInvariantViolationError(
              `ไม่พบงวดเงินที่ ${sourceTr ? sourceTr.trancheNo : '?'} ของแหล่งเงิน "${targetBs.name}" ในปีงบประมาณปลายทาง`
            );
          }

          const allocAmount = copyAllocatedAmount ? Number(alloc.allocatedAmount) : 0;
          const clonedAlloc = {
            id: `alloc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            activityId: clonedActivity.id,
            budgetTrancheId: targetTr.id,
            allocatedAmount: allocAmount,
            createdAt: new Date(),
          };
          this.allocations.push(clonedAlloc);
          clonedAllocationsCount++;
        }
      }
    }

    return {
      clonedCount: clonedProjects.length,
      clonedActivitiesCount,
      clonedAllocationsCount,
      projects: clonedProjects,
    };
  }
}
