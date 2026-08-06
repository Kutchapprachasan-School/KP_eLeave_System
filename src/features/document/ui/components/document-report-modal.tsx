"use client";

import { useState } from "react";
import { X, FileSpreadsheet, Printer, Download, Filter, Calendar } from "lucide-react";
import { exportDocumentReportAction } from "@/app/actions/document";
import * as XLSX from "xlsx";

type DocumentReportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  lang?: "th" | "en";
};

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

const DOC_TYPE_LABELS: Record<string, string> = {
  ALL: "ทั้งหมดทุกประเภท",
  MEMO: "บันทึกข้อความ",
  OUTGOING_NORMAL: "หนังสือส่ง (ปกติ)",
  OUTGOING_CIRCULAR: "หนังสือส่ง (เวียน)",
  COMMAND: "คำสั่งโรงเรียน",
  ANNOUNCEMENT: "ประกาศโรงเรียน",
  CERTIFICATE: "เกียรติบัตร",
};

export function DocumentReportModal({ isOpen, onClose }: DocumentReportModalProps) {
  const currentYearBE = new Date().getFullYear() + 543;
  const [selectedYear, setSelectedYear] = useState<number>(currentYearBE);
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL"); // "ALL" or "1"..."12"
  const [selectedDocType, setSelectedDocType] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const fetchFilteredDocs = async () => {
    setLoading(true);
    setError(null);
    try {
      const monthNum = selectedMonth === "ALL" ? null : parseInt(selectedMonth, 10);
      const res = await exportDocumentReportAction({
        year: selectedYear,
        month: monthNum,
        docType: selectedDocType === "ALL" ? null : selectedDocType,
      });

      if (!res.success) {
        throw new Error(res.error || "เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน");
      }

      return res.data || [];
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    const docs = await fetchFilteredDocs();
    if (!docs || docs.length === 0) {
      if (!error) setError("ไม่พบรายการเอกสารในเงื่อนไขที่เลือก");
      return;
    }

    const excelData = docs.map((d: any, index: number) => ({
      "ลำดับ": index + 1,
      "เลขที่เอกสาร": d.docNo || "ยังไม่ออกเลข",
      "ประเภท": DOC_TYPE_LABELS[d.docType] || d.docType,
      "ลงวันที่": d.date ? new Date(d.date).toLocaleDateString("th-TH") : "-",
      "เรื่อง": d.title,
      "เรียน / ถึง": d.to,
      "จากหน่วยงาน/สังกัด": d.origin || d.department || "-",
      "ผู้ขอออกเลข": d.requester || d.user?.name || "-",
      "สถานะ": d.status === "ISSUED" ? "ออกเลขแล้ว" : d.status === "CANCELLED" ? "ยกเลิก" : d.status,
      "หมายเหตุยกเลิก": d.cancelReason || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ทะเบียนสารบรรณ");

    worksheet["!cols"] = [
      { wch: 8 },  // ลำดับ
      { wch: 22 }, // เลขที่เอกสาร
      { wch: 18 }, // ประเภท
      { wch: 14 }, // ลงวันที่
      { wch: 45 }, // เรื่อง
      { wch: 25 }, // เรียน/ถึง
      { wch: 25 }, // หน่วยงาน
      { wch: 20 }, // ผู้ขอ
      { wch: 12 }, // สถานะ
      { wch: 25 }, // หมายเหตุ
    ];

    const monthText = selectedMonth === "ALL" ? "ทั้งปี" : `เดือน_${THAI_MONTHS[parseInt(selectedMonth, 10) - 1]}`;
    const docTypeText = selectedDocType === "ALL" ? "รวมทุกประเภท" : selectedDocType;
    const fileName = `รายงานทะเบียนสารบรรณ_${selectedYear}_${monthText}_${docTypeText}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  const handlePrintPDF = async () => {
    const docs = await fetchFilteredDocs();
    if (!docs || docs.length === 0) {
      if (!error) setError("ไม่พบรายการเอกสารในเงื่อนไขที่เลือก");
      return;
    }

    const monthTitle = selectedMonth === "ALL" ? "ประจำปี พ.ศ. " + selectedYear : `ประจำเดือน ${THAI_MONTHS[parseInt(selectedMonth, 10) - 1]} พ.ศ. ${selectedYear}`;
    const docTypeTitle = selectedDocType === "ALL" ? "ทุกประเภทหนังสือ" : DOC_TYPE_LABELS[selectedDocType] || selectedDocType;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("กรุณาอนุญาตให้เปิด Pop-up เพื่อพิมพ์รายงาน PDF");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>รายงานทะเบียนสารบรรณ ${monthTitle}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap');
          body { font-family: 'Sarabun', sans-serif; padding: 20px; color: #1e293b; }
          h2 { text-align: center; margin-bottom: 4px; font-size: 20px; }
          p.subtitle { text-align: center; color: #64748b; margin-top: 0; font-size: 13px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
          th { background-color: #f8fafc; font-weight: 700; color: #0f172a; text-align: center; }
          .text-center { text-align: center; }
          .cancelled { text-decoration: line-through; color: #ef4444; }
          @media print {
            body { padding: 0; }
            @page { size: landscape; margin: 15mm; }
          }
        </style>
      </head>
      <body>
        <h2>รายงานทะเบียนการออกเลขหนังสือราชการ (ระบบสารบรรณ)</h2>
        <p class="subtitle">${docTypeTitle} | ${monthTitle} | จำนวนรวมทั้งสิ้น ${docs.length} รายการ</p>
        <table>
          <thead>
            <tr>
              <th style="width: 50px;">ลำดับ</th>
              <th style="width: 140px;">เลขที่เอกสาร</th>
              <th style="width: 110px;">ประเภท</th>
              <th style="width: 100px;">ลงวันที่</th>
              <th>เรื่อง</th>
              <th>เรียน / ถึง</th>
              <th>หน่วยงานเจ้าของเรื่อง</th>
              <th style="width: 120px;">ผู้ขอออกเลข</th>
              <th style="width: 90px;">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            ${docs.map((d: any, idx: number) => `
              <tr class="${d.status === 'CANCELLED' ? 'cancelled' : ''}">
                <td class="text-center">${idx + 1}</td>
                <td class="text-center" style="font-weight: 600;">${d.docNo || '-'}</td>
                <td class="text-center">${DOC_TYPE_LABELS[d.docType] || d.docType}</td>
                <td class="text-center">${d.date ? new Date(d.date).toLocaleDateString("th-TH") : '-'}</td>
                <td>${d.title}</td>
                <td>${d.to}</td>
                <td>${d.origin || d.department || '-'}</td>
                <td class="text-center">${d.requester || d.user?.name || '-'}</td>
                <td class="text-center">${d.status === 'CANCELLED' ? 'ยกเลิก' : 'ออกเลขแล้ว'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                ส่งออกรายงานทะเบียนสารบรรณ
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                เลือกเงื่อนไขเพื่อออกรายงาน Excel หรือ พิมพ์ PDF
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="space-y-4">
          {/* Year Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-500" />
              ประจำปี พ.ศ. *
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white outline-none cursor-pointer"
            >
              <option value={currentYearBE}>{currentYearBE}</option>
              <option value={currentYearBE - 1}>{currentYearBE - 1}</option>
              <option value={currentYearBE - 2}>{currentYearBE - 2}</option>
            </select>
          </div>

          {/* Month Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-purple-500" />
              ช่วงเดือน *
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white outline-none cursor-pointer"
            >
              <option value="ALL">🗓️ ทั้งหมด (ทั้งปี)</option>
              {THAI_MONTHS.map((m, idx) => (
                <option key={idx + 1} value={(idx + 1).toString()}>
                  เดือน {m}
                </option>
              ))}
            </select>
          </div>

          {/* DocType Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              ประเภทหนังสือ *
            </label>
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white outline-none cursor-pointer"
            >
              {Object.entries(DOC_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-300 font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Export Buttons */}
        <div className="pt-2 grid grid-cols-2 gap-3">
          <button
            onClick={handleExportExcel}
            disabled={loading}
            className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            ส่งออกไฟล์ Excel (.xlsx)
          </button>
          <button
            onClick={handlePrintPDF}
            disabled={loading}
            className="h-11 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4" />
            ออกรายงาน PDF / พิมพ์
          </button>
        </div>

      </div>
    </div>
  );
}
