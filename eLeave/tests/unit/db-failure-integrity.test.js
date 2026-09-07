import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import {
  ProjectBudgetService,
  FinancialInvariantViolationError,
  UnauthorizedServiceError,
} from '../../../src/services/project-budget.service.ts';

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_mHKSdpe5IM7i@ep-fancy-pine-aom5dqmg-pooler.c-2.ap-southeast-1.aws.neon.tech/e-Leave?sslmode=require";

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

test('Database Failure & Transaction-Abort Integration Suite', async (t) => {
  let adminUser;
  let testFy;
  let budgetSource;
  let tranche;
  let project;
  let activity;
  let allocation;

  await t.test('Setup: Provision Isolated Testing Sandbox', async () => {
    adminUser = await prisma.user.create({
      data: {
        email: `db_fail_admin_${Date.now()}@udkp.ac.th`,
        name: 'ผู้ดูแลระบบทดสอบ Failure',
        role: 'ADMIN',
      },
    });

    const year = 4000 + Math.floor(Math.random() * 2000) + Math.floor(Date.now() % 1000);
    testFy = await prisma.fiscalYear.create({
      data: {
        year,
        title: `ปีงบประมาณ Failure Test ${year}`,
        startDate: new Date('2100-10-01T00:00:00Z'),
        endDate: new Date('2101-09-30T23:59:59Z'),
        status: 'ACTIVE',
        budgetSources: {
          create: {
            code: 'FAIL_TEST_SRC',
            name: 'แหล่งเงินทดสอบ Transaction Crash',
            totalPlannedAmount: new Prisma.Decimal(500000),
            tranches: {
              create: [
                {
                  trancheNo: 1,
                  name: 'งวดที่ 1 (Crash Sandbox)',
                  academicYear: year,
                  semester: 1,
                  plannedAmount: new Prisma.Decimal(500000),
                },
              ],
            },
          },
        },
      },
      include: { budgetSources: { include: { tranches: true } } },
    });

    budgetSource = testFy.budgetSources[0];
    tranche = budgetSource.tranches[0];

    // Deposit initial inflow
    await ProjectBudgetService.confirmTrancheDeposit({
      idempotencyKey: `fail_dep_${Date.now()}`,
      budgetTrancheId: tranche.id,
      amount: new Prisma.Decimal(300000),
      receivedDate: new Date(),
      confirmedByUserId: adminUser.id,
    });

    project = await ProjectBudgetService.createProject({
      fiscalYearId: testFy.id,
      budgetSourceId: budgetSource.id,
      leaderUserId: adminUser.id,
      code: `PRJ-FAIL-${Date.now()}`,
      name: 'โครงการทดสอบ Transaction Abort',
      targetAcademicYear: 2100,
      allocatedAmount: new Prisma.Decimal(200000),
      actorUserId: adminUser.id,
    });

    activity = await ProjectBudgetService.createActivityWithAllocations({
      projectId: project.id,
      responsibleUserId: adminUser.id,
      activityNo: 1,
      name: 'กิจกรรมสำหรับ Crash Test',
      allocatedAmount: new Prisma.Decimal(100000),
      trancheAllocations: [
        { budgetTrancheId: tranche.id, allocatedAmount: new Prisma.Decimal(100000) },
      ],
      actorUserId: adminUser.id,
    });
    allocation = activity.trancheAllocations[0];
  });

  // Test 1: Mid-transaction Unhandled Exception -> 100% Rollback & Zero Orphan Records
  await t.test('1. Mid-transaction simulated failure aborts cleanly leaving 0 orphan records', async () => {
    const expenseCountBefore = await prisma.activityExpense.count();
    const auditCountBefore = await prisma.auditLog.count();

    // Custom simulated failure transaction
    await assert.rejects(
      async () => {
        await prisma.$transaction(async (tx) => {
          // Step 1: Insert expense record
          await tx.activityExpense.create({
            data: {
              idempotencyKey: `sim_crash_${Date.now()}`,
              allocationId: allocation.id,
              requestedByUserId: adminUser.id,
              expenseDate: new Date(),
              title: 'รายการจำลอง Crash กลางคัน',
              amount: new Prisma.Decimal(15000),
              status: 'SUBMITTED',
            },
          });

          // Step 2: Insert audit log
          await tx.auditLog.create({
            data: {
              tableName: 'ActivityExpense',
              recordId: 'temp-id',
              action: 'CREATE',
              changedBy: adminUser.id,
              reason: 'ก่อน Crash',
            },
          });

          // Step 3: Simulate catastrophic mid-flight crash / power loss / exception
          throw new Error('SIMULATED_NETWORK_CONNECTION_TERMINATED');
        });
      },
      (err) => err.message === 'SIMULATED_NETWORK_CONNECTION_TERMINATED'
    );

    // Verify DB count has exactly 0 changes
    const expenseCountAfter = await prisma.activityExpense.count();
    const auditCountAfter = await prisma.auditLog.count();

    assert.equal(expenseCountAfter, expenseCountBefore, 'Zero orphan expense records created');
    assert.equal(auditCountAfter, auditCountBefore, 'Zero orphan audit logs created');
  });

  // Test 2: Connection Pool Health & Query Resilience after Abort
  await t.test('2. Database connection pool remains healthy and operational after rollback', async () => {
    // Immediate query after aborted transaction
    const exp = await ProjectBudgetService.recordExpense({
      idempotencyKey: `post_crash_exp_${Date.now()}`,
      allocationId: allocation.id,
      requestedByUserId: adminUser.id,
      expenseDate: new Date(),
      title: 'รายการปกติหลัง Transaction Abort',
      amount: new Prisma.Decimal(5000),
    });

    assert.ok(exp.id);
    assert.equal(exp.status, 'SUBMITTED');

    const approved = await ProjectBudgetService.approveExpense(exp.id, adminUser.id);
    assert.equal(approved.status, 'APPROVED');
  });

  // Test 3: Concurrent Idempotency Race Recovery
  await t.test('3. Concurrent idempotency requests resolve safely to consistent record', async () => {
    const key = `p2002_race_${Date.now()}`;

    // Two concurrent recordExpense requests with same key
    const results = await Promise.allSettled([
      ProjectBudgetService.recordExpense({
        idempotencyKey: key,
        allocationId: allocation.id,
        requestedByUserId: adminUser.id,
        expenseDate: new Date(),
        title: 'รายการแข่งขัน P2002',
        amount: new Prisma.Decimal(2000),
      }),
      ProjectBudgetService.recordExpense({
        idempotencyKey: key,
        allocationId: allocation.id,
        requestedByUserId: adminUser.id,
        expenseDate: new Date(),
        title: 'รายการแข่งขัน P2002',
        amount: new Prisma.Decimal(2000),
      }),
    ]);

    const successes = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    assert.ok(successes.length >= 1, 'At least 1 concurrent call must succeed');
    if (successes.length === 2) {
      assert.equal(successes[0].id, successes[1].id, 'Both calls must resolve to identical record ID');
    }

    const totalWithKey = await prisma.activityExpense.count({ where: { idempotencyKey: key } });
    assert.equal(totalWithKey, 1, 'Exactly one record persisted in database');
  });

  // Test 4: Financial Conservation Invariance under Multi-Operation Burst
  await t.test('4. Financial conservation invariance holds across simultaneous operations', async () => {
    const startMetrics = await ProjectBudgetService.getFiscalYearDashboardMetrics(testFy.id);
    const initialReceived = startMetrics.metrics.totalReceived;
    const initialSpent = startMetrics.metrics.totalSpent;

    // Fire 3 deposits (10k each) and 3 expenses (2k each) simultaneously in one Promise.allSettled
    const allOperations = [
      ...Array.from({ length: 3 }, (_, i) =>
        ProjectBudgetService.confirmTrancheDeposit({
          idempotencyKey: `burst_dep_${Date.now()}_${i}`,
          budgetTrancheId: tranche.id,
          amount: new Prisma.Decimal(10000),
          receivedDate: new Date(),
          documentRef: `ศธ 999/BURST-${i}`,
          confirmedByUserId: adminUser.id,
        })
      ),
      ...Array.from({ length: 3 }, (_, i) =>
        ProjectBudgetService.recordExpense({
          idempotencyKey: `burst_exp_${Date.now()}_${i}`,
          allocationId: allocation.id,
          requestedByUserId: adminUser.id,
          expenseDate: new Date(),
          title: `Burst Expense ${i}`,
          amount: new Prisma.Decimal(2000),
        })
      ),
    ];

    const allResults = await Promise.allSettled(allOperations);
    const depositResults = allResults.slice(0, 3);
    const expenseResults = allResults.slice(3, 6);

    const successfulDeposits = depositResults.filter((r) => r.status === 'fulfilled');
    const successfulExpenses = expenseResults.filter((r) => r.status === 'fulfilled');

    assert.ok(successfulDeposits.length >= 1, 'At least 1 deposit must succeed');
    assert.ok(successfulExpenses.length >= 1, 'At least 1 expense must succeed');

    const endMetrics = await ProjectBudgetService.getFiscalYearDashboardMetrics(testFy.id);

    // Received must increase by exactly 10,000 * successful deposits
    const expectedReceivedIncrease = 10000 * successfulDeposits.length;
    assert.equal(endMetrics.metrics.totalReceived, initialReceived + expectedReceivedIncrease);

    // Submitted expenses do NOT count as spent until approved
    assert.equal(endMetrics.metrics.totalSpent, initialSpent);

    // Liquidity = totalReceived - totalSpent
    assert.equal(endMetrics.metrics.netLiquidity, endMetrics.metrics.totalReceived - endMetrics.metrics.totalSpent);
  });

  // Cleanup
  await pool.end();
});
