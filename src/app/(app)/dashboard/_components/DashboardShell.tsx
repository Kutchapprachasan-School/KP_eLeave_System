"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import SystemSelector, { type SystemOption } from "./SystemSelector";
import { Loader2, LayoutDashboard, UserCheck } from "lucide-react";

type Props = {
  initialSystem: string;
  availableSystems: SystemOption[];
  leaveView: React.ReactNode;
  executiveLeaveView?: React.ReactNode;
  repairView: React.ReactNode | null;
  documentView?: React.ReactNode | null;
  facilityView?: React.ReactNode | null;
};

export default function DashboardShell({
  initialSystem,
  availableSystems,
  leaveView,
  executiveLeaveView,
  repairView,
  documentView,
  facilityView,
}: Props) {
  const router = useRouter();
  const [activeSystem, setActiveSystem] = useState(initialSystem);
  const [leaveSubView, setLeaveSubView] = useState<"executive" | "classic">("executive");
  const [isPending, startTransition] = useTransition();

  const handleSystemChange = (systemId: string) => {
    setActiveSystem(systemId);
    startTransition(() => {
      router.replace(`/dashboard?system=${systemId}`, { scroll: false });
    });
  };

  const getTitle = () => {
    if (activeSystem === "repair") return "ภาพรวมระบบแจ้งซ่อม";
    if (activeSystem === "document") return "ภาพรวมระบบงานสารบรรณ";
    if (activeSystem === "facility") return "ภาพรวมระบบทรัพยากรส่วนกลาง";
    return leaveSubView === "executive"
      ? "ระบบบริหารจัดการโรงเรียน (KP School Management System - Executive Hub)"
      : "แดชบอร์ดสถิติการลา & ลงเวลา";
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Subsystem Selector Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">
            {getTitle()}
          </h1>
          {isPending && (
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Executive vs Classic Leave Toggle (when active system is leave) */}
          {activeSystem === "leave" && executiveLeaveView && (
            <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-semibold shadow-inner">
              <button
                type="button"
                onClick={() => setLeaveSubView("executive")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  leaveSubView === "executive"
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 font-bold shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Executive Hub (SMS)</span>
              </button>
              <button
                type="button"
                onClick={() => setLeaveSubView("classic")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  leaveSubView === "classic"
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 font-bold shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>มุมมองทั่วไป / บุคลากร</span>
              </button>
            </div>
          )}

          {availableSystems.length > 1 && (
            <SystemSelector
              available={availableSystems}
              selected={activeSystem}
              onChange={handleSystemChange}
            />
          )}
        </div>
      </div>

      {/* Render selected view */}
      {activeSystem === "repair" && repairView
        ? repairView
        : activeSystem === "document" && documentView
        ? documentView
        : activeSystem === "facility" && facilityView
        ? facilityView
        : leaveSubView === "executive" && executiveLeaveView
        ? executiveLeaveView
        : leaveView}
    </div>
  );
}
