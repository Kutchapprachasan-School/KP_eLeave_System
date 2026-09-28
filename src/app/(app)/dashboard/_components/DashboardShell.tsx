"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { type SystemOption } from "./SystemSelector";
import {
  CalendarDays,
  Wrench,
  FileText,
  Building2,
  Loader2,
  Sparkles,
  PlusCircle,
  FileSpreadsheet,
  CheckSquare,
  Clock,
  ExternalLink,
  ChevronRight
} from "lucide-react";

type Props = {
  initialSystem: string;
  availableSystems: SystemOption[];
  leaveView: React.ReactNode;
  repairView: React.ReactNode | null;
  documentView?: React.ReactNode | null;
  facilityView?: React.ReactNode | null;
  schoolInfo?: {
    schoolName: string;
    subheader: string;
    logoUrl: string | null;
  };
  user?: {
    name: string;
    role: string;
    position: string;
    isApprover: boolean;
  };
};

const SYSTEM_ICONS: Record<string, React.ReactNode> = {
  leave: <CalendarDays className="w-4 h-4 shrink-0" />,
  document: <FileText className="w-4 h-4 shrink-0" />,
  repair: <Wrench className="w-4 h-4 shrink-0" />,
  facility: <Building2 className="w-4 h-4 shrink-0" />,
};

export default function DashboardShell({
  initialSystem,
  availableSystems,
  leaveView,
  repairView,
  documentView,
  facilityView,
  schoolInfo,
  user,
}: Props) {
  const router = useRouter();
  const [activeSystem, setActiveSystem] = useState(initialSystem);
  const [isPending, startTransition] = useTransition();

  const handleSystemChange = (systemId: string) => {
    setActiveSystem(systemId);
    startTransition(() => {
      router.replace(`/dashboard?system=${systemId}`, { scroll: false });
    });
  };

  const schoolTitle = schoolInfo?.schoolName || "โรงเรียนกุดจับประชาสรรค์";
  const subheaderText =
    schoolInfo?.subheader || "ระบบครบวงจร เพื่อการบริหารจัดการสถานศึกษาที่ดียิ่งขึ้น";

  return (
    <div className="space-y-6">
      {/* ── 1. Smart School Hero Welcome Banner ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 text-white p-6 sm:p-8 shadow-xl shadow-indigo-950/10 border border-indigo-500/20">
        {/* Decorative backdrop shapes */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-semibold text-indigo-100 border border-white/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>ระบบบริหารจัดการสถานศึกษาอัจฉริยะ · Smart School</span>
            </div>

            {/* School Name & Welcome Heading */}
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
                ยินดีต้อนรับสู่ {schoolTitle}
              </h1>
              <p className="text-xs sm:text-sm text-indigo-100/90 mt-1 font-normal leading-relaxed">
                {subheaderText}
              </p>
            </div>

            {/* Quick Action Shortcuts */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Link
                href="/request"
                prefetch={false}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 text-xs font-bold shadow-md shadow-black/10 hover:shadow-lg transition-all duration-200 active:scale-95"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>ยื่นใบลาออนไลน์</span>
              </Link>

              <Link
                href="/history"
                prefetch={false}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white text-xs font-semibold border border-white/20 transition-all duration-200 active:scale-95"
              >
                <Clock className="w-3.5 h-3.5 text-indigo-200" />
                <span>ประวัติการลา</span>
              </Link>

              {user?.isApprover && (
                <Link
                  href="/approvals"
                  prefetch={false}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-bold shadow-md shadow-amber-950/20 transition-all duration-200 active:scale-95"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-slate-900" />
                  <span>พิจารณาคำขอ</span>
                </Link>
              )}

              <Link
                href="/reports"
                prefetch={false}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs font-semibold border border-white/15 transition-all duration-200 active:scale-95"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-200" />
                <span>รายงานและสถิติ</span>
              </Link>
            </div>
          </div>

          {/* Right Slogan Box (Inspired by Reference Dashboard) */}
          <div className="hidden lg:flex flex-col items-end text-right bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 max-w-xs shrink-0 shadow-lg">
            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-200 mb-1">
              วิสัยทัศน์สถานศึกษา
            </span>
            <p className="text-sm font-semibold text-white leading-relaxed italic">
              “การศึกษา คือ รากฐานของอนาคตที่มั่นคง”
            </p>
            <div className="mt-2 pt-2 border-t border-white/15 w-full flex items-center justify-between text-[11px] text-indigo-200">
              <span>{user?.name || "ยินดีต้อนรับ"}</span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-bold text-[10px]">
                {user?.position || "บุคลากร"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Segmented Subsystem Switcher Tabs ── */}
      {availableSystems.length > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2 shadow-xs">
          {/* Scrollable Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
            {availableSystems.map((sys) => {
              const isActive = activeSystem === sys.id;
              return (
                <button
                  key={sys.id}
                  type="button"
                  onClick={() => handleSystemChange(sys.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-[1.02]"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {SYSTEM_ICONS[sys.id] || SYSTEM_ICONS.leave}
                  <span>{sys.label}</span>
                </button>
              );
            })}
          </div>

          {/* Pending indicator on view change */}
          {isPending && (
            <div className="flex items-center gap-2 px-3 text-xs text-indigo-600 dark:text-indigo-400 font-semibold animate-pulse shrink-0">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>กำลังสลับมุมมอง...</span>
            </div>
          )}
        </div>
      )}

      {/* ── 3. Render Selected Subsystem View ── */}
      {activeSystem === "repair" && repairView
        ? repairView
        : activeSystem === "document" && documentView
        ? documentView
        : activeSystem === "facility" && facilityView
        ? facilityView
        : leaveView}
    </div>
  );
}
