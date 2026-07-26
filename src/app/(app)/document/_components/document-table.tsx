"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Search, RefreshCw, X, FolderOpen, Eye, Ban, ShieldAlert, AlertTriangle, Link2, Copy, ChevronLeft, ChevronRight } from "lucide-react";
import { getDocTypeThaiLabel } from "@/lib/document-utils";

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
}: DocumentTableProps) {
  const [localTab, setLocalTab] = useState<"outbound" | "inbound">(activeTab);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

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
          d.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.docNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.requester?.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesType =
          !selectedDocType ||
          (selectedDocType === "MEMO" && d.docType === "MEMO") ||
          (selectedDocType === "COMMAND" && d.docType === "COMMAND") ||
          (selectedDocType === "OUTGOING_NORMAL" && (d.docType === "OUTGOING_NORMAL" || d.docType === "OUTGOING")) ||
          (selectedDocType === "OUTGOING" && (d.docType === "OUTGOING" || d.docType === "OUTGOING_NORMAL")) ||
          (selectedDocType === "OUTGOING_CIRCULAR" && d.docType === "OUTGOING_CIRCULAR") ||
          (selectedDocType === "ANNOUNCEMENT" && d.docType === "ANNOUNCEMENT") ||
          d.memoSectionId === selectedDocType;

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
          (selectedStatus === "PENDING" && (d.status === "PENDING" || d.status === "ROUTING")) ||
          d.status === selectedStatus;

        return matchesSearch && matchesType && matchesYear && matchesTimeRange && matchesStatus;
      });
    }
  }, [localTab, outboundDocs, inboundDocs, searchQuery, selectedDocType, selectedYear, selectedTimeRange, selectedStatus]);

  // Paginated rows
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

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
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-indigo-600" />
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl gap-1 border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setLocalTab("outbound")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                localTab === "outbound"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              📝 ทะเบียนออกเลขส่ง ({outboundDocs.length})
            </button>
            <button
              type="button"
              onClick={() => setLocalTab("inbound")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                localTab === "inbound"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              📥 ทะเบียนรับหนังสือ ({inboundDocs.length})
            </button>
          </div>
        </div>
        
        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold text-slate-600 dark:text-slate-400 transition cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          รีเฟรช
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
              <option value="COMMAND">คำสั่ง</option>
              <option value="OUTGOING_NORMAL">หนังสือส่ง (ปกติ)</option>
              <option value="OUTGOING_CIRCULAR">หนังสือส่ง (จดหมายเวียน)</option>
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
                <th className="py-3.5 px-4 font-semibold">เรื่อง</th>
                <th className="py-3.5 px-4 font-semibold">ผู้ขอ</th>
                <th className="py-3.5 px-4 font-semibold">เวลาออกเลข</th>
                <th className="py-3.5 px-4 text-right">จัดการ</th>
              </tr>
            ) : (
              <tr>
                <th className="py-3.5 px-4 font-semibold">เลขทะเบียนรับ</th>
                <th className="py-3.5 px-4 font-semibold">อ้างอิงหนังสือ (ที่)</th>
                <th className="py-3.5 px-4 font-semibold">เรื่อง</th>
                <th className="py-3.5 px-4 font-semibold">จากหน่วยงาน</th>
                <th className="py-3.5 px-4 font-semibold">วันที่ลงรับ</th>
                <th className="py-3.5 px-4 text-right">จัดการ</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400 dark:text-slate-500 font-medium">
                  <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
                  ไม่พบรายการเอกสารในหน้านี้
                </td>
              </tr>
            ) : (
              paginatedRows.map((d) => {
                if (localTab === "outbound") {
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {d.docNo}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">
                        {getDocTypeThaiLabel(d.docType, d.memoSection?.name)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 max-w-xs truncate" title={d.title}>
                        {d.title}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {d.requester || d.origin || "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {d.date ? new Date(d.date).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }) : "-"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex gap-1.5 justify-end">
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
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {d.receiveNo}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono">
                        {d.docRefNo || <span className="text-slate-400 italic">ไม่มีเลข</span>}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 max-w-xs truncate" title={d.title}>
                        {d.title}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {d.senderOrg}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium">
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
    </div>
  );
}
