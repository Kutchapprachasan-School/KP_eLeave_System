"use client";

import React from "react";
import { Sparkles, Quote } from "lucide-react";

interface SMSHeroBannerProps {
  schoolName?: string;
  quote?: string;
}

export default function SMSHeroBanner({
  schoolName = "โรงเรียนศึกษาวิทยา",
  quote = "การศึกษา คือ รากฐานของอนาคตที่มั่นคง",
}: SMSHeroBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.04)] bg-slate-900 min-h-[170px] sm:min-h-[190px] flex items-center">
      {/* Background School Panorama Image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
        style={{
          backgroundImage: "url('/images/school_building_panorama.jpg')",
          backgroundPosition: "center 45%",
        }}
      />

      {/* Layered Gradient Overlays for High Legibility & Vibrant Aesthetic */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 via-blue-900/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />

      {/* Content Container */}
      <div className="relative z-10 w-full p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4 text-white">
        {/* Left Information */}
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/80 backdrop-blur-md text-[11px] font-bold text-white shadow-xs">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>เริ่มต้น</span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
            ยินดีต้อนรับสู่ระบบบริหารจัดการโรงเรียน
          </h1>

          <p className="text-xs sm:text-sm text-blue-100 font-medium leading-relaxed drop-shadow-xs">
            {schoolName} ระบบครบวงจร เพื่อการบริหารที่ดีกว่า
          </p>
        </div>

        {/* Right Quote Box (Glassmorphism Pill as in mockup) */}
        <div className="self-start md:self-center shrink-0">
          <div className="bg-white/20 dark:bg-slate-900/40 backdrop-blur-md border border-white/30 dark:border-white/10 rounded-2xl px-5 py-3.5 shadow-lg max-w-xs text-right">
            <p className="text-xs sm:text-sm font-semibold italic text-white leading-relaxed">
              &ldquo;{quote}&rdquo;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
