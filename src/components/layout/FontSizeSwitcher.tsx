"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Check, Minus, Plus, SlidersHorizontal, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const STORAGE_KEY_SIZE = "kp_eleave_font_size_v2";
const STORAGE_KEY_MODE = "kp_eleave_font_mode_v2";
const DEFAULT_FONT_SIZE = 14.5; // ค่ามาตรฐาน — 14.5px (ค่าเริ่มต้นสำหรับผู้ใช้ใหม่)
const MIN_FONT_SIZE = 11;
const MAX_FONT_SIZE = 20;
const STEP_FONT_SIZE = 0.5;

interface FontPreset {
  id: string;
  shortBadge: string;
  buttonLabel: string;
  menuTitle: string;
  sizePx: number;
  isDefaultForTeacher?: boolean;
}

const FONT_PRESETS: FontPreset[] = [
  {
    id: "small",
    shortBadge: "ก-",
    buttonLabel: "ก- เล็กสุด",
    menuTitle: "ก- เล็กสุด — 11px",
    sizePx: 11
  },
  {
    id: "compact",
    shortBadge: "ก",
    buttonLabel: "ก ปกติ",
    menuTitle: "ก ปกติ (มาตรฐาน) — 14.5px",
    sizePx: 14.5,
    isDefaultForTeacher: true
  },
  {
    id: "large",
    shortBadge: "ก+",
    buttonLabel: "ก+ ใหญ่",
    menuTitle: "ก+ ใหญ่ (สบายตา) — 16px",
    sizePx: 16
  },
  {
    id: "xlarge",
    shortBadge: "ก++",
    buttonLabel: "ก++ ใหญ่พิเศษ",
    menuTitle: "ก++ ใหญ่พิเศษ — 20px",
    sizePx: 20
  }
];

function clampFontSize(val: number): number {
  if (isNaN(val)) return DEFAULT_FONT_SIZE;
  const rounded = Math.round(val * 2) / 2;
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, rounded));
}

function applyRootFontSize(sizePx: number) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--app-font-size", `${sizePx}px`);
  document.documentElement.style.fontSize = `${sizePx}px`;
}

export function FontSizeSwitcher() {
  const [open, setOpen] = useState(false);
  const [fontSize, setFontSize] = useState<number>(DEFAULT_FONT_SIZE);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load saved font size from localStorage on mount
  useEffect(() => {
    try {
      const savedSizeStr = localStorage.getItem(STORAGE_KEY_SIZE);
      const savedMode = localStorage.getItem(STORAGE_KEY_MODE);
      if (savedSizeStr !== null) {
        const parsed = clampFontSize(parseFloat(savedSizeStr));
        setFontSize(parsed);
        applyRootFontSize(parsed);
        const matchesPreset = FONT_PRESETS.some((p) => p.sizePx === parsed);
        setIsCustomMode(savedMode === "custom" || !matchesPreset);
      } else {
        setFontSize(DEFAULT_FONT_SIZE);
        applyRootFontSize(DEFAULT_FONT_SIZE);
        localStorage.setItem(STORAGE_KEY_SIZE, String(DEFAULT_FONT_SIZE));
        localStorage.setItem(STORAGE_KEY_MODE, "preset");
      }
    } catch {
      applyRootFontSize(DEFAULT_FONT_SIZE);
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateFontSize = (newSize: number, mode: "preset" | "custom") => {
    const clamped = clampFontSize(newSize);
    setFontSize(clamped);
    setIsCustomMode(mode === "custom");
    applyRootFontSize(clamped);
    try {
      localStorage.setItem(STORAGE_KEY_SIZE, String(clamped));
      localStorage.setItem(STORAGE_KEY_MODE, mode);
    } catch {
      // Ignore storage errors in private browsing
    }
  };

  const matchedPreset = !isCustomMode
    ? FONT_PRESETS.find((p) => Math.abs(p.sizePx - fontSize) < 0.01)
    : undefined;

  const headerButtonText = matchedPreset
    ? matchedPreset.buttonLabel
    : `ขนาด ${fontSize}px`;

  return (
    <div className="relative" ref={containerRef}>
      {/* Single Dropdown Trigger Button on Header */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 h-10 px-3 rounded-full bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-all duration-200 font-bold text-xs whitespace-nowrap shadow-2xs"
        title="ปรับขนาดตัวอักษรของระบบ (บันทึกอัตโนมัติ)"
      >
        <span>{headerButtonText}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[350px] max-w-[calc(100vw-1.5rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.16)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.45)] z-[110] overflow-hidden p-2"
          >
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                ปรับขนาดฟอนต์การแสดงผล
              </span>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300">
                ปัจจุบัน: {fontSize}px
              </span>
            </div>

            {/* 1-4: Preset Options */}
            <div className="py-1.5 space-y-1">
              {FONT_PRESETS.map((preset) => {
                const isSelected =
                  !isCustomMode && Math.abs(preset.sizePx - fontSize) < 0.01;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      updateFontSize(preset.sizePx, "preset");
                      setOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                      isSelected
                        ? "bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-500/30"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-7 rounded-lg text-xs font-extrabold shrink-0 ${
                          isSelected
                            ? "bg-purple-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {preset.shortBadge}
                      </span>
                      <span className="text-xs leading-snug truncate">
                        {preset.menuTitle}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}

              {/* 5: Custom Size Option (`ตั้งค่าขนาดเอง...`) with Slider & -/+ Controls */}
              <div
                className={`mt-1 rounded-xl border transition-all p-3 ${
                  isCustomMode
                    ? "bg-purple-50/70 dark:bg-purple-500/10 border-purple-300 dark:border-purple-500/40"
                    : "bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800"
                }`}
              >
                <button
                  type="button"
                  onClick={() => updateFontSize(fontSize, "custom")}
                  className="w-full flex items-center justify-between text-left mb-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${
                        isCustomMode
                          ? "bg-purple-600 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        ตั้งค่าขนาดเอง...
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        ปรับละเอียด 11px – 20px (ทีละ 0.5px)
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-extrabold text-purple-600 dark:text-purple-300">
                    {fontSize}px
                  </span>
                </button>

                {/* - / Slider / + Control Row */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={fontSize <= MIN_FONT_SIZE}
                    onClick={() => updateFontSize(fontSize - STEP_FONT_SIZE, "custom")}
                    className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold shadow-2xs transition"
                    title="ลดขนาด 0.5px"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex-1 flex flex-col gap-1">
                    <input
                      type="range"
                      min={MIN_FONT_SIZE}
                      max={MAX_FONT_SIZE}
                      step={STEP_FONT_SIZE}
                      value={fontSize}
                      onChange={(e) =>
                        updateFontSize(parseFloat(e.target.value), "custom")
                      }
                      className="w-full accent-purple-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
                    />
                    <div className="flex justify-between text-[9px] font-mono text-slate-400 px-0.5">
                      <span>11px</span>
                      <span>14.5px</span>
                      <span>16px</span>
                      <span>20px</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={fontSize >= MAX_FONT_SIZE}
                    onClick={() => updateFontSize(fontSize + STEP_FONT_SIZE, "custom")}
                    className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold shadow-2xs transition"
                    title="เพิ่มขนาด 0.5px"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Reset to Teacher Default (18px) */}
                {fontSize !== DEFAULT_FONT_SIZE && (
                  <button
                    type="button"
                    onClick={() => updateFontSize(DEFAULT_FONT_SIZE, "preset")}
                    className="mt-2 w-full py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700/60 flex items-center justify-center gap-1.5 transition"
                  >
                    <RotateCcw className="w-3 h-3" />
                    คืนค่ามาตรฐาน (ก ปกติ 14.5px)
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
