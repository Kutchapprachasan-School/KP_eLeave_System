"use client";

import { useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { ClipboardList, RefreshCw } from "lucide-react";

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
import { OutboundHistoryView } from "@/features/document/ui/views/outbound-history-view";
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

  const [docToCancel, setDocToCancel] = useState<string | null>(null);
  const [showAmssCredentialsModal, setShowAmssCredentialsModal] = useState(false);
  const [showAmssImportModal, setShowAmssImportModal] = useState(false);
  const [issuing, setIssuing] = useState(false);

  const data = useDocumentData();
  const filters = useDocumentFilters(data.outboundDocs, data.inboundDocs);

  const [autoBrowserTrigger, setAutoBrowserTrigger] = useState(false);

  const handleFormIssue = async (formData: any) => {
    setIssuing(true);
    try {
      const res = await quickIssueDoc(formData);
      if (res.success) {
        showToast("ออกเลขเอกสารสำเร็จ: " + res.data.docNo, "success");
        await data.loadData();
        return res.data;
      } else {
        showToast(res.error || "ออกเลขเอกสารล้มเหลว", "error");
        return null;
      }
    } catch (err: any) {
      showToast(err.message || "ออกเลขเอกสารล้มเหลว", "error");
      return null;
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

  const getHeaderInfo = () => {
    switch (filters.view) {
      case "outbound_history":
        return {
          title: "ประวัติและทะเบียนออกเลขหนังสือ",
          description: "รายการประวัติและทะเบียนคุมหนังสือส่ง บันทึกข้อความ และคำสั่งโรงเรียนทั้งหมด",
        };
      case "inbound":
        return {
          title: "AMSS++",
          description: "นำเข้าและตรวจสอบประวัติหนังสือรับจากระบบ AMSS++",
        };
      case "cert":
        return {
          title: "เกียรติบัตร",
          description: "สร้างและพิมพ์เกียรติบัตรออนไลน์",
        };
      case "issue":
      default:
        return {
          title: "ขอเลขหนังสือ",
          description: "ขอออกเลขทะเบียนหนังสือส่ง บันทึกข้อความ และคำสั่ง",
        };
    }
  };

  const currentHeader = getHeaderInfo();

  if (data.loading && data.outboundDocs.length === 0) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-1">
        <PageHeader
          title={currentHeader.title}
          description={currentHeader.description}
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
        title={currentHeader.title}
        description={currentHeader.description}
        icon={ClipboardList}
        gradient="from-orange-600 to-amber-600"
      />

      {/* Views */}
      {filters.view === "cert" ? (
        <CertView onBack={() => filters.setView("inbound")} />
      ) : filters.view === "outbound_history" ? (
        <OutboundHistoryView
          sections={data.sections}
          outboundDocs={data.outboundDocs}
          inboundDocs={data.inboundDocs}
          onRefresh={data.loadData}
          onCancelDocClick={(id) => setDocToCancel(id)}
          searchQuery={filters.searchQuery}
          setSearchQuery={filters.setSearchQuery}
          selectedDocType={filters.selectedDocType}
          setSelectedDocType={filters.setSelectedDocType}
          selectedYear={filters.selectedYearTable}
          setSelectedYear={filters.setSelectedYearTable}
          selectedStatus={filters.selectedStatus}
          setSelectedStatus={filters.setSelectedStatus}
        />
      ) : filters.view === "issue" ? (
        <OutboundView
          sections={data.sections}
          outboundDocs={data.outboundDocs}
          issuing={issuing}
          onIssueSubmit={handleFormIssue}
          onRefresh={data.loadData}
          username={session?.user?.name || ""}
          department={(session?.user as any)?.subjectGroup || ""}
          onGoToHistory={() => filters.setView("outbound_history")}
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
          currentUserId={session?.user?.id}
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
