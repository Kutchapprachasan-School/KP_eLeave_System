"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Folder, Settings2, UserCheck, RefreshCw } from "lucide-react";
import {
  getMemoSections,
  getSigneePresets,
  getDocumentConfigs,
} from "@/app/actions/document-settings";
import { SectionsTab } from "@/features/document/ui/components/settings/sections-tab";
import { ConfigsTab } from "@/features/document/ui/components/settings/configs-tab";
import { SigneesTab } from "@/features/document/ui/components/settings/signees-tab";

interface DocumentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  showToast?: (msg: string, type?: "success" | "error") => void;
}

export default function DocumentSettingsModal({
  isOpen,
  onClose,
  onSuccess,
  showToast,
}: DocumentSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"sections" | "configs" | "signees">("sections");
  const [loading, setLoading] = useState(false);

  // Shared data states
  const [sections, setSections] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [signees, setSignees] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [secs, cfgs, signs] = await Promise.all([
        getMemoSections(),
        getDocumentConfigs(),
        getSigneePresets(),
      ]);
      setSections(secs || []);
      setConfigs(cfgs || []);
      setSignees(signs || []);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      if (showToast)
        showToast(err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูลตั้งค่า", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[150] flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-100 dark:border-slate-800 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                ⚙️ ตั้งค่าระบบเอกสารสารบรรณ
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                จัดการหมวดหมู่บันทึกข้อความ รูปแบบลำดับเลข และรายชื่อผู้ลงนาม
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex border border-slate-200/80 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/60 p-1 rounded-xl gap-1 shadow-xs text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab("sections")}
              className={`flex-1 py-2 text-center rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "sections"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              หมวดหมู่เอกสาร
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("configs")}
              className={`flex-1 py-2 text-center rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "configs"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              รูปแบบและลำดับเลข
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("signees")}
              className={`flex-1 py-2 text-center rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "signees"
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              ผู้ลงนามประจำ
            </button>
          </div>

          {/* Tab Content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
            </div>
          ) : activeTab === "sections" ? (
            <SectionsTab
              sections={sections}
              configs={configs}
              onRefresh={loadData}
              showToast={showToast}
            />
          ) : activeTab === "configs" ? (
            <ConfigsTab
              configs={configs}
              onRefresh={loadData}
              showToast={showToast}
            />
          ) : activeTab === "signees" ? (
            <SigneesTab
              signees={signees}
              onRefresh={loadData}
              showToast={showToast}
            />
          ) : null}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
