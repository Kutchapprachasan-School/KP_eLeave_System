"use client";

import DocumentTable from "@/app/(app)/document/_components/document-table";
import { MemoSectionDTO, OutboundDocument, IncomingDoc } from "@/features/document/domain/types/document.types";

interface OutboundHistoryViewProps {
  sections: MemoSectionDTO[];
  outboundDocs: OutboundDocument[];
  inboundDocs: IncomingDoc[];
  onRefresh: () => void;
  onCancelDocClick: (id: string) => void;
  onRestoreDocClick?: (id: string) => void;
  onUpdateDocClick?: (id: string, data: any) => Promise<boolean>;
  onRequestDocAction?: (id: string, type: "CANCEL" | "EDIT" | "RESTORE", payload?: any) => Promise<boolean>;
  onApproveDocRequest?: (id: string) => Promise<boolean>;
  onRejectDocRequest?: (id: string, reason?: string) => Promise<boolean>;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedDocType: string;
  setSelectedDocType: (val: string) => void;
  selectedSectionId?: string;
  setSelectedSectionId?: (val: string) => void;
  selectedYear: string;
  setSelectedYear: (val: string) => void;
  selectedStatus: string;
  setSelectedStatus: (val: string) => void;
  currentUserId?: string;
  currentUser?: {
    id?: string;
    name?: string;
    username?: string;
    role?: string;
    position?: string;
  };
  documentManageMode?: string;
  docAdminUserIds?: string[];
}

export function OutboundHistoryView({
  sections,
  outboundDocs,
  inboundDocs,
  onRefresh,
  onCancelDocClick,
  onRestoreDocClick,
  onUpdateDocClick,
  onRequestDocAction,
  onApproveDocRequest,
  onRejectDocRequest,
  searchQuery,
  setSearchQuery,
  selectedDocType,
  setSelectedDocType,
  selectedSectionId = "",
  setSelectedSectionId,
  selectedYear,
  setSelectedYear,
  selectedStatus,
  setSelectedStatus,
  currentUserId,
  currentUser,
  documentManageMode = "DIRECT",
  docAdminUserIds = [],
}: OutboundHistoryViewProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <DocumentTable
        activeTab="outbound"
        outboundDocs={outboundDocs}
        inboundDocs={inboundDocs}
        sections={sections}
        onRefresh={onRefresh}
        onCancelDocClick={onCancelDocClick}
        onRestoreDocClick={onRestoreDocClick}
        onUpdateDocClick={onUpdateDocClick}
        onRequestDocAction={onRequestDocAction}
        onApproveDocRequest={onApproveDocRequest}
        onRejectDocRequest={onRejectDocRequest}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedDocType={selectedDocType}
        setSelectedDocType={setSelectedDocType}
        selectedSectionId={selectedSectionId}
        setSelectedSectionId={setSelectedSectionId}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        currentUserId={currentUserId}
        currentUser={currentUser}
        documentManageMode={documentManageMode}
        docAdminUserIds={docAdminUserIds}
      />
    </div>
  );
}
