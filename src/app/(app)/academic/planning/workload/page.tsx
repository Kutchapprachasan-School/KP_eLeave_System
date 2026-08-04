"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  BarChart2, 
  UserCheck, 
  AlertCircle, 
  CheckCircle2, 
  Sliders, 
  ChevronRight, 
  ArrowLeft, 
  Users, 
  Award,
  Zap
} from "lucide-react";

interface TeacherWorkloadItem {
  id: string;
  name: string;
  department: string;
  role: string;
  teachingPeriods: number;
  preparationWeight: number;
  labWeight: number;
  multiCoursePenalty: number;
  homeroomDuty: number;
  etuScore: number;
  maxPolicyEtu: number;
  status: "NORMAL" | "OVERLOAD" | "UNDERLOAD";
}

const TEACHER_WORKLOADS: TeacherWorkloadItem[] = [
  {
    id: "t1",
    name: "ครูสมชาย สายวิทย์",
    department: "วิทยาศาสตร์และเทคโนโลยี",
    role: "หัวหน้ากลุ่มสาระ",
    teachingPeriods: 18,
    preparationWeight: 1.2,
    labWeight: 1.1,
    multiCoursePenalty: 0.75,
    homeroomDuty: 2.0,
    etuScore: 24.5,
    maxPolicyEtu: 22.0,
    status: "OVERLOAD"
  },
  {
    id: "t2",
    name: "ครูสมหญิง รักเรียน",
    department: "คณิตศาสตร์",
    role: "ครูประจำการ",
    teachingPeriods: 16,
    preparationWeight: 1.0,
    labWeight: 1.0,
    multiCoursePenalty: 0.0,
    homeroomDuty: 2.0,
    etuScore: 18.0,
    maxPolicyEtu: 25.0,
    status: "NORMAL"
  },
  {
    id: "t3",
    name: "ครูวิชัย ใจดี",
    department: "ภาษาไทย",
    role: "ครูผู้ช่วย",
    teachingPeriods: 12,
    preparationWeight: 1.0,
    labWeight: 1.0,
    multiCoursePenalty: 0.0,
    homeroomDuty: 2.0,
    etuScore: 14.0,
    maxPolicyEtu: 25.0,
    status: "UNDERLOAD"
  }
];

export default function WorkloadDomainPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-6 text-slate-900 dark:text-slate-100">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400 border-b border-slate-200 dark:border-slate-800 pb-4">
        <Link href="/academic/planning" className="hover:underline flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Academic Planning Platform
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span>360° ETU Workload & Policy Engine</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart2 className="w-7 h-7 text-teal-600 dark:text-teal-400" />
            คำนวณภาระงานจริง ETU & นโยบายภาระงาน (360° Workload & Policy)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            คำนวณภาระงานสอนจริง Equivalent Teaching Units (ETU) ถ่วงน้ำหนักการเตรียมสอน ค่าน้ำหนักแล็บ และ Multi-course Penalty
          </p>
        </div>
      </div>

      {/* Formula Card */}
      <div className="bg-gradient-to-r from-teal-500/10 via-purple-500/10 to-indigo-500/10 rounded-3xl p-6 border border-teal-200 dark:border-teal-800/40 space-y-2">
        <h3 className="font-extrabold text-xs text-teal-700 dark:text-teal-300 uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4" />
          สูตรคำนวณภาระงานสอนจริง (Equivalent Teaching Units - ETU Formula)
        </h3>
        <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
          ETU = Σ (คาบสอน × น้ำหนักเตรียมสอน × น้ำหนักแล็บ) + (จำนวนวิชาต่างกัน - 1) × 0.75 + ภาระงานครูที่ปรึกษา/ภาระงานพิเศษ
        </p>
      </div>

      {/* Teacher Workload Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase">
                <th className="p-4">ชื่อครูผู้สอน</th>
                <th className="p-4">กลุ่มสาระฯ / ตำแหน่ง</th>
                <th className="p-4 text-center">คาบสอนจริง</th>
                <th className="p-4 text-center">น้ำหนักแล็บ/เตรียมสอน</th>
                <th className="p-4 text-center">Multi-Prep Penalty</th>
                <th className="p-4 text-center">คะแนน ETU รวม</th>
                <th className="p-4 text-center">เกณฑ์ Policy Max</th>
                <th className="p-4 text-center">สถานะภาระงาน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {TEACHER_WORKLOADS.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition">
                  <td className="p-4 font-bold text-slate-900 dark:text-white">{t.name}</td>
                  <td className="p-4">
                    <p className="text-slate-800 dark:text-slate-200 font-semibold">{t.department}</p>
                    <p className="text-[11px] text-slate-400">{t.role}</p>
                  </td>
                  <td className="p-4 text-center font-bold text-slate-700 dark:text-slate-300">{t.teachingPeriods} คาบ</td>
                  <td className="p-4 text-center font-mono">x{t.preparationWeight} / x{t.labWeight}</td>
                  <td className="p-4 text-center font-mono">+{t.multiCoursePenalty} ETU</td>
                  <td className="p-4 text-center font-extrabold text-sm text-purple-600 dark:text-purple-400">{t.etuScore} ETU</td>
                  <td className="p-4 text-center font-bold text-slate-500">{t.maxPolicyEtu} ETU</td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                      t.status === "NORMAL"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : t.status === "OVERLOAD"
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    }`}>
                      {t.status === "NORMAL" ? "ปกติ (Normal)" : t.status === "OVERLOAD" ? "ภาระงานเกิน (Overload)" : "ภาระงานต่ำ (Underload)"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
