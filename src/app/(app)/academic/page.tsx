"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  GraduationCap,
  ScanLine,
  FileText,
  Calendar,
  ArrowRightLeft,
  CheckSquare,
  Layers,
  Sparkles,
  ArrowRight,
  Plus,
  BarChart3,
  BookOpen,
  Award,
  Settings
} from "lucide-react";

export default function AcademicLandingPage() {
  const modules = [
    {
      id: "omr",
      title: "ระบบตรวจข้อสอบ OMR (ZipGrade)",
      subtitle: "Smart OMR Camera Scanner & Analytics",
      description: "ตรวจกระดาษคำตอบอัตโนมัติด้วยกล้องมือถือ/เว็บแคม ตรวจจับจุดวงกลมแม่นยำ พร้อมวิเคราะห์ข้อสอบรายข้อ (p, r, KR-20) และพิมพ์กระดาษคำตอบ A4 ป้องกันการทุจริต",
      icon: ScanLine,
      color: "from-purple-600 to-indigo-600",
      lightBg: "bg-purple-50 dark:bg-purple-950/30",
      borderColor: "border-purple-200 dark:border-purple-800/40",
      badge: "ZipGrade AI Core",
      badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
      primaryLink: { href: "/academic/exam/omr", label: "ศูนย์ตรวจข้อสอบ OMR" },
      secondaryLinks: [
        { href: "/academic/exam/scan", label: "กล้องสแกนตรวจ", icon: Sparkles },
        { href: "/academic/exam/omr/create", label: "สร้างชุดข้อสอบ", icon: Plus },
      ],
    },
    {
      id: "exam",
      title: "ระบบจัดตารางสอบ & ผังที่นั่ง",
      subtitle: "Exam Scheduling & Anti-Cheating Engine",
      description: "จัดตารางสอบกลางภาค/ปลายภาคอัตโนมัติ สลับผังที่นั่งป้องกันการทุจริต มอบหมายครูผู้คุมสอบ และพิมพ์ใบติดหน้าห้องสอบ A4 พร้อมเชื่อมโยงสู่การตรวจ OMR",
      icon: FileText,
      color: "from-indigo-600 to-blue-600",
      lightBg: "bg-indigo-50 dark:bg-indigo-950/30",
      borderColor: "border-indigo-200 dark:border-indigo-800/40",
      badge: "Anti-Cheating",
      badgeColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300",
      primaryLink: { href: "/academic/exam", label: "จัดการตารางสอบและผังที่นั่ง" },
    },
    {
      id: "timetable",
      title: "ระบบจัดตารางสอนออนไลน์",
      subtitle: "Master Timetable & AI Solver",
      description: "สร้างตารางสอนแม่บทปราศจากข้อขัดแย้ง (Zero Conflict) ด้วย AI Constraint Solver, ตารางรวมรายห้อง/ครู, ตารางคาบล็อคกิจกรรม และพิมพ์ตารางสอน A4",
      icon: Calendar,
      color: "from-emerald-600 to-teal-600",
      lightBg: "bg-emerald-50 dark:bg-emerald-950/30",
      borderColor: "border-emerald-200 dark:border-emerald-800/40",
      badge: "AI Solver Ready",
      badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
      primaryLink: { href: "/academic/timetable", label: "เข้าสู่ระบบจัดตารางสอน" },
      secondaryLinks: [
        { href: "/academic/timetable?view=matrix", label: "ตารางรวมรายห้อง/ครู", icon: BookOpen },
      ],
    },
    {
      id: "substitute",
      title: "ระบบจัดครูสอนแทนอัจฉริยะ",
      subtitle: "Smart Substitute & eLeave Sync",
      description: "ซิงค์ข้อมูลการลาจาก eLeave อัตโนมัติ ตรวจสอบครูว่างตรงกลุ่มสาระ ออกใบสั่งการสอนแทนราชการ และบันทึกประวัติการสอนแทนแบบเรียลไทม์",
      icon: ArrowRightLeft,
      color: "from-amber-600 to-orange-600",
      lightBg: "bg-amber-50 dark:bg-amber-950/30",
      borderColor: "border-amber-200 dark:border-amber-800/40",
      badge: "eLeave Sync Active",
      badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
      primaryLink: { href: "/academic/substitute", label: "จัดครูสอนแทนออนไลน์" },
      secondaryLinks: [
        { href: "/academic/substitute?view=history", label: "ประวัติการสอนแทน", icon: BarChart3 },
      ],
    },
    {
      id: "supervision",
      title: "ระบบนิเทศการสอนออนไลน์",
      subtitle: "5-Dimension Instructional QA",
      description: "ปฏิทินนิเทศการสอนซิงค์จากตารางสอน ประเมิน 5 ด้านคุณภาพการจัดการเรียนรู้ แนบวิดีโอการสอนและแผนการจัดการเรียนรู้ พร้อมระบบอนุมัติ 3 ระดับ",
      icon: CheckSquare,
      color: "from-cyan-600 to-blue-600",
      lightBg: "bg-cyan-50 dark:bg-cyan-950/30",
      borderColor: "border-cyan-200 dark:border-cyan-800/40",
      badge: "5 Dimensions QA",
      badgeColor: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300",
      primaryLink: { href: "/academic/supervision", label: "เข้าสู่ระบบนิเทศการสอน" },
      secondaryLinks: [
        { href: "/academic/supervision?view=summary", label: "สรุปผลและรายงาน", icon: Award },
      ],
    },
    {
      id: "planning",
      title: "ศูนย์วางแผนวิชาการ & โครงสร้างหลักสูตร",
      subtitle: "Curriculum & Workload Sandbox",
      description: "ออกแบบโครงสร้างหลักสูตรสถานศึกษา วิเคราะห์ภาระงานสอนครูรายสัปดาห์ (ETU) และแบบจำลองสถานการณ์ Sandbox สำหรับคณะกรรมการวิชาการ",
      icon: Layers,
      color: "from-rose-600 to-pink-600",
      lightBg: "bg-rose-50 dark:bg-rose-950/30",
      borderColor: "border-rose-200 dark:border-rose-800/40",
      badge: "Strategic Sandbox",
      badgeColor: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
      primaryLink: { href: "/academic/planning", label: "เปิดศูนย์วางแผนวิชาการ" },
      secondaryLinks: [
        { href: "/academic/planning/curriculum", label: "โครงสร้างหลักสูตร", icon: BookOpen },
        { href: "/academic/planning/workload", label: "ภาระงานสอน ETU", icon: BarChart3 },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-8">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-800 text-white p-6 md:p-8 shadow-xl"
      >
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-purple-200 border border-white/20">
              <GraduationCap className="w-3.5 h-3.5" />
              Academic Operations Platform
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              ศูนย์กลางงานฝ่ายวิชาการ
            </h1>
            <p className="text-sm md:text-base text-purple-100/90 max-w-2xl font-light leading-relaxed">
              ระบบบริหารจัดการและสนับสนุนการจัดการเรียนการสอนแบบครบวงจร ทั้งการจัดตารางสอน ครูสอนแทน นิเทศการสอน และระบบตรวจข้อสอบ OMR อัจฉริยะ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/academic/exam/omr"
              className="px-4 py-2.5 rounded-xl bg-white text-purple-900 font-bold text-xs shadow-lg hover:bg-purple-50 transition-all flex items-center gap-2"
            >
              <ScanLine className="w-4 h-4 text-purple-600" />
              ตรวจข้อสอบ OMR
            </Link>
            <Link
              href="/academic/settings"
              className="px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white font-semibold text-xs transition border border-white/20 flex items-center gap-1.5"
            >
              <Settings className="w-4 h-4" />
              ตั้งค่าวิชาการ
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Grid of Academic Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((mod, index) => {
          const Icon = mod.icon;
          return (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`rounded-2xl border ${mod.borderColor} bg-white dark:bg-slate-900 p-5 shadow-[0_4px_20px_rgb(0,0,0,0.04)] flex flex-col justify-between hover:shadow-md transition-all duration-200 group`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${mod.color} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${mod.badgeColor}`}>
                    {mod.badge}
                  </span>
                </div>

                <div className="space-y-1">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {mod.title}
                  </h2>
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                    {mod.subtitle}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
                    {mod.description}
                  </p>
                </div>
              </div>

              <div className="pt-5 space-y-2 border-t border-slate-100 dark:border-slate-800/80 mt-5">
                <Link
                  href={mod.primaryLink.href}
                  className={`w-full py-2.5 px-3 rounded-xl bg-gradient-to-r ${mod.color} text-white font-bold text-xs shadow-xs hover:opacity-95 active:scale-[0.99] transition flex items-center justify-center gap-1.5`}
                >
                  {mod.primaryLink.label}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                {mod.secondaryLinks && mod.secondaryLinks.length > 0 && (
                  <div className="flex gap-2 pt-1">
                    {mod.secondaryLinks.map((sec) => {
                      const SecIcon = sec.icon;
                      return (
                        <Link
                          key={sec.href}
                          href={sec.href}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-medium transition flex items-center justify-center gap-1"
                        >
                          <SecIcon className="w-3 h-3 text-slate-500" />
                          <span className="truncate">{sec.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
