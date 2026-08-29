"use client";

import { useState, useEffect } from "react";
import { 
  getSupabaseUsageStatsAction, 
  saveMonitoringConfigAction 
} from "@/app/actions/monitoring";
import { 
  Activity, Database, HardDrive, ShieldCheck, AlertTriangle, 
  ExternalLink, RefreshCw, Settings, CheckCircle2, TrendingUp,
  Layers, ArrowUpRight, Zap
} from "lucide-react";

export default function SupabaseEgressMonitor() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Form State
  const [planType, setPlanType] = useState<"FREE" | "PRO" | "CUSTOM">("FREE");
  const [customEgressGb, setCustomEgressGb] = useState("5");
  const [tokenInput, setTokenInput] = useState("");
  const [orgSlugInput, setOrgSlugInput] = useState("elhmzcrjulinlolcjkur");

  const fetchUsage = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = await getSupabaseUsageStatsAction();
      setReport(data);
      if (data.planType) setPlanType(data.planType);
    } catch (err) {
      console.error("Failed to fetch Supabase usage:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchUsage();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await saveMonitoringConfigAction({
        supabaseAccessToken: tokenInput || undefined,
        supabaseOrgSlug: orgSlugInput || undefined,
        planType,
        customEgressLimitGb: customEgressGb ? Number(customEgressGb) : undefined,
      });
      alert("บันทึกการตั้งค่า Quota สำเร็จ!");
      setIsConfigOpen(false);
      fetchUsage(true);
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSavingConfig(false);
    }
  };

  if (loading && !report) {
    return (
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-600 mb-2" />
        <p className="text-xs text-slate-500 font-medium">กำลังโหลดข้อมูล Supabase Real-Time Egress & Quota...</p>
      </div>
    );
  }

  const egress = report?.egress;
  const database = report?.database;
  const storage = report?.storage;

  const getStatusColor = (status: string) => {
    if (status === "CRITICAL") return "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
    if (status === "WARNING") return "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
    return "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
  };

  const getBarColor = (percent: number) => {
    if (percent >= 95) return "bg-rose-500";
    if (percent >= 80) return "bg-amber-500";
    return "bg-emerald-500";
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-lg font-bold">Supabase Real-Time Egress & Quota Monitor</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-emerald-300 border border-white/10">
              {report?.isOfficialApi ? "Official Supabase API" : "Live Postgres Telemetry"}
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            รอบบิลปัจจุบัน: เหลือเวลาอีก {report?.billingPeriod?.daysRemaining || 1} วันก่อนเริ่มรอบใหม่
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchUsage(true)}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer backdrop-blur-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            รีเฟรชสด
          </button>

          <button
            type="button"
            onClick={() => setIsConfigOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer backdrop-blur-sm"
          >
            <Settings className="w-3.5 h-3.5 text-purple-300" />
            ตั้งค่า Quota
          </button>

          <a
            href={report?.supabaseDashboardUrl || "https://supabase.com/dashboard/org/elhmzcrjulinlolcjkur/usage#egress"}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            เปิด Dashboard ทางการ
          </a>
        </div>
      </div>

      {/* Main Quota Meters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Egress Bandwidth */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Data Egress (แบนด์วิดท์)</h3>
                <span className="text-[11px] text-slate-400">โควตารอบเดือน ({report?.planType} Plan)</span>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusColor(egress?.status)}`}>
              {egress?.status === "HEALTHY" ? "🟢 ปกติ ปลอดภัย" : egress?.status === "WARNING" ? "🟡 เริ่มสูง" : "🔴 ใกล้เต็ม"}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                {egress?.usedFormatted}
              </span>
              <span className="text-xs font-bold text-slate-400 font-mono">
                / {egress?.limitFormatted}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              เหลือโควตาใช้งานได้อีก <span className="font-bold text-emerald-600 dark:text-emerald-400">{egress?.remainingFormatted}</span> ({egress?.percentUsed}% ใช้ไป)
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${getBarColor(egress?.percentUsed || 0)}`}
              style={{ width: `${Math.min(100, Math.max(2, egress?.percentUsed || 0))}%` }}
            />
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Database Egress: <b>{report?.breakdown?.databaseEgressFormatted}</b></span>
            <span>Storage Egress: <b>{report?.breakdown?.storageEgressFormatted}</b></span>
          </div>
        </div>

        {/* 2. Database Storage */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Database Storage</h3>
                <span className="text-[11px] text-slate-400">ขนาดพื้นที่ฐานข้อมูลจริง</span>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusColor(database?.status)}`}>
              {database?.status === "HEALTHY" ? "🟢 ปลอดภัย" : "⚠️ ตรวจสอบ"}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                {database?.usedFormatted}
              </span>
              <span className="text-xs font-bold text-slate-400 font-mono">
                / {database?.limitFormatted}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              เหลือพื้นที่อีก <span className="font-bold text-indigo-600 dark:text-indigo-400">{database?.remainingFormatted}</span> ({database?.percentUsed}% ใช้ไป)
            </p>
          </div>

          <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${getBarColor(database?.percentUsed || 0)}`}
              style={{ width: `${Math.min(100, Math.max(2, database?.percentUsed || 0))}%` }}
            />
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>ตารางขนาดใหญ่สุด: <b>{report?.topTables?.[0]?.tableName || "User"}</b></span>
            <span>{report?.topTables?.[0]?.totalSizeFormatted}</span>
          </div>
        </div>

        {/* 3. Storage Buckets */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Storage Buckets</h3>
                <span className="text-[11px] text-slate-400">พื้นที่เก็บรูปโปรไฟล์ & ไฟล์แนบ</span>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusColor(storage?.status)}`}>
              🟢 สะอาด 100%
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                {storage?.usedFormatted}
              </span>
              <span className="text-xs font-bold text-slate-400 font-mono">
                / {storage?.limitFormatted}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              เหลือพื้นที่รูปภาพอีก <span className="font-bold text-amber-600 dark:text-amber-400">{storage?.remainingFormatted}</span>
            </p>
          </div>

          <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div 
              className="h-full rounded-full bg-amber-500 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(2, storage?.percentUsed || 0))}%` }}
            />
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Bucket หลัก: <b>data1</b></span>
            <span>บีบอัดเป็น WebP (คนละ ~3.7 KB)</span>
          </div>
        </div>
      </div>

      {/* Top Tables Disk Consumption */}
      {report?.topTables?.length > 0 && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                ตารางฐานข้อมูลที่ใช้พื้นที่มากที่สุด (Postgres Table Size Breakdown)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ขนาดพื้นที่จริงที่ถูกจัดเก็บบน Disk ของ Supabase PostgreSQL
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {report?.topTables?.map((t: any, idx: number) => (
              <div key={idx} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate font-mono">
                  {t.tableName}
                </div>
                <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-1">
                  {t.totalSizeFormatted}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-600" />
                ตั้งค่า Supabase Quota & Access Token
              </h3>
              <button 
                onClick={() => setIsConfigOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Supabase Plan
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setPlanType("FREE"); setCustomEgressGb("5"); }}
                    className={`p-3 rounded-2xl border text-center font-bold cursor-pointer transition ${
                      planType === "FREE" 
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Free Tier (5 GB Egress)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPlanType("PRO"); setCustomEgressGb("250"); }}
                    className={`p-3 rounded-2xl border text-center font-bold cursor-pointer transition ${
                      planType === "PRO" 
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Pro Tier (250 GB Egress)
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Supabase Personal Access Token (ไม่บังคับ — สำหรับดึงค่าตรงจาก API)
                </label>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="sbp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  สร้าง Token ได้ที่: Supabase Dashboard ➔ Account ➔ Access Tokens
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Organization Slug
                </label>
                <input
                  type="text"
                  value={orgSlugInput}
                  onChange={(e) => setOrgSlugInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition shadow-md shadow-purple-500/20 cursor-pointer"
                >
                  {savingConfig ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
