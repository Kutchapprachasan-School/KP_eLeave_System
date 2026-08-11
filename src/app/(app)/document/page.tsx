"use client";

import { useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { ClipboardList, RefreshCw } from "lucide-react";

import { quickIssueDoc, cancelDoc, restoreDoc, updateOutboundDoc, requestDocAction, approveDocRequest, rejectDocRequest } from "@/app/actions/document";
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

  const handleRestoreDoc = async (id: string) => {
    try {
      const res = await restoreDoc(id);
      if (res.success) {
        showToast("คืนค่าเลขทะเบียนกลับเป็นปกติเรียบร้อยแล้ว", "success");
        await data.loadData();
      } else {
        showToast(res.error || "คืนค่าเลขทะเบียนล้มเหลว", "error");
      }
    } catch (err: any) {
      showToast(err.message || "คืนค่าเลขทะเบียนล้มเหลว", "error");
    }
  };

  const handleUpdateDoc = async (id: string, updateData: { title: string; to?: string; origin?: string; requester?: string; signeeName?: string; signeePosition?: string }) => {
    try {
      const res = await updateOutboundDoc(id, updateData);
      if (res.success) {
        showToast("บันทึกการแก้ไขข้อมูลเอกสารเรียบร้อยแล้ว", "success");
        await data.loadData();
        return true;
      } else {
        showToast(res.error || "บันทึกการแก้ไขล้มเหลว", "error");
        return false;
      }
    } catch (err: any) {
      showToast(err.message || "บันทึกการแก้ไขล้มเหลว", "error");
      return false;
    }
  };

  const handleRequestDocAction = async (id: string, type: "CANCEL" | "EDIT" | "RESTORE", payload?: any) => {
    try {
      const res = await requestDocAction(id, type, payload);
      if (res.success) {
        showToast("ยื่นคำร้องขอเรียบร้อยแล้ว รอเจ้าหน้าที่ธุรการหรือแอดมินอนุมัติ", "success");
        await data.loadData();
        return true;
      } else {
        showToast(res.error || "ยื่นคำร้องขอไม่สำเร็จ", "error");
        return false;
      }
    } catch (err: any) {
      showToast(err.message || "เกิดข้อผิดพลาดในการยื่นคำร้องขอ", "error");
      return false;
    }
  };

  const handleApproveDocRequest = async (id: string) => {
    try {
      const res = await approveDocRequest(id);
      if (res.success) {
        showToast("อนุมัติคำร้องขอจัดการเอกสารเรียบร้อยแล้ว", "success");
        await data.loadData();
        return true;
      } else {
        showToast(res.error || "อนุมัติคำร้องขอไม่สำเร็จ", "error");
        return false;
      }
    } catch (err: any) {
      showToast(err.message || "เกิดข้อผิดพลาดในการอนุมัติคำร้องขอ", "error");
      return false;
    }
  };

  const handleRejectDocRequest = async (id: string, reason?: string) => {
    try {
      const res = await rejectDocRequest(id, reason);
      if (res.success) {
        showToast("ปฏิเสธคำร้องขอเรียบร้อยแล้ว", "success");
        await data.loadData();
        return true;
      } else {
        showToast(res.error || "ปฏิเสธคำร้องขอไม่สำเร็จ", "error");
        return false;
      }
    } catch (err: any) {
      showToast(err.message || "เกิดข้อผิดพลาดในการปฏิเสธคำร้องขอ", "error");
      return false;
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

  const isUserAdmin = session?.user?.role === "ADMIN" || (session?.user as any)?.position === "แอดมิน";
  const canAccessAmss = data.enableAmssSync || isUserAdmin;
  const canAccessCert = data.enableCertificate || isUserAdmin;

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
        canAccessCert ? (
          <CertView onBack={() => filters.setView("inbound")} />
        ) : (
          <div className="p-8 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center space-y-3">
            <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">
              🔒 ระบบออกเกียรติบัตรถูกปิดใช้งานชั่วคราว
            </h3>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              ผู้ดูแลระบบได้ทำการปิดใช้งานฟังก์ชันออกเกียรติบัตรไว้ หากต้องการใช้งานโปรดติดต่อแอดมินระบบ
            </p>
            <button
              type="button"
              onClick={() => filters.setView("issue")}
              className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition"
            >
              กลับสู่หน้าหลักขอเลขหนังสือ
            </button>
          </div>
        )
      ) : filters.view === "outbound_history" ? (
        <OutboundHistoryView
          sections={data.sections}
          outboundDocs={data.outboundDocs}
          inboundDocs={data.inboundDocs}
          onRefresh={data.loadData}
          onCancelDocClick={(id) => setDocToCancel(id)}
          onRestoreDocClick={handleRestoreDoc}
          onUpdateDocClick={handleUpdateDoc}
          onRequestDocAction={handleRequestDocAction}
          onApproveDocRequest={handleApproveDocRequest}
          onRejectDocRequest={handleRejectDocRequest}
          searchQuery={filters.searchQuery}
          setSearchQuery={filters.setSearchQuery}
          selectedDocType={filters.selectedDocType}
          setSelectedDocType={filters.setSelectedDocType}
          selectedSectionId={filters.selectedSectionId}
          setSelectedSectionId={filters.setSelectedSectionId}
          selectedYear={filters.selectedYearTable}
          setSelectedYear={filters.setSelectedYearTable}
          selectedStatus={filters.selectedStatus}
          setSelectedStatus={filters.setSelectedStatus}
          currentUserId={session?.user?.id}
          currentUser={{
            id: session?.user?.id,
            name: session?.user?.name || undefined,
            username: (session?.user as any)?.username || undefined,
            role: (session?.user as any)?.role || undefined,
            position: (session?.user as any)?.position || undefined,
          }}
          documentManageMode={data.documentManageMode}
          docAdminUserIds={data.docAdminUserIds}
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
        canAccessAmss ? (
          <InboundView
            sections={data.sections}
            outboundDocs={data.outboundDocs}
            inboundDocs={data.inboundDocs}
            amssCredsExist={data.amssCredsExist}
            autoBrowserTrigger={autoBrowserTrigger}
            enableAmssSync={data.enableAmssSync}
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
        ) : (
          <div className="p-8 rounded-3xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-center space-y-3">
            <h3 className="text-base font-bold text-sky-900 dark:text-sky-200">
              🔒 ระบบเชื่อมโยง AMSS++ ถูกปิดใช้งานชั่วคราว
            </h3>
            <p className="text-xs text-sky-700 dark:text-sky-300">
              ผู้ดูแลระบบได้ทำการปิดใช้งานฟังก์ชันดึงและเชื่อมโยงหนังสือรับจาก AMSS++ ไว้ หากต้องการใช้งานโปรดติดต่อแอดมินระบบ
            </p>
            <button
              type="button"
              onClick={() => filters.setView("issue")}
              className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 transition"
            >
              กลับสู่หน้าหลักขอเลขหนังสือ
            </button>
          </div>
        )
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
