"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  FileText, 
  Camera, 
  Printer, 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Loader2, 
  Search, 
  Filter, 
  ChevronRight,
  ShieldCheck,
  Zap,
  Clock,
  Sparkles,
  ArrowUpRight
} from "lucide-react";
import { listExamPapersAction } from "@/app/actions/omr";

export default function OmrExamDashboardPage() {
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("ALL");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await listExamPapersAction();
        setPapers(data);
      } catch (err) {
        console.error("Failed to load exam papers:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredPapers = papers.filter((paper) => {
    const matchesSearch =
      paper.subjectCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      paper.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      paper.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = gradeFilter === "ALL" || paper.gradeLevel === gradeFilter;
    return matchesSearch && matchesGrade;
  });

  const totalSubmissions = papers.reduce((sum, p) => sum + (p._count?.submissions || 0), 0);
  const totalSheets = papers.reduce((sum, p) => sum + (p._count?.printedSheets || 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            ระบบตรวจข้อสอบอัตโนมัติ OMR (ZipGrade Engine)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            ตรวจกระดาษคำตอบ A4 ผ่านกล้องมือถือ/แท็บเล็ตความเร็วสูง พร้อมระบบวิเคราะห์คุณภาพข้อสอบรายข้อ (KR-20)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/academic/exam/omr/create"
            className="h-11 px-5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-purple-500/25 active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> สร้างชุดข้อสอบใหม่
          </Link>
        </div>
      </div>

      {/* 2. Top Executive Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500">ชุดข้อสอบทั้งหมด</div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100">{papers.length} ชุด</div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500">ตรวจแล้ว (Submissions)</div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{totalSubmissions} แผ่น</div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500">พิมพ์รหัสล่วงหน้า (Sheets)</div>
              <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{totalSheets} แผ่น</div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500">ความเร็วเฉลี่ยประมวลผล</div>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400">&lt; 50 ms/แผ่น</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Exam Papers List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหารหัสวิชา, ชื่อวิชา หรือชื่อชุดข้อสอบ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 w-full sm:w-auto"
              >
                <option value="ALL">ทุกระดับชั้น</option>
                <option value="ม.1">มัธยมศึกษาปีที่ 1</option>
                <option value="ม.2">มัธยมศึกษาปีที่ 2</option>
                <option value="ม.3">มัธยมศึกษาปีที่ 3</option>
                <option value="ม.4">มัธยมศึกษาปีที่ 4</option>
                <option value="ม.5">มัธยมศึกษาปีที่ 5</option>
                <option value="ม.6">มัธยมศึกษาปีที่ 6</option>
              </select>
            </div>

            {/* List Body */}
            {loading ? (
              <div className="py-16 text-center text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-2" />
                <div className="text-sm font-semibold">กำลังโหลดชุดข้อสอบ...</div>
              </div>
            ) : filteredPapers.length === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-3">
                <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">ไม่พบชุดข้อสอบ</div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  ยังไม่มีชุดข้อสอบในระบบ หรือไม่ตรงกับเงื่อนไขการค้นหา คุณสามารถสร้างชุดข้อสอบใหม่ได้ทันที
                </p>
                <Link
                  href="/academic/exam/omr/create"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold shadow hover:bg-purple-700"
                >
                  <Plus className="w-3.5 h-3.5" /> สร้างชุดข้อสอบแรก
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPapers.map((paper) => {
                  const hasKeys = paper.answerKeys && paper.answerKeys.length > 0;
                  const submissionCount = paper._count?.submissions || 0;

                  return (
                    <div
                      key={paper.id}
                      className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-purple-300 dark:hover:border-purple-700 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-[11px]">
                              {paper.subjectCode}
                            </span>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {paper.subjectName} ({paper.gradeLevel})
                            </span>
                            <span className="text-[11px] text-slate-400">
                              ปีการศึกษา {paper.academicYear} ภาคเรียนที่ {paper.term}
                            </span>
                          </div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                            {paper.title}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                            <span>จำนวน {paper.totalItems} ข้อ (คะแนนเต็ม {Number(paper.maxScore)} คะแนน)</span>
                            <span>•</span>
                            <span>ตรวจแล้ว {submissionCount} แผ่น</span>
                          </div>
                        </div>

                        {/* Status Badges */}
                        <div className="flex items-center gap-2 shrink-0">
                          {hasKeys ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px] font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> ตั้งเฉลยแล้ว
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 text-[11px] font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> ยังไม่มีเฉลย
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Links Bar */}
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {/* Print Answer Sheets */}
                          <Link
                            href={`/print/exam/sheet/${paper.id}`}
                            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
                          >
                            <Printer className="w-3.5 h-3.5 text-purple-600" /> พิมพ์กระดาษคำตอบ A4
                          </Link>

                          {/* Item Analysis */}
                          <Link
                            href={`/academic/exam/analysis/${paper.id}`}
                            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
                          >
                            <BarChart3 className="w-3.5 h-3.5 text-indigo-600" /> วิเคราะห์ข้อสอบ KR-20
                          </Link>
                        </div>

                        {/* Camera Scan Action */}
                        <Link
                          href={`/academic/exam/scan?paperId=${paper.id}`}
                          className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                        >
                          <Camera className="w-3.5 h-3.5" /> สแกนตรวจข้อสอบ
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Camera Launcher & Guidelines */}
        <div className="space-y-6">
          {/* Quick Scanner Launch Card */}
          <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-4">
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-purple-300">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">เปิดกล้องสแกนกระดาษคำตอบ</h2>
              <p className="text-xs text-purple-200/80 mt-1 leading-relaxed">
                ระบบตรวจจับ 4 มาร์กเกอร์อัตโนมัติ พร้อม Homography Perspective Warp และคำนวณคะแนนในระดับเสี้ยววินาที
              </p>
            </div>
            <Link
              href="/academic/exam/scan"
              className="w-full h-11 rounded-xl bg-white text-purple-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:bg-purple-50 active:scale-[0.98] transition-all"
            >
              <Zap className="w-4 h-4 text-purple-600" /> เข้าสู่โหมดสแกน Real-time
            </Link>
          </div>

          {/* OMR Best Practice Guidelines Card */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600" /> มาตรฐานการตรวจ OMR 2569
            </h3>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0 mt-1.5" />
                <span><strong>ดินสอหรือปากกา:</strong> แนะนำให้ใช้ดินสอดำ 2B ขึ้นไป หรือปากกาน้ำเงิน/ดำที่ฝนเต็มวงกลม</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0 mt-1.5" />
                <span><strong>มุมมองการถ่าย:</strong> ถือกล้องขนานกับกระดาษคำตอบ ให้มาร์กเกอร์ 4 มุมอยู่ในกรอบเป้าเล็งสีเขียว</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0 mt-1.5" />
                <span><strong>แสงสว่าง:</strong> หลีกเลี่ยงเงามือพาดผ่าน และแสงไฟสะท้อนจ้า (Specular Glare) บนกระดาษ</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0 mt-1.5" />
                <span><strong>ระบบป้องกันชนกัน:</strong> ปลอดภัยด้วย PostgreSQL 64-bit Concurrency Lock ในระดับนักเรียน</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
