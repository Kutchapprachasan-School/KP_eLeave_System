"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Award, CheckCircle2, XCircle, ShieldCheck, Calendar, Building2, UserCheck, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { verifyCertificatePublic } from "@/app/actions/document";
import { formatDocFullDate } from "@/lib/date-format";

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
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${isValid ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 line-through"}`}>
                {isValid ? "ปกติ / สมบูรณ์" : "ยกเลิก"}
              </span>
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

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>ฐานข้อมูลทะเบียนเกียรติบัตรกลาง</span>
            <Link
              href="/"
              className="font-bold text-amber-600 hover:text-amber-700 transition"
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
