"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  ExternalLink,
  Loader2,
  RefreshCw,
  X,
  Building2,
  Info,
  Check,
  AlertTriangle,
} from "lucide-react";
import type { WithdrawalReasonCode } from "@prisma/client";
import {
  getUserPrivacyProfile,
  withdrawUserConsentAction,
  grantUserConsentAction,
} from "@/app/actions/privacy_actions";
import { useToast } from "@/components/toast-provider";

const WITHDRAWAL_REASON_OPTIONS: Array<{ code: WithdrawalReasonCode; label: string }> = [
  { code: "USER_CHOICE", label: "ความต้องการส่วนบุคคล (User Choice)" },
  { code: "NO_LONGER_USING_FEATURE", label: "ไม่ต้องการใช้ฟังก์ชันนี้อีกต่อไป (No Longer Using Feature)" },
  { code: "DATA_MINIMIZATION_PREFERENCE", label: "ต้องการจำกัดการประมวลผลข้อมูลส่วนบุคคล (Data Minimization)" },
];

const POLICY_TYPE_LABELS: Record<string, string> = {
  PRIVACY_NOTICE: "ประกาศความเป็นส่วนตัว (Privacy Notice)",
  TERMS_OF_USE: "ข้อกำหนดและเงื่อนไขการใช้งาน (Terms of Use)",
};

export default function UserPrivacyCenterPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Withdrawal modal state
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [targetPurpose, setTargetPurpose] = useState<any>(null);
  const [reasonCode, setReasonCode] = useState<WithdrawalReasonCode>("USER_CHOICE");
  const [reasonDetail, setReasonDetail] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Grant consent loading state per purposeId
  const [grantingPurposeId, setGrantingPurposeId] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUserPrivacyProfile();
      setProfile(data);
    } catch (err: any) {
      console.error("Failed to load user privacy profile:", err);
      setError(err?.message || "ไม่สามารถโหลดข้อมูลสิทธิความเป็นส่วนตัวได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleOpenWithdrawModal = (purpose: any) => {
    setTargetPurpose(purpose);
    setReasonCode("USER_CHOICE");
    setReasonDetail("");
    setWithdrawModalOpen(true);
  };

  const handleConfirmWithdraw = async () => {
    if (!targetPurpose) return;
    setIsProcessing(true);
    try {
      const res = await withdrawUserConsentAction({
        purposeId: targetPurpose.id,
        reasonCode,
        reasonDetail: reasonDetail.trim() || undefined,
      });

      if (!res.success) {
        showToast("error", res.error || "เกิดข้อผิดพลาดในการถอนความยินยอม");
        return;
      }

      showToast("success", `ถอนความยินยอมสำหรับ "${targetPurpose.name}" สำเร็จแล้ว`);
      setWithdrawModalOpen(false);
      await loadProfile();
    } catch (err: any) {
      showToast("error", err?.message || "เกิดข้อผิดพลาด");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGrantConsent = async (purpose: any) => {
    setGrantingPurposeId(purpose.id);
    try {
      const res = await grantUserConsentAction({
        purposeId: purpose.id,
      });

      if (!res.success) {
        showToast("error", res.error || "เกิดข้อผิดพลาดในการให้ความยินยอม");
        return;
      }

      showToast("success", `บันทึกความยินยอมสำหรับ "${purpose.name}" สำเร็จแล้ว`);
      await loadProfile();
    } catch (err: any) {
      showToast("error", err?.message || "เกิดข้อผิดพลาด");
    } finally {
      setGrantingPurposeId(null);
    }
  };

  if (loading && !profile) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 flex flex-col items-center justify-center text-center">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          กำลังโหลดข้อมูลศูนย์คุ้มครองข้อมูลส่วนบุคคล...
        </p>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="max-w-xl mx-auto mt-16 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 shadow-md text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">เกิดข้อผิดพลาด</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{error}</p>
        <button
          onClick={loadProfile}
          className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition flex items-center gap-2 mx-auto cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          ลองใหม่อีกครั้ง
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-16 px-4 sm:px-6 space-y-8">
      {/* Header Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/settings")}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs cursor-pointer"
            title="กลับไปหน้าตั้งค่า"
            aria-label="ย้อนกลับไปหน้าตั้งค่า"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                ศูนย์คุ้มครองข้อมูลส่วนบุคคล & ความยินยอม
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              จัดการความยินยอมในการประมวลผลข้อมูลส่วนบุคคลและตรวจสอบประวัติการยอมรับนโยบาย (PDPA)
            </p>
          </div>
        </div>

        <Link
          href="/privacy"
          target="_blank"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/50 border border-teal-200 dark:border-teal-800/60 transition shadow-xs shrink-0 cursor-pointer"
        >
          <ExternalLink className="w-4 h-4" />
          <span>ดู ROPA และประกาศสาธารณะ</span>
        </Link>
      </div>

      {/* Section 1: Purpose-Based Consents (Optional processing requiring consent) */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              ความยินยอมตามวัตถุประสงค์ (Purpose-Based Consents)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              การประมวลผลข้อมูลบริการเสริมที่อาศัยฐานความยินยอมของท่านตามมาตรา 19 (สามารถให้หรือถอนได้ทุกเมื่อ)
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {profile?.consentPurposes && profile.consentPurposes.length > 0 ? (
            profile.consentPurposes.map((purpose: any) => {
              const status: "GIVEN" | "WITHDRAWN" | "NONE" = purpose.consent?.status || "NONE";
              const isGranting = grantingPurposeId === purpose.id;

              return (
                <div
                  key={purpose.id}
                  className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        {purpose.name}
                      </h3>
                      {/* Status Badge */}
                      {status === "GIVEN" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          ยินยอมแล้ว (GIVEN)
                        </span>
                      )}
                      {status === "WITHDRAWN" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          ถอนความยินยอมแล้ว (WITHDRAWN)
                        </span>
                      )}
                      {status === "NONE" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <Info className="w-3.5 h-3.5" />
                          ยังไม่ระบุ (NONE)
                        </span>
                      )}
                    </div>

                    {purpose.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {purpose.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-[11.5px] text-slate-400">
                      <span className="font-mono">รหัส: {purpose.code}</span>
                      {purpose.consent?.consentedAt && (
                        <span>
                          ให้ความยินยอมเมื่อ:{" "}
                          {new Date(purpose.consent.consentedAt).toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                      {purpose.consent?.withdrawnAt && (
                        <span className="text-amber-600 dark:text-amber-400">
                          ถอนความยินยอมเมื่อ:{" "}
                          {new Date(purpose.consent.withdrawnAt).toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex items-center gap-2">
                    {status === "GIVEN" ? (
                      <button
                        type="button"
                        onClick={() => handleOpenWithdrawModal(purpose)}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shadow-xs cursor-pointer"
                      >
                        ถอนความยินยอม
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleGrantConsent(purpose)}
                        disabled={isGranting}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        {isGranting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        ให้ความยินยอม
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-slate-500 text-xs">
              ไม่มีรายการประมวลผลที่ต้องขอความยินยอมเพิ่มเติม
            </div>
          )}
        </div>
      </section>

      {/* Section 2: Mandatory Processing (Statutory / Public Task - Non-Withdrawable) */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            การประมวลผลข้อมูลตามหน้าที่ของสถานศึกษา (Mandatory Institutional Processing)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            การประมวลผลข้อมูลที่ดำเนินการตามกฎหมายและภารกิจของรัฐ ซึ่งไม่สามารถถอนความยินยอมได้
          </p>
        </div>

        {/* Legal Disclaimer Box */}
        <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-3 text-xs sm:text-sm text-indigo-900 dark:text-indigo-200">
          <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <p className="font-semibold">
              ชี้แจงตามมาตรา 24 และ 26 แห่งพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562:
            </p>
            <p className="text-xs text-indigo-800/90 dark:text-indigo-300/90">
              การบริหารงานบุคคล การยื่นขอลา การตรวจสอบเวลาเข้า-ออกงาน และงานสารบรรณของสถานศึกษา
              เป็นการปฏิบัติหน้าที่ตามกฎหมายระเบียบข้าราชการครูและบุคลากรทางการศึกษา พ.ศ. 2547
              และระเบียบสำนักนายกรัฐมนตรี ข้อมูลเหล่านี้จึงประมวลผลภายใต้ฐาน{" "}
              <strong>หน้าที่ตามกฎหมาย (Legal Obligation)</strong> หรือ{" "}
              <strong>ภารกิจเพื่อประโยชน์สาธารณะ (Public Task)</strong>{" "}
              โดยไม่จำเป็นต้องอาศัยความยินยอม และไม่สามารถเพิกถอนความยินยอมเพื่อยกเว้นการปฏิบัติราชการได้
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {profile?.mandatoryPurposes && profile.mandatoryPurposes.length > 0 ? (
            profile.mandatoryPurposes.map((purpose: any) => (
              <div
                key={purpose.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {purpose.name}
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      <Lock className="w-3 h-3" />
                      ปฏิบัติหน้าที่ตามกฎหมาย
                    </span>
                  </div>
                  {purpose.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{purpose.description}</p>
                  )}
                  <p className="text-[11px] text-slate-400 font-mono">
                    รหัสวัตถุประสงค์: {purpose.code}
                    {purpose.activity?.name ? ` • กิจกรรม: ${purpose.activity.name}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-xs text-slate-400 font-medium sm:text-right">
                  ไม่สามารถถอนความยินยอมได้
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-slate-500 text-xs">ไม่พบรายการ</div>
          )}
        </div>
      </section>

      {/* Section 3: Policy Acknowledgment History Table */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              ประวัติการรับทราบนโยบายและข้อกำหนด (Policy Acknowledgment History)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              บันทึกประวัติการยอมรับหรือรับทราบนโยบายคุ้มครองข้อมูลส่วนบุคคลและเงื่อนไขการใช้งานของบัญชีนี้
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">ประเภทเอกสาร (Policy Type)</th>
                <th className="px-4 py-3">เวอร์ชัน</th>
                <th className="px-4 py-3">วันที่และเวลารับทราบ</th>
                <th className="px-4 py-3">รหัสตรวจสอบเนื้อหา (Hash)</th>
                <th className="px-4 py-3 text-right">ช่องทาง (Source)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-200">
              {profile?.acknowledgments && profile.acknowledgments.length > 0 ? (
                profile.acknowledgments.map((ack: any) => (
                  <tr
                    key={ack.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {POLICY_TYPE_LABELS[ack.policyDocument?.type] || ack.policyDocument?.type || "นโยบาย"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300">
                        v{ack.policyVersionSnapshot || ack.policyDocument?.version || "1.0"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {new Date(ack.acknowledgedAt).toLocaleString("th-TH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                      #{ack.contentHashSnapshot?.substring(0, 10) || "—"}...
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px]">
                        {ack.source || "WEB_APP"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    ยังไม่มีบันทึกประวัติการยอมรับนโยบาย
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Withdrawal Confirmation Modal */}
      {withdrawModalOpen && targetPurpose && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-rose-50/50 dark:bg-rose-950/20">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  ยืนยันการถอนความยินยอม
                </h3>
              </div>
              <button
                onClick={() => setWithdrawModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">วัตถุประสงค์ที่ต้องการถอน:</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {targetPurpose.name}
                </p>
                {targetPurpose.description && (
                  <p className="text-xs text-slate-500 mt-1">{targetPurpose.description}</p>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>
                  การถอนความยินยอมนี้จะมีผลให้ระบบยุติการประมวลผลข้อมูลในฟังก์ชันเสริมดังกล่าว
                  แต่จะไม่ส่งผลกระทบต่อการใช้งานระบบหลักของสถานศึกษาที่ปฏิบัติหน้าที่ตามกฎหมาย
                </span>
              </div>

              {/* Reason Code Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  เหตุผลในการถอนความยินยอม <span className="text-rose-500">*</span>
                </label>
                <select
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value as WithdrawalReasonCode)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                >
                  {WITHDRAWAL_REASON_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reason Detail Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  รายละเอียดเพิ่มเติม (ถ้ามี)
                </label>
                <textarea
                  value={reasonDetail}
                  onChange={(e) => setReasonDetail(e.target.value)}
                  placeholder="ระบุข้อเสนอแนะหรือเหตุผลเพิ่มเติมเพื่อการพัฒนาบริการ..."
                  rows={3}
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setWithdrawModalOpen(false)}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmWithdraw}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                ยืนยันการถอนความยินยอม
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
