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
  Trash2,
  Edit,
  Eye,
  X,
  Sparkles,
  Zap,
  ShieldCheck,
  BookOpen,
  Layers,
  FileSpreadsheet
} from "lucide-react";
import { listExamPapersAction, softDeleteExamPaperAction } from "@/app/actions/omr";

export default function OmrExamDashboardPage() {
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("ALL");
  const [selectedPaper, setSelectedPaper] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmPaper, setDeleteConfirmPaper] = useState<any | null>(null);

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

  useEffect(() => {
    loadData();
  }, []);

  async function handleDelete(paper: any) {
    try {
      setDeletingId(paper.id);
      const res = await softDeleteExamPaperAction(paper.id, {
        userId: paper.createdById,
        userRole: "TEACHER"
      });
      if (res.success) {
        setPapers((prev) => prev.filter((p) => p.id !== paper.id));
        setDeleteConfirmPaper(null);
        if (selectedPaper?.id === paper.id) setSelectedPaper(null);
      } else {
        alert(res.error || "ไม่สามารถลบชุดข้อสอบได้");
      }
    } catch (err: any) {
      alert(err?.message || "เกิดข้อผิดพลาดในการลบชุดข้อสอบ");
    } finally {
      setDeletingId(null);
    }
  }

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
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            คลังข้อสอบ & ระบบตรวจข้อสอบ OMR (Rev. 8.2)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            จัดการชุดข้อสอบปรนัย (1–50 ข้อ) และอัตนัย พร้อมระบบตรวจจับมุมมอง A4 และวิเคราะห์ความเชื่อมั่น KR-20
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
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
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

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
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

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
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

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
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

      {/* 3. Search & Filter Bar */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
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

      {/* 4. Dual View Container */}
      {loading ? (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-16 text-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-2" />
          <div className="text-sm font-semibold">กำลังโหลดชุดข้อสอบ...</div>
        </div>
      ) : filteredPapers.length === 0 ? (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-16 text-center text-slate-500 space-y-3">
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
        <div className="space-y-4">
          {/* 💻 DESKTOP TABLE VIEW (>= md) */}
          <div className="hidden md:block bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    <th className="py-3.5 px-4">ปี / ภาค</th>
                    <th className="py-3.5 px-4">รหัสวิชา</th>
                    <th className="py-3.5 px-4">ชื่อวิชา & ชื่อชุดข้อสอบ</th>
                    <th className="py-3.5 px-3">ระดับชั้น</th>
                    <th className="py-3.5 px-4">โครงสร้างข้อสอบ</th>
                    <th className="py-3.5 px-4 text-center">ตรวจแล้ว</th>
                    <th className="py-3.5 px-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {filteredPapers.map((paper) => {
                    const submissionCount = paper._count?.submissions || 0;
                    const hasSubjective = (paper.totalSubjectiveItems || 0) > 0;
                    const totalScore = Number(paper.maxScore) + Number(paper.subjectiveMaxScore || 0);

                    return (
                      <tr
                        key={paper.id}
                        className="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors group cursor-pointer"
                        onClick={() => setSelectedPaper(paper)}
                      >
                        {/* 1. Academic Year / Term */}
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {paper.academicYear}/{paper.term}
                        </td>

                        {/* 2. Subject Code */}
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-[11px]">
                            {paper.subjectCode}
                          </span>
                        </td>

                        {/* 3. Subject Name & Title */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {paper.subjectName}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">
                            {paper.title}
                          </div>
                        </td>

                        {/* 4. Grade Level */}
                        <td className="py-3.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                            {paper.gradeLevel}
                          </span>
                        </td>

                        {/* 5. Exam Structure */}
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            ปรนัย {paper.totalItems} ข้อ {hasSubjective ? `+ อัตนัย ${paper.totalSubjectiveItems} ข้อ` : ""}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            รวม {totalScore} คะแนน (ผ่าน {Number(paper.passScore)})
                          </div>
                        </td>

                        {/* 6. Graded Submissions Count */}
                        <td className="py-3.5 px-4 text-center font-bold">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] ${
                            submissionCount > 0 
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          }`}>
                            {submissionCount} แผ่น
                          </span>
                        </td>

                        {/* 7. Action Buttons */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Quick Scan */}
                            <Link
                              href={`/academic/exam/scan?paperId=${paper.id}`}
                              title="สแกนตรวจข้อสอบ"
                              className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition shadow-xs"
                            >
                              <Camera className="w-3.5 h-3.5" />
                            </Link>

                            {/* Print Sheet */}
                            <Link
                              href={`/print/exam/sheet/${paper.id}`}
                              title="พิมพ์กระดาษคำตอบ A4"
                              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                            >
                              <Printer className="w-3.5 h-3.5 text-indigo-600" />
                            </Link>

                            {/* KR-20 Analysis */}
                            <Link
                              href={`/academic/exam/analysis/${paper.id}`}
                              title="วิเคราะห์คุณภาพข้อสอบ (KR-20)"
                              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                            >
                              <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                            </Link>

                            {/* Edit */}
                            <Link
                              href={`/academic/exam/omr/create?edit=${paper.id}`}
                              title="แก้ไขชุดข้อสอบ / เฉลย"
                              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                            >
                              <Edit className="w-3.5 h-3.5 text-amber-600" />
                            </Link>

                            {/* Soft Delete */}
                            <button
                              onClick={() => setDeleteConfirmPaper(paper)}
                              title="ลบลงถังขยะ"
                              className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 📱 MOBILE CARDS VIEW (< md) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredPapers.map((paper) => {
              const submissionCount = paper._count?.submissions || 0;
              const hasSubjective = (paper.totalSubjectiveItems || 0) > 0;
              const totalScore = Number(paper.maxScore) + Number(paper.subjectiveMaxScore || 0);

              return (
                <div
                  key={paper.id}
                  className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm space-y-3"
                  onClick={() => setSelectedPaper(paper)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-[10px]">
                          {paper.subjectCode}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[10px]">
                          {paper.gradeLevel}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {paper.academicYear}/{paper.term}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 dark:text-white text-sm mt-1">
                        {paper.subjectName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {paper.title}
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      submissionCount > 0 
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      {submissionCount} แผ่น
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl flex items-center justify-between">
                    <span>ปรนัย {paper.totalItems} ข้อ {hasSubjective ? `+ อัตนัย ${paper.totalSubjectiveItems} ข้อ` : ""}</span>
                    <span className="font-bold text-purple-700 dark:text-purple-400">เต็ม {totalScore} คะแนน</span>
                  </div>

                  {/* Mobile Action Buttons */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                    <Link
                      href={`/academic/exam/scan?paperId=${paper.id}`}
                      className="h-8 rounded-lg bg-purple-600 text-white text-[11px] font-semibold flex items-center justify-center gap-1"
                    >
                      <Camera className="w-3.5 h-3.5" /> ตรวจ
                    </Link>
                    <Link
                      href={`/print/exam/sheet/${paper.id}`}
                      className="h-8 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold flex items-center justify-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5 text-indigo-600" /> พิมพ์
                    </Link>
                    <Link
                      href={`/academic/exam/analysis/${paper.id}`}
                      className="h-8 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold flex items-center justify-center gap-1"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-emerald-600" /> สถิติ
                    </Link>
                    <button
                      onClick={() => setDeleteConfirmPaper(paper)}
                      className="h-8 rounded-lg border border-rose-200 text-rose-600 text-[11px] font-semibold flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Detail Drawer / Modal on Row Click */}
      {selectedPaper && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-700 font-bold text-xs">
                  {selectedPaper.subjectCode}
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedPaper.subjectName}
                </span>
              </div>
              <button
                onClick={() => setSelectedPaper(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {selectedPaper.title}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl">
              <div>
                <span className="text-slate-400">ปีการศึกษา/ภาค:</span>{" "}
                <strong className="text-slate-700 dark:text-slate-200">{selectedPaper.academicYear}/{selectedPaper.term}</strong>
              </div>
              <div>
                <span className="text-slate-400">ระดับชั้น:</span>{" "}
                <strong className="text-slate-700 dark:text-slate-200">{selectedPaper.gradeLevel}</strong>
              </div>
              <div>
                <span className="text-slate-400">ปรนัย:</span>{" "}
                <strong className="text-slate-700 dark:text-slate-200">{selectedPaper.totalItems} ข้อ ({Number(selectedPaper.maxScore)} คะแนน)</strong>
              </div>
              <div>
                <span className="text-slate-400">อัตนัย:</span>{" "}
                <strong className="text-slate-700 dark:text-slate-200">{selectedPaper.totalSubjectiveItems || 0} ข้อ ({Number(selectedPaper.subjectiveMaxScore || 0)} คะแนน)</strong>
              </div>
              <div>
                <span className="text-slate-400">เกณฑ์ผ่าน:</span>{" "}
                <strong className="text-emerald-600">{Number(selectedPaper.passScore)} คะแนน</strong>
              </div>
              <div>
                <span className="text-slate-400">ตรวจแล้ว:</span>{" "}
                <strong className="text-purple-600">{selectedPaper._count?.submissions || 0} แผ่น</strong>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Link
                href={`/academic/exam/scan?paperId=${selectedPaper.id}`}
                className="h-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow"
              >
                <Camera className="w-4 h-4" /> สแกนตรวจข้อสอบ
              </Link>
              <Link
                href={`/academic/exam/omr/create?edit=${selectedPaper.id}`}
                className="h-10 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                <Edit className="w-4 h-4 text-amber-600" /> แก้ไขชุดข้อสอบ/เฉลย
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 6. Soft Delete Confirmation Modal */}
      {deleteConfirmPaper && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                ย้ายชุดข้อสอบลงถังขยะ?
              </h3>
              <p className="text-xs text-slate-500">
                ต้องการย้าย &quot;{deleteConfirmPaper.subjectCode} {deleteConfirmPaper.subjectName}&quot; ({deleteConfirmPaper.title}) ลงในถังขยะหรือไม่? คุณสามารถกู้คืนได้ภายใน 30 วัน
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmPaper(null)}
                className="h-10 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={deletingId === deleteConfirmPaper.id}
                onClick={() => handleDelete(deleteConfirmPaper)}
                className="h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center justify-center gap-1 shadow-sm"
              >
                {deletingId === deleteConfirmPaper.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "ยืนยันการลบ"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
