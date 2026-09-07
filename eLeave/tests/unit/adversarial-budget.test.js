import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import {
  ProjectBudgetService,
  FinancialInvariantViolationError,
  UnauthorizedServiceError,
  LedgerLockConflictError,
} from '../../../src/services/project-budget.service.ts';

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_mHKSdpe5IM7i@ep-fancy-pine-aom5dqmg-pooler.c-2.ap-southeast-1.aws.neon.tech/e-Leave?sslmode=require";

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

test('P0 Adversarial Financial Hardening Suite', async (t) => {
  let adminUser;
  let financeOfficerUser;
  let financePositionUser;
  let teacherUserA;
  let teacherUserB;
  let activeFy;
  let closedFy;
  let budgetSource;
  let tranche1;
  let tranche2;

  await t.test('Setup: Create Distinct Users and Fiscal Years', async () => {
    // 1. Admin
    adminUser = await prisma.user.create({
      data: {
        email: `adv_admin_${Date.now()}@udkp.ac.th`,
        name: 'แอดมินทดสอบ',
        role: 'ADMIN',
      },
    });

    // 2. Finance Officer
    financeOfficerUser = await prisma.user.create({
      data: {
        email: `adv_finance_officer_${Date.now()}@udkp.ac.th`,
        name: 'เจ้าหน้าที่การเงินตาม Role',
        role: 'FINANCE_OFFICER',
      },
    });

    // 3. Finance by Position
    financePositionUser = await prisma.user.create({
      data: {
        email: `adv_finance_pos_${Date.now()}@udkp.ac.th`,
        name: 'เจ้าหน้าที่การเงินตามตำแหน่ง',
        role: 'TEACHER',
        position: 'ครู ชำนาญการพิเศษ (เจ้าหน้าที่การเงินและพัสดุ)',
      },
    });

    // 4. Regular Teachers
    teacherUserA = await prisma.user.create({
      data: {
        email: `adv_teacher_a_${Date.now()}@udkp.ac.th`,
        name: 'ครู สมชาย (ผู้รับผิดชอบโครงการ A)',
        role: 'TEACHER',
      },
    });

    teacherUserB = await prisma.user.create({
      data: {
        email: `adv_teacher_b_${Date.now()}@udkp.ac.th`,
        name: 'ครู สมศรี (ผู้รับผิดชอบโครงการ B)',
        role: 'TEACHER',
      },
    });

    // 5. Active Fiscal Year
    const maxFy = await prisma.fiscalYear.findFirst({ orderBy: { year: 'desc' }, select: { year: true } });
    const yearActive = (maxFy?.year || 2600) + 1;
    activeFy = await prisma.fiscalYear.create({
      data: {
        year: yearActive,
        title: `ปีงบประมาณ Active ${yearActive}`,
        startDate: new Date('2056-10-01T00:00:00Z'),
        endDate: new Date('2057-09-30T23:59:59Z'),
        status: 'ACTIVE',
        budgetSources: {
          create: {
            code: 'ADV_SUBSIDY',
            name: 'เงินอุดหนุนเพื่อการทดสอบขั้นสูง',
            totalPlannedAmount: new Prisma.Decimal(1000000), // 1M ceiling
            tranches: {
              create: [
                {
                  trancheNo: 1,
                  name: 'งวดที่ 1 (70%)',
                  academicYear: yearActive,
                  semester: 1,
                  plannedAmount: new Prisma.Decimal(700000),
                },
                {
                  trancheNo: 2,
                  name: 'งวดที่ 2 (30%)',
                  academicYear: yearActive,
                  semester: 1,
                  plannedAmount: new Prisma.Decimal(300000),
                },
              ],
            },
          },
        },
      },
      include: { budgetSources: { include: { tranches: true } } },
    });

    budgetSource = activeFy.budgetSources[0];
    tranche1 = budgetSource.tranches[0];
    tranche2 = budgetSource.tranches[1];

    // 6. Closed Fiscal Year
    const yearClosed = yearActive + 1;
    closedFy = await prisma.fiscalYear.create({
      data: {
        year: yearClosed,
        title: `ปีงบประมาณ Closed ${yearClosed}`,
        startDate: new Date('2057-10-01T00:00:00Z'),
        endDate: new Date('2058-09-30T23:59:59Z'),
        status: 'CLOSED',
        budgetSources: {
          create: {
            code: 'CLOSED_SRC',
            name: 'เงินปีที่ปิดแล้ว',
            totalPlannedAmount: new Prisma.Decimal(500000),
          },
        },
      },
      include: { budgetSources: true },
    });

    // Deposit initial funds into tranche 1 (500k) & tranche 2 (200k)
    await ProjectBudgetService.confirmTrancheDeposit({
      idempotencyKey: `init_dep_1_${Date.now()}`,
      budgetTrancheId: tranche1.id,
      amount: new Prisma.Decimal(500000),
      receivedDate: new Date(),
      documentRef: 'ศธ 0400/INIT1',
      confirmedByUserId: adminUser.id,
    });

    await ProjectBudgetService.confirmTrancheDeposit({
      idempotencyKey: `init_dep_2_${Date.now()}`,
      budgetTrancheId: tranche2.id,
      amount: new Prisma.Decimal(200000),
      receivedDate: new Date(),
      documentRef: 'ศธ 0400/INIT2',
      confirmedByUserId: financeOfficerUser.id,
    });
  });

  // Base setup for projects & activities
  let projectA;
  let activityA;
  let allocA1;
  let allocA2;
  let projectB;
  let activityB;
  let allocB1;

  await t.test('Base Projects & Activities Setup', async () => {
    // Project A led by Teacher A (Allocated 300,000)
    projectA = await ProjectBudgetService.createProject({
      fiscalYearId: activeFy.id,
      budgetSourceId: budgetSource.id,
      departmentName: 'กลุ่มสาระวิทยาศาสตร์',
      leaderUserId: teacherUserA.id,
      code: `PRJ-A-${Date.now()}`,
      name: 'โครงการนวัตกรรม AI สำหรับการเรียนรู้',
      targetAcademicYear: 2600,
      allocatedAmount: new Prisma.Decimal(300000),
      actorUserId: financeOfficerUser.id,
    });

    // Activity A1 (200,000 total: 150k in T1, 50k in T2) responsible by Teacher A
    activityA = await ProjectBudgetService.createActivityWithAllocations({
      projectId: projectA.id,
      responsibleUserId: teacherUserA.id,
      activityNo: 1,
      name: 'จัดซื้อชุดอุปกรณ์ AI Lab',
      allocatedAmount: new Prisma.Decimal(200000),
      trancheAllocations: [
        { budgetTrancheId: tranche1.id, allocatedAmount: new Prisma.Decimal(150000) },
        { budgetTrancheId: tranche2.id, allocatedAmount: new Prisma.Decimal(50000) },
      ],
      actorUserId: financeOfficerUser.id,
    });
    allocA1 = activityA.trancheAllocations.find((a) => a.budgetTrancheId === tranche1.id);
    allocA2 = activityA.trancheAllocations.find((a) => a.budgetTrancheId === tranche2.id);

    // Project B led by Teacher B (Allocated 200,000)
    projectB = await ProjectBudgetService.createProject({
      fiscalYearId: activeFy.id,
      budgetSourceId: budgetSource.id,
      departmentName: 'กลุ่มสาระคณิตศาสตร์',
      leaderUserId: teacherUserB.id,
      code: `PRJ-B-${Date.now()}`,
      name: 'โครงการคณิตศาสตร์โอลิมปิก',
      targetAcademicYear: 2600,
      allocatedAmount: new Prisma.Decimal(200000),
      actorUserId: adminUser.id,
    });

    // Activity B1 (100,000 in T1) responsible by Teacher B
    activityB = await ProjectBudgetService.createActivityWithAllocations({
      projectId: projectB.id,
      responsibleUserId: teacherUserB.id,
      activityNo: 1,
      name: 'ค่ายคณิตศาสตร์เข้มข้น',
      allocatedAmount: new Prisma.Decimal(100000),
      trancheAllocations: [
        { budgetTrancheId: tranche1.id, allocatedAmount: new Prisma.Decimal(100000) },
      ],
      actorUserId: adminUser.id,
    });
    allocB1 = activityB.trancheAllocations[0];
  });

  // ==========================================
  // 🛡️ P0-1: SERVICE-LEVEL AUTHORIZATION TESTS
  // ==========================================
  await t.test('P0-1: Service-level Authorization Boundary Enforcement', async (st) => {
    // 1. Teacher A records expense on OWN activity -> ALLOW
    await st.test('1. Teacher A records expense on own activity -> ALLOW', async () => {
      const exp = await ProjectBudgetService.recordExpense({
        idempotencyKey: `auth_own_${Date.now()}`,
        allocationId: allocA1.id,
        requestedByUserId: teacherUserA.id,
        expenseDate: new Date(),
        title: 'จัดซื้อเซ็นเซอร์ IoT',
        amount: new Prisma.Decimal(10000),
      });
      assert.ok(exp.id);
      assert.equal(exp.status, 'SUBMITTED');
    });

    // 2. Teacher A attempts to record expense on Teacher B activity -> DENY (UnauthorizedServiceError)
    await st.test('2. Teacher A records expense on Teacher B activity -> DENY', async () => {
      await assert.rejects(
        async () => {
          await ProjectBudgetService.recordExpense({
            idempotencyKey: `auth_steal_${Date.now()}`,
            allocationId: allocB1.id,
            requestedByUserId: teacherUserA.id, // Teacher A has no ownership of B
            expenseDate: new Date(),
            title: 'ขโมยเบิกเงินงวดครูบี',
            amount: new Prisma.Decimal(15000),
          });
        },
        (err) => err instanceof UnauthorizedServiceError
      );
    });

    // 3. Teacher A attempts to call approveExpense -> DENY
    await st.test('3. Teacher A calls approveExpense -> DENY', async () => {
      const exp = await ProjectBudgetService.recordExpense({
        idempotencyKey: `auth_app_${Date.now()}`,
        allocationId: allocA1.id,
        requestedByUserId: teacherUserA.id,
        expenseDate: new Date(),
        title: 'รายการรออนุมัติ',
        amount: new Prisma.Decimal(5000),
      });

      await assert.rejects(
        async () => {
          await ProjectBudgetService.approveExpense(exp.id, teacherUserA.id);
        },
        (err) => err instanceof UnauthorizedServiceError
      );
    });

    // 4. Teacher A attempts to call reverseApprovedExpense -> DENY
    await st.test('4. Teacher A calls reverseApprovedExpense -> DENY', async () => {
      // Create and approve an expense using admin
      const exp = await ProjectBudgetService.recordExpense({
        idempotencyKey: `auth_rev_prep_${Date.now()}`,
        allocationId: allocA1.id,
        requestedByUserId: teacherUserA.id,
        expenseDate: new Date(),
        title: 'รายการทดสอบยกเลิก',
        amount: new Prisma.Decimal(5000),
      });
      await ProjectBudgetService.approveExpense(exp.id, adminUser.id);

      await assert.rejects(
        async () => {
          await ProjectBudgetService.reverseApprovedExpense({
            originalExpenseId: exp.id,
            reason: 'ครูทั่วไปพยายามยกเลิกเอง',
            cancelledByUserId: teacherUserA.id,
            approvedByUserId: teacherUserA.id,
          });
        },
        (err) => err instanceof UnauthorizedServiceError
      );
    });

    // 5. Teacher A attempts to call confirmTrancheDeposit -> DENY
    await st.test('5. Teacher A calls confirmTrancheDeposit -> DENY', async () => {
      await assert.rejects(
        async () => {
          await ProjectBudgetService.confirmTrancheDeposit({
            idempotencyKey: `auth_dep_teacher_${Date.now()}`,
            budgetTrancheId: tranche1.id,
            amount: new Prisma.Decimal(50000),
            receivedDate: new Date(),
            confirmedByUserId: teacherUserA.id,
          });
        },
        (err) => err instanceof UnauthorizedServiceError
      );
    });

    // 6. Teacher A attempts to call createProject -> DENY
    await st.test('6. Teacher A calls createProject -> DENY', async () => {
      await assert.rejects(
        async () => {
          await ProjectBudgetService.createProject({
            fiscalYearId: activeFy.id,
            budgetSourceId: budgetSource.id,
            leaderUserId: teacherUserA.id,
            code: `PRJ-UNAUTH-${Date.now()}`,
            name: 'โครงการที่ครูสร้างเองโดยไม่มีสิทธิ์',
            targetAcademicYear: 2600,
            allocatedAmount: new Prisma.Decimal(50000),
            actorUserId: teacherUserA.id,
          });
        },
        (err) => err instanceof UnauthorizedServiceError
      );
    });

    // 7. Teacher A attempts to call transferBudget -> DENY
    await st.test('7. Teacher A calls transferBudget -> DENY', async () => {
      await assert.rejects(
        async () => {
          await ProjectBudgetService.transferBudget({
            fiscalYearId: activeFy.id,
            fromAllocationId: allocA1.id,
            toAllocationId: allocA2.id,
            amount: new Prisma.Decimal(10000),
            reason: 'ครูพยายามโอนเงินเอง',
            requestedByUserId: teacherUserA.id,
            approvedByUserId: teacherUserA.id,
          });
        },
        (err) => err instanceof UnauthorizedServiceError
      );
    });

    // 8. FINANCE_OFFICER calls approveExpense -> ALLOW
    await st.test('8. FINANCE_OFFICER calls approveExpense -> ALLOW', async () => {
      const exp = await ProjectBudgetService.recordExpense({
        idempotencyKey: `auth_fo_app_${Date.now()}`,
        allocationId: allocA1.id,
        requestedByUserId: teacherUserA.id,
        expenseDate: new Date(),
        title: 'รายการที่การเงินอนุมัติ',
        amount: new Prisma.Decimal(2000),
      });

      const approved = await ProjectBudgetService.approveExpense(exp.id, financeOfficerUser.id);
      assert.equal(approved.status, 'APPROVED');
    });

    // 9. Free-text position "เจ้าหน้าที่การเงิน" with role "TEACHER" is DENIED (Privilege escalation blocked)
    await st.test('9. User with free-text position "การเงิน" but role TEACHER is DENIED from MANAGE operations', async () => {
      const exp = await ProjectBudgetService.recordExpense({
        idempotencyKey: `auth_pos_app_${Date.now()}`,
        allocationId: allocA1.id,
        requestedByUserId: teacherUserA.id,
        expenseDate: new Date(),
        title: 'รายการทดสอบ Privilege Escalation',
        amount: new Prisma.Decimal(2000),
      });

      // Denied because role is TEACHER and position is not authoritative
      await assert.rejects(
        async () => {
          await ProjectBudgetService.approveExpense(exp.id, financePositionUser.id);
        },
        (err) => err instanceof UnauthorizedServiceError
      );

      // Now grant explicit budgetAdminUserIds in settings -> ALLOW
      await prisma.systemSettings.update({
        where: { id: 'default' },
        data: { budgetAdminUserIds: financePositionUser.id },
      });

      const approved = await ProjectBudgetService.approveExpense(exp.id, financePositionUser.id);
      assert.equal(approved.status, 'APPROVED');

      // Cleanup settings
      await prisma.systemSettings.update({
        where: { id: 'default' },
        data: { budgetAdminUserIds: '' },
      });
    });
  });

  // ==========================================
  // 🛡️ P0-2: CROSS-FY BUDGET SOURCE INTEGRITY
  // ==========================================
  await t.test('P0-2: Cross-FY BudgetSource/Project Integrity', async (st) => {
    // 10. createProject with matching FY -> OK
    await st.test('10. createProject with matching FY -> OK', async () => {
      const prj = await ProjectBudgetService.createProject({
        fiscalYearId: activeFy.id,
        budgetSourceId: budgetSource.id,
        leaderUserId: teacherUserA.id,
        code: `PRJ-MATCH-${Date.now()}`,
        name: 'โครงการปีตรงกัน',
        targetAcademicYear: 2600,
        allocatedAmount: new Prisma.Decimal(50000),
        actorUserId: adminUser.id,
      });
      assert.ok(prj.id);
    });

    // 11. createProject with BudgetSource from different FY -> REJECT
    await st.test('11. createProject with BudgetSource from different FY -> REJECT', async () => {
      await assert.rejects(
        async () => {
          await ProjectBudgetService.createProject({
            fiscalYearId: activeFy.id, // Active FY
            budgetSourceId: closedFy.budgetSources[0].id, // BudgetSource belongs to Closed FY!
            leaderUserId: teacherUserA.id,
            code: `PRJ-MISMATCH-${Date.now()}`,
            name: 'โครงการแหล่งเงินข้ามปี',
            targetAcademicYear: 2600,
            allocatedAmount: new Prisma.Decimal(50000),
            actorUserId: adminUser.id,
          });
        },
        (err) => err instanceof FinancialInvariantViolationError
      );
    });
  });

  // ==========================================
  // 🛡️ P0-3: BUDGET TRANSFER ADVERSARIAL & LOCK PROOF
  // ==========================================
  await t.test('P0-3: BudgetTransfer Concurrency & Deadlock Safety', async (st) => {
    // 12. Transfer success -> source decrements + dest increments
    await st.test('12. Transfer success -> balances adjusted exactly', async () => {
      const allocA1Before = await prisma.activityTrancheAllocation.findUniqueOrThrow({
        where: { id: allocA1.id },
      });
      const allocA2Before = await prisma.activityTrancheAllocation.findUniqueOrThrow({
        where: { id: allocA2.id },
      });

      const transfer = await ProjectBudgetService.transferBudget({
        fiscalYearId: activeFy.id,
        fromAllocationId: allocA1.id,
        toAllocationId: allocA2.id,
        amount: new Prisma.Decimal(20000),
        reason: 'โอนงบเพื่อจัดซื้อเพิ่มในงวดที่ 2',
        requestedByUserId: adminUser.id,
        approvedByUserId: adminUser.id,
      });

      assert.ok(transfer.id);
      const allocA1After = await prisma.activityTrancheAllocation.findUniqueOrThrow({
        where: { id: allocA1.id },
      });
      const allocA2After = await prisma.activityTrancheAllocation.findUniqueOrThrow({
        where: { id: allocA2.id },
      });

      assert.equal(allocA1After.allocatedAmount.toString(), allocA1Before.allocatedAmount.sub(20000).toString());
      assert.equal(allocA2After.allocatedAmount.toString(), allocA2Before.allocatedAmount.add(20000).toString());
    });

    // 13. Transfer exceeding source liquidity -> REJECT
    await st.test('13. Transfer exceeding source liquidity -> REJECT', async () => {
      await assert.rejects(
        async () => {
          await ProjectBudgetService.transferBudget({
            fiscalYearId: activeFy.id,
            fromAllocationId: allocA2.id,
            toAllocationId: allocA1.id,
            amount: new Prisma.Decimal(9999999), // Exceeds liquidity
            reason: 'โอนเกินวงเงินคงเหลือ',
            requestedByUserId: adminUser.id,
            approvedByUserId: adminUser.id,
          });
        },
        (err) => err instanceof FinancialInvariantViolationError
      );
    });

    // 14. source = destination -> REJECT
    await st.test('14. source = destination -> REJECT', async () => {
      await assert.rejects(
        async () => {
          await ProjectBudgetService.transferBudget({
            fiscalYearId: activeFy.id,
            fromAllocationId: allocA1.id,
            toAllocationId: allocA1.id,
            amount: new Prisma.Decimal(5000),
            reason: 'โอนเข้าตัวเอง',
            requestedByUserId: adminUser.id,
            approvedByUserId: adminUser.id,
          });
        },
        (err) => err instanceof FinancialInvariantViolationError
      );
    });

    // 15. Concurrent transfers on SAME source -> Invariant conservation
    await st.test('15. Concurrent transfers on same source conserve total sum and respect ceiling', async () => {
      const a1Before = await prisma.activityTrancheAllocation.findUniqueOrThrow({ where: { id: allocA1.id } });
      const a2Before = await prisma.activityTrancheAllocation.findUniqueOrThrow({ where: { id: allocA2.id } });
      const initialTotal = a1Before.allocatedAmount.add(a2Before.allocatedAmount);

      const p1 = ProjectBudgetService.transferBudget({
        fiscalYearId: activeFy.id,
        fromAllocationId: allocA1.id,
        toAllocationId: allocA2.id,
        amount: new Prisma.Decimal(5000),
        reason: 'Concurrent transfer 1',
        requestedByUserId: adminUser.id,
        approvedByUserId: adminUser.id,
      });

      const p2 = ProjectBudgetService.transferBudget({
        fiscalYearId: activeFy.id,
        fromAllocationId: allocA1.id,
        toAllocationId: allocA2.id,
        amount: new Prisma.Decimal(5000),
        reason: 'Concurrent transfer 2',
        requestedByUserId: adminUser.id,
        approvedByUserId: adminUser.id,
      });

      const results = await Promise.allSettled([p1, p2]);
      const successes = results.filter((r) => r.status === 'fulfilled');

      const a1After = await prisma.activityTrancheAllocation.findUniqueOrThrow({ where: { id: allocA1.id } });
      const a2After = await prisma.activityTrancheAllocation.findUniqueOrThrow({ where: { id: allocA2.id } });
      const endTotal = a1After.allocatedAmount.add(a2After.allocatedAmount);

      // Financial Conservation Invariant: Sum of allocations must be 100% conserved
      assert.equal(endTotal.toString(), initialTotal.toString(), 'Total allocation sum must be conserved exactly');

      // Net change matches number of successful transfers * 5000
      const expectedDelta = new Prisma.Decimal(5000 * successes.length);
      assert.equal(a2After.allocatedAmount.toString(), a2Before.allocatedAmount.add(expectedDelta).toString());
      assert.equal(a1After.allocatedAmount.toString(), a1Before.allocatedAmount.sub(expectedDelta).toString());
    });

    // 16. Reverse-direction concurrent transfers (A->B and B->A) -> PROVES .sort() PREVENTS DEADLOCK & Conserves Total
    await st.test('16. Reverse-direction concurrent transfers (A->B & B->A) -> No deadlock & exact conservation', async () => {
      const a1Before = await prisma.activityTrancheAllocation.findUniqueOrThrow({ where: { id: allocA1.id } });
      const b1Before = await prisma.activityTrancheAllocation.findUniqueOrThrow({ where: { id: allocB1.id } });
      const totalBefore = a1Before.allocatedAmount.add(b1Before.allocatedAmount);

      const pForward = ProjectBudgetService.transferBudget({
        fiscalYearId: activeFy.id,
        fromAllocationId: allocA1.id,
        toAllocationId: allocB1.id,
        amount: new Prisma.Decimal(1000),
        reason: 'Forward transfer A -> B',
        requestedByUserId: adminUser.id,
        approvedByUserId: adminUser.id,
      });

      const pReverse = ProjectBudgetService.transferBudget({
        fiscalYearId: activeFy.id,
        fromAllocationId: allocB1.id,
        toAllocationId: allocA1.id,
        amount: new Prisma.Decimal(1000),
        reason: 'Reverse transfer B -> A',
        requestedByUserId: adminUser.id,
        approvedByUserId: adminUser.id,
      });

      // Both requests fired at the exact same millisecond with reversed lock requirements
      const results = await Promise.allSettled([pForward, pReverse]);
      const deadlocks = results.filter(
        (r) => r.status === 'rejected' && r.reason?.message?.includes('deadlock')
      );

      assert.equal(deadlocks.length, 0, 'Zero deadlocks allowed due to sorted PK locking');

      const a1After = await prisma.activityTrancheAllocation.findUniqueOrThrow({ where: { id: allocA1.id } });
      const b1After = await prisma.activityTrancheAllocation.findUniqueOrThrow({ where: { id: allocB1.id } });
      const totalAfter = a1After.allocatedAmount.add(b1After.allocatedAmount);

      assert.equal(totalAfter.toString(), totalBefore.toString(), 'Sum of allocations across A and B must be strictly conserved');
    });
  });

  // ==========================================
  // 🛡️ P0-4: CONCURRENT IDEMPOTENCY (REAL RACE)
  // ==========================================
  await t.test('P0-4: Concurrent Idempotency & Payload Mismatch Protection', async (st) => {
    // 17. Same key concurrent (Promise.allSettled) -> exactly 1 expense in DB
    await st.test('17. Concurrent expense with same key -> exactly 1 record created', async () => {
      const key = `race_exp_${Date.now()}_${Math.random()}`;

      const r1 = ProjectBudgetService.recordExpense({
        idempotencyKey: key,
        allocationId: allocA1.id,
        requestedByUserId: teacherUserA.id,
        expenseDate: new Date(),
        title: 'Concurrent Race Test Item',
        amount: new Prisma.Decimal(3000),
      });

      const r2 = ProjectBudgetService.recordExpense({
        idempotencyKey: key,
        allocationId: allocA1.id,
        requestedByUserId: teacherUserA.id,
        expenseDate: new Date(),
        title: 'Concurrent Race Test Item',
        amount: new Prisma.Decimal(3000),
      });

      const results = await Promise.allSettled([r1, r2]);
      const successful = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);

      assert.ok(successful.length > 0, 'At least 1 must fulfill');
      if (successful.length === 2) {
        assert.equal(successful[0].id, successful[1].id, 'Both must return the exact same Expense ID');
      }

      // Verify DB has strictly 1 record with this key
      const count = await prisma.activityExpense.count({ where: { idempotencyKey: key } });
      assert.equal(count, 1, 'Database must have exactly 1 record');
    });

    // 18. Same key + different amount -> REJECT
    await st.test('18. Same key + different amount -> REJECT with mismatch error', async () => {
      const key = `mismatch_amt_${Date.now()}`;
      await ProjectBudgetService.recordExpense({
        idempotencyKey: key,
        allocationId: allocA1.id,
        requestedByUserId: teacherUserA.id,
        expenseDate: new Date(),
        title: 'Original Title',
        amount: new Prisma.Decimal(4000),
      });

      await assert.rejects(
        async () => {
          await ProjectBudgetService.recordExpense({
            idempotencyKey: key,
            allocationId: allocA1.id,
            requestedByUserId: teacherUserA.id,
            expenseDate: new Date(),
            title: 'Original Title',
            amount: new Prisma.Decimal(9999), // Changed amount!
          });
        },
        (err) => err instanceof FinancialInvariantViolationError && err.message.includes('Idempotency key')
      );
    });

    // 19. Same key + different allocationId -> REJECT
    await st.test('19. Same key + different allocationId -> REJECT', async () => {
      const key = `mismatch_alloc_${Date.now()}`;
      await ProjectBudgetService.recordExpense({
        idempotencyKey: key,
        allocationId: allocA1.id,
        requestedByUserId: teacherUserA.id,
        expenseDate: new Date(),
        title: 'Original Title',
        amount: new Prisma.Decimal(4000),
      });

      await assert.rejects(
        async () => {
          await ProjectBudgetService.recordExpense({
            idempotencyKey: key,
            allocationId: allocA2.id, // Changed allocationId!
            requestedByUserId: teacherUserA.id,
            expenseDate: new Date(),
            title: 'Original Title',
            amount: new Prisma.Decimal(4000),
          });
        },
        (err) => err instanceof FinancialInvariantViolationError
      );
    });

    // 20. Same key + different title -> REJECT
    await st.test('20. Same key + different title -> REJECT', async () => {
      const key = `mismatch_title_${Date.now()}`;
      await ProjectBudgetService.recordExpense({
        idempotencyKey: key,
        allocationId: allocA1.id,
        requestedByUserId: teacherUserA.id,
        expenseDate: new Date(),
        title: 'Original Title A',
        amount: new Prisma.Decimal(4000),
      });

      await assert.rejects(
        async () => {
          await ProjectBudgetService.recordExpense({
            idempotencyKey: key,
            allocationId: allocA1.id,
            requestedByUserId: teacherUserA.id,
            expenseDate: new Date(),
            title: 'Tampered Title B', // Changed title!
            amount: new Prisma.Decimal(4000),
          });
        },
        (err) => err instanceof FinancialInvariantViolationError
      );
    });

    // 20B. Same key + different actorUserId -> REJECT (Cross-user idempotency key theft blocked)
    await st.test('20B. Same key replayed by different actorUserId -> REJECT', async () => {
      const key = `mismatch_actor_${Date.now()}`;
      await ProjectBudgetService.recordExpense({
        idempotencyKey: key,
        allocationId: allocA1.id,
        requestedByUserId: teacherUserA.id,
        expenseDate: new Date(),
        title: 'Original by Teacher A',
        amount: new Prisma.Decimal(4000),
      });

      await assert.rejects(
        async () => {
          await ProjectBudgetService.recordExpense({
            idempotencyKey: key,
            allocationId: allocA1.id,
            requestedByUserId: teacherUserB.id, // Teacher B trying to reuse Teacher A's key!
            expenseDate: new Date(),
            title: 'Original by Teacher A',
            amount: new Prisma.Decimal(4000),
          });
        },
        (err) => err instanceof FinancialInvariantViolationError && err.message.includes('Idempotency key ถูกใช้งานโดยผู้ใช้อื่น')
      );
    });
  });

  // ==========================================
  // 🛡️ P0-5: RECORD EXPENSE STATUS SEPARATION
  // ==========================================
  await t.test('P0-5: recordExpense Status Separation & Two-step Approval', async (st) => {
    // 21. recordExpense always creates as SUBMITTED
    let exp;
    await st.test('21. recordExpense creates with status SUBMITTED', async () => {
      exp = await ProjectBudgetService.recordExpense({
        idempotencyKey: `sep_exp_${Date.now()}`,
        allocationId: allocA1.id,
        requestedByUserId: teacherUserA.id,
        expenseDate: new Date(),
        title: 'รายการทดสอบแยกสถานะ',
        amount: new Prisma.Decimal(2500),
      });

      assert.equal(exp.status, 'SUBMITTED');
    });

    // 22. approveExpense moves status to APPROVED
    await st.test('22. approveExpense transitions status from SUBMITTED to APPROVED', async () => {
      const approved = await ProjectBudgetService.approveExpense(exp.id, adminUser.id);
      assert.equal(approved.status, 'APPROVED');
      assert.equal(approved.approvedByUserId, adminUser.id);
      assert.ok(approved.approvedAt);
    });
  });

  // ==========================================
  // 🛡️ P0-6: BUDGET SOURCE CEILING CONCURRENCY
  // ==========================================
  await t.test('P0-6: BudgetSource Ceiling with Concurrency Lock', async (st) => {
    // 23. createProject exceeding BudgetSource ceiling -> REJECT
    await st.test('23. createProject exceeding BudgetSource ceiling -> REJECT', async () => {
      // Source totalPlanned is 1,000,000. Project A (300k) + Project B (200k) + Match (50k) = 550k allocated. Remaining = 450k.
      await assert.rejects(
        async () => {
          await ProjectBudgetService.createProject({
            fiscalYearId: activeFy.id,
            budgetSourceId: budgetSource.id,
            leaderUserId: teacherUserA.id,
            code: `PRJ-OVER-${Date.now()}`,
            name: 'โครงการงบเกินเพดานแหล่งเงิน',
            targetAcademicYear: 2600,
            allocatedAmount: new Prisma.Decimal(500000), // 550k + 500k = 1.05M > 1M ceiling
            actorUserId: adminUser.id,
          });
        },
        (err) => err instanceof FinancialInvariantViolationError && err.message.includes('เกินงบประมาณแหล่งเงิน')
      );
    });

    // 24. Concurrent createProject summing over ceiling -> exactly 1 succeeds
    await st.test('24. Concurrent createProjects exceeding ceiling -> Only 1 succeeds', async () => {
      const p1 = ProjectBudgetService.createProject({
        fiscalYearId: activeFy.id,
        budgetSourceId: budgetSource.id,
        leaderUserId: teacherUserA.id,
        code: `PRJ-CONC-1-${Date.now()}`,
        name: 'โครงการแข่งขัน 1 (ขอ 300k)',
        targetAcademicYear: 2600,
        allocatedAmount: new Prisma.Decimal(300000),
        actorUserId: adminUser.id,
      });

      const p2 = ProjectBudgetService.createProject({
        fiscalYearId: activeFy.id,
        budgetSourceId: budgetSource.id,
        leaderUserId: teacherUserB.id,
        code: `PRJ-CONC-2-${Date.now()}`,
        name: 'โครงการแข่งขัน 2 (ขอ 300k)',
        targetAcademicYear: 2600,
        allocatedAmount: new Prisma.Decimal(300000),
        actorUserId: adminUser.id,
      });

      const results = await Promise.allSettled([p1, p2]);
      const successful = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      assert.equal(successful.length, 1, 'Exactly 1 project can be created within remaining ceiling');
      assert.equal(rejected.length, 1, 'The competing project must be rejected');
    });
  });

  // ==========================================
  // 🛡️ P0-7: DEPOSIT IDEMPOTENCY
  // ==========================================
  await t.test('P0-7: Deposit Idempotency & Mismatch Rejection', async (st) => {
    const key = `dep_idem_${Date.now()}`;
    const receivedDate = new Date();

    // 25. Deposit with idempotencyKey -> OK
    let receipt;
    await st.test('25. Deposit with idempotencyKey -> OK', async () => {
      receipt = await ProjectBudgetService.confirmTrancheDeposit({
        idempotencyKey: key,
        budgetTrancheId: tranche2.id,
        amount: new Prisma.Decimal(10000),
        receivedDate,
        documentRef: 'ศธ 1111/TEST',
        confirmedByUserId: adminUser.id,
      });
      assert.ok(receipt.id);
    });

    // 26. Replay same key & payload -> returns same receipt
    await st.test('26. Same deposit key replay -> returns existing record', async () => {
      const replay = await ProjectBudgetService.confirmTrancheDeposit({
        idempotencyKey: key,
        budgetTrancheId: tranche2.id,
        amount: new Prisma.Decimal(10000),
        receivedDate,
        documentRef: 'ศธ 1111/TEST',
        confirmedByUserId: adminUser.id,
      });
      assert.equal(replay.id, receipt.id);
    });

    // 27. Same deposit key + different amount -> REJECT
    await st.test('27. Same deposit key + different amount -> REJECT', async () => {
      await assert.rejects(
        async () => {
          await ProjectBudgetService.confirmTrancheDeposit({
            idempotencyKey: key,
            budgetTrancheId: tranche2.id,
            amount: new Prisma.Decimal(99999), // Changed amount!
            receivedDate,
            documentRef: 'ศธ 1111/TEST',
            confirmedByUserId: adminUser.id,
          });
        },
        (err) => err instanceof FinancialInvariantViolationError
      );
    });

    // 28. Same deposit key + different documentRef -> REJECT
    await st.test('28. Same deposit key + different documentRef -> REJECT', async () => {
      await assert.rejects(
        async () => {
          await ProjectBudgetService.confirmTrancheDeposit({
            idempotencyKey: key,
            budgetTrancheId: tranche2.id,
            amount: new Prisma.Decimal(10000),
            receivedDate,
            documentRef: 'ศธ 9999/TAMPERED', // Changed doc ref!
            confirmedByUserId: adminUser.id,
          });
        },
        (err) => err instanceof FinancialInvariantViolationError
      );
    });
  });

  // ==========================================
  // 🛡️ P0-8: STATE TRANSITION MATRIX
  // ==========================================
  await t.test('P0-8: State Transition Machine Validation', async (st) => {
    // 29. SUBMITTED -> APPROVED -> OK (verified above)
    // 30. APPROVED -> REVERSED -> OK
    let testExp;
    await st.test('30. APPROVED -> REVERSED -> OK', async () => {
      testExp = await ProjectBudgetService.recordExpense({
        idempotencyKey: `state_rev_${Date.now()}`,
        allocationId: allocA1.id,
        requestedByUserId: teacherUserA.id,
        expenseDate: new Date(),
        title: 'รายการทดสอบ State Machine',
        amount: new Prisma.Decimal(1500),
      });
      await ProjectBudgetService.approveExpense(testExp.id, adminUser.id);

      const reversal = await ProjectBudgetService.reverseApprovedExpense({
        originalExpenseId: testExp.id,
        reason: 'ยกเลิกรายการเบิกจ่าย',
        cancelledByUserId: adminUser.id,
        approvedByUserId: adminUser.id,
      });
      assert.ok(reversal.id);
    });

    // 31. Double Reversal -> REJECT
    await st.test('31. Double reversal -> REJECT', async () => {
      await assert.rejects(
        async () => {
          await ProjectBudgetService.reverseApprovedExpense({
            originalExpenseId: testExp.id,
            reason: 'ยกเลิกซ้ำอีกครั้ง',
            cancelledByUserId: adminUser.id,
            approvedByUserId: adminUser.id,
          });
        },
        (err) => err instanceof FinancialInvariantViolationError
      );
    });

    // 32. Reverse a SUBMITTED (non-APPROVED) expense -> REJECT
    await st.test('32. Reverse non-APPROVED expense -> REJECT', async () => {
      const submittedExp = await ProjectBudgetService.recordExpense({
        idempotencyKey: `state_sub_${Date.now()}`,
        allocationId: allocA1.id,
        requestedByUserId: teacherUserA.id,
        expenseDate: new Date(),
        title: 'รายการรออนุมัติที่ยังไม่ได้รับอนุมัติ',
        amount: new Prisma.Decimal(1200),
      });

      await assert.rejects(
        async () => {
          await ProjectBudgetService.reverseApprovedExpense({
            originalExpenseId: submittedExp.id,
            reason: 'พยายามยกเลิกรายการที่ยังไม่อนุมัติ',
            cancelledByUserId: adminUser.id,
            approvedByUserId: adminUser.id,
          });
        },
        (err) => err instanceof FinancialInvariantViolationError
      );
    });
  });

  // ==========================================
  // 🛡️ P0-9: REVERSAL INTEGRITY & CANONICAL FORMULA
  // ==========================================
  await t.test('P0-9: Reversal Integrity & Canonical Net Spent Calculation', async (st) => {
    // 33. Pure function test
    await st.test('33. Pure calculateNetSpent accurately computes (Gross - Reversals)', async () => {
      const expenses = [
        { amount: new Prisma.Decimal(10000), status: 'APPROVED' },
        { amount: new Prisma.Decimal(5000), status: 'REVERSED' },
        { amount: new Prisma.Decimal(3000), status: 'SUBMITTED' }, // Must not be counted
        { amount: new Prisma.Decimal(2000), status: 'REJECTED' },  // Must not be counted
      ];

      const reversals = [
        { amount: new Prisma.Decimal(5000), status: 'APPROVED' },
        { amount: new Prisma.Decimal(1000), status: 'PENDING' },   // Must not be counted
      ];

      // Net = (10,000 + 5,000) - 5,000 = 10,000
      const net = ProjectBudgetService.calculateNetSpent(expenses, reversals);
      assert.equal(net.toString(), '10000');
    });

    // 34. DB Reversal calculation zeroes net spent
    await st.test('34. DB Reversal calculation reflects zero net spent for reversed expense', async () => {
      const netBefore = await ProjectBudgetService.calculateAllocationNetSpentFromDB(prisma, allocA2.id);

      const exp = await ProjectBudgetService.recordExpense({
        idempotencyKey: `calc_rev_${Date.now()}`,
        allocationId: allocA2.id,
        requestedByUserId: teacherUserA.id,
        expenseDate: new Date(),
        title: 'รายการทดสอบ Net Calculation',
        amount: new Prisma.Decimal(7000),
      });
      await ProjectBudgetService.approveExpense(exp.id, adminUser.id);

      const netMid = await ProjectBudgetService.calculateAllocationNetSpentFromDB(prisma, allocA2.id);
      assert.equal(netMid.toString(), netBefore.add(7000).toString());

      await ProjectBudgetService.reverseApprovedExpense({
        originalExpenseId: exp.id,
        reason: 'ยกเลิกรายการคืนงบ',
        cancelledByUserId: adminUser.id,
        approvedByUserId: adminUser.id,
      });

      const netAfter = await ProjectBudgetService.calculateAllocationNetSpentFromDB(prisma, allocA2.id);
      assert.equal(netAfter.toString(), netBefore.toString(), 'Net spent after full reversal must equal initial amount');
    });
  });

  // ==========================================
  // 🛡️ P0-10: ROLLBACK INTEGRITY & AUDIT ATOMICITY
  // ==========================================
  await t.test('P0-10: Rollback Integrity & Audit Atomicity', async (st) => {
    // 35. createProject generates AuditLog with complete before/after values
    await st.test('35. createProject generates AuditLog with actor, action, and values', async () => {
      const prj = await ProjectBudgetService.createProject({
        fiscalYearId: activeFy.id,
        budgetSourceId: budgetSource.id,
        leaderUserId: teacherUserA.id,
        code: `PRJ-AUDIT-${Date.now()}`,
        name: 'โครงการตรวจสอบ Audit',
        targetAcademicYear: 2600,
        allocatedAmount: new Prisma.Decimal(10000),
        actorUserId: adminUser.id,
      });

      const log = await prisma.auditLog.findFirst({
        where: { tableName: 'Project', recordId: prj.id, action: 'CREATE' },
      });

      assert.ok(log);
      assert.equal(log.changedBy, adminUser.id);
      const parsedVal = JSON.parse(log.newValue || '{}');
      assert.equal(parsedVal.code, prj.code);
      assert.equal(parsedVal.allocatedAmount, '10000');
    });

    // 36. Deliberate failure leaves NO partial records and NO orphan AuditLog
    await st.test('36. Deliberate Layer 4 breach aborts transaction cleanly without orphan audit logs', async () => {
      const auditCountBefore = await prisma.auditLog.count();
      const expenseCountBefore = await prisma.activityExpense.count();

      // Attempt recording an expense that exceeds Layer 4 ceiling via approve
      const exp = await ProjectBudgetService.recordExpense({
        idempotencyKey: `rollback_audit_${Date.now()}`,
        allocationId: allocA1.id,
        requestedByUserId: teacherUserA.id,
        expenseDate: new Date(),
        title: 'รายการยอดเกินเพดาน',
        amount: new Prisma.Decimal(999999), // Huge amount exceeding allocation
      });

      await assert.rejects(
        async () => {
          await ProjectBudgetService.approveExpense(exp.id, adminUser.id);
        },
        (err) => err instanceof FinancialInvariantViolationError
      );

      // Verify status of expense remains SUBMITTED (not approved)
      const check = await prisma.activityExpense.findUniqueOrThrow({ where: { id: exp.id } });
      assert.equal(check.status, 'SUBMITTED');

      // Verify no orphan APPROVE audit log was written
      const approveLog = await prisma.auditLog.findFirst({
        where: { recordId: exp.id, action: 'APPROVE' },
      });
      assert.equal(approveLog, null, 'No approve audit log must exist after rollback');
    });

    // 37. Closed FiscalYear rejects all mutations cleanly
    await st.test('37. Closed FiscalYear rejects createProject without writing AuditLog', async () => {
      const auditCountBefore = await prisma.auditLog.count();

      await assert.rejects(
        async () => {
          await ProjectBudgetService.createProject({
            fiscalYearId: closedFy.id,
            budgetSourceId: closedFy.budgetSources[0].id,
            leaderUserId: teacherUserA.id,
            code: `PRJ-CLOSED-${Date.now()}`,
            name: 'โครงการในปีที่ปิด',
            targetAcademicYear: 2601,
            allocatedAmount: new Prisma.Decimal(10000),
            actorUserId: adminUser.id,
          });
        },
        (err) => err instanceof FinancialInvariantViolationError
      );

      const auditCountAfter = await prisma.auditLog.count();
      assert.equal(auditCountAfter, auditCountBefore, 'No audit logs written when transaction fails');
    });
  });

  // Cleanup
  await pool.end();
});
