"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Printer, ArrowLeft, Loader2, ShieldCheck, CheckSquare, Plus, FileText } from "lucide-react";
import { OmrAnswerSheet, OmrTwoUpA4Sheet, PrintedSheetItem } from "@/components/omr/OmrAnswerSheetPrintLayout";

export default function PrintExamSheetsPage() {
  const params = useParams();
  const router = useRouter();
  const paperId = params.paperId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paper, setPaper] = useState<any>(null);
  const [sheets, setSheets] = useState<PrintedSheetItem[]>([]);
  const [isPreSlugged, setIsPreSlugged] = useState(true);
  const [isHalfSheet, setIsHalfSheet] = useState(false);
  const [extraBlankCount, setExtraBlankCount] = useState(3);

  useEffect(() => {
    async function loadPaperData() {
      try {
        setLoading(true);
        // Fetch paper details via API or action
        const res = await fetch(`/api/omr/paper/${paperId}`);
        if (!res.ok) {
          throw new Error("ไม่สามารถดึงข้อมูลแบบทดสอบได้");
        }
        const data = await res.json();
        setPaper(data.paper);
        setSheets(data.sheets || []);
      } catch (err: any) {
        console.error("Failed to load exam paper:", err);
        setError(err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setLoading(false);
      }
    }

    if (paperId) {
      loadPaperData();
    }
  }, [paperId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-100 text-slate-700">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600 mb-4" />
        <div className="text-lg font-bold">กำลังจัดเตรียมกระดาษคำตอบความแม่นยำสูง...</div>
        <div className="text-xs text-slate-500 mt-1">กำลังคำนวณพิกัดมาร์กเกอร์และสร้าง Zero-PII QR Tokens</div>
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-100 text-slate-700">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-red-200 max-w-md text-center">
          <div className="text-red-500 font-bold text-lg mb-2">ไม่พบข้อมูลกระดาษคำตอบ</div>
          <p className="text-sm text-slate-600 mb-4">{error || "ไม่พบรหัสข้อสอบที่ระบุในระบบ"}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-xl bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" /> กลับหน้าก่อนหน้า
          </button>
        </div>
      </div>
    );
  }

  // Combine enrolled student sheets with extra blank sheets
  const blankSheets: PrintedSheetItem[] = Array.from({ length: extraBlankCount }, (_, idx) => ({
    sheetToken: `ckp_blank_${paper.id.slice(-6)}_${idx + 1}`,
    studentId: "00000",
    studentName: "........................................................",
    classroom: paper.gradeLevel,
    seatNo: null
  }));

  const allSheetsToPrint = [...sheets, ...blankSheets];

  return (
    <div className="min-h-screen bg-slate-200 print:bg-white text-slate-900">
      {/* Control Header Bar (Hidden during printing) */}
      <header className="print:hidden sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-300 p-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl border border-slate-300 hover:bg-slate-100 transition text-slate-600"
              title="ย้อนกลับ"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                พิมพ์กระดาษคำตอบ OMR ({paper.totalItems <= 20 ? "KP-OMR-A4-20" : paper.totalItems <= 40 ? "KP-OMR-A4-40" : paper.totalItems <= 60 ? "KP-OMR-A4-60" : paper.totalItems <= 80 ? "KP-OMR-A4-80" : "KP-OMR-A4-100"})
              </h1>
              <div className="text-xs text-slate-500">
                {paper.subjectCode} {paper.subjectName} • {paper.title} ({allSheetsToPrint.length} ชุด)
                {paper.totalItems <= 20 && isHalfSheet ? " • โหมด 2 ชุดต่อ 1 แผ่น A4" : ""}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle Half-A4 Mode (Available for <= 20 items) */}
            {paper.totalItems <= 20 && (
              <label
                className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border cursor-pointer transition ${
                  isHalfSheet
                    ? "bg-purple-100 text-purple-900 border-purple-400 font-bold shadow-xs"
                    : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                }`}
                title="พิมพ์ 2 ชุดใน 1 แผ่น A4 แล้วตัดตามรอยประ ช่วยประหยัดกระดาษได้ 50%"
              >
                <input
                  type="checkbox"
                  checked={isHalfSheet}
                  onChange={(e) => setIsHalfSheet(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                />
                📑 พิมพ์ 2 ชุด/A4 (Half-A4)
              </label>
            )}

            {/* Toggle Pre-slugged vs Blank */}
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-2 rounded-xl border border-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isPreSlugged}
                onChange={e => setIsPreSlugged(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
              ฝนรหัสนักเรียนล่วงหน้า (Pre-slugged)
            </label>

            {/* Extra Blank Counter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-3 py-2 rounded-xl border border-slate-300">
              <span>กระดาษสำรอง:</span>
              <input
                type="number"
                min="0"
                max="30"
                value={extraBlankCount}
                onChange={e => setExtraBlankCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-12 text-center bg-white border border-slate-300 rounded font-bold"
              />
              <span>แผ่น</span>
            </div>

            {/* Print Trigger Button */}
            <button
              onClick={() => window.print()}
              className="h-10 px-5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-purple-500/25 transition-all flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> สั่งพิมพ์กระดาษคำตอบ A4
            </button>
          </div>
        </div>
      </header>

      {/* Printable Sheet Container */}
      <main className="max-w-[210mm] mx-auto my-6 print:m-0 print:max-w-none space-y-6 print:space-y-0">
        {isHalfSheet && paper.totalItems <= 20 ? (
          /* Half-A4 Mode: 2 Sheets per physical A4 Page */
          Array.from({ length: Math.ceil(allSheetsToPrint.length / 2) }, (_, i) => {
            const topSheet = allSheetsToPrint[i * 2];
            const bottomSheet = allSheetsToPrint[i * 2 + 1] || null;
            return (
              <div
                key={`half-pair-${i}`}
                className="w-[210mm] h-[297mm] shadow-xl print:shadow-none bg-white mx-auto print:mx-0 page-break"
                style={{ pageBreakAfter: "always", breakAfter: "page" }}
              >
                <OmrTwoUpA4Sheet
                  paperTitle={paper.title}
                  subjectCode={paper.subjectCode}
                  subjectName={paper.subjectName}
                  academicYear={paper.academicYear}
                  term={paper.term}
                  gradeLevel={paper.gradeLevel}
                  totalItems={paper.totalItems}
                  choiceCount={paper.choiceCount || 4}
                  subjectiveItems={paper.subjectiveItems || []}
                  sheetTop={topSheet}
                  sheetBottom={bottomSheet}
                  isPreSlugged={isPreSlugged}
                />
              </div>
            );
          })
        ) : (
          /* Standard Full-A4 Mode */
          allSheetsToPrint.map((sheet, index) => (
            <div
              key={sheet.sheetToken}
              className="w-[210mm] h-[297mm] shadow-xl print:shadow-none bg-white mx-auto print:mx-0 page-break"
              style={{ pageBreakAfter: "always", breakAfter: "page" }}
            >
              <OmrAnswerSheet
                paperTitle={paper.title}
                subjectCode={paper.subjectCode}
                subjectName={paper.subjectName}
                academicYear={paper.academicYear}
                term={paper.term}
                gradeLevel={paper.gradeLevel}
                totalItems={paper.totalItems}
                choiceCount={paper.choiceCount || 4}
                subjectiveItems={paper.subjectiveItems || []}
                sheet={sheet}
                isPreSlugged={isPreSlugged && sheet.studentId !== "00000"}
              />
            </div>
          ))
        )}
      </main>

      {/* Embedded Print CSS */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            margin: 0;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .page-break {
            page-break-after: always !important;
            break-after: page !important;
          }
        }
      `}</style>
    </div>
  );
}
