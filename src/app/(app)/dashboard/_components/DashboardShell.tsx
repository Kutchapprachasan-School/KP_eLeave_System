"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import SystemSelector, { type SystemOption } from "./SystemSelector";
import { Loader2, Sliders } from "lucide-react";

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
    if (activeSystem === "leave") return "แดชบอร์ดระบบการลา & บุคลากร";
    return "ภาพรวมสถานศึกษา (SMS Hub)";
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
          {availableSystems.length > 1 && (
            <SystemSelector
              available={availableSystems}
              selected={activeSystem}
              onChange={handleSystemChange}
            />
          )}

          {/* Single Widget Customizer Button for SMS Hub */}
          {activeSystem === "all" && (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("open-dashboard-widget-customizer"));
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition-all cursor-pointer"
              title="เพิ่มหรือปรับแต่งวิดเจ็ต"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>ปรับแต่งวิดเจ็ต</span>
            </button>
          )}
        </div>
      </div>

      {/* Render selected view */}
      {activeSystem === "all"
        ? executiveLeaveView
        : activeSystem === "repair" && repairView
        ? repairView
        : activeSystem === "document" && documentView
        ? documentView
        : activeSystem === "facility" && facilityView
        ? facilityView
        : activeSystem === "leave"
        ? leaveView
        : executiveLeaveView}
    </div>
  );
}
