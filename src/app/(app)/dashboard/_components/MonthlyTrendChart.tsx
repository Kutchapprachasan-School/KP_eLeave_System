"use client";

import { useState } from "react";
import { 
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, 
  LineChart, Line, Legend, LabelList 
} from "recharts";
import { useI18n } from "@/lib/i18n";

const COLORS = {
  purple: "#8B5CF6",
  blue: "#38BDF8",
  green: "#34D399",
  orange: "#FBBF24",
  pink: "#FB7185",
  teal: "#14B8A6"
};

const COLOR_PALETTE = [COLORS.pink, COLORS.purple, COLORS.green, COLORS.orange, COLORS.teal];

interface MonthlyTrendChartProps {
  monthlyData: any[];
  leaveConfigs: any[];
}

export default function MonthlyTrendChart({ monthlyData, leaveConfigs }: MonthlyTrendChartProps) {
  const [trendViewMode, setTrendViewMode] = useState<"types" | "total">("types");
  const { t, lang, tLeaveType } = useI18n();

  return (
    <div className="flex flex-col flex-1">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t("monthlyTrend")}</h3>
        
        {/* View Mode Toggle */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto shadow-inner">
          <button
            onClick={() => setTrendViewMode("types")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              trendViewMode === "types"
                ? "bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {lang === "th" ? "แยกตามประเภท" : "By Leave Type"}
          </button>
          <button
            onClick={() => setTrendViewMode("total")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              trendViewMode === "total"
                ? "bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {lang === "th" ? "ยอดรวม" : "Total"}
          </button>
        </div>
      </div>

      <div className="min-h-[250px] h-[250px] w-full flex-1">
        <ResponsiveContainer width="99%" height="100%">
          <LineChart data={monthlyData} margin={{ top: 20, right: 15, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} />
            <Tooltip 
              content={({ active, payload, label }: any) => {
                if (!active || !payload || payload.length === 0) return null;
                const dataPoint = payload[0]?.payload;
                if (!dataPoint) return null;

                // Build list of all leave types with their values
                const activeConfigs = leaveConfigs?.filter((c: any) => c.isActive) || [];
                const typeRows = activeConfigs
                  .map((config: any, idx: number) => ({
                    name: lang === "th" ? config.name : (tLeaveType(config.type, config.name) || config.name),
                    value: dataPoint[config.type] || 0,
                    color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
                    type: config.type
                  }))
                  .filter((row: any) => row.value > 0);

                const total = dataPoint.total || 0;

                return (
                  <div className="bg-slate-900/95 backdrop-blur-lg border border-white/10 rounded-2xl px-4 py-3 shadow-2xl min-w-[180px]">
                    <p className="text-slate-400 text-xs font-bold mb-2 border-b border-slate-700/50 pb-2">{label}</p>
                    {typeRows.length > 0 ? (
                      <div className="space-y-1.5">
                        {typeRows.map((row: any) => (
                          <div key={row.type} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                              <span className="text-slate-300 text-xs">{row.name}</span>
                            </div>
                            <span className="text-white text-xs font-bold">{row.value} {lang === "th" ? "วัน" : "days"}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-xs">{lang === "th" ? "ไม่มีการลา" : "No leave"}</p>
                    )}
                    <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between">
                      <span className="text-slate-400 text-xs font-semibold">{lang === "th" ? "รวม" : "Total"}</span>
                      <span className="text-white text-sm font-bold">{total} {lang === "th" ? "วัน" : "days"}</span>
                    </div>
                  </div>
                );
              }}
            />
            
            {trendViewMode === "types" ? (
              <>
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', fontWeight: '500', paddingBottom: '10px' }}
                />
                {leaveConfigs
                  ?.filter((c: any) => c.isActive)
                  .map((config: any, index: number) => {
                    const hasData = monthlyData?.some((m: any) => (m[config.type] || 0) > 0);
                    const isPrimary = ["SICK", "PERSONAL", "VACATION"].includes(config.type);
                    if (!isPrimary && !hasData) return null;

                    return (
                      <Line
                        key={config.type}
                        type="monotone"
                        dataKey={config.type}
                        name={lang === "th" ? config.name : (tLeaveType(config.type, config.name) || config.name)}
                        stroke={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                        strokeWidth={3}
                        dot={{ r: 3 }}
                        activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                        connectNulls
                        isAnimationActive={true}
                        animationDuration={1200}
                        animationEasing="ease-in-out"
                      >
                        <LabelList 
                          dataKey={config.type} 
                          position="top" 
                          offset={8} 
                          fill={COLOR_PALETTE[index % COLOR_PALETTE.length]} 
                          fontSize={10} 
                          fontWeight="600" 
                          formatter={(val: any) => val > 0 ? val : ""} 
                        />
                      </Line>
                    );
                  })}
              </>
            ) : (
              <Line
                type="monotone"
                dataKey="total"
                name={lang === "th" ? "ยอดรวม" : "Total"}
                stroke={COLORS.blue}
                strokeWidth={4}
                dot={{ r: 4, fill: COLORS.blue, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 7, fill: COLORS.blue, strokeWidth: 2, stroke: '#fff' }}
                isAnimationActive={true}
                animationDuration={1500}
                animationEasing="ease-in-out"
              >
                <LabelList 
                  dataKey="total" 
                  position="top" 
                  offset={10} 
                  fill="#64748b" 
                  className="dark:fill-slate-400" 
                  fontSize={11} 
                  fontWeight="bold" 
                  formatter={(val: any) => val > 0 ? val : ""} 
                />
              </Line>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
