"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  FileText, 
  Database, 
  Mail, 
  Building2, 
  Calendar, 
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  Lock,
  CheckCircle2
} from "lucide-react";
import { getPublicPrivacyInfoAction } from "@/app/actions/privacy_actions";

export default function PublicPrivacyPage() {
  const [data, setData] = useState<{
    notice: any;
    terms: any;
    ropaActivities: any[];
  } | null>(null);

  const [activeTab, setActiveTab] = useState<"NOTICE" | "TERMS" | "ROPA">("NOTICE");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicPrivacyInfoAction()
      .then((res) => {
        if (res.success) {
          setData({
            notice: res.notice,
            terms: res.terms,
            ropaActivities: res.ropaActivities,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-purple-500 selection:text-white">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                ศูนย์ธรรมาภิบาลข้อมูลส่วนบุคคล
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                โรงเรียนกุดจับประชาสรรค์ • พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
              </p>
            </div>
          </div>

          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors border border-purple-200 dark:border-purple-800/50"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            เข้าสู่ระบบ
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Institutional Disclosure Card */}
        <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-3xl space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md text-purple-200 border border-white/10">
              <Lock className="w-3 h-3 text-emerald-400" />
              การคุ้มครองข้อมูลตามมาตรฐานราชการ (PDPA Certified)
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              ความโปร่งใสและหลักธรรมาภิบาลข้อมูล
            </h2>
            <p className="text-sm text-purple-100/80 leading-relaxed">
              โรงเรียนกุดจับประชาสรรค์ มุ่งมั่นรักษาความปลอดภัยของข้อมูลส่วนบุคคลของบุคลากรทางการศึกษา นักเรียน และผู้ปกครอง โดยประมวลผลข้อมูลตามฐานอำนาจหน้าที่ตามกฎหมาย (Public Task) และภาระหน้าที่ตามระเบียบราชการอย่างเคร่งครัด
            </p>

            <div className="pt-2 flex flex-wrap gap-4 text-xs text-purple-200/90">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-purple-400" />
                <span>ผู้ควบคุมข้อมูล: โรงเรียนกุดจับประชาสรรค์</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-purple-400" />
                <span>เจ้าหน้าที่คุ้มครองข้อมูล (DPO): kpschool_dpo@obec.moe.go.th</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("NOTICE")}
            className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "NOTICE"
                ? "border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            ประกาศการคุ้มครองข้อมูลส่วนบุคคล (Privacy Notice)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("TERMS")}
            className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "TERMS"
                ? "border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            เงื่อนไขการใช้งาน (Terms of Use)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ROPA")}
            className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "ROPA"
                ? "border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Database className="w-4 h-4" />
            บันทึกรายการประมวลผล (ROPA Registry)
          </button>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            <p className="text-xs">กำลังโหลดข้อมูลนโยบาย...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {activeTab === "NOTICE" && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {data?.notice?.title || "ประกาศการคุ้มครองข้อมูลส่วนบุคคล"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      ฉบับที่ {data?.notice?.version || "1.0"} • มีผลบังคับใช้เมื่อ {data?.notice?.effectiveAt ? new Date(data.notice.effectiveAt).toLocaleDateString("th-TH") : "ปัจจุบัน"}
                    </p>
                  </div>
                  {data?.notice?.contentHash && (
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg self-start">
                      SHA: {data.notice.contentHash.substring(0, 16)}...
                    </span>
                  )}
                </div>

                <div className="prose dark:prose-invert max-w-none text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {data?.notice?.contentMarkdown}
                </div>
              </div>
            )}

            {activeTab === "TERMS" && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {data?.terms?.title || "เงื่อนไขการใช้งานระบบสารสนเทศ"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      ฉบับที่ {data?.terms?.version || "1.0"} • มีผลบังคับใช้เมื่อ {data?.terms?.effectiveAt ? new Date(data.terms.effectiveAt).toLocaleDateString("th-TH") : "ปัจจุบัน"}
                    </p>
                  </div>
                  {data?.terms?.contentHash && (
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg self-start">
                      SHA: {data.terms.contentHash.substring(0, 16)}...
                    </span>
                  )}
                </div>

                <div className="prose dark:prose-invert max-w-none text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {data?.terms?.contentMarkdown}
                </div>
              </div>
            )}

            {activeTab === "ROPA" && (
              <div className="space-y-4">
                <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 rounded-2xl p-4 text-xs text-purple-900 dark:text-purple-200 leading-relaxed">
                  <strong>บันทึกรายการกิจกรรมการประมวลผลข้อมูลส่วนบุคคล (ROPA - Record of Processing Activities)</strong> ตามมาตรา 39 แห่ง พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 เปิดเผยเพื่อให้เจ้าของข้อมูลตรวจสอบความชอบด้วยกฎหมายในการจัดเก็บและใช้งานข้อมูลในระบบ
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-3.5 px-4">รหัสกิจกรรม</th>
                          <th className="py-3.5 px-4">ชื่องาน / ระบบ</th>
                          <th className="py-3.5 px-4">วัตถุประสงค์</th>
                          <th className="py-3.5 px-4">ฐานทางกฎหมาย</th>
                          <th className="py-3.5 px-4">ประเภทข้อมูล</th>
                          <th className="py-3.5 px-4">ระยะเวลาจัดเก็บ</th>
                          <th className="py-3.5 px-4">การทำลายข้อมูล</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {data?.ropaActivities && data.ropaActivities.length > 0 ? (
                          data.ropaActivities.map((act) => (
                            <React.Fragment key={act.id}>
                              {act.purposes.map((pur: any, pIdx: number) => {
                                const bases = Array.from(
                                  new Set(pur.dataCategoryPolicies.map((p: any) => p.legalBasis))
                                ).join(", ");
                                const cats = Array.from(
                                  new Set(pur.dataCategoryPolicies.map((p: any) => p.dataCategory))
                                ).join(", ");

                                return (
                                  <tr key={pur.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                    {pIdx === 0 && (
                                      <>
                                        <td className="py-3 px-4 font-mono font-bold text-purple-600 dark:text-purple-400" rowSpan={act.purposes.length}>
                                          {act.code}
                                        </td>
                                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white" rowSpan={act.purposes.length}>
                                          {act.name}
                                        </td>
                                      </>
                                    )}
                                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                                      <span className="font-semibold">{pur.name}</span>
                                      {pur.description && <p className="text-[11px] text-slate-500 mt-0.5">{pur.description}</p>}
                                    </td>
                                    <td className="py-3 px-4">
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                        {bases || "PUBLIC_TASK"}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-[11px]">
                                      {cats || "GENERAL_IDENTITY"}
                                    </td>
                                    {pIdx === 0 && (
                                      <>
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400" rowSpan={act.purposes.length}>
                                          {act.retentionDurationMonths} เดือน ({act.retentionAuthority})
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400" rowSpan={act.purposes.length}>
                                          {act.disposalMethod}
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                              ไม่พบข้อมูลกิจกรรมการประมวลผล
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear() + 543} โรงเรียนกุดจับประชาสรรค์ • ระบบสารสนเทศเพื่อการบริหารจัดการสถานศึกษา</p>
      </footer>
    </div>
  );
}
