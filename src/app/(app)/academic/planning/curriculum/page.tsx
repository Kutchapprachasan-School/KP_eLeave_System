"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, ArrowLeft, Plus, Search, Filter, ShieldCheck, CheckCircle } from "lucide-react";

export default function CurriculumPlanningPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <Link href="/academic/planning" className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline mb-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            กลับสู่ศูนย์วางแผนวิชาการ
          </Link>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            โครงสร้างหลักสูตร & รายวิชา (Curriculum Architecture)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            จัดการหลักสูตรแกนกลาง, โครงสร้างหน่วยกิต, สมรรถนะผู้เรียน (OBE/CBE) และจัดหมวดหมู่รายวิชาประจำปีการศึกษา 2569
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition">
            <Plus className="w-4 h-4" />
            <span>เพิ่มรายวิชาใหม่</span>
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">จำนวนรายวิชาทั้งหมด</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">124 รายวิชา</div>
          <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">8 กลุ่มสาระการเรียนรู้</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">วิชาบังคับ (Core Units)</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">86 รายวิชา</div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">100% Validated</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">วิชาเลือกเสรี (Electives)</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">38 รายวิชา</div>
          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">Flexible Credit System</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 font-medium">สมรรถนะ OBE Mapped</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">98.4%</div>
          <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">Audit Passed</span>
        </div>
      </div>

      {/* Main Content Placeholder Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          ระบบจัดการโครงสร้างหลักสูตรพร้อมใช้งาน (Curriculum Management Ready)
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          ข้อมูลหลักสูตรและรายวิชาได้รับการเชื่อมโยงกับฐานข้อมูลวิชาการของโรงเรียนเรียบร้อยแล้ว
        </p>
      </div>
    </div>
  );
}
