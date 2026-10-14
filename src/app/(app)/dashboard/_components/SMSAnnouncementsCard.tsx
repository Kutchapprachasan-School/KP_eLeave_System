"use client";

import React, { useState, useEffect } from "react";
import {
  Megaphone,
  ArrowRight,
  Info,
  Calendar,
  CheckCircle2,
  FileText,
  X,
} from "lucide-react";
import {
  schoolCalendarSyncService,
  ANNOUNCEMENTS_UPDATED_EVENT,
  type SchoolAnnouncement,
} from "@/lib/services/schoolCalendarSync";

interface SMSAnnouncementsCardProps {
  onViewAll?: () => void;
}

export default function SMSAnnouncementsCard({ onViewAll }: SMSAnnouncementsCardProps) {
  const [announcements, setAnnouncements] = useState<SchoolAnnouncement[]>([]);
  const [selectedItem, setSelectedItem] = useState<SchoolAnnouncement | null>(null);

  useEffect(() => {
    // โหลดข้อมูลประกาศจริงจาก Single Source of Truth
    setAnnouncements(schoolCalendarSyncService.getAnnouncements());

    const handleUpdate = () => {
      setAnnouncements(schoolCalendarSyncService.getAnnouncements());
    };

    window.addEventListener(ANNOUNCEMENTS_UPDATED_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(ANNOUNCEMENTS_UPDATED_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const renderIcon = (category: SchoolAnnouncement["category"]) => {
    switch (category) {
      case "academic":
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case "general":
        return (
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
            <Info className="w-4 h-4" />
          </div>
        );
      case "student":
        return (
          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
        );
      case "system":
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-50 dark:border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
              <Megaphone className="w-4 h-4" />
            </div>
            <h2 className="text-[15px] font-bold text-slate-800 dark:text-white">
              ข่าวสารและประกาศโรงเรียน
            </h2>
          </div>

          <button
            type="button"
            onClick={onViewAll}
            className="flex items-center gap-1 text-[11.5px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 cursor-pointer transition-colors"
          >
            <span>ดูทั้งหมด</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Real Announcements List from Shared Storage */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {announcements.slice(0, 4).map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="flex items-center justify-between gap-3 py-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 px-1 rounded-xl transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                {renderIcon(item.category)}
                <span className="text-[12.5px] font-semibold text-slate-700 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {item.title}
                </span>
              </div>

              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0">
                {item.date}
              </span>
            </div>
          ))}

          {announcements.length === 0 && (
            <div className="py-6 text-center text-xs text-slate-400">
              ไม่มีประกาศใหม่ในขณะนี้
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {renderIcon(selectedItem.category)}
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {selectedItem.title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedItem.date} • {selectedItem.timestamp}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
              {selectedItem.content || "ไม่มีรายละเอียดเพิ่มเติมสำหรับประกาศนี้"}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
