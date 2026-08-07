"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Search, RefreshCw, X, FolderOpen, Eye, Ban, ShieldAlert, AlertTriangle, Link2, Copy, ChevronLeft, ChevronRight, Trash2, Edit3, FileSpreadsheet, Printer } from "lucide-react";
import { getDocTypeThaiLabel } from "@/lib/document-utils";
import { parseDocRefAndUrgency } from "@/lib/amss-list-parser";
import { deleteIncomingDoc } from "@/app/actions/incoming";
import { updateDocumentDetails } from "@/app/actions/document";
import { SlideOverSheet } from "@/features/document/ui/components/slide-over-sheet";
import { DocumentReportModal } from "@/features/document/ui/components/document-report-modal";

type MemoSection = { id: string; name: string; code: string; color?: string };

type DocumentTableProps = {
  activeTab: "outbound" | "inbound";
  outboundDocs: any[];
  inboundDocs: any[];
  sections: MemoSection[];
  onRefresh: () => void;
  onCancelDocClick: (id: string) => void;
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
  userRole?: string;
};

export default function DocumentTable({
  activeTab,
  outboundDocs,
  inboundDocs,
  sections,
  onRefresh,
  onCancelDocClick,
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
  userRole,
}: DocumentTableProps) {
  const [localTab, setLocalTab] = useState<"outbound" | "inbound">(activeTab);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({ title: "", to: "", origin: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const isAdminUser = userRole === "ADMIN" || userRole === "SUPERADMIN" || userRole === "DOCUMENT_ADMIN";
  const canEditOrCancelDoc = (doc: any) => isAdminUser || (currentUserId && doc.createdById === currentUserId);

  useEffect(() => {
    setLocalTab(activeTab);
  }, [activeTab]);

  // Reset pagination when active tab or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [localTab, searchQuery, selectedDocType, selectedSectionId, selectedYear, selectedTimeRange, selectedStatus]);

  // Active memo section resolution for custom color theme
  const activeSection = useMemo(() => {
    if (selectedSectionId) {
      return sections.find((s) => s.id === selectedSectionId);
    }
    return sections.find((s) => s.id === selectedDocType);
  }, [sections, selectedSectionId, selectedDocType]);

  const activeBadgeStyle = useMemo(() => {
    if (activeSection?.color) {
      const color = activeSection.color;
      return {
        style: {
          backgroundColor: `${color}15`,
          borderColor: `${color}50`,
          color: color,
        },
        iconColor: color,
      };
    }
    return {
      style: undefined,
      iconColor: undefined,
    };
  }, [activeSection]);

  const handleOpenEdit = (doc: any) => {
    setEditingDoc(doc);
    setEditFormData({
      title: doc.title || "",
      to: doc.to || "",
      origin: doc.origin || doc.department || "",
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc || editSaving) return;
    setEditSaving(true);
    try {
      const res = await updateDocumentDetails(editingDoc.id, editFormData);
      if (res.success) {
        setEditingDoc(null);
        onRefresh();
      } else {
        alert(res.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setEditSaving(false);
    }
  };

  // Filters logic
  const filteredData = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;

    if (localTab === "outbound") {
      return outboundDocs.filter((d) => {
        const matchesSearch =
          !searchQuery.trim() ||
          Boolean(d.title?.toLowerCase().includes(searchQuery.toLowerCase())) ||
          Boolean(d.docNo?.toLowerCase().includes(searchQuery.toLowerCase())) ||
          Boolean(d.requester?.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const targetDocType = (d.docType || "").toUpperCase();
        const selDocType = (selectedDocType || "").toUpperCase();

        const matchesType =
          !selectedDocType ||
          (selDocType === "MEMO" && targetDocType === "MEMO") ||
          (selDocType === "COMMAND" && targetDocType === "COMMAND") ||
          (selDocType === "ANNOUNCEMENT" && targetDocType === "ANNOUNCEMENT") ||
          (selDocType.startsWith("OUTGOING") && targetDocType.startsWith("OUTGOING"));

        const matchesSection =
          !selectedSectionId ||
          d.memoSectionId === selectedSectionId ||
          d.memoSection?.id === selectedSectionId;

        const docDate = new Date(d.date);
        const docYear = docDate.getFullYear() + 543;
        const matchesYear = !selectedYear || docYear.toString() === selectedYear;

        let matchesTimeRange = true;
        if (selectedTimeRange === "this_week") {
          matchesTimeRange = docDate.getTime() >= oneWeekAgo;
        } else if (selectedTimeRange === "this_month") {
          matchesTimeRange = docDate.getFullYear() === now.getFullYear() && docDate.getMonth() === now.getMonth();
        } else if (selectedTimeRange === "this_year") {
          matchesTimeRange = docDate.getFullYear() === now.getFullYear();
        }

        const matchesStatus =
          !selectedStatus ||
          d.status === selectedStatus;

        return matchesSearch && matchesType && matchesSection && matchesYear && matchesTimeRange && matchesStatus;
      });
    } else {
      const list = inboundDocs.filter((d) => {
        const matchesSearch =
          !searchQuery.trim() ||
          Boolean(d.title?.toLowerCase().includes(searchQuery.toLowerCase())) ||
          Boolean(d.receiveNo?.toLowerCase().includes(searchQuery.toLowerCase())) ||
          Boolean(d.senderOrg?.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesType =
          !selectedDocType ||
          (selectedDocType === "AMSS" && Boolean(d.amssOriginId)) ||
          (selectedDocType === "MANUAL" && !d.amssOriginId);

        const matchesSection =
          !selectedSectionId ||
          d.memoSectionId === selectedSectionId ||
          d.memoSection?.id === selectedSectionId;

        const docDate = new Date(d.receiveDate);
        const docYear = docDate.getFullYear() + 543;
        const matchesYear = !selectedYear || docYear.toString() === selectedYear;

        let matchesTimeRange = true;
        if (selectedTimeRange === "this_week") {
          matchesTimeRange = docDate.getTime() >= oneWeekAgo;
        } else if (selectedTimeRange === "this_month") {
          matchesTimeRange = docDate.getFullYear() === now.getFullYear() && docDate.getMonth() === now.getMonth();
        } else if (selectedTimeRange === "this_year") {
          matchesTimeRange = docDate.getFullYear() === now.getFullYear();
        }

        const matchesStatus =
          !selectedStatus ||
          d.status === selectedStatus;

        return matchesSearch && matchesType && matchesSection && matchesYear && matchesTimeRange && matchesStatus;
      });

      return list.sort((a, b) => {
        const tA = new Date(a.receiveDate || a.createdAt || 0).getTime();
        const tB = new Date(b.receiveDate || b.createdAt || 0).getTime();
        return tB - tA;
      });
    }
  }, [localTab, outboundDocs, inboundDocs, searchQuery, selectedDocType, selectedSectionId, selectedYear, selectedTimeRange, selectedStatus]);

  // Paginated rows
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const getActiveDocTypeTitle = () => {
    if (localTab !== "outbound") {
      return `ทะเบียนรับหนังสือราชการ (${filteredData.length} รายการ)`;
    }

    let baseTitle = "ทะเบียนออกเลขหนังสือทั้งหมด";
    if (selectedDocType === "MEMO") {
      baseTitle = "ทะเบียนออกเลขบันทึกข้อความ";
    } else if (selectedDocType === "OUTGOING" || selectedDocType.startsWith("OUTGOING")) {
      baseTitle = "ทะเบียนออกเลขหนังสือส่ง";
    } else if (selectedDocType === "COMMAND") {
      baseTitle = "ทะเบียนออกเลขคำสั่ง";
    } else if (selectedDocType === "ANNOUNCEMENT") {
      baseTitle = "ทะเบียนออกเลขประกาศ";
    }

    if (activeSection) {
      if (selectedDocType === "MEMO" || !selectedDocType) {
        baseTitle = `ทะเบียนออกเลขบันทึกข้อความ - ${activeSection.name}`;
      } else {
        baseTitle = `${baseTitle} - ${activeSection.name}`;
      }
    }

    return `${baseTitle} (${filteredData.length} รายการ)`;
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedDocType("");
    if (setSelectedSectionId) setSelectedSectionId("");
    setSelectedYear("");
    setSelectedTimeRange("");
    setSelectedStatus("");
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
      {/* Table Title and Toolbar */}
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap gap-2">
        <div
          className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border font-bold transition-all ${
            !activeBadgeStyle.style
              ? "bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-100 dark:border-indigo-900/60 text-indigo-950 dark:text-indigo-200"
              : ""
          }`}
          style={activeBadgeStyle.style ? activeBadgeStyle.style : undefined}
        >
          <FolderOpen
            className="w-4.5 h-4.5"
            style={{ color: activeBadgeStyle.iconColor || undefined }}
          />
          <h3 className="text-sm font-extrabold">
            {getActiveDocTypeTitle()}
          </h3>
        </div>
        
        <button
          type="button"
          onClick={async () => {
            setIsRefreshing(true);
            if (onRefresh) await onRefresh();
            setTimeout(() => setIsRefreshing(false), 600);
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer shadow-2xs active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-indigo-600 dark:text-indigo-400" : ""}`} />
          <span>{isRefreshing ? "กำลังโหลด..." : "รีเฟรช"}</span>
        </button>
      </div>

      {/* Toolbar filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={localTab === "outbound" ? "ค้นหาเลขเดิม/เรื่อง/ผู้ขอ..." : "ค้นหาเลขรับ/อ้างอิง/เรื่อง/ผู้ส่ง..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-950/50 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all outline-none"
          />
        </div>

        {/* Dropdown 1: ประเภทหนังสือหลัก */}
        <select
          value={selectedDocType}
          onChange={(e) => setSelectedDocType(e.target.value)}
          className="h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-950/50 text-sm cursor-pointer focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium"
        >
          <option value="">ประเภทหนังสือทั้งหมด</option>
          {activeTab === "outbound" ? (
            <>
              <option value="MEMO">บันทึกข้อความ</option>
              <option value="OUTGOING">หนังสือส่ง</option>
              <option value="COMMAND">คำสั่ง</option>
              <option value="ANNOUNCEMENT">ประกาศ</option>
            </>
          ) : (
            <>
              <option value="AMSS">ดึงจาก AMSS++</option>
              <option value="MANUAL">กรอกข้อมูลเอง</option>
            </>
          )}
        </select>

        {/* Dropdown 2: หมวดหมู่งานย่อย (สำหรับบันทึกข้อความ) */}
        {activeTab === "outbound" && (
          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId?.(e.target.value)}
            className="h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-950/50 text-sm cursor-pointer focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium"
          >
            <option value="">หมวดหมู่งานย่อยทั้งหมด</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        )}

        <select
          value={selectedTimeRange}
          onChange={(e) => setSelectedTimeRange(e.target.value)}
          className="h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-950/50 text-sm cursor-pointer focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium"
        >
          <option value="">ช่วงเวลาทั้งหมด</option>
          <option value="this_week">สัปดาห์นี้</option>
          <option value="this_month">เดือนนี้</option>
          <option value="this_year">ปีนี้</option>
        </select>

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-950/50 text-sm cursor-pointer focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium"
        >
          <option value="">ปี พ.ศ. ทั้งหมด</option>
          <option value="2569">2569</option>
          <option value="2568">2568</option>
          <option value="2567">2567</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-950/50 text-sm cursor-pointer focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium"
        >
          <option value="">สถานะทั้งหมด</option>
          {activeTab === "outbound" ? (
            <>
              <option value="ISSUED">ออกเลขสำเร็จ</option>
              <option value="PRINTED">พิมพ์แล้ว</option>
              <option value="CANCELLED">ยกเลิก</option>
            </>
          ) : (
            <>
              <option value="PENDING">รอมอบหมาย</option>
              <option value="ROUTING">มอบหมายแล้ว</option>
              <option value="COMPLETED">เกษียณ / เสร็จสิ้น</option>
              <option value="CANCELLED">ยกเลิก</option>
            </>
          )}
        </select>

        {(searchQuery || selectedDocType || selectedSectionId || selectedYear || selectedTimeRange || selectedStatus) && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 h-10 rounded-xl text-sm font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
            ล้างตัวกรอง
          </button>
        )}

        {isAdminUser && (
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 h-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 ml-auto"
          >
            <FileSpreadsheet className="w-4 h-4" />
            ออกรายงาน (PDF/Excel)
          </button>
        )}
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-2xl">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50/80 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
            {localTab === "outbound" ? (
              <tr>
                <th className="py-3.5 px-4 font-semibold">เลขที่</th>
                <th className="py-3.5 px-4 font-semibold">ประเภท</th>
                <th className="py-3.5 px-4 font-semibold">วันที่</th>
                <th className="py-3.5 px-4 font-semibold">เรื่อง</th>
                <th className="py-3.5 px-4 font-semibold">ผู้ขอ</th>
                <th className="py-3.5 px-4 text-right">จัดการ</th>
              </tr>
            ) : (
              <tr>
                <th className="py-3.5 px-4 font-semibold">เลขทะเบียนรับ</th>
                <th className="py-3.5 px-4 font-semibold">อ้างอิงหนังสือ (ที่)</th>
                <th className="py-3.5 px-4 font-semibold">เรื่อง</th>
                <th className="py-3.5 px-4 font-semibold">สถานะ</th>
                <th className="py-3.5 px-4 font-semibold">จากหน่วยงาน</th>
                <th className="py-3.5 px-4 font-semibold">วันที่ลงรับ</th>
                <th className="py-3.5 px-4 text-right">จัดการ</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500 font-medium">
                  <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
                  ไม่พบรายการเอกสารในหน้านี้
                </td>
              </tr>
            ) : (
              paginatedRows.map((d) => {
                if (localTab === "outbound") {
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono font-medium text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        {d.docNo ? (
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(d)}
                            className="hover:underline hover:text-indigo-700 dark:hover:text-indigo-300 font-bold transition text-left cursor-pointer"
                            title="คลิกเพื่อดูรายละเอียดเอกสาร"
                          >
                            {d.docNo}
                          </button>
                        ) : (
                          <span className="text-amber-500 text-xs">รอออกเลข</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {(() => {
                          const sec = sections.find((s) => s.id === d.memoSectionId || s.name === d.memoSection?.name);
                          const color = sec?.color || "#6366f1";
                          const label = getDocTypeThaiLabel(d.docType, d.memoSection?.name);
                          
                          return (
                            <span 
                              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${
                                !sec ? "bg-slate-100/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300" : ""
                              }`}
                              style={
                                sec
                                  ? {
                                      backgroundColor: `${color}15`,
                                      borderColor: `${color}40`,
                                      color: color,
                                    }
                                  : undefined
                              }
                            >
                              {label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium whitespace-nowrap">
                        {d.date ? new Date(d.date).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }) : "-"}
                      </td>
                      <td className="py-3 px-4 font-normal text-slate-800 dark:text-slate-200 max-w-xs truncate" title={d.title}>
                        {d.title}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {d.requester || d.origin || "-"}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex gap-1.5 justify-end items-center">
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(d)}
                            className="w-7 h-7 rounded-lg border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition flex items-center justify-center cursor-pointer"
                            title="ดูรายละเอียดฉบับนี้"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {canEditOrCancelDoc(d) && d.status !== "CANCELLED" && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(d)}
                              className="w-7 h-7 rounded-lg border border-amber-200 dark:border-amber-800/80 bg-amber-50/50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition flex items-center justify-center cursor-pointer"
                              title="แก้ไขข้อมูลหนังสือฉบับนี้"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canEditOrCancelDoc(d) && d.status !== "CANCELLED" && (
                            <button
                              type="button"
                              onClick={() => onCancelDocClick(d.id)}
                              className="px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition text-[11px] font-semibold cursor-pointer"
                              title="ยกเลิกเลขทะเบียนนี้"
                            >
                              ยกเลิกเลข
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                } else {
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono font-medium text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(d)}
                          className="hover:underline hover:text-indigo-700 dark:hover:text-indigo-300 font-bold transition text-left cursor-pointer"
                          title="คลิกเพื่อดูรายละเอียดหนังสือรับ"
                        >
                          {d.receiveNo}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {(() => {
                          const rawRef = d.docRefNo || "";
                          const { cleanRef, urgencyLevel: parsedLevel, urgencyText: parsedText } = parseDocRefAndUrgency(rawRef);
                          
                          let level = d.urgencyLevel && d.urgencyLevel !== "NORMAL" ? d.urgencyLevel : parsedLevel;
                          let text = parsedText;
                          if (!text || text === "ปกติ") {
                            if (level === "URGENT_MOST" || level === "HIGH" || level === "VERY_URGENT") text = "ด่วนที่สุด";
                            else if (level === "URGENT_MORE") text = "ด่วนมาก";
                            else if (level === "URGENT" || level === "FAST") text = "ด่วน";
                            else text = "ปกติ";
                          }

                          const badgeClass =
                            text === "ด่วนที่สุด"
                              ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 font-bold"
                              : text === "ด่วนมาก"
                              ? "bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800 font-medium"
                              : text === "ด่วน"
                              ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-medium"
                              : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-normal";

                          return (
                            <div className="flex flex-col items-start gap-1">
                              <span className="font-normal text-slate-800 dark:text-slate-200">{cleanRef || <span className="text-slate-400 italic font-sans text-xs">ไม่มีเลข</span>}</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] border ${badgeClass}`}>
                                {text}
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 font-normal text-slate-800 dark:text-slate-200 max-w-xs truncate" title={d.title}>
                        {d.title}
                      </td>
                      <td className="py-3 px-4">
                        {d.routingSteps?.some((s: any) => s.status === "PENDING" && s.assigneeId === currentUserId) ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-purple-600 text-white shadow-xs">
                            ถึงคิวคุณเกษียณสั่งการ
                          </span>
                        ) : d.status === "COMPLETED" ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            เกษียณแล้ว
                          </span>
                        ) : d.status === "ROUTING" ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            มอบหมายแล้ว
                          </span>
                        ) : d.status === "CANCELLED" ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            ยกเลิก
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            รอมอบหมาย
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {d.senderOrg}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium whitespace-nowrap">
                        {new Date(d.receiveDate).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex gap-1.5 justify-end">
                          {(d.amssLink || d.attachmentUrl) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const urlToCopy = d.amssLink || d.attachmentUrl;
                                navigator.clipboard.writeText(urlToCopy);
                                window.open(urlToCopy, "_blank");
                              }}
                              className="w-7 h-7 rounded-lg border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition flex items-center justify-center cursor-pointer"
                              title="คัดลอกลิงก์ URL และเปิดดูเอกสาร"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <Link
                            href={`/document/incoming/${d.id}`}
                            className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center"
                            title="ดูรายละเอียด"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm(`คุณต้องการลบหนังสือรับ "${d.title}" ออกจากทะเบียนหรือไม่?`)) {
                                await deleteIncomingDoc(d.id);
                                if (onRefresh) onRefresh();
                              }
                            }}
                            className="w-7 h-7 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition flex items-center justify-center cursor-pointer ml-1"
                            title="ลบหนังสือรับนี้ออกจากทะเบียน"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Full Enterprise Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
          <span>แสดง</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>รายการ/หน้า</span>
          <span className="ml-2 text-slate-400 font-mono">
            ({filteredData.length > 0 ? `${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, filteredData.length)} จาก ${filteredData.length}` : "0 จาก 0"} รายการ)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            ย้อนกลับ
          </button>

          <span className="px-3 text-slate-600 dark:text-slate-400 font-bold font-mono">
            หน้า {currentPage} / {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer flex items-center gap-1"
          >
            ถัดไป
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Slide-Over Sheet for Document Details Preview */}
      <SlideOverSheet
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.docNo || previewDoc?.receiveNo || "รายละเอียดเอกสาร"}
        description={previewDoc?.title || "ข้อมูลรายละเอียดเอกสารที่บันทึกในระบบ"}
      >
        {previewDoc && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-indigo-500 uppercase">
                  เลขที่เอกสาร
                </span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                  {previewDoc.docNo || previewDoc.receiveNo || "-"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">เรื่อง</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {previewDoc.title}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                <span className="text-[10px] text-slate-400 block font-medium">เรียน / ถึง</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {previewDoc.to || "-"}
                </p>
              </div>
              <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                <span className="text-[10px] text-slate-400 block font-medium">จากหน่วยงาน / ผู้ขอ</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {previewDoc.requester || previewDoc.origin || previewDoc.senderOrg || "-"}
                </p>
              </div>
            </div>

            {previewDoc.content && (
              <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block font-medium">รายละเอียดเพิ่มเติม</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {previewDoc.content}
                </p>
              </div>
            )}
          </div>
        )}
      </SlideOverSheet>

      {/* Edit Document Details Modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-500" />
                แก้ไขข้อมูลหนังสือ ({editingDoc.docNo || "ยังไม่ออกเลข"})
              </h3>
              <button
                onClick={() => setEditingDoc(null)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  เรื่อง *
                </label>
                <textarea
                  rows={3}
                  required
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none resize-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  เรียน / ถึง *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.to}
                  onChange={(e) => setEditFormData({ ...editFormData, to: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  หน่วยงานเจ้าของเรื่อง / จากหน่วยงาน *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.origin}
                  onChange={(e) => setEditFormData({ ...editFormData, origin: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 h-9 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-4 h-9 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold transition cursor-pointer"
                >
                  {editSaving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Report Modal */}
      <DocumentReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
}
