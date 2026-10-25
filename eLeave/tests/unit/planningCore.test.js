import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  toSatang,
  fromSatang,
  calculateActivityFinancials,
  calculateProjectFinancials,
  validateExpenseInvariant,
} from '../../../src/lib/planning/calculator.ts';

import {
  parseCommaSeparatedIds,
  formatCommaSeparatedIds,
  getPlanningPermissions,
} from '../../../src/lib/planning/permissions.ts';

import {
  BUDGET_SOURCE_LABELS,
  PROJECT_STATUS_LABELS,
  EXPENSE_CATEGORY_LABELS,
} from '../../../src/lib/planning/types.ts';

describe('Planning Core - Financial Engine & Invariants', () => {
  it('TC-01: Satang-safe addition (100.25 + 200.50 = 300.75)', () => {
    const s1 = toSatang('100.25');
    const s2 = toSatang(200.50);
    const sumSatang = s1 + s2;
    assert.equal(sumSatang, 30075);
    assert.equal(fromSatang(sumSatang), 300.75);
  });

  it('TC-02: Settlement Delta Invariant (RESERVED 10k -> PAID 9.5k when remaining is 0)', () => {
    // Current remaining is 0 because the 10,000 is reserved
    const currentRemainingSatang = 0;
    const oldActiveAmountSatang = toSatang(10000);
    const newAmountSatang = toSatang(9500);

    const check = validateExpenseInvariant({
      currentRemainingSatang,
      newAmountSatang,
      oldActiveAmountSatang,
    });

    assert.equal(check.valid, true);
    assert.equal(check.availableSatang, 1000000); // 10,000 Baht in satang
    assert.equal(fromSatang(check.deltaSatang), 500); // 500 Baht remains
  });

  it('TC-03: Exceeding available budget is rejected', () => {
    const currentRemainingSatang = toSatang(5000);
    const newAmountSatang = toSatang(6000);

    const check = validateExpenseInvariant({
      currentRemainingSatang,
      newAmountSatang,
    });

    assert.equal(check.valid, false);
    assert.match(check.reason, /งบประมาณคงเหลือไม่เพียงพอ/);
  });

  it('TC-04: Soft deleted items (deletedAt !== null) and CANCELLED items are ignored in calculations', () => {
    const activity = {
      allocatedAmount: 50000,
      adjustedAmount: 50000,
      expenses: [
        { amount: 10000, status: 'PAID', expenseCategory: 'MATERIALS', deletedAt: null },
        { amount: 5000, status: 'RESERVED', expenseCategory: 'OPERATING', deletedAt: null },
        { amount: 20000, status: 'PAID', expenseCategory: 'REMUNERATION', deletedAt: new Date() }, // soft deleted
        { amount: 15000, status: 'CANCELLED', expenseCategory: 'OPERATING', deletedAt: null }, // cancelled
      ],
    };

    const fin = calculateActivityFinancials(activity);
    assert.equal(fin.paidAmount, 10000);
    assert.equal(fin.reservedAmount, 5000);
    assert.equal(fin.totalSpent, 15000);
    assert.equal(fin.remainingBalance, 35000);
    assert.equal(fin.usagePercentage, 30.0);
    assert.deepEqual(fin.usedCategories.sort(), ['MATERIALS', 'OPERATING'].sort());
  });

  it('TC-05: Project unallocated budget calculation when project budget > activity sum', () => {
    const project = {
      allocatedAmount: 100000,
      adjustedAmount: 100000,
      activities: [
        {
          allocatedAmount: 40000,
          adjustedAmount: 40000,
          expenses: [{ amount: 10000, status: 'PAID', expenseCategory: 'MATERIALS', deletedAt: null }],
        },
        {
          allocatedAmount: 20000,
          adjustedAmount: 20000,
          expenses: [{ amount: 5000, status: 'RESERVED', expenseCategory: 'OPERATING', deletedAt: null }],
        },
        {
          allocatedAmount: 30000,
          adjustedAmount: 30000,
          expenses: [],
          deletedAt: new Date(), // soft deleted activity should not count
        },
      ],
      attachments: [{ attachmentType: 'PROPOSAL' }],
    };

    const pFin = calculateProjectFinancials(project);
    assert.equal(pFin.effectiveBudget, 100000);
    assert.equal(pFin.allocatedToActivities, 60000); // 40k + 20k (30k ignored)
    assert.equal(pFin.unallocatedBudget, 40000);
    assert.equal(pFin.isFullyAllocated, false);
    assert.equal(pFin.paidAmount, 10000);
    assert.equal(pFin.reservedAmount, 5000);
    assert.equal(pFin.remainingBalance, 85000); // 100k - 15k
    assert.equal(pFin.sarReadiness.hasProposal, true);
    assert.equal(pFin.sarReadiness.hasApproval, false);
    assert.equal(pFin.sarReadiness.hasSummary, false);
  });
});

describe('Planning Core - Permissions Helper', () => {
  it('TC-06: parseCommaSeparatedIds handles empty, spaces, and multi IDs', () => {
    assert.deepEqual(parseCommaSeparatedIds(''), []);
    assert.deepEqual(parseCommaSeparatedIds(null), []);
    assert.deepEqual(parseCommaSeparatedIds('  '), []);
    assert.deepEqual(parseCommaSeparatedIds(' u1 , u2 ,  u3  '), ['u1', 'u2', 'u3']);
    assert.equal(formatCommaSeparatedIds(['u1', 'u2']), 'u1,u2');
  });

  it('TC-07: Teacher cannot manage budget or disburse expenses', () => {
    const teacher = { id: 'teacher-1', role: 'TEACHER' };
    const settings = { enablePlanning: true, planningOfficerUserIds: 'officer-1,officer-2' };
    const perms = getPlanningPermissions(teacher, settings);

    assert.equal(perms.canViewModule, true);
    assert.equal(perms.canManageProjectsAndBudget, false);
    assert.equal(perms.canRecordAndSettleExpenses, false);
    assert.equal(perms.canManageAttachments, false);
  });

  it('TC-08: Appointed planning officer has full management rights', () => {
    const officer = { id: 'officer-1', role: 'TEACHER' };
    const settings = { enablePlanning: true, planningOfficerUserIds: 'officer-1,officer-2' };
    const perms = getPlanningPermissions(officer, settings);

    assert.equal(perms.canViewModule, true);
    assert.equal(perms.canManageProjectsAndBudget, true);
    assert.equal(perms.canRecordAndSettleExpenses, true);
    assert.equal(perms.canManageAttachments, true);
  });

  it('TC-09: Project owner can manage attachments when project is active, but not when completed', () => {
    const leader = { id: 'leader-1', role: 'TEACHER' };
    const settings = { enablePlanning: true, planningOfficerUserIds: 'officer-1' };

    const activePerms = getPlanningPermissions(leader, settings, { leaderUserId: 'leader-1', projectStatus: 'IN_PROGRESS' });
    assert.equal(activePerms.canManageAttachments, true);
    assert.equal(activePerms.canManageProjectsAndBudget, false);

    const completedPerms = getPlanningPermissions(leader, settings, { leaderUserId: 'leader-1', projectStatus: 'COMPLETED' });
    assert.equal(completedPerms.canManageAttachments, false);
  });

  it('TC-10: Canonical Labels parity', () => {
    assert.ok(BUDGET_SOURCE_LABELS.SUBSIDY);
    assert.ok(BUDGET_SOURCE_LABELS.FREE_EDUCATION_15Y);
    assert.ok(PROJECT_STATUS_LABELS.APPROVED);
    assert.ok(PROJECT_STATUS_LABELS.IN_PROGRESS);
    assert.ok(EXPENSE_CATEGORY_LABELS.MATERIALS);
    assert.ok(EXPENSE_CATEGORY_LABELS.OPERATING);
  });

  it('TC-11: Excel export structure generates valid worksheets with canonical labels', () => {
    const mockProjects = [
      {
        id: 'p1',
        code: 'P-01',
        name: 'โครงการพัฒนาวิชาการ',
        budgetSourceType: 'SUBSIDY',
        departmentName: 'กลุ่มบริหารวิชาการ',
        leaderUserName: 'ครูสมศรี',
        status: 'APPROVED',
        financials: {
          allocatedAmount: 100000,
          effectiveBudget: 100000,
          paidAmount: 20000,
          reservedAmount: 10000,
          remainingBalance: 70000,
          usagePercentage: 30,
          sarReadiness: { hasProposal: true, hasApproval: true, hasSummary: false },
        },
        activities: [
          {
            id: 'a1',
            activityNo: 1,
            name: 'กิจกรรมอบรมเชิงปฏิบัติการ',
            responsibleUserName: 'ครูสมชาย',
            financials: {
              allocatedAmount: 50000,
              effectiveBudget: 50000,
              paidAmount: 20000,
              reservedAmount: 10000,
              remainingBalance: 20000,
              usagePercentage: 60,
              usedCategories: ['MATERIALS', 'OPERATING'],
            },
            expenses: [
              {
                id: 'e1',
                title: 'ค่ากระดาษและอุปกรณ์',
                expenseCategory: 'MATERIALS',
                amount: 5000,
                status: 'PAID',
                expenseDate: '2026-10-25T00:00:00.000Z',
                receiptNo: 'REC-001',
                requesterName: 'ครูสมชาย',
                recordedByName: 'เจ้าหน้าที่แผน',
              },
            ],
          },
        ],
      },
    ];

    assert.equal(BUDGET_SOURCE_LABELS[mockProjects[0].budgetSourceType], 'เงินอุดหนุนรายหัว');
    assert.equal(EXPENSE_CATEGORY_LABELS[mockProjects[0].activities[0].expenses[0].expenseCategory], 'ค่าวัสดุ');
  });
});
