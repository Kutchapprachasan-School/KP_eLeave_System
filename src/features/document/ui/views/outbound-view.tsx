"use client";

import OutboundForm from "@/app/(app)/document/_components/forms/outbound-form";
import DocumentTable from "@/app/(app)/document/_components/document-table";
import { MemoSectionDTO, OutboundDocument, IncomingDoc } from "@/features/document/domain/types/document.types";

interface OutboundViewProps {
  sections: MemoSectionDTO[];
  outboundDocs: OutboundDocument[];
  inboundDocs: IncomingDoc[];
  issuing: boolean;
  onIssueSubmit: (data: any) => Promise<void>;
  onRefresh: () => void;
  onCancelDocClick: (id: string) => void;
  username: string;
  department: string;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedDocType: string;
  setSelectedDocType: (val: string) => void;
  selectedYear: string;
  setSelectedYear: (val: string) => void;
  selectedStatus: string;
  setSelectedStatus: (val: string) => void;
}

export function OutboundView({
  sections,
  outboundDocs,
  inboundDocs,
  issuing,
  onIssueSubmit,
  onRefresh,
  onCancelDocClick,
  username,
  department,
  searchQuery,
  setSearchQuery,
  selectedDocType,
  setSelectedDocType,
  selectedYear,
  setSelectedYear,
  selectedStatus,
  setSelectedStatus,
}: OutboundViewProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>📝</span> ขอเลขทะเบียนเอกสารใหม่
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          กรอกข้อมูลเพื่อขอออกเลขทะเบียนหนังสือส่ง บันทึกข้อความ หรือคำสั่งโรงเรียน
        </p>
      </div>

      <OutboundForm
        sections={sections}
        issuing={issuing}
        onSubmit={onIssueSubmit}
        username={username}
        department={department}
        outboundDocs={outboundDocs}
        onRefresh={onRefresh}
      />

      {/* Embedded History & Register Table */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>📋</span>
            ประวัติและทะเบียนออกเลขหนังสือส่ง/คำสั่ง
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            รายการทะเบียนหนังสือส่งและคำสั่งโรงเรียนทั้งหมด
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
