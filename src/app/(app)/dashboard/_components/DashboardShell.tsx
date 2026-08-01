"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import SystemSelector, { type SystemOption } from "./SystemSelector";
import { Loader2 } from "lucide-react";

type Props = {
  initialSystem: string;
  availableSystems: SystemOption[];
  leaveView: React.ReactNode;
  repairView: React.ReactNode | null;
  documentView?: React.ReactNode | null;
};

export default function DashboardShell({
  initialSystem,
  availableSystems,
  leaveView,
  repairView,
  documentView,
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
    return "แดชบอร์ดหลัก";
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Subsystem Selector Header */}
      {availableSystems.length > 1 && (
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">
              {getTitle()}
            </h1>
            {isPending && (
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            )}
          </div>
          <SystemSelector
            available={availableSystems}
            selected={activeSystem}
            onChange={handleSystemChange}
          />
        </div>
      )}

      {/* Render selected view */}
      {activeSystem === "repair" && repairView
        ? repairView
        : activeSystem === "document" && documentView
        ? documentView
        : leaveView}
    </div>
  );
}
