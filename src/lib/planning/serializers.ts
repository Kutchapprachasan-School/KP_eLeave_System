/**
 * School Planning & Budget Tracking - DTO Serializer
 * Module: src/lib/planning/serializers.ts
 */

import type {
  ProjectDTO,
  ProjectActivityDTO,
  ProjectAttachmentDTO,
  ActivityExpenseDTO,
  PortfolioSummaryDTO,
  ExpenseCategoryType,
  ExpenseStatusType,
  AttachmentCategoryType,
  StorageProviderType,
  BudgetSourceCategoryType,
  ProjectStatusType,
} from "./types.ts";
import { calculateActivityFinancials, calculateProjectFinancials, toSatang, fromSatang } from "./calculator.ts";
import { getPlanningPermissions } from "./permissions.ts";

export function serializeAttachmentToDTO(att: any): ProjectAttachmentDTO {
  return {
    id: att.id,
    projectId: att.projectId,
    title: att.title || att.originalFileName || "เอกสารโครงการ",
    attachmentType: (att.attachmentType || "PROPOSAL") as AttachmentCategoryType,
    storageType: (att.storageType || "R2_UPLOAD") as StorageProviderType,
    fileUrl: att.fileUrl || att.objectKey || "",
    fileKey: att.fileKey || null,
    fileSize: att.fileSize ?? null,
    mimeType: att.mimeType ?? null,
    uploadedByUserId: att.uploadedByUserId,
    uploadedByName: att.uploadedByUser?.name || "ไม่ระบุ",
    createdAt: att.createdAt instanceof Date ? att.createdAt.toISOString() : String(att.createdAt),
  };
}

export function serializeExpenseToDTO(exp: any): ActivityExpenseDTO {
  return {
    id: exp.id,
    activityId: exp.activityId || "",
    expenseDate: exp.expenseDate instanceof Date ? exp.expenseDate.toISOString() : String(exp.expenseDate),
    title: exp.title,
    expenseCategory: (exp.expenseCategory || "MATERIALS") as ExpenseCategoryType,
    amount: typeof exp.amount === "number" ? exp.amount : Number(exp.amount),
    receiptNo: exp.receiptNo || null,
    attachmentUrl: exp.attachmentUrl || null,
    attachmentKey: exp.attachmentKey || null,
    status: (exp.status || "PAID") as ExpenseStatusType,
    remark: exp.remark || null,
    requesterUserId: exp.requestedByUserId,
    requesterName: exp.requestedByUser?.name || "ไม่ระบุ",
    recordedByUserId: exp.recordedByUserId || null,
    recordedByName: exp.recordedByUser?.name || null,
    createdAt: exp.createdAt instanceof Date ? exp.createdAt.toISOString() : String(exp.createdAt),
    updatedAt: exp.updatedAt instanceof Date ? exp.updatedAt.toISOString() : String(exp.updatedAt),
    deletedAt: exp.deletedAt ? (exp.deletedAt instanceof Date ? exp.deletedAt.toISOString() : String(exp.deletedAt)) : null,
  };
}

export function serializeActivityToDTO(act: any): ProjectActivityDTO {
  const financials = calculateActivityFinancials(act);
  const expenses = (act.expenses || [])
    .filter((e: any) => e.deletedAt === null || e.deletedAt === undefined)
    .map(serializeExpenseToDTO);

  return {
    id: act.id,
    projectId: act.projectId,
    activityNo: act.activityNo,
    name: act.name,
    responsibleUserId: act.responsibleUserId,
    responsibleUserName: act.responsibleUser?.name || "ไม่ระบุ",
    financials,
    expenses,
    createdAt: act.createdAt instanceof Date ? act.createdAt.toISOString() : String(act.createdAt),
    updatedAt: act.updatedAt instanceof Date ? act.updatedAt.toISOString() : String(act.updatedAt),
    deletedAt: act.deletedAt ? (act.deletedAt instanceof Date ? act.deletedAt.toISOString() : String(act.deletedAt)) : null,
  };
}

export function serializeProjectToDTO(
  project: any,
  currentUser?: { id: string; role: string },
  settings?: { enablePlanning?: boolean; planningOfficerUserIds?: string | null }
): ProjectDTO {
  const financials = calculateProjectFinancials(project);
  const activities = (project.activities || [])
    .filter((a: any) => a.deletedAt === null || a.deletedAt === undefined)
    .sort((a: any, b: any) => a.activityNo - b.activityNo)
    .map(serializeActivityToDTO);

  const attachments = (project.attachments || []).map(serializeAttachmentToDTO);

  const permissions = currentUser && settings
    ? {
        canManageProject: getPlanningPermissions(currentUser, settings, { leaderUserId: project.leaderUserId, projectStatus: project.status }).canManageProjectsAndBudget,
        canManageActivities: getPlanningPermissions(currentUser, settings, { leaderUserId: project.leaderUserId, projectStatus: project.status }).canManageProjectsAndBudget,
        canDisburseExpenses: getPlanningPermissions(currentUser, settings, { leaderUserId: project.leaderUserId, projectStatus: project.status }).canRecordAndSettleExpenses,
        canManageAttachments: getPlanningPermissions(currentUser, settings, { leaderUserId: project.leaderUserId, projectStatus: project.status }).canManageAttachments,
      }
    : {
        canManageProject: false,
        canManageActivities: false,
        canDisburseExpenses: false,
        canManageAttachments: false,
      };

  return {
    id: project.id,
    fiscalYear: project.fiscalYear?.year || project.targetAcademicYear || 2569,
    fiscalYearId: project.fiscalYearId,
    code: project.code,
    name: project.name,
    departmentId: project.departmentId || null,
    departmentName: project.departmentName || project.department?.name || null,
    leaderUserId: project.leaderUserId,
    leaderUserName: project.leaderUser?.name || project.leaderName || "ไม่ระบุ",
    budgetSourceType: (project.budgetSourceType || "SUBSIDY") as BudgetSourceCategoryType,
    budgetSourceName: project.budgetSource?.name || "เงินอุดหนุนรายหัว",
    strategyCode: project.strategyCode || null,
    standardTags: project.standardTags || [],
    status: (project.status || "APPROVED") as ProjectStatusType,
    financials,
    activities,
    attachments,
    permissions,
    createdAt: project.createdAt instanceof Date ? project.createdAt.toISOString() : String(project.createdAt),
    updatedAt: project.updatedAt instanceof Date ? project.updatedAt.toISOString() : String(project.updatedAt),
    deletedAt: project.deletedAt ? (project.deletedAt instanceof Date ? project.deletedAt.toISOString() : String(project.deletedAt)) : null,
  };
}

export function computePortfolioSummary(projects: ProjectDTO[]): PortfolioSummaryDTO {
  let totalEffectiveSatang = 0;
  let totalReservedSatang = 0;
  let totalPaidSatang = 0;
  let totalRemainingSatang = 0;
  let activityCount = 0;

  for (const prj of projects) {
    if (prj.deletedAt) continue;
    totalEffectiveSatang += toSatang(prj.financials.effectiveBudget);
    totalReservedSatang += toSatang(prj.financials.reservedAmount);
    totalPaidSatang += toSatang(prj.financials.paidAmount);
    totalRemainingSatang += toSatang(prj.financials.remainingBalance);
    activityCount += prj.activities.length;
  }

  const totalSpentSatang = totalReservedSatang + totalPaidSatang;

  return {
    totalEffectiveBudget: fromSatang(totalEffectiveSatang),
    totalReservedAmount: fromSatang(totalReservedSatang),
    totalPaidAmount: fromSatang(totalPaidSatang),
    totalSpentAmount: fromSatang(totalSpentSatang),
    totalRemainingBalance: fromSatang(totalRemainingSatang),
    projectCount: projects.length,
    activityCount,
  };
}
