"use client";

import React from "react";
import Link from "next/link";
import { DollarSign, Wallet, FileSpreadsheet, PieChart, ShieldCheck, ArrowLeft, ChevronRight } from "lucide-react";

export default function BudgetAffairsLandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-6 text-slate-900 dark:text-slate-100">
      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border-b border-slate-200 dark:border-slate-800 pb-4">
        <Link href="/dashboard" className="hover:underline flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          กลับหน้าหลัก
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span>ฝ่ายบริหารงานงบประมาณและการเงิน</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            ระบบบริหารงานงบประมาณ (Budget & Financial Management System)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ศูนย์กลางการจัดสรรงบประมาณโครงการ ตรวจสอบการเบิกจ่ายเงิน พัสดุ และจัดทำรายงานทางการเงินโรงเรียน
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md">
            <DollarSign className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">แผนจัดสรรงบประมาณโครงการ</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            ติดตามการตั้งงบประมาณตามแผนปฏิบัติการประจำปี 2569 ของแต่ละกลุ่มสาระฯ และฝ่ายงาน
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white shadow-md">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">ทะเบียนการเบิกจ่าย & พัสดุ</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            บันทึกการจัดซื้อจัดจ้าง เอกสารหลักฐานการเบิกจ่าย และควบคุมครุภัณฑ์โรงเรียน
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <PieChart className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">รายงานสรุปทางการเงิน</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            สรุปผลการใช้จ่ายงบประมาณคงเหลือและรายงานการตรวจสอบงบประมาณประจำภาคเรียน
          </p>
        </div>
      </div>
    </div>
  );
}
