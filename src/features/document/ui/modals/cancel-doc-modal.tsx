"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

interface CancelDocModalProps {
  isOpen: boolean;
  docId: string | null;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}

export function CancelDocModal({
  isOpen,
  docId,
  onConfirm,
  onClose,
}: CancelDocModalProps) {
  const [cancelReason, setCancelReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !docId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onConfirm(cancelReason.trim());
      setCancelReason("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[150] flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-100 dark:border-slate-800 shadow-2xl p-6 space-y-6"
        >
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              ยกเลิกเลขเอกสารทะเบียนส่ง
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              หมายเลขนี้จะไม่ถูกลดค่าลำดับ แต่สถานะจะแสดงเป็น &quot;ยกเลิก&quot; เพื่อป้องกันการแก้ไขเอกสารนี้อีก
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                เหตุผลในการยกเลิกเลขนี้ *
              </label>
              <textarea
                required
                placeholder="กรอกเหตุผลเพื่อบันทึกใน Log..."
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!cancelReason.trim() || isSubmitting}
                className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "กำลังยกเลิก..." : "ยืนยันการยกเลิกเลข"}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
              >
                ย้อนกลับ
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
