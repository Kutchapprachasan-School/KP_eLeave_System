"use client";

import React from "react";
import { BookOpen } from "lucide-react";

interface SMSHeroBannerProps {
  title?: string;
  subtitle?: string;
}

export default function SMSHeroBanner({
  title = "แดชบอร์ดภาพรวม",
  subtitle = "ภาพรวมข้อมูลสำคัญของห้องเรียนและการจัดการในระบบ",
}: SMSHeroBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-100/90 via-blue-50/70 to-white dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-900 border border-blue-100 dark:border-slate-800 p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] min-h-[110px] flex items-center justify-between">
      {/* Background illustration on right side matching media_1791947729556_c79c257e.jpg */}
      <div className="absolute right-0 top-0 bottom-0 w-1/2 sm:w-2/5 pointer-events-none overflow-hidden select-none">
        <img
          src="/images/teacher/hero_banner_anime.png"
          alt="School Campus"
          className="w-full h-full object-cover object-left mask-radial opacity-90 dark:opacity-40"
          style={{
            maskImage: "linear-gradient(to right, transparent, black 35%)",
            WebkitMaskImage: "linear-gradient(to right, transparent, black 35%)",
          }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

      {/* Left content matching screenshot */}
      <div className="relative z-10 flex items-center gap-4 sm:gap-5">
        {/* Blue Rounded-2xl Icon Box */}
        <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
          <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
        </div>

        {/* Text information */}
        <div className="space-y-0.5">
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h1>
          <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}
