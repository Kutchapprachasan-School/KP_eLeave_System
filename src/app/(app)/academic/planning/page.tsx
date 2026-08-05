"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  ShieldCheck,
  Cpu,
  Sliders,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Play,
  BarChart3,
  Calendar,
  Building2,
  BookOpen,
  History,
  GitFork,
  Users,
  Settings,
  ArrowRight,
  ChevronRight,
  Download,
  Sparkles,
  Clock,
  Lock,
  Unlock,
  FileText,
  PieChart,
  Zap,
  Check,
  TrendingUp,
  Database,
  BrainCircuit,
  Scale,
  FileCheck,
  SlidersHorizontal,
  Workflow,
  ArrowRightLeft,
  CheckSquare,
  Award
} from "lucide-react";

// --- Academic Year Options ---
const ACADEMIC_YEARS = [
  { id: "2569-2", label: "ปีการศึกษา 2569 (ภาคเรียนที่ 2)", status: "Active Policy", isCurrent: true },
  { id: "2570-1", label: "ปีการศึกษา 2570 (ภาคเรียนที่ 1)", status: "Draft Simulation", isCurrent: false },
  { id: "2569-1", label: "ปีการศึกษา 2569 (ภาคเรียนที่ 1)", status: "Archived", isCurrent: false },
];

// --- Operational Subsystems (Execution & Operations Layer) ---
const OPERATIONAL_MODULES = [
  {
    href: "/academic/timetable",
    title: "จัดตารางสอนแม่บท (Master Timetable)",
    subtitle: "Timetable Execution Engine",
    description: "จัดตารางสอนอัตโนมัติด้วย AI Solver, ตรวจสอบข้อขัดแย้ง, ตารางคาบล็อคกิจกรรม และพิมพ์ตารางสอน A4",
    icon: Calendar,
    badge: "AI Solver Ready",
    badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    gradient: "from-purple-600 to-indigo-600",
  },
  {
    href: "/academic/substitute",
    title: "จัดครูสอนแทนอัจฉริยะ (Smart Substitute Routing)",
    subtitle: "Real-time Substitute Operations",
    description: "ซิงค์ตารางสอน + eLeave ดึงครูว่างเรียลไทม์ คำนวณคะแนน 4 ปัจจัย และพิมพ์ใบสั่งการสอนแทน",
    icon: ArrowRightLeft,
    badge: "eLeave Sync Active",
    badgeColor: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
    gradient: "from-teal-500 to-cyan-600",
  },
  {
    href: "/academic/supervision",
    title: "นิเทศการสอนออนไลน์ (Instructional Supervision)",
    subtitle: "Supervision & Quality Assurance",
    description: "ปฏิทินนิเทศรายสัปดาห์ซิงค์จากตารางสอน, ประเมิน 5 ด้าน, แนบวิดีโอ/แผนการสอน และ Workflow 3 สิทธิ์",
    icon: CheckSquare,
    badge: "5 Dimensions QA",
    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    href: "/academic/exam",
    title: "จัดตารางสอบ & ผังที่นั่งสอบ (Exam Generator)",
    subtitle: "Exam Scheduling & Seating",
    description: "จัดตารางสอบกลางภาค/ปลายภาค, ผังที่นั่งสอบสลับเลขที่ป้องกันการลอกข้อสอบ และพิมพ์ใบติดหน้าห้องสอบ A4",
    icon: FileText,
    badge: "Anti-Cheating Engine",
    badgeColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    gradient: "from-indigo-500 to-purple-600",
  },
  {
    href: "/academic/competency",
    title: "แฟ้มสะสมงาน & สมรรถนะครู (PA Portfolio)",
    subtitle: "Teacher PA & PD Tracker",
    description: "ประเมินสมรรถนะการสอน 5 ด้าน, บันทึกข้อตกลง PA 2569, ชั่วโมงอบรม PD Hours และพิมพ์แฟ้มสะสมงาน A4",
    icon: Award,
    badge: "PA 2569 Ready",
    badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    href: "/academic/facility",
    title: "จองทรัพยากร & ห้องปฏิบัติการ (Facility Platform)",
    subtitle: "Resource Booking & Labs",
    description: "แคตตาล็อกจองห้องแล็บ หอประชุม อุปกรณ์ และรถโรงเรียน ป้องกันการจองซ้ำซ้อนด้วย Conflict Engine",
    icon: Building2,
    badge: "Conflict Free Engine",
    badgeColor: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
    gradient: "from-cyan-500 to-blue-600",
  },
  {
    href: "/academic/settings",
    title: "ตั้งค่าระบบบริหารงานวิชาการ (Academic Settings)",
    subtitle: "Academic Core Configuration",
    description: "ตั้งค่าปีการศึกษา/ภาคเรียน, คาบเรียนประจำวัน, เกณฑ์ภาระงานสอนครู, กลุ่มสาระการเรียนรู้ และห้องเรียน",
    icon: Settings,
    badge: "System Config",
    badgeColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    gradient: "from-slate-600 to-slate-800",
  },
];

// --- 9 Quick Links Subdomains ---
const SUBDOMAINS = [
  {
    href: "/academic/planning/curriculum",
    title: "โครงสร้างหลักสูตร & รายวิชา",
    subtitle: "Curriculum Architecture",
    description: "จัดการรายวิชา, หน่วยกิต, โครงสร้างแผนการเรียน และการผูกสมรรถนะ OBE/CBE",
    icon: BookOpen,
    badge: "124 รายวิชา",
    badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    gradient: "from-purple-500 to-indigo-600",
  },
  {
    href: "/academic/planning/versions",
    title: "เวอร์ชันแผนวิชาการ",
    subtitle: "Academic Versioning",
    description: "ระบบสแนปช็อต, การเปรียบเทียบเวอร์ชัน (Diff Analysis) และ Rollback แผนวิชาการ",
    icon: History,
    badge: "v2.4 Active",
    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    gradient: "from-blue-500 to-cyan-600",
  },
  {
    href: "/academic/planning/sandbox",
    title: "จำลองฉากทัศน์ & ภาระงาน",
    subtitle: "Planning Sandbox",
    description: "ทดลองปรับเปลี่ยนจำนวนคาบ, ห้องเรียน และครูผู้สอนแบบ Real-time Simulation",
    icon: GitFork,
    badge: "3 Scenarios",
    badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    href: "/academic/planning/workload",
    title: "เกณฑ์ & กระจายภาระงานครู",
    subtitle: "Teacher Workload Engine",
    description: "คำนวณ ETU, ตรวจสอบภาระงานสอนขั้นต่ำ-สูงสุด และเกณฑ์การกระจายคาบสอน",
    icon: Users,
    badge: "142.5 ETU",
    badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    href: "/academic/planning/readiness-rules",
    title: "กฎความพร้อม & เกณฑ์ตรวจสอบ",
    subtitle: "Readiness Rules Matrix",
    description: "กำหนดเงื่อนไขตรวจสอบความพร้อมก่อนประกาศใช้ตารางสอนจริง (Control Gate)",
    icon: ShieldCheck,
    badge: "18 Rules Active",
    badgeColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    gradient: "from-indigo-500 to-purple-600",
  },
  {
    href: "/academic/planning/workflow-config",
    title: "กระบวนการอนุมัติ & สายงาน",
    subtitle: "Workflow Engine",
    description: "ตั้งค่าขั้นตอนการเสนออนุมัติแผนวิชาการ 3-4 ระดับ พร้อมสิทธิ์ลงนามอิเล็กทรอนิกส์",
    icon: Workflow,
    badge: "3 Step Gate",
    badgeColor: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
    gradient: "from-pink-500 to-rose-600",
  },
  {
    href: "/academic/planning/calendar",
    title: "ปฏิทินกรอบเวลาวิชาการ",
    subtitle: "Academic Timeline & Milestones",
    description: "ซิงค์วันเปิด-ปิดภาคเรียน, คาบล็อคกิจกรรมโรงเรียน และสัปดาห์สอบกลางภาค/ปลายภาค",
    icon: Calendar,
    badge: "5 Events Locked",
    badgeColor: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
    gradient: "from-cyan-500 to-blue-600",
  },
  {
    href: "/academic/planning/resources",
    title: "บริหารทรัพยากร & ห้องเรียน",
    subtitle: "Resource & Facility Capacity",
    description: "จัดการห้องปฏิบัติการเฉพาะทาง, คอมพิวเตอร์แล็บ และขีดความสามารถของอาคารเรียน",
    icon: Building2,
    badge: "12 Labs Monitored",
    badgeColor: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
    gradient: "from-teal-500 to-emerald-600",
  },
  {
    href: "/academic/planning/reports",
    title: "รายงานเชิงกลยุทธ์ & สรุปผล",
    subtitle: "Strategic Academic Analytics",
    description: "รายงานวิเคราะห์ภาระงาน, ต้นทุนหลักสูตร และ Executive Summary Dashboard",
    icon: PieChart,
    badge: "100% Exportable",
    badgeColor: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    gradient: "from-violet-500 to-purple-700",
  },
];

// --- Scenarios for Sandbox Switcher ---
interface Scenario {
  id: string;
  name: string;
  code: string;
  tag: string;
  description: string;
  etu: number;
  etuDelta: string;
  budget: string;
  budgetImpact: string;
  roomUsage: number;
  roomDelta: string;
  readinessScore: number;
  scoreDelta: string;
  isBaseline?: boolean;
}

const SCENARIOS: Scenario[] = [
  {
    id: "scenario-a",
    name: "Scenario A: Standard Baseline",
    code: "STD-2569",
    tag: "แผนปัจจุบัน (Current Production)",
    description: "โครงสร้างหลักสูตรมาตรฐาน 8 คาบ/วัน เน้น 5 กลุ่มสาระหลัก และการจัดตารางแบบดั้งเดิม",
    etu: 142.5,
    etuDelta: "0.0 ETU (Base)",
    budget: "฿ 1,450,000",
    budgetImpact: "฿0 (Standard)",
    roomUsage: 78,
    roomDelta: "Optimal",
    readinessScore: 94,
    scoreDelta: "Audit Passed",
    isBaseline: true,
  },
  {
    id: "scenario-b",
    name: "Scenario B: STEM & Bilingual Expansion",
    code: "STEM-EXT-15",
    tag: "ขยายแผน STEM (+15%)",
    description: "เพิ่มบล็อครายวิชา STEM Lab และภาษาอังกฤษแบบทวิภาษา 9 คาบ/วัน ต้องการห้องปฏิบัติการเพิ่ม",
    etu: 158.0,
    etuDelta: "+15.5 ETU (+10.8%)",
    budget: "฿ 1,695,000",
    budgetImpact: "+฿245,000 / ภาคเรียน",
    roomUsage: 94,
    roomDelta: "+16% (Near Cap)",
    readinessScore: 86,
    scoreDelta: "-8 pts (Lab Constraint)",
  },
  {
    id: "scenario-c",
    name: "Scenario C: Flexible Competency-Based",
    code: "CBE-FLEX-2570",
    tag: "แผนสมรรถนะ (Draft 2570)",
    description: "โครงสร้างหลักสูตรอิงสมรรถนะ ปรับตารางแบบคละชั้นเรียน และเปิดวิชาเลือกเสรีตามความสนใจ",
    etu: 139.0,
    etuDelta: "-3.5 ETU (-2.4%)",
    budget: "฿ 1,365,000",
    budgetImpact: "-฿85,000 / ภาคเรียน",
    roomUsage: 82,
    roomDelta: "+4% (Flexible)",
    readinessScore: 91,
    scoreDelta: "-3 pts (Rule Config)",
  },
];

// --- Gate Readiness Diagnostic Checks ---
interface AuditCheck {
  id: string;
  name: string;
  category: string;
  score: number;
  status: "pass" | "warning" | "error";
  details: string;
}

const INITIAL_AUDIT_CHECKS: AuditCheck[] = [
  {
    id: "chk-1",
    name: "Curriculum & Credit Mappings Validation",
    category: "Control Policy",
    score: 98,
    status: "pass",
    details: "100% ของรหัสวิชาและหน่วยกิตตรงตามโครงสร้างหลักสูตรแกนกลาง สพฐ.",
  },
  {
    id: "chk-2",
    name: "Faculty Max Workload & Hours Cap",
    category: "Teacher Workload",
    score: 92,
    status: "warning",
    details: "ภาระงานเฉลี่ย 21.4 ชม./สัปดาห์ พบครู 2 ท่านมีภาระงานใกล้เพดาน 26 ชม.",
  },
  {
    id: "chk-3",
    name: "Specialized Lab & Facility Capacity",
    category: "Resources",
    score: 96,
    status: "pass",
    details: "ห้องแล็บวิทยาศาสตร์และคอมพิวเตอร์จัดสรรลงตัวที่ 88%-92% Utilization",
  },
  {
    id: "chk-4",
    name: "Room & Schedule Hard Conflict Matrix",
    category: "Execution Engine",
    score: 100,
    status: "pass",
    details: "ไม่พบข้อขัดแย้งการใช้ห้องเรียนและเวลาสอนซ้ำซ้อน 0 Hard Overlaps",
  },
  {
    id: "chk-5",
    name: "Block Teaching & Rule Compliance",
    category: "Policy Rules",
    score: 88,
    status: "pass",
    details: "ตรวจสอบเงื่อนไขการต่อคาบเรียนคู่ (Block Hours) และคาบพักผ่านเกณฑ์ 88%",
  },
];

// --- Academic Events ---
const ACADEMIC_EVENTS = [
  {
    title: "Midterm Exam Lock Window",
    date: "12 - 16 ต.ค. 2569",
    type: "Hard Lock",
    lockIcon: Lock,
    badgeColor: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800",
    desc: "ล็อคตารางสอนทุกระดับชั้น ม.1-ม.6 สำหรับการจัดสอบกลางภาคประจำภาคเรียน",
  },
  {
    title: "STEM Science & Innovation Fair",
    date: "4 พ.ย. 2569",
    type: "Soft Lock",
    lockIcon: Unlock,
    badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    desc: "งดเว้นการสอนคาบแล็บช่วงบ่าย สำหรับกิจกรรมจัดนิทรรศการวิทยาศาสตร์",
  },
  {
    title: "Curriculum Revision & PA Audit",
    date: "25 ส.ค. 2569",
    type: "Planning Draft",
    lockIcon: Clock,
    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    desc: "ประชุมทบทวนแผนวิชาการและประเมินภาระงานสอนครูประจำไตรมาส",
  },
];

// --- Resource Utilization Snapshot ---
const RESOURCES_SNAPSHOT = [
  { name: "Science Lab (ห้องแล็บวิทย์)", percentage: 88, status: "High Demand", color: "from-purple-500 to-indigo-600", remaining: "เหลือ 2.5 ชม./สัปดาห์" },
  { name: "Computer Lab (ห้องคอมพิวเตอร์)", percentage: 92, status: "Near Capacity", color: "from-pink-500 to-rose-600", remaining: "เหลือ 1.5 ชม./สัปดาห์" },
  { name: "Gym & Sports Complex (อาคารพลศึกษา)", percentage: 65, status: "Balanced", color: "from-blue-500 to-cyan-600", remaining: "เหลือ 7.0 ชม./สัปดาห์" },
  { name: "Music & Art Studio (ห้องดนตรี-ศิลปะ)", percentage: 40, status: "Optimal Reserve", color: "from-emerald-500 to-teal-600", remaining: "เหลือ 12.0 ชม./สัปดาห์" },
];

export default function AcademicPlanningControlCenter() {
  const [selectedYear, setSelectedYear] = useState("2569-2");
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(SCENARIOS[0]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditProgress, setAuditProgress] = useState(100);
  const [readinessScore, setReadinessScore] = useState(94);
  const [auditChecks, setAuditChecks] = useState<AuditCheck[]>(INITIAL_AUDIT_CHECKS);
  const [lastAuditTime, setLastAuditTime] = useState("วันนี้ 12:48 น.");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // --- Run Readiness Audit Handler ---
  const handleRunAudit = () => {
    if (isAuditing) return;
    setIsAuditing(true);
    setAuditProgress(0);
    setToastMessage("กำลังเริ่มต้นตรวจสอบระบบความพร้อม (Readiness Audit Gate)...");

    const steps = [20, 45, 70, 90, 100];
    let currentStep = 0;

    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setAuditProgress(steps[currentStep]);
        currentStep++;
      } else {
        clearInterval(interval);
        setIsAuditing(false);
        const newScore = Math.floor(92 + Math.random() * 6); // 92 - 97
        setReadinessScore(newScore);
        const now = new Date();
        const timeStr = `วันนี้ ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} น.`;
        setLastAuditTime(timeStr);

        // Slightly update audit checks
        setAuditChecks((prev) =>
          prev.map((item) => ({
            ...item,
            score: Math.min(100, item.score + Math.floor(Math.random() * 3 - 1)),
          }))
        );

        setToastMessage(`✅ ตรวจสอบความพร้อมสำเร็จ! คะแนน Control Gate: ${newScore}/100`);
        setTimeout(() => setToastMessage(null), 4000);
      }
    }, 400);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 px-5 py-3.5 bg-slate-900/90 text-white backdrop-blur-md border border-purple-500/30 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-semibold"
          >
            <Sparkles className="w-5 h-5 text-purple-400 animate-spin" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- HEADER CONTROL BAR --- */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white p-6 md:p-8 shadow-2xl border border-purple-500/20">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-extrabold tracking-wider uppercase">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                Control Plane 100/100
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Policy: Active & Enforced
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-semibold">
                <Database className="w-3 h-3 text-blue-400" />
                Execution Sync: Live (0ms)
              </span>
            </div>

            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              ศูนย์ควบคุมการวางแผนวิชาการ
              <span className="text-xs md:text-sm font-medium px-3 py-1 rounded-xl bg-white/10 text-slate-300 border border-white/10">
                Academic Planning Platform
              </span>
            </h1>

            <p className="text-slate-300 text-xs md:text-sm max-w-3xl leading-relaxed">
              สถาปัตยกรรมระดับนโยบาย (Control Plane) สำหรับกำหนดกรอบหลักสูตร, จำลองฉากทัศน์ Sandbox,
              ตรวจสอบประตูความพร้อม (Readiness Gate) และเชื่อมต่อเครื่องมือจัดตารางสอน (Execution Plane) สู่การปฏิบัติงานจริง
            </p>
          </div>

          {/* Academic Year Selector & Quick Actions */}
          <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3">
            <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/15 flex items-center gap-2">
              <span className="text-xs text-slate-300 font-semibold px-2.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-purple-400" />
                ปีการศึกษา:
              </span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-slate-900/90 text-white text-xs font-bold px-3 py-2 rounded-xl border border-purple-500/30 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                {ACADEMIC_YEARS.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.label} [{y.status}]
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRunAudit}
                disabled={isAuditing}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 hover:from-purple-600 hover:to-indigo-600 text-white font-bold text-xs shadow-lg shadow-purple-500/25 active:scale-95 transition-all duration-200 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isAuditing ? "animate-spin" : ""}`} />
                <span>{isAuditing ? "กำลังตรวจ Audit..." : "รัน Readiness Audit"}</span>
              </button>

              <Link
                href="/academic/planning/reports"
                className="flex items-center justify-center p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10"
                title="ส่งออกรายงานเชิงกลยุทธ์"
              >
                <Download className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* --- ARCHITECTURAL CAPABILITY MAP OVERVIEW --- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              แผนผังขีดความสามารถสถาปัตยกรรม (3-Tier System Control Plane)
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            สถาปัตยกรรมควบคุมแบบแยกส่วน (Separation of Control & Execution)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Tier 1: Control Plane */}
          <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border-2 border-purple-500/40 p-6 shadow-xl space-y-4 group hover:border-purple-500 transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-bl-full pointer-events-none" />
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <SlidersHorizontal className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 text-xs font-black">
                TIER 1 • CONTROL PLANE
              </span>
            </div>

            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors">
                1. Control Plane (Policy & Intent)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                กำหนดนโยบายวิชาการ, โครงสร้างหลักสูตร, เงื่อนไขภาระงานครู (Cap 24-26 ชม.), กฎความพร้อม และงบประมาณ
              </p>
            </div>

            <ul className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                <span>กำหนดเกณฑ์ภาระงานครู ETU & Workload</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                <span>จำลองฉากทัศน์ Sandbox Scenario A/B/C</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                <span>ประตูกลั่นกรองความพร้อม Readiness Gate</span>
              </li>
            </ul>
          </div>

          {/* Tier 2: Execution Plane */}
          <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4 group hover:border-indigo-500/50 transition-all">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md">
                <Cpu className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 text-xs font-black">
                TIER 2 • EXECUTION PLANE
              </span>
            </div>

            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                2. Execution Plane (Timetable Engine)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                เครื่องมือประมวลผลตารางสอน AI Solver, ตรวจสอบข้อขัดแย้ง 0 Hard Overlaps และจัดตารางสอบ
              </p>
            </div>

            <ul className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>AI Timetable Solver Engine & CSPS</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>จัดสรรห้องแล็บ & คาบล็อคกิจกรรม</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>สร้างผังที่นั่งสอบ & ตารางสอบสลับเลขที่</span>
              </li>
            </ul>
          </div>

          {/* Tier 3: Operations Plane */}
          <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4 group hover:border-teal-500/50 transition-all">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-md">
                <Activity className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 text-xs font-black">
                TIER 3 • OPERATIONS PLANE
              </span>
            </div>

            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
                3. Operations Plane (Daily Operations)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                การปฏิบัติงานรายวัน: ซิงค์ eLeave ครูจัดสอนแทนเรียลไทม์, นิเทศการสอน และระบบจองทรัพยากรกลาง
              </p>
            </div>

            <ul className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0" />
                <span>Smart Substitute Routing (ซิงค์ eLeave)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0" />
                <span>นิเทศการสอนออนไลน์ & ประเมิน PA</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0" />
                <span>Facility Platform & จองห้องแล็บ</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* --- 🚦 DATA-DRIVEN READINESS PIPELINE GATE (0 - 100%) --- */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                🚦 Data-Driven Readiness Pipeline Gate
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ประตูตรวจสอบเกณฑ์ความพร้อมแบบอัตโนมัติก่อนอนุมัติประกาศใช้ตารางสอนจริง (ปรับปรุงล่าสุด: {lastAuditTime})
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-medium">คะแนนความพร้อมรวม (Overall Gate Score)</span>
              <span className="text-3xl font-black text-purple-600 dark:text-purple-400 tracking-tight">
                {readinessScore}
                <span className="text-sm font-bold text-slate-400"> / 100</span>
              </span>
            </div>

            <button
              onClick={handleRunAudit}
              disabled={isAuditing}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{isAuditing ? "กำลังรัน Audit Engine..." : "Run Readiness Audit"}</span>
            </button>
          </div>
        </div>

        {/* Progress Score Gauge Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              ระดับความพร้อมในการประกาศใช้ (Production Readiness Gauge):
            </span>
            <span className={readinessScore >= 90 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
              {readinessScore >= 90 ? "PASSED • READY FOR PRODUCTION" : "WARNING • ATTENTION REQUIRED"}
            </span>
          </div>

          <div className="relative h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: `${isAuditing ? auditProgress : readinessScore}%` }}
              transition={{ duration: isAuditing ? 0.3 : 0.8, ease: "easeOut" }}
              className={`h-full rounded-full bg-gradient-to-r ${
                readinessScore >= 90
                  ? "from-emerald-500 via-teal-500 to-purple-600"
                  : "from-amber-500 via-orange-500 to-purple-600"
              }`}
            />
          </div>
        </div>

        {/* Detailed Inspection Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {auditChecks.map((item) => (
            <div
              key={item.id}
              className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {item.category}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                    item.status === "pass"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : item.status === "warning"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                  }`}
                >
                  {item.status === "pass" ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                  )}
                  {item.score}% PASS
                </span>
              </div>

              <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-snug">
                {item.name}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {item.details}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* --- 📊 PLANNING SANDBOX SCENARIO SWITCHER --- */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <GitFork className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                📊 Planning Sandbox Scenario Switcher
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              เปรียบเทียบผลกระทบเชิงตัวเลข (Delta Metrics) ระหว่างฉากทัศน์ก่อนการอนุมัติจริง
            </p>
          </div>

          {/* Scenario Tabs */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
            {SCENARIOS.map((sc) => (
              <button
                key={sc.id}
                onClick={() => setSelectedScenario(sc)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedScenario.id === sc.id
                    ? "bg-purple-600 text-white shadow-md shadow-purple-500/25"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                }`}
              >
                {sc.code}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Scenario Detail Header */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 p-5 rounded-2xl border border-purple-200/60 dark:border-purple-800/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-black uppercase">
                {selectedScenario.code}
              </span>
              <span className="text-xs font-extrabold text-purple-700 dark:text-purple-300">
                {selectedScenario.tag}
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {selectedScenario.name}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {selectedScenario.description}
            </p>
          </div>

          <Link
            href="/academic/planning/sandbox"
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md flex items-center gap-1.5 shrink-0"
          >
            <span>เปิดจำลองใน Sandbox</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Delta Metrics 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Metric 1: ETU */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                ETU (ภาระงานสอนครู)
              </span>
              <Users className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {selectedScenario.etu}{" "}
              <span className="text-xs font-bold text-slate-400">ETU</span>
            </div>
            <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">
              Delta: {selectedScenario.etuDelta}
            </div>
          </div>

          {/* Metric 2: Budget */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                งบประมาณวิชาการรวม
              </span>
              <Scale className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {selectedScenario.budget}
            </div>
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Impact: {selectedScenario.budgetImpact}
            </div>
          </div>

          {/* Metric 3: Room Usage */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                อัตราการใช้ห้องเรียน/แล็บ
              </span>
              <Building2 className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {selectedScenario.roomUsage}%
            </div>
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              Status: {selectedScenario.roomDelta}
            </div>
          </div>

          {/* Metric 4: Readiness Score */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                คะแนนประตูความพร้อม
              </span>
              <ShieldCheck className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {selectedScenario.readinessScore}{" "}
              <span className="text-xs font-bold text-slate-400">/ 100</span>
            </div>
            <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              Gate: {selectedScenario.scoreDelta}
            </div>
          </div>
        </div>
      </div>

      {/* --- 📅 ACADEMIC CALENDAR SYNC & RESOURCE CAPACITY SNAPSHOT --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Academic Calendar Events */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                📅 Academic Calendar Sync (กิจกรรมล็อคตาราง)
              </h3>
            </div>
            <Link
              href="/academic/planning/calendar"
              className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
            >
              <span>ดูปฏิทินทั้งหมด</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {ACADEMIC_EVENTS.map((ev, i) => {
              const LockIcon = ev.lockIcon;
              return (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                      <LockIcon className="w-3.5 h-3.5 text-purple-500" />
                      {ev.title}
                    </h4>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${ev.badgeColor}`}>
                      {ev.type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    <span>{ev.desc}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0 ml-2">
                      {ev.date}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resource Capacity Snapshot */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                🏢 Resource & Lab Capacity Snapshot
              </h3>
            </div>
            <Link
              href="/academic/planning/resources"
              className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
            >
              <span>จัดการทรัพยากร</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {RESOURCES_SNAPSHOT.map((res, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {res.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {res.remaining}
                    </span>
                    <span className="font-black text-purple-600 dark:text-purple-400">
                      {res.percentage}%
                    </span>
                  </div>
                </div>

                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${res.percentage}%` }}
                    className={`h-full rounded-full bg-gradient-to-r ${res.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- OPERATIONAL SUBSYSTEMS (EXECUTION & OPERATIONS LAYER) --- */}
      <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              ระบบย่อยปฏิบัติการวิชาการ (Execution & Operational Subsystems)
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            ศูนย์รวมระบบย่อยสำหรับจัดตารางสอน สอนแทน นิเทศ การสอบ PA ทรัพยากร และตั้งค่าวิชาการ
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {OPERATIONAL_MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link key={mod.href} href={mod.href} className="group">
                <div className="h-full bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:border-indigo-500/50 transition-all duration-300 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black ${mod.badgeColor}`}>
                        {mod.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {mod.title}
                      </h3>
                      <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                        {mod.subtitle}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                        {mod.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span>เข้าสู่ระบบย่อย</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* --- QUICK LINKS TO 9 SUBDOMAINS --- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              ระบบย่อยฝ่ายวางแผนวิชาการ (9 Subdomain Control Modules)
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            เลือกโมดูลเพื่อดำเนินการบริหารจัดการเฉพาะด้าน
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SUBDOMAINS.map((sub) => {
            const Icon = sub.icon;
            return (
              <Link key={sub.href} href={sub.href} className="group">
                <div className="h-full bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:border-purple-500/50 transition-all duration-300 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${sub.gradient} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black ${sub.badgeColor}`}>
                        {sub.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {sub.title}
                      </h3>
                      <p className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                        {sub.subtitle}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                        {sub.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-purple-600 dark:text-purple-400 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span>เข้าสู่โมดูล</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
