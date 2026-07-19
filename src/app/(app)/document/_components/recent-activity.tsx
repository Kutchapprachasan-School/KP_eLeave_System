"use client";

import { useEffect, useState } from "react";
import { 
  FileCheck, 
  AlertTriangle, 
  PlusCircle, 
  RefreshCcw, 
  CheckCircle2, 
  Clock, 
  Activity 
} from "lucide-react";
import { getDocumentActivities } from "@/app/actions/document";

interface ActivityEvent {
  id: string;
  timestamp: string;
  actorName: string;
  actionType: string;
  description: string;
}

export default function RecentActivityTimeline() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadActivities() {
      try {
        const res = await getDocumentActivities();
        if (res.success && res.data) {
          setEvents(res.data);
        }
      } catch (err) {
        console.error("Failed to load document activities:", err);
      } finally {
        setLoading(false);
      }
    }
    loadActivities();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case "DOC_ISSUE":
        return <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case "DOC_CANCEL":
        return <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      case "INCOMING_CREATE":
        return <PlusCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case "INCOMING_SYNC_AUTO":
      case "INCOMING_SYNC_HTML":
        return <RefreshCcw className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case "INCOMING_RESOLVE":
        return <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case "DOC_ISSUE":
        return "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/30";
      case "DOC_CANCEL":
        return "bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/30";
      case "INCOMING_CREATE":
        return "bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/30";
      case "INCOMING_SYNC_AUTO":
      case "INCOMING_SYNC_HTML":
        return "bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/30";
      case "INCOMING_RESOLVE":
        return "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900/30";
      default:
        return "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800";
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit"
      }) + " น.";
    } catch (e) {
      return "";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-2">
        <div className="h-4 w-1/4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3 items-center animate-pulse">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="p-6 text-center text-slate-400 text-xs font-semibold">
        ไม่พบกิจกรรมล่าสุดในระบบงานสารบรรณ
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-50 dark:border-slate-800 pb-2">
        <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <h3 className="text-xs font-extrabold text-slate-850 dark:text-white uppercase tracking-wider">
          กิจกรรมล่าสุด (Recent Activity Stream)
        </h3>
      </div>

      <div className="relative pl-3 border-l-2 border-slate-100 dark:border-slate-800/60 ml-3.5 space-y-4">
        {events.map((e) => (
          <div key={e.id} className="relative group transition-all">
            {/* Timeline dot */}
            <div className={`absolute -left-[23px] top-0.5 w-8 h-8 rounded-full border flex items-center justify-center shadow-sm z-10 transition-transform group-hover:scale-105 ${getIconBg(e.actionType)}`}>
              {getIcon(e.actionType)}
            </div>

            <div className="pl-6 space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 block">
                {formatTime(e.timestamp)} • {e.actorName}
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold leading-relaxed group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {e.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
