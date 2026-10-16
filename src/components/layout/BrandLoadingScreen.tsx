"use client";

import React, { useState, useEffect } from "react";

interface BrandLoadingScreenProps {
  schoolName?: string;
  subheader?: string;
  logoUrl?: string;
}

export function BrandLoadingScreen({
  schoolName = "โรงเรียนกุดจับประชาสรรค์",
  subheader = "KP School Management System",
  logoUrl = "/images/teacher/school_logo.png",
}: BrandLoadingScreenProps) {
  const [currentLogo, setCurrentLogo] = useState(logoUrl || "/images/teacher/school_logo.png");
  const [currentName, setCurrentName] = useState(schoolName);
  const [currentSubheader, setCurrentSubheader] = useState(subheader);
  const [isLogoLoaded, setIsLogoLoaded] = useState(false);

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
    <div className="fixed inset-0 z-[100] flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 overflow-hidden select-none">
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full text-center space-y-6">
        {/* Clean, grounded school crest presentation */}
        <div className="relative flex items-center justify-center">
          <div className="relative w-24 h-24 rounded-2xl bg-white dark:bg-slate-900 p-2.5 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden">
            <img
              src={currentLogo}
              alt="School Logo"
              className={`w-full h-full object-contain rounded-xl transition-opacity duration-200 ${
                isLogoLoaded ? "opacity-100" : "opacity-0"
              }`}
              loading="eager"
              decoding="sync"
              onLoad={() => setIsLogoLoaded(true)}
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                if (target.src !== "/images/teacher/school_logo.png") {
                  target.src = "/images/teacher/school_logo.png";
                }
                setIsLogoLoaded(true);
              }}
            />
            {!isLogoLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-amber-200 dark:border-amber-900/50 border-t-amber-500 animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* School Name & Subsystem Brand */}
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-snug px-4 line-clamp-2">
            {currentName}
          </h2>

          <p className="text-xs font-semibold tracking-wider text-amber-600 dark:text-amber-400 uppercase">
            {currentSubheader}
          </p>
        </div>

        {/* School Orange Progress Bar */}
        <div className="w-40 pt-2 mx-auto">
          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
            <div className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 rounded-full absolute top-0 bottom-0 animate-brand-progress" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default BrandLoadingScreen;
