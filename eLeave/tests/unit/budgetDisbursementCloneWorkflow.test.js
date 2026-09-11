import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BudgetDisbursementEngine,
  FinancialInvariantViolationError,
  validateExpenseStateTransition,
} from '../../../src/lib/services/budgetDisbursementEngine.js';

test('Budget Disbursement & 1-Click Clone Engine Workflow Suite (ADR-001)', async (t) => {
  // -------------------------------------------------------------
  // Test 1: Canonical Net Spent Formula
  // -------------------------------------------------------------
  await t.test('1. calculateNetSpent computes gross approved/reversed minus approved reversals', () => {
    const expenses = [
      { id: 'e1', amount: 10000, status: 'APPROVED' },
      { id: 'e2', amount: 5000, status: 'REVERSED' },
      { id: 'e3', amount: 2000, status: 'SUBMITTED' }, // Must NOT be counted
      { id: 'e4', amount: 3000, status: 'REJECTED' },  // Must NOT be counted
      { id: 'e5', amount: 1500, status: 'DRAFT' },     // Must NOT be counted
    ];

    const reversals = [
      { id: 'r1', originalExpenseId: 'e2', amount: 5000, status: 'APPROVED' },
      { id: 'r2', originalExpenseId: 'e1', amount: 2000, status: 'PENDING' }, // Must NOT be counted
    ];

    const netSpent = BudgetDisbursementEngine.calculateNetSpent(expenses, reversals);
    // (10000 + 5000) - 5000 = 10000
    assert.equal(netSpent, 10000);
  });

  // -------------------------------------------------------------
  // Test 2: State Transitions Matrix
  // -------------------------------------------------------------
  await t.test('2. validateExpenseStateTransition enforces valid expense lifecycle', () => {
    assert.doesNotThrow(() => validateExpenseStateTransition('DRAFT', 'SUBMITTED'));
    assert.doesNotThrow(() => validateExpenseStateTransition('SUBMITTED', 'APPROVED'));
    assert.doesNotThrow(() => validateExpenseStateTransition('SUBMITTED', 'REJECTED'));
    assert.doesNotThrow(() => validateExpenseStateTransition('APPROVED', 'REVERSED'));

    // Illegal transitions must throw
    assert.throws(
      () => validateExpenseStateTransition('DRAFT', 'APPROVED'),
      /ไม่สามารถเปลี่ยนสถานะ/
    );
    assert.throws(
      () => validateExpenseStateTransition('REVERSED', 'APPROVED'),
      /ไม่สามารถเปลี่ยนสถานะ/
    );
  });

  // -------------------------------------------------------------
  // Test 3: Smart Allocation Resolution
  // -------------------------------------------------------------
  await t.test('3. Smart Allocation Selector resolves single allocation and catches ambiguous multi-allocations', () => {
    const engine = new BudgetDisbursementEngine();
    engine.budgetTranches = [
      { id: 'tranche-1', trancheNo: 1, name: 'งวดที่ 1 (รอบ 70%)' },
      { id: 'tranche-2', trancheNo: 2, name: 'งวดที่ 2 (รอบ 30%)' },
    ];
    engine.activities = [
      { id: 'act-single', name: 'กิจกรรมงวดเดียว' },
      { id: 'act-multi', name: 'กิจกรรมหลายงวด' },
      { id: 'act-none', name: 'กิจกรรมไม่มีงวด' },
    ];
    engine.allocations = [
      { id: 'alloc-1', activityId: 'act-single', budgetTrancheId: 'tranche-1', allocatedAmount: 50000 },
      { id: 'alloc-2a', activityId: 'act-multi', budgetTrancheId: 'tranche-1', allocatedAmount: 30000 },
      { id: 'alloc-2b', activityId: 'act-multi', budgetTrancheId: 'tranche-2', allocatedAmount: 20000 },
    ];

    // Case A: Single tranche is resolved automatically 100%
    const resolvedSingle = engine.resolveAllocation('act-single');
    assert.equal(resolvedSingle.id, 'alloc-1');

    // Case B: Direct allocationId is resolved
    const resolvedDirect = engine.resolveAllocation(undefined, undefined, 'alloc-1');
    assert.equal(resolvedDirect.id, 'alloc-1');

    // Case C: Activity with specific budgetTrancheId is resolved
    const resolvedMultiExplicit = engine.resolveAllocation('act-multi', 'tranche-2');
    assert.equal(resolvedMultiExplicit.id, 'alloc-2b');

    // Case D: Multi-tranche without tranche specification throws error listing tranches
    assert.throws(
      () => engine.resolveAllocation('act-multi'),
      /กิจกรรมนี้มีการจัดสรรงบประมาณไว้ในหลายงวดเงิน/
    );

    // Case E: Zero allocations throws clear error
    assert.throws(
      () => engine.resolveAllocation('act-none'),
      /กิจกรรมนี้ยังไม่มีการจัดสรรงบประมาณลงในงวดเงินใดๆ/
    );
  });

  // -------------------------------------------------------------
  // Test 4: Simplified Disbursement & Invariant Layer 4 & Layer 5 Guards
  // -------------------------------------------------------------
  await t.test('4. Cash-Gated Disbursement enforces Plan Ceiling (Layer 4) and Cash Inflow Guard (Layer 5)', () => {
    const engine = new BudgetDisbursementEngine();
    engine.fiscalYears = [
      { id: 'fy-2569', year: 2569, title: 'ปีงบประมาณ 2569', status: 'ACTIVE', isArchived: false },
    ];
    engine.budgetSources = [
      { id: 'bs-1', fiscalYearId: 'fy-2569', code: 'SUBSIDY_PER_HEAD', name: 'เงินอุดหนุนรายหัว', totalPlannedAmount: 500000 },
    ];
    engine.budgetTranches = [
      { id: 'tr-1', budgetSourceId: 'bs-1', trancheNo: 1, name: 'งวดที่ 1 (รอบ 70%)', plannedAmount: 350000 },
    ];
    engine.projects = [
      { id: 'prj-1', fiscalYearId: 'fy-2569', budgetSourceId: 'bs-1', code: 'PRJ-2569-001', name: 'โครงการวิชาการ', allocatedAmount: 100000 },
    ];
    engine.activities = [
      { id: 'act-1', projectId: 'prj-1', activityNo: 1, name: 'กิจกรรมจัดซื้อสื่อ', allocatedAmount: 40000 },
    ];
    engine.allocations = [
      { id: 'alloc-1', activityId: 'act-1', budgetTrancheId: 'tr-1', allocatedAmount: 40000 },
    ];

    // Sub-case 4.1: Attempt disbursement with 0 cash received in tranche -> Layer 5 Rejection
    assert.throws(
      () =>
        engine.disburseBudget({
          idempotencyKey: 'idem-test-1',
          activityId: 'act-1',
          amount: 10000,
          title: 'จัดซื้ออุปกรณ์ชุดที่ 1',
          actorUserId: 'finance-officer-1',
        }),
      /เงินสดรับเข้าจริงในงวดเงิน "งวดที่ 1 \(รอบ 70%\)" ไม่เพียงพอ/
    );

    // Deposit cash into Tranche 1: 25,000 Baht
    engine.budgetReceipts.push({
      id: 'rc-1',
      budgetTrancheId: 'tr-1',
      amount: 25000,
      confirmedByUserId: 'finance-officer-1',
    });

    // Sub-case 4.2: Successful disbursement within cash on hand (15,000 <= 25,000 cash and <= 40,000 plan)
    const expense = engine.disburseBudget({
      idempotencyKey: 'idem-test-1',
      activityId: 'act-1',
      amount: 15000,
      title: 'จัดซื้ออุปกรณ์ชุดที่ 1',
      actorUserId: 'finance-officer-1',
      receiptNo: 'REC-001',
      receiptAttachmentId: 'att-file-01',
      isFinanceAdmin: true,
    });

    assert.ok(expense.id);
    assert.equal(expense.status, 'APPROVED');
    assert.equal(expense.amount, 15000);
    assert.equal(expense.receiptAttachmentId, 'att-file-01');

    // Sub-case 4.3: Attempt second disbursement of 15,000 Baht:
    // Plan has 40,000 - 15,000 = 25,000 (Sufficient!)
    // BUT Cash remaining is only 25,000 - 15,000 = 10,000 (Insufficient for 15,000!) -> Layer 5 Rejection
    assert.throws(
      () =>
        engine.disburseBudget({
          idempotencyKey: 'idem-test-2',
          activityId: 'act-1',
          amount: 15000,
          title: 'จัดซื้ออุปกรณ์ชุดที่ 2',
          actorUserId: 'finance-officer-1',
        }),
      /เงินสดรับเข้าจริงในงวดเงิน "งวดที่ 1 \(รอบ 70%\)" ไม่เพียงพอ \(เงินสดคงเหลือ: 10000 บาท, ยอดที่ขอเบิก: 15000 บาท\)/
    );

    // Deposit extra cash: 100,000 Baht
    engine.budgetReceipts.push({
      id: 'rc-2',
      budgetTrancheId: 'tr-1',
      amount: 100000,
      confirmedByUserId: 'finance-officer-1',
    });

    // Sub-case 4.4: Attempt disbursement of 30,000 Baht:
    // Cash is plenty (110,000 Baht)
    // BUT Plan remaining on activity is only 40,000 - 15,000 = 25,000 -> Layer 4 Plan Ceiling Rejection
    assert.throws(
      () =>
        engine.disburseBudget({
          idempotencyKey: 'idem-test-3',
          activityId: 'act-1',
          amount: 30000,
          title: 'จัดซื้ออุปกรณ์เกินแผน',
          actorUserId: 'finance-officer-1',
        }),
      /ยอดเบิกจ่ายเกินวงเงินตามแผนของกิจกรรมในงวดนี้ \(คงเหลือให้เบิกตามแผน: 25000 บาท, ยอดที่ขออนุมัติ: 30000 บาท\)/
    );
  });

  // -------------------------------------------------------------
  // Test 5: Fiscal Year Closure & Surplus Calculation (Decision 3)
  // -------------------------------------------------------------
  await t.test('5. Fiscal Year Closure blocks on pending expenses and computes net surplus cash accurately', () => {
    const engine = new BudgetDisbursementEngine();
    engine.fiscalYears = [
      { id: 'fy-close-test', year: 2569, title: 'ปีงบประมาณ 2569', status: 'ACTIVE', isArchived: false },
    ];
    engine.budgetSources = [
      { id: 'bs-c1', fiscalYearId: 'fy-close-test', code: 'SRC_1', totalPlannedAmount: 500000 },
    ];
    engine.budgetTranches = [
      { id: 'tr-c1', budgetSourceId: 'bs-c1', trancheNo: 1, plannedAmount: 500000 },
    ];
    engine.projects = [
      { id: 'prj-c1', fiscalYearId: 'fy-close-test', code: 'PRJ-C1', name: 'โครงการทดสอบปิดปี' },
    ];
    engine.activities = [
      { id: 'act-c1', projectId: 'prj-c1', activityNo: 1, name: 'กิจกรรม C1' },
    ];
    engine.allocations = [
      { id: 'alloc-c1', activityId: 'act-c1', budgetTrancheId: 'tr-c1', allocatedAmount: 200000 },
    ];

    // Cash received: 200,000 Baht
    engine.budgetReceipts.push({
      id: 'rc-c1',
      budgetTrancheId: 'tr-c1',
      amount: 200000,
    });

    // Approved expense: 120,000 Baht
    engine.expenses.push({
      id: 'exp-app-1',
      allocationId: 'alloc-c1',
      amount: 120000,
      status: 'APPROVED',
    });

    // Pending SUBMITTED expense: 10,000 Baht
    const pendingExp = {
      id: 'exp-pending-1',
      allocationId: 'alloc-c1',
      amount: 10000,
      status: 'SUBMITTED',
    };
    engine.expenses.push(pendingExp);

    // Closure must fail because of pending expense
    assert.throws(
      () => engine.closeFiscalYear('fy-close-test', 'admin-user'),
      /ไม่สามารถปิดปีงบประมาณได้ เนื่องจากยังมีรายการเบิกจ่ายค้างรออนุมัติ/
    );

    // Resolve pending expense (reject it)
    pendingExp.status = 'REJECTED';

    // Now close fiscal year
    const closure = engine.closeFiscalYear('fy-close-test', 'admin-user');

    assert.equal(closure.fiscalYear.status, 'CLOSED');
    assert.equal(closure.fiscalYear.isArchived, true);
    assert.equal(closure.summary.totalReceived, 200000);
    assert.equal(closure.summary.totalSpent, 120000);
    assert.equal(closure.summary.netSurplus, 80000); // 200k - 120k = 80k surplus cash on hand!

    // Immutable lock: cannot disburse in closed year
    assert.throws(
      () =>
        engine.disburseBudget({
          idempotencyKey: 'idem-closed-fy',
          activityId: 'act-c1',
          amount: 5000,
          title: 'เบิกจ่ายในปีที่ปิดแล้ว',
          actorUserId: 'admin-user',
        }),
      /ไม่สามารถเบิกจ่ายในปีงบประมาณที่ปิดหรือถูกเก็บถาวรแล้ว/
    );
  });

  // -------------------------------------------------------------
  // Test 6: 1-Click Project & Activity Clone Engine (Decision 4)
  // -------------------------------------------------------------
  await t.test('6. 1-Click Clone Engine accurately maps sources, tranches, prevents collisions, and clones activities', () => {
    const engine = new BudgetDisbursementEngine();

    // Source Fiscal Year (2569)
    engine.fiscalYears.push(
      { id: 'fy-source', year: 2569, title: 'ปีงบประมาณ 2569', status: 'CLOSED', isArchived: true },
      { id: 'fy-target', year: 2570, title: 'ปีงบประมาณ 2570', status: 'ACTIVE', isArchived: false }
    );

    // Sources in 2569
    engine.budgetSources.push(
      { id: 'bs-src-subsidy', fiscalYearId: 'fy-source', code: 'SUBSIDY_PER_HEAD', name: 'เงินอุดหนุนรายหัว' },
      // Target sources in 2570
      { id: 'bs-tgt-subsidy', fiscalYearId: 'fy-target', code: 'SUBSIDY_PER_HEAD', name: 'เงินอุดหนุนรายหัว', totalPlannedAmount: 1000000 }
    );

    // Tranches
    engine.budgetTranches.push(
      { id: 'tr-src-1', budgetSourceId: 'bs-src-subsidy', trancheNo: 1, name: 'งวดที่ 1' },
      { id: 'tr-src-2', budgetSourceId: 'bs-src-subsidy', trancheNo: 2, name: 'งวดที่ 2' },
      { id: 'tr-tgt-1', budgetSourceId: 'bs-tgt-subsidy', trancheNo: 1, name: 'งวดที่ 1' },
      { id: 'tr-tgt-2', budgetSourceId: 'bs-tgt-subsidy', trancheNo: 2, name: 'งวดที่ 2' }
    );

    // Source Projects & Activities
    engine.projects.push({
      id: 'prj-src-1',
      fiscalYearId: 'fy-source',
      budgetSourceId: 'bs-src-subsidy',
      code: 'PRJ-2569-001',
      name: 'โครงการพัฒนาทักษะวิทยาศาสตร์',
      departmentName: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี',
      leaderUserId: 'teacher-somchai',
      leaderName: 'ครูสมชาย',
      allocatedAmount: 100000,
    });

    engine.activities.push(
      {
        id: 'act-src-1',
        projectId: 'prj-src-1',
        activityNo: 1,
        name: 'กิจกรรมจัดซื้อสารเคมี',
        allocatedAmount: 60000,
      },
      {
        id: 'act-src-2',
        projectId: 'prj-src-1',
        activityNo: 2,
        name: 'กิจกรรมค่ายวิทยาศาสตร์',
        allocatedAmount: 40000,
      }
    );

    engine.allocations.push(
      { id: 'al-src-1', activityId: 'act-src-1', budgetTrancheId: 'tr-src-1', allocatedAmount: 60000 },
      { id: 'al-src-2', activityId: 'act-src-2', budgetTrancheId: 'tr-src-2', allocatedAmount: 40000 }
    );

    // Execution: Clone projects with amounts preserved (copyAllocatedAmount = true)
    const cloneResult = engine.cloneProjectsFromFiscalYear({
      sourceFiscalYearId: 'fy-source',
      targetFiscalYearId: 'fy-target',
      projectIds: ['prj-src-1'],
      copyAllocatedAmount: true,
      targetAcademicYear: 2570,
      actorUserId: 'admin-user',
    });

    assert.equal(cloneResult.clonedCount, 1);
    assert.equal(cloneResult.clonedActivitiesCount, 2);
    assert.equal(cloneResult.clonedAllocationsCount, 2);

    const clonedPrj = cloneResult.projects[0];
    assert.equal(clonedPrj.fiscalYearId, 'fy-target');
    assert.equal(clonedPrj.budgetSourceId, 'bs-tgt-subsidy');
    // Code auto-migrated from 2569 to 2570
    assert.equal(clonedPrj.code, 'PRJ-2570-001');
    assert.equal(clonedPrj.allocatedAmount, 100000);

    // Verify cloned activities and allocations
    const tgtActivities = engine.activities.filter((a) => a.projectId === clonedPrj.id);
    assert.equal(tgtActivities.length, 2);
    assert.equal(tgtActivities[0].name, 'กิจกรรมจัดซื้อสารเคมี');
    assert.equal(tgtActivities[0].allocatedAmount, 60000);

    const tgtAlloc1 = engine.allocations.find((a) => a.activityId === tgtActivities[0].id);
    assert.ok(tgtAlloc1);
    assert.equal(tgtAlloc1.budgetTrancheId, 'tr-tgt-1'); // Mapped to target Tranche 1
    assert.equal(tgtAlloc1.allocatedAmount, 60000);

    // Invariant: Reject cloning into same fiscal year
    assert.throws(
      () =>
        engine.cloneProjectsFromFiscalYear({
          sourceFiscalYearId: 'fy-target',
          targetFiscalYearId: 'fy-target',
          projectIds: [clonedPrj.id],
          actorUserId: 'admin-user',
        }),
      /ไม่สามารถคัดลอกโครงการภายในปีงบประมาณเดียวกันได้/
    );

    // Invariant: Reject cloning into closed fiscal year
    assert.throws(
      () =>
        engine.cloneProjectsFromFiscalYear({
          sourceFiscalYearId: 'fy-target',
          targetFiscalYearId: 'fy-source', // fy-source is CLOSED
          projectIds: [clonedPrj.id],
          actorUserId: 'admin-user',
        }),
      /ไม่สามารถคัดลอกโครงการไปยังปีงบประมาณที่ปิดหรือถูกเก็บถาวรแล้ว/
    );
  });
});
