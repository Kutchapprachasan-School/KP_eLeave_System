"use client";

import React from "react";
import { type SemanticTone, TONE_CLASSES, CARD_CLASSES } from "./tokens";

export interface MatrixShellProps {
  children: React.ReactNode;
  /** Optional title or toolbar above the matrix */
  toolbar?: React.ReactNode;
  className?: string;
}

/**
 * 🧱 MatrixShell
 * Domain-agnostic scrollable shell for timetable and reservation grids.
 * Handles responsiveness, horizontal scrollbar, border styling, and container padding.
 */
export function MatrixShell({ children, toolbar, className = "" }: MatrixShellProps) {
  return (
    <div className={`${CARD_CLASSES} p-4 sm:p-6 overflow-hidden ${className}`}>
      {toolbar && (
        <div className="mb-4 pb-3 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {toolbar}
        </div>
      )}
      <div className="overflow-x-auto custom-scrollbar">
        <div className="min-w-full inline-block align-middle">{children}</div>
      </div>
    </div>
  );
}

export interface MatrixHeaderCellProps {
  label: React.ReactNode;
  sublabel?: React.ReactNode;
  align?: "left" | "center" | "right";
  isSticky?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * 🏷️ MatrixHeaderCell
 * Standardized cell for column headers (times, periods, rooms, teachers, days).
 */
export function MatrixHeaderCell({
  label,
  sublabel,
  align = "center",
  isSticky = false,
  className = "",
  children,
}: MatrixHeaderCellProps) {
  const alignClass =
    align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center";

  return (
    <div
      className={`p-2.5 sm:p-3 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 ${alignClass} ${
        isSticky ? "sticky left-0 z-20 shadow-xs" : ""
      } ${className}`}
    >
      <div className="leading-tight">{label}</div>
      {sublabel && (
        <div className="text-[10px] font-normal text-slate-400 dark:text-slate-500 mt-0.5">
          {sublabel}
        </div>
      )}
      {children}
    </div>
  );
}

export interface MatrixSlotCellProps {
  /** Semantic status tone for coloring */
  tone?: SemanticTone;
  /** Whether the slot is currently booked or occupied */
  isOccupied?: boolean;
  /** Whether the slot is currently active or selected by user */
  isSelected?: boolean;
  /** Whether slot can be clicked */
  isClickable?: boolean;
  /** Slot click handler */
  onClick?: (e: React.MouseEvent) => void;
  /** Tooltip or title attribute */
  title?: string;
  /** Child nodes rendered inside the slot */
  children?: React.ReactNode;
  className?: string;
}

const TONE_SLOT_CLASSES: Record<SemanticTone, string> = {
  info: "bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-200",
  warning: "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200",
  success: "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200",
  danger: "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200",
  neutral: "bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300",
};

/**
 * 🟩 MatrixSlotCell
 * Domain-agnostic slot inside a schedule matrix or timetable.
 * Handles hover states, tone styling, selected rings, and click interactions.
 */
export function MatrixSlotCell({
  tone,
  isOccupied = false,
  isSelected = false,
  isClickable = true,
  onClick,
  title,
  children,
  className = "",
}: MatrixSlotCellProps) {
  const activeTone: SemanticTone = tone || (isOccupied ? "warning" : "neutral");
  const toneStyle = TONE_SLOT_CLASSES[activeTone];

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      title={title}
      className={`min-h-[70px] p-2 rounded-xl border transition-all text-xs flex flex-col justify-between select-none ${toneStyle} ${
        isClickable
          ? "cursor-pointer hover:shadow-sm hover:scale-[1.01] active:scale-[0.99]"
          : "cursor-default"
      } ${
        isSelected
          ? "ring-2 ring-indigo-600 dark:ring-indigo-400 shadow-md border-transparent"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export default MatrixShell;
