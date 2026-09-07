import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { ProjectBudgetService, FinancialInvariantViolationError } from '../../../src/services/project-budget.service.ts';

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_mHKSdpe5IM7i@ep-fancy-pine-aom5dqmg-pooler.c-2.ap-southeast-1.aws.neon.tech/e-Leave?sslmode=require";

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

test('ProjectBudgetService Suite', async (t) => {
  let testUserId;
  let testFiscalYearId;
  let testBudgetSourceId;
  let testTrancheId;

  // Setup test environment
  await t.test('Setup: Create Test User and Active Fiscal Year', async () => {
    // 1. Get or create test user with ADMIN role
    let user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: `test_finance_${Date.now()}@udkp.ac.th`,
          name: 'เจ้าหน้าที่การเงินทดสอบ',
          role: 'ADMIN',
        },
      });
    }
    testUserId = user.id;

    // 2. Create unique test Fiscal Year
    const year = 2590 + Math.floor(Math.random() * 100);
    const fy = await prisma.fiscalYear.create({
      data: {
        year,
        title: `ปีงบประมาณทดสอบ ${year}`,
        startDate: new Date('2046-10-01T00:00:00Z'),
        endDate: new Date('2047-09-30T23:59:59Z'),
        status: 'ACTIVE',
        budgetSources: {
          create: {
            code: 'TEST_SUBSIDY',
            name: 'เงินอุดหนุนทดสอบ',
            totalPlannedAmount: new Prisma.Decimal(500000),
            tranches: {
              create: [
                {
                  trancheNo: 1,
                  name: 'งวดที่ 1 (รอบ 70%)',
                  academicYear: year,
                  semester: 1,
                  plannedAmount: new Prisma.Decimal(350000),
                },
                {
                  trancheNo: 2,
                  name: 'งวดที่ 2 (รอบ 30%)',
                  academicYear: year,
                  semester: 1,
                  plannedAmount: new Prisma.Decimal(150000),
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
    testTrancheId = fy.budgetSources[0].tranches[0].id;
  });

  // Test 1: Confirm Tranche Deposit
  await t.test('1. confirmTrancheDeposit records receipt and increments totalReceived', async () => {
    const receipt = await ProjectBudgetService.confirmTrancheDeposit({
      idempotencyKey: `idem_dep_test_${Date.now()}`,
      budgetTrancheId: testTrancheId,
      amount: new Prisma.Decimal(200000),
      receivedDate: new Date(),
      documentRef: 'ศธ 0400/1234',
      confirmedByUserId: testUserId,
    });

    assert.ok(receipt.id);
    assert.equal(receipt.amount.toString(), '200000');
  });

  // Test 2: Invariant Check - Reject negative/zero deposit
  await t.test('2. Invariant Check: Reject zero or negative deposit', async () => {
    await assert.rejects(
      async () => {
        await ProjectBudgetService.confirmTrancheDeposit({
          idempotencyKey: `idem_dep_neg_${Date.now()}`,
          budgetTrancheId: testTrancheId,
          amount: new Prisma.Decimal(-5000),
          receivedDate: new Date(),
          confirmedByUserId: testUserId,
        });
      },
      (err) => err instanceof FinancialInvariantViolationError
    );
  });

  // Test 3: Create Project
  let testProjectId;
  await t.test('3. createProject creates project with code uniqueness per FY', async () => {
    const project = await ProjectBudgetService.createProject({
      fiscalYearId: testFiscalYearId,
      budgetSourceId: testBudgetSourceId,
      departmentName: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี',
      leaderUserId: testUserId,
      code: 'PRJ-TEST-001',
      name: 'โครงการพัฒนาห้องปฏิบัติการ AI',
      targetAcademicYear: 2590,
      allocatedAmount: new Prisma.Decimal(100000),
      actorUserId: testUserId,
    });

    assert.ok(project.id);
    testProjectId = project.id;
    assert.equal(project.allocatedAmount.toString(), '100000');
  });

  // Test 4: Create Activity with Allocations (Layers 1, 2, 3)
  let testActivityId;
  let testAllocationId;
  await t.test('4. createActivityWithAllocations enforces Layers 1, 2, and 3', async () => {
    const activity = await ProjectBudgetService.createActivityWithAllocations({
      projectId: testProjectId,
      responsibleUserId: testUserId,
      activityNo: 1,
      name: 'กิจกรรมจัดซื้อชุดเซิร์ฟเวอร์ AI',
      allocatedAmount: new Prisma.Decimal(40000),
      trancheAllocations: [
        {
          budgetTrancheId: testTrancheId,
          allocatedAmount: new Prisma.Decimal(40000),
        },
      ],
      actorUserId: testUserId,
    });

    assert.ok(activity.id);
    assert.equal(activity.trancheAllocations.length, 1);
    testActivityId = activity.id;
    testAllocationId = activity.trancheAllocations[0].id;
  });

  // Test 5: Layer 1 Violation (Activity exceeds Project ceiling)
  await t.test('5. Invariant Layer 1: Reject activity exceeding Project ceiling', async () => {
    await assert.rejects(
      async () => {
        await ProjectBudgetService.createActivityWithAllocations({
          projectId: testProjectId,
          responsibleUserId: testUserId,
          activityNo: 2,
          name: 'กิจกรรมงบเกินเพดาน',
          allocatedAmount: new Prisma.Decimal(70000), // 40k + 70k = 110k > 100k
          trancheAllocations: [
            {
              budgetTrancheId: testTrancheId,
              allocatedAmount: new Prisma.Decimal(70000),
            },
          ],
          actorUserId: testUserId,
        });
      },
      (err) => err instanceof FinancialInvariantViolationError
    );
  });

  // Test 6: Record & Approve Expense (Layer 4 Invariant & Idempotency)
  let testExpenseId;
  await t.test('6. recordExpense and approveExpense enforce Layer 4 ceiling & Idempotency', async () => {
    const key = `idem_${Date.now()}_${Math.random()}`;
    const expense = await ProjectBudgetService.recordExpense({
      idempotencyKey: key,
      allocationId: testAllocationId,
      requestedByUserId: testUserId,
      expenseDate: new Date(),
      title: 'จัดซื้อ GPU Card',
      amount: new Prisma.Decimal(25000),
    });

    assert.ok(expense.id);
    assert.equal(expense.status, 'SUBMITTED');
    testExpenseId = expense.id;

    // Test Idempotency (replay same key returns same record without duplicate error)
    const replay = await ProjectBudgetService.recordExpense({
      idempotencyKey: key,
      allocationId: testAllocationId,
      requestedByUserId: testUserId,
      expenseDate: new Date(),
      title: 'จัดซื้อ GPU Card',
      amount: new Prisma.Decimal(25000),
    });
    assert.equal(replay.id, expense.id);

    // Approve Expense
    const approved = await ProjectBudgetService.approveExpense(expense.id, testUserId);
    assert.equal(approved.status, 'APPROVED');
  });

  // Test 7: Layer 4 Violation (Expense exceeds Allocation ceiling)
  await t.test('7. Invariant Layer 4: Reject expense exceeding Allocation ceiling', async () => {
    const overExpense = await ProjectBudgetService.recordExpense({
      idempotencyKey: `idem_over_${Date.now()}`,
      allocationId: testAllocationId,
      requestedByUserId: testUserId,
      expenseDate: new Date(),
      title: 'รายการเกินงวดจัดสรร',
      amount: new Prisma.Decimal(20000), // 25k spent + 20k = 45k > 40k allocated
    });

    await assert.rejects(
      async () => {
        await ProjectBudgetService.approveExpense(overExpense.id, testUserId);
      },
      (err) => err instanceof FinancialInvariantViolationError
    );
  });

  // Test 8: Full 1:1 Expense Reversal
  await t.test('8. reverseApprovedExpense creates Reversal and sets status to REVERSED', async () => {
    const reversal = await ProjectBudgetService.reverseApprovedExpense({
      originalExpenseId: testExpenseId,
      reason: 'ยกเลิกเนื่องจากยกเลิกสัญญาซื้อขายและคืนเงิน',
      cancelledByUserId: testUserId,
      approvedByUserId: testUserId,
    });

    assert.ok(reversal.id);
    assert.equal(reversal.amount.toString(), '25000');

    // Verify original expense status is REVERSED
    const checkExp = await prisma.activityExpense.findUnique({
      where: { id: testExpenseId },
    });
    assert.equal(checkExp.status, 'REVERSED');
  });

  // Test 9: Dashboard Metrics Calculation
  await t.test('9. getFiscalYearDashboardMetrics computes on-the-fly zero drift aggregates', async () => {
    const dashboard = await ProjectBudgetService.getFiscalYearDashboardMetrics(testFiscalYearId);

    assert.ok(dashboard.metrics);
    assert.equal(dashboard.metrics.totalPlanned, 500000);
    assert.equal(dashboard.metrics.totalReceived, 200000);
    assert.equal(dashboard.metrics.totalAllocatedToProjects, 100000);
    // After reversal of 25k, total spent = 25k - 25k = 0
    assert.equal(dashboard.metrics.totalSpent, 0);
    assert.equal(dashboard.metrics.netLiquidity, 200000);
    assert.equal(dashboard.projects.length, 1);
    assert.equal(dashboard.projects[0].remainingAmount, 100000);
  });

  // Cleanup pool
  await pool.end();
});
