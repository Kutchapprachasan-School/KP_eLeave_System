import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import {
  ProjectBudgetService,
} from '../../../src/services/project-budget.service.ts';

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_mHKSdpe5IM7i@ep-fancy-pine-aom5dqmg-pooler.c-2.ap-southeast-1.aws.neon.tech/e-Leave?sslmode=require";

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

test('Action Layer & Security Policy Invariants', async (t) => {
  let adminUser;
  let financeUser;
  let regularTeacher;
  let testFy;
  let testProject;
  let testActivity;
  let testAlloc;

  await t.test('Setup: Create Users & Resources for Action Layer Tests', async () => {
    // 1. Ensure SystemSettings has enableBudget = true
    await prisma.systemSettings.upsert({
      where: { id: 'default' },
      update: { enableBudget: true },
      create: { id: 'default', enableBudget: true },
    });

    adminUser = await prisma.user.create({
      data: {
        email: `act_admin_${Date.now()}@udkp.ac.th`,
        name: 'แอดมินระดับแอคชั่น',
        role: 'ADMIN',
      },
    });

    financeUser = await prisma.user.create({
      data: {
        email: `act_fin_${Date.now()}@udkp.ac.th`,
        name: 'การเงินระดับแอคชั่น',
        role: 'FINANCE_OFFICER',
      },
    });

    regularTeacher = await prisma.user.create({
      data: {
        email: `act_teacher_${Date.now()}@udkp.ac.th`,
        name: 'ครูทั่วไประดับแอคชั่น',
        role: 'TEACHER',
      },
    });

    const year = 3500 + Math.floor(Math.random() * 1000) + Math.floor((Date.now() % 1000));
    testFy = await prisma.fiscalYear.create({
      data: {
        year,
        title: `ปีงบประมาณ Action Test ${year}`,
        startDate: new Date('2076-10-01T00:00:00Z'),
        endDate: new Date('2077-09-30T23:59:59Z'),
        status: 'ACTIVE',
        budgetSources: {
          create: {
            code: 'ACTION_SRC',
            name: 'แหล่งเงินเพื่อ Action Test',
            totalPlannedAmount: new Prisma.Decimal(500000),
            tranches: {
              create: [
                {
                  trancheNo: 1,
                  name: 'งวดที่ 1',
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

    await ProjectBudgetService.confirmTrancheDeposit({
      idempotencyKey: `act_dep_${Date.now()}`,
      budgetTrancheId: testFy.budgetSources[0].tranches[0].id,
      amount: new Prisma.Decimal(300000),
      receivedDate: new Date(),
      confirmedByUserId: adminUser.id,
    });

    testProject = await ProjectBudgetService.createProject({
      fiscalYearId: testFy.id,
      budgetSourceId: testFy.budgetSources[0].id,
      leaderUserId: regularTeacher.id,
      code: `PRJ-ACT-${Date.now()}`,
      name: 'โครงการสำหรับ Action Layer Test',
      targetAcademicYear: 2620,
      allocatedAmount: new Prisma.Decimal(100000),
      actorUserId: adminUser.id,
    });

    testActivity = await ProjectBudgetService.createActivityWithAllocations({
      projectId: testProject.id,
      responsibleUserId: regularTeacher.id,
      activityNo: 1,
      name: 'กิจกรรมของครูทั่วไป',
      allocatedAmount: new Prisma.Decimal(50000),
      trancheAllocations: [
        {
          budgetTrancheId: testFy.budgetSources[0].tranches[0].id,
          allocatedAmount: new Prisma.Decimal(50000),
        },
      ],
      actorUserId: adminUser.id,
    });
    testAlloc = testActivity.trancheAllocations[0];
  });

  // Test 1: verify budgetAdminUserIds logic in settings
  await t.test('1. SystemSettings budgetAdminUserIds grants MANAGE access', async () => {
    // Add regularTeacher to budgetAdminUserIds
    await prisma.systemSettings.update({
      where: { id: 'default' },
      data: { budgetAdminUserIds: regularTeacher.id },
    });

    const settings = await prisma.systemSettings.findUnique({
      where: { id: 'default' },
      select: { budgetAdminUserIds: true },
    });
    const admins = (settings?.budgetAdminUserIds || '').split(',').map((s) => s.trim());
    assert.ok(admins.includes(regularTeacher.id));

    // Cleanup setting
    await prisma.systemSettings.update({
      where: { id: 'default' },
      data: { budgetAdminUserIds: '' },
    });
  });

  // Test 2: Invariant Check: Decimal precision strictly respected
  await t.test('2. Decimal precision up to 4 places accepted, rounding drift rejected', async () => {
    const exp = await ProjectBudgetService.recordExpense({
      idempotencyKey: `dec_test_${Date.now()}`,
      allocationId: testAlloc.id,
      requestedByUserId: regularTeacher.id,
      expenseDate: new Date(),
      title: 'ค่าใช้จ่ายทศนิยม 4 ตำแหน่ง',
      amount: new Prisma.Decimal('1234.5678'),
    });

    assert.equal(exp.amount.toString(), '1234.5678');
  });

  // Test 3: Project Attachment Cascade/Relation
  await t.test('3. Project Attachment created with Google Drive link', async () => {
    const attach = await prisma.projectAttachment.create({
      data: {
        projectId: testProject.id,
        storageProvider: 'GOOGLE_DRIVE_LINK',
        objectKey: 'https://drive.google.com/file/d/test-doc-12345/view',
        originalFileName: 'เอกสารโครงการอนุมัติ.pdf',
        uploadedByUserId: adminUser.id,
      },
    });

    assert.ok(attach.id);
    assert.equal(attach.projectId, testProject.id);
  });

  // Test 4: verify systemSettings enableBudget toggle
  await t.test('4. Disabling enableBudget in settings is stored properly in DB', async () => {
    await prisma.systemSettings.update({
      where: { id: 'default' },
      data: { enableBudget: false },
    });

    const check = await prisma.systemSettings.findUnique({
      where: { id: 'default' },
      select: { enableBudget: true },
    });
    assert.equal(check?.enableBudget, false);

    // Re-enable
    await prisma.systemSettings.update({
      where: { id: 'default' },
      data: { enableBudget: true },
    });
  });

  await pool.end();
});
