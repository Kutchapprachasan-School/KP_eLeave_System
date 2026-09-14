"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Camera, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  BarChart3, 
  Users,
  Loader2,
  ListOrdered
} from "lucide-react";
import { OmrCameraScanner } from "@/components/omr/OmrCameraScanner";
import { listExamPapersAction, getExamPaperDetailsAction } from "@/app/actions/omr";

export default function ExamScanPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialPaperId = searchParams.get("paperId");

  const [papers, setPapers] = useState<any[]>([]);
  const [selectedPaperId, setSelectedPaperId] = useState<string>(initialPaperId || "");
  const [currentPaper, setCurrentPaper] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentScans, setRecentScans] = useState<any[]>([]);

  // Load available papers
  useEffect(() => {
    async function loadPapers() {
      try {
        setLoading(true);
        const data = await listExamPapersAction();
        setPapers(data);
        if (!selectedPaperId && data.length > 0) {
          setSelectedPaperId(data[0].id);
        }
      } catch (err) {
        console.error("Failed to list exam papers:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPapers();
  }, [selectedPaperId]);

  // Load details of selected paper
  useEffect(() => {
    async function loadPaperDetails() {
      if (!selectedPaperId) return;
      try {
        const details = await getExamPaperDetailsAction(selectedPaperId);
        setCurrentPaper(details);
        if (details?.submissions) {
          setRecentScans(details.submissions);
        }
      } catch (err) {
        console.error("Failed to get paper details:", err);
      }
    }
    loadPaperDetails();
  }, [selectedPaperId]);

  const handleScanComplete = (newSubmission: any) => {
    setRecentScans((prev) => [newSubmission, ...prev.filter((s) => s.id !== newSubmission.id)]);
  };

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
              <Camera className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              ห้องสแกนตรวจข้อสอบ (Camera HUD)
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              ตรวจกระดาษคำตอบอัตโนมัติด้วยระบบประมวลผลภาพความเร็วสูง
            </p>
          </div>
        </div>

        {/* Paper Selector Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 shrink-0">ชุดข้อสอบ:</span>
          <select
            value={selectedPaperId}
            onChange={(e) => setSelectedPaperId(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white max-w-xs truncate"
          >
            {papers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.subjectCode} - {p.title} ({p.gradeLevel})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-2" />
          <div className="text-sm font-semibold">กำลังโหลดข้อมูลชุดข้อสอบ...</div>
        </div>
      ) : !selectedPaperId ? (
        <div className="p-12 text-center bg-white/80 dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <FileText className="w-12 h-12 mx-auto text-slate-400" />
          <div className="text-base font-bold text-slate-800 dark:text-slate-200">ไม่พบชุดข้อสอบที่เลือก</div>
          <Link
            href="/academic/exam/omr/create"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold"
          >
            สร้างชุดข้อสอบใหม่
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols): Live Camera HUD Scanner */}
          <div className="lg:col-span-2 space-y-4">
            <OmrCameraScanner
              paperId={selectedPaperId}
              totalItems={currentPaper?.totalItems || 50}
              onScanComplete={handleScanComplete}
            />
          </div>

          {/* Right Column (1 Col): Paper Info & Live Scanned Submissions Roster */}
          <div className="space-y-6">
            {/* Paper Overview Box */}
            {currentPaper && (
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-xs">
                    {currentPaper.subjectCode}
                  </span>
                  <span className="text-xs text-slate-500">
                    {currentPaper.gradeLevel} • ภาคเรียนที่ {currentPaper.term}
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {currentPaper.title}
                </div>
                <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center text-xs">
                  <div>
                    <div className="text-slate-400 text-[10px]">จำนวนข้อ</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{currentPaper.totalItems} ข้อ</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">คะแนนเต็ม</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{Number(currentPaper.maxScore)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">ตรวจแล้ว</div>
                    <div className="font-bold text-emerald-600">{recentScans.length} แผ่น</div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 text-xs">
                  <Link
                    href={`/print/exam/sheet/${currentPaper.id}`}
                    className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Printer className="w-3.5 h-3.5" /> พิมพ์กระดาษคำตอบ
                  </Link>
                  <Link
                    href={`/academic/exam/analysis/${currentPaper.id}`}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <BarChart3 className="w-3.5 h-3.5" /> รายงาน KR-20
                  </Link>
                </div>
              </div>
            )}

            {/* Live Scanned Roster List */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ListOrdered className="w-4 h-4 text-purple-600" />
                  รายชื่อที่ตรวจแล้วล่าสุด ({recentScans.length})
                </h3>
              </div>

              {recentScans.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  ยังไม่มีผลการตรวจในเซสชันนี้
                </div>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {recentScans.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          รหัส {sub.studentId} {sub.studentName ? `• ${sub.studentName}` : ""}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ชุด {sub.versionCode} • ครั้งที่ {sub.attemptNo} • ถูก {sub.totalCorrect}/{currentPaper?.totalItems}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {Number(sub.netScore)} คะแนน
                        </div>
                        <Link
                          href={`/academic/exam/review/${sub.id}`}
                          className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline font-semibold"
                        >
                          ตรวจทานคำตอบ &gt;
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
