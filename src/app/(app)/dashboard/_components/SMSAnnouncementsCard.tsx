"use client";

import React from "react";
import {
  Megaphone,
  ArrowRight,
  Info,
  Calendar,
  CheckCircle2,
  FileText,
} from "lucide-react";

interface AnnouncementItem {
  id: string;
  title: string;
  date: string;
  iconType: "info" | "calendar" | "check" | "file";
}

interface SMSAnnouncementsCardProps {
  items?: AnnouncementItem[];
  onViewAll?: () => void;
}

const defaultAnnouncements: AnnouncementItem[] = [
  {
    id: "1",
    title: "แจ้งกำหนดส่งแบบประเมินคุณลักษณะอันพึงประสงค์",
    date: "2 ต.ค. 2569",
    iconType: "info",
  },
  {
    id: "2",
    title: "กำหนดสอบกลางภาคเรียนที่ 1/2569",
    date: "30 ก.ย. 2569",
    iconType: "calendar",
  },
  {
    id: "3",
    title: "อัปเดตตารางสอน ภาคเรียนที่ 1/2569",
    date: "28 ก.ย. 2569",
    iconType: "check",
  },
  {
    id: "4",
    title: "คู่มือการใช้งานระบบสำหรับครู",
    date: "25 ก.ย. 2569",
    iconType: "file",
  },
];

export default function SMSAnnouncementsCard({
  items = defaultAnnouncements,
  onViewAll,
}: SMSAnnouncementsCardProps) {
  const renderIcon = (type: AnnouncementItem["iconType"]) => {
    switch (type) {
      case "info":
        return (
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
            <Info className="w-4 h-4" />
          </div>
        );
      case "calendar":
        return (
          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
        );
      case "check":
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case "file":
        return (
          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
      {/* Header matching media_1791947729556_c79c257e.jpg */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-50 dark:border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
            <Megaphone className="w-4 h-4" />
          </div>
          <h2 className="text-[15px] font-bold text-slate-800 dark:text-white">
            ประกาศและกิจกรรมล่าสุด
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

      {/* Announcements List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 py-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 px-1 rounded-xl transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              {renderIcon(item.iconType)}
              <span className="text-[12.5px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                {item.title}
              </span>
            </div>

            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0">
              {item.date}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
