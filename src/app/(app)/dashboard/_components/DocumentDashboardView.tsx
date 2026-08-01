"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FileText,
  Send,
  Clock,
  Megaphone,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  PlusCircle,
  Inbox,
  Sparkles,
  TrendingUp,
  FileCheck
} from "lucide-react";

import DocumentStats from "@/app/(app)/document/_components/document-stats";
import DocumentTrendChart from "@/app/(app)/document/_components/document-trend-chart";
import RecentActivityTimeline from "@/app/(app)/document/_components/recent-activity";
import { getDocumentsList, getDocumentTrendStats } from "@/app/actions/document";
import { getIncomingDocsList } from "@/app/actions/incoming";

export default function DocumentDashboardView() {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState<number>(2569);
  const [loading, setLoading] = useState(true);
  const [inboundTotal, setInboundTotal] = useState(0);
  const [outboundTotal, setOutboundTotal] = useState(0);
  const [inboundPending, setInboundPending] = useState(0);
  const [commandTotal, setCommandTotal] = useState(0);
  const [trendData, setTrendData] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Inbound Docs
      const inDocs = await getIncomingDocsList({});
      if (Array.isArray(inDocs)) {
        setInboundTotal(inDocs.length);
        setInboundPending(
          inDocs.filter((d: any) => d.status === "ROUTING" || d.status === "PENDING").length
        );
      }

      // 2. Fetch Outbound / Issued Docs
      const adYear = selectedYear > 2400 ? selectedYear - 543 : selectedYear;
      const outRes = await getDocumentsList({ year: adYear });
      if (outRes.success && outRes.data) {
        const outDocs = outRes.data;
        setOutboundTotal(outDocs.filter((d: any) => d.docType !== "COMMAND").length);
        setCommandTotal(outDocs.filter((d: any) => d.docType === "COMMAND").length);
      }

      // 3. Fetch Trend Chart Data
      const trendRes = await getDocumentTrendStats();
      if (trendRes.success && trendRes.data) {
        setTrendData(trendRes.data);
      }
    } catch (err) {
      console.error("Failed to load document dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCardClick = (key: "inbound" | "outbound" | "pending" | "command") => {
    if (key === "inbound") {
      router.push("/document?view=history&tab=inbound");
    } else if (key === "outbound") {
      router.push("/document?view=history&tab=outbound&docType=OUTGOING");
    } else if (key === "pending") {
      router.push("/document?view=history&tab=inbound&status=PENDING");
    } else if (key === "command") {
      router.push("/document?view=history&tab=outbound&docType=COMMAND");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Subheader & Controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            สถิติและภาพรวมระบบงานสารบรรณ
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            สรุปสถานะหนังสือรับ-ส่ง คำสั่งโรงเรียน และแนวโน้มการออกเลขประจำปี
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl shadow-sm outline-none cursor-pointer focus:border-indigo-500"
          >
            <option value={2569}>ปี พ.ศ. 2569</option>
            <option value={2568}>ปี พ.ศ. 2568</option>
            <option value={2567}>ปี พ.ศ. 2567</option>
          </select>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center justify-center w-8.5 h-8.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 hover:bg-slate-50 transition cursor-pointer shadow-sm disabled:opacity-50"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <Link
            href="/document"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition"
          >
            เข้าสู่ระบบสารบรรณเต็มรูปแบบ
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Summary Stats Cards ── */}
      <DocumentStats
        inboundTotal={inboundTotal}
        outboundTotal={outboundTotal}
        inboundPending={inboundPending}
        commandTotal={commandTotal}
        activeTab="outbound"
        onCardClick={handleCardClick}
      />

      {/* ── Quick Action Shortcuts Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Action 1: ขอออกเลขทะเบียนเอกสาร */}
        <div
          onClick={() => router.push("/document?view=issue")}
          className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500/50 hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-white">ขอออกเลขทะเบียนเอกสาร</h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">บันทึกข้อความ / หนังสือส่ง / คำสั่ง</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Action 2: ทะเบียนหนังสือรับ AMSS++ */}
        <div
          onClick={() => router.push("/document?view=history&tab=inbound")}
          className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500/50 hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-white">หนังสือรับ (AMSS++)</h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">ซิงค์และตรวจรับเอกสารเข้า</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Action 3: ดูประวัติคุมทะเบียนเอกสารทั้งหมด */}
        <div
          onClick={() => router.push("/document?view=history")}
          className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500/50 hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-white">ประวัติคุมทะเบียนเอกสาร</h4>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">ค้นหาทะเบียนและสถิติย้อนหลัง</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>

      {/* ── Main Dashboard Content Split Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Trend Chart */}
        <div className="lg:col-span-7">
          <DocumentTrendChart data={trendData} />
        </div>

        {/* Right: Recent Activity Timeline */}
        <div className="lg:col-span-5">
          <RecentActivityTimeline />
        </div>
      </div>
    </div>
  );
}
