"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  FileSpreadsheet,
  Filter,
  GraduationCap,
  Calendar,
  User,
  Check
} from "lucide-react";
import { listExamPapersAction, softDeleteExamPaperAction } from "@/app/actions/omr";
import { useSession } from "@/lib/auth-client";

export const SUBJECT_GROUPS = [
  "ภาษาไทย",
  "คณิตศาสตร์",
  "วิทยาศาสตร์และเทคโนโลยี",
  "สังคมศึกษา ศาสนา และวัฒนธรรม",
  "สุขศึกษาและพลศึกษา",
  "ศิลปะ",
  "การงานอาชีพ",
  "ภาษาต่างประเทศ",
  "กิจกรรมพัฒนาผู้เรียน",
  "งานแนะแนว"
] as const;

export function resolveSubjectGroup(paper: any): string {
  if (paper.createdBy?.subjectGroup && paper.createdBy.subjectGroup.trim()) {
    const raw = paper.createdBy.subjectGroup.trim();
    if (raw.includes("สังคม")) return "สังคมศึกษา ศาสนา และวัฒนธรรม";
    if (raw.includes("สุขศึกษา")) return "สุขศึกษาและพลศึกษา";
    return raw;
  }
  const code = (paper.subjectCode || "").trim().toUpperCase();
  const firstChar = code.charAt(0);
  if (firstChar === "ท") return "ภาษาไทย";
  if (firstChar === "ค") return "คณิตศาสตร์";
  if (firstChar === "ว") return "วิทยาศาสตร์และเทคโนโลยี";
  if (firstChar === "ส" || firstChar === "ป") return "สังคมศึกษา ศาสนา และวัฒนธรรม";
  if (firstChar === "พ") return "สุขศึกษาและพลศึกษา";
  if (firstChar === "ศ") return "ศิลปะ";
  if (firstChar === "ง") return "การงานอาชีพ";
  if (["อ", "จ", "ฝ", "ญ", "ต", "บ"].includes(firstChar)) return "ภาษาต่างประเทศ";
  if (firstChar === "ก") return "กิจกรรมพัฒนาผู้เรียน";
  if (firstChar === "น") return "งานแนะแนว";
  return "กลุ่มสาระทั่วไป";
}

export function getSubjectGroupBadgeColor(group: string) {
  if (group.includes("ไทย")) return "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900/40";
  if (group.includes("คณิต")) return "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900/40";
  if (group.includes("วิทย")) return "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-900/40";
  if (group.includes("สังคม")) return "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900/40";
  if (group.includes("สุข")) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40";
  if (group.includes("ศิลป")) return "bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border-pink-200 dark:border-pink-900/40";
  if (group.includes("การงาน")) return "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-900/40";
  if (group.includes("ต่างประเทศ")) return "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/40";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
}

export interface ExamPapersManagementViewProps {
  showHeader?: boolean;
}

export function ExamPapersManagementView({ showHeader = true }: ExamPapersManagementViewProps) {
  const { data: session } = useSession();
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Default Filters
  const currentAcademicYear = 2569;
  const currentTerm = 1;

  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState<string>(String(currentAcademicYear));
  const [termFilter, setTermFilter] = useState<string>(String(currentTerm));
  const [subjectGroupFilter, setSubjectGroupFilter] = useState<string>("ALL");
  const [gradeFilter, setGradeFilter] = useState<string>("ALL");

  const [selectedPaper, setSelectedPaper] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmPaper, setDeleteConfirmPaper] = useState<any | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      const data = await listExamPapersAction({
        userId: session?.user?.id || "",
        userRole: session?.user?.role || "TEACHER"
      });
      setPapers(data || []);
    } catch (err) {
      console.error("Failed to load exam papers:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [session?.user?.id]);

  async function handleDelete(paper: any) {
    try {
      setDeletingId(paper.id);
      const res = await softDeleteExamPaperAction(paper.id, {
        userId: session?.user?.id || paper.createdById,
        userRole: session?.user?.role || "TEACHER"
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

  // Filtered Papers
  const filteredPapers = useMemo(() => {
    return papers.filter((paper) => {
      // 1. Search Query
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        paper.subjectCode.toLowerCase().includes(q) ||
        paper.subjectName.toLowerCase().includes(q) ||
        paper.title.toLowerCase().includes(q) ||
        (paper.createdBy?.name || "").toLowerCase().includes(q);

      // 2. Academic Year
      const matchesYear = yearFilter === "ALL" || String(paper.academicYear) === yearFilter;

      // 3. Term
      const matchesTerm = termFilter === "ALL" || String(paper.term) === termFilter;

      // 4. Subject Group
      const resolvedGroup = resolveSubjectGroup(paper);
      const matchesSubjectGroup =
        subjectGroupFilter === "ALL" ||
        resolvedGroup === subjectGroupFilter ||
        resolvedGroup.includes(subjectGroupFilter) ||
        (paper.createdBy?.subjectGroup || "").includes(subjectGroupFilter);

      // 5. Grade Level
      const matchesGrade = gradeFilter === "ALL" || paper.gradeLevel === gradeFilter;

      return matchesSearch && matchesYear && matchesTerm && matchesSubjectGroup && matchesGrade;
    });
  }, [papers, searchQuery, yearFilter, termFilter, subjectGroupFilter, gradeFilter]);

  const totalSubmissions = papers.reduce((sum, p) => sum + (p._count?.submissions || 0), 0);
  const totalSheets = papers.reduce((sum, p) => sum + (p._count?.printedSheets || 0), 0);

  return (
    <div className="space-y-6">
      {/* 1. Page Header (Optional) */}
      {showHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              คลังข้อสอบ & จัดการการวัดผล (Exam Management Hub)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              จัดการชุดข้อสอบปรนัย (1–50 ข้อ) และอัตนัย พร้อมระบบตรวจจับกระดาษคำตอบ OMR และวิเคราะห์ KR-20
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/academic/exam/scan"
              className="h-10 px-4 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold text-xs shadow-xs transition flex items-center gap-1.5"
            >
              <Camera className="w-4 h-4" /> สแกนตรวจ OMR
            </Link>

            <Link
              href="/academic/exam/omr/create"
              className="h-10 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-purple-500/25 active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> สร้างชุดข้อสอบใหม่
            </Link>
          </div>
        </div>
      )}

      {/* 2. Top Executive Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500">ชุดข้อสอบ (ตรงตัวกรอง)</div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {filteredPapers.length} <span className="text-xs font-normal text-slate-400">/ {papers.length} ชุด</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500">ตรวจแล้วทั้งหมด</div>
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
              <div className="text-xs text-slate-500">พิมพ์รหัสชีตล่วงหน้า</div>
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
              <div className="text-xs text-slate-500">ความเร็วเฉลี่ย OMR</div>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400">&lt; 50 ms/แผ่น</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Multi-Dimension Filters Bar */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Filter className="w-4 h-4 text-purple-600" />
            ตัวกรองค้นหาชุดข้อสอบ
          </div>

          {(yearFilter !== String(currentAcademicYear) || termFilter !== String(currentTerm) || subjectGroupFilter !== "ALL" || gradeFilter !== "ALL" || searchQuery) && (
            <button
              onClick={() => {
                setYearFilter(String(currentAcademicYear));
                setTermFilter(String(currentTerm));
                setSubjectGroupFilter("ALL");
                setGradeFilter("ALL");
                setSearchQuery("");
              }}
              className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-semibold"
            >
              รีเซ็ตค่าเริ่มต้น
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Academic Year Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              ปีการศึกษา
            </label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full h-9.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500/20"
            >
              <option value={String(currentAcademicYear)}>ปี {currentAcademicYear} (ปัจจุบัน)</option>
              <option value="2568">ปี 2568</option>
              <option value="2567">ปี 2567</option>
              <option value="2566">ปี 2566</option>
              <option value="ALL">ทุกปีการศึกษา</option>
            </select>
          </div>

          {/* 2. Term Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              ภาคเรียน / เทอม
            </label>
            <select
              value={termFilter}
              onChange={(e) => setTermFilter(e.target.value)}
              className="w-full h-9.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500/20"
            >
              <option value="1">ภาคเรียนที่ 1 (ปัจจุบัน)</option>
              <option value="2">ภาคเรียนที่ 2</option>
              <option value="ALL">ทุกภาคเรียน</option>
            </select>
          </div>

          {/* 3. Subject Group Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              กลุ่มสาระการเรียนรู้
            </label>
            <select
              value={subjectGroupFilter}
              onChange={(e) => setSubjectGroupFilter(e.target.value)}
              className="w-full h-9.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500/20"
            >
              <option value="ALL">ทุกกลุ่มสาระ (ทั้งหมด)</option>
              {SUBJECT_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Grade Level Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              ระดับชั้น
            </label>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="w-full h-9.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-purple-500/20"
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

          {/* 5. Search Bar */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              ค้นหารหัสวิชา / ชื่อวิชา
            </label>
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="รหัสวิชา, ชื่อวิชา, ชื่อครู..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9.5 pl-8.5 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. CRUD Table & Management View */}
      {loading ? (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-16 text-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-2" />
          <div className="text-sm font-semibold">กำลังโหลดชุดข้อสอบ...</div>
        </div>
      ) : filteredPapers.length === 0 ? (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-16 text-center text-slate-500 space-y-3">
          <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
          <div className="text-sm font-bold text-slate-700 dark:text-slate-300">ไม่พบชุดข้อสอบตามเงื่อนไขที่เลือก</div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            ยังไม่มีชุดข้อสอบในปีการศึกษา {yearFilter === "ALL" ? "ทั้งหมด" : yearFilter} เทอม {termFilter === "ALL" ? "ทั้งหมด" : termFilter} {subjectGroupFilter !== "ALL" ? `กลุ่มสาระ ${subjectGroupFilter}` : ""} หรือไม่ตรงกับคำค้นหา
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Link
              href="/academic/exam/omr/create"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold shadow hover:bg-purple-700"
            >
              <Plus className="w-3.5 h-3.5" /> สร้างชุดข้อสอบใหม่
            </Link>
            <button
              onClick={() => {
                setYearFilter("ALL");
                setTermFilter("ALL");
                setSubjectGroupFilter("ALL");
                setGradeFilter("ALL");
                setSearchQuery("");
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            >
              ดูชุดข้อสอบทั้งหมด
            </button>
          </div>
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
                    <th className="py-3.5 px-3">รหัสวิชา</th>
                    <th className="py-3.5 px-3">กลุ่มสาระ</th>
                    <th className="py-3.5 px-4">ชื่อวิชา & ชื่อชุดข้อสอบ</th>
                    <th className="py-3.5 px-3">ระดับชั้น</th>
                    <th className="py-3.5 px-4">โครงสร้างข้อสอบ</th>
                    <th className="py-3.5 px-3 text-center">ตรวจแล้ว</th>
                    <th className="py-3.5 px-3">ผู้สร้าง</th>
                    <th className="py-3.5 px-4 text-right">ปุ่มจัดการ (CRUD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {filteredPapers.map((paper) => {
                    const submissionCount = paper._count?.submissions || 0;
                    const hasSubjective = (paper.totalSubjectiveItems || 0) > 0;
                    const totalScore = Number(paper.maxScore) + Number(paper.subjectiveMaxScore || 0);
                    const group = resolveSubjectGroup(paper);
                    const groupColor = getSubjectGroupBadgeColor(group);

                    return (
                      <tr
                        key={paper.id}
                        className="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors group cursor-pointer"
                        onClick={() => setSelectedPaper(paper)}
                      >
                        {/* 1. Academic Year / Term */}
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px]">
                            {paper.academicYear}/{paper.term}
                          </span>
                        </td>

                        {/* 2. Subject Code */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-[11px]">
                            {paper.subjectCode}
                          </span>
                        </td>

                        {/* 3. Subject Group */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${groupColor}`}>
                            {group}
                          </span>
                        </td>

                        {/* 4. Subject Name & Title */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                            {paper.subjectName}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">
                            {paper.title}
                          </div>
                        </td>

                        {/* 5. Grade Level */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                            {paper.gradeLevel}
                          </span>
                        </td>

                        {/* 6. Exam Structure */}
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            ปรนัย {paper.totalItems} ข้อ {hasSubjective ? `+ อัตนัย ${paper.totalSubjectiveItems} ข้อ` : ""}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            รวม {totalScore} คะแนน (ผ่าน {Number(paper.passScore)})
                          </div>
                        </td>

                        {/* 7. Graded Submissions Count */}
                        <td className="py-3.5 px-3 text-center font-bold whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] ${
                            submissionCount > 0 
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          }`}>
                            {submissionCount} แผ่น
                          </span>
                        </td>

                        {/* 8. Creator Name */}
                        <td className="py-3.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                          {paper.createdBy?.name || "-"}
                        </td>

                        {/* 9. Action Buttons (CRUD Controls) */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 1. Quick Scan */}
                            <Link
                              href={`/academic/exam/scan?paperId=${paper.id}`}
                              title="สแกนตรวจข้อสอบ (OMR Camera)"
                              className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition shadow-xs flex items-center gap-1 text-[11px] font-semibold px-2"
                            >
                              <Camera className="w-3.5 h-3.5" /> ตรวจ
                            </Link>

                            {/* 2. Print Sheet */}
                            <Link
                              href={`/print/exam/sheet/${paper.id}`}
                              title="พิมพ์กระดาษคำตอบ A4"
                              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                            >
                              <Printer className="w-3.5 h-3.5 text-indigo-600" />
                            </Link>

                            {/* 3. KR-20 Analysis */}
                            <Link
                              href={`/academic/exam/analysis/${paper.id}`}
                              title="วิเคราะห์คุณภาพข้อสอบ (KR-20, p, r)"
                              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                            >
                              <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                            </Link>

                            {/* 4. Edit (CRUD Update) */}
                            <Link
                              href={`/academic/exam/omr/create?edit=${paper.id}`}
                              title="แก้ไขชุดข้อสอบ / ปรับปรุงเฉลย"
                              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                            >
                              <Edit className="w-3.5 h-3.5 text-amber-600" />
                            </Link>

                            {/* 5. Soft Delete (CRUD Delete) */}
                            <button
                              onClick={() => setDeleteConfirmPaper(paper)}
                              title="ลบชุดข้อสอบลงถังขยะ"
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
              const group = resolveSubjectGroup(paper);
              const groupColor = getSubjectGroupBadgeColor(group);

              return (
                <div
                  key={paper.id}
                  className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-sm space-y-3"
                  onClick={() => setSelectedPaper(paper)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-[10px]">
                          {paper.subjectCode}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${groupColor}`}>
                          {group}
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

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
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

                  {/* Mobile Action Buttons (CRUD) */}
                  <div className="grid grid-cols-5 gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
                    <Link
                      href={`/academic/exam/scan?paperId=${paper.id}`}
                      className="h-8 rounded-lg bg-purple-600 text-white text-[11px] font-semibold flex items-center justify-center gap-1 col-span-2"
                    >
                      <Camera className="w-3.5 h-3.5" /> ตรวจ OMR
                    </Link>
                    <Link
                      href={`/print/exam/sheet/${paper.id}`}
                      className="h-8 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold flex items-center justify-center"
                      title="พิมพ์กระดาษคำตอบ"
                    >
                      <Printer className="w-3.5 h-3.5 text-indigo-600" />
                    </Link>
                    <Link
                      href={`/academic/exam/omr/create?edit=${paper.id}`}
                      className="h-8 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold flex items-center justify-center"
                      title="แก้ไขข้อสอบ"
                    >
                      <Edit className="w-3.5 h-3.5 text-amber-600" />
                    </Link>
                    <button
                      onClick={() => setDeleteConfirmPaper(paper)}
                      className="h-8 rounded-lg border border-rose-200 text-rose-600 text-[11px] font-semibold flex items-center justify-center"
                      title="ลบข้อสอบ"
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

      {/* 5. Detail Modal on Row Click */}
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

            <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
              <div>ปีการศึกษา: <strong className="text-slate-800 dark:text-white">{selectedPaper.academicYear}/{selectedPaper.term}</strong></div>
              <div>ระดับชั้น: <strong className="text-slate-800 dark:text-white">{selectedPaper.gradeLevel}</strong></div>
              <div>กลุ่มสาระ: <strong className="text-slate-800 dark:text-white">{resolveSubjectGroup(selectedPaper)}</strong></div>
              <div>ครูผู้สร้าง: <strong className="text-slate-800 dark:text-white">{selectedPaper.createdBy?.name || "-"}</strong></div>
              <div>ปรนัย: <strong className="text-slate-800 dark:text-white">{selectedPaper.totalItems} ข้อ ({Number(selectedPaper.maxScore)} คะแนน)</strong></div>
              <div>อัตนัย: <strong className="text-slate-800 dark:text-white">{selectedPaper.totalSubjectiveItems || 0} ข้อ ({Number(selectedPaper.subjectiveMaxScore || 0)} คะแนน)</strong></div>
              <div>คะแนนเต็มรวม: <strong className="text-purple-600 dark:text-purple-400 font-bold">{Number(selectedPaper.maxScore) + Number(selectedPaper.subjectiveMaxScore || 0)} คะแนน</strong></div>
              <div>เกณฑ์ผ่าน: <strong className="text-slate-800 dark:text-white">{Number(selectedPaper.passScore)} คะแนน</strong></div>
            </div>

            {selectedPaper.subjectiveItems && selectedPaper.subjectiveItems.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  ข้อสอบอัตนัย (ส่วนที่ 2):
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {selectedPaper.subjectiveItems.map((s: any) => (
                    <div key={s.id || s.itemNo} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs flex items-center justify-between border border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">ข้อ {s.itemNo}:</span> {s.title}
                        {s.rubricDetail && <div className="text-[10px] text-slate-400">เกณฑ์: {s.rubricDetail}</div>}
                      </div>
                      <span className="font-bold text-purple-600 text-xs shrink-0">{Number(s.maxScore)} คะแนน</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Link
                href={`/academic/exam/scan?paperId=${selectedPaper.id}`}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Camera className="w-3.5 h-3.5" /> ตรวจข้อสอบ
              </Link>
              <Link
                href={`/print/exam/sheet/${selectedPaper.id}`}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-600" /> พิมพ์กระดาษคำตอบ
              </Link>
              <Link
                href={`/academic/exam/omr/create?edit=${selectedPaper.id}`}
                className="px-3.5 py-2 rounded-xl border border-amber-300 dark:border-amber-700/60 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-1.5"
              >
                <Edit className="w-3.5 h-3.5" /> แก้ไข
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 6. Soft Delete Confirmation Modal */}
      {deleteConfirmPaper && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                ยืนยันการลบชุดข้อสอบ?
              </h3>
              <p className="text-xs text-slate-500">
                ชุดข้อสอบ <strong className="text-slate-800 dark:text-slate-200">{deleteConfirmPaper.subjectCode} - {deleteConfirmPaper.subjectName}</strong> จะถูกย้ายไปยังถังขยะและสามารถกู้คืนได้ภายใน 30 วัน
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmPaper(null)}
                disabled={Boolean(deletingId)}
                className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmPaper)}
                disabled={Boolean(deletingId)}
                className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-md shadow-rose-500/20 flex items-center justify-center gap-1.5"
              >
                {deletingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
