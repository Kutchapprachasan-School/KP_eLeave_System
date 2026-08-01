"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Info, X } from "lucide-react";

export interface ConfirmActionModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "danger" | "warning" | "default";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export function ConfirmActionModal({
  isOpen,
  title,
  description,
  confirmLabel = "ตกลง",
  cancelLabel = "ยกเลิก",
  confirmVariant = "danger",
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmActionModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: "bg-red-600 hover:bg-red-700 text-white",
    warning: "bg-amber-600 hover:bg-amber-700 text-white",
    default: "bg-indigo-600 hover:bg-indigo-700 text-white",
  };

  const iconStyles = {
    danger: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400",
    warning: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
    default: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400",
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[200] flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-100 dark:border-slate-800 shadow-2xl p-6 space-y-5 text-center relative overflow-hidden"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto text-2xl ${iconStyles[confirmVariant]}`}
          >
            {confirmVariant === "danger" || confirmVariant === "warning" ? (
              <AlertTriangle className="w-7 h-7" />
            ) : (
              <Info className="w-7 h-7" />
            )}
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {description}
            </p>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className={`flex-1 h-10 rounded-xl font-bold text-xs transition flex items-center justify-center disabled:opacity-50 cursor-pointer ${variantStyles[confirmVariant]}`}
            >
              {isLoading ? "กำลังดำเนินการ..." : confirmLabel}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className="px-5 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
            >
              {cancelLabel}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
