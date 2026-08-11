"use client";

import { useState } from "react";
import { Save, Settings2, Hash, Sparkles, CheckCircle2, RefreshCw } from "lucide-react";
import { saveDocumentConfig } from "@/app/actions/document-settings";
import { formatDocNumber, getDocTypeThaiLabel } from "@/lib/document-utils";

interface ConfigsTabProps {
  configs: any[];
  onRefresh: () => void;
  showToast?: (msg: string, type?: "success" | "error") => void;
}

export function ConfigsTab({
  configs,
  onRefresh,
  showToast,
}: ConfigsTabProps) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [configForms, setConfigForms] = useState<Record<string, any>>({});

  const getConfigState = (cfg: any) => {
    if (configForms[cfg.id]) return configForms[cfg.id];
    return {
      prefix: cfg.prefix || "",
      useThaiNumerals: cfg.useThaiNumerals ?? true,
      paddingDigits: cfg.paddingDigits ?? 1,
      yearFormat: cfg.yearFormat || "TH_BE",
      nextSeq: (cfg.currentSeq || 0) + 1,
    };
  };

  const updateConfigState = (cfgId: string, key: string, val: any) => {
    setConfigForms((prev) => ({
      ...prev,
      [cfgId]: {
        ...(prev[cfgId] || {}),
        [key]: val,
      },
    }));
  };

  const handleSaveConfig = async (cfg: any) => {
    const state = getConfigState(cfg);
    setSavingId(cfg.id);
    try {
      await saveDocumentConfig(
        cfg.id,
        state.prefix,
        state.useThaiNumerals,
        state.paddingDigits,
        state.yearFormat,
        state.nextSeq
      );

      if (showToast) showToast(`บันทึกรูปแบบเลข "${getDocTypeTitle(cfg)}" สำเร็จ`, "success");
      onRefresh();
    } catch (err: any) {
      if (showToast)
        showToast(err.message || "เกิดข้อผิดพลาดในการบันทึก", "error");
    } finally {
      setSavingId(null);
    }
  };

  const getDocTypeTitle = (cfg: any) => {
    if (cfg.memoSection?.name) return `บันทึกข้อความ: ${cfg.memoSection.name}`;
    if (cfg.docType === "COMMAND") return "คำสั่งโรงเรียน";
    if (cfg.docType === "ANNOUNCEMENT") return "ประกาศโรงเรียน";
    if (cfg.docType === "OUTGOING" || cfg.docType.startsWith("OUTGOING")) return "หนังสือส่ง (ปกติ & จดหมายเวียน)";
    return getDocTypeThaiLabel(cfg.docType);
  };

  const getDocTypeBadge = (docType: string) => {
    if (docType === "COMMAND") return { bg: "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800", icon: "📜" };
    if (docType === "ANNOUNCEMENT") return { bg: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800", icon: "📢" };
    if (docType.startsWith("OUTGOING")) return { bg: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800", icon: "📤" };
    return { bg: "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800", icon: "📝" };
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h4 className="text-sm font-bold text-slate-850 dark:text-white flex items-center gap-2">
            <Hash className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            ตั้งค่ารูปแบบและลำดับเลขทะเบียน ({configs.length} หมวด)
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            กำหนดคำนำหน้า (Prefix), รูปแบบตัวเลข (ไทย/อารบิก), จำนวนหลัก และตั้งค่าลำดับเลขที่จะออกถัดไป
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="self-start sm:self-auto px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          รีเฟรชข้อมูล
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {configs.map((cfg) => {
          const state = getConfigState(cfg);
          const badge = getDocTypeBadge(cfg.docType);
          const currentYear = state.yearFormat === "EN_AD" ? new Date().getFullYear() : new Date().getFullYear() + 543;
          
          const previewDocNo = formatDocNumber(
            "[PREFIX] [SEQ]/[YEAR]",
            state.prefix,
            state.nextSeq,
            currentYear,
            state.paddingDigits,
            state.useThaiNumerals,
            cfg.docType,
            state.yearFormat
          );

          return (
            <div
              key={cfg.id}
              className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs hover:shadow-md transition-all duration-200 space-y-4 relative overflow-hidden"
            >
              {/* Card Header & Live Preview */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{badge.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {getDocTypeTitle(cfg)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg}`}>
                        {cfg.docType}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                      ลำดับปัจจุบันใน DB: {cfg.currentSeq || 0}
                    </span>
                  </div>
                </div>

                {/* Live Output Preview Box */}
                <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 dark:from-purple-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 rounded-xl p-3 text-right flex flex-col justify-center shadow-2xs min-w-[220px]">
                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 flex items-center justify-end gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                    ตัวอย่างเลขที่จะออกฉบับถัดไป
                  </span>
                  <span className="font-mono text-base sm:text-lg font-black text-purple-900 dark:text-purple-200">
                    ที่ {previewDocNo}
                  </span>
                </div>
              </div>

              {/* Form Input Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-1">
                {/* 1. Prefix */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                    คำนำหน้า (Prefix) *
                  </label>
                  <input
                    type="text"
                    value={state.prefix}
                    onChange={(e) => updateConfigState(cfg.id, "prefix", e.target.value)}
                    placeholder="เช่น ศทก หรือ ศธ ๐๔..."
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/60 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition"
                  />
                </div>

                {/* 2. Next Seq */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                    ลำดับถัดไป (Next Seq) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={state.nextSeq}
                    onChange={(e) =>
                      updateConfigState(cfg.id, "nextSeq", parseInt(e.target.value, 10) || 1)
                    }
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/60 dark:bg-slate-950 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition"
                  />
                </div>

                {/* 3. Thai Numerals */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                    รูปแบบตัวเลข *
                  </label>
                  <select
                    value={state.useThaiNumerals ? "true" : "false"}
                    onChange={(e) => updateConfigState(cfg.id, "useThaiNumerals", e.target.value === "true")}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/60 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none cursor-pointer"
                  >
                    <option value="true">เลขไทย (๑, ๒, ๓)</option>
                    <option value="false">อารบิก (1, 2, 3)</option>
                  </select>
                </div>

                {/* 4. Padding Digits */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                    จำนวนหลัก (Padding) *
                  </label>
                  <select
                    value={state.paddingDigits}
                    onChange={(e) => updateConfigState(cfg.id, "paddingDigits", parseInt(e.target.value, 10))}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/60 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none cursor-pointer"
                  >
                    <option value={1}>1 หลัก (1, 2, 3)</option>
                    <option value={2}>2 หลัก (01, 02, 03)</option>
                    <option value={3}>3 หลัก (001, 002, 003)</option>
                    <option value={4}>4 หลัก (0001, 0002)</option>
                  </select>
                </div>

                {/* 5. Year Format */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                    รูปแบบปี (Year) *
                  </label>
                  <select
                    value={state.yearFormat}
                    onChange={(e) => updateConfigState(cfg.id, "yearFormat", e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/60 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none cursor-pointer"
                  >
                    <option value="TH_BE">แสดง พ.ศ. (เช่น /{new Date().getFullYear() + 543})</option>
                    <option value="NONE">ไม่ใส่ พ.ศ./ปี (แสดงเฉพาะเลขลำดับ)</option>
                    <option value="EN_AD">แสดง ค.ศ. (เช่น /{new Date().getFullYear()})</option>
                  </select>
                </div>
              </div>

              {/* Action Save Button */}
              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  disabled={savingId === cfg.id}
                  onClick={() => handleSaveConfig(cfg)}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer border border-purple-500/20 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {savingId === cfg.id ? "กำลังบันทึก..." : "บันทึกการตั้งค่าหมวดนี้"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
