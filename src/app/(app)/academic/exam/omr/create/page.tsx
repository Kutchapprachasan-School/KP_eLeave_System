"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Save, 
  Sparkles, 
  CheckSquare, 
  HelpCircle, 
  Loader2, 
  Layers, 
  FileText,
  AlertCircle
} from "lucide-react";
import { createExamPaperAction, configureAnswerKeyAction } from "@/app/actions/omr";
import { useSession } from "@/lib/auth-client";

export default function CreateExamPaperPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [subjectCode, setSubjectCode] = useState("ว23101");
  const [subjectName, setSubjectName] = useState("วิทยาศาสตร์ 5");
  const [academicYear, setAcademicYear] = useState(2026);
  const [term, setTerm] = useState(1);
  const [gradeLevel, setGradeLevel] = useState("ม.3");
  const [title, setTitle] = useState("สอบกลางภาคเรียนที่ 1/2569");
  const [totalItems, setTotalItems] = useState(50);
  const [maxScore, setMaxScore] = useState(50);
  const [passScore, setPassScore] = useState(25);

  // Answer Key State (Version "01")
  const [answerKey, setAnswerKey] = useState<Record<number, string[]>>(() => {
    const initial: Record<number, string[]> = {};
    for (let i = 1; i <= 50; i++) {
      initial[i] = ["A"]; // default A
    }
    return initial;
  });

  const handleTotalItemsChange = (newCount: number) => {
    setTotalItems(newCount);
    setMaxScore(newCount);
    setPassScore(Math.floor(newCount / 2));
    const updated: Record<number, string[]> = {};
    for (let i = 1; i <= newCount; i++) {
      updated[i] = answerKey[i] || ["A"];
    }
    setAnswerKey(updated);
  };

  const handleToggleChoice = (itemNo: number, choice: string) => {
    setAnswerKey((prev) => {
      const current = prev[itemNo] || [];
      if (current.includes(choice)) {
        if (current.length === 1) return prev; // At least one choice required
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) {
      setError("กรุณาเข้าสู่ระบบก่อนสร้างชุดข้อสอบ");
      return;
    }

    try {
      setSaving(true);
      setError(null);

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
        createdById: session.user.id
      });

      // 2. Configure Answer Key
      const keyItems = [];
      for (let i = 1; i <= totalItems; i++) {
        keyItems.push({
          itemNo: i,
          correctChoices: answerKey[i] && answerKey[i].length > 0 ? answerKey[i] : ["A"],
          points: Number(maxScore) / totalItems,
          penaltyPoints: 0.0
        });
      }

      await configureAnswerKeyAction({
        examPaperId: paper.id,
        versionCode: "01",
        items: keyItems
      });

      router.push("/academic/exam/omr");
    } catch (err: any) {
      console.error("Failed to create exam paper:", err);
      setError(err.message || "เกิดข้อผิดพลาดในการสร้างชุดข้อสอบ");
    } finally {
      setSaving(false);
    }
  };

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
              สร้างชุดข้อสอบ & กำหนดเฉลย
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              กำหนดข้อมูลรายวิชาและตัวเลือกเฉลยสำหรับกระดาษคำตอบ A4 มาตรฐาน
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2-Column Asymmetric Grid */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Answer Key Editor */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-purple-600" /> กำหนดเฉลยคำตอบ (ชุดที่ 01)
                </h2>
                <div className="text-xs text-slate-400 mt-0.5">
                  คลิกเลือกตัวเลือกที่ถูกต้อง (รองรับ 1 ข้อถูกได้มากกว่า 1 ตัวเลือก)
                </div>
              </div>

              {/* Quick Pattern Buttons */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                <span className="text-slate-400 px-2">ลัด:</span>
                <button
                  type="button"
                  onClick={() => handleQuickPattern("A")}
                  className="px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                >
                  ทั้งหมด A
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPattern("B")}
                  className="px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                >
                  ทั้งหมด B
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPattern("CYCLE")}
                  className="px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-purple-600 dark:text-purple-400 font-bold"
                >
                  สลับ A-B-C-D
                </button>
              </div>
            </div>

            {/* Answer Key Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {Array.from({ length: totalItems }, (_, idx) => {
                const itemNo = idx + 1;
                const currentChoices = answerKey[itemNo] || [];

                return (
                  <div
                    key={itemNo}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs"
                  >
                    <span className="font-bold text-slate-700 dark:text-slate-300 w-8">
                      ข้อ {itemNo}.
                    </span>

                    <div className="flex items-center gap-1.5">
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
                            className={`w-7 h-7 rounded-full font-bold transition-all flex items-center justify-center ${
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
          </div>
        </div>

        {/* Right Column (1 Col): Exam Paper Metadata Form */}
        <div className="space-y-6">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
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
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
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
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
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

            {/* Total Items Selector (20 or 50 items) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                รูปแบบกระดาษคำตอบ A4
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleTotalItemsChange(20)}
                  className={`h-11 rounded-xl font-bold text-xs border transition ${
                    totalItems === 20
                      ? "border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                  }`}
                >
                  แบบ 20 ข้อ
                </button>
                <button
                  type="button"
                  onClick={() => handleTotalItemsChange(50)}
                  className={`h-11 rounded-xl font-bold text-xs border transition ${
                    totalItems === 50
                      ? "border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                  }`}
                >
                  แบบ 50 ข้อ (มาตรฐาน)
                </button>
              </div>
            </div>

            {/* Scores */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  คะแนนเต็ม
                </label>
                <input
                  type="number"
                  min="1"
                  value={maxScore}
                  onChange={(e) => setMaxScore(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
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
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-emerald-600"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-purple-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึกชุดข้อสอบและเฉลย...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> บันทึกและสร้างชุดข้อสอบ
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
