"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Wrench, Clock, AlertTriangle, DollarSign } from "lucide-react";

export type RepairDashStats = {
  totalCostOverall: number;
  sla: {
    totalActive: number;
    warningCount: number;
    overdueCount: number;
    overduePercentage: number;
  };
  categories: {
    category: string;
    count: number;
    totalCost: number;
  }[];
  monthlyTrend: {
    month: string;
    count: number;
    completed: number;
  }[];
  technicians: {
    id: string;
    name: string;
    assignedCount: number;
    completedCount: number;
    avgResolutionHours: number;
  }[];
};

const CATEGORY_MAP: Record<string, string> = {
  ELECTRICAL: "ระบบไฟฟ้า",
  PLUMBING: "ระบบประปา",
  BUILDING: "อาคาร/สถานที่",
  IT: "อุปกรณ์ IT/คอมพิวเตอร์",
  EQUIPMENT: "ครุภัณฑ์/เฟอร์นิเจอร์",
  OTHER: "งานซ่อมทั่วไป/อื่น ๆ",
};

export default function RepairDashboardView({
  stats,
  canViewCost,
}: {
  stats: RepairDashStats;
  canViewCost: boolean;
}) {
  // Pre-process monthly trend data to compute completion percentage for chart display
  const chartData = stats.monthlyTrend.map((t) => ({
    month: t.month,
    completionRate: t.count > 0 ? Math.round((t.completed / t.count) * 100) : 0,
    count: t.count,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="งานทั้งหมด (Active)"
          value={stats.sla.totalActive}
          icon={<Wrench className="w-5 h-5" />}
          color="indigo"
        />
        <KPICard
          label="ใกล้เกิน SLA"
          value={stats.sla.warningCount}
          icon={<Clock className="w-5 h-5" />}
          color="amber"
        />
        <KPICard
          label="เกิน SLA"
          value={stats.sla.overdueCount}
          icon={<AlertTriangle className="w-5 h-5" />}
          color="red"
        />
        {canViewCost && (
          <KPICard
            label="ค่าใช้จ่ายรวม (บาท)"
            value={stats.totalCostOverall.toLocaleString("th-TH", { maximumFractionDigits: 0 })}
            icon={<DollarSign className="w-5 h-5" />}
            color="emerald"
          />
        )}
      </div>

      {/* Charts / Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/50 dark:border-slate-800 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-4">
            อัตราความสำเร็จรายเดือน (%)
          </h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [`${v}%`, "อัตราสำเร็จ"]} />
                <Bar dataKey="completionRate" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Breakdown Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/50 dark:border-slate-800 shadow-sm overflow-x-auto">
          <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-4">
            สถิติตามประเภทงานซ่อม
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <th className="text-left pb-2 font-semibold">ประเภทงาน</th>
                <th className="text-right pb-2 font-semibold">จำนวน</th>
                {canViewCost && <th className="text-right pb-2 font-semibold">ค่าใช้จ่ายรวม (บาท)</th>}
              </tr>
            </thead>
            <tbody>
              {stats.categories.map((c) => (
                <tr key={c.category} className="border-b border-slate-50 dark:border-slate-900 last:border-0">
                  <td className="py-2.5 text-slate-700 dark:text-slate-300">
                    {CATEGORY_MAP[c.category] || c.category}
                  </td>
                  <td className="py-2.5 text-right font-semibold font-mono text-slate-600 dark:text-slate-400">
                    {c.count}
                  </td>
                  {canViewCost && (
                    <td className="py-2.5 text-right font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                      {c.totalCost.toLocaleString("th-TH", { maximumFractionDigits: 0 })}
                    </td>
                  )}
                </tr>
              ))}
              {stats.categories.length === 0 && (
                <tr>
                  <td colSpan={canViewCost ? 3 : 2} className="text-center py-8 text-slate-400">
                    ไม่มีสถิติงานซ่อม
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Technician Leaderboard */}
      {stats.technicians.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/50 dark:border-slate-800 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-4">
            ประสิทธิภาพของช่าง / ผู้รับผิดชอบงาน
          </h3>
          <div className="space-y-3">
            {stats.technicians.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between text-sm py-2 border-b border-slate-50 dark:border-slate-900 last:border-0"
              >
                <span className="font-semibold text-slate-700 dark:text-slate-300">{t.name}</span>
                <div className="flex gap-6 text-xs text-slate-500 dark:text-slate-400">
                  <span>ได้รับมอบหมาย: <strong className="text-slate-700 dark:text-slate-300">{t.assignedCount}</strong></span>
                  <span>สำเร็จแล้ว: <strong className="text-emerald-600 dark:text-emerald-400">{t.completedCount}</strong></span>
                  <span>ความเร็วเฉลี่ย: <strong className="text-orange-500">{t.avgResolutionHours} ชม.</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: "indigo" | "amber" | "red" | "emerald";
}) {
  const styles: Record<string, string> = {
    indigo: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/50",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50",
    red: "text-red-600 bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/50",
    emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50",
  };

  return (
    <div className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border mb-3 ${styles[color]}`}>
        {icon}
      </div>
      <p className="text-2xl font-black text-slate-800 dark:text-white font-mono">{value}</p>
      <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}
