"use client";

import { Download } from "lucide-react";
import * as XLSX from "xlsx";

interface ExportExcelButtonProps {
  data: any[];
  fileName?: string;
}

export function ExportExcelButton({ data, fileName = "รายงานการลา.xlsx" }: ExportExcelButtonProps) {
  const leaveTypeMap: Record<string, string> = {
    SICK: "ลาป่วย",
    MATERNITY: "ลาคลอดบุตร",
    PATERNITY: "ลาช่วยเหลือภริยาคลอดบุตร",
    PERSONAL: "ลากิจส่วนตัว",
    VACATION: "ลาพักผ่อน",
    ORDINATION: "ลาอุปสมบท/ฮัจญ์",
    MILITARY: "ลาเข้ารับการตรวจเลือกหรือเตรียมพล",
    STUDY: "ลาศึกษาต่อ/ฝึกอบรม/ดูงาน",
    INTERNATIONAL: "ลาไปปฏิบัติงานในองค์การระหว่างประเทศ",
    SPOUSE: "ลาติดตามคู่สมรส",
    REHABILITATION: "ลาฟื้นฟูสมรรถภาพด้านอาชีพ",
  };

  const handleExport = () => {
    // 1. Format data to be easily readable in Excel
    const formattedData = data.map(item => ({
      "รหัสการลา": item.id.substring(0, 8),
      "ชื่อ-นามสกุล": item.user?.name || item.userName || "-", 
      "ประเภท": leaveTypeMap[item.type] || item.type,
      "วันที่เริ่ม": new Date(item.startDate).toLocaleDateString('th-TH'),
      "ถึงวันที่": new Date(item.endDate).toLocaleDateString('th-TH'),
      "จำนวนวัน": Math.ceil((new Date(item.endDate).getTime() - new Date(item.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1,
      "เหตุผล": item.reason,
      "สถานะ": item.status === "APPROVED" ? "อนุมัติแล้ว" : item.status === "REJECTED" ? "ถูกปฏิเสธ" : item.status === "CANCELLED" ? "ยกเลิก" : "รอการอนุมัติ",
      "วันที่ยื่นใบลา": new Date(item.createdAt).toLocaleDateString('th-TH')
    }));

    // 2. Convert JSON to Worksheet
    const ws = XLSX.utils.json_to_sheet(formattedData);

    // 3. Customize column widths
    ws['!cols'] = [
      { wch: 10 }, // รหัสการลา
      { wch: 25 }, // ชื่อ-นามสกุล
      { wch: 15 }, // ประเภท
      { wch: 15 }, // วันที่เริ่ม
      { wch: 15 }, // ถึงวันที่
      { wch: 10 }, // จำนวนวัน
      { wch: 40 }, // เหตุผล
      { wch: 15 }, // สถานะ
      { wch: 15 }, // วันที่ยื่นใบลา
    ];

    // 4. Create Workbook and Append Sheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leave_Report");

    // 5. Download the File
    XLSX.writeFile(wb, fileName);
  };

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 text-sm font-semibold rounded-xl border border-emerald-200 dark:border-emerald-800 transition-colors shadow-sm"
    >
      <Download className="w-4 h-4" />
      Export Excel
    </button>
  );
}
