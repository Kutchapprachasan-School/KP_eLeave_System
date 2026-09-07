import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_mHKSdpe5IM7i@ep-fancy-pine-aom5dqmg-pooler.c-2.ap-southeast-1.aws.neon.tech/e-Leave?sslmode=require";

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

test('Budget Schema Integrity - all 13 models are defined on Prisma Client', async () => {
  assert.ok(prisma.fiscalYear, 'FiscalYear model must exist on prisma client');
  assert.ok(prisma.budgetSource, 'BudgetSource model must exist on prisma client');
  assert.ok(prisma.budgetTranche, 'BudgetTranche model must exist on prisma client');
  assert.ok(prisma.budgetReceipt, 'BudgetReceipt model must exist on prisma client');
  assert.ok(prisma.project, 'Project model must exist on prisma client');
  assert.ok(prisma.projectActivity, 'ProjectActivity model must exist on prisma client');
  assert.ok(prisma.activityTrancheAllocation, 'ActivityTrancheAllocation model must exist on prisma client');
  assert.ok(prisma.activityExpense, 'ActivityExpense model must exist on prisma client');
  assert.ok(prisma.expenseReversal, 'ExpenseReversal model must exist on prisma client');
  assert.ok(prisma.budgetTransfer, 'BudgetTransfer model must exist on prisma client');
  assert.ok(prisma.auditLog, 'AuditLog model must exist on prisma client');
  assert.ok(prisma.projectAttachment, 'ProjectAttachment model must exist on prisma client');
  assert.ok(prisma.expenseAttachment, 'ExpenseAttachment model must exist on prisma client');
});

test('Budget Schema Integrity - database query against FiscalYear and Tranche returns successfully', async () => {
  const fiscalYears = await prisma.fiscalYear.findMany({ take: 1 });
  assert.ok(Array.isArray(fiscalYears), 'Query against FiscalYear table should succeed');

  const tranches = await prisma.budgetTranche.findMany({ take: 1 });
  assert.ok(Array.isArray(tranches), 'Query against BudgetTranche table should succeed');

  const allocations = await prisma.activityTrancheAllocation.findMany({ take: 1 });
  assert.ok(Array.isArray(allocations), 'Query against ActivityTrancheAllocation table should succeed');

  const expenses = await prisma.activityExpense.findMany({ take: 1 });
  assert.ok(Array.isArray(expenses), 'Query against ActivityExpense table should succeed');
});

test('Budget Schema Integrity - all 5 financial CHECK constraints exist in PostgreSQL', async () => {
  const res = await pool.query(`
    SELECT conname 
    FROM pg_constraint 
    WHERE conname IN (
      'chk_receipt_positive',
      'chk_alloc_positive',
      'chk_expense_positive',
      'chk_reversal_positive',
      'chk_transfer_positive'
    )
    ORDER BY conname;
  `);
  const constraints = res.rows.map(r => r.conname);
  assert.equal(constraints.length, 5, 'Expected all 5 positive amount check constraints to exist');
});

test('Budget Schema Integrity - explicit unique indexes exist in PostgreSQL', async () => {
  try {
    const res = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND indexname IN (
          'uk_fiscal_year_year',
          'uk_budget_source_fy_code',
          'uk_tranche_src_no',
          'uk_project_fy_code',
          'uk_activity_project_no',
          'uk_alloc_activity_tranche',
          'uk_expense_idempotency',
          'uk_reversal_original_expense',
          'uk_receipt_idempotency'
        )
      ORDER BY indexname;
    `);
    const indexes = res.rows.map(r => r.indexname);
    assert.equal(indexes.length, 9, 'Expected all 9 explicit unique indexes to exist');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
});
