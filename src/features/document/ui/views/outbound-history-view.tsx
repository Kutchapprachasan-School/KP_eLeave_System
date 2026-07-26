"use client";

import DocumentTable from "@/app/(app)/document/_components/document-table";
import { MemoSectionDTO, OutboundDocument, IncomingDoc } from "@/features/document/domain/types/document.types";

interface OutboundHistoryViewProps {
  sections: MemoSectionDTO[];
  outboundDocs: OutboundDocument[];
  inboundDocs: IncomingDoc[];
  onRefresh: () => void;
  onCancelDocClick: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedDocType: string;
  setSelectedDocType: (val: string) => void;
  selectedYear: string;
  setSelectedYear: (val: string) => void;
  selectedStatus: string;
  setSelectedStatus: (val: string) => void;
}

export function OutboundHistoryView({
  sections,
  outboundDocs,
  inboundDocs,
  onRefresh,
  onCancelDocClick,
  searchQuery,
  setSearchQuery,
  selectedDocType,
  setSelectedDocType,
  selectedYear,
  setSelectedYear,
  selectedStatus,
  setSelectedStatus,
}: OutboundHistoryViewProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>📋</span>
            ประวัติและทะเบียนออกเลขหนังสือ
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            รายการประวัติและทะเบียนคุมหนังสือส่ง บันทึกข้อความ และคำสั่งโรงเรียนทั้งหมด
          </p>
        </div>

        <DocumentTable
          activeTab="outbound"
          outboundDocs={outboundDocs}
          inboundDocs={inboundDocs}
          sections={sections}
          onRefresh={onRefresh}
          onCancelDocClick={onCancelDocClick}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedDocType={selectedDocType}
          setSelectedDocType={setSelectedDocType}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
        />
      </div>
    </div>
  );
}
