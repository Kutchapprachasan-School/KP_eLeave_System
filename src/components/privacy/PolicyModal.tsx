"use client";

import React, { useState, useMemo } from "react";
import { X, CheckCircle, Info, FileText, GitCompare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { computeLineDiff, type DiffLine } from "../../lib/privacy/diff-utils.ts";
export { computeLineDiff, type DiffLine };

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  title: string;
  version: string;
  effectiveDate: string | Date;
  contentHash: string;
  contentMarkdown: string;
  type: "NOTICE" | "TERMS";
  previousVersionMarkdown?: string;
  previousVersion?: string;
}

export function PolicyModal({
  isOpen,
  onClose,
  onAccept,
  title,
  version,
  effectiveDate,
  contentHash,
  contentMarkdown,
  type,
  previousVersionMarkdown,
  previousVersion,
}: PolicyModalProps) {
  const [viewMode, setViewMode] = useState<"current" | "diff">("current");

  const diffLines = useMemo(() => {
    if (!previousVersionMarkdown) return [];
    return computeLineDiff(previousVersionMarkdown, contentMarkdown);
  }, [previousVersionMarkdown, contentMarkdown]);

  if (!isOpen) return null;

  const formattedDate = new Date(effectiveDate).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const buttonText = type === "NOTICE" ? "รับทราบและปิด" : "ยอมรับและปิด";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        aria-modal="true"
        role="dialog"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800"
        >
          {/* Header */}
          <div className="flex flex-col px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {title}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2.5 py-0.5 rounded-full font-medium">
                    <Info className="w-3 h-3" />
                    เวอร์ชัน {version}
                  </span>
                  <span>มีผลบังคับใช้: {formattedDate}</span>
                  <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded" title="Canonical Content Hash">
                    #{contentHash.substring(0, 8)}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Diff Mode Toggle Toolbar */}
            {previousVersionMarkdown && (
              <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                <div className="inline-flex items-center bg-slate-200/90 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setViewMode("current")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      viewMode === "current"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    เนื้อหาปัจจุบัน
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("diff")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      viewMode === "diff"
                        ? "bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <GitCompare className="w-3.5 h-3.5" />
                    เปรียบเทียบการเปลี่ยนแปลง (Diff)
                  </button>
                </div>

                {viewMode === "diff" && (
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      ข้อความเพิ่มใหม่
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                      ข้อความที่ตัดออก
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-900">
            {viewMode === "current" ? (
              <div className="prose prose-slate dark:prose-invert max-w-none text-sm whitespace-pre-wrap">
                {contentMarkdown}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span>
                    เปรียบเทียบกับฉบับเดิม: <strong className="text-slate-700 dark:text-slate-200">{previousVersion ? `ฉบับที่ ${previousVersion}` : "ฉบับก่อนหน้า"}</strong>
                  </span>
                  <span>
                    ฉบับปัจจุบัน: <strong className="text-slate-700 dark:text-slate-200">ฉบับที่ {version}</strong>
                  </span>
                </div>
                <div className="font-mono text-xs border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50">
                  {diffLines.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 dark:text-slate-400">
                      ไม่พบข้อความที่เปลี่ยนแปลงระหว่างสองฉบับนี้
                    </div>
                  ) : (
                    diffLines.map((line, idx) => {
                      if (line.type === "added") {
                        return (
                          <div
                            key={idx}
                            className="flex items-start bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 px-3 py-1 border-l-4 border-emerald-500"
                          >
                            <span className="select-none font-bold text-emerald-600 dark:text-emerald-400 w-5 shrink-0 text-center">+</span>
                            <span className="whitespace-pre-wrap break-all flex-1">{line.text || " "}</span>
                          </div>
                        );
                      }
                      if (line.type === "removed") {
                        return (
                          <div
                            key={idx}
                            className="flex items-start bg-rose-50/80 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 px-3 py-1 border-l-4 border-rose-500 opacity-80"
                          >
                            <span className="select-none font-bold text-rose-600 dark:text-rose-400 w-5 shrink-0 text-center">-</span>
                            <span className="whitespace-pre-wrap break-all flex-1 line-through">{line.text || " "}</span>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={idx}
                          className="flex items-start text-slate-700 dark:text-slate-300 px-3 py-0.5 hover:bg-slate-100/50 dark:hover:bg-slate-800/30"
                        >
                          <span className="select-none text-slate-400 dark:text-slate-600 w-5 shrink-0 text-center">&nbsp;</span>
                          <span className="whitespace-pre-wrap break-all flex-1">{line.text || " "}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              ปิด
            </button>
            <button
              onClick={() => {
                onAccept();
                onClose();
              }}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl hover:opacity-95 shadow-md shadow-purple-500/20 transition-all cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              {buttonText}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
