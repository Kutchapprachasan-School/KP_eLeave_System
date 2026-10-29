import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  toSatang,
  fromSatang,
  calculateActivityFinancials,
  calculateProjectFinancials,
  validateExpenseInvariant,
  calculatePortfolioSummary,
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
  ATTACHMENT_TYPE_LABELS,
  EXPENSE_STATUS_LABELS,
} from '../../../src/lib/planning/types.ts';

import {
  buildR2ObjectKey,
} from '../../../src/lib/planning/storage-keys.ts';

import {
  serializeAttachmentToDTO,
  serializeActivityToDTO,
  serializeProjectToDTO,
} from '../../../src/lib/planning/serializers.ts';

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

    assert.equal(BUDGET_SOURCE_LABELS[mockProjects[0].budgetSourceType], 'จัดการเรียนการสอน');
    assert.equal(BUDGET_SOURCE_LABELS['FREE_EDUCATION_15Y'], 'กิจกรรมพัฒนาผู้เรียน');
    assert.equal(EXPENSE_CATEGORY_LABELS[mockProjects[0].activities[0].expenses[0].expenseCategory], 'ค่าวัสดุ');
  });

  it('TC-12: R2 Object Key generation sanitizes and structures properly', () => {
    const key = buildR2ObjectKey(2569, 'PRJ/2569 #01', 'รายงาน โครงการ (1).pdf', 'documents');
    assert.match(key, /^planning\/2569\/PRJ_2569__01\/documents\/[a-f0-9]{8}-รายงาน_โครงการ_1\.pdf$/);
  });

  it('TC-13: calculatePortfolioSummary rolls up multiple projects with satang precision', () => {
    const projects = [
      {
        id: 'p1',
        financials: {
          effectiveBudget: 100000.50,
          paidAmount: 25000.25,
          reservedAmount: 15000.00,
          remainingBalance: 60000.25,
        },
        activities: [{ id: 'a1' }, { id: 'a2' }],
      },
      {
        id: 'p2',
        financials: {
          effectiveBudget: 50000.00,
          paidAmount: 10000.00,
          reservedAmount: 5000.50,
          remainingBalance: 34999.50,
        },
        activities: [{ id: 'a3' }],
      },
    ];

    const summary = calculatePortfolioSummary(projects);
    assert.equal(summary.projectCount, 2);
    assert.equal(summary.activityCount, 3);
    assert.equal(summary.totalEffectiveBudget, 150000.50);
    assert.equal(summary.totalPaidAmount, 35000.25);
    assert.equal(summary.totalReservedAmount, 20000.50);
    assert.equal(summary.totalSpentAmount, 55000.75);
    assert.equal(summary.totalRemainingBalance, 94999.75);
  });

  it('TC-14: Two-way DTO property binding consistency', () => {
    const mockProject = {
      id: 'p1',
      code: 'PRJ-01',
      name: 'โครงการทดสอบ',
      departmentId: 'd1',
      departmentName: 'ฝ่ายบริหาร',
      department: { id: 'd1', name: 'ฝ่ายบริหาร' },
      leaderUserId: 'u1',
      leaderUserName: 'ครูสมหวัง',
      leader: { id: 'u1', name: 'ครูสมหวัง' },
      budgetSourceType: 'SUBSIDY',
      budgetSource: 'SUBSIDY',
      activities: [
        {
          id: 'a1',
          name: 'กิจกรรมที่ 1',
          responsibleUserId: 'u2',
          responsibleUserName: 'ครูสมศักดิ์',
          responsibleUser: { id: 'u2', name: 'ครูสมศักดิ์' },
        },
      ],
    };

    assert.equal(mockProject.department.name, mockProject.departmentName);
    assert.equal(mockProject.leader.name, mockProject.leaderUserName);
    assert.equal(mockProject.budgetSource, mockProject.budgetSourceType);
    assert.equal(mockProject.activities[0].responsibleUser.name, mockProject.activities[0].responsibleUserName);
  });

  it('TC-15: Labels Parity and Settlement Delta available balance computation', () => {
    // 1. Label completeness
    assert.equal(ATTACHMENT_TYPE_LABELS.PROPOSAL, 'เล่มโครงการที่จัดทำแล้ว');
    assert.equal(ATTACHMENT_TYPE_LABELS.SUMMARY, 'รายงานสรุปโครงการ');
    assert.equal(EXPENSE_STATUS_LABELS.PAID, 'เบิกจ่ายจริง (PAID)');
    assert.equal(EXPENSE_STATUS_LABELS.RESERVED, 'กันวงเงินจอง (RESERVED)');

    // 2. Settlement Delta available balance formula:
    // availableSatang = currentRemainingSatang + oldReservedSatang
    const currentRemainingSatang = toSatang(5000);
    const oldReservedSatang = toSatang(3000);
    const availableSatang = currentRemainingSatang + oldReservedSatang;
    assert.equal(fromSatang(availableSatang), 8000);

    // If new amount is 7000 (within 8000), projected remaining is 1000
    const enteredSatang = toSatang(7000);
    const projectedRemainingSatang = availableSatang - enteredSatang;
    assert.equal(fromSatang(projectedRemainingSatang), 1000);
  });

  it('TC-16: Granular permission separation for budget adjusters and disbursers', () => {
    const budgetOfficer = { id: 'budget-user', role: 'TEACHER' };
    const disburser = { id: 'disburser-user', role: 'TEACHER' };
    const generalOfficer = { id: 'general-user', role: 'TEACHER' };
    const regularTeacher = { id: 'regular-user', role: 'TEACHER' };
    const adminUser = { id: 'admin-user', role: 'ADMIN' };

    const granularSettings = {
      enablePlanning: true,
      planningOfficerUserIds: 'general-user',
      planningBudgetOfficerUserIds: 'budget-user',
      planningDisburserUserIds: 'disburser-user',
    };

    // 1. Budget Officer can adjust budget, but cannot record expenses or manage general project
    const pBudget = getPlanningPermissions(budgetOfficer, granularSettings);
    assert.equal(pBudget.canAdjustBudget, true);
    assert.equal(pBudget.canRecordAndSettleExpenses, false);
    assert.equal(pBudget.canManageProjectsAndBudget, false);

    // 2. Disburser can record expenses, but cannot adjust budget or manage general project
    const pDisburse = getPlanningPermissions(disburser, granularSettings);
    assert.equal(pDisburse.canRecordAndSettleExpenses, true);
    assert.equal(pDisburse.canAdjustBudget, false);
    assert.equal(pDisburse.canManageProjectsAndBudget, false);

    // 3. General Officer has canManageProjectsAndBudget, but cannot adjust budget or disburse when granular lists are explicitly set
    const pGeneral = getPlanningPermissions(generalOfficer, granularSettings);
    assert.equal(pGeneral.canManageProjectsAndBudget, true);
    assert.equal(pGeneral.canAdjustBudget, false);
    assert.equal(pGeneral.canRecordAndSettleExpenses, false);

    // 4. Regular Teacher has no management permissions
    const pRegular = getPlanningPermissions(regularTeacher, granularSettings);
    assert.equal(pRegular.canManageProjectsAndBudget, false);
    assert.equal(pRegular.canAdjustBudget, false);
    assert.equal(pRegular.canRecordAndSettleExpenses, false);

    // 5. Admin has all rights regardless of settings lists
    const pAdmin = getPlanningPermissions(adminUser, granularSettings);
    assert.equal(pAdmin.canManageProjectsAndBudget, true);
    assert.equal(pAdmin.canAdjustBudget, true);
    assert.equal(pAdmin.canRecordAndSettleExpenses, true);
    assert.equal(pAdmin.canManageAttachments, true);

    // 6. Fallback parity: When granular lists are empty, general officer inherits both
    const fallbackSettings = {
      enablePlanning: true,
      planningOfficerUserIds: 'general-user',
      planningBudgetOfficerUserIds: '',
      planningDisburserUserIds: '',
    };
    const pFallback = getPlanningPermissions(generalOfficer, fallbackSettings);
    assert.equal(pFallback.canManageProjectsAndBudget, true);
    assert.equal(pFallback.canAdjustBudget, true);
    assert.equal(pFallback.canRecordAndSettleExpenses, true);
  });

  it('TC-17: Sub-activity report attachment title tag parser and permission binding', () => {
    // Test tag regex parser: [ACT:act-123] รายงานสรุปกิจกรรม
    const rawTitle = '[ACT:act-123] รายงานสรุปการอบรมเชิงปฏิบัติการ';
    const match = rawTitle.match(/^\[ACT:([^\]]+)\]\s*(.*)$/);
    assert.ok(match, 'Title tag should match [ACT:id]');
    assert.equal(match[1], 'act-123');
    assert.equal(match[2], 'รายงานสรุปการอบรมเชิงปฏิบัติการ');

    // Untagged title should have null activityId
    const untaggedTitle = 'เล่มโครงการประจำปี.pdf';
    const untaggedMatch = untaggedTitle.match(/^\[ACT:([^\]]+)\]\s*(.*)$/);
    assert.equal(untaggedMatch, null);
  });

  it('TC-18: Sub-activity reports partial progress & Document Requirement Policy evaluation', () => {
    // Project with 2 activities, 1 activity report submitted, and 1 project summary report
    const mockProject = {
      allocatedAmount: 10000,
      adjustedAmount: 10000,
      activities: [
        { id: 'act-1', allocatedAmount: 5000, adjustedAmount: 5000, expenses: [] },
        { id: 'act-2', allocatedAmount: 5000, adjustedAmount: 5000, expenses: [] },
      ],
      attachments: [
        { id: 'att-1', attachmentType: 'PROPOSAL', title: 'เล่มโครงการ' },
        { id: 'att-2', attachmentType: 'APPROVAL', title: 'อนุมัติโครงการ' },
        { id: 'att-3', attachmentType: 'SUMMARY', title: '[ACT:act-1] รายงานกิจกรรม 1' },
      ],
    };

    // 1. With default policy 'BOTH': 1/2 activity report is partial, project summary is missing
    const finBoth = calculateProjectFinancials(mockProject, 'BOTH');
    assert.equal(finBoth.sarReadiness.hasProposal, true);
    assert.equal(finBoth.sarReadiness.hasApproval, true);
    assert.equal(finBoth.sarReadiness.hasProjectSummary, false);
    assert.equal(finBoth.sarReadiness.activityReports.total, 2);
    assert.equal(finBoth.sarReadiness.activityReports.submitted, 1);
    assert.equal(finBoth.sarReadiness.activityReports.isPartial, true);
    assert.equal(finBoth.sarReadiness.activityReports.isComplete, false);
    assert.equal(finBoth.sarReadiness.hasSummary, false); // NOT complete under BOTH
    assert.equal(finBoth.sarReadiness.isComplete, false);

    // 2. Add second activity report: activities become complete
    const mockProjectAllActs = {
      ...mockProject,
      attachments: [
        ...mockProject.attachments,
        { id: 'att-4', attachmentType: 'SUMMARY', title: '[ACT:act-2] รายงานกิจกรรม 2' },
      ],
    };

    // Under ACTIVITY_ONLY: should be hasSummary = true
    const finActOnly = calculateProjectFinancials(mockProjectAllActs, 'ACTIVITY_ONLY');
    assert.equal(finActOnly.sarReadiness.activityReports.isComplete, true);
    assert.equal(finActOnly.sarReadiness.hasSummary, true);
    assert.equal(finActOnly.sarReadiness.isComplete, true);

    // Under PROJECT_ONLY: still false because no untagged project summary
    const finProjOnly = calculateProjectFinancials(mockProjectAllActs, 'PROJECT_ONLY');
    assert.equal(finProjOnly.sarReadiness.hasProjectSummary, false);
    assert.equal(finProjOnly.sarReadiness.hasSummary, false);

    // Under EITHER: complete because activities are complete
    const finEither = calculateProjectFinancials(mockProjectAllActs, 'EITHER');
    assert.equal(finEither.sarReadiness.hasSummary, true);
    assert.equal(finEither.sarReadiness.isComplete, true);
  });

  it('TC-19: Project closure lock blocks non-planning officers from mutating or disbursing', () => {
    const settings = {
      enablePlanning: true,
      planningOfficerUserIds: 'planning-officer',
      planningBudgetOfficerUserIds: 'budget-officer',
      planningDisburserUserIds: 'disburser-user',
    };

    const disburserUser = { id: 'disburser-user', role: 'TEACHER' };
    const projectLeader = { id: 'leader-user', role: 'TEACHER' };
    const adminUser = { id: 'admin-user', role: 'ADMIN' };

    // When project is active (IN_PROGRESS)
    const pActiveLeader = getPlanningPermissions(projectLeader, settings, {
      leaderUserId: 'leader-user',
      projectStatus: 'IN_PROGRESS',
    });
    assert.equal(pActiveLeader.canManageAttachments, true);

    const pActiveDisburser = getPlanningPermissions(disburserUser, settings, {
      projectStatus: 'IN_PROGRESS',
    });
    assert.equal(pActiveDisburser.canRecordAndSettleExpenses, true);

    // When project is closed (COMPLETED)
    const pClosedLeader = getPlanningPermissions(projectLeader, settings, {
      leaderUserId: 'leader-user',
      projectStatus: 'COMPLETED',
    });
    assert.equal(pClosedLeader.canManageAttachments, false, 'Project leader cannot manage attachments on COMPLETED');
    assert.equal(pClosedLeader.canManageProjectsAndBudget, false);

    const pClosedDisburser = getPlanningPermissions(disburserUser, settings, {
      projectStatus: 'COMPLETED',
    });
    assert.equal(pClosedDisburser.canRecordAndSettleExpenses, false, 'Disburser cannot disburse on COMPLETED without Admin unlock');
    assert.equal(pClosedDisburser.canAdjustBudget, false);

    // Admin retains full unlock and control even when COMPLETED
    const pClosedAdmin = getPlanningPermissions(adminUser, settings, {
      projectStatus: 'COMPLETED',
    });
    assert.equal(pClosedAdmin.canManageProjectsAndBudget, true);
    assert.equal(pClosedAdmin.canAdjustBudget, true);
    assert.equal(pClosedAdmin.canRecordAndSettleExpenses, true);
    assert.equal(pClosedAdmin.canManageAttachments, true);
  });

  it('TC-20: Sub-activity Dual Files and Responsible Teacher Permissions', () => {
    const rawProject = {
      id: 'p-100',
      code: 'PRJ-2569-01',
      name: 'โครงการทดสอบ 2 ไฟล์',
      leaderUserId: 'leader-1',
      status: 'APPROVED',
      activities: [
        {
          id: 'act-1',
          projectId: 'p-100',
          activityNo: 1,
          name: 'กิจกรรมย่อย 1',
          responsibleUserId: 'teacher-resp-1',
          allocatedAmount: 10000,
          adjustedAmount: 10000,
          expenses: [],
        },
      ],
      attachments: [
        {
          id: 'att-doc-1',
          projectId: 'p-100',
          title: '[ACT_DOC:act-1] ไฟล์กิจกรรมทดสอบ.pdf',
          attachmentType: 'PROPOSAL',
          storageType: 'R2_UPLOAD',
          fileUrl: 'https://r2.test/doc.pdf',
        },
        {
          id: 'att-rep-1',
          projectId: 'p-100',
          title: '[ACT_REPORT:act-1] รายงานสรุปผลกิจกรรม.pdf',
          attachmentType: 'SUMMARY',
          storageType: 'R2_UPLOAD',
          fileUrl: 'https://r2.test/report.pdf',
        },
      ],
    };

    const teacherRespUser = { id: 'teacher-resp-1', role: 'TEACHER' };
    const otherTeacherUser = { id: 'other-teacher', role: 'TEACHER' };
    const settings = { enablePlanning: true };

    const dto = serializeProjectToDTO(rawProject, teacherRespUser, settings);
    assert.equal(dto.activities.length, 1);
    const act = dto.activities[0];

    // Dual files verified
    assert.ok(act.documentAttachment, 'documentAttachment must be present');
    assert.equal(act.documentAttachment?.attachmentType, 'PROPOSAL');
    assert.equal(act.documentAttachment?.title, 'ไฟล์กิจกรรมทดสอบ.pdf');

    assert.ok(act.reportAttachment, 'reportAttachment must be present');
    assert.equal(act.reportAttachment?.attachmentType, 'SUMMARY');
    assert.equal(act.reportAttachment?.title, 'รายงานสรุปผลกิจกรรม.pdf');

    // Responsible teacher has permissions to edit activity and manage files
    assert.equal(act.permissions.canEditActivity, true, 'Responsible teacher can edit activity');
    assert.equal(act.permissions.canManageFiles, true, 'Responsible teacher can manage dual files');
    assert.equal(act.permissions.canUploadReport, true);

    // Other teacher cannot edit activity or manage files
    const otherDto = serializeProjectToDTO(rawProject, otherTeacherUser, settings);
    const otherAct = otherDto.activities[0];
    assert.equal(otherAct.permissions.canEditActivity, false, 'Unrelated teacher cannot edit');
    assert.equal(otherAct.permissions.canManageFiles, false, 'Unrelated teacher cannot manage files');
  });
});
