"use client";

import React from "react";
import Link from "next/link";
import { Users, ShieldAlert, HeartHandshake, UserCheck, ArrowLeft, ChevronRight } from "lucide-react";

export default function StudentAffairsLandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-6 text-slate-900 dark:text-slate-100">
      <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 border-b border-slate-200 dark:border-slate-800 pb-4">
        <Link href="/dashboard" className="hover:underline flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          กลับหน้าหลัก
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span>ฝ่ายบริหารงานกิจการนักเรียน</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-rose-600 dark:text-rose-400" />
            ระบบบริหารงานกิจการนักเรียน (Student Affairs & Care System)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ศูนย์กลางการดูแลช่วยเหลือนักเรียน ส่งเสริมวินัย คุณธรรมจริยธรรม และการบันทึกคะแนนพฤติกรรม
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-md">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">บันทึกวินัย & คะแนนพฤติกรรม</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            ติดตามและบันทึกคะแนนความประพฤติ การตัดคะแนนความประพฤติ และการแจ้งเตือนผู้ปกครอง
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">ระบบดูแลช่วยเหลือนักเรียน</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            บันทึกการเยี่ยมบ้าน คัดกรองนักเรียน คลินิกแนะแนว และทุนการศึกษานักเรียน
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md">
            <UserCheck className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">เช็คชื่อแถวหน้าเสาธง</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            ระบบบันทึกการเข้าแถวเคารพธงชาติรายวัน ครูปรึกษาเช็คชื่อเรียลไทม์ผ่านมือถือ
          </p>
        </div>
      </div>
    </div>
  );
}
