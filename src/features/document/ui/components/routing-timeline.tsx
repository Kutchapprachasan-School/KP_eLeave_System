"use client";

import React from "react";
import { CheckCircle2, Clock, FileText, Calendar, UserCheck } from "lucide-react";

interface RoutingStep {
  id: string;
  assigneeName?: string | null;
  status: string;
  standardDirective?: string | null;
  directiveText?: string | null;
  acknowledgedAt?: Date | string | null;
  completedAt?: Date | string | null;
  dueDate?: Date | string | null;
  actionReport?: string | null;
}

interface RoutingTimelineProps {
  routings: RoutingStep[];
  onOpenReportModal?: (routingId: string) => void;
  currentUserId?: string;
}

export function RoutingTimeline({ routings, onOpenReportModal }: RoutingTimelineProps) {
  if (!routings || routings.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-xs font-medium bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
        ยังไม่มีการสั่งการมอบหมายหนังสือรับนี้
      </div>
    );
  }

  const formatThDate = (d: any) => {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  return (
    <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 space-y-6 text-xs">
      {routings.map((r, idx) => {
        const isDone = r.status === "COMPLETED";
        const isAck = r.status === "ACKNOWLEDGED";

        return (
          <div key={r.id || idx} className="relative">
            <div
              className={`absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 ${
                isDone
                  ? "bg-emerald-500 border-white dark:border-slate-900 text-white"
                  : isAck
                  ? "bg-indigo-500 border-white dark:border-slate-900 text-white"
                  : "bg-amber-500 border-white dark:border-slate-900 text-white animate-pulse"
              }`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 text-sm">
                  <UserCheck className="w-4 h-4 text-indigo-500" />
                  {r.assigneeName || "ผู้รับผิดชอบ"}
                </span>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    isDone
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                      : isAck
                      ? "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
                      : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {isDone ? "✅ ดำเนินการแล้ว" : isAck ? "🟦 รับทราบแล้ว" : "⏳ รอดำเนินการ"}
                </span>
              </div>

              {r.standardDirective && (
                <div className="text-slate-700 dark:text-slate-300 font-semibold bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  📌 {r.standardDirective}
                  {r.directiveText && <span className="block text-slate-500 dark:text-slate-400 font-normal mt-1">{r.directiveText}</span>}
                </div>
              )}

              {r.dueDate && (
                <p className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-rose-500" />
                  กำหนดวันเสร็จ: <span className="font-bold text-rose-600 dark:text-rose-400">{formatThDate(r.dueDate)}</span>
                </p>
              )}

              {r.acknowledgedAt && (
                <p className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  รับทราบเมื่อ: {formatThDate(r.acknowledgedAt)}
                </p>
              )}

              {r.actionReport && (
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <p className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-emerald-500" />
                    รายงานผล:
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-wrap">{r.actionReport}</p>
                </div>
              )}

              {onOpenReportModal && !isDone && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => onOpenReportModal(r.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-xs cursor-pointer"
                  >
                    📝 กดรับทราบ / รายงานผล
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
