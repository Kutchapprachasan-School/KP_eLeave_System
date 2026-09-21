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
  Plus,
  Trash2,
  RefreshCw,
  Info,
  BookOpen
} from "lucide-react";
import { 
  createExamPaperAction, 
  updateExamPaperAction,
  updateAnswerKeyWithVersionAction,
  processRegradeJobChunkAction,
  regradeSubmissionsChunkAction,
  getExamPaperDetailsAction 
} from "@/app/actions/omr";
import { useSession } from "@/lib/auth-client";

interface SubjectiveRow {
  itemNo: number;
  title: string;
  maxScore: number;
  rubricDetail: string;
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

  // Form State
  const [subjectCode, setSubjectCode] = useState("ว23101");
  const [subjectName, setSubjectName] = useState("วิทยาศาสตร์ 5");
  const [academicYear, setAcademicYear] = useState(2569);
  const [term, setTerm] = useState(1);
  const [gradeLevel, setGradeLevel] = useState("ม.3");
  const [title, setTitle] = useState("สอบกลางภาคเรียนที่ 1/2569");
  const [totalItems, setTotalItems] = useState(50);
  const [maxScore, setMaxScore] = useState(50);
  const [passScore, setPassScore] = useState(25);

  // Subjective Items (Section 2)
  const [hasSubjective, setHasSubjective] = useState(false);
  const [subjectiveItems, setSubjectiveItems] = useState<SubjectiveRow[]>([]);

  // Answer Key State (Version "01")
  const [answerKey, setAnswerKey] = useState<Record<number, string[]>>(() => {
    const initial: Record<number, string[]> = {};
    for (let i = 1; i <= 50; i++) {
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
        const paper = await getExamPaperDetailsAction(editPaperId, {
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
          setMaxScore(Number(paper.maxScore));
          setPassScore(Number(paper.passScore));

          // Populate subjective items
          if (paper.subjectiveItems && paper.subjectiveItems.length > 0) {
            setHasSubjective(true);
            setSubjectiveItems(
              paper.subjectiveItems.map((item: any) => ({
                itemNo: item.itemNo,
                title: item.title,
                maxScore: Number(item.maxScore),
                rubricDetail: item.rubricDetail || ""
              }))
            );
          }

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

  const handleSetSingleChoice = (itemNo: number, choice: string) => {
    setAnswerKey((prev) => ({
      ...prev,
      [itemNo]: [choice]
    }));
  };

  const handleQuickPattern = (pattern: "A" | "B" | "C" | "D" | "CYCLE") => {
    const choices = ["A", "B", "C", "D"];
    const updated: Record<number, string[]> = {};
    for (let i = 1; i <= totalItems; i++) {
      if (pattern === "CYCLE") {
        updated[i] = [choices[(i - 1) % 4]];
      } else {
        updated[i] = [pattern];
      }
    }
    setAnswerKey(updated);
  };

  // Subjective Handlers
  const handleAddSubjectiveItem = (score: number = 5, customTitle?: string) => {
    setHasSubjective(true);
    setSubjectiveItems((prev) => [
      ...prev,
      {
        itemNo: prev.length + 1,
        title: customTitle || `ข้อที่ ${prev.length + 1}`,
        maxScore: score,
        rubricDetail: ""
      }
    ]);
  };

  const handleAddMultipleSubjective = (count: number, scorePerItem: number) => {
    setHasSubjective(true);
    setSubjectiveItems((prev) => {
      const currentLength = prev.length;
      const newItems: SubjectiveRow[] = [];
      for (let i = 1; i <= count; i++) {
        const itemNo = currentLength + i;
        newItems.push({
          itemNo,
          title: `ข้อที่ ${itemNo}`,
          maxScore: scorePerItem,
          rubricDetail: ""
        });
      }
      return [...prev, ...newItems];
    });
  };

  const handleRemoveSubjectiveItem = (idx: number) => {
    setSubjectiveItems((prev) => {
      const filtered = prev.filter((_, i) => i !== idx);
      const reindexed = filtered.map((item, i) => ({ ...item, itemNo: i + 1 }));
      if (reindexed.length === 0) {
        setHasSubjective(false);
      }
      return reindexed;
    });
  };

  const handleUpdateSubjectiveItem = (idx: number, field: keyof SubjectiveRow, value: any) => {
    setSubjectiveItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const totalSubjectiveScore = hasSubjective
    ? subjectiveItems.reduce((sum, item) => sum + Number(item.maxScore || 0), 0)
    : 0;

  const totalPaperScore = Number(maxScore) + totalSubjectiveScore;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) {
      setError("กรุณาเข้าสู่ระบบก่อนดำเนินการ");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const subjPayload = hasSubjective ? subjectiveItems : [];

      const keyItems = [];
      for (let i = 1; i <= totalItems; i++) {
        keyItems.push({
          itemNo: i,
          correctChoices: answerKey[i] && answerKey[i].length > 0 ? answerKey[i] : ["A"],
          points: Number(maxScore) / totalItems,
          penaltyPoints: 0.0
        });
      }

      if (isEditMode && editPaperId) {
        // 1. Update Paper Metadata
        await updateExamPaperAction(
          editPaperId,
          {
            subjectCode,
            subjectName,
            academicYear: Number(academicYear),
            term: Number(term),
            gradeLevel,
            title,
            maxScore: Number(maxScore),
            passScore: Number(passScore),
            subjectiveItems: subjPayload
          },
          { userId: session.user.id }
        );

        // 2. Update Answer Key with Version Snapshot
        const verRes = await updateAnswerKeyWithVersionAction({
          examPaperId: editPaperId,
          versionCode: "01",
          items: keyItems,
          changedById: session.user.id,
          reason: `ปรับปรุงข้อมูลและเฉลยคำตอบโดยผู้สร้าง`
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
              throw new Error(chunkRes.reason || "การตรวจข้อสอบซ้ำเกิดข้อผิดพลาด");
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
          maxScore: Number(maxScore),
          passScore: Number(passScore),
          createdById: session.user.id,
          subjectiveItems: subjPayload
        });

        // 2. Commit initial Answer Key Version Snapshot
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
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              {isEditMode ? "แก้ไขชุดข้อสอบ & อัปเดตเฉลย" : "สร้างชุดข้อสอบ & กำหนดเฉลย (กำหนดข้อได้สูงสุด 100 ข้อ)"}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              กำหนดข้อสอบปรนัย (1–100 ข้อ) และตอนที่ 2 ข้อสอบอัตนัยในหน้าเดียวกัน พร้อมระบบเฉลย Snapshot Versioning
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
              เมื่อท่านบันทึก ระบบจะสร้าง <strong>Key Version Snapshot</strong> ใหม่ และรันกระบวนการ <strong>Chunked Re-grade</strong> เพื่อคำนวณคะแนนใหม่ทุกแผ่นอัตโนมัติอย่างปลอดภัย
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
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">กำลัง Re-grade คะแนนนักเรียน...</h3>
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

      {/* Main 2-Column Layout */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Answer Key Editor & Subjective Section 2 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Answer Key Grid (Section 1: ปรนัย) */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-purple-600" /> ตอนที่ 1: เฉลยปรนัย ({totalItems} ข้อ)
                </h2>
                <div className="text-xs text-slate-400 mt-0.5">
                  คลิกเลือกตัวเลือกที่ถูกต้อง (คลิกขวาเพื่อเลือกหลายตัวเลือก) • ปรับจำนวนข้อได้ที่แผงด้านขวา (1–100 ข้อ)
                </div>
              </div>

              {/* Quick Pattern Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                <span className="text-slate-400 px-1.5">ลัด:</span>
                <button
                  type="button"
                  onClick={() => handleQuickPattern("A")}
                  className="px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  ทั้งหมด A
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPattern("B")}
                  className="px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  ทั้งหมด B
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPattern("C")}
                  className="px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  ทั้งหมด C
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPattern("D")}
                  className="px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  ทั้งหมด D
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPattern("CYCLE")}
                  className="px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-purple-600 dark:text-purple-400 font-bold transition cursor-pointer"
                >
                  สลับ A-B-C-D
                </button>
              </div>
            </div>

            {/* Column-First Answer Key Grid: top-to-bottom per column (matches paper layout) */}
            {(() => {
              const numCols = totalItems <= 20 ? 2 : totalItems <= 40 ? 2 : totalItems <= 60 ? 3 : 4;
              const itemsPerCol = Math.ceil(totalItems / numCols);
              const columns = Array.from({ length: numCols }, (_, colIdx) => {
                const start = colIdx * itemsPerCol + 1;
                const end = Math.min((colIdx + 1) * itemsPerCol, totalItems);
                return start <= totalItems ? { start, end } : null;
              }).filter((c): c is { start: number; end: number } => c !== null);

              return (
                <div className={`grid grid-cols-1 ${numCols === 2 ? "sm:grid-cols-2" : numCols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4"} gap-4 max-h-[640px] overflow-y-auto pr-1`}>
                  {columns.map((col, colIdx) => (
                    <div key={colIdx} className="space-y-2">
                      <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 pb-1 border-b border-slate-200 dark:border-slate-800">
                        ข้อ {col.start} - {col.end}
                      </div>
                      {Array.from({ length: col.end - col.start + 1 }, (_, idx) => {
                        const itemNo = col.start + idx;
                        const currentChoices = answerKey[itemNo] || [];

                        return (
                          <div
                            key={itemNo}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs hover:border-purple-300 transition"
                          >
                            <span className="font-bold text-slate-700 dark:text-slate-300 w-9 truncate">
                              {itemNo}.
                            </span>

                            <div className="flex items-center gap-1">
                              {["A", "B", "C", "D"].map((c) => {
                                const isSelected = currentChoices.includes(c);
                                return (
                                  <button
                                    type="button"
                                    key={c}
                                    onClick={() => handleSetSingleChoice(itemNo, c)}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      handleToggleChoice(itemNo, c);
                                    }}
                                    title="คลิกซ้าย: เลือกเดี่ยว | คลิกขวา: เลือกหลายตัวเลือก"
                                    className={`w-6.5 h-6.5 rounded-full font-bold transition-all flex items-center justify-center cursor-pointer text-xs ${
                                      isSelected
                                        ? "bg-purple-600 text-white shadow-xs scale-105"
                                        : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:border-purple-400"
                                    }`}
                                  >
                                    {c}
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
          </div>

          {/* 2. Subjective Section 2 (ตอนที่ 2 ข้อสอบอัตนัย บนหน้าเดียวกัน) */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    ตอนที่ 2: ข้อสอบอัตนัย (เขียนตอบ)
                  </h2>
                  <p className="text-xs text-slate-400">
                    ตั้งค่าคำถามอัตนัย คะแนนเต็ม และเกณฑ์การตรวจในหน้าเดียวกัน ({hasSubjective ? `${subjectiveItems.length} ข้อ รวม ${totalSubjectiveScore} คะแนน` : "ปิดใช้งานอยู่"})
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl">
                <input
                  type="checkbox"
                  checked={hasSubjective}
                  onChange={(e) => {
                    setHasSubjective(e.target.checked);
                    if (e.target.checked && subjectiveItems.length === 0) {
                      handleAddSubjectiveItem(5);
                    }
                  }}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-slate-700 dark:text-slate-200 font-bold">เปิดใช้งานข้อสอบอัตนัย</span>
              </label>
            </div>

            {hasSubjective && (
              <div className="space-y-4 animate-in fade-in">
                {/* Quick Add Presets */}
                <div className="flex flex-wrap items-center gap-2 p-2.5 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 text-xs">
                  <span className="text-indigo-900 dark:text-indigo-300 font-bold text-[11px]">เพิ่มด่วน:</span>
                  <button
                    type="button"
                    onClick={() => handleAddSubjectiveItem(5)}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold transition cursor-pointer"
                  >
                    + 1 ข้อ (5 คะแนน)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddSubjectiveItem(10)}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold transition cursor-pointer"
                  >
                    + 1 ข้อ (10 คะแนน)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddSubjectiveItem(20)}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold transition cursor-pointer"
                  >
                    + 1 ข้อ (20 คะแนน)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddMultipleSubjective(2, 5)}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold transition cursor-pointer"
                  >
                    + 2 ข้อ (ข้อละ 5 คะแนน)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddMultipleSubjective(2, 10)}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold transition cursor-pointer"
                  >
                    + 2 ข้อ (ข้อละ 10 คะแนน)
                  </button>
                </div>

                {subjectiveItems.map((sItem, sIdx) => (
                  <div
                    key={sIdx}
                    className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/60 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-indigo-200/80 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200 font-mono">
                          ข้อที่ {sItem.itemNo}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          (ข้อสอบอัตนัย)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubjectiveItem(sIdx)}
                        className="text-rose-500 hover:text-rose-700 p-1 rounded-lg transition cursor-pointer"
                        title="ลบข้อนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          คำชี้แจง / คำถามข้อสอบอัตนัย <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="เช่น ให้นักเรียนอธิบายขั้นตอนกระบวนการสังเคราะห์ด้วยแสง พร้อมยกตัวอย่าง..."
                          value={sItem.title}
                          onChange={(e) => handleUpdateSubjectiveItem(sIdx, "title", e.target.value)}
                          className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          คะแนนเต็มข้อนี้ (0-30) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            max="30"
                            step="1"
                            required
                            value={sItem.maxScore}
                            onChange={(e) => handleUpdateSubjectiveItem(sIdx, "maxScore", Math.min(30, Math.max(1, Number(e.target.value))))}
                            className="w-full h-9 pl-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold font-mono text-slate-900 dark:text-white"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-semibold pointer-events-none">
                            คะแนน
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        เกณฑ์การให้คะแนนแบบละเอียด (Rubric Detail)
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น อธิบายครบ 3 ประเด็นได้เต็ม, อธิบายได้ 2 ประเด็นได้ 3 คะแนน, ตอบไม่ตรงประเด็นได้ 0"
                        value={sItem.rubricDetail}
                        onChange={(e) => handleUpdateSubjectiveItem(sIdx, "rubricDetail", e.target.value)}
                        className="w-full h-8 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => handleAddSubjectiveItem(5)}
                  className="w-full h-10 rounded-2xl border border-dashed border-indigo-300 dark:border-indigo-800 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> เพิ่มข้อสอบอัตนัย
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Exam Paper Metadata Form */}
        <div className="space-y-6">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" /> ข้อมูลแบบทดสอบ
            </h2>

            {/* Subject Code & Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                รหัสวิชา & ชื่อรายวิชา
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

              {/* 4 OMR Tiers Quick Selection */}
              <div className="mb-2">
                <div className="text-[11px] font-bold text-slate-500 mb-1">
                  รูปแบบแม่แบบมาตรฐาน 4 ระดับ (ZipGrade-Grade):
                </div>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {[
                    { count: 20, label: "20 ข้อ", sub: "สแกนไวสุด" },
                    { count: 50, label: "50 ข้อ", sub: "มาตรฐาน" },
                    { count: 75, label: "75 ข้อ", sub: "วิชาหลัก" },
                    { count: 100, label: "100 ข้อ", sub: "ข้อสอบใหญ่" }
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
                      <div className="text-[12px] font-bold">{tier.label}</div>
                      <div className="text-[9px] text-slate-500 truncate">{tier.sub}</div>
                    </button>
                  ))}
                </div>

                {/* Additional Quick Presets */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1">
                  <span className="text-[10px] text-slate-400 shrink-0">กำหนดเอง:</span>
                  {[10, 15, 25, 30, 40, 60, 80].map((preset) => (
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
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-purple-950 dark:text-purple-200">
                      แม่แบบที่จับคู่: {totalItems <= 20 ? "KP-OMR-A4-20" : totalItems <= 50 ? "KP-OMR-A4-50" : totalItems <= 75 ? "KP-OMR-A4-75" : "KP-OMR-A4-100"}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-200/80 dark:bg-purple-800/60 text-purple-800 dark:text-purple-200">
                      {totalItems <= 20 ? "Tier 1: ≤ 20 ข้อ" : totalItems <= 50 ? "Tier 2: 21–50 ข้อ" : totalItems <= 75 ? "Tier 3: 51–75 ข้อ" : "Tier 4: 76–100 ข้อ"}
                    </span>
                  </div>
                  <div className="text-purple-700 dark:text-purple-300 mt-0.5">
                    {totalItems <= 20
                      ? "ฟองคำตอบใหญ่พิเศษ สแกนติดเร็วสุดเสี้ยววินาที รองรับการพิมพ์ 2 ชุดในแผ่น A4 เดียว (Half-A4) หรือรวมอัตนัยในหน้าเดียว"
                      : totalItems <= 50
                      ? "มาตรฐาน 2 คอลัมน์ x 25 ข้อ สวยงาม สมดุลย์ เหมาะกับสอบเก็บคะแนนและสอบกลาง/ปลายภาค"
                      : totalItems <= 75
                      ? "3 คอลัมน์ x 25 ข้อ คมชัดสูง ช่องวงกลมโปร่งกว่าแบบ 100 ข้อ สแกนติดง่ายสำหรับวิชาหลัก 60–75 ข้อ"
                      : "4 คอลัมน์ x 25 ข้อ ความหนาแน่นสูง สำหรับชุดข้อสอบขนาดใหญ่ O-NET และแบบทดสอบมาตรฐาน"}
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
                  เกณฑ์ผ่าน
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
                <span>คะแนนปรนัย ({totalItems} ข้อ):</span>
                <span className="font-mono">{Number(maxScore)} คะแนน</span>
              </div>
              {hasSubjective && (
                <div className="flex justify-between text-indigo-700 dark:text-indigo-300 font-semibold">
                  <span>คะแนนอัตนัย ({subjectiveItems.length} ข้อ):</span>
                  <span className="font-mono">{totalSubjectiveScore} คะแนน</span>
                </div>
              )}
              <div className="flex justify-between text-purple-900 dark:text-purple-200 font-bold border-t border-purple-200 dark:border-purple-800/60 pt-1.5 text-sm">
                <span>คะแนนรวมทั้งสิ้น:</span>
                <span className="font-mono">{totalPaperScore} คะแนน</span>
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
              className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-purple-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึกชุดข้อสอบและเฉลย...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> {isEditMode ? "บันทึกการแก้ไข" : "บันทึกและสร้างชุดข้อสอบ"}
                </>
              )}
            </button>
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

