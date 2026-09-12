"use client";

import React, { useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { CARD_CLASSES } from "./tokens";

export interface UnifiedModalProps {
  /** Modal open/visible state */
  isOpen: boolean;
  /** Callback to close modal */
  onClose: () => void;
  /** Size variant (default: "md") */
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  /** Modal content (typically Header, Body, Footer) */
  children: React.ReactNode;
  /** Whether clicking backdrop triggers onClose (default: true) */
  closeOnBackdrop?: boolean;
  /** Whether pressing Escape key triggers onClose (default: true) */
  closeOnEsc?: boolean;
  /** Additional modal dialog class */
  className?: string;
}

const MODAL_SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
  "2xl": "max-w-4xl",
  full: "max-w-[95vw] sm:max-w-6xl",
};

/**
 * 🪟 UnifiedModal
 * Strictly composable modal primitive across School Operations.
 * Zero business logic inside the primitive.
 */
export function UnifiedModal({
  isOpen,
  onClose,
  size = "md",
  children,
  closeOnBackdrop = true,
  closeOnEsc = true,
  className = "",
}: UnifiedModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEsc && e.key === "Escape") {
        onClose();
      }
    },
    [closeOnEsc, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* Modal Dialog Card */}
      <div
        className={`relative w-full ${MODAL_SIZES[size] || MODAL_SIZES.md} ${CARD_CLASSES} shadow-2xl flex flex-col overflow-hidden max-h-[90vh] z-10 animate-in zoom-in-95 duration-150 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export interface UnifiedModalHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  iconClass?: string;
  onClose?: () => void;
  className?: string;
}

export function UnifiedModalHeader({
  title,
  subtitle,
  icon: Icon,
  iconClass = "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400",
  onClose,
  className = "",
}: UnifiedModalHeaderProps) {
  return (
    <div
      className={`px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-4 ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className={`p-2.5 rounded-2xl shrink-0 ${iconClass}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

export interface UnifiedModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function UnifiedModalBody({ children, className = "" }: UnifiedModalBodyProps) {
  return (
    <div className={`px-5 py-4 sm:px-6 sm:py-5 overflow-y-auto custom-scrollbar flex-1 space-y-4 ${className}`}>
      {children}
    </div>
  );
}

export interface UnifiedModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function UnifiedModalFooter({ children, className = "" }: UnifiedModalFooterProps) {
  return (
    <div
      className={`px-5 py-3 sm:px-6 sm:py-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2.5 ${className}`}
    >
      {children}
    </div>
  );
}

export default UnifiedModal;
