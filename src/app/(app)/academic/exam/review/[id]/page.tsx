"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Edit3, 
  ShieldCheck, 
  Loader2, 
  Save, 
  Sparkles, 
  History, 
  FileText,
  BookOpen,
  Trash2
} from "lucide-react";
import { 
  getSubmissionDetailsAction, 
  updateItemManualOverrideAction,
  updateSubjectiveScoreAction,
  deleteExamSubmissionAction
} from "@/app/actions/omr";
import { useSession } from "@/lib/auth-client";

export default function TeacherReviewStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const submissionId = resolvedParams.id;
  const router = useRouter();
  const { data: session } = useSession();

  const [submission, setSubmission] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingItemNo, setUpdatingItemNo] = useState<number | null>(null);
  const [savingSubjective, setSavingSubjective] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Subjective scores form state
  const [subjectiveScores, setSubjectiveScores] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await getSubmissionDetailsAction(submissionId);
        setSubmission(data);
        if (data?.subjectiveScores) {
          const loaded: Record<string, number> = {};
          for (const [k, v] of Object.entries(data.subjectiveScores)) {
            loaded[k] = Number(v);
          }
          setSubjectiveScores(loaded);
        }
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
      await updateItemManualOverrideAction({
        submissionId,
        itemNo,
        overrideChoice: choice,
        performedByUserId: session.user.id
      });
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

  const handleSaveSubjectiveScores = async () => {
    if (!session?.user?.id) return;
    try {
      setSavingSubjective(true);
      const updated = await updateSubjectiveScoreAction({
        submissionId,
        subjectiveScores,
        performedByUserId: session.user.id
      });
      setSubmission((prev: any) => ({
        ...prev,
        subjectiveScore: updated.subjectiveScore,
        subjectiveScores: updated.subjectiveScores,
        netScore: updated.netScore
      }));
      setFeedbackMsg("บันทึกคะแนนอัตนัยและคำนวณคะแนนสุทธิเรียบร้อยแล้ว");
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      console.error("Failed to save subjective scores:", err);
      alert("เกิดข้อผิดพลาดในการบันทึกคะแนนอัตนัย: " + (err.message || "Unknown error"));
    } finally {
      setSavingSubjective(false);
    }
  };

  const [deleting, setDeleting] = useState(false);
  const handleDeleteSubmission = async () => {
    if (!submission) return;
    if (!confirm(`คุณต้องการลบผลการตรวจของนักเรียนรหัส ${submission.studentId} ใช่หรือไม่? ข้อมูลการตรวจทั้งหมดของแผ่นนี้จะถูกลบถาวร`)) {
      return;
    }
    try {
      setDeleting(true);
      await deleteExamSubmissionAction(submissionId);
      alert("ลบผลการตรวจเรียบร้อยแล้ว");
      router.push(`/academic/exam/scan?paperId=${submission.examPaperId}`);
    } catch (err: any) {
      console.error("Failed to delete submission:", err);
      alert(err.message || "เกิดข้อผิดพลาดในการลบผลการตรวจ");
      setDeleting(false);
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
  const subjectiveItems = paper?.subjectiveItems || [];
  const hasSubjective = subjectiveItems.length > 0;
  const answerKey = paper?.answerKeys?.find((k: any) => k.versionCode === submission.versionCode);
  const keyMap = new Map<number, string[]>();
  if (answerKey) {
    for (const it of answerKey.items) {
      keyMap.set(it.itemNo, it.correctChoices);
    }
  }

  const totalPossible = Number(paper?.maxScore || 0) + Number(paper?.subjectiveMaxScore || 0);

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
              ศูนย์ตรวจทานคำตอบ & ให้คะแนนอัตนัย (Review Studio)
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {paper?.subjectCode} {paper?.subjectName} • รหัสนักเรียน: {submission.studentId}
            </p>
          </div>
        </div>

        {feedbackMsg && (
          <div className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{feedbackMsg}</span>
          </div>
        )}
      </div>

      {/* 2-Column Asymmetric Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Review Grid & Subjective Score Entry */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top Score Banner Card */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
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
                <div className="text-xs text-slate-500">คะแนนรวมสุทธิ (Net Score)</div>
                <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {Number(submission.netScore)} <span className="text-sm font-semibold text-slate-400">/ {totalPossible}</span>
                </div>
              </div>
            </div>

            {/* Score Breakdown Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-bold">
                <div className="text-[10px] text-purple-600/80">คะแนนปรนัย</div>
                <div className="text-base">{Number(submission.rawScore)} / {Number(paper?.maxScore)}</div>
              </div>
              {hasSubjective && (
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold">
                  <div className="text-[10px] text-indigo-600/80">คะแนนอัตนัย</div>
                  <div className="text-base">{Number(submission.subjectiveScore || 0)} / {Number(paper?.subjectiveMaxScore || 0)}</div>
                </div>
              )}
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold">
                <div className="text-[10px] text-emerald-600/80">ปรนัยตอบถูก</div>
                <div className="text-base">{submission.totalCorrect} ข้อ</div>
              </div>
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 font-bold">
                <div className="text-[10px] text-red-600/80">ปรนัยตอบผิด</div>
                <div className="text-base">{submission.totalIncorrect} ข้อ</div>
              </div>
            </div>
          </div>

          {/* Section 2: Subjective Scoring Form (If Paper Has Subjective Items) */}
          {hasSubjective && (
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-2 border-indigo-200 dark:border-indigo-900/60 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900/60 pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    ตอนที่ 2: บันทึกคะแนนข้อสอบอัตนัย (เขียนตอบ)
                  </h2>
                </div>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full">
                  เต็ม {Number(paper.subjectiveMaxScore)} คะแนน
                </span>
              </div>

              <div className="space-y-3">
                {subjectiveItems.map((sItem: any) => {
                  const key = String(sItem.itemNo);
                  const currentScore = subjectiveScores[key] !== undefined ? subjectiveScores[key] : (submission.subjectiveScores?.[key] || 0);

                  return (
                    <div
                      key={sItem.itemNo}
                      className="p-3.5 rounded-2xl bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex-1">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>ข้อที่ {sItem.itemNo}: {sItem.title}</span>
                          <span className="text-indigo-600 font-mono">(เต็ม {Number(sItem.maxScore)} คะแนน)</span>
                        </div>
                        {sItem.rubricDetail && (
                          <div className="text-[11px] text-slate-500 mt-0.5 italic">
                            เกณฑ์: {sItem.rubricDetail}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <span className="text-slate-500 font-semibold">คะแนนที่ได้:</span>
                        <input
                          type="number"
                          min="0"
                          max={Number(sItem.maxScore)}
                          step="0.5"
                          value={currentScore}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(Number(sItem.maxScore), Number(e.target.value)));
                            setSubjectiveScores((prev) => ({ ...prev, [key]: val }));
                          }}
                          className="w-20 h-9 px-2 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-center font-bold text-sm text-indigo-900 dark:text-indigo-200"
                        />
                        <span className="text-slate-400 font-mono">/ {Number(sItem.maxScore)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={savingSubjective}
                  onClick={handleSaveSubjectiveScores}
                  className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/25 flex items-center gap-2 active:scale-95 transition"
                >
                  {savingSubjective ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  บันทึกคะแนนอัตนัย
                </button>
              </div>
            </div>
          )}

          {/* Interactive Multiple Choice Items Table */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" /> ตรวจทานข้อสอบปรนัย (คลิกปุ่มเพื่อแก้ไขตัวเลือก)
              </h2>
              <span className="text-xs text-slate-400">คำนวณคะแนนใหม่ทันที</span>
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
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <History className="w-4 h-4 text-purple-600" />
              ประวัติการแก้ไขและบันทึก (Audit Log)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              ทุกการแก้ไขตัวเลือกและคะแนนอัตนัยโดยครูผู้สอน จะถูกบันทึกลงฐานข้อมูลแบบไม่สามารถลบหรือดัดแปลงได้
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
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600" /> หลักเกณฑ์การพิจารณาคะแนน
            </h4>
            <p>
              • หากนักเรียนลบคำตอบเดิมไม่สะอาด แต่ฝนคำตอบใหม่เข้มชัดเจน ครูสามารถคลิกแก้ไขเป็นตัวเลือกที่ถูกต้องได้
            </p>
            <p>
              • คะแนนอัตนัยจะถูกตรวจสอบ Invariant ขอบเขตล่าง (≥ 0) และขอบเขตบน (≤ คะแนนเต็มแต่ละข้อ) ทั้งในฝั่ง Client และ Database
            </p>
          </div>

          {/* Danger Zone: Delete Submission */}
          <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-3xl p-6 shadow-sm space-y-3">
            <h4 className="font-bold text-red-700 dark:text-red-400 flex items-center gap-2 text-xs">
              <Trash2 className="w-4 h-4 text-red-600" /> ลบผลการตรวจนี้
            </h4>
            <p className="text-xs text-red-600/80 dark:text-red-400/80 leading-relaxed">
              หากต้องการลบกระดาษคำตอบแผ่นนี้ออกจากระบบ สามารถคลิกปุ่มด้านล่างเพื่อลบข้อมูลการตรวจทั้งหมด
            </p>
            <button
              type="button"
              onClick={handleDeleteSubmission}
              disabled={deleting}
              className="w-full py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              ลบผลการตรวจแผ่นนี้
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
