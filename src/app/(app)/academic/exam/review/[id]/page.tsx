"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Edit3, 
  ShieldCheck, 
  Loader2, 
  Save, 
  RotateCcw,
  Sparkles,
  History,
  FileText
} from "lucide-react";
import { getSubmissionDetailsAction, updateItemManualOverrideAction } from "@/app/actions/omr";
import { useSession } from "@/lib/auth-client";

export default function TeacherReviewStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const submissionId = resolvedParams.id;
  const router = useRouter();
  const { data: session } = useSession();

  const [submission, setSubmission] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingItemNo, setUpdatingItemNo] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await getSubmissionDetailsAction(submissionId);
        setSubmission(data);
      } catch (err) {
        console.error("Failed to load submission:", err);
      } finally {
        setLoading(false);
      }
    }
    if (submissionId) {
      loadData();
    }
  }, [submissionId]);

  const handleOverride = async (itemNo: number, choice: string | null) => {
    if (!session?.user?.id) return;
    try {
      setUpdatingItemNo(itemNo);
      const updated = await updateItemManualOverrideAction({
        submissionId,
        itemNo,
        overrideChoice: choice,
        performedByUserId: session.user.id
      });
      // Reload full details
      const refreshed = await getSubmissionDetailsAction(submissionId);
      setSubmission(refreshed);
      setFeedbackMsg(`บันทึกการแก้ไขข้อ ${itemNo} เป็นตัวเลือก ${choice || "ไม่ตอบ"} เรียบร้อย`);
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      console.error("Override failed:", err);
      alert("เกิดข้อผิดพลาดในการแก้ไข: " + (err.message || "Unknown error"));
    } finally {
      setUpdatingItemNo(null);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-2" />
        <div className="text-sm font-semibold">กำลังโหลดผลการตรวจกระดาษคำตอบ...</div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="p-12 text-center bg-white/80 dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 max-w-md mx-auto">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <div className="text-base font-bold text-slate-800 dark:text-slate-200">ไม่พบข้อมูลผลการตรวจที่ระบุ</div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold"
        >
          กลับหน้าก่อนหน้า
        </button>
      </div>
    );
  }

  const paper = submission.examPaper;
  const answerKey = paper?.answerKeys?.find((k: any) => k.versionCode === submission.versionCode);
  const keyMap = new Map<number, string[]>();
  if (answerKey) {
    for (const it of answerKey.items) {
      keyMap.set(it.itemNo, it.correctChoices);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Edit3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              ศูนย์ตรวจทานคำตอบ & แก้ไขคะแนน (Teacher Review Studio)
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {paper?.subjectCode} {paper?.subjectName} • รหัสนักเรียน: {submission.studentId}
            </p>
          </div>
        </div>

        {feedbackMsg && (
          <div className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{feedbackMsg}</span>
          </div>
        )}
      </div>

      {/* 2-Column Asymmetric Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Interactive Question Review Grid */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top Score Banner Card */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="text-xs text-slate-500">ข้อมูลนักเรียนและใบคำตอบ</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  รหัส {submission.studentId} {submission.studentName ? `• ${submission.studentName}` : ""}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  ชั้น {submission.classroom || paper?.gradeLevel} • ชุดข้อสอบ {submission.versionCode} • ครั้งที่ {submission.attemptNo}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-500">คะแนนสุทธิ (Net Score)</div>
                <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {Number(submission.netScore)} <span className="text-sm font-semibold text-slate-400">/ {Number(paper?.maxScore)}</span>
                </div>
              </div>
            </div>

            {/* Score Breakdown Pills */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold">
                <div className="text-[10px] text-emerald-600/80">ตอบถูก</div>
                <div className="text-base">{submission.totalCorrect} ข้อ</div>
              </div>
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 font-bold">
                <div className="text-[10px] text-red-600/80">ตอบผิด</div>
                <div className="text-base">{submission.totalIncorrect} ข้อ</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                <div className="text-[10px] text-slate-500">ไม่ตอบ (Blank)</div>
                <div className="text-base">{submission.totalBlanks} ข้อ</div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold">
                <div className="text-[10px] text-amber-600/80">ฝนซ้ำ / แปลก</div>
                <div className="text-base">{submission.totalMultiple} ข้อ</div>
              </div>
            </div>
          </div>

          {/* Interactive Items Table */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" /> ตรวจทานรายข้อ (คลิกปุ่มเพื่อแก้ไขผลตอบทันที)
              </h2>
              <span className="text-xs text-slate-400">คำนวณคะแนนสุทธิอัตโนมัติ</span>
            </div>

            <div className="space-y-2">
              {submission.itemSubmissions?.map((item: any) => {
                const correctChoices = keyMap.get(item.itemNo) || [];
                const effectiveChoice = item.overrideChoice || item.effectiveChoice;
                const isOverridden = item.isOverridden;
                const isUpdating = updatingItemNo === item.itemNo;

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      item.isCorrect
                        ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60"
                        : item.status === "BLANK"
                        ? "bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800"
                        : item.status === "MULTIPLE_MARKS" || item.confidenceScore < 0.65
                        ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60"
                        : "bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-xs text-slate-700 dark:text-slate-300 w-10">
                        ข้อ {item.itemNo}.
                      </span>

                      {/* Status Icon */}
                      {item.isCorrect ? (
                        <span className="p-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300">
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="p-1 rounded-lg bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-300">
                          <XCircle className="w-4 h-4" />
                        </span>
                      )}

                      <div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <span>คำตอบที่ตรวจได้:</span>
                          <span className="font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-purple-600">
                            {effectiveChoice || "(ไม่ตอบ)"}
                          </span>
                          {isOverridden && (
                            <span className="text-[10px] text-purple-600 font-bold bg-purple-100 dark:bg-purple-950/60 px-1.5 py-0.5 rounded">
                              ครูแก้ไข
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          เฉลย: <strong>{correctChoices.join(", ")}</strong> • ความเชื่อมั่น: {(Number(item.confidenceScore) * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    {/* Teacher Manual Override Buttons */}
                    <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                      <span className="text-[11px] text-slate-400 mr-1.5">เปลี่ยนเป็น:</span>
                      {["A", "B", "C", "D"].map((c) => (
                        <button
                          key={c}
                          disabled={isUpdating}
                          onClick={() => handleOverride(item.itemNo, c)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                            effectiveChoice === c
                              ? "bg-purple-600 text-white shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:border-purple-400"
                          }`}
                        >
                          {c}
                        </button>
                      ))}

                      <button
                        disabled={isUpdating}
                        onClick={() => handleOverride(item.itemNo, null)}
                        className="px-2 h-7 rounded-lg text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 transition ml-1"
                        title="ล้างคำตอบ (เป็นไม่ตอบ)"
                      >
                        ล้าง
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Audit & Guidelines */}
        <div className="space-y-6">
          {/* Audit Trail Card */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <History className="w-4 h-4 text-purple-600" />
              ประวัติการแก้ไขและบันทึก (Audit Log)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              ทุกการแก้ไขตัวเลือกคะแนนโดยครูผู้สอน จะถูกบันทึกลงฐานข้อมูลแบบไม่สามารถลบหรือดัดแปลงได้ (Immutable Audit Trail)
            </p>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="flex justify-between text-slate-500">
                <span>เวอร์ชันการตรวจ:</span>
                <strong className="text-slate-800 dark:text-slate-200">v{submission.gradingVersion}</strong>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>ตรวจเมื่อ:</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {new Date(submission.scannedAt).toLocaleDateString("th-TH")}
                </strong>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>ผู้ตรวจ:</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {submission.scannedByUser?.name || "ครูผู้สอน"}
                </strong>
              </div>
            </div>
          </div>

          {/* Guidelines */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600" /> หลักเกณฑ์การพิจารณาคะแนน
            </h4>
            <p>
              • หากนักเรียนลบคำตอบเดิมไม่สะอาด แต่ฝนคำตอบใหม่เข้มชัดเจน ครูสามารถคลิกแก้ไขเป็นตัวเลือกที่ถูกต้องได้
            </p>
            <p>
              • หากนักเรียนมีเจตนาฝนหลายข้อพร้อมกัน ระบบจะถือเป็นข้อผิด (0 คะแนน) ตามระเบียบการสอบวัดผล
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
