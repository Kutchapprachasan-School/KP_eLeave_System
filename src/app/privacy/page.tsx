import React from "react";
import Link from "next/link";
import {
  Shield,
  ShieldCheck,
  FileText,
  Database,
  Building2,
  Mail,
  Calendar,
  Lock,
  ExternalLink,
  Info,
  Clock,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { getPublicPrivacyData } from "../actions/privacy_actions.ts";
import { BackButton } from "./BackButton.tsx";

export const dynamic = "force-dynamic";

const LEGAL_BASIS_LABELS: Record<string, string> = {
  CONSENT: "ความยินยอม (Consent - ม.19)",
  LEGAL_OBLIGATION: "หน้าที่ตามกฎหมาย (Legal Obligation - ม.24(6))",
  PUBLIC_TASK: "ภารกิจเพื่อประโยชน์สาธารณะ / ใช้อำนาจรัฐ (Public Task - ม.24(4))",
  CONTRACT: "สัญญา (Contract - ม.24(3))",
  VITAL_INTEREST: "ประโยชน์สำคัญต่อชีวิต (Vital Interest - ม.24(2))",
  LEGITIMATE_INTEREST: "ประโยชน์โดยชอบด้วยกฎหมาย (Legitimate Interest - ม.24(5))",
};

const DATA_CATEGORY_LABELS: Record<string, string> = {
  GENERAL_IDENTITY: "ข้อมูลระบุตัวตนทั่วไป (ชื่อ-นามสกุล, ตำแหน่ง)",
  CONTACT_INFO: "ข้อมูลติดต่อ (อีเมล, เบอร์โทรศัพท์, LINE ID)",
  EMPLOYMENT_RECORD: "ประวัติการปฏิบัติราชการและวันลา",
  DOCUMENT_ATTACHMENT: "เอกสารหลักฐานประกอบคำขอ",
  SENSITIVE_HEALTH: "ข้อมูลสุขภาพ (ใบรับรองแพทย์ / เหตุผลการลาป่วย)",
  SENSITIVE_BIOMETRIC: "ข้อมูลชีวมิติ (สแกนใบหน้า/ลายนิ้วมือ)",
  GEOLOCATION: "ข้อมูลพิกัดสถานที่ (GPS ลงเวลา)",
  SYSTEM_AUDIT_LOG: "บันทึกประวัติการเข้าใช้งานระบบ (Audit Log)",
};

const DISPOSAL_LABELS: Record<string, string> = {
  SECURE_DESTROY: "ทำลายอย่างปลอดภัย (Secure Destroy)",
  PERMANENT_ANONYMIZE: "ลบล้างข้อมูลจนไม่สามารถระบุตัวตนได้ (Permanent Anonymization)",
  TRANSFER_TO_NATIONAL_ARCHIVES: "ส่งมอบหอจดหมายเหตุแห่งชาติ (National Archives)",
};

export default async function PublicPrivacyPage() {
  const { notice, ropaSummary, settings } = await getPublicPrivacyData();

  const formattedEffectiveDate = notice?.effectiveAt
    ? new Date(notice.effectiveAt).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "-";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <BackButton />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                  ศูนย์ความโปร่งใสและคุ้มครองข้อมูลส่วนบุคคล
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {settings?.schoolName || "โรงเรียนกุดจับประชาสรรค์"} • PDPA Transparency Portal
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Link
              href="/login"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              เข้าสู่ระบบ
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Hero Introduction */}
        <section className="bg-gradient-to-br from-teal-500/10 via-indigo-500/5 to-purple-500/10 dark:from-teal-950/40 dark:via-slate-900/40 dark:to-purple-950/30 rounded-3xl p-6 sm:p-8 border border-teal-200/50 dark:border-teal-800/40 shadow-xs">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 mb-3">
              <Shield className="w-3.5 h-3.5" />
              พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              ความโปร่งใสในการประมวลผลข้อมูลส่วนบุคคล
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              โรงเรียนกุดจับประชาสรรค์ให้ความสำคัญอย่างยิ่งต่อสิทธิและความปลอดภัยของข้อมูลส่วนบุคคลของครู บุคลากร
              และผู้รับบริการ หน้านี้จัดทำขึ้นเพื่อให้ข้อมูลเกี่ยวกับนโยบายความเป็นส่วนตัว
              และบันทึกรายการกิจกรรมการประมวลผลข้อมูลส่วนบุคคล (ROPA) อย่างโปร่งใสและตรวจสอบได้
            </p>
          </div>
        </section>

        {/* Section 1: Official Privacy Notice */}
        <section id="privacy-notice" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                หมวดที่ 1: ประกาศการคุ้มครองข้อมูลส่วนบุคคล (Privacy Notice)
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                เอกสารประกาศนโยบายการคุ้มครองข้อมูลส่วนบุคคลฉบับทางการของสถานศึกษา
              </p>
            </div>
            {notice && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 font-semibold flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  ฉบับที่ {notice.version}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                  มีผลบังคับใช้: {formattedEffectiveDate}
                </span>
                <span
                  className="font-mono px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px]"
                  title="Canonical Content Hash (SHA-256)"
                >
                  #{notice.contentHash.substring(0, 10)}...
                </span>
              </div>
            )}
          </div>

          {notice ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
              <article className="prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                {notice.contentMarkdown}
              </article>
            </div>
          ) : (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500">
              ไม่พบนโยบายฉบับปัจจุบัน
            </div>
          )}
        </section>

        {/* Section 2: Full ROPA Summary Table */}
        <section id="ropa-summary" className="space-y-4">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              หมวดที่ 2: บันทึกรายการกิจกรรมการประมวลผลข้อมูลส่วนบุคคล (ROPA)
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              ตามมาตรา 39 แห่งพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
              (Records of Processing Activities Registry)
            </p>
          </div>

          <div className="space-y-6">
            {ropaSummary && ropaSummary.length > 0 ? (
              ropaSummary.map((activity) => (
                <div
                  key={activity.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden"
                >
                  {/* Activity Card Header */}
                  <div className="p-5 sm:p-6 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          {activity.code}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                          โมดูล: {activity.module}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
                        {activity.name}
                      </h3>
                      {activity.description && (
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {activity.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <Clock className="w-3 h-3 text-slate-500" />
                        ระยะเวลาจัดเก็บ: {activity.retentionDurationMonths} เดือน
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <Trash2 className="w-3 h-3 text-slate-500" />
                        วิธีทำลาย: {DISPOSAL_LABELS[activity.disposalMethod] || activity.disposalMethod}
                      </span>
                    </div>
                  </div>

                  {/* Activity Details Grid */}
                  <div className="px-5 sm:px-6 py-4 bg-slate-50/30 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">กลุ่มเจ้าของข้อมูลส่วนบุคคล:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {activity.dataSubjectCategory}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">ฐานอำนาจการจัดเก็บ:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {activity.retentionAuthority}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">ผู้รับข้อมูลส่วนบุคคล:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {activity.recipientsSummary}
                      </span>
                    </div>
                  </div>

                  {/* Purposes & Data Category Policies Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-5 py-3 w-1/4">วัตถุประสงค์ (Purpose)</th>
                          <th className="px-5 py-3 w-1/4">หมวดหมู่ข้อมูล (Data Category)</th>
                          <th className="px-5 py-3 w-1/3">ฐานทางกฎหมาย (Legal Basis)</th>
                          <th className="px-5 py-3 text-right">ลักษณะความยินยอม</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-200">
                        {activity.purposes.map((purpose) => (
                          <React.Fragment key={purpose.id}>
                            {purpose.dataCategoryPolicies.map((policy, idx) => (
                              <tr
                                key={policy.id}
                                className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                              >
                                {idx === 0 ? (
                                  <td
                                    rowSpan={purpose.dataCategoryPolicies.length}
                                    className="px-5 py-3 align-top font-medium border-r border-slate-100 dark:border-slate-800/60"
                                  >
                                    <div className="font-semibold text-slate-900 dark:text-white">
                                      {purpose.name}
                                    </div>
                                    <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                                      {purpose.code}
                                    </div>
                                    {purpose.description && (
                                      <div className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-1">
                                        {purpose.description}
                                      </div>
                                    )}
                                  </td>
                                ) : null}

                                <td className="px-5 py-3 align-top">
                                  <span className="font-medium">
                                    {DATA_CATEGORY_LABELS[policy.dataCategory] || policy.dataCategory}
                                  </span>
                                  {policy.isMandatoryForOperation && (
                                    <span className="ml-1.5 text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                                      *จำเป็นต่อบริการ
                                    </span>
                                  )}
                                </td>

                                <td className="px-5 py-3 align-top">
                                  <span className="font-semibold text-slate-900 dark:text-white block">
                                    {LEGAL_BASIS_LABELS[policy.legalBasis] || policy.legalBasis}
                                  </span>
                                  {policy.section26Condition && (
                                    <span className="text-[11px] text-purple-600 dark:text-purple-400 block mt-0.5">
                                      เงื่อนไข ม.26: {policy.section26Condition}
                                    </span>
                                  )}
                                  {policy.statutoryReference && (
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                                      อ้างอิง: {policy.statutoryReference}
                                    </span>
                                  )}
                                </td>

                                {idx === 0 ? (
                                  <td
                                    rowSpan={purpose.dataCategoryPolicies.length}
                                    className="px-5 py-3 align-top text-right border-l border-slate-100 dark:border-slate-800/60"
                                  >
                                    {purpose.requiresConsent ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                                        <CheckCircle2 className="w-3 h-3" />
                                        ขอความยินยอม (Consent)
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300">
                                        <Lock className="w-3 h-3" />
                                        ปฏิบัติหน้าที่ตามกฎหมาย
                                      </span>
                                    )}
                                  </td>
                                ) : null}
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500">
                ยังไม่มีข้อมูลรายการกิจกรรมการประมวลผล
              </div>
            )}
          </div>
        </section>

        {/* Section 3: Data Controller Details and DPO Contact Information */}
        <section id="controller-dpo" className="space-y-4">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              หมวดที่ 3: ผู้ควบคุมข้อมูลส่วนบุคคลและเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO)
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              รายละเอียดข้อมูลการติดต่อตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Controller Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  ผู้ควบคุมข้อมูลส่วนบุคคล (Data Controller)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  หน่วยงานผู้มีอำนาจหน้าที่ตัดสินใจเกี่ยวกับการเก็บรวบรวม ใช้ หรือเปิดเผยข้อมูลส่วนบุคคล
                </p>

                <div className="mt-4 space-y-2.5 text-xs sm:text-sm">
                  <div>
                    <span className="text-slate-400 block text-xs">ชื่อสถานศึกษา / หน่วยงาน:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {settings?.schoolName || "โรงเรียนกุดจับประชาสรรค์"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">ชื่อระบบสารสนเทศ:</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {settings?.subheader || "ระบบบริหารจัดการสถานศึกษา"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">หน่วยงานต้นสังกัด:</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {settings?.affiliation || "สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาอุดรธานี"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">ผู้แทนโดยชอบธรรม:</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      ผู้อำนวยการ{settings?.schoolName || "โรงเรียนกุดจับประชาสรรค์"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* DPO Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4">
                  <Mail className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  เจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO) / สารสนเทศ
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Data Protection Officer และผู้ดูแลระบบสารสนเทศประจำสถานศึกษา
                </p>

                <div className="mt-4 space-y-2.5 text-xs sm:text-sm">
                  <div>
                    <span className="text-slate-400 block text-xs">เจ้าหน้าที่ผู้รับผิดชอบ:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {settings?.adminName || "เจ้าหน้าที่สารสนเทศและคุ้มครองข้อมูลส่วนบุคคล"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">ช่องทางติดต่อทางอิเล็กทรอนิกส์:</span>
                    <a
                      href={`mailto:${settings?.adminEmail || ropaSummary?.[0]?.dpoContact || "kpschool_dpo@obec.moe.go.th"}`}
                      className="font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 mt-0.5"
                    >
                      {settings?.adminEmail || ropaSummary?.[0]?.dpoContact || "kpschool_dpo@obec.moe.go.th"}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">การใช้สิทธิของเจ้าของข้อมูล (DSR):</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      เจ้าของข้อมูลส่วนบุคคลสามารถใช้สิทธิขอเข้าถึง ขอแก้ไข ขอคัดค้าน หรือขอให้ระงับการใช้ข้อมูล
                      ได้โดยติดต่อผ่านทางเจ้าหน้าที่สารสนเทศ / DPO ของสถานศึกษา
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto px-4">
          <p>
            {settings?.footerText || "ระบบบริหารจัดการสถานศึกษาและงานบริหารงานบุคคล © โรงเรียนกุดจับประชาสรรค์"}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            หน้านี้เป็นพอร์ทัลความโปร่งใสสาธารณะตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
          </p>
        </div>
      </footer>
    </div>
  );
}
