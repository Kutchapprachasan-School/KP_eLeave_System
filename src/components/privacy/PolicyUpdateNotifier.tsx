"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Shield, Info, X, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  checkUserPolicyAcknowledgmentStatus,
  acknowledgePolicyForCurrentUser,
} from "@/app/actions/privacy_actions";
import { PolicyModal } from "./PolicyModal";

interface PolicyDoc {
  id: string;
  type: string;
  version: string;
  title: string;
  contentMarkdown: string;
  contentHash: string;
  effectiveAt: string | Date;
}

interface AckStatus {
  noticeNeedsAck: boolean;
  termsNeedsAck: boolean;
  currentNotice?: any;
  currentTerms?: any;
  previousNoticeMarkdown?: string;
  previousTermsMarkdown?: string;
  previousNoticeVersion?: string;
  previousTermsVersion?: string;
}

export function PolicyUpdateNotifier() {
  const [status, setStatus] = useState<AckStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      if (typeof window !== "undefined") {
        const isDismissed = sessionStorage.getItem("policy_banner_dismissed") === "true";
        if (isDismissed) {
          setDismissed(true);
          return;
        }
      }
      const res = await checkUserPolicyAcknowledgmentStatus();
      if (res) {
        setStatus(res);
      }
    } catch (err) {
      console.error("Failed to fetch policy acknowledgment status:", err);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("policy_banner_dismissed", "true");
    }
    setDismissed(true);
  };

  const activePolicy: PolicyDoc | null = status?.noticeNeedsAck
    ? status.currentNotice
    : status?.termsNeedsAck
    ? status.currentTerms
    : null;

  const activeType: "NOTICE" | "TERMS" | null = status?.noticeNeedsAck
    ? "NOTICE"
    : status?.termsNeedsAck
    ? "TERMS"
    : null;

  const previousVersionMarkdown =
    activeType === "NOTICE"
      ? status?.previousNoticeMarkdown
      : activeType === "TERMS"
      ? status?.previousTermsMarkdown
      : undefined;

  const previousVersion =
    activeType === "NOTICE"
      ? status?.previousNoticeVersion
      : activeType === "TERMS"
      ? status?.previousTermsVersion
      : undefined;

  const handleAccept = async () => {
    if (!activePolicy || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await acknowledgePolicyForCurrentUser(activePolicy.id);
      if (res.success) {
        setIsModalOpen(false);
        // Refresh status to see if the next document (e.g. terms) needs acknowledgment
        const nextStatus = await checkUserPolicyAcknowledgmentStatus();
        setStatus(nextStatus);
      }
    } catch (err) {
      console.error("Failed to acknowledge policy:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (dismissed || !activePolicy || !activeType) {
    return null;
  }

  const title =
    activeType === "NOTICE"
      ? `แจ้งการปรับปรุงประกาศการคุ้มครองข้อมูลส่วนบุคคล (ฉบับที่ ${activePolicy.version})`
      : `แจ้งการปรับปรุงเงื่อนไขการใช้งานระบบสารสนเทศ (ฉบับที่ ${activePolicy.version})`;

  const description =
    activeType === "NOTICE"
      ? "ระบบได้ปรับปรุงประกาศการคุ้มครองข้อมูลส่วนบุคคลเพื่อให้สอดคล้องกับมาตรฐานความปลอดภัยและ PDPA"
      : "ระบบได้ปรับปรุงเงื่อนไขและข้อตกลงการใช้งานระบบสารสนเทศ";

  return (
    <>
      <AnimatePresence>
        {!dismissed && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed bottom-20 lg:bottom-5 right-4 lg:right-5 z-40 max-w-sm w-[calc(100%-2rem)] sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-purple-200 dark:border-purple-900/50 p-4 overflow-hidden"
            role="region"
            aria-label="Policy Update Notification"
          >
            {/* Header / Dismiss */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    {title}
                  </h4>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full mt-1 border border-purple-200/50 dark:border-purple-800/50">
                    <Info className="w-3 h-3" />
                    ฉบับที่ {activePolicy.version}
                  </span>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="ไว้ภายหลัง"
                aria-label="ไว้ภายหลัง"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed">
              {description}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                ไว้ภายหลัง
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl shadow-md shadow-purple-500/20 active:scale-[0.98] transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                เปิดอ่านและรับทราบ
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Policy Modal */}
      {isModalOpen && activePolicy && (
        <PolicyModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAccept={handleAccept}
          title={activePolicy.title}
          version={activePolicy.version}
          effectiveDate={activePolicy.effectiveAt}
          contentHash={activePolicy.contentHash}
          contentMarkdown={activePolicy.contentMarkdown}
          previousVersionMarkdown={previousVersionMarkdown}
          previousVersion={previousVersion}
          type={activeType}
        />
      )}
    </>
  );
}
