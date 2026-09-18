"use client";

import React, { useState, useEffect, useMemo, Fragment } from "react";
import { getCycleReport, getCanonicalLeaveReportDTO, LeaveReportDTO } from "@/app/actions/admin";
import { getLeaveConfigs } from "@/app/actions/settings";
import {
  buildExportViewModel,
  escapeHtml,
  sanitizeFontSize,
  generateCanonicalCsv,
  ExportScope,
  ExportFont,
  ExportFontSize,
} from "@/lib/report-export";
import { motion } from "framer-motion";
import {
  Printer,
  Download,
  FileSpreadsheet,
  FileText,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  Settings2,
  Users,
  UserCheck,
  Layers,
  Eye,
  Type,
  Sparkles,
  SlidersHorizontal
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function ReportsPage() {
  const [cycle, setCycle] = useState<"current" | "cycle1" | "cycle2" | "year">("current");
  const [viewMode, setViewMode] = useState<"individual" | "overview">("individual");
  const [data, setData] = useState<any[]>([]);
  const [canonicalReport, setCanonicalReport] = useState<LeaveReportDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const { t, lang, tLeaveType, tPosition } = useI18n();

  // Export Studio Preferences
  const [scope, setScope] = useState<ExportScope>("all");
  const [groupByGroup, setGroupByGroup] = useState<boolean>(true);
  const [hideUnusedTypes, setHideUnusedTypes] = useState<boolean>(true);
  const [showLevelColumn, setShowLevelColumn] = useState<boolean>(true);
  const [reportFont, setReportFont] = useState<ExportFont>("Sarabun");
  const [reportFontSize, setReportFontSize] = useState<ExportFontSize>("normal");
  const [customFontSize, setCustomFontSize] = useState<number>(13);
  const [useCustomFontSize, setUseCustomFontSize] = useState<boolean>(false);
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");

  // Helper to dynamically get current BE Fiscal Year
  const getCurrentFiscalYear = () => {
    const now = new Date();
    const month = now.getMonth();
    const calendarYear = now.getFullYear();
    // October (9) starts the next Fiscal Year
    return (month >= 9 ? calendarYear + 1 : calendarYear) + 543;
  };

  const currentFY = getCurrentFiscalYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => currentFY - i);
  const [fiscalYear, setFiscalYear] = useState<number>(currentFY);

  // States for batch printing
  const [batchYear, setBatchYear] = useState<number>(currentFY);
  const [batchStart, setBatchStart] = useState<number>(1);
  const [batchEnd, setBatchEnd] = useState<number>(50);
  const [batchFilterType, setBatchFilterType] = useState<"sequence" | "year" | "cycle1" | "cycle2" | "month">("sequence");
  const [batchMonth, setBatchMonth] = useState<number>(new Date().getMonth() + 1);

  const handleBatchPdfDownload = () => {
    if (batchFilterType === "sequence") {
      if (batchStart > batchEnd) {
        alert(t("batchPdfStartEndExceed"));
        return;
      }
      window.open(`/print/leave/batch?year=${batchYear}&start=${batchStart}&end=${batchEnd}&filterType=sequence`, "_blank");
    } else if (batchFilterType === "month") {
      window.open(`/print/leave/batch?year=${batchYear}&filterType=month&monthVal=${batchMonth}`, "_blank");
    } else {
      window.open(`/print/leave/batch?year=${batchYear}&filterType=${batchFilterType}`, "_blank");
    }
  };

  const getCycleLabel = () => {
    switch (cycle) {
      case "cycle1": return `${t("cycleLabel1")} ${fiscalYear}`;
      case "cycle2": return `${t("cycleLabel2")} ${fiscalYear}`;
      case "year": return `${t("cycleLabelFull")} ${fiscalYear}`;
      default: return `${t("cycleLabelCurrent")} ${fiscalYear}`;
    }
  };

  const getCycleLabelTh = () => {
    switch (cycle) {
      case "cycle1": return `รอบที่ 1 (ต.ค. - มี.ค.) ปีงบประมาณ ${fiscalYear}`;
      case "cycle2": return `รอบที่ 2 (เม.ย. - ก.ย.) ปีงบประมาณ ${fiscalYear}`;
      case "year": return `ทั้งปีงบประมาณ ${fiscalYear}`;
      default: return `รอบปัจจุบัน ปีงบประมาณ ${fiscalYear}`;
    }
  };

  const [leaveConfigs, setLeaveConfigs] = useState<any[]>([]);

  const leaveTypeMap = useMemo(() => {
    return leaveConfigs.reduce((acc: any, curr: any) => {
      acc[curr.type] = curr.name;
      return acc;
    }, {} as Record<string, string>);
  }, [leaveConfigs]);

  const statusMap: Record<string, string> = { 
    APPROVED: t("approvedStatus"), 
    REJECTED: t("rejectedStatus"), 
    CANCELLED: t("cancelledStatus"), 
    PENDING_HEAD: t("pendingHead"), 
    PENDING_EXEC: t("pendingExec") 
  };

  const statusMapTh: Record<string, string> = {
    APPROVED: "อนุมัติแล้ว",
    REJECTED: "ถูกปฏิเสธ",
    CANCELLED: "ยกเลิก",
    PENDING_HEAD: "รอหัวหน้างานบุคคล",
    PENDING_EXEC: "รอผู้อำนวยการ"
  };

  const getLeaveTypeNameTh = (type: string, dbName?: string) => {
    const thMap: Record<string, string> = {
      SICK: "ลาป่วย",
      PERSONAL: "ลากิจส่วนตัว",
      VACATION: "ลาพักผ่อน",
      ORDINATION: "ลาอุปสมบท/ฮัจญ์",
      MATERNITY: "ลาคลอดบุตร",
      PATERNITY: "ลาช่วยเหลือภริยาคลอดบุตร",
      INTERNATIONAL: "ลาไปปฏิบัติงานในองค์การระหว่างประเทศ",
      SPOUSE: "ลาติดตามคู่สมรส",
      REHABILITATION: "ลาฟื้นฟูสมรรถภาพด้านอาชีพ",
      MILITARY: "ลาเข้ารับการตรวจเลือกหรือเตรียมพล",
      STUDY: "ลาศึกษาต่อ/ฝึกอบรม",
    };
    return thMap[type] || dbName || type;
  };

  useEffect(() => {
    getLeaveConfigs().then(setLeaveConfigs).catch(console.error);
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    setFetched(false);
    try {
      const [overviewRes, canonicalRes] = await Promise.all([
        getCycleReport(cycle, fiscalYear),
        getCanonicalLeaveReportDTO(cycle, fiscalYear)
      ]);
      setData(overviewRes);
      setCanonicalReport(canonicalRes);
      setFetched(true);
    } catch {
      alert(t("fetchReportError"));
    } finally {
      setLoading(false);
    }
  };

  // Build Central View Model (re-computed instantly on export preference changes)
  const viewModel = useMemo(() => {
    return buildExportViewModel(canonicalReport, {
      scope,
      groupByGroup,
      hideUnusedTypes,
    });
  }, [canonicalReport, scope, groupByGroup, hideUnusedTypes]);

  const handleExportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      if (viewMode === "overview") {
        const formatted = data.map(item => ({
          "เลขที่ใบลา": item.status === "APPROVED" 
            ? `อนุมัติที่ ${item.approvedSeq || "-"}/${item.fiscalYear || "-"}` 
            : `คำขอที่ ${item.pendingSeq || "-"}/${item.fiscalYear || "-"}`,
          "ชื่อ-นามสกุล": item.userName,
          "ตำแหน่ง": item.position,
          "กลุ่มสาระ": item.subjectGroup,
          "ประเภท": leaveTypeMap[item.type] || item.type,
          "วันที่เริ่ม": new Date(item.startDate).toLocaleDateString("th-TH"),
          "ถึงวันที่": new Date(item.endDate).toLocaleDateString("th-TH"),
          "จำนวนวัน": item.leaveDays !== undefined ? item.leaveDays : Math.ceil((new Date(item.endDate).getTime() - new Date(item.startDate).getTime()) / (1000*60*60*24)) + 1,
          "สถานะ": statusMap[item.status] || item.status,
          "วันที่ยื่น": new Date(item.createdAt).toLocaleDateString("th-TH"),
        }));

        const ws = XLSX.utils.json_to_sheet(formatted);
        ws["!cols"] = [{ wch: 18 },{ wch: 25 },{ wch: 15 },{ wch: 20 },{ wch: 12 },{ wch: 14 },{ wch: 14 },{ wch: 10 },{ wch: 15 },{ wch: 14 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "รายงานการลา_ภาพรวม");
        XLSX.writeFile(wb, `รายงานการลา_ภาพรวม_${fiscalYear}_${cycle}.xlsx`);
      } else {
        // Canonical Individual Summary Report
        const { visibleTypes, displayRows, totals } = viewModel;
        const fixedColsCount = (groupByGroup ? 3 : 4) + (showLevelColumn ? 1 : 0);
        const totalCols = fixedColsCount + visibleTypes.length * 2 + 2;

        const titleRow = [`รายงานสรุปการลาของข้าราชการครูและบุคลากรทางการศึกษา ประจำ${canonicalReport?.cycleLabelTh || getCycleLabelTh()}`];
        const subtitleRow = [`ข้อมูล ณ วันที่ ${new Date().toLocaleDateString("th-TH")} | สังกัดโรงเรียนกุดจับประชาสรรค์ | จำนวนบุคลากร: ${displayRows.length} คน`];
        const blankRow: string[] = [];

        // Row 3: Super Header
        const superHeader = [
          "ลำดับ",
          "ชื่อ-สกุล",
          "ตำแหน่ง",
          ...(showLevelColumn ? ["วิทยฐานะ"] : []),
          ...(groupByGroup ? [] : ["กลุ่มสาระการเรียนรู้ / ฝ่ายงาน"]),
          ...visibleTypes.flatMap(t => [t.name, ""]),
          "สรุปรวมการลา",
          ""
        ];

        // Row 4: Sub Header
        const subHeader = [
          "",
          "",
          "",
          ...(showLevelColumn ? [""] : []),
          ...(groupByGroup ? [] : [""]),
          ...visibleTypes.flatMap(() => ["ครั้ง", "วัน"]),
          "ครั้ง",
          "วัน"
        ];

        // Data rows
        const dataRows = displayRows.map(r => [
          r.index,
          r.userName,
          r.position,
          ...(showLevelColumn ? [r.level || "-"] : []),
          ...(groupByGroup ? [] : [r.subjectGroup]),
          ...visibleTypes.flatMap(t => [
            r.byType[t.type]?.times || 0,
            r.byType[t.type]?.days || 0
          ]),
          r.totalTimes,
          r.totalDays
        ]);

        // Total Summary Row
        const totalRow = [
          "รวมทั้งสิ้น",
          ...Array(fixedColsCount - 1).fill(""),
          ...visibleTypes.flatMap(t => [
            totals.byType[t.type]?.times || 0,
            totals.byType[t.type]?.days || 0
          ]),
          totals.totalTimes,
          totals.totalDays
        ];

        const aoa = [titleRow, subtitleRow, blankRow, superHeader, subHeader, ...dataRows, totalRow];
        const ws = XLSX.utils.aoa_to_sheet(aoa);

        // Merges
        const merges: any[] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
          { s: { r: 3, c: 0 }, e: { r: 4, c: 0 } }, // ลำดับ
          { s: { r: 3, c: 1 }, e: { r: 4, c: 1 } }, // ชื่อ-สกุล
          { s: { r: 3, c: 2 }, e: { r: 4, c: 2 } }, // ตำแหน่ง
        ];
        let currentMergeCol = 3;
        if (showLevelColumn) {
          merges.push({ s: { r: 3, c: currentMergeCol }, e: { r: 4, c: currentMergeCol } });
          currentMergeCol++;
        }
        if (!groupByGroup) {
          merges.push({ s: { r: 3, c: currentMergeCol }, e: { r: 4, c: currentMergeCol } });
          currentMergeCol++;
        }
        for (let i = 0; i < visibleTypes.length; i++) {
          const c = fixedColsCount + i * 2;
          merges.push({ s: { r: 3, c }, e: { r: 3, c: c + 1 } });
        }
        const grandTotalCol = fixedColsCount + visibleTypes.length * 2;
        merges.push({ s: { r: 3, c: grandTotalCol }, e: { r: 3, c: grandTotalCol + 1 } });

        const summaryRowIdx = 5 + displayRows.length;
        merges.push({ s: { r: summaryRowIdx, c: 0 }, e: { r: summaryRowIdx, c: fixedColsCount - 1 } });

        ws["!merges"] = merges;

        // Column widths
        const colWidths = [
          { wch: 8 },  // ลำดับ
          { wch: 28 }, // ชื่อ-สกุล
          { wch: 18 }, // ตำแหน่ง
        ];
        if (showLevelColumn) {
          colWidths.push({ wch: 20 }); // วิทยฐานะ
        }
        if (!groupByGroup) {
          colWidths.push({ wch: 28 }); // กลุ่มสาระ
        }
        for (let i = 0; i < visibleTypes.length; i++) {
          colWidths.push({ wch: 9 }, { wch: 9 });
        }
        colWidths.push({ wch: 11 }, { wch: 11 });
        ws["!cols"] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "รายงานสรุปการลา");
        XLSX.writeFile(wb, `รายงานสรุปการลา_${fiscalYear}_${cycle}.xlsx`);
      }
    } catch (err: any) {
      alert(t("exportExcelError") + (err?.message || err));
    }
  };

  const handleExportCSV = () => {
    try {
      const csv = generateCanonicalCsv(viewModel, {
        showLevelColumn,
        groupByGroup
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `รายงานสรุปการลา_${fiscalYear}_${cycle}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(t("exportExcelError") + (err?.message || err));
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert(t("popupBlockedAlert"));
      return;
    }

    if (viewMode === "overview") {
      const titleText = "รายงานสรุปการลา (ภาพรวม)";
      const dateText = `พิมพ์เมื่อ ${new Date().toLocaleDateString("th-TH")} ${new Date().toLocaleTimeString("th-TH")} น.`;

      const statsHtml = `
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px;">
          <div style="border: 1px solid #ddd; padding: 12px; border-radius: 8px; background: #fafafa;">
            <div style="font-size: 11px; color: #666; font-weight: bold;">คำขอทั้งหมด</div>
            <div style="font-size: 18px; font-weight: bold; margin-top: 4px;">${totalRequests} รายการ</div>
          </div>
          <div style="border: 1px solid #ddd; padding: 12px; border-radius: 8px; background: #fafafa;">
            <div style="font-size: 11px; color: #666; font-weight: bold;">อนุมัติแล้ว</div>
            <div style="font-size: 18px; font-weight: bold; margin-top: 4px; color: #10b981;">${approvedCount} รายการ</div>
          </div>
          <div style="border: 1px solid #ddd; padding: 12px; border-radius: 8px; background: #fafafa;">
            <div style="font-size: 11px; color: #666; font-weight: bold;">ถูกปฏิเสธ</div>
            <div style="font-size: 18px; font-weight: bold; margin-top: 4px; color: #ef4444;">${rejectedCount} รายการ</div>
          </div>
          <div style="border: 1px solid #ddd; padding: 12px; border-radius: 8px; background: #fafafa;">
            <div style="font-size: 11px; color: #666; font-weight: bold;">วันลารวม (อนุมัติ)</div>
            <div style="font-size: 18px; font-weight: bold; margin-top: 4px; color: #3b82f6;">${totalDays} วัน</div>
          </div>
        </div>
      `;

      const rows = data.map((item, i) => {
        const days = item.leaveDays !== undefined ? item.leaveDays : Math.ceil((new Date(item.endDate).getTime() - new Date(item.startDate).getTime()) / (1000*60*60*24)) + 1;
        const leaveTh = getLeaveTypeNameTh(item.type, leaveTypeMap[item.type]);
        return `
          <tr>
            <td style="border:1px solid #ddd;padding:8px;text-align:center;">${i + 1}</td>
            <td style="border:1px solid #ddd;padding:8px;font-size:11px;">
              ${item.status === "APPROVED" 
                ? `<span style="color:#059669;font-weight:bold;">อนุมัติที่ ${escapeHtml(item.approvedSeq)}/${escapeHtml(item.fiscalYear)}</span>` 
                : `<span style="color:#64748b;">คำขอที่ ${escapeHtml(item.pendingSeq)}/${escapeHtml(item.fiscalYear)}</span>`}
            </td>
            <td style="border:1px solid #ddd;padding:8px;font-weight:bold;">${escapeHtml(item.userName)}</td>
            <td style="border:1px solid #ddd;padding:8px;">${escapeHtml(item.position)}</td>
            <td style="border:1px solid #ddd;padding:8px;">${escapeHtml(leaveTh)}</td>
            <td style="border:1px solid #ddd;padding:8px;text-align:center;font-size:11px;">
              ${new Date(item.startDate).toLocaleDateString("th-TH")} - ${new Date(item.endDate).toLocaleDateString("th-TH")}
            </td>
            <td style="border:1px solid #ddd;padding:8px;text-align:center;font-weight:bold;">${days}</td>
            <td style="border:1px solid #ddd;padding:8px;font-size:11px;word-break:break-all;">${escapeHtml(item.reason || "-")}</td>
            <td style="border:1px solid #ddd;padding:8px;text-align:center;">${escapeHtml(statusMapTh[item.status] || item.status)}</td>
          </tr>
        `;
      }).join("");

      const contentHtml = `
        ${statsHtml}
        <table>
          <thead>
            <tr>
              <th style="width:40px;">#</th>
              <th style="width:15%;">เลขที่ใบลา</th>
              <th style="width:18%;">ชื่อ-นามสกุล</th>
              <th style="width:12%;">ตำแหน่ง</th>
              <th style="width:12%;">ประเภท</th>
              <th style="width:18%;">วันที่ลา</th>
              <th style="width:8%;text-align:center;">จำนวนวัน</th>
              <th style="width:22%;">เหตุผล</th>
              <th style="width:10%;text-align:center;">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length === 0 ? '<tr><td colspan="9" style="text-align:center;padding:20px;color:#999;">ไม่พบข้อมูลการลา</td></tr>' : rows}
          </tbody>
        </table>
        <div style="margin-top: 20px; text-align: right; font-size: 12px; color: #666;">
          คำขอลาทั้งหมดในรอบนี้: ${data.length} รายการ
        </div>
      `;

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>${titleText}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Sarabun', sans-serif; padding: 40px; color: #333; line-height: 1.4; }
            h1 { text-align: center; font-size: 20px; margin-bottom: 4px; }
            .subtitle { text-align: center; font-size: 12px; color: #666; margin-bottom: 25px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; table-layout: fixed; }
            th { background: #f5f5f5; border: 1px solid #ddd; padding: 10px 8px; font-weight: 700; text-align: center; color: #444; }
            td { border: 1px solid #ddd; padding: 8px; vertical-align: middle; word-wrap: break-word; }
            tr { page-break-inside: avoid; }
            thead { display: table-header-group; }
            @media print { 
              body { padding: 20px; } 
              @page { margin: 15mm; }
            }
          </style>
        </head>
        <body>
          <h1>${titleText}</h1>
          <p class="subtitle">ประจำ${getCycleLabelTh()} | ${dateText}</p>
          ${contentHtml}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 400);
    } else {
      // Canonical Individual Summary Print Layout (A4 Landscape / Portrait, Official Gov Table)
      const { visibleTypes, displayRows, groupedRows, totals } = viewModel;
      const fixedColsCount = (groupByGroup ? 3 : 4) + (showLevelColumn ? 1 : 0);
      const totalCols = fixedColsCount + visibleTypes.length * 2 + 2;

      const fontMap: Record<ExportFont, { family: string; url: string }> = {
        "Sarabun": {
          family: "'Sarabun', sans-serif",
          url: "https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap"
        },
        "Prompt": {
          family: "'Prompt', sans-serif",
          url: "https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;600;700&display=swap"
        },
        "Noto Sans Thai": {
          family: "'Noto Sans Thai', sans-serif",
          url: "https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&display=swap"
        },
        "Kanit": {
          family: "'Kanit', sans-serif",
          url: "https://fonts.googleapis.com/css2?family=Kanit:wght@400;500;600;700&display=swap"
        }
      };

      const selectedFont = fontMap[reportFont] || fontMap["Sarabun"];

      const sizeStyles = useCustomFontSize
        ? {
            base: `${sanitizeFontSize(customFontSize)}px`,
            cellPad: customFontSize <= 11 ? "3px 2px" : customFontSize >= 15 ? "7px 4px" : "5px 3px",
            headPad: customFontSize <= 11 ? "4px 3px" : customFontSize >= 15 ? "8px 5px" : "6px 4px"
          }
        : {
            small: { base: "10px", cellPad: "3px 2px", headPad: "4px 3px" },
            normal: { base: "11.5px", cellPad: "5px 3px", headPad: "6px 4px" },
            large: { base: "13px", cellPad: "7px 4px", headPad: "8px 5px" },
            extralarge: { base: "16px", cellPad: "8px 5px", headPad: "10px 6px" }
          }[reportFontSize] || { base: "11.5px", cellPad: "5px 3px", headPad: "6px 4px" };

      const superHeaderCols = visibleTypes.map(t => `
        <th colspan="2" style="border:1px solid #666;padding:${sizeStyles.headPad};text-align:center;background:#f3f4f6;font-weight:700;">
          ${escapeHtml(t.name)}
        </th>
      `).join("");

      const subHeaderCols = visibleTypes.map(() => `
        <th style="border:1px solid #666;padding:${sizeStyles.headPad};text-align:center;background:#f9fafb;font-size:0.9em;width:34px;">ครั้ง</th>
        <th style="border:1px solid #666;padding:${sizeStyles.headPad};text-align:center;background:#f9fafb;font-size:0.9em;width:34px;">วัน</th>
      `).join("");

      let tableBodyHtml = "";

      if (groupByGroup) {
        tableBodyHtml = groupedRows.map(g => {
          const groupHeaderRow = `
            <tr style="background:#e2e8f0;font-weight:bold;page-break-inside:avoid;">
              <td colspan="${totalCols}" style="border:1px solid #666;padding:${sizeStyles.headPad};text-align:left;">
                📁 ${escapeHtml(g.groupName)} (${g.rows.length} คน)
              </td>
            </tr>
          `;
          const groupDataRows = g.rows.map(r => `
            <tr style="page-break-inside:avoid;">
              <td style="border:1px solid #888;padding:${sizeStyles.cellPad};text-align:center;">${r.index}</td>
              <td style="border:1px solid #888;padding:${sizeStyles.cellPad};text-align:left;white-space:nowrap;font-weight:500;">${escapeHtml(r.userName)}</td>
              <td style="border:1px solid #888;padding:${sizeStyles.cellPad};text-align:left;white-space:nowrap;">${escapeHtml(r.position)}</td>
              ${showLevelColumn ? `<td style="border:1px solid #888;padding:${sizeStyles.cellPad};text-align:left;white-space:nowrap;">${escapeHtml(r.level || "-")}</td>` : ""}
              ${visibleTypes.map(t => {
                const times = r.byType[t.type]?.times || 0;
                const days = r.byType[t.type]?.days || 0;
                return `
                  <td style="border:1px solid #888;padding:${sizeStyles.cellPad};text-align:center;">${times > 0 ? times : "-"}</td>
                  <td style="border:1px solid #888;padding:${sizeStyles.cellPad};text-align:center;">${days > 0 ? days : "-"}</td>
                `;
              }).join("")}
              <td style="border:1px solid #888;padding:${sizeStyles.cellPad};text-align:center;font-weight:bold;background:#fafafa;">${r.totalTimes > 0 ? r.totalTimes : "-"}</td>
              <td style="border:1px solid #888;padding:${sizeStyles.cellPad};text-align:center;font-weight:bold;color:#1e40af;background:#eff6ff;">${r.totalDays > 0 ? r.totalDays : "-"}</td>
            </tr>
          `).join("");

          return groupHeaderRow + groupDataRows;
        }).join("");
      } else {
        tableBodyHtml = displayRows.map(r => `
          <tr style="page-break-inside:avoid;">
            <td style="border:1px solid #888;padding:${sizeStyles.cellPad};text-align:center;">${r.index}</td>
            <td style="border:1px solid #888;padding:${sizeStyles.cellPad};text-align:left;white-space:nowrap;font-weight:500;">${escapeHtml(r.userName)}</td>
            <td style="border:1px solid #888;padding:${sizeStyles.cellPad};text-align:left;white-space:nowrap;">${escapeHtml(r.position)}</td>
            ${showLevelColumn ? `<td style="border:1px solid #888;padding:${sizeStyles.cellPad};text-align:left;white-space:nowrap;">${escapeHtml(r.level || "-")}</td>` : ""}
            <td style="border:1px solid #888;padding:${sizeStyles.cellPad};text-align:left;">${escapeHtml(r.subjectGroup)}</td>
            ${visibleTypes.map(t => {
              const times = r.byType[t.type]?.times || 0;
              const days = r.byType[t.type]?.days || 0;
              return `
                <td style="border:1px solid #888;padding:${sizeStyles.cellPad};text-align:center;">${times > 0 ? times : "-"}</td>
                <td style="border:1px solid #888;padding:${sizeStyles.cellPad};text-align:center;">${days > 0 ? days : "-"}</td>
              `;
            }).join("")}
            <td style="border:1px solid #888;padding:${sizeStyles.cellPad};text-align:center;font-weight:bold;background:#fafafa;">${r.totalTimes > 0 ? r.totalTimes : "-"}</td>
            <td style="border:1px solid #888;padding:${sizeStyles.cellPad};text-align:center;font-weight:bold;color:#1e40af;background:#eff6ff;">${r.totalDays > 0 ? r.totalDays : "-"}</td>
          </tr>
        `).join("");
      }

      const fixedHeaderCols = groupByGroup ? `
        <th rowspan="2" style="border:1px solid #666;padding:${sizeStyles.headPad};text-align:center;background:#f3f4f6;width:36px;">#</th>
        <th rowspan="2" style="border:1px solid #666;padding:${sizeStyles.headPad};text-align:center;background:#f3f4f6;width:190px;">ชื่อ-สกุล</th>
        <th rowspan="2" style="border:1px solid #666;padding:${sizeStyles.headPad};text-align:center;background:#f3f4f6;width:85px;">ตำแหน่ง</th>
        ${showLevelColumn ? `<th rowspan="2" style="border:1px solid #666;padding:${sizeStyles.headPad};text-align:center;background:#f3f4f6;width:125px;">วิทยฐานะ</th>` : ""}
      ` : `
        <th rowspan="2" style="border:1px solid #666;padding:${sizeStyles.headPad};text-align:center;background:#f3f4f6;width:36px;">#</th>
        <th rowspan="2" style="border:1px solid #666;padding:${sizeStyles.headPad};text-align:center;background:#f3f4f6;width:190px;">ชื่อ-สกุล</th>
        <th rowspan="2" style="border:1px solid #666;padding:${sizeStyles.headPad};text-align:center;background:#f3f4f6;width:85px;">ตำแหน่ง</th>
        ${showLevelColumn ? `<th rowspan="2" style="border:1px solid #666;padding:${sizeStyles.headPad};text-align:center;background:#f3f4f6;width:125px;">วิทยฐานะ</th>` : ""}
        <th rowspan="2" style="border:1px solid #666;padding:${sizeStyles.headPad};text-align:center;background:#f3f4f6;min-width:120px;">กลุ่มสาระการเรียนรู้ / ฝ่ายงาน</th>
      `;

      const totalSummaryCells = visibleTypes.map(t => {
        const times = totals.byType[t.type]?.times || 0;
        const days = totals.byType[t.type]?.days || 0;
        return `
          <td style="border:1px solid #666;padding:${sizeStyles.cellPad};text-align:center;font-weight:bold;background:#e5e7eb;">${times > 0 ? times : "-"}</td>
          <td style="border:1px solid #666;padding:${sizeStyles.cellPad};text-align:center;font-weight:bold;background:#e5e7eb;">${days > 0 ? days : "-"}</td>
        `;
      }).join("");

      const fixedTotalColSpan = fixedColsCount;

      const fullHtml = `
        <!DOCTYPE html>
        <html lang="th">
        <head>
          <meta charset="utf-8" />
          <title>รายงานสรุปการลา - ${escapeHtml(canonicalReport?.cycleLabelTh || getCycleLabelTh())}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="${selectedFont.url}" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page { size: A4 ${orientation}; margin: 8mm 8mm 10mm 8mm; }
            body { 
              font-family: ${selectedFont.family}; 
              font-size: ${sizeStyles.base}; 
              color: #111; 
              padding: 10px;
              background: #fff;
            }
            .report-header { text-align: center; margin-bottom: 12px; }
            .report-title { font-size: 1.35em; font-weight: 700; margin-bottom: 2px; }
            .report-subtitle { font-size: 0.95em; color: #444; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: ${orientation === "portrait" ? "0.9em" : "1em"}; }
            th, td { vertical-align: middle; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
            .signatures {
              margin-top: 25px;
              display: flex;
              justify-content: space-around;
              page-break-inside: avoid;
              font-size: 0.95em;
            }
            .sign-box { text-align: center; min-width: 250px; }
            .sign-dots { margin-top: 36px; margin-bottom: 6px; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <div class="report-title">รายงานสรุปวันลาของข้าราชการครูและบุคลากรทางการศึกษา</div>
            <div class="report-subtitle">ประจำ${escapeHtml(canonicalReport?.cycleLabelTh || getCycleLabelTh())} | โรงเรียนกุดจับประชาสรรค์</div>
            <div style="font-size:0.85em;color:#666;margin-top:2px;">
              ข้อมูล ณ วันที่ ${new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })} เวลา ${new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น. | จำนวนบุคลากร: ${displayRows.length} คน
            </div>
          </div>

          <table>
            <thead>
              <tr>
                ${fixedHeaderCols}
                ${superHeaderCols}
                <th colspan="2" style="border:1px solid #666;padding:${sizeStyles.headPad};text-align:center;background:#e2e8f0;font-weight:700;">สรุปรวมการลา</th>
              </tr>
              <tr>
                ${subHeaderCols}
                <th style="border:1px solid #666;padding:${sizeStyles.headPad};text-align:center;background:#edf2f7;font-size:0.9em;width:34px;">ครั้ง</th>
                <th style="border:1px solid #666;padding:${sizeStyles.headPad};text-align:center;background:#edf2f7;font-size:0.9em;width:34px;">วัน</th>
              </tr>
            </thead>
            <tbody>
              ${displayRows.length === 0 
                ? `<tr><td colspan="${totalCols}" style="border:1px solid #888;padding:20px;text-align:center;color:#666;">ไม่พบข้อมูลบุคลากรตามเงื่อนไขที่เลือก</td></tr>`
                : tableBodyHtml}
              <tr style="font-weight:bold;background:#e5e7eb;page-break-inside:avoid;">
                <td colspan="${fixedTotalColSpan}" style="border:1px solid #666;padding:${sizeStyles.headPad};text-align:center;">
                  รวมทั้งสิ้น (${totals.totalUsers} คน)
                </td>
                ${totalSummaryCells}
                <td style="border:1px solid #666;padding:${sizeStyles.cellPad};text-align:center;font-weight:bold;background:#cbd5e1;">${totals.totalTimes}</td>
                <td style="border:1px solid #666;padding:${sizeStyles.cellPad};text-align:center;font-weight:bold;color:#1e40af;background:#bfdbfe;">${totals.totalDays}</td>
              </tr>
            </tbody>
          </table>

          <div class="signatures">
            <div class="sign-box">
              <div class="sign-dots">(ลงชื่อ)......................................................................</div>
              <div>(......................................................................)</div>
              <div style="margin-top:4px;">ผู้จัดทำรายงาน / เจ้าหน้าที่งานบุคคล</div>
            </div>
            <div class="sign-box">
              <div class="sign-dots">(ลงชื่อ)......................................................................</div>
              <div>(......................................................................)</div>
              <div style="margin-top:4px;">ผู้อำนวยการโรงเรียนกุดจับประชาสรรค์</div>
            </div>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(fullHtml);
      printWindow.document.close();
      printWindow.focus();
      if (printWindow.document.fonts) {
        printWindow.document.fonts.ready.then(() => {
          printWindow.print();
        }).catch(() => {
          setTimeout(() => printWindow.print(), 500);
        });
      } else {
        setTimeout(() => printWindow.print(), 500);
      }
    }
  };

  const totalRequests = data.length;
  const approvedCount = data.filter(d => d.status === "APPROVED").length;
  const rejectedCount = data.filter(d => d.status === "REJECTED").length;
  const totalDays = data.filter(d => d.status === "APPROVED").reduce((sum, d) => sum + (d.leaveDays !== undefined ? d.leaveDays : Math.ceil((new Date(d.endDate).getTime() - new Date(d.startDate).getTime()) / (1000*60*60*24)) + 1), 0);

  const months = [
    { val: 10, th: "ตุลาคม", en: "October" },
    { val: 11, th: "พฤศจิกายน", en: "November" },
    { val: 12, th: "ธันวาคม", en: "December" },
    { val: 1, th: "มกราคม", en: "January" },
    { val: 2, th: "กุมภาพันธ์", en: "February" },
    { val: 3, th: "มีนาคม", en: "March" },
    { val: 4, th: "เมษายน", en: "April" },
    { val: 5, th: "พฤษภาคม", en: "May" },
    { val: 6, th: "มิถุนายน", en: "June" },
    { val: 7, th: "กรกฎาคม", en: "July" },
    { val: 8, th: "สิงหาคม", en: "August" },
    { val: 9, th: "กันยายน", en: "September" }
  ];

  // Preview styling helpers
  const previewFontClass = {
    "Sarabun": "report-font-sarabun",
    "Prompt": "report-font-prompt",
    "Noto Sans Thai": "report-font-noto",
    "Kanit": "report-font-kanit"
  }[reportFont] || "report-font-sarabun";

  const effectiveFontSizePx = useCustomFontSize 
    ? sanitizeFontSize(customFontSize) 
    : { small: 10, normal: 11.5, large: 13, extralarge: 16 }[reportFontSize] || 11.5;

  const previewFontSizeClass = useCustomFontSize
    ? ""
    : {
        small: "text-[10px]",
        normal: "text-[11.5px]",
        large: "text-[13px]",
        extralarge: "text-[16px]"
      }[reportFontSize] || "text-[11.5px]";

  const previewCellPadding = effectiveFontSizePx <= 10.5 
    ? "px-2 py-1" 
    : effectiveFontSizePx >= 15 
    ? "px-3 py-2" 
    : "px-2.5 py-1.5";

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white print:text-black">{t("reportsTitle")}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 print:hidden">{t("reportsSubtitle")}</p>
      </div>

      {/* Primary Query Controls */}
      <div className="flex flex-col md:flex-row gap-3 print:hidden">
        <div className="grid grid-cols-2 md:flex md:flex-row gap-3 flex-1">
          <select 
            value={cycle} 
            onChange={(e: any) => setCycle(e.target.value)} 
            className="h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all w-full cursor-pointer"
          >
            <option value="current">{t("currentCycle")}</option>
            <option value="cycle1">{t("cycle1Label")}</option>
            <option value="cycle2">{t("cycle2Label")}</option>
            <option value="year">{t("fullYear")}</option>
          </select>
          <select 
            value={fiscalYear} 
            onChange={(e: any) => setFiscalYear(Number(e.target.value))} 
            className="h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all w-full cursor-pointer"
          >
            {availableYears.map(yr => (
              <option key={yr} value={yr}>{t("fiscalYearLabel")} {yr}</option>
            ))}
          </select>
          <select 
            value={viewMode} 
            onChange={(e: any) => setViewMode(e.target.value)} 
            className="h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all w-full cursor-pointer font-medium"
          >
            <option value="individual">📊 รายงานสรุปการลาบุคลากร (ยอดรวม/ส่งออก)</option>
            <option value="overview">📋 รายงานภาพรวมคำขอ (ประวัติการลา)</option>
          </select>
          <button 
            onClick={fetchReport} 
            disabled={loading} 
            className="h-11 px-6 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium text-sm hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 w-full md:w-auto shadow-sm cursor-pointer"
          >
            <CalendarDays className="w-4 h-4" />
            {loading ? t("fetching") : t("fetchReport")}
          </button>
        </div>

        {fetched && (data.length > 0 || (canonicalReport && canonicalReport.users.length > 0)) && (
          <div className="grid grid-cols-2 gap-2 w-full md:w-auto md:flex md:flex-row">
            <button 
              onClick={handleExportExcel} 
              className="h-11 px-4 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 font-semibold text-sm border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center justify-center gap-2 w-full md:w-auto cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export Excel
            </button>
            {viewMode === "individual" && (
              <button 
                onClick={handleExportCSV} 
                className="h-11 px-4 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20 font-semibold text-sm border border-amber-200 dark:border-amber-800 transition-colors flex items-center justify-center gap-2 w-full md:w-auto cursor-pointer"
                title="ส่งออกเป็นไฟล์ CSV"
              >
                <FileText className="w-4 h-4 text-amber-600" /> Export CSV
              </button>
            )}
            <button 
              onClick={handlePrint} 
              className="h-11 px-4 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 font-semibold text-sm border border-blue-200 dark:border-blue-800 transition-colors flex items-center justify-center gap-2 w-full md:w-auto cursor-pointer"
            >
              <Printer className="w-4 h-4 text-blue-600" /> พิมพ์ / PDF
            </button>
          </div>
        )}
      </div>

      {/* OVERVIEW MODE DISPLAY */}
      {fetched && viewMode === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:grid-cols-4">
            {[
              { label: t("totalRequests"), value: `${totalRequests} ${t("items")}`, color: "text-slate-900 dark:text-white" },
              { label: t("approvedStatus"), value: `${approvedCount} ${t("items")}`, color: "text-emerald-600 dark:text-emerald-400" },
              { label: t("rejectedStatus"), value: `${rejectedCount} ${t("items")}`, color: "text-rose-600 dark:text-rose-400" },
              { label: t("totalLeaveDays"), value: `${totalDays} ${t("daysUnit")}`, color: "text-blue-600 dark:text-blue-400" },
            ].map((stat, i) => (
              <div key={i} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-2xl p-4 shadow-[0_4px_15px_rgb(0,0,0,0.03)] print:border-slate-300 print:shadow-none">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 print:text-gray-500">{stat.label}</p>
                <p className={`text-xl font-bold mt-1 ${stat.color} print:text-black`}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden print:rounded-none print:shadow-none print:border-none print:overflow-visible">
            {data.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-slate-400"><CalendarDays className="w-10 h-10 mb-3 text-slate-300 dark:text-slate-600" /><p className="text-sm">{t("noLeaveData")}</p></div>
            ) : (
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full text-left text-sm whitespace-nowrap print:whitespace-normal print:break-inside-auto">
                  <thead className="print:table-header-group">
                    <tr className="border-b border-slate-100 dark:border-slate-800 print:border-slate-400 bg-slate-50/60 dark:bg-slate-800/40">
                      <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 print:text-gray-700">#</th>
                      <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 print:text-gray-700">เลขที่ใบลา</th>
                      <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 print:text-gray-700 print:w-40">{t("fullName")}</th>
                      <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 print:text-gray-700">{t("position")}</th>
                      <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 print:text-gray-700">{t("type")}</th>
                      <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 print:text-gray-700">{t("leaveDate")}</th>
                      <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 print:text-gray-700 print:border print:border-gray-300 print:bg-gray-50 text-center">{t("days")}</th>
                      <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 print:text-gray-700 print:border print:border-gray-300 print:bg-gray-50">{t("reason")}</th>
                      <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 print:text-gray-700 print:border print:border-gray-300 print:bg-gray-50">{t("status")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-none">
                    {data.map((item, i) => {
                      const days = item.leaveDays !== undefined ? item.leaveDays : Math.ceil((new Date(item.endDate).getTime() - new Date(item.startDate).getTime()) / (1000*60*60*24)) + 1;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors print:hover:bg-transparent print:break-inside-avoid">
                          <td className="px-4 py-3 text-slate-400 print:text-black print:border print:border-gray-300">{i + 1}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300 print:text-black print:border print:border-gray-300 text-xs">
                            {item.status === "APPROVED" ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                {lang === "en" ? `Approved No. ${item.approvedSeq}/${item.fiscalYear}` : `อนุมัติที่ ${item.approvedSeq}/${item.fiscalYear}`}
                              </span>
                            ) : (
                              <span className="text-slate-500 dark:text-slate-400">
                                {lang === "en" ? `Request No. ${item.pendingSeq}/${item.fiscalYear}` : `คำขอที่ ${item.pendingSeq}/${item.fiscalYear}`}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-white print:text-black print:border print:border-gray-300">{item.userName}</td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs print:text-black print:border print:border-gray-300">{tPosition(item.position)}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300 print:text-black print:border print:border-gray-300">{tLeaveType(item.type, leaveTypeMap[item.type])}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs print:text-black print:border print:border-gray-300">{new Date(item.startDate).toLocaleDateString(lang === "th" ? "th-TH" : "en-US")} - {new Date(item.endDate).toLocaleDateString(lang === "th" ? "th-TH" : "en-US")}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white print:text-black text-center print:border print:border-gray-300">{days}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-[200px] truncate text-xs print:max-w-none print:whitespace-normal print:text-black print:border print:border-gray-300">{item.reason}</td>
                          <td className="px-4 py-3 text-xs font-medium print:border print:border-gray-300 print:text-black">{statusMap[item.status] || item.status}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CANONICAL INDIVIDUAL SUMMARY REPORT STUDIO & LIVE PREVIEW */}
      {viewMode === "individual" && (
        <div className="space-y-6">
          {/* Unfetched prompt */}
          {!fetched && (
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
                <SlidersHorizontal className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">พร้อมสำหรับการออกรายงานสรุปการลา</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1.5">
                เลือกปีงบประมาณและรอบที่ต้องการด้านบน จากนั้นคลิกปุ่ม <span className="font-semibold text-purple-600 dark:text-purple-400">"{t("fetchReport")}"</span> เพื่อเปิดตัวเลือกการปรับแต่งและพรีวิวตาราง
              </p>
            </div>
          )}

          {fetched && canonicalReport && (
            <>
              {/* Report Summary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:hidden">
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" /> บุคลากรในรายงาน
                  </p>
                  <p className="text-xl font-bold mt-1 text-slate-900 dark:text-white">
                    {viewModel.totals.totalUsers} <span className="text-xs font-normal text-slate-400">/ {canonicalReport.staffCount} คน</span>
                  </p>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-500" /> คอลัมน์ประเภทลา
                  </p>
                  <p className="text-xl font-bold mt-1 text-purple-600 dark:text-purple-400">
                    {viewModel.visibleTypes.length} <span className="text-xs font-normal text-slate-400">/ {canonicalReport.canonicalTypes.length} ประเภท</span>
                  </p>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> จำนวนครั้งที่ลา
                  </p>
                  <p className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                    {viewModel.totals.totalTimes} <span className="text-xs font-normal text-slate-400">ครั้ง</span>
                  </p>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-500" /> วันลารวมทั้งสิ้น
                  </p>
                  <p className="text-xl font-bold mt-1 text-blue-600 dark:text-blue-400">
                    {viewModel.totals.totalDays} <span className="text-xs font-normal text-slate-400">วัน</span>
                  </p>
                </div>
              </div>

              {/* Flexible Export Controls Toolbar */}
              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 print:hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">ตัวเลือกการปรับแต่งรายงานส่งออก (Export Studio)</h3>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    รอบข้อมูล: <span className="font-semibold text-purple-600 dark:text-purple-400">{canonicalReport.cycleLabelTh}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* 1. Scope Selector */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      รายชื่อบุคลากร
                    </label>
                    <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setScope("all")}
                        className={`text-xs py-1.5 px-2 rounded-lg font-medium transition-all ${
                          scope === "all"
                            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold"
                            : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        ทุกคน ({canonicalReport.staffCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setScope("only_leavers")}
                        className={`text-xs py-1.5 px-2 rounded-lg font-medium transition-all ${
                          scope === "only_leavers"
                            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold"
                            : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        เฉพาะที่ลา ({canonicalReport.users.filter(u => u.totalTimes > 0).length})
                      </button>
                    </div>
                  </div>

                  {/* 2. Grouping / Sorting */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      การจัดกลุ่ม / เรียงลำดับ
                    </label>
                    <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setGroupByGroup(true)}
                        className={`text-xs py-1.5 px-2 rounded-lg font-medium transition-all ${
                          groupByGroup
                            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold"
                            : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        แยกตามกลุ่มสาระ
                      </button>
                      <button
                        type="button"
                        onClick={() => setGroupByGroup(false)}
                        className={`text-xs py-1.5 px-2 rounded-lg font-medium transition-all ${
                          !groupByGroup
                            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold"
                            : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        เรียงตามชื่อทั้งหมด
                      </button>
                    </div>
                  </div>

                  {/* 3. Hide Unused Types */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      คอลัมน์ประเภทการลา
                    </label>
                    <button
                      type="button"
                      onClick={() => setHideUnusedTypes(!hideUnusedTypes)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                        hideUnusedTypes
                          ? "bg-purple-50/70 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800 text-purple-700 dark:text-purple-300"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <span>{hideUnusedTypes ? "✓ ซ่อนประเภทที่ว่าง" : "แสดงครบ 11 ประเภท"}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 font-bold">
                        {viewModel.visibleTypes.length} ประเภท
                      </span>
                    </button>
                  </div>

                  {/* 4. Academic Standing (วิทยฐานะ) Toggle */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      คอลัมน์วิทยฐานะ
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowLevelColumn(!showLevelColumn)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                        showLevelColumn
                          ? "bg-purple-50/70 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800 text-purple-700 dark:text-purple-300"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <span>{showLevelColumn ? "✓ แสดงวิทยฐานะ" : "ซ่อนวิทยฐานะ"}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 font-bold">
                        {showLevelColumn ? "มีวิทยฐานะ" : "ไม่มี"}
                      </span>
                    </button>
                  </div>

                  {/* 5. Orientation & Font Controls */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      แนวกระดาษและฟอนต์
                    </label>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        {/* Orientation Toggle */}
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl flex-1">
                          <button
                            type="button"
                            onClick={() => setOrientation("landscape")}
                            className={`flex-1 px-2 py-1 text-[11px] rounded-lg transition-all ${
                              orientation === "landscape"
                                ? "bg-white dark:bg-slate-700 font-bold text-slate-900 dark:text-white shadow-sm"
                                : "text-slate-500 hover:text-slate-900"
                            }`}
                          >
                            แนวนอน
                          </button>
                          <button
                            type="button"
                            onClick={() => setOrientation("portrait")}
                            className={`flex-1 px-2 py-1 text-[11px] rounded-lg transition-all ${
                              orientation === "portrait"
                                ? "bg-white dark:bg-slate-700 font-bold text-slate-900 dark:text-white shadow-sm"
                                : "text-slate-500 hover:text-slate-900"
                            }`}
                          >
                            แนวตั้ง
                          </button>
                        </div>
                        {/* Font Family */}
                        <select
                          value={reportFont}
                          onChange={(e) => setReportFont(e.target.value as ExportFont)}
                          className="h-8 flex-1 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white cursor-pointer"
                        >
                          <option value="Sarabun">Sarabun (ทางการ)</option>
                          <option value="Prompt">Prompt (โมเดิร์น)</option>
                          <option value="Noto Sans Thai">Noto Sans (มาตรฐาน)</option>
                          <option value="Kanit">Kanit (ร่วมสมัย)</option>
                        </select>
                      </div>

                      {/* Font Size Presets + Custom Input */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl flex-1">
                          {(["small", "normal", "large", "extralarge"] as ExportFontSize[]).map((sz) => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => {
                                setReportFontSize(sz);
                                setUseCustomFontSize(false);
                              }}
                              className={`flex-1 px-1.5 py-1 text-[10px] rounded-lg transition-all ${
                                !useCustomFontSize && reportFontSize === sz
                                  ? "bg-white dark:bg-slate-700 font-bold text-slate-900 dark:text-white shadow-sm"
                                  : "text-slate-500 hover:text-slate-900"
                              }`}
                            >
                              {sz === "small" ? "10px" : sz === "normal" ? "11.5px" : sz === "large" ? "13px" : "16px"}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
                          <span>กำหนดเอง:</span>
                          <input
                            type="number"
                            min={8}
                            max={32}
                            value={customFontSize}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomFontSize(Number(val));
                              setUseCustomFontSize(true);
                            }}
                            onBlur={() => {
                              setCustomFontSize(sanitizeFontSize(customFontSize));
                            }}
                            className="w-12 h-6 px-1 text-center text-xs font-semibold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                          <span>px</span>
                          {useCustomFontSize && (
                            <button
                              type="button"
                              onClick={() => setUseCustomFontSize(false)}
                              className="text-[10px] text-purple-600 dark:text-purple-400 underline ml-0.5 cursor-pointer"
                            >
                              คืนค่า
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* LIVE PREVIEW CARD */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                {/* Preview Card Bar */}
                <div className="px-6 py-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      พรีวิวรายงานการลา (Live Preview)
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                      {reportFont} · {effectiveFontSizePx}px · {orientation === "landscape" ? "แนวนอน" : "แนวตั้ง"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleExportExcel} 
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" /> ส่งออก Excel
                    </button>
                    <button 
                      onClick={handleExportCSV} 
                      className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" /> ส่งออก CSV
                    </button>
                    <button 
                      onClick={handlePrint} 
                      className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> พิมพ์ / PDF (A4)
                    </button>
                  </div>
                </div>

                {/* Preview Table Container */}
                <div 
                  className={`overflow-x-auto max-h-[640px] overflow-y-auto ${previewFontClass} ${previewFontSizeClass}`}
                  style={{ fontSize: useCustomFontSize ? `${effectiveFontSizePx}px` : undefined }}
                >
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    {/* Header Row 1: Super Header */}
                    <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm">
                      <tr className="border-b border-slate-300 dark:border-slate-700">
                        <th rowSpan={2} className="px-2 py-2 text-center border-r border-slate-300 dark:border-slate-700 w-9 font-bold">#</th>
                        <th rowSpan={2} className="px-3 py-2 border-r border-slate-300 dark:border-slate-700 min-w-[190px] font-bold">ชื่อ-สกุล</th>
                        <th rowSpan={2} className="px-3 py-2 border-r border-slate-300 dark:border-slate-700 min-w-[85px] font-bold">ตำแหน่ง</th>
                        {showLevelColumn && (
                          <th rowSpan={2} className="px-3 py-2 border-r border-slate-300 dark:border-slate-700 min-w-[125px] font-bold">วิทยฐานะ</th>
                        )}
                        {!groupByGroup && (
                          <th rowSpan={2} className="px-3 py-2 border-r border-slate-300 dark:border-slate-700 min-w-[150px] font-bold">กลุ่มสาระการเรียนรู้ / ฝ่ายงาน</th>
                        )}
                        {viewModel.visibleTypes.map(t => (
                          <th key={t.type} colSpan={2} className="px-3 py-1.5 text-center border-r border-slate-300 dark:border-slate-700 font-bold bg-slate-200/50 dark:bg-slate-700/50">
                            {t.name}
                          </th>
                        ))}
                        <th colSpan={2} className="px-3 py-1.5 text-center font-bold bg-purple-100/70 dark:bg-purple-950/50 text-purple-900 dark:text-purple-300">
                          สรุปรวมการลา
                        </th>
                      </tr>
                      {/* Header Row 2: Sub Header (ครั้ง / วัน) */}
                      <tr className="border-b border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
                        {viewModel.visibleTypes.map(t => (
                          <Fragment key={`${t.type}_sub`}>
                            <th className="px-2 py-1 text-center border-r border-slate-200 dark:border-slate-700 font-medium">ครั้ง</th>
                            <th className="px-2 py-1 text-center border-r border-slate-300 dark:border-slate-700 font-medium">วัน</th>
                          </Fragment>
                        ))}
                        <th className="px-2 py-1 text-center border-r border-purple-200 dark:border-purple-800 font-bold text-purple-700 dark:text-purple-300">ครั้ง</th>
                        <th className="px-2 py-1 text-center font-bold text-purple-700 dark:text-purple-300">วัน</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {viewModel.displayRows.length === 0 ? (
                        <tr>
                          <td 
                            colSpan={(groupByGroup ? 3 : 4) + (showLevelColumn ? 1 : 0) + viewModel.visibleTypes.length * 2 + 2} 
                            className="text-center py-16 text-slate-400"
                          >
                            ไม่พบข้อมูลบุคลากรตามเงื่อนไขที่เลือก
                          </td>
                        </tr>
                      ) : groupByGroup ? (
                        viewModel.groupedRows.map(g => (
                          <Fragment key={g.groupName}>
                            {/* Group Banner Row */}
                            <tr className="bg-slate-100/80 dark:bg-slate-800/60 font-bold text-slate-800 dark:text-slate-200">
                              <td 
                                colSpan={(groupByGroup ? 3 : 4) + (showLevelColumn ? 1 : 0) + viewModel.visibleTypes.length * 2 + 2} 
                                className="px-3 py-2 border-y border-slate-200 dark:border-slate-700 text-xs text-purple-700 dark:text-purple-300"
                              >
                                📁 {g.groupName} <span className="font-normal text-slate-500">({g.rows.length} คน)</span>
                              </td>
                            </tr>
                            {/* Rows in group */}
                            {g.rows.map(r => (
                              <tr 
                                key={r.userId} 
                                className="hover:bg-purple-50/30 dark:hover:bg-slate-800/40 transition-colors"
                              >
                                <td className={`${previewCellPadding} text-center text-slate-400 border-r border-slate-100 dark:border-slate-800 w-9`}>{r.index}</td>
                                <td className={`${previewCellPadding} font-medium text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800 min-w-[190px]`}>{r.userName}</td>
                                <td className={`${previewCellPadding} text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800 min-w-[85px]`}>{tPosition(r.position)}</td>
                                {showLevelColumn && (
                                  <td className={`${previewCellPadding} text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800 min-w-[125px]`}>{r.level || "-"}</td>
                                )}
                                {viewModel.visibleTypes.map(t => {
                                  const times = r.byType[t.type]?.times || 0;
                                  const days = r.byType[t.type]?.days || 0;
                                  return (
                                    <Fragment key={`${r.userId}_${t.type}`}>
                                      <td className={`${previewCellPadding} text-center border-r border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300`}>
                                        {times > 0 ? times : <span className="text-slate-300 dark:text-slate-600">-</span>}
                                      </td>
                                      <td className={`${previewCellPadding} text-center border-r border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300`}>
                                        {days > 0 ? days : <span className="text-slate-300 dark:text-slate-600">-</span>}
                                      </td>
                                    </Fragment>
                                  );
                                })}
                                <td className={`${previewCellPadding} text-center font-bold text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/30 border-r border-purple-100 dark:border-purple-900/50`}>
                                  {r.totalTimes > 0 ? r.totalTimes : <span className="text-slate-300 dark:text-slate-600">-</span>}
                                </td>
                                <td className={`${previewCellPadding} text-center font-bold text-purple-600 dark:text-purple-400 bg-purple-50/30 dark:bg-purple-950/20`}>
                                  {r.totalDays > 0 ? r.totalDays : <span className="text-slate-300 dark:text-slate-600">-</span>}
                                </td>
                              </tr>
                            ))}
                          </Fragment>
                        ))
                      ) : (
                        viewModel.displayRows.map(r => (
                          <tr 
                            key={r.userId} 
                            className="hover:bg-purple-50/30 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className={`${previewCellPadding} text-center text-slate-400 border-r border-slate-100 dark:border-slate-800 w-9`}>{r.index}</td>
                            <td className={`${previewCellPadding} font-medium text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800 min-w-[190px]`}>{r.userName}</td>
                            <td className={`${previewCellPadding} text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800 min-w-[85px]`}>{tPosition(r.position)}</td>
                            {showLevelColumn && (
                              <td className={`${previewCellPadding} text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800 min-w-[125px]`}>{r.level || "-"}</td>
                            )}
                            <td className={`${previewCellPadding} text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800 text-xs`}>{r.subjectGroup}</td>
                            {viewModel.visibleTypes.map(t => {
                              const times = r.byType[t.type]?.times || 0;
                              const days = r.byType[t.type]?.days || 0;
                              return (
                                <Fragment key={`${r.userId}_${t.type}`}>
                                  <td className={`${previewCellPadding} text-center border-r border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300`}>
                                    {times > 0 ? times : <span className="text-slate-300 dark:text-slate-600">-</span>}
                                  </td>
                                  <td className={`${previewCellPadding} text-center border-r border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300`}>
                                    {days > 0 ? days : <span className="text-slate-300 dark:text-slate-600">-</span>}
                                  </td>
                                </Fragment>
                              );
                            })}
                            <td className={`${previewCellPadding} text-center font-bold text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/30 border-r border-purple-100 dark:border-purple-900/50`}>
                              {r.totalTimes > 0 ? r.totalTimes : <span className="text-slate-300 dark:text-slate-600">-</span>}
                            </td>
                            <td className={`${previewCellPadding} text-center font-bold text-purple-600 dark:text-purple-400 bg-purple-50/30 dark:bg-purple-950/20`}>
                              {r.totalDays > 0 ? r.totalDays : <span className="text-slate-300 dark:text-slate-600">-</span>}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>

                    {/* Summary Total Row */}
                    {viewModel.displayRows.length > 0 && (
                      <tfoot className="sticky bottom-0 z-10 bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-700 font-bold text-slate-900 dark:text-white">
                        <tr>
                          <td 
                            colSpan={(groupByGroup ? 3 : 4) + (showLevelColumn ? 1 : 0)} 
                            className="px-3 py-2 text-center border-r border-slate-300 dark:border-slate-700"
                          >
                            รวมทั้งสิ้น ({viewModel.totals.totalUsers} คน)
                          </td>
                          {viewModel.visibleTypes.map(t => {
                            const times = viewModel.totals.byType[t.type]?.times || 0;
                            const days = viewModel.totals.byType[t.type]?.days || 0;
                            return (
                              <Fragment key={`total_${t.type}`}>
                                <td className="px-2 py-2 text-center border-r border-slate-200 dark:border-slate-700">
                                  {times > 0 ? times : "-"}
                                </td>
                                <td className="px-2 py-2 text-center border-r border-slate-300 dark:border-slate-700">
                                  {days > 0 ? days : "-"}
                                </td>
                              </Fragment>
                            );
                          })}
                          <td className="px-2 py-2 text-center border-r border-purple-300 dark:border-purple-800 bg-purple-100/80 dark:bg-purple-950/70 text-purple-900 dark:text-purple-300">
                            {viewModel.totals.totalTimes}
                          </td>
                          <td className="px-2 py-2 text-center bg-purple-200/80 dark:bg-purple-900/70 text-purple-950 dark:text-purple-200">
                            {viewModel.totals.totalDays}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* BATCH PDF DOWNLOAD SECTION */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] print:hidden mt-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
          <Download className="w-5 h-5 text-purple-500" />
          {lang === "en" ? "Download Batch Leaves (PDF)" : "ดาวน์โหลดใบลาแบบกลุ่ม (PDF)"}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          {lang === "en" ? "Specify fiscal year, range, or month to retrieve approved leaves for batch printing." : "ระบุเงื่อนไข ปีงบประมาณ หรือช่วงเวลาที่ต้องการดึงข้อมูลใบลาที่ได้รับการอนุมัติแล้วเพื่อพิมพ์ออกเป็น PDF ทั้งหมดพร้อมกัน"}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">{t("fiscalYearLabel")}</label>
            <select 
              value={batchYear} 
              onChange={(e) => setBatchYear(Number(e.target.value))}
              className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all w-full cursor-pointer"
            >
              {availableYears.map(yr => (
                <option key={yr} value={yr}>{t("fiscalYearPrefix")} {yr}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">{lang === "en" ? "Batch Print Option" : "เงื่อนไขการดึงข้อมูล"}</label>
            <select 
              value={batchFilterType} 
              onChange={(e) => setBatchFilterType(e.target.value as any)}
              className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all w-full cursor-pointer"
            >
              <option value="sequence">{lang === "en" ? "By Ref Sequence Range" : "ตามช่วงลำดับเลขอ้างอิง"}</option>
              <option value="year">{lang === "en" ? "All of Fiscal Year" : "ทั้งหมดของปีงบประมาณ"}</option>
              <option value="cycle1">{t("cycle1Label")}</option>
              <option value="cycle2">{t("cycle2Label")}</option>
              <option value="month">{lang === "en" ? "By Month" : "รอบเดือน (ระบุเดือน)"}</option>
            </select>
          </div>

          {batchFilterType === "sequence" && (
            <>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">{lang === "en" ? "From Approved No." : "จากลำดับอนุมัติที่"}</label>
                <input 
                  type="number" 
                  min={1}
                  value={batchStart} 
                  onChange={(e) => setBatchStart(Math.max(1, Number(e.target.value)))}
                  className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all w-full" 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">{lang === "en" ? "To Approved No." : "ถึงลำดับอนุมัติที่"}</label>
                <input 
                  type="number" 
                  min={1}
                  value={batchEnd} 
                  onChange={(e) => setBatchEnd(Math.max(1, Number(e.target.value)))}
                  className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all w-full" 
                />
              </div>
            </>
          )}

          {batchFilterType === "month" && (
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">{lang === "en" ? "Select Month" : "เลือกเดือน"}</label>
              <select 
                value={batchMonth} 
                onChange={(e) => setBatchMonth(Number(e.target.value))}
                className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all w-full cursor-pointer"
              >
                {months.map(m => (
                  <option key={m.val} value={m.val}>{lang === "en" ? m.en : m.th}</option>
                ))}
              </select>
            </div>
          )}

          <div className={batchFilterType === "sequence" ? "md:col-span-2" : (batchFilterType === "month" ? "md:col-span-2" : "md:col-span-6")}>
            <button 
              onClick={handleBatchPdfDownload}
              className="h-10 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md shadow-purple-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer w-full"
            >
              <Printer className="w-4.5 h-4.5" />
              {lang === "en" ? "Download PDF" : "ดาวน์โหลด PDF"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
