"use client";

import { useState, useEffect } from "react";
import { Activity, ChevronUp, ChevronDown, Zap, AlertTriangle, ShieldCheck, Database, HardDrive } from "lucide-react";
import { getTelemetryStatsAction } from "@/app/actions/telemetry";

export default function FloatingEgressWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await getTelemetryStatsAction();
      setStats(data);
    } catch {
      // Ignore in production or unauthorized
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return null;

  const totalKb = ((stats.totalBytes || 0) / 1024).toFixed(1);
  const totalMb = stats.totalMb || "0.00";
  const recentAlertsCount = stats.alerts?.length || 0;

  return (
    <div className="fixed bottom-4 right-4 z-[99999] font-sans print:hidden">
      {/* Expanded Inspector Panel */}
      {isOpen && (
        <div className="mb-3 w-84 sm:w-96 max-h-[480px] bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white text-xs animate-in fade-in slide-in-from-bottom-3 duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="font-bold tracking-tight text-sm">Egress & Data Inspector</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
              LIVE MONITOR
            </span>
          </div>

          {/* Quick Metrics Bar */}
          <div className="p-3 bg-slate-950/60 grid grid-cols-2 gap-2 border-b border-slate-800/80 text-center">
            <div className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Session Transfer</p>
              <p className="text-base font-extrabold text-emerald-400 font-mono mt-0.5">
                {parseFloat(totalMb) > 1 ? `${totalMb} MB` : `${totalKb} KB`}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Neon 5GB Quota</p>
              <p className="text-base font-extrabold text-indigo-400 font-mono mt-0.5">
                {((parseFloat(totalMb) / (5 * 1024)) * 100).toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar max-h-72">
            {/* Top Data Consumers */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1.5 px-1">
                <span>Top Data Consumers</span>
                <span className="text-[10px] text-slate-500 font-normal">Ranked by Size</span>
              </div>
              <div className="space-y-1">
                {stats.topConsumers?.length === 0 ? (
                  <p className="text-slate-500 text-center py-2 text-[11px]">No activity recorded yet</p>
                ) : (
                  stats.topConsumers?.map((item: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-800/40 border border-slate-700/30 hover:bg-slate-800/70 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-slate-500 text-[10px] w-3.5">{i + 1}.</span>
                        <span className="font-medium text-slate-200 truncate">{item.name}</span>
                        <span className="text-[9px] text-slate-500 font-mono">({item.count}x)</span>
                      </div>
                      <span
                        className={
                          parseFloat(item.totalKb) > 150
                            ? "font-mono font-bold shrink-0 ml-2 text-rose-400"
                            : parseFloat(item.totalKb) > 50
                            ? "font-mono font-bold shrink-0 ml-2 text-amber-400"
                            : "font-mono font-bold shrink-0 ml-2 text-emerald-400"
                        }
                      >
                        {item.totalKb} KB
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Requests Stream */}
            <div>
              <div className="text-[11px] font-bold text-slate-300 mb-1.5 px-1">Recent Activity Stream</div>
              <div className="space-y-1">
                {stats.recentRecords?.slice(0, 6).map((rec: any) => (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[11px]"
                  >
                    <span className="text-slate-300 font-mono truncate max-w-[200px]">{rec.actionName}</span>
                    <div className="flex items-center gap-2 shrink-0 font-mono">
                      <span className="text-[10px] text-slate-400">{rec.durationMs}ms</span>
                      <span
                        className={
                          rec.payloadBytes > 150 * 1024
                            ? "font-bold text-rose-400"
                            : rec.payloadBytes > 50 * 1024
                            ? "font-bold text-amber-400"
                            : "font-bold text-emerald-400"
                        }
                      >
                        {(rec.payloadBytes / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trigger Floating Pill */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white border border-slate-700/80 shadow-lg hover:shadow-xl backdrop-blur-md transition-all duration-200 cursor-pointer group hover:scale-105 active:scale-95"
      >
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
        <span className="font-mono text-xs font-bold text-emerald-400">
          {totalKb} KB
        </span>
        <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">Egress</span>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
        )}
      </button>
    </div>
  );
}
