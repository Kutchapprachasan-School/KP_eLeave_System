"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { checkUserPolicyStatusAction, acknowledgeUserPolicyAction } from "@/app/actions/privacy_actions";
import { PolicyModal } from "./PolicyModal";

interface PolicyUpdateNotifierProps {
  userId: string;
}

export function PolicyUpdateNotifier({ userId }: PolicyUpdateNotifierProps) {
  const [status, setStatus] = useState<{
    hasUnacknowledged: boolean;
    pendingNotice: any;
    pendingTerms: any;
  } | null>(null);

  const [activeModalPolicy, setActiveModalPolicy] = useState<{
    doc: any;
    type: "NOTICE" | "TERMS";
  } | null>(null);

  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!userId) return;
    checkUserPolicyStatusAction(userId)
      .then((res) => {
        if (res.success && res.hasUnacknowledged) {
          setStatus({
            hasUnacknowledged: res.hasUnacknowledged,
            pendingNotice: res.pendingNotice,
            pendingTerms: res.pendingTerms,
          });
        }
      })
      .catch((err) => console.error("Error loading policy status:", err));
  }, [userId]);

  if (!status || !status.hasUnacknowledged || isDismissed) return null;

  const currentPending = status.pendingNotice || status.pendingTerms;
  if (!currentPending) return null;

  const policyType = status.pendingNotice ? "NOTICE" : "TERMS";

  const handleOpenReview = () => {
    setActiveModalPolicy({
      doc: currentPending,
      type: policyType,
    });
  };

  const handleAccept = async () => {
    if (!activeModalPolicy) return;
    try {
      await acknowledgeUserPolicyAction({
        userId,
        policyDocumentId: activeModalPolicy.doc.id,
        source: "APP_UPDATE_BANNER",
      });

      // Check if there is another unacknowledged policy, or close
      if (activeModalPolicy.type === "NOTICE" && status.pendingTerms) {
        setActiveModalPolicy({
          doc: status.pendingTerms,
          type: "TERMS",
        });
        setStatus((prev) => prev ? { ...prev, pendingNotice: null } : null);
      } else {
        setActiveModalPolicy(null);
        setStatus(null);
      }
    } catch (e) {
      console.error("Error acknowledging updated policy:", e);
    }
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 max-w-md bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-2xl border border-purple-200 dark:border-purple-900/50 flex items-start gap-3.5 backdrop-blur-md"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0 pr-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              แจ้งปรับปรุงประกาศนโยบาย
              <span className="text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full">
                v{currentPending.version}
              </span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
              มีการปรับปรุง {currentPending.title} กรุณาเปิดอ่านและรับทราบเพื่อการใช้งานระบบที่สอดคล้องกับ PDPA
            </p>

            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={handleOpenReview}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold hover:opacity-95 transition-opacity flex items-center gap-1 shadow-sm"
              >
                เปิดอ่านและรับทราบ
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsDismissed(true)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ไว้ภายหลัง
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
            title="ปิดการแจ้งเตือนนี้"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      </AnimatePresence>

      {activeModalPolicy && (
        <PolicyModal
          isOpen={!!activeModalPolicy}
          onClose={() => setActiveModalPolicy(null)}
          onAccept={handleAccept}
          title={activeModalPolicy.doc.title}
          version={activeModalPolicy.doc.version}
          effectiveDate={activeModalPolicy.doc.effectiveAt}
          contentHash={activeModalPolicy.doc.contentHash}
          contentMarkdown={activeModalPolicy.doc.contentMarkdown}
          type={activeModalPolicy.type}
        />
      )}
    </>
  );
}
