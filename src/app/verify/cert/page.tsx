"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Award, CheckCircle2, XCircle, ShieldCheck, Calendar, Building2, UserCheck, ArrowLeft, RefreshCw, Download, Printer } from "lucide-react";
import Link from "next/link";
import { verifyCertificatePublic } from "@/app/actions/document";
import { formatDocFullDate } from "@/lib/date-format";
import { StatusPillBadge } from "@/components/shared-ui/school-ops/StatusPillBadge";

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("ไม่พบรหัสตรวจสอบเกียรติบัตรในลิงก์ (Missing verification token)");
      setLoading(false);
      return;
    }

    async function check() {
      setLoading(true);
      try {
        const res = await verifyCertificatePublic(token!);
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setError(res.error || "ไม่พบข้อมูลเกียรติบัตรในระบบทะเบียน");
        }
      } catch (err: any) {
        setError(err.message || "เกิดข้อผิดพลาดในการตรวจสอบข้อมูล");
      } finally {
        setLoading(false);
      }
    }

    check();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 p-4">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-500">กำลังตรวจสอบข้อมูลทะเบียนเกียรติบัตร...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-500 flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            ไม่พบข้อมูลเกียรติบัตร
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {error || "รหัสตรวจสอบไม่ถูกต้อง หรือเกียรติบัตรยังไม่ได้บันทึกลงระบบทะเบียน"}
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              กลับหน้าหลัก
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isValid = data.status === "VALID";

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-xl w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header Ribbon */}
        <div className={`p-6 sm:p-8 text-center text-white ${isValid ? "bg-linear-to-r from-emerald-600 to-teal-600" : "bg-linear-to-r from-slate-600 to-rose-700"}`}>
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center mx-auto mb-3 border border-white/20 shadow-inner">
            {isValid ? <ShieldCheck className="w-9 h-9" /> : <XCircle className="w-9 h-9" />}
          </div>
          <div className="text-xs font-bold uppercase tracking-widest text-white/80">
            ระบบตรวจสอบความถูกต้องเกียรติบัตรดิจิทัล
          </div>
          <h1 className="text-xl sm:text-2xl font-black mt-1">
            โรงเรียนกุดจับประชาสรรค์
          </h1>
          <p className="text-[11px] text-white/85 mt-0.5">
            สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาอุดรธานี
          </p>

          <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold">
            {isValid ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>ได้รับการรับรองอย่างเป็นทางการ (Verified)</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-rose-200" />
                <span>เกียรติบัตรฉบับนี้ถูกยกเลิกแล้ว (Cancelled)</span>
              </>
            )}
          </div>
        </div>

        {/* Certificate Details */}
        <div className="p-6 sm:p-8 space-y-5">
          {/* Cert No Display */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                เลขที่เกียรติบัตร (Certificate No.)
              </div>
              <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                {data.certificateNumber}
              </div>
            </div>
            <div className="text-right">
              <StatusPillBadge status={data.status} />
            </div>
          </div>


          {/* Metadata Grid */}
          <div className="space-y-3.5 text-xs">
            <div>
              <span className="font-bold text-slate-500 block">ชื่อกิจกรรม / โครงการ:</span>
              <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block leading-snug">
                {data.activityTitle}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <span className="font-bold text-slate-500 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  บทบาท / หน้าที่:
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {data.roleTitle}
                </span>
              </div>

              <div>
                <span className="font-bold text-slate-500 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-amber-500" />
                  หน่วยงานผู้จัด:
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {data.organization || "-"}
                </span>
              </div>

              <div>
                <span className="font-bold text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  วันที่ออกเกียรติบัตร:
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {formatDocFullDate(data.issuedDate)}
                </span>
              </div>

              <div>
                <span className="font-bold text-slate-500 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-amber-500" />
                  ผู้รับรอง / ผู้ลงนาม:
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {data.signeeName || "ผู้อำนวยการโรงเรียนกุดจับประชาสรรค์"}
                </span>
              </div>
            </div>
          </div>

          {/* Visual Digital Certificate Preview Card */}
          <div className="relative p-6 sm:p-8 rounded-2xl border-4 border-double border-amber-500/40 bg-linear-to-b from-amber-50/50 via-white to-amber-50/30 dark:from-slate-900/80 dark:via-slate-950 dark:to-slate-900/80 shadow-inner text-center space-y-3.5">
            <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 tracking-widest uppercase">
              โรงเรียนกุดจับประชาสรรค์
            </div>
            <div className="text-xs text-slate-500">
              ขอมอบเกียรติบัตรฉบับนี้เพื่อแสดงว่า
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-wide font-sans">
              {data.recipientName || "ผู้เข้าร่วมกิจกรรม"}
            </div>
            <div className="text-sm font-bold text-amber-700 dark:text-amber-400">
              {data.roleTitle}
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
              {data.activityTitle}
            </div>
            <div className="text-[11px] text-slate-500 pt-1">
              ให้ไว้ ณ วันที่ {formatDocFullDate(data.issuedDate)}
            </div>

            <div className="pt-3 border-t border-amber-200/60 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-400">
              <span>ผู้รับรอง: {data.signeeName || "ผู้อำนวยการโรงเรียน"}</span>
              <span className="font-mono text-amber-600 font-bold">{data.certificateNumber}</span>
            </div>
          </div>

          {/* Action Buttons: Download PDF & Print */}
          {isValid && (
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              {data.downloadPdfUrl ? (
                <a
                  href={data.downloadPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={`เกียรติบัตร_${data.certificateNumber}.pdf`}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition group"
                >
                  <Download className="w-4 h-4 group-hover:translate-y-0.5 transition" />
                  <span>ดาวน์โหลดไฟล์เกียรติบัตรต้นฉบับ (PDF)</span>
                </a>
              ) : (
                <button
                  onClick={() => window.print()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์หรือบันทึกเป็น PDF (Print)</span>
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์ใบรับรอง</span>
              </button>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>ฐานข้อมูลทะเบียนเกียรติบัตรกลาง • สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาอุดรธานี</span>
            <Link
              href="/"
              className="font-bold text-amber-600 hover:text-amber-700 transition shrink-0"
            >
              เข้าสู่ระบบ KP e-Leave →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyCertificatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
