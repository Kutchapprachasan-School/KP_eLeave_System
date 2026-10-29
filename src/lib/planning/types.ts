/**
 * School Planning & Budget Tracking - DTO Types
 * Module: src/lib/planning/types.ts
 */

export type ProjectStatusType = "DRAFT" | "APPROVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type BudgetSourceCategoryType = "SUBSIDY" | "FREE_EDUCATION_15Y" | "SCHOOL_INCOME" | "LOCAL_GOV" | "OTHER";
export type BudgetSourceType = BudgetSourceCategoryType;
export type ExpenseCategoryType = "REMUNERATION" | "OPERATING" | "MATERIALS" | "EQUIPMENT" | "UTILITIES" | "OTHER";
export type ExpenseStatusType = "RESERVED" | "PAID" | "CANCELLED";
export type AttachmentCategoryType = "PROPOSAL" | "APPROVAL" | "SUMMARY" | "RECEIPT" | "OTHER";
export type AttachmentType = AttachmentCategoryType;
export type AttachmentTypeValue = AttachmentCategoryType;
export type StorageProviderType = "R2_UPLOAD" | "EXTERNAL_LINK";
export type StorageTypeValue = StorageProviderType;

export const PROJECT_STATUS_LABELS: Record<ProjectStatusType, string> = {
  DRAFT: "ร่างโครงการ",
  APPROVED: "อนุมัติแล้ว",
  IN_PROGRESS: "กำลังดำเนินการ",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
};

export const BUDGET_SOURCE_LABELS: Record<BudgetSourceCategoryType, string> = {
  SUBSIDY: "เงินอุดหนุนรายหัว",
  FREE_EDUCATION_15Y: "เงินเรียนฟรี 15 ปี",
  SCHOOL_INCOME: "เงินรายได้สถานศึกษา",
  LOCAL_GOV: "เงินอุดหนุน อปท./อบจ.",
  OTHER: "เงินนอกงบประมาณ/อื่นๆ",
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategoryType, string> = {
  REMUNERATION: "ค่าตอบแทน",
  OPERATING: "ค่าใช้สอย",
  MATERIALS: "ค่าวัสดุ",
  EQUIPMENT: "ค่าครุภัณฑ์",
  UTILITIES: "ค่าสาธารณูปโภค",
  OTHER: "เบ็ดเตล็ด/อื่นๆ",
};

export const ATTACHMENT_TYPE_LABELS: Record<AttachmentCategoryType, string> = {
  PROPOSAL: "เล่มโครงการที่จัดทำแล้ว",
  APPROVAL: "แบบขออนุมัติโครงการ",
  SUMMARY: "รายงานสรุปโครงการ",
  RECEIPT: "ใบเสร็จ/หลักฐานการจ่ายเงิน",
  OTHER: "เอกสารประกอบอื่น ๆ",
};

export type DocumentRequirementPolicy = "BOTH" | "PROJECT_ONLY" | "ACTIVITY_ONLY" | "EITHER";

export const DOCUMENT_REQUIREMENT_LABELS: Record<DocumentRequirementPolicy, { label: string; desc: string }> = {
  BOTH: {
    label: "รายงานกิจกรรม + รายงานโครงการ",
    desc: "ต้องส่งรายงานครบทุกกิจกรรมย่อย และต้องมีเล่มรายงานสรุปโครงการภาพรวม",
  },
  PROJECT_ONLY: {
    label: "เฉพาะรายงานสรุปโครงการ",
    desc: "ส่งเฉพาะรายงานสรุปโครงการภาพรวม (ไม่บังคับรายงานกิจกรรมย่อย)",
  },
  ACTIVITY_ONLY: {
    label: "เฉพาะรายงานกิจกรรมย่อย",
    desc: "ส่งเฉพาะรายงานสรุปกิจกรรมย่อยให้ครบ (ไม่บังคับเล่มสรุปโครงการภาพรวม)",
  },
  EITHER: {
    label: "อย่างใดอย่างหนึ่ง",
    desc: "ส่งรายงานกิจกรรมย่อย หรือมีเล่มสรุปโครงการภาพรวม อย่างใดอย่างหนึ่งถือว่าผ่าน",
  },
};

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatusType, string> = {
  PAID: "เบิกจ่ายจริง (PAID)",
  RESERVED: "กันวงเงินจอง (RESERVED)",
  CANCELLED: "ยกเลิกรายการ (CANCELLED)",
};

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
  paidPercentage?: number;
  reservedPercentage?: number;
  activeExpenseCount?: number;
  reservedExpenseCount?: number;
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
  paidPercentage?: number;
  reservedPercentage?: number;
  hasUnallocatedWarning?: boolean;
  sarReadiness: {
    hasProposal: boolean;
    hasApproval: boolean;
    hasProjectSummary: boolean;
    activityReports: {
      total: number;
      submitted: number;
      isComplete: boolean;
      isPartial: boolean;
    };
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
  requester: {
    id: string;
    name: string;
  };
  recordedByUserId: string | null;
  recordedByName: string | null;
  recordedBy: {
    id: string | null;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ProjectAttachmentDTO {
  id: string;
  projectId: string;
  activityId?: string | null;
  title: string;
  attachmentType: AttachmentCategoryType;
  storageType: StorageProviderType;
  fileUrl: string;
  fileKey: string | null;
  fileSize: number | null;
  mimeType: string | null;
  uploadedByUserId: string;
  uploadedByName: string;
  uploadedBy: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export interface ProjectActivityDTO {
  id: string;
  projectId: string;
  activityNo: number;
  name: string;
  responsibleUserId: string;
  responsibleUserName: string;
  responsibleUser: {
    id: string;
    name: string;
  };
  allocatedAmount?: number;
  adjustedAmount?: number;
  financials: ActivityFinancialSummaryDTO;
  expenses: ActivityExpenseDTO[];
  reportAttachment?: ProjectAttachmentDTO | null;
  permissions: {
    canRecordAndSettleExpenses: boolean;
    canManageProjectsAndBudget: boolean;
    canAdjustBudget?: boolean;
    canUploadReport?: boolean;
  };
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface DepartmentDTO {
  id: string;
  code?: string;
  name: string;
}

export interface SimpleUserDTO {
  id: string;
  name: string;
  email?: string | null;
  position?: string | null;
}

export interface ProjectDTO {
  id: string;
  fiscalYear: number;
  fiscalYearId: string;
  code: string;
  name: string;
  departmentId: string | null;
  departmentName: string | null;
  department: {
    id: string;
    name: string;
  };
  leaderUserId: string;
  leaderUserName: string;
  leader: {
    id: string;
    name: string;
  };
  budgetSourceType: BudgetSourceCategoryType;
  budgetSource: BudgetSourceCategoryType;
  budgetSourceName: string;
  strategyCode: string | null;
  standardTags: string[];
  status: ProjectStatusType;
  allocatedAmount?: number;
  adjustedAmount?: number;
  financials: ProjectFinancialSummaryDTO;
  activities: ProjectActivityDTO[];
  attachments: ProjectAttachmentDTO[];
  permissions: {
    canManageProject: boolean;
    canManageActivities: boolean;
    canAdjustBudget?: boolean;
    canDisburseExpenses: boolean;
    canManageAttachments: boolean;
    canManageProjectsAndBudget?: boolean;
    canRecordAndSettleExpenses?: boolean;
  };
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
