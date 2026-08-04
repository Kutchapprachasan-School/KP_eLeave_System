"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Printer, 
  FileSpreadsheet, 
  FileText, 
  Code2, 
  Download, 
  ChevronRight, 
  ArrowLeft, 
  CheckCircle2, 
  Layers
} from "lucide-react";

export default function ReportsDomainPage() {
  const [selectedFormat, setSelectedFormat] = useState<string>("PDF");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-6 text-slate-900 dark:text-slate-100">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400 border-b border-slate-200 dark:border-slate-800 pb-4">
        <Link href="/academic/planning" className="hover:underline flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Academic Planning Platform
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span>Unified Reporting Engine</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Printer className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            ศูนย์รวมการออกรายงานและนำออกข้อมูล (Unified Reporting Engine)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            บริการออกรายงานแบบรวมศูนย์ รองรับการส่งออกข้อมูล 5 รูปแบบ (PDF A4, Excel .xlsx, Word .docx, CSV และ JSON API) จาก Payload เดียวกัน
          </p>
        </div>
      </div>

      {/* Reports Catalog */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white shadow-md">
            <Printer className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">ใบรับรองภาระงานสอนครูรายบุคคล A4</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            สรุปตารางคาบสอน ค่าน้ำหนัก ETU พร้อมตราโรงเรียนและช่องลงนามอนุมัติของหัวหน้าวิชาการและผู้อำนวยการ
          </p>
          <button className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2">
            <Download className="w-4 h-4" /> Export PDF A4
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">ตารางสรุปโครงสร้างหลักสูตร Excel (.xlsx)</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            ตารางโครงสร้างรายวิชาพื้นฐานและเพิ่มเติม ม.1 - ม.6 แยกตามกลุ่มสาระการเรียนรู้สำหรับนำไปวิเคราะห์ต่อ
          </p>
          <button className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2">
            <Download className="w-4 h-4" /> Export Excel (.xlsx)
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
            <Code2 className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">JSON API Data Payload</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Data Endpoint สำหรับเชื่อมโยงข้อมูลหลักสูตรและภาระงานครูกับระบบภายนอกหรือระบบจัดตารางสอน
          </p>
          <button className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2">
            <Download className="w-4 h-4" /> Copy API Payload
          </button>
        </div>
      </div>
    </div>
  );
}
