"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  BarChart3, 
  FileSpreadsheet, 
  Download, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles,
  TrendingUp,
  Percent,
  Calculator,
  ShieldCheck
} from "lucide-react";
import * as XLSX from "xlsx";
import { getExamItemAnalysisAction, getExamPaperDetailsAction } from "@/app/actions/omr";

export default function ExamItemAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const paperId = resolvedParams.id;
  const router = useRouter();

  const [analysis, setAnalysis] = useState<any | null>(null);
  const [paper, setPaper] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [analysisData, paperData] = await Promise.all([
          getExamItemAnalysisAction(paperId),
          getExamPaperDetailsAction(paperId)
        ]);
        setAnalysis(analysisData);
        setPaper(paperData);
      } catch (err) {
        console.error("Failed to load item analysis:", err);
      } finally {
        setLoading(false);
      }
    }
    if (paperId) {
      loadData();
    }
  }, [paperId]);

  // Export to Excel (ปพ.5 Format)
  const handleExportExcel = () => {
    if (!analysis || !paper) return;

    // Sheet 1: Summary & Metrics
    const summaryData = [
      ["โรงเรียนกุดจับประชาสรรค์", "", "", ""],
      ["รายงานการวิเคราะห์คุณภาพข้อสอบและค่าความเชื่อมั่น (ปพ.5)", "", "", ""],
      ["รายวิชา:", `${paper.subjectCode} ${paper.subjectName}`, "ระดับชั้น:", paper.gradeLevel],
      ["การสอบ:", paper.title, "ปีการศึกษา:", `${paper.academicYear} ภาคเรียนที่ ${paper.term}`],
      ["", "", "", ""],
      ["ดัชนีชี้วัด", "ค่าที่ได้", "เกณฑ์มาตรฐาน", "การแปลผล"],
      ["จำนวนนักเรียนที่เข้าสอบ (N)", analysis.totalStudents, "-", "คน"],
      ["คะแนนเฉลี่ย (Mean)", analysis.meanScore, "-", "คะแนน"],
      ["ความแปรปรวน (Variance)", analysis.variance, "-", ""],
      ["ค่าความเชื่อมั่นแบบ KR-20", analysis.kr20, ">= 0.70", analysis.reliabilityStatus],
      ["", "", "", ""]
    ];

    // Sheet 2: Item Analysis Table
    const itemData = [
      ["ข้อที่", "จำนวนคนตอบถูก", "ค่าความยากง่าย (p)", "การแปลผลความยากง่าย", "ค่าอำนาจจำแนก (r)", "การแปลผลอำนาจจำแนก"],
      ...analysis.itemStats.map((item: any) => [
        `ข้อ ${item.itemNo}`,
        item.correctCount,
        item.difficultyIndex,
        item.difficultyRating,
        item.discriminationIndex,
        item.discriminationRating
      ])
    ];

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    const wsItems = XLSX.utils.aoa_to_sheet(itemData);

    XLSX.utils.book_append_sheet(wb, wsSummary, "สรุปภาพรวม");
    XLSX.utils.book_append_sheet(wb, wsItems, "วิเคราะห์รายข้อ");

    XLSX.writeFile(wb, `รายงานวิเคราะห์ข้อสอบ_${paper.subjectCode}_${paper.academicYear}_เทอม${paper.term}.xlsx`);
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-2" />
        <div className="text-sm font-semibold">กำลังคำนวณวิเคราะห์คุณภาพข้อสอบ (KR-20, p, r)...</div>
      </div>
    );
  }

  if (!paper || !analysis) {
    return (
      <div className="p-12 text-center bg-white/80 dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 max-w-md mx-auto">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <div className="text-base font-bold text-slate-800 dark:text-slate-200">ไม่พบข้อมูลการสอบที่ระบุ</div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold"
        >
          กลับหน้าก่อนหน้า
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/academic/exam/omr"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              รายงานวิเคราะห์คุณภาพข้อสอบ (Item Analysis & KR-20)
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {paper.subjectCode} {paper.subjectName} ({paper.gradeLevel}) • {paper.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="h-11 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs shadow-md shadow-emerald-500/25 active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" /> ส่งออก Excel (ปพ.5)
          </button>
        </div>
      </div>

      {analysis.disclaimer && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{analysis.disclaimer}</span>
        </div>
      )}

      {/* Top 4 Statistical Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="text-xs text-slate-500">จำนวนนักเรียนที่ตรวจแล้ว</div>
          <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">
            {analysis.totalStudents} <span className="text-xs font-semibold text-slate-400">คน</span>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="text-xs text-slate-500">คะแนนเฉลี่ย (Mean)</div>
          <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
            {analysis.meanScore} <span className="text-xs font-semibold text-slate-400">/ {Number(paper.maxScore)}</span>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="text-xs text-slate-500">ความแปรปรวน (Variance)</div>
          <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
            {analysis.variance}
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="text-xs text-slate-500">ความเชื่อมั่นแบบ KR-20</div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {analysis.kr20}
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5 font-bold">
            {analysis.reliabilityStatus}
          </div>
        </div>
      </div>

      {/* Main Item Analysis Table */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-4 h-4 text-purple-600" /> ตารางวิเคราะห์คุณภาพรายข้อ (Item-by-Item Statistics)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              คำนวณตามสูตรสถิติมาตรฐานการวัดและประเมินผลทางการศึกษา (กลุ่มสูง-กลุ่มต่ำ 27%)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-3 px-3">ข้อที่</th>
                <th className="py-3 px-3">จำนวนคนตอบถูก</th>
                <th className="py-3 px-3">ค่าความยากง่าย (p)</th>
                <th className="py-3 px-3">การแปลผลความยาก</th>
                <th className="py-3 px-3">ค่าอำนาจจำแนก (r)</th>
                <th className="py-3 px-3">การแปลผลอำนาจจำแนก</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {analysis.itemStats.map((item: any) => {
                const isDiscrGood = item.discriminationIndex >= 0.20;
                const isDiffGood = item.difficultyIndex >= 0.20 && item.difficultyIndex <= 0.80;

                return (
                  <tr key={item.itemNo} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">
                      ข้อ {item.itemNo}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {item.correctCount} / {analysis.totalStudents} ({((item.correctCount / (analysis.totalStudents || 1)) * 100).toFixed(0)}%)
                    </td>
                    <td className="py-3 px-3 font-bold text-purple-600 dark:text-purple-400">
                      {item.difficultyIndex}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        isDiffGood 
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                      }`}>
                        {item.difficultyRating}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-indigo-600 dark:text-indigo-400">
                      {item.discriminationIndex}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        isDiscrGood 
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                      }`}>
                        {item.discriminationRating}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
