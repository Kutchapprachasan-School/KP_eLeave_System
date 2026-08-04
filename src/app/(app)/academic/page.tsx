"use client";

export const dynamic = 'force-dynamic';

import React from "react";
import Link from "next/link";
import { 
  CalendarDays as Calendar, 
  ArrowRightLeft, 
  CheckSquare, 
  FileText, 
  Award, 
  Building2, 
  Settings,
  ArrowRight,
  BookOpen,
  Layers
} from "lucide-react";

const ACADEMIC_MODULES = [
  {
    href: "/academic/planning",
    title: "ศูนย์ควบคุมการวางแผนวิชาการ (Academic Planning Platform)",
    description: "Control Plane 100/100: กำหนดนโยบายหลักสูตร, จำลองฉากทัศน์ Sandbox, ตรวจสอบ Readiness Gate 0-100% และกระจายภาระงานครู",
    icon: Layers,
    color: "from-purple-600 via-indigo-600 to-violet-700",
    textColor: "text-purple-600 dark:text-purple-400"
  },
  {
    href: "/academic/timetable",
    title: "จัดตารางสอนแม่บท (Master Timetable)",
    description: "จัดตารางสอนอัตโนมัติด้วย AI Solver, ตรวจสอบข้อขัดแย้ง, ตารางคาบล็อคกิจกรรม และพิมพ์ตารางสอน A4",
    icon: Calendar,
    color: "from-purple-500 to-indigo-600",
    textColor: "text-purple-600 dark:text-purple-400"
  },
  {
    href: "/academic/substitute",
    title: "จัดครูสอนแทนอัจฉริยะ (Smart Substitute Routing)",
    description: "ซิงค์ตารางสอน + eLeave ดึงครูว่างเรียลไทม์ คำนวณคะแนน 4 ปัจจัย และพิมพ์ใบสั่งการสอนแทน",
    icon: ArrowRightLeft,
    color: "from-teal-500 to-cyan-600",
    textColor: "text-teal-600 dark:text-teal-400"
  },
  {
    href: "/academic/supervision",
    title: "นิเทศการสอนออนไลน์ (Instructional Supervision)",
    description: "ปฏิทินนิเทศรายสัปดาห์ซิงค์จากตารางสอน, ประเมิน 5 ด้าน, แนบวิดีโอ/แผนการสอน และ Workflow 3 สิทธิ์",
    icon: CheckSquare,
    color: "from-blue-500 to-indigo-600",
    textColor: "text-blue-600 dark:text-blue-400"
  },
  {
    href: "/academic/exam",
    title: "จัดตารางสอบ & ผังที่นั่งสอบ (Exam Generator)",
    description: "จัดตารางสอบกลางภาค/ปลายภาค, ผังที่นั่งสอบสลับเลขที่ป้องกันการลอกข้อสอบ และพิมพ์ใบติดหน้าห้องสอบ A4",
    icon: FileText,
    color: "from-indigo-500 to-purple-600",
    textColor: "text-indigo-600 dark:text-indigo-400"
  },
  {
    href: "/academic/competency",
    title: "แฟ้มสะสมงาน & สมรรถนะครู (PA Portfolio)",
    description: "ประเมินสมรรถนะการสอน 5 ด้าน, บันทึกข้อตกลง PA 2569, ชั่วโมงอบรม PD Hours และพิมพ์แฟ้มสะสมงาน A4",
    icon: Award,
    color: "from-amber-500 to-orange-600",
    textColor: "text-amber-600 dark:text-amber-400"
  },
  {
    href: "/academic/facility",
    title: "จองทรัพยากร & ห้องปฏิบัติการ (Facility Platform)",
    description: "แคตตาล็อกจองห้องแล็บ หอประชุม อุปกรณ์ และรถโรงเรียน ป้องกันการจองซ้ำซ้อนด้วย Conflict Engine",
    icon: Building2,
    color: "from-cyan-500 to-blue-600",
    textColor: "text-cyan-600 dark:text-cyan-400"
  },
  {
    href: "/academic/settings",
    title: "ตั้งค่าระบบบริหารงานวิชาการ (Academic Settings)",
    description: "ตั้งค่าปีการศึกษา/ภาคเรียน, คาบเรียนประจำวัน, เกณฑ์ภาระงานสอนครู, กลุ่มสาระการเรียนรู้ และห้องเรียน",
    icon: Settings,
    color: "from-slate-600 to-slate-800",
    textColor: "text-slate-700 dark:text-slate-300"
  }
];

export default function AcademicLandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 space-y-8 text-slate-900 dark:text-slate-100">
      {/* Header Banner */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-purple-600 dark:text-purple-400" />
          ระบบบริหารงานวิชาการ (Academic Affairs Subsystem)
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          ศูนย์รวมระบบย่อยสำหรับการจัดการตารางสอน สอนแทน นิเทศการสอน ตารางสอบ สมรรถนะครู และการตั้งค่าวิชาการ
        </p>
      </div>

      {/* Grid of Subsystems */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ACADEMIC_MODULES.map(module => {
          const Icon = module.icon;
          return (
            <Link key={module.href} href={module.href} className="group">
              <div className="h-full bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-purple-500/50 transition-all duration-200 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${module.color} flex items-center justify-center text-white shadow-md`}>
                    <Icon className="w-6 h-6" />
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white group-hover:text-purple-600 transition">
                      {module.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                      {module.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>เข้าสู่ระบบย่อย</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
