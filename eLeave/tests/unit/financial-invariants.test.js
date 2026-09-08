import test from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { prisma, pool } from '../../../src/lib/db.ts';
import {
  ProjectBudgetService,
  FinancialInvariantViolationError,
} from '../../../src/services/project-budget.service.ts';

test('Financial Invariants & Dual-Layer Domain Model Suite', async (t) => {
  let testUserId;
  let testFiscalYearId;
  let testBudgetSourceId;
  let testTranche1Id;
  let testTranche2Id;
  let testProjectId;
  let testActivity1Id;
  let testAlloc1Id;

  await t.test('Setup: Create Admin User, Fiscal Year, and Budget Structure', async () => {
    // 1. Get or create Admin user
    let user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: `test_fin_admin_${Date.now()}@udkp.ac.th`,
          name: 'หัวหน้างานการเงินทดสอบ',
          role: 'ADMIN',
        },
      });
    }
    testUserId = user.id;

    // 2. Create isolated Fiscal Year with BudgetSource (500k) and Tranche 1 (Planned: 100k, Received: 0)
    const testYear = 3500 + Math.floor(Math.random() * 5000);
    const fy = await prisma.fiscalYear.create({
      data: {
        year: testYear,
        title: `ปีงบประมาณทดสอบ Invariant ${testYear}`,
        startDate: new Date('2051-10-01T00:00:00Z'),
        endDate: new Date('2052-09-30T23:59:59Z'),
        status: 'ACTIVE',
        budgetSources: {
          create: {
            code: 'TEST_SRC_500K',
            name: 'งบประมาณเงินอุดหนุนทดสอบ 500,000',
            totalPlannedAmount: new Prisma.Decimal(500000),
            tranches: {
              create: [
                {
                  trancheNo: 1,
                  name: 'งวดที่ 1 (รอบ 70%) - แผน 100k',
                  academicYear: testYear,
                  semester: 1,
                  plannedAmount: new Prisma.Decimal(100000),
                },
                {
                  trancheNo: 2,
                  name: 'งวดที่ 2 (รอบ 30%) - แผน 100k',
                  academicYear: testYear,
                  semester: 1,
                  plannedAmount: new Prisma.Decimal(100000),
                },
              ],
            },
          },
        },
      },
      include: { budgetSources: { include: { tranches: true } } },
    });

    testFiscalYearId = fy.id;
    testBudgetSourceId = fy.budgetSources[0].id;
    testTranche1Id = fy.budgetSources[0].tranches[0].id;
    testTranche2Id = fy.budgetSources[0].tranches[1].id;

    // 3. Create Project with allocated 200,000
    const project = await ProjectBudgetService.createProject({
      fiscalYearId: testFiscalYearId,
      budgetSourceId: testBudgetSourceId,
      departmentName: 'ฝ่ายบริหารงานวิชาการ',
      leaderUserId: testUserId,
      code: `PRJ-INV-${Date.now().toString().slice(-4)}`,
      name: 'โครงการทดสอบ Financial Invariant',
      targetAcademicYear: testYear,
      allocatedAmount: new Prisma.Decimal(200000),
      actorUserId: testUserId,
    });
    testProjectId = project.id;
  });

  // Test 1: Zero-Cash Planning is permitted up to Tranche.plannedAmount
  await t.test('1. Zero-Cash Planning: Plan allocation succeeds when receivedAmount = 0, but rejects when exceeding plannedAmount', async () => {
    // Allocation of 100k to Tranche 1 (Planned: 100k, Received: 0) -> MUST SUCCEED
    const activity = await ProjectBudgetService.createActivityWithAllocations({
      projectId: testProjectId,
      responsibleUserId: testUserId,
      activityNo: 1,
      name: 'กิจกรรมจัดสรรงบตามแผน 100,000 (ยังไม่มีเงินเข้า)',
      allocatedAmount: new Prisma.Decimal(100000),
      trancheAllocations: [
        {
          budgetTrancheId: testTranche1Id,
          allocatedAmount: new Prisma.Decimal(100000),
        },
      ],
      actorUserId: testUserId,
    });

    assert.ok(activity.id);
    assert.equal(activity.trancheAllocations.length, 1);
    assert.equal(activity.trancheAllocations[0].allocatedAmount.toString(), '100000');
    testActivity1Id = activity.id;
    testAlloc1Id = activity.trancheAllocations[0].id;

    // Attempting to allocate another 1 baht to Tranche 1 -> MUST FAIL (exceeds planned 100k)
    await assert.rejects(
      async () => {
        await ProjectBudgetService.createActivityWithAllocations({
          projectId: testProjectId,
          responsibleUserId: testUserId,
          activityNo: 2,
          name: 'กิจกรรมเกินเพดานแผนงวด',
          allocatedAmount: new Prisma.Decimal(1),
          trancheAllocations: [
            {
              budgetTrancheId: testTranche1Id,
              allocatedAmount: new Prisma.Decimal(1),
            },
          ],
          actorUserId: testUserId,
        });
      },
      (err) => err instanceof FinancialInvariantViolationError
    );
  });

  // Test 2: Zero-Cash Approval Blocked
  let expense1Id;
  await t.test('2. Zero-Cash Approval: Expense submission succeeds, but approval is REJECTED when Cash Available is 0', async () => {
    // Record expense of 10,000 (status: SUBMITTED)
    const expense = await ProjectBudgetService.recordExpense({
      idempotencyKey: `inv_exp_zero_${Date.now()}`,
      allocationId: testAlloc1Id,
      requestedByUserId: testUserId,
      expenseDate: new Date(),
      title: 'ขอเบิกจ่ายขณะที่ยังไม่มีเงินสดในงวด',
      amount: new Prisma.Decimal(10000),
    });

    assert.ok(expense.id);
    assert.equal(expense.status, 'SUBMITTED');
    expense1Id = expense.id;

    // Attempt to approve expense -> MUST FAIL with FinancialInvariantViolationError (Cash Available = 0)
    await assert.rejects(
      async () => {
        await ProjectBudgetService.approveExpense(expense.id, testUserId);
      },
      (err) => {
        assert.ok(err instanceof FinancialInvariantViolationError);
        assert.match(err.message, /เงินสดรับเข้าจริงในงวดเงิน/);
        return true;
      }
    );
  });

  // Test 3: Partial Cash Inflow & Bounded Approval
  let expense2Id;
  await t.test('3. Partial Cash Inflow: Confirm deposit of 30k -> Approve 20k succeeds -> Next 15k rejects -> Deposit 20k -> 15k succeeds', async () => {
    // Step 3.1: Confirm deposit of 30,000 into Tranche 1
    const receipt1 = await ProjectBudgetService.confirmTrancheDeposit({
      idempotencyKey: `inv_dep_30k_${Date.now()}`,
      budgetTrancheId: testTranche1Id,
      amount: new Prisma.Decimal(30000),
      receivedDate: new Date(),
      documentRef: 'ศธ 0400/30K',
      confirmedByUserId: testUserId,
    });
    assert.ok(receipt1.id);

    // Step 3.2: Record and approve expense of 20,000 -> MUST SUCCEED (Available Cash = 30k - 20k = 10k)
    const expense20k = await ProjectBudgetService.recordExpense({
      idempotencyKey: `inv_exp_20k_${Date.now()}`,
      allocationId: testAlloc1Id,
      requestedByUserId: testUserId,
      expenseDate: new Date(),
      title: 'เบิกจ่าย 20,000 บาท (อยู่ในวงเงิน 30,000)',
      amount: new Prisma.Decimal(20000),
    });

    const approved20k = await ProjectBudgetService.approveExpense(expense20k.id, testUserId);
    assert.equal(approved20k.status, 'APPROVED');

    // Step 3.3: Record expense of 15,000. Attempt approval -> MUST FAIL (15,000 > 10,000 Available Cash)
    const expense15k = await ProjectBudgetService.recordExpense({
      idempotencyKey: `inv_exp_15k_${Date.now()}`,
      allocationId: testAlloc1Id,
      requestedByUserId: testUserId,
      expenseDate: new Date(),
      title: 'เบิกจ่าย 15,000 บาท (เกินเงินสดคงเหลือ 10,000)',
      amount: new Prisma.Decimal(15000),
    });
    expense2Id = expense15k.id;

    await assert.rejects(
      async () => {
        await ProjectBudgetService.approveExpense(expense15k.id, testUserId);
      },
      (err) => {
        assert.ok(err instanceof FinancialInvariantViolationError);
        assert.match(err.message, /เงินสดรับเข้าจริงในงวดเงิน/);
        return true;
      }
    );

    // Step 3.4: Confirm additional deposit of 20,000 into Tranche 1 (Total received = 50k, Spent = 20k, Available = 30k)
    const receipt2 = await ProjectBudgetService.confirmTrancheDeposit({
      idempotencyKey: `inv_dep_add_20k_${Date.now()}`,
      budgetTrancheId: testTranche1Id,
      amount: new Prisma.Decimal(20000),
      receivedDate: new Date(),
      documentRef: 'ศธ 0400/ADD-20K',
      confirmedByUserId: testUserId,
    });
    assert.ok(receipt2.id);

    // Step 3.5: Retry approval of 15,000 expense -> MUST NOW SUCCEED!
    const approved15k = await ProjectBudgetService.approveExpense(expense2Id, testUserId);
    assert.equal(approved15k.status, 'APPROVED');
  });

  // Test 4: Deterministic Multi-Tranche Resolution
  await t.test('4. Deterministic Multi-Tranche: Ambiguous activityId is REJECTED; explicit budgetTrancheId SUCCEEDS', async () => {
    const testYear2 = 8500 + Math.floor(Math.random() * 5000);
    const fyMulti = await prisma.fiscalYear.create({
      data: {
        year: testYear2,
        title: `ปีทดสอบ Multi-Tranche ${testYear2}`,
        startDate: new Date('2052-10-01T00:00:00Z'),
        endDate: new Date('2053-09-30T23:59:59Z'),
        status: 'ACTIVE',
        budgetSources: {
          create: {
            code: 'SRC_MULTI',
            name: 'งบสำหรับ Multi-Tranche Test',
            totalPlannedAmount: new Prisma.Decimal(400000),
            tranches: {
              create: [
                {
                  trancheNo: 1,
                  name: 'งวด ก',
                  academicYear: testYear2,
                  semester: 1,
                  plannedAmount: new Prisma.Decimal(200000),
                },
                {
                  trancheNo: 2,
                  name: 'งวด ข',
                  academicYear: testYear2,
                  semester: 1,
                  plannedAmount: new Prisma.Decimal(200000),
                },
              ],
            },
          },
        },
      },
      include: { budgetSources: { include: { tranches: true } } },
    });

    const prjMulti = await ProjectBudgetService.createProject({
      fiscalYearId: fyMulti.id,
      budgetSourceId: fyMulti.budgetSources[0].id,
      departmentName: 'ฝ่ายบริหารงานทั่วไป',
      leaderUserId: testUserId,
      code: `PRJ-M-${Date.now().toString().slice(-4)}`,
      name: 'โครงการทดสอบหลายงวด',
      targetAcademicYear: testYear2,
      allocatedAmount: new Prisma.Decimal(100000),
      actorUserId: testUserId,
    });

    const actDual = await ProjectBudgetService.createActivityWithAllocations({
      projectId: prjMulti.id,
      responsibleUserId: testUserId,
      activityNo: 1,
      name: 'กิจกรรม 2 งวดเงิน',
      allocatedAmount: new Prisma.Decimal(50000),
      trancheAllocations: [
        {
          budgetTrancheId: fyMulti.budgetSources[0].tranches[0].id,
          allocatedAmount: new Prisma.Decimal(25000),
        },
        {
          budgetTrancheId: fyMulti.budgetSources[0].tranches[1].id,
          allocatedAmount: new Prisma.Decimal(25000),
        },
      ],
      actorUserId: testUserId,
    });

    assert.equal(actDual.trancheAllocations.length, 2);

    // Call resolveAllocationDeterministically with ONLY activityId -> MUST REJECT due to ambiguity
    await assert.rejects(
      async () => {
        await ProjectBudgetService.resolveAllocationDeterministically({
          activityId: actDual.id,
        });
      },
      (err) => {
        assert.ok(err instanceof FinancialInvariantViolationError);
        assert.match(err.message, /กิจกรรมนี้มีการจัดสรรงบประมาณไว้ในหลายงวดเงิน/);
        return true;
      }
    );

    // Call resolveAllocationDeterministically with activityId + budgetTrancheId -> MUST SUCCEED
    const resolvedAllocId = await ProjectBudgetService.resolveAllocationDeterministically({
      activityId: actDual.id,
      budgetTrancheId: fyMulti.budgetSources[0].tranches[0].id,
    });
    assert.equal(resolvedAllocId, actDual.trancheAllocations[0].id);

    // Recording expense with the resolved allocationId succeeds
    const expense = await ProjectBudgetService.recordExpense({
      idempotencyKey: `idem_dual_${Date.now()}`,
      allocationId: resolvedAllocId,
      requestedByUserId: testUserId,
      expenseDate: new Date(),
      title: 'เบิกจ่ายในงวด ก',
      amount: new Prisma.Decimal(5000),
    });
    assert.ok(expense.id);
  });

  // Test 5: BudgetTranche.plannedAmount vs BudgetSource.totalPlannedAmount ceiling
  await t.test('5. BudgetSource Ceiling Invariant: SUM(BudgetTranche.plannedAmount) <= BudgetSource.totalPlannedAmount', async () => {
    // Create an isolated BudgetSource with ceiling 200,000
    const sourceCeiling = await prisma.budgetSource.create({
      data: {
        fiscalYearId: testFiscalYearId,
        code: `SRC_CEIL_${Date.now().toString().slice(-4)}`,
        name: 'แหล่งงบเพดาน 200,000',
        totalPlannedAmount: new Prisma.Decimal(200000),
      },
    });

    // Create Tranche A of 150,000 -> MUST SUCCEED (150,000 <= 200,000)
    const trancheA = await ProjectBudgetService.createBudgetTranche({
      budgetSourceId: sourceCeiling.id,
      trancheNo: 1,
      name: 'งวดแรก 150k',
      academicYear: 2595,
      semester: 1,
      plannedAmount: new Prisma.Decimal(150000),
      actorUserId: testUserId,
    });
    assert.ok(trancheA.id);

    // Attempt to create Tranche B of 100,000 -> Total would be 250k > 200k -> MUST FAIL
    await assert.rejects(
      async () => {
        await ProjectBudgetService.createBudgetTranche({
          budgetSourceId: sourceCeiling.id,
          trancheNo: 2,
          name: 'งวดเกินเพดาน 100k',
          academicYear: 2595,
          semester: 2,
          plannedAmount: new Prisma.Decimal(100000),
          actorUserId: testUserId,
        });
      },
      (err) => {
        assert.ok(err instanceof FinancialInvariantViolationError);
        assert.match(err.message, /เกินกรอบวงเงินของแหล่งงบประมาณ/);
        return true;
      }
    );

    // Create Tranche B with exactly remaining 50,000 -> MUST SUCCEED
    const trancheB = await ProjectBudgetService.createBudgetTranche({
      budgetSourceId: sourceCeiling.id,
      trancheNo: 2,
      name: 'งวดพอดีเพดาน 50k',
      academicYear: 2595,
      semester: 2,
      plannedAmount: new Prisma.Decimal(50000),
      actorUserId: testUserId,
    });
    assert.ok(trancheB.id);
  });

  // Teardown
  await prisma.$disconnect();
  await pool.end();
});
