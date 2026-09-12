"use client";

import React from "react";
import {
  type SemanticTone,
  resolveStatusTone,
  resolveStatusLabel,
  TONE_CLASSES,
  TONE_DOT_CLASSES,
} from "./tokens";

export interface StatusPillBadgeProps {
  /** The raw status string from backend (e.g. "APPROVED", "PENDING", "COMPLETED") */
  status?: string | null;
  /** Explicit semantic tone override if not deriving from status */
  tone?: SemanticTone;
  /** Custom label node (defaults to Thai localized name via resolveStatusLabel) */
  label?: React.ReactNode;
  /** Optional icon component displayed on the left of label */
  icon?: React.ComponentType<{ className?: string }>;
  /** Whether to show colored dot indicator (default: true) */
  showDot?: boolean;
  /** Size variant (default: "md") */
  size?: "sm" | "md" | "lg";
  /** Additional custom Tailwind CSS classes */
  className?: string;
  /** Optional title for tooltip */
  title?: string;
}

const SIZE_CLASSES = {
  sm: "px-2 py-0.5 text-[10px] gap-1",
  md: "px-2.5 py-1 text-xs gap-1.5",
  lg: "px-3.5 py-1.5 text-xs gap-2 font-bold",
};

const DOT_SIZES = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
  lg: "w-2 h-2",
};

const ICON_SIZES = {
  sm: "w-3 h-3",
  md: "w-3.5 h-3.5",
  lg: "w-4 h-4",
};

/**
 * 🏷️ StatusPillBadge
 * Unified, accessible status pill badge for School Operations modules.
 * Standardizes semantic coloring (info, warning, success, danger, neutral).
 */
export function StatusPillBadge({
  status,
  tone,
  label,
  icon: Icon,
  showDot = true,
  size = "md",
  className = "",
  title,
}: StatusPillBadgeProps) {
  const activeTone: SemanticTone = tone || resolveStatusTone(status);
  const displayLabel = label !== undefined ? label : resolveStatusLabel(status);
  const toneClass = TONE_CLASSES[activeTone] || TONE_CLASSES.neutral;
  const dotClass = TONE_DOT_CLASSES[activeTone] || TONE_DOT_CLASSES.neutral;
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const dotSize = DOT_SIZES[size] || DOT_SIZES.md;
  const iconSize = ICON_SIZES[size] || ICON_SIZES.md;

  return (
    <span
      title={title || (typeof displayLabel === "string" ? displayLabel : undefined)}
      className={`inline-flex items-center rounded-full border font-semibold tracking-wide select-none transition-colors ${toneClass} ${sizeClass} ${className}`}
    >
      {Icon && <Icon className={`shrink-0 ${iconSize}`} />}
      {showDot && !Icon && (
        <span
          className={`shrink-0 rounded-full ${dotClass} ${dotSize} ${
            activeTone === "warning" || activeTone === "info" ? "animate-pulse" : ""
          }`}
          aria-hidden="true"
        />
      )}
      <span className="truncate">{displayLabel}</span>
    </span>
  );
}

export default StatusPillBadge;
