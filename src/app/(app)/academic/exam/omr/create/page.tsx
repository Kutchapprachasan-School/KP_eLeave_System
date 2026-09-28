"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Save, 
  CheckSquare, 
  Loader2, 
  Layers, 
  FileText,
  AlertCircle,
  RefreshCw,
  CheckCircle2
} from "lucide-react";
import { 
  createExamPaperAction, 
  updateExamPaperAction,
  updateAnswerKeyWithVersionAction,
  processRegradeJobChunkAction,
  getExamPaperDetailsAction 
} from "@/app/actions/omr";
import { useSession } from "@/lib/auth-client";

const CHOICE_LABELS: Record<string, string> = {
  A: "ก",
  B: "ข",
  C: "ค",
  D: "ง",
  E: "จ",
  F: "ฉ"
};

function getAvailableChoices(choiceCount: 4 | 5 | 6): string[] {
  return ["A", "B", "C", "D", "E", "F"].slice(0, choiceCount);
}

function CreateExamPaperForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const editPaperId = searchParams?.get("edit");
  const isEditMode = Boolean(editPaperId);

  const [loadingInitial, setLoadingInitial] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [regrading, setRegrading] = useState(false);
  const [regradeProgress, setRegradeProgress] = useState<{ processed: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [existingSubmissionsCount, setExistingSubmissionsCount] = useState(0);

  // Form State (Pre-fill from query params if launched from Exam Timetable)
  const [subjectCode, setSubjectCode] = useState(() => searchParams?.get("subjectCode") || "ว23101");
  const [subjectName, setSubjectName] = useState(() => searchParams?.get("subjectName") || "วิทยาศาสตร์ 5");
  const [academicYear, setAcademicYear] = useState(() => Number(searchParams?.get("academicYear")) || 2569);
  const [term, setTerm] = useState(() => Number(searchParams?.get("term")) || 1);
  const [gradeLevel, setGradeLevel] = useState(() => {
    const cls = searchParams?.get("classroom") || "";
    if (cls.startsWith("ม.1")) return "ม.1";
    if (cls.startsWith("ม.2")) return "ม.2";
    if (cls.startsWith("ม.3")) return "ม.3";
    if (cls.startsWith("ม.4")) return "ม.4";
    if (cls.startsWith("ม.5")) return "ม.5";
    if (cls.startsWith("ม.6")) return "ม.6";
    return "ม.3";
  });
  const [title, setTitle] = useState(() => searchParams?.get("title") || "สอบกลางภาคเรียนที่ 1/2569");
  const [totalItems, setTotalItems] = useState(40);
  const [choiceCount, setChoiceCount] = useState<4 | 5 | 6>(4);
  const [maxScore, setMaxScore] = useState(40);
  const [passScore, setPassScore] = useState(20);

  // Touch-friendly Multi-Choice Mode (เลือกได้หลายคำตอบ / ฟรีเครดิต)
  const [multiChoiceMode, setMultiChoiceMode] = useState(false);

  // Answer Key State (Version "01")
  const [answerKey, setAnswerKey] = useState<Record<number, string[]>>(() => {
    const initial: Record<number, string[]> = {};
    for (let i = 1; i <= 40; i++) {
      initial[i] = ["A"];
    }
    return initial;
  });

  // Load existing data in Edit Mode
  useEffect(() => {
    if (!editPaperId) return;

    async function fetchPaper() {
      try {
        setLoadingInitial(true);
        const paper = await getExamPaperDetailsAction(editPaperId!, {
          userId: session?.user?.id || "",
          userRole: "TEACHER"
        });

        if (paper) {
          setSubjectCode(paper.subjectCode);
          setSubjectName(paper.subjectName);
          setAcademicYear(paper.academicYear);
          setTerm(paper.term);
          setGradeLevel(paper.gradeLevel);
          setTitle(paper.title);
          setTotalItems(paper.totalItems);
          if (paper.choiceCount === 5 || paper.choiceCount === 6) {
            setChoiceCount(paper.choiceCount);
          } else {
            setChoiceCount(4);
          }
          setMaxScore(Number(paper.maxScore));
          setPassScore(Number(paper.passScore));

          // Populate answer key
          const keyVer = paper.answerKeys?.[0];
          if (keyVer?.items) {
            const loadedKey: Record<number, string[]> = {};
            for (const it of keyVer.items) {
              loadedKey[it.itemNo] = it.correctChoices;
            }
            setAnswerKey(loadedKey);
          }

          setExistingSubmissionsCount(paper._count?.submissions || 0);
        }
      } catch (err) {
        console.error("Failed to load paper details:", err);
        setError("ไม่สามารถโหลดข้อมูลชุดข้อสอบเดิมได้");
      } finally {
        setLoadingInitial(false);
      }
    }

    if (session?.user?.id) {
      fetchPaper();
    }
  }, [editPaperId, session?.user?.id]);

  const handleTotalItemsChange = (newCount: number) => {
    const clamped = Math.min(100, Math.max(1, newCount || 1));
    setTotalItems(clamped);
    if (!isEditMode) {
      setMaxScore(clamped);
      setPassScore(Math.floor(clamped / 2));
    }
    const updated: Record<number, string[]> = {};
    for (let i = 1; i <= clamped; i++) {
      updated[i] = answerKey[i] || ["A"];
    }
    setAnswerKey(updated);
  };

  const handleChoiceCountChange = (newChoiceCount: 4 | 5 | 6) => {
    setChoiceCount(newChoiceCount);
    const allowed = new Set(getAvailableChoices(newChoiceCount));
    setAnswerKey((prev) => {
      const sanitized: Record<number, string[]> = {};
      for (const [k, choices] of Object.entries(prev)) {
        const filtered = (choices || []).filter((c) => allowed.has(c));
        sanitized[Number(k)] = filtered.length > 0 ? filtered : ["A"];
      }
      return sanitized;
    });
  };

  const handleToggleChoice = (itemNo: number, choice: string) => {
    setAnswerKey((prev) => {
      const current = prev[itemNo] || [];
      if (current.includes(choice)) {
        if (current.length === 1) return prev;
        return { ...prev, [itemNo]: current.filter((c) => c !== choice) };
      } else {
        return { ...prev, [itemNo]: [...current, choice].sort() };
      }
    });
  };

  const handleChoiceClick = (itemNo: number, choice: string) => {
    if (multiChoiceMode) {
      handleToggleChoice(itemNo, choice);
    } else {
      setAnswerKey((prev) => ({
        ...prev,
        [itemNo]: [choice]
      }));
    }
  };

  const handleQuickPattern = (pattern: string) => {
    const activeChoices = getAvailableChoices(choiceCount);
    const updated: Record<number, string[]> = {};
    for (let i = 1; i <= totalItems; i++) {
      if (pattern === "CYCLE") {
        updated[i] = [activeChoices[(i - 1) % activeChoices.length]];
      } else {
        updated[i] = [pattern];
      }
    }
    setAnswerKey(updated);
  };

  const activeChoices = getAvailableChoices(choiceCount);

  const matchedTemplateCode = (() => {
    const base =
      totalItems <= 20
        ? "KP-OMR-A4-20"
        : totalItems <= 40
        ? "KP-OMR-A4-40"
        : totalItems <= 60
        ? "KP-OMR-A4-60"
        : totalItems <= 80
        ? "KP-OMR-A4-80"
        : "KP-OMR-A4-100";
    return `${base}${choiceCount === 5 ? "-5C" : choiceCount === 6 ? "-6C" : ""}`;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) {
      setError("กรุณาเข้าสู่ระบบก่อนดำเนินการ");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const keyItems = [];
      for (let i = 1; i <= totalItems; i++) {
        const validChoices = (answerKey[i] || []).filter((c) => activeChoices.includes(c));
        keyItems.push({
          itemNo: i,
          correctChoices: validChoices.length > 0 ? validChoices : ["A"],
          points: Number(maxScore) / totalItems,
          penaltyPoints: 0.0
        });
      }

      if (isEditMode && editPaperId) {
        // 1. Update Paper Metadata (including totalItems & choiceCount)
        await updateExamPaperAction(
          editPaperId,
          {
            subjectCode,
            subjectName,
            academicYear: Number(academicYear),
            term: Number(term),
            gradeLevel,
            title,
            totalItems,
            choiceCount,
            maxScore: Number(maxScore),
            passScore: Number(passScore),
            subjectiveItems: []
          },
          { userId: session.user.id }
        );

        // 2. Update Answer Key with Version Snapshot
        const verRes = await updateAnswerKeyWithVersionAction({
          examPaperId: editPaperId,
          versionCode: "01",
          items: keyItems,
          changedById: session.user.id,
          reason: `ปรับปรุงข้อมูลและเฉลยคำตอบ (${choiceCount} ตัวเลือก)`
        });

        // 3. Trigger Chunked Re-grade if submissions exist
        if (verRes.affectedSubmissionsCount > 0 && verRes.regradeJobId) {
          setRegrading(true);
          const totalSubs = verRes.affectedSubmissionsCount;
          let workerToken: string | undefined = undefined;
          let isCompleted = false;
          let totalProcessed = 0;

          while (!isCompleted) {
            const chunkRes = await processRegradeJobChunkAction(verRes.regradeJobId, workerToken);
            if (!chunkRes.success) {
              if (chunkRes.reason === "JOB_LOCKED_BY_ANOTHER_WORKER_OR_LEASE_ACTIVE") {
                await new Promise((r) => setTimeout(r, 1000));
                continue;
              }
              throw new Error(chunkRes.reason || "การคำนวณคะแนนใหม่เกิดข้อผิดพลาด");
            }

            workerToken = chunkRes.workerToken;
            totalProcessed += (chunkRes.processedCount || 0);
            setRegradeProgress({
              processed: Math.min(totalProcessed, totalSubs),
              total: totalSubs
            });

            if (chunkRes.completed) {
              isCompleted = true;
            }
          }
        }

        router.push("/academic/exam/omr");
      } else {
        // 1. Create Paper
        const paper = await createExamPaperAction({
          subjectCode,
          subjectName,
          academicYear: Number(academicYear),
          term: Number(term),
          gradeLevel,
          title,
          totalItems,
          choiceCount,
          maxScore: Number(maxScore),
          passScore: Number(passScore),
          createdById: session.user.id,
          subjectiveItems: []
        });

        // 2. Commit initial Answer Key Version
        await updateAnswerKeyWithVersionAction({
          examPaperId: paper.id,
          versionCode: "01",
          items: keyItems,
          changedById: session.user.id,
          reason: "สร้างเฉลยชุดข้อสอบเวอร์ชันเริ่มต้น"
        });

        router.push("/academic/exam/omr");
      }
    } catch (err: any) {
      console.error("Failed to save exam paper:", err);
      setError(err.message || "เกิดข้อผิดพลาดในการบันทึกชุดข้อสอบ");
    } finally {
      setSaving(false);
      setRegrading(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="py-24 text-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-2" />
        <div className="text-sm font-semibold">กำลังโหลดข้อมูลชุดข้อสอบ...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/academic/exam/omr"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400 shrink-0" />
              {isEditMode ? "แก้ไขชุดข้อสอบและอัปเดตเฉลย" : "สร้างชุดข้อสอบและกำหนดเฉลยปรนัย"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              รองรับข้อสอบปรนัย 1–100 ข้อ • เลือกแบบ 4 ตัวเลือก (ก–ง), 5 ตัวเลือก (ก–จ) หรือ 6 ตัวเลือก (ก–ฉ)
            </p>
          </div>
        </div>
      </div>

      {/* Warning Banner in Edit Mode when submissions exist */}
      {isEditMode && existingSubmissionsCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">แจ้งเตือนการแก้ไขเฉลย:</strong> ชุดข้อสอบนี้มีผลการตรวจแล้วจำนวน{" "}
            <span className="font-bold text-amber-700 underline">{existingSubmissionsCount} แผ่น</span>
            <div className="mt-1 text-amber-800/80 dark:text-amber-300/80">
              เมื่อท่านบันทึก ระบบจะบันทึกประวัติเวอร์ชันเฉลยใหม่ และ<strong>คำนวณคะแนนใหม่ทุกแผ่นอัตโนมัติ</strong>อย่างปลอดภัย
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Re-grade Progress Modal / Overlay */}
      {regrading && regradeProgress && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">กำลังคำนวณคะแนนนักเรียนใหม่...</h3>
              <p className="text-xs text-slate-500 mt-1">
                ประมวลผลแล้ว {regradeProgress.processed} จาก {regradeProgress.total} แผ่น
              </p>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-purple-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${(regradeProgress.processed / regradeProgress.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main 2-Column Layout (Mobile: Settings First -> Answer Key Second; Desktop: Answer Key Left -> Settings Right) */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Right Column on Desktop / First on Mobile: Exam Paper Metadata & Structure Form */}
        <div className="order-1 lg:order-2 space-y-6">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Layers className="w-4 h-4 text-purple-600" /> ข้อมูลแบบทดสอบและโครงสร้างกระดาษคำตอบ
            </h2>

            {/* Subject Code & Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                รหัสวิชาและชื่อรายวิชา
              </label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  placeholder="เช่น ว23101"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  className="col-span-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  required
                  placeholder="เช่น วิทยาศาสตร์ 5"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="col-span-2 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Grade & Year/Term */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ระดับชั้น
                </label>
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  <option value="ม.1">ม.1</option>
                  <option value="ม.2">ม.2</option>
                  <option value="ม.3">ม.3</option>
                  <option value="ม.4">ม.4</option>
                  <option value="ม.5">ม.5</option>
                  <option value="ม.6">ม.6</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ปีการศึกษา
                </label>
                <input
                  type="number"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ภาคเรียน
                </label>
                <select
                  value={term}
                  onChange={(e) => setTerm(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ชื่อการสอบ
              </label>
              <input
                type="text"
                required
                placeholder="เช่น สอบกลางภาคเรียนที่ 1/2569"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
              />
            </div>

            {/* Choice Count Selector (4 / 5 / 6 Choices) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                จำนวนตัวเลือกต่อข้อ (รูปแบบกระดาษคำตอบ)
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { count: 4 as const, label: "4 ตัวเลือก", sub: "ก–ง (มาตรฐาน)" },
                  { count: 5 as const, label: "5 ตัวเลือก", sub: "ก–จ (พิเศษ)" },
                  { count: 6 as const, label: "6 ตัวเลือก", sub: "ก–ฉ (พิเศษ)" }
                ].map((opt) => (
                  <button
                    key={opt.count}
                    type="button"
                    onClick={() => handleChoiceCountChange(opt.count)}
                    className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                      choiceCount === opt.count
                        ? "border-purple-600 bg-purple-100 text-purple-900 dark:bg-purple-950/60 dark:text-purple-200 shadow-xs ring-2 ring-purple-500/20"
                        : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Flexible Total Items Selector (1 - 100 items) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  จำนวนข้อสอบปรนัย (1–100 ข้อ)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={totalItems}
                    onChange={(e) => handleTotalItemsChange(Number(e.target.value))}
                    className="w-16 h-8 px-2 rounded-lg border border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold font-mono text-center text-xs"
                  />
                  <span className="text-xs font-bold text-slate-500">ข้อ</span>
                </div>
              </div>

              {/* 5 Standard OMR Tiers Quick Selection (20, 40, 60, 80, 100) */}
              <div className="mb-2">
                <div className="text-[11px] font-bold text-slate-500 mb-1">
                  แม่แบบกระดาษคำตอบมาตรฐาน 5 ระดับ:
                </div>
                <div className="grid grid-cols-5 gap-1.5 mb-2">
                  {[
                    { count: 20, label: "20 ข้อ", sub: "วงใหญ่สุด" },
                    { count: 40, label: "40 ข้อ", sub: "2 คอลัมน์" },
                    { count: 60, label: "60 ข้อ", sub: "3 คอลัมน์" },
                    { count: 80, label: "80 ข้อ", sub: "4 คอลัมน์" },
                    { count: 100, label: "100 ข้อ", sub: "5 คอลัมน์" }
                  ].map((tier) => (
                    <button
                      key={tier.count}
                      type="button"
                      onClick={() => handleTotalItemsChange(tier.count)}
                      className={`p-1.5 rounded-xl border text-center transition cursor-pointer ${
                        totalItems === tier.count
                          ? "border-purple-600 bg-purple-100 text-purple-900 dark:bg-purple-950/60 dark:text-purple-200 shadow-xs ring-2 ring-purple-500/20"
                          : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="text-[11px] font-bold">{tier.label}</div>
                      <div className="text-[9px] text-slate-500 truncate">{tier.sub}</div>
                    </button>
                  ))}
                </div>

                {/* Additional Quick Presets */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1">
                  <span className="text-[10px] text-slate-400 shrink-0">กำหนดเอง:</span>
                  {[10, 15, 25, 30, 50, 75].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleTotalItemsChange(preset)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border transition cursor-pointer shrink-0 ${
                        totalItems === preset
                          ? "border-purple-500 bg-purple-50 text-purple-700 font-bold"
                          : "border-slate-200 text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="range"
                min="1"
                max="100"
                value={totalItems}
                onChange={(e) => handleTotalItemsChange(Number(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer"
              />

              {/* Template Tier Information Card */}
              <div className="mt-2.5 p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-purple-600 text-white shrink-0 mt-0.5">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div className="text-[11px] leading-relaxed">
                  <div className="flex items-center flex-wrap gap-1.5">
                    <span className="font-bold text-purple-950 dark:text-purple-200">
                      แม่แบบกระดาษ: {matchedTemplateCode}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-200/80 dark:bg-purple-800/60 text-purple-800 dark:text-purple-200">
                      {choiceCount} ตัวเลือก (ก–{CHOICE_LABELS[activeChoices[activeChoices.length - 1]]})
                    </span>
                  </div>
                  <div className="text-purple-700 dark:text-purple-300 mt-0.5">
                    {totalItems <= 20
                      ? "แบบ 20 ข้อ (2 คอลัมน์ × 10 ข้อ) ช่องฝนขนาดใหญ่พิเศษ สแกนไวและแม่นยำสูงสุด"
                      : totalItems <= 40
                      ? "แบบ 40 ข้อ (2 คอลัมน์ × 20 ข้อ) มาตรฐานสำหรับสอบเก็บคะแนนและสอบกลางภาค"
                      : totalItems <= 60
                      ? "แบบ 60 ข้อ (3 คอลัมน์ × 20 ข้อ) เหมาะสำหรับวิชาหลักและสอบปลายภาคเรียน"
                      : totalItems <= 80
                      ? "แบบ 80 ข้อ (4 คอลัมน์ × 20 ข้อ) รองรับข้อสอบมาตรฐานจำนวนมากในหน้าเดียว"
                      : "แบบ 100 ข้อ (5 คอลัมน์ × 20 ข้อ) ความจุสูงสุดสำหรับแบบทดสอบวัดผลระดับโรงเรียน"}
                  </div>
                </div>
              </div>
            </div>

            {/* Scores */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  คะแนนเต็มปรนัย
                </label>
                <input
                  type="number"
                  min="1"
                  value={maxScore}
                  onChange={(e) => setMaxScore(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  เกณฑ์คะแนนผ่าน
                </label>
                <input
                  type="number"
                  min="1"
                  value={passScore}
                  onChange={(e) => setPassScore(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold font-mono text-emerald-600"
                />
              </div>
            </div>

            {/* Live Summary Box */}
            <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-700 dark:text-slate-300 font-semibold">
                <span>จำนวนข้อสอบปรนัย:</span>
                <span className="font-mono font-bold">{totalItems} ข้อ ({choiceCount} ตัวเลือก)</span>
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300 font-semibold">
                <span>คะแนนต่อข้อโดยเฉลี่ย:</span>
                <span className="font-mono">{(Number(maxScore) / (totalItems || 1)).toFixed(2)} คะแนน/ข้อ</span>
              </div>
              <div className="flex justify-between text-purple-900 dark:text-purple-200 font-bold border-t border-purple-200 dark:border-purple-800/60 pt-1.5 text-sm">
                <span>คะแนนเต็มรวม:</span>
                <span className="font-mono">{Number(maxScore)} คะแนน</span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                <span>เกณฑ์คะแนนผ่าน:</span>
                <span className="font-mono">{passScore} คะแนน</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={saving || regrading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-purple-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึกชุดข้อสอบและเฉลย...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> {isEditMode ? "บันทึกการแก้ไขชุดข้อสอบ" : "บันทึกและสร้างชุดข้อสอบ"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Left Column on Desktop / Second on Mobile: Answer Key Editor */}
        <div className="order-2 lg:order-1 lg:col-span-2 space-y-6">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-purple-600" /> ตารางกำหนดเฉลยปรนัย ({totalItems} ข้อ • {choiceCount} ตัวเลือก)
                  </h2>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    แตะตัวเลือกที่ถูกต้องในแต่ละข้อ • หากต้องการให้ข้อใดมีคำตอบที่ถูกมากกว่า 1 ตัวเลือก ให้เปิดปุ่ม <strong>&quot;โหมดเลือกหลายคำตอบ&quot;</strong>
                  </div>
                </div>

                {/* Touch-Friendly Multi-Choice Toggle Button */}
                <button
                  type="button"
                  onClick={() => setMultiChoiceMode(!multiChoiceMode)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                    multiChoiceMode
                      ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {multiChoiceMode ? "โหมดเลือกหลายคำตอบ: เปิดอยู่" : "โหมดเลือกหลายคำตอบ (ฟรีเครดิต)"}
                </button>
              </div>

              {/* Quick Pattern Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl text-xs font-semibold">
                <span className="text-slate-500 dark:text-slate-400 px-1.5">ตั้งค่าด่วน:</span>
                {activeChoices.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleQuickPattern(c)}
                    className="px-2.5 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                  >
                    ทั้งหมด {CHOICE_LABELS[c]} ({c})
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleQuickPattern("CYCLE")}
                  className="px-2.5 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-purple-600 dark:text-purple-400 font-bold transition cursor-pointer"
                >
                  สลับ {activeChoices.map((c) => CHOICE_LABELS[c]).join("-")}
                </button>
              </div>
            </div>

            {/* Column-First Answer Key Grid: top-to-bottom per column (matches paper layout) */}
            {(() => {
              const numCols =
                choiceCount >= 5
                  ? totalItems <= 20
                    ? 2
                    : 2
                  : totalItems <= 20
                  ? 2
                  : totalItems <= 40
                  ? 2
                  : totalItems <= 60
                  ? 3
                  : 4;
              const itemsPerCol = Math.ceil(totalItems / numCols);
              const columns = Array.from({ length: numCols }, (_, colIdx) => {
                const start = colIdx * itemsPerCol + 1;
                const end = Math.min((colIdx + 1) * itemsPerCol, totalItems);
                return start <= totalItems ? { start, end } : null;
              }).filter((c): c is { start: number; end: number } => c !== null);

              return (
                <div
                  className={`grid grid-cols-1 ${
                    numCols === 2
                      ? "sm:grid-cols-2"
                      : numCols === 3
                      ? "sm:grid-cols-2 lg:grid-cols-3"
                      : "sm:grid-cols-2 xl:grid-cols-4"
                  } gap-4 max-h-[680px] overflow-y-auto pr-1`}
                >
                  {columns.map((col, colIdx) => (
                    <div key={colIdx} className="space-y-2">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 pb-1 border-b border-slate-200 dark:border-slate-800">
                        ข้อที่ {col.start} – {col.end}
                      </div>
                      {Array.from({ length: col.end - col.start + 1 }, (_, idx) => {
                        const itemNo = col.start + idx;
                        const currentChoices = answerKey[itemNo] || ["A"];

                        return (
                          <div
                            key={itemNo}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs hover:border-purple-300 transition"
                          >
                            <span className="font-bold text-slate-700 dark:text-slate-300 w-8 shrink-0">
                              {itemNo}.
                            </span>

                            <div className="flex items-center gap-1 flex-wrap justify-end">
                              {activeChoices.map((c) => {
                                const isSelected = currentChoices.includes(c);
                                return (
                                  <button
                                    type="button"
                                    key={c}
                                    onClick={() => handleChoiceClick(itemNo, c)}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      handleToggleChoice(itemNo, c);
                                    }}
                                    title={`เลือกตัวเลือก ${CHOICE_LABELS[c]} (${c})`}
                                    className={`w-7 h-7 rounded-full font-bold transition-all flex flex-col items-center justify-center cursor-pointer leading-none ${
                                      isSelected
                                        ? "bg-purple-600 text-white shadow-xs scale-105"
                                        : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:border-purple-400"
                                    }`}
                                  >
                                    <span className="text-[11px]">{CHOICE_LABELS[c]}</span>
                                    <span className="text-[7px] opacity-75">{c}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Mobile Sticky/Bottom Submit Button so teachers don't have to scroll back up */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 lg:hidden">
              <button
                type="submit"
                disabled={saving || regrading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-purple-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึกชุดข้อสอบและเฉลย...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> {isEditMode ? "บันทึกการแก้ไขชุดข้อสอบ" : "บันทึกและสร้างชุดข้อสอบ"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function CreateExamPaperPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      }
    >
      <CreateExamPaperForm />
    </Suspense>
  );
}
