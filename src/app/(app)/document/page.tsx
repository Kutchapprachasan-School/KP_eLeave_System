"use client";

import { useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { ClipboardList, ArrowLeft, RefreshCw } from "lucide-react";

import { quickIssueDoc, cancelDoc } from "@/app/actions/document";
import { useSession } from "@/lib/auth-client";
import { useToast } from "@/components/toast-provider";
import AmssImportModal from "@/components/AmssImportModal";
import AmssCredentialsModal from "./_components/amss-credentials-modal";
import { PageHeader } from "@/components/ui/page-header";
import { TableSkeleton } from "@/components/ui/skeletons";
import { GuardedAction } from "./_components/guarded-action";

import { useDocumentData } from "@/features/document/ui/hooks/use-document-data";
import { useDocumentFilters } from "@/features/document/ui/hooks/use-document-filters";
import { OutboundView } from "@/features/document/ui/views/outbound-view";
import { InboundView } from "@/features/document/ui/views/inbound-view";
import { CertView } from "@/features/document/ui/views/cert-view";
import { CancelDocModal } from "@/features/document/ui/modals/cancel-doc-modal";
import { DOCUMENT_NAV_ITEMS } from "@/features/document/manifest";

function DocumentPageContent() {
  const { data: session } = useSession();
  const { showToast: originalShowToast } = useToast();
  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    originalShowToast(type, msg);
  }, [originalShowToast]);

  const data = useDocumentData();
  const filters = useDocumentFilters(data.outboundDocs, data.inboundDocs);

  const [issuing, setIssuing] = useState(false);
  const [docToCancel, setDocToCancel] = useState<string | null>(null);
  const [showAmssCredentialsModal, setShowAmssCredentialsModal] = useState(false);
  const [showAmssImportModal, setShowAmssImportModal] = useState(false);
  const [autoBrowserTrigger, setAutoBrowserTrigger] = useState(false);

  const handleFormIssue = async (formData: any) => {
    setIssuing(true);
    try {
      const res = await quickIssueDoc(formData);
      if (res.success) {
        showToast("ออกเลขเอกสารสำเร็จ: " + res.data.docNo, "success");
        await data.loadData();
      } else {
        showToast(res.error || "ออกเลขเอกสารล้มเหลว", "error");
      }
    } catch (err: any) {
      showToast(err.message || "ออกเลขเอกสารล้มเหลว", "error");
    } finally {
      setIssuing(false);
    }
  };

  const handleCancelDoc = async (reason: string) => {
    if (!docToCancel) return;
    try {
      const res = await cancelDoc(docToCancel, reason);
      if (res.success) {
        showToast("ยกเลิกเลขทะเบียนส่งสำเร็จ", "success");
        setDocToCancel(null);
        await data.loadData();
      } else {
        showToast(res.error || "ยกเลิกเลขล้มเหลว", "error");
      }
    } catch (err: any) {
      showToast(err.message || "ยกเลิกเลขล้มเหลว", "error");
    }
  };

  if (data.loading && data.outboundDocs.length === 0) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-1">
        <PageHeader
          title="ระบบงานสารบรรณ (Sarabun System)"
          description="ขอออกเลขทะเบียนหนังสือส่ง บันทึกข้อความ คำสั่ง และตรวจสอบประวัติทะเบียนคุมหนังสือรับ-ส่ง"
          icon={ClipboardList}
          gradient="from-orange-600 to-amber-600"
        />
        <TableSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1">
      <PageHeader
        title="ระบบงานสารบรรณ (Sarabun System)"
        description="ขอออกเลขทะเบียนหนังสือส่ง บันทึกข้อความ คำสั่ง และตรวจสอบประวัติทะเบียนคุมหนังสือรับ-ส่ง"
        icon={ClipboardList}
        gradient="from-orange-600 to-amber-600"
        action={
          <div className="flex items-center gap-2">
            <GuardedAction requiredPermission="sarabun:settings:edit">
              <Link
                href="/settings?tab=document-settings"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-sm font-bold border border-indigo-200/60 dark:border-indigo-800/60 transition cursor-pointer shadow-xs"
              >
                ⚙️ ตั้งค่าระบบเอกสารรับ-ส่ง
              </Link>
            </GuardedAction>
            <Link
              href="/dashboard"
              className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs"
              title="กลับหน้าหลัก"
            >
              <ArrowLeft className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            </Link>
          </div>
        }
      />

      {/* Navigation Tabs */}
      <div className="flex border border-slate-200/80 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/60 p-1.5 rounded-xl gap-1.5 shadow-xs max-w-3xl overflow-x-auto">
        {DOCUMENT_NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              filters.setView(item.view as any);
              filters.setActiveTab(item.activeTab as any);
            }}
            className={`px-4 py-2 text-center rounded-lg text-sm transition-all cursor-pointer whitespace-nowrap ${
              filters.view === item.view
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Views */}
      {filters.view === "cert" ? (
        <CertView onBack={() => filters.setView("inbound")} />
      ) : filters.view === "issue" ? (
        <OutboundView
          sections={data.sections}
          outboundDocs={data.outboundDocs}
          inboundDocs={data.inboundDocs}
          issuing={issuing}
          onIssueSubmit={handleFormIssue}
          onRefresh={data.loadData}
          onCancelDocClick={(id) => setDocToCancel(id)}
          username={session?.user?.name || ""}
          department={(session?.user as any)?.subjectGroup || ""}
          searchQuery={filters.searchQuery}
          setSearchQuery={filters.setSearchQuery}
          selectedDocType={filters.selectedDocType}
          setSelectedDocType={filters.setSelectedDocType}
          selectedYear={filters.selectedYearTable}
          setSelectedYear={filters.setSelectedYearTable}
          selectedStatus={filters.selectedStatus}
          setSelectedStatus={filters.setSelectedStatus}
        />
      ) : filters.view === "inbound" ? (
        <InboundView
          sections={data.sections}
          outboundDocs={data.outboundDocs}
          inboundDocs={data.inboundDocs}
          amssCredsExist={data.amssCredsExist}
          autoBrowserTrigger={autoBrowserTrigger}
          onRefresh={data.loadData}
          onCancelDocClick={(id) => setDocToCancel(id)}
          onShowCredentialsModal={() => setShowAmssCredentialsModal(true)}
          onShowImportModal={() => setShowAmssImportModal(true)}
          showToast={showToast}
          searchQuery={filters.searchQuery}
          setSearchQuery={filters.setSearchQuery}
          selectedDocType={filters.selectedDocType}
          setSelectedDocType={filters.setSelectedDocType}
          selectedYear={filters.selectedYearTable}
          setSelectedYear={filters.setSelectedYearTable}
          selectedStatus={filters.selectedStatus}
          setSelectedStatus={filters.setSelectedStatus}
        />
      ) : null}

      <CancelDocModal
        isOpen={Boolean(docToCancel)}
        docId={docToCancel}
        onConfirm={handleCancelDoc}
        onClose={() => setDocToCancel(null)}
      />

      <AmssCredentialsModal
        isOpen={showAmssCredentialsModal}
        onClose={() => setShowAmssCredentialsModal(false)}
        onSaved={data.loadData}
        showToast={showToast}
      />

      <AmssImportModal
        isOpen={showAmssImportModal}
        onClose={() => setShowAmssImportModal(false)}
        onRefresh={data.loadData}
      />
    </div>
  );
}

export default function DocumentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
        </div>
      }
    >
      <DocumentPageContent />
    </Suspense>
  );
}
