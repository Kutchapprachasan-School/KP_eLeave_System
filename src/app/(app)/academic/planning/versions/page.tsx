"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  GitBranch, 
  GitCommit, 
  GitMerge, 
  ShieldCheck, 
  Clock, 
  FileCheck, 
  ChevronRight, 
  ArrowLeft, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  FileCode,
  Download
} from "lucide-react";

interface VersionItem {
  id: string;
  versionNumber: string;
  academicYear: number;
  term: number;
  status: "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED";
  hash: string;
  effectiveDate: string;
  publishedBy: string;
  approvalSteps: { step: string; role: string; status: "APPROVED" | "PENDING" | "REJECTED"; approvedAt?: string }[];
}

const VERSIONS_DATA: VersionItem[] = [
  {
    id: "ver-2569-1",
    versionNumber: "v2569.1.0",
    academicYear: 2569,
    term: 1,
    status: "PUBLISHED",
    hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    effectiveDate: "2026-05-16",
    publishedBy: "ดร.สมชาย ใจดี (ผู้อำนวยการ)",
    approvalSteps: [
      { step: "1. Dept Review", role: "HEAD_OF_DEPT", status: "APPROVED", approvedAt: "2026-04-10 10:30" },
      { step: "2. Academic Review", role: "ACADEMIC_DIRECTOR", status: "APPROVED", approvedAt: "2026-04-12 14:15" },
      { step: "3. Director Approval", role: "SCHOOL_DIRECTOR", status: "APPROVED", approvedAt: "2026-04-15 09:00" },
    ]
  },
  {
    id: "ver-2569-2-draft",
    versionNumber: "v2569.2.0-Draft",
    academicYear: 2569,
    term: 2,
    status: "UNDER_REVIEW",
    hash: "8f4e2c91a0b3d4e5f67890123456789abcdef0123456789abcdef0123456789a",
    effectiveDate: "2026-11-01",
    publishedBy: "นางสาวสมหญิง วิชาการ (รองผู้อำนวยการ)",
    approvalSteps: [
      { step: "1. Dept Review", role: "HEAD_OF_DEPT", status: "APPROVED", approvedAt: "2026-08-01 11:00" },
      { step: "2. Academic Review", role: "ACADEMIC_DIRECTOR", status: "PENDING" },
      { step: "3. Director Approval", role: "SCHOOL_DIRECTOR", status: "PENDING" },
    ]
  }
];

export default function VersionsDomainPage() {
  const [selectedVersion, setSelectedVersion] = useState<VersionItem>(VERSIONS_DATA[0]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-6 text-slate-900 dark:text-slate-100">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400 border-b border-slate-200 dark:border-slate-800 pb-4">
        <Link href="/academic/planning" className="hover:underline flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Academic Planning Platform
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span>Git-like Version Control & Audit Trail</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <GitBranch className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            ควบคุมเวอร์ชันหลักสูตร & ประวัติการอนุมัติ (Git-like Version Control)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            บันทึกการอนุมัติหลักสูตรแบบตัดยอดแก้ไขไม่ได้ (Compressed Snapshot Metadata + SHA-256 Checksum Hash)
          </p>
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Version List */}
        <div className="space-y-4">
          <h2 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">รายการเวอร์ชันหลักสูตร</h2>
          {VERSIONS_DATA.map(ver => (
            <div 
              key={ver.id}
              onClick={() => setSelectedVersion(ver)}
              className={`cursor-pointer rounded-2xl p-5 border transition-all ${
                selectedVersion.id === ver.id
                  ? "bg-white dark:bg-slate-900 border-purple-500 shadow-md ring-2 ring-purple-500/20"
                  : "bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-extrabold text-sm text-purple-600 dark:text-purple-400">{ver.versionNumber}</span>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase ${
                  ver.status === "PUBLISHED" 
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                }`}>
                  {ver.status}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold mt-2">
                ปีการศึกษา {ver.academicYear} / ภาคเรียนที่ {ver.term}
              </p>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2">
                <span>วันบังคับใช้: {ver.effectiveDate}</span>
                <GitCommit className="w-4 h-4 text-purple-500" />
              </div>
            </div>
          ))}
        </div>

        {/* Selected Version Audit Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs text-slate-400 font-semibold">รายละเอียดสแนปช็อต</span>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white font-mono">{selectedVersion.versionNumber}</h3>
              </div>

              <button className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition flex items-center gap-1.5">
                <Download className="w-4 h-4" />
                ดาวน์โหลด JSON Snapshot (.gz)
              </button>
            </div>

            {/* SHA-256 Hash Guard */}
            <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                SHA-256 Immutable Content Checksum Hash
              </div>
              <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 break-all bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                {selectedVersion.hash}
              </p>
            </div>

            {/* 3-Stage Approval Steps */}
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-indigo-500" />
                ลำดับขั้นตอนการอนุมัติหลักสูตร (Multi-Stage Approval Workflow)
              </h4>

              <div className="space-y-3">
                {selectedVersion.approvalSteps.map((step, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      {step.status === "APPROVED" ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      ) : (
                        <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                      )}
                      <div>
                        <h5 className="font-bold text-xs text-slate-900 dark:text-white">{step.step}</h5>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">ผู้รับผิดชอบ: {step.role}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        step.status === "APPROVED" 
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      }`}>
                        {step.status}
                      </span>
                      {step.approvedAt && (
                        <p className="text-[10px] text-slate-400 mt-1">{step.approvedAt}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
