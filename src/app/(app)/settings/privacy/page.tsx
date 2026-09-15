"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  FileText, 
  Lock, 
  History, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  ChevronRight,
  Info,
  RefreshCw,
  Eye
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { 
  getUserPrivacyOverviewAction, 
  withdrawUserConsentAction, 
  grantUserConsentAction 
} from "@/app/actions/privacy_actions";
import { PolicyModal } from "@/components/privacy/PolicyModal";
import { WithdrawalReasonCode } from "@prisma/client";

export default function UserPrivacySettingsPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<{
    acknowledgments: any[];
    consents: any[];
    consentPurposes: any[];
  } | null>(null);

  const [activeTab, setActiveTab] = useState<"CONSENTS" | "HISTORY" | "RIGHTS">("CONSENTS");

  // Policy Modal state
  const [viewingPolicy, setViewingPolicy] = useState<any | null>(null);

  // Withdraw modal state
  const [withdrawingPurpose, setWithdrawingPurpose] = useState<any | null>(null);
  const [withdrawalReason, setWithdrawalReason] = useState<WithdrawalReasonCode>("USER_CHOICE");
  const [withdrawalDetail, setWithdrawalDetail] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const loadOverview = useCallback(() => {
    if (!userId) return;
    setLoading(true);
    getUserPrivacyOverviewAction(userId)
      .then((res) => {
        if (res.success) {
          setOverview({
            acknowledgments: res.acknowledgments || [],
            consents: res.consents || [],
            consentPurposes: res.consentPurposes || [],
          });
        }
      })
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const handleGrantConsent = async (purposeId: string) => {
    if (!userId) return;
    setIsProcessing(true);
    try {
      const res = await grantUserConsentAction({ userId, purposeId });
      if (res.success) {
        loadOverview();
      } else {
        alert("ไม่สามารถบันทึกความยินยอมได้: " + res.error);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmWithdrawal = async () => {
    if (!userId || !withdrawingPurpose) return;
    setIsProcessing(true);
    try {
      const res = await withdrawUserConsentAction({
        userId,
        purposeId: withdrawingPurpose.id,
        reasonCode: withdrawalReason,
        reasonDetail: withdrawalDetail,
      });

      if (res.success) {
        setWithdrawingPurpose(null);
        setWithdrawalDetail("");
        loadOverview();
      } else {
        alert("ไม่สามารถถอนความยินยอมได้: " + res.error);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">
            <Link href="/settings" className="hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              การตั้งค่า
            </Link>
            <span>/</span>
            <span>ความเป็นส่วนตัว & PDPA</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            ศูนย์จัดการข้อมูลส่วนบุคคลและความเป็นส่วนตัว
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ตรวจสอบประวัติการยอมรับนโยบาย จัดการความยินยอมรายวัตถุประสงค์ และตรวจสอบสิทธิของเจ้าของข้อมูล (PDPA Self-Service)
          </p>
        </div>

        <Link
          href="/privacy"
          target="_blank"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm transition-colors self-start"
        >
          <ExternalLink className="w-3.5 h-3.5 text-purple-500" />
          ประกาศและ ROPA สาธารณะ
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("CONSENTS")}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "CONSENTS"
              ? "border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Lock className="w-4 h-4" />
          สิทธิและความยินยอม (Consent Management)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("HISTORY")}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "HISTORY"
              ? "border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <History className="w-4 h-4" />
          ประวัติการยอมรับนโยบาย ({overview?.acknowledgments?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("RIGHTS")}
          className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "RIGHTS"
              ? "border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Info className="w-4 h-4" />
          สิทธิของเจ้าของข้อมูล (Data Subject Rights)
        </button>
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
          <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          <p className="text-xs">กำลังโหลดข้อมูลความเป็นส่วนตัว...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: CONSENT MANAGEMENT */}
          {activeTab === "CONSENTS" && (
            <div className="space-y-4">
              <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 rounded-2xl p-4 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-3">
                <Info className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>ความยินยอมตามมาตรา 19 พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562:</strong> ท่านมีสิทธิในการเลือกให้ความยินยอม หรือถอนความยินยอมในการประมวลผลข้อมูลส่วนบุคคลสำหรับกิจกรรมทางเลือกได้ตลอดเวลา การถอนความยินยอมจะไม่มีผลกระทบต่อภารกิจเพื่อประโยชน์สาธารณะ (Public Task) หรือการปฏิบัติตามระเบียบราชการที่จำเป็น
                </div>
              </div>

              <div className="grid gap-4">
                {overview?.consentPurposes && overview.consentPurposes.length > 0 ? (
                  overview.consentPurposes.map((purpose) => {
                    const existingRecord = overview.consents.find((c) => c.purposeId === purpose.id);
                    const isGiven = existingRecord?.status === "GIVEN";

                    return (
                      <div
                        key={purpose.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 max-w-xl">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                              {purpose.activityName}
                            </span>
                            <span className="text-xs font-mono text-slate-400">{purpose.code}</span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            {purpose.name}
                          </h3>
                          {purpose.description && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                              {purpose.description}
                            </p>
                          )}
                          <div className="text-[11px] text-slate-400 pt-1">
                            ข้อมูลที่เกี่ยวข้อง: {purpose.categories.join(", ")}
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-1.5">
                            {isGiven ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                ให้ความยินยอมแล้ว
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                <XCircle className="w-3.5 h-3.5 text-slate-400" />
                                ไม่ได้ให้ความยินยอม / ถอนแล้ว
                              </span>
                            )}
                          </div>

                          {isGiven ? (
                            <button
                              type="button"
                              onClick={() => setWithdrawingPurpose(purpose)}
                              disabled={isProcessing}
                              className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/40"
                            >
                              ถอนความยินยอม
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleGrantConsent(purpose.id)}
                              disabled={isProcessing}
                              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors shadow-sm"
                            >
                              ยินยอมให้ประมวลผล
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center text-slate-400 text-xs border border-slate-200 dark:border-slate-800">
                    ไม่มีกิจกรรมเสริมที่ต้องใช้ความยินยอมเพิ่มเติมในขณะนี้ การประมวลผลหลักดำเนินงานภายใต้ฐานอำนาจรัฐ (Public Task)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: POLICY ACKNOWLEDGMENT HISTORY */}
          {activeTab === "HISTORY" && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  ประวัติการรับทราบประกาศนโยบายและข้อกำหนด
                </h3>
                <span className="text-xs text-slate-500">บันทึกแบบไม่สามารถแก้ไขได้ (Append-Only Evidence)</span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {overview?.acknowledgments && overview.acknowledgments.length > 0 ? (
                  overview.acknowledgments.map((ack) => (
                    <div key={ack.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                            {ack.policyDocument?.type === "PRIVACY_NOTICE" ? "Privacy Notice" : "Terms of Use"}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {ack.policyDocument?.title} (v{ack.policyVersionSnapshot})
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          ยอมรับเมื่อ: {new Date(ack.acknowledgedAt).toLocaleString("th-TH")} • ช่องทาง: {ack.source}
                        </p>
                        <p className="text-[11px] font-mono text-slate-400">
                          Fingerprint: {ack.contentHashSnapshot?.substring(0, 20)}... • IP: {ack.ipAddress || "Internal"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setViewingPolicy(ack.policyDocument)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200 dark:border-purple-900 self-start sm:self-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        ดูฉบับเต็ม
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    ไม่พบบันทึกการยอมรับนโยบาย
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DATA SUBJECT RIGHTS */}
          {activeTab === "RIGHTS" && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  สิทธิของเจ้าของข้อมูลส่วนบุคคลตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  ในฐานะที่ท่านเป็นบุคลากรทางการศึกษา หรือผู้ใช้งานระบบ ท่านมีสิทธิในการดำเนินการดังต่อไปนี้ภายใต้ขอบเขตที่กฎหมายกำหนด:
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1.5">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">1. สิทธิในการขอเข้าถึงข้อมูล (Right of Access)</h4>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    ขอรับสำเนาข้อมูลส่วนบุคคลของท่านที่อยู่ในความรับผิดชอบของโรงเรียน หรือขอให้เปิดเผยถึงการได้มาซึ่งข้อมูลดังกล่าวที่ท่านไม่ได้ให้ความยินยอม
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1.5">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">2. สิทธิในการขอแก้ไขข้อมูล (Right to Rectification)</h4>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    ขอให้โรงเรียนดำเนินการแก้ไขข้อมูลส่วนบุคคลของท่านให้ถูกต้อง เป็นปัจจุบัน สมบูรณ์ และไม่ก่อให้เกิดความเข้าใจผิด ผ่านเมนูโปรไฟล์ส่วนตัว
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1.5">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">3. สิทธิในการขอให้ลบข้อมูล (Right to Erasure)</h4>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    ขอให้ลบหรือทำลาย หรือทำให้ข้อมูลส่วนบุคคลเป็นข้อมูลที่ไม่สามารถระบุตัวบุคคลได้ เมื่อหมดความจำเป็นตามระยะเวลาจัดเก็บ (Retention Rule)
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1.5">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">4. สิทธิในการเพิกถอนความยินยอม (Right to Withdraw)</h4>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    ถอนความยินยอมในการประมวลผลข้อมูลส่วนบุคคลที่ท่านได้ให้ความยินยอมไว้กับโรงเรียนได้ตลอดเวลา ผ่านแท็บ &quot;สิทธิและความยินยอม&quot;
                  </p>
                </div>
              </div>

              {/* DPO Contact Box */}
              <div className="p-5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 text-xs text-purple-900 dark:text-purple-200 space-y-2">
                <h4 className="font-bold text-sm text-purple-950 dark:text-purple-100 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  ช่องทางการติดต่อเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO Contact)
                </h4>
                <p className="leading-relaxed">
                  หากท่านประสงค์จะใช้สิทธิของเจ้าของข้อมูลส่วนบุคคล หรือมีข้อสอบถามเกี่ยวกับการคุ้มครองข้อมูลส่วนบุคคลของโรงเรียน สามารถติดต่อได้ที่:
                </p>
                <div className="font-mono bg-white/70 dark:bg-slate-900/60 p-3 rounded-xl border border-purple-200/50 dark:border-purple-800/50 space-y-1 text-slate-800 dark:text-slate-200">
                  <p><strong>ผู้ควบคุมข้อมูล:</strong> โรงเรียนกุดจับประชาสรรค์ อำเภอกุดจับ จังหวัดอุดรธานี</p>
                  <p><strong>อีเมล DPO:</strong> kpschool_dpo@obec.moe.go.th</p>
                  <p><strong>กลุ่มงาน:</strong> งานเทคโนโลยีและสารสนเทศเพื่อการศึกษา</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* WITHDRAWAL CONFIRMATION MODAL */}
      {withdrawingPurpose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">ยืนยันการถอนความยินยอม</h3>
                <p className="text-xs text-slate-500">{withdrawingPurpose.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              เมื่อท่านถอนความยินยอม ระบบจะหยุดการประมวลผลข้อมูลส่วนบุคคลสำหรับวัตถุประสงค์นี้โดยทันที การถอนความยินยอมนี้จะไม่กระทบต่อการประมวลผลที่ได้กระทำไปแล้วโดยชอบด้วยกฎหมาย
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  เหตุผลในการถอนความยินยอม
                </label>
                <select
                  value={withdrawalReason}
                  onChange={(e) => setWithdrawalReason(e.target.value as WithdrawalReasonCode)}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                >
                  <option value="USER_CHOICE">ความประสงค์ส่วนบุคคล (User Choice)</option>
                  <option value="NO_LONGER_USING_FEATURE">ไม่ต้องการใช้งานฟีเจอร์นี้อีกต่อไป</option>
                  <option value="DATA_MINIMIZATION_PREFERENCE">ต้องการลดการจัดเก็บข้อมูลส่วนบุคคล (Data Minimization)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  รายละเอียดเพิ่มเติม (ถ้ามี)
                </label>
                <input
                  type="text"
                  placeholder="ระบุข้อเสนอแนะเพิ่มเติม..."
                  value={withdrawalDetail}
                  onChange={(e) => setWithdrawalDetail(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setWithdrawingPurpose(null)}
                disabled={isProcessing}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmWithdrawal}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm disabled:opacity-50"
              >
                {isProcessing ? "กำลังบันทึก..." : "ยืนยันการถอนความยินยอม"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW POLICY MODAL */}
      {viewingPolicy && (
        <PolicyModal
          isOpen={!!viewingPolicy}
          onClose={() => setViewingPolicy(null)}
          onAccept={() => setViewingPolicy(null)}
          title={viewingPolicy.title}
          version={viewingPolicy.version}
          effectiveDate={viewingPolicy.effectiveAt}
          contentHash={viewingPolicy.contentHash || "N/A"}
          contentMarkdown={viewingPolicy.contentMarkdown || ""}
          type={viewingPolicy.type === "PRIVACY_NOTICE" ? "NOTICE" : "TERMS"}
        />
      )}
    </div>
  );
}
