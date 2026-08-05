"use client";

import React from "react";
import Link from "next/link";
import { Vote, Award, Calendar, Megaphone, ArrowLeft, ChevronRight } from "lucide-react";

export default function StudentCouncilLandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-6 text-slate-900 dark:text-slate-100">
      <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 border-b border-slate-200 dark:border-slate-800 pb-4">
        <Link href="/dashboard" className="hover:underline flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          กลับหน้าหลัก
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span>ฝ่ายงานสภานักเรียน & กิจกรรมนักเรียน</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Vote className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            ระบบสภานักเรียน & กิจกรรมประชาธิปไตย (Student Governance & Activities)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ศูนย์กลางส่งเสริมประชาธิปไตยในโรงเรียน การเลือกตั้งสภานักเรียน โครงการกิจกรรมนักเรียน และข่าวสารกิจกรรม
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <Vote className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">เลือกตั้งสภานักเรียนอิเล็กทรอนิกส์</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            ระบบลงคะแนนเลือกตั้งสภานักเรียนออนไลน์ E-Voting ปลอดภัย นับคะแนนเรียลไทม์
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center text-white shadow-md">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">ปฏิทินกิจกรรมนักเรียน & สื่อประชาสัมพันธ์</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            ปฏิทินกิจกรรมวันสำคัญ กิจกรรมสภานักเรียน และงานแข่งขันกีฬาภายใน
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white shadow-md">
            <Megaphone className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">ตู้รับความคิดเห็น & ข้อเสนอแนะ</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            ช่องทางรับฟังความคิดเห็นจากนักเรียนเพื่อการพัฒนาโรงเรียนอย่างมีส่วนร่วม
          </p>
        </div>
      </div>
    </div>
  );
}
