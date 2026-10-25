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
} from "./types";
import { calculateActivityFinancials, calculateProjectFinancials, toSatang, fromSatang } from "./calculator";
import { getPlanningPermissions } from "./permissions";

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

  const responsibleName = act.responsibleUser?.name || act.responsibleUserName || "ไม่ระบุ";
  const effective = financials.effectiveBudget;
  const paidPct = effective > 0 ? Number(((financials.paidAmount / effective) * 100).toFixed(1)) : 0;
  const resPct = effective > 0 ? Number(((financials.reservedAmount / effective) * 100).toFixed(1)) : 0;
  const usePct = effective > 0 ? Number(((financials.totalSpent / effective) * 100).toFixed(1)) : 0;

  const enrichedFinancials = {
    ...financials,
    paidPercentage: paidPct,
    reservedPercentage: resPct,
    usagePercentage: usePct,
    activeExpenseCount: expenses.filter((e) => e.status !== "CANCELLED").length,
    reservedExpenseCount: expenses.filter((e) => e.status === "RESERVED").length,
  };

  return {
    id: act.id,
    projectId: act.projectId,
    activityNo: act.activityNo,
    name: act.name,
    responsibleUserId: act.responsibleUserId,
    responsibleUserName: responsibleName,
    responsibleUser: {
      id: act.responsibleUserId,
      name: responsibleName,
    },
    financials: enrichedFinancials,
    expenses,
    permissions: {
      canRecordAndSettleExpenses: true,
      canManageProjectsAndBudget: true,
    },
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

  const perms = currentUser && settings
    ? getPlanningPermissions(currentUser, settings, { leaderUserId: project.leaderUserId, projectStatus: project.status })
    : { canManageProjectsAndBudget: false, canRecordAndSettleExpenses: false, canManageAttachments: false, canViewModule: false };

  const permissions = {
    canManageProject: perms.canManageProjectsAndBudget,
    canManageActivities: perms.canManageProjectsAndBudget,
    canDisburseExpenses: perms.canRecordAndSettleExpenses,
    canManageAttachments: perms.canManageAttachments,
    canManageProjectsAndBudget: perms.canManageProjectsAndBudget,
    canRecordAndSettleExpenses: perms.canRecordAndSettleExpenses,
  };

  const deptName = project.departmentName || project.department?.name || "ไม่ระบุฝ่าย";
  const deptId = project.departmentId || project.department?.id || "";
  const leaderName = project.leaderUser?.name || project.leaderName || "ไม่ระบุ";
  const leaderId = project.leaderUserId || project.leader?.id || "";
  const bSource = (project.budgetSourceType || project.budgetSource?.sourceType || "SUBSIDY") as BudgetSourceCategoryType;

  const effective = financials.effectiveBudget;
  const paidPct = effective > 0 ? Number(((financials.paidAmount / effective) * 100).toFixed(1)) : 0;
  const resPct = effective > 0 ? Number(((financials.reservedAmount / effective) * 100).toFixed(1)) : 0;
  const usePct = effective > 0 ? Number(((financials.totalSpent / effective) * 100).toFixed(1)) : 0;

  const enrichedFinancials = {
    ...financials,
    paidPercentage: paidPct,
    reservedPercentage: resPct,
    usagePercentage: usePct,
    hasUnallocatedWarning: financials.unallocatedBudget !== 0,
  };

  return {
    id: project.id,
    fiscalYear: project.fiscalYear?.year || project.targetAcademicYear || 2569,
    fiscalYearId: project.fiscalYearId,
    code: project.code,
    name: project.name,
    departmentId: deptId || null,
    departmentName: deptName,
    department: {
      id: deptId,
      name: deptName,
    },
    leaderUserId: leaderId,
    leaderUserName: leaderName,
    leader: {
      id: leaderId,
      name: leaderName,
    },
    budgetSourceType: bSource,
    budgetSource: bSource,
    budgetSourceName: project.budgetSource?.name || "เงินอุดหนุนรายหัว",
    strategyCode: project.strategyCode || null,
    standardTags: project.standardTags || [],
    status: (project.status || "APPROVED") as ProjectStatusType,
    financials: enrichedFinancials,
    activities,
    attachments,
    permissions,
    createdAt: project.createdAt instanceof Date ? project.createdAt.toISOString() : String(project.createdAt),
    updatedAt: project.updatedAt instanceof Date ? project.updatedAt.toISOString() : String(project.updatedAt),
    deletedAt: project.deletedAt ? (project.deletedAt instanceof Date ? project.deletedAt.toISOString() : String(project.deletedAt)) : null,
  };
}

export { computePortfolioSummary, calculatePortfolioSummary } from "./calculator";
