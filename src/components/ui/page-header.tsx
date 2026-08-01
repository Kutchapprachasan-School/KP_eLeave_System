"use client";

import React from "react";
import { LucideIcon, ArrowLeft } from "lucide-react";
import Link from "next/link";

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  icon?: LucideIcon;
  gradient?: string;
  backUrl?: string;
  onBack?: () => void;
  action?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  badge,
  backUrl,
  onBack,
  action,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        {badge && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 mb-1.5">
            {badge}
          </span>
        )}
        <div className="flex items-center gap-2.5">
          {backUrl && (
            <Link
              href={backUrl}
              className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition shrink-0"
              title="ย้อนกลับ"
            >
              <ArrowLeft className="w-4 h-4 text-slate-700 dark:text-slate-200" />
            </Link>
          )}
          {onBack && (
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition shrink-0 cursor-pointer"
              title="ย้อนกลับ"
            >
              <ArrowLeft className="w-4 h-4 text-slate-700 dark:text-slate-200" />
            </button>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h1>
        </div>
        {description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {description}
          </p>
        )}
      </div>

      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}

