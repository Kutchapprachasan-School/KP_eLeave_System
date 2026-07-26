export type DocumentStatus = "DRAFT" | "ISSUED" | "PRINTED" | "CANCELLED" | "RESERVED";
export type DocType = "MEMO" | "COMMAND" | "OUTGOING_NORMAL" | "OUTGOING_CIRCULAR" | "ANNOUNCEMENT";
export type IncomingDocStatus = "PENDING" | "ROUTING" | "COMPLETED" | "CANCELLED";

export interface MemoSectionDTO {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  color: string;
  icon: string;
  sortOrder: number;
}

export interface OutboundDocument {
  id: string;
  docType: string;
  docNo: string | null;
  seqNo: number | null;
  year: number;
  title: string;
  to: string;
  origin: string;
  date: Date;
  content?: string;
  signeeName?: string;
  signeePosition?: string;
  enclosures?: string | null;
  references?: string | null;
  status: DocumentStatus | string;
  cancelReason?: string | null;
  isPinned?: boolean;
  requester?: string | null;
  department?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  createdById?: string;
  memoSectionId?: string | null;
  memoSection?: MemoSectionDTO | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IncomingDoc {
  id: string;
  amssOriginId?: string | null;
  receiveNo: string;
  receiveDate: Date;
  senderOrg: string;
  docRefNo: string | null;
  title: string;
  urgencyLevel: string;
  amssLink: string | null;
  attachmentUrl: string | null;
  status: IncomingDocStatus | string;
  note?: string | null;
  createdById?: string;
  memoSectionId?: string | null;
  memoSection?: MemoSectionDTO | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DocumentFilterState {
  searchQuery: string;
  selectedDocType: string;
  selectedYear: string;
  selectedTimeRange: string;
  selectedStatus: string;
}

export interface OutboundFormData {
  docType: string;
  memoSectionId?: string;
  origin: string;
  to: string;
  title: string;
  requester: string;
  date: string;
  department?: string;
  connectBudget?: boolean;
}

export interface QuickIssueResult {
  id: string;
  docNo: string;
  title: string;
  to: string;
  date: string | Date;
  status: string;
}

export interface DashboardStats {
  DRAFT: number;
  ISSUED: number;
  PRINTED: number;
  CANCELLED: number;
}

export interface DocumentTrendData {
  month: string;
  memo: number;
  outgoing: number;
  command: number;
}
