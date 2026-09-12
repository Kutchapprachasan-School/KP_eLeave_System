"use client";

import React from "react";
import {
  type SemanticTone,
  type SubsystemKey,
  SUBSYSTEM_ACCENTS,
  CARD_CLASSES,
} from "./tokens";

export interface ExecutiveStatCardProps {
  /** Metric title / label */
  title: string;
  /** Primary metric value (formatted string, number, or JSX) */
  value: React.ReactNode;
  /** Unit indicator (e.g. "บาท", "คาบ", "ฉบับ", "รายการ") */
  unit?: string;
  /** Micro-description or context placed below value */
  subtitle?: React.ReactNode;
  /** Lucide icon component (NO EMOJIS allowed) */
  icon?: React.ComponentType<{ className?: string }>;
  /** Semantic tone for icon tint and accent coloring */
  tone?: SemanticTone;
  /** Subsystem key if styling with subsystem accent */
  subsystem?: SubsystemKey;
  /** Optional trend indicator */
  trend?: {
    value: string | number;
    isPositive?: boolean;
    label?: string;
  };
  /** Optional interactive click handler */
  onClick?: () => void;
  /** Additional custom Tailwind CSS classes */
  className?: string;
}

const TONE_ICON_CONTAINERS: Record<SemanticTone, string> = {
  info: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
  warning: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
  success: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
  danger: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400",
  neutral: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

const TONE_VALUE_COLORS: Record<SemanticTone, string> = {
  info: "text-blue-600 dark:text-blue-400",
  warning: "text-amber-600 dark:text-amber-400",
  success: "text-emerald-600 dark:text-emerald-400",
  danger: "text-rose-600 dark:text-rose-400",
  neutral: "text-slate-900 dark:text-white",
};

/**
 * 📊 ExecutiveStatCard
 * High-density executive KPI stat card.
 * Replaces ad-hoc emoji counters with enterprise-grade typography and Lucide iconography.
 */
export function ExecutiveStatCard({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  tone = "neutral",
  subsystem,
  trend,
  onClick,
  className = "",
}: ExecutiveStatCardProps) {
  const isClickable = Boolean(onClick);

  // Icon container color
  let iconContainerClass = TONE_ICON_CONTAINERS[tone] || TONE_ICON_CONTAINERS.neutral;
  if (subsystem && SUBSYSTEM_ACCENTS[subsystem]) {
    iconContainerClass = `${SUBSYSTEM_ACCENTS[subsystem].bgSoft} ${SUBSYSTEM_ACCENTS[subsystem].text}`;
  }

  const valueColorClass = TONE_VALUE_COLORS[tone] || TONE_VALUE_COLORS.neutral;

  return (
    <div
      onClick={onClick}
      className={`${CARD_CLASSES} p-4 md:p-5 flex flex-col justify-between transition-all ${
        isClickable ? "cursor-pointer hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.98]" : ""
      } ${className}`}
    >
      <div>
        {/* Top: Title & Icon */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
            {title}
          </span>
          {Icon && (
            <div className={`shrink-0 p-2 rounded-xl transition-colors ${iconContainerClass}`}>
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Center: Big Value */}
        <div className="flex items-baseline gap-1.5 my-1">
          <div className={`text-xl md:text-2xl font-black tracking-tight ${valueColorClass}`}>
            {value}
          </div>
          {unit && (
            <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
              {unit}
            </span>
          )}
        </div>
      </div>

      {/* Bottom: Subtitle or Trend */}
      {(subtitle || trend) && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] mt-2">
          {subtitle && (
            <span className="text-slate-400 dark:text-slate-500 font-medium truncate">
              {subtitle}
            </span>
          )}
          {trend && (
            <span
              className={`font-bold shrink-0 ${
                trend.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {trend.isPositive ? "+" : ""}{trend.value} {trend.label || ""}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default ExecutiveStatCard;
