"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Wallet, RefreshCw, AlertTriangle } from "lucide-react";

interface BudgetErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function BudgetErrorBoundary({ error, reset }: BudgetErrorProps) {
  useEffect(() => {
    console.error("[Budget Page Error]:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6 w-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl text-center"
      >
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center border border-amber-200 dark:border-amber-800">
            <Wallet className="w-8 h-8" />
          </div>
        </div>

        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          ไม่สามารถโหลดข้อมูลระบบบริหารงบประมาณได้
        </h1>

        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
          อาจเกิดจากข้อผิดพลาดชั่วคราวในการเชื่อมต่อฐานข้อมูล หรือการประมวลผลข้อมูลปีงบประมาณ กรุณากดปุ่มลองใหม่อีกครั้ง
        </p>

        {error.message && (
          <div className="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-left max-h-36 overflow-y-auto">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-500 mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>รายละเอียดข้อผิดพลาด:</span>
            </div>
            <p className="text-xs font-mono text-slate-600 dark:text-slate-400 break-all leading-relaxed">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-2 pt-1.5 border-t border-slate-200 dark:border-slate-800">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>ลองใหม่อีกครั้ง</span>
          </button>

          <button
            onClick={() => window.location.reload()}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all cursor-pointer"
          >
            <span>รีเฟรชหน้า</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
