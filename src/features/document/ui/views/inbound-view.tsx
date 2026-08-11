"use client";

import DocumentTable from "@/app/(app)/document/_components/document-table";
import AmssAutoBrowserSync from "@/app/(app)/document/_components/amss-auto-browser-sync";
import { GuardedAction } from "@/app/(app)/document/_components/guarded-action";
import { MemoSectionDTO, OutboundDocument, IncomingDoc } from "@/features/document/domain/types/document.types";

interface InboundViewProps {
  sections: MemoSectionDTO[];
  outboundDocs: OutboundDocument[];
  inboundDocs: IncomingDoc[];
  amssCredsExist: boolean | null;
  autoBrowserTrigger: boolean;
  enableAmssSync?: boolean;
  onRefresh: () => void;
  onCancelDocClick: (id: string) => void;
  onShowCredentialsModal: () => void;
  onShowImportModal: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedDocType: string;
  setSelectedDocType: (val: string) => void;
  selectedYear: string;
  setSelectedYear: (val: string) => void;
  selectedStatus: string;
  setSelectedStatus: (val: string) => void;
  currentUserId?: string;
}

export function InboundView({
  sections,
  outboundDocs,
  inboundDocs,
  amssCredsExist,
  autoBrowserTrigger,
  enableAmssSync = true,
  onRefresh,
  onCancelDocClick,
  onShowCredentialsModal,
  onShowImportModal,
  showToast,
  searchQuery,
  setSearchQuery,
  selectedDocType,
  setSelectedDocType,
  selectedYear,
  setSelectedYear,
  selectedStatus,
  setSelectedStatus,
  currentUserId,
}: InboundViewProps) {
  const myPendingDocs = inboundDocs.filter(
    (d) => d.routingSteps?.some((s: any) => s.status === "PENDING" && s.assigneeId === currentUserId)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner & AMSS Settings Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {enableAmssSync !== false && (
            <div className="flex flex-wrap items-center gap-2">
              <GuardedAction requiredPermission="sarabun:amss:sync">
                <AmssAutoBrowserSync
                  onSuccess={onRefresh}
                  showToast={showToast}
                  autoTrigger={autoBrowserTrigger}
                />
              </GuardedAction>

              <GuardedAction requiredPermission="sarabun:amss:sync">
                <button
                  type="button"
                  onClick={onShowCredentialsModal}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
                >
                  ⚙️ ตั้งค่าเชื่อมต่อ
                </button>
              </GuardedAction>

              <GuardedAction requiredPermission="sarabun:amss:sync">
                <button
                  type="button"
                  onClick={onShowImportModal}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200/60 dark:border-indigo-800/60 transition cursor-pointer"
                  title="นำเข้าหนังสือรับโดยคัดลอกซอร์สโค้ด HTML หรือวางข้อความ"
                >
                  📋 วางข้อความ / HTML
                </button>
              </GuardedAction>
            </div>
          )}
        </div>

        {/* Quick Stats Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div 
            onClick={() => setSelectedStatus("")}
            className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between cursor-pointer hover:bg-indigo-100/50 transition"
          >
            <div>
              <span className="text-[10px] font-bold uppercase text-indigo-500">
                หนังสือรับทั้งหมด
              </span>
              <p className="text-lg font-black text-indigo-900 dark:text-indigo-200">
                {inboundDocs.length} เล่ม
              </p>
            </div>
            <span className="text-2xl">📚</span>
          </div>

          <div
            onClick={() => setSelectedStatus("MY_PENDING")}
            className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
              selectedStatus === "MY_PENDING"
                ? "bg-purple-600 text-white border-purple-500 shadow-md"
                : "bg-purple-50/60 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/40 hover:bg-purple-100/60"
            }`}
          >
            <div>
              <span className={`text-[10px] font-bold uppercase ${selectedStatus === "MY_PENDING" ? "text-purple-200" : "text-purple-600 dark:text-purple-400"}`}>
                🎯 งานส่งถึงคุณรอการเกษียณ
              </span>
              <p className={`text-lg font-black ${selectedStatus === "MY_PENDING" ? "text-white" : "text-purple-950 dark:text-purple-200"}`}>
                {myPendingDocs.length} เล่ม
              </p>
            </div>
            <span className="text-2xl">✍️</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-emerald-500">
                สถานะการเชื่อมต่อ AMSS++
              </span>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                {amssCredsExist ? "● เชื่อมต่อระบบแล้ว" : "○ ยังไม่ตั้งค่ารหัสผ่าน"}
              </p>
            </div>
            <span className="text-2xl">🔌</span>
          </div>
        </div>
      </div>

      {/* Inbound Document History Table */}
      <DocumentTable
        activeTab="inbound"
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
        currentUserId={currentUserId}
      />
    </div>
  );
}
