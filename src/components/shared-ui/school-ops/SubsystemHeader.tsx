"use client";

import React from "react";
import Link from "next/link";
import {
  type SubsystemKey,
  SUBSYSTEM_ACCENTS,
  CARD_CLASSES,
} from "./tokens";

export interface SubsystemHeaderProps {
  /** Page or Subsystem title */
  title: React.ReactNode;
  /** Explanatory subtitle */
  subtitle?: React.ReactNode;
  /** Section or department breadcrumb text (e.g. "ระบบบริหารทรัพยากรสถานศึกษา") */
  categoryTitle?: string;
  /** Optional link for breadcrumb / category */
  categoryHref?: string;
  /** Subsystem identifier for automatic accent icon styling */
  subsystem?: SubsystemKey;
  /** Version badge string (e.g. "v7.3 Teacher-Centric") */
  versionBadge?: string;
  /** Role badge string (e.g. "TEACHER", "DIRECTOR", "ADMIN") */
  roleBadge?: string;
  /** Icon component to render in the accent box */
  icon?: React.ComponentType<{ className?: string }>;
  /** Custom override for the icon badge background and shadow */
  customAccentBadgeClass?: string;
  /** Primary action buttons or controls on the top-right */
  actions?: React.ReactNode;
  /** Additional controls or subnav placed underneath header */
  children?: React.ReactNode;
  /** Additional custom Tailwind CSS classes */
  className?: string;
}

/**
 * 🏛️ SubsystemHeader
 * Standard executive page header across all 4 school operations subsystems.
 * Unifies layout, breadcrumb meta tags, accent icon boxes, and action areas.
 */
export function SubsystemHeader({
  title,
  subtitle,
  categoryTitle,
  categoryHref,
  subsystem,
  versionBadge,
  roleBadge,
  icon: Icon,
  customAccentBadgeClass,
  actions,
  children,
  className = "",
}: SubsystemHeaderProps) {
  const accentConfig = subsystem ? SUBSYSTEM_ACCENTS[subsystem] : null;
  const iconBadgeClass =
    customAccentBadgeClass ||
    accentConfig?.iconBadge ||
    "bg-indigo-600 text-white shadow-indigo-600/20";

  return (
    <header className={`${CARD_CLASSES} p-5 md:p-6 mb-6 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Left: Metadata Breadcrumbs & Title */}
        <div className="space-y-1">
          {/* Breadcrumb & Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {categoryTitle && (
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {categoryHref ? (
                  <Link href={categoryHref} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                    {categoryTitle}
                  </Link>
                ) : (
                  <span>{categoryTitle}</span>
                )}
                <span>/</span>
              </div>
            )}

            {versionBadge && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                {versionBadge}
              </span>
            )}

            {roleBadge && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono font-bold border border-indigo-200 dark:border-indigo-800">
                {roleBadge}
              </span>
            )}
          </div>

          {/* Title with Icon Box */}
          <div className="flex items-center gap-3">
            {Icon && (
              <div className={`shrink-0 p-2.5 rounded-2xl shadow-md ${iconBadgeClass}`}>
                <Icon className="w-6 h-6" />
              </div>
            )}
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Action Area */}
        {actions && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-auto">
            {actions}
          </div>
        )}
      </div>

      {/* Optional Children (Subnav, Filters, or Search Bar) */}
      {children && <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">{children}</div>}
    </header>
  );
}

export default SubsystemHeader;
