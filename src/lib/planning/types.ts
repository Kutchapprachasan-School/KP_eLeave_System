/**
 * School Planning & Budget Tracking - DTO Types
 * Module: src/lib/planning/types.ts
 */

export type ProjectStatusType = "DRAFT" | "APPROVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type BudgetSourceCategoryType = "SUBSIDY" | "FREE_EDUCATION_15Y" | "SCHOOL_INCOME" | "LOCAL_GOV" | "OTHER";
export type ExpenseCategoryType = "REMUNERATION" | "OPERATING" | "MATERIALS" | "EQUIPMENT" | "UTILITIES" | "OTHER";
export type ExpenseStatusType = "RESERVED" | "PAID" | "CANCELLED";
export type AttachmentCategoryType = "PROPOSAL" | "APPROVAL" | "SUMMARY" | "RECEIPT" | "OTHER";
export type StorageProviderType = "R2_UPLOAD" | "EXTERNAL_LINK";

export interface ActivityFinancialSummaryDTO {
  allocatedAmount: number;
  effectiveBudget: number;
  isAdjusted: boolean;
  reservedAmount: number;
  paidAmount: number;
  totalSpent: number;
  remainingBalance: number;
  usagePercentage: number;
  usedCategories: ExpenseCategoryType[];
}

export interface ProjectFinancialSummaryDTO {
  allocatedAmount: number;
  effectiveBudget: number;
  isAdjusted: boolean;
  allocatedToActivities: number;
  unallocatedBudget: number;
  isFullyAllocated: boolean;
  isOverAllocated: boolean;
  reservedAmount: number;
  paidAmount: number;
  totalSpent: number;
  remainingBalance: number;
  usagePercentage: number;
  sarReadiness: {
    hasProposal: boolean;
    hasApproval: boolean;
    hasSummary: boolean;
  };
}

export interface PortfolioSummaryDTO {
  totalEffectiveBudget: number;
  totalReservedAmount: number;
  totalPaidAmount: number;
  totalSpentAmount: number;
  totalRemainingBalance: number;
  projectCount: number;
  activityCount: number;
}

export interface ActivityExpenseDTO {
  id: string;
  activityId: string;
  expenseDate: string;
  title: string;
  expenseCategory: ExpenseCategoryType;
  amount: number;
  receiptNo: string | null;
  attachmentUrl: string | null;
  attachmentKey: string | null;
  status: ExpenseStatusType;
  remark: string | null;
  requesterUserId: string;
  requesterName: string;
  recordedByUserId: string | null;
  recordedByName: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ProjectAttachmentDTO {
  id: string;
  projectId: string;
  title: string;
  attachmentType: AttachmentCategoryType;
  storageType: StorageProviderType;
  fileUrl: string;
  fileKey: string | null;
  fileSize: number | null;
  mimeType: string | null;
  uploadedByUserId: string;
  uploadedByName: string;
  createdAt: string;
}

export interface ProjectActivityDTO {
  id: string;
  projectId: string;
  activityNo: number;
  name: string;
  responsibleUserId: string;
  responsibleUserName: string;
  financials: ActivityFinancialSummaryDTO;
  expenses: ActivityExpenseDTO[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ProjectDTO {
  id: string;
  fiscalYear: number;
  fiscalYearId: string;
  code: string;
  name: string;
  departmentId: string | null;
  departmentName: string | null;
  leaderUserId: string;
  leaderUserName: string;
  budgetSourceType: BudgetSourceCategoryType;
  budgetSourceName: string;
  strategyCode: string | null;
  standardTags: string[];
  status: ProjectStatusType;
  financials: ProjectFinancialSummaryDTO;
  activities: ProjectActivityDTO[];
  attachments: ProjectAttachmentDTO[];
  permissions: {
    canManageProject: boolean;
    canManageActivities: boolean;
    canDisburseExpenses: boolean;
    canManageAttachments: boolean;
  };
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
