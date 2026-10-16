"use client";

import React, { useState, useEffect } from "react";

interface BrandLoadingScreenProps {
  schoolName?: string;
  subheader?: string;
  logoUrl?: string;
}

export function BrandLoadingScreen({
  schoolName = "โรงเรียนกุดจับประชาสรรค์",
  subheader = "ระบบบริหารจัดการสถานศึกษา",
  logoUrl = "/images/teacher/school_logo.png",
}: BrandLoadingScreenProps) {
  const [logoReady, setLogoReady] = useState(false);
  const [currentLogo, setCurrentLogo] = useState(logoUrl || "/images/teacher/school_logo.png");
  const [currentName, setCurrentName] = useState(schoolName);
  const [currentSubheader, setCurrentSubheader] = useState(subheader);

  useEffect(() => {
    // Read cached school identity from localStorage on client-side mount
    if (typeof window !== "undefined") {
      const storedName = localStorage.getItem("eleave_schoolName");
      const storedSub = localStorage.getItem("eleave_subheader");
      const storedLogo = localStorage.getItem("eleave_logoUrl");
      if (storedName) setCurrentName(storedName);
      if (storedSub) setCurrentSubheader(storedSub);
      if (storedLogo) setCurrentLogo(storedLogo);
    }
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 p-6 overflow-hidden select-none">
      {/* Decorative ambient background lights */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-400/10 dark:bg-purple-500/5 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-400/10 dark:bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none animate-pulse"
        style={{ animationDelay: "1s" }}
      />

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full text-center space-y-6">
        {/* Logo container with pulse rings */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-orange-500/20 dark:bg-amber-400/10 animate-ping opacity-75" />
          <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-orange-500/10 to-amber-500/10 blur-md animate-pulse" />

          <div className="relative w-24 h-24 rounded-3xl bg-white dark:bg-slate-800 p-2 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-slate-100 dark:border-slate-700/50 flex items-center justify-center overflow-hidden">
            <img
              src={currentLogo}
              alt="School Logo"
              className={`w-full h-full object-contain rounded-2xl transition-opacity duration-200 ${
                logoReady ? "opacity-100" : "opacity-95"
              }`}
              loading="eager"
              decoding="sync"
              onLoad={() => setLogoReady(true)}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/images/teacher/school_logo.png";
                setLogoReady(true);
              }}
            />
          </div>
        </div>

        {/* School Name & Subsystem Brand */}
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-snug px-4 line-clamp-2">
            {currentName}
          </h2>

          <p className="text-xs font-semibold tracking-wider text-amber-600 dark:text-amber-400 uppercase">
            {currentSubheader}
          </p>
        </div>

        {/* High-fidelity Progress Bar */}
        <div className="w-40 pt-2 mx-auto">
          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 rounded-full absolute top-0 bottom-0"
              style={{
                width: "45%",
                animation: "brandLoadingProgress 1.4s ease-in-out infinite",
              }}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes brandLoadingProgress {
          0% {
            left: -40%;
            width: 30%;
          }
          50% {
            width: 55%;
          }
          100% {
            left: 110%;
            width: 30%;
          }
        }
      `}</style>
    </div>
  );
}

export default BrandLoadingScreen;
