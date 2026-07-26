"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Search, RefreshCw, X, FolderOpen, Eye, Ban, ShieldAlert, AlertTriangle, Link2, Copy, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { getDocTypeThaiLabel } from "@/lib/document-utils";
import { deleteIncomingDoc } from "@/app/actions/incoming";
import { SlideOverSheet } from "@/features/document/ui/components/slide-over-sheet";

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
  selectedYear: string;
  setSelectedYear: (val: string) => void;
  selectedStatus: string;
  setSelectedStatus: (val: string) => void;
  currentUserId?: string;
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
  selectedYear,
  setSelectedYear,
  selectedStatus,
  setSelectedStatus,
  currentUserId,
}: DocumentTableProps) {
  const [localTab, setLocalTab] = useState<"outbound" | "inbound">(activeTab);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setLocalTab(activeTab);
  }, [activeTab]);

  // Reset pagination when active tab or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [localTab, searchQuery, selectedDocType, selectedYear, selectedTimeRange, selectedStatus]);

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
          (selDocType.startsWith("OUTGOING") && targetDocType.startsWith("OUTGOING")) ||
          d.memoSectionId === selectedDocType ||
          d.memoSection?.id === selectedDocType;

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

        return matchesSearch && matchesType && matchesYear && matchesTimeRange && matchesStatus;
      });
    } else {
      return inboundDocs.filter((d) => {
        const matchesSearch =
          !searchQuery.trim() ||
          Boolean(d.title?.toLowerCase().includes(searchQuery.toLowerCase())) ||
          Boolean(d.receiveNo?.toLowerCase().includes(searchQuery.toLowerCase())) ||
          Boolean(d.senderOrg?.toLowerCase().includes(searchQuery.toLowerCase())) ||
          Boolean(d.docRefNo?.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesType =
          !selectedDocType ||
          (selectedDocType === "AMSS" && Boolean(d.amssOriginId || d.amssLink)) ||
          (selectedDocType === "MANUAL" && !d.amssOriginId && !d.amssLink) ||
          d.memoSectionId === selectedDocType;

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
          (selectedStatus === "MY_PENDING" && d.routingSteps?.some((s: any) => s.status === "PENDING" && s.assigneeId === currentUserId)) ||
          (selectedStatus === "PENDING" && (d.status === "PENDING" || d.status === "ROUTING")) ||
          d.status === selectedStatus;

        return matchesSearch && matchesType && matchesYear && matchesTimeRange && matchesStatus;
      });
    }
  }, [localTab, outboundDocs, inboundDocs, searchQuery, selectedDocType, selectedYear, selectedTimeRange, selectedStatus, currentUserId]);

  // Paginated rows
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const getActiveDocTypeTitle = () => {
    if (localTab !== "outbound") {
      return `ทะเบียนรับหนังสือราชการ (${filteredData.length} รายการ)`;
    }
    if (!selectedDocType) {
      return `ทะเบียนออกเลขหนังสือทั้งหมด (${filteredData.length} รายการ)`;
    }
    if (selectedDocType === "MEMO") {
      return `ทะเบียนออกเลขบันทึกข้อความ (${filteredData.length} รายการ)`;
    }
    if (selectedDocType === "OUTGOING" || selectedDocType.startsWith("OUTGOING")) {
      return `ทะเบียนออกเลขหนังสือส่ง (${filteredData.length} รายการ)`;
    }
    if (selectedDocType === "COMMAND") {
      return `ทะเบียนออกเลขคำสั่ง (${filteredData.length} รายการ)`;
    }
    if (selectedDocType === "ANNOUNCEMENT") {
      return `ทะเบียนออกเลขประกาศ (${filteredData.length} รายการ)`;
    }
    const sec = sections.find((s) => s.id === selectedDocType);
    if (sec) {
      return `ทะเบียนออกเลขบันทึกข้อความ - ${sec.name} (${filteredData.length} รายการ)`;
    }
    return `ทะเบียนออกเลขหนังสือ (${filteredData.length} รายการ)`;
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedDocType("");
    setSelectedYear("");
    setSelectedTimeRange("");
    setSelectedStatus("");
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
      {/* Table Title and Toolbar */}
      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2.5 bg-indigo-50/80 dark:bg-indigo-950/50 px-3.5 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
          <FolderOpen className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-extrabold text-indigo-950 dark:text-indigo-200">
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

        <select
          value={selectedDocType}
          onChange={(e) => setSelectedDocType(e.target.value)}
          className="h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-950/50 text-sm cursor-pointer focus:ring-2 focus:ring-indigo-500/20 outline-none"
        >
          <option value="">ประเภททั้งหมด</option>
          {activeTab === "outbound" ? (
            <>
              <option value="MEMO">บันทึกข้อความ</option>
              <option value="OUTGOING">หนังสือส่ง</option>
              <option value="COMMAND">คำสั่ง</option>
              <option value="ANNOUNCEMENT">ประกาศ</option>
              {sections.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </>
          ) : (
            <>
              <option value="AMSS">ดึงจาก AMSS++</option>
              <option value="MANUAL">กรอกข้อมูลเอง</option>
              {sections.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </>
          )}
        </select>

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

        {(searchQuery || selectedDocType || selectedYear || selectedTimeRange || selectedStatus) && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 h-10 rounded-xl text-sm font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
            ล้างตัวกรอง
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
                <th className="py-3.5 px-4 font-semibold">ความเร่งด่วน & สถานะ</th>
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
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        {d.docNo || <span className="text-amber-500 text-xs">รอออกเลข</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                        {getDocTypeThaiLabel(d.docType, d.memoSection?.name)}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium whitespace-nowrap">
                        {d.date ? new Date(d.date).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }) : "-"}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 max-w-xs truncate" title={d.title}>
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
                          {d.status !== "CANCELLED" && (
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
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {d.receiveNo}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono">
                        {d.docRefNo || <span className="text-slate-400 italic">ไม่มีเลข</span>}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 max-w-xs truncate" title={d.title}>
                        {d.title}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          {/* Urgency Badge */}
                          {d.urgencyLevel && d.urgencyLevel !== "NORMAL" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              ⚡ {d.urgencyLevel === "HIGH" || d.urgencyLevel === "VERY_URGENT" ? "ด่วนที่สุด" : d.urgencyLevel === "URGENT" ? "ด่วนมาก" : d.urgencyLevel === "FAST" ? "ด่วน" : d.urgencyLevel}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">
                              ปกติ
                            </span>
                          )}

                          {/* Status Badge */}
                          {d.routingSteps?.some((s: any) => s.status === "PENDING" && s.assigneeId === currentUserId) ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-purple-600 text-white shadow-xs animate-pulse">
                              👉 ถึงคิวคุณเกษียณสั่งการ
                            </span>
                          ) : d.status === "COMPLETED" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              ✅ เกษียณ / เสร็จสิ้น
                            </span>
                          ) : d.status === "ROUTING" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              📤 มอบหมายแล้ว
                            </span>
                          ) : d.status === "CANCELLED" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              ❌ ยกเลิก
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              ⏳ รอมอบหมาย
                            </span>
                          )}
                        </div>
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
    </div>
  );
}
