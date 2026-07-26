"use client";

import { useState } from "react";
import { Save, Settings2 } from "lucide-react";
import { saveDocumentConfig } from "@/app/actions/document-settings";
import { formatDocNumber } from "@/lib/document-utils";

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

      if (showToast) showToast("บันทึกรูปแบบเลขเอกสารสำเร็จ", "success");
      onRefresh();
    } catch (err: any) {
      if (showToast)
        showToast(err.message || "เกิดข้อผิดพลาดในการบันทึก", "error");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-bold text-slate-800 dark:text-white">
          รูปแบบและลำดับเลขทะเบียน ({configs.length})
        </h4>
        <p className="text-xs text-slate-400">
          กำหนดรูปแบบ คำนำหน้า เลขไทย/อารบิก และเลขลำดับเริ่มต้น
        </p>
      </div>

      <div className="space-y-3">
        {configs.map((cfg) => {
          const state = getConfigState(cfg);
          const previewDocNo = formatDocNumber(
            "[PREFIX] [SEQ]/[YEAR]",
            state.prefix,
            state.nextSeq,
            2569,
            state.paddingDigits,
            state.useThaiNumerals
          );

          return (
            <div
              key={cfg.id}
              className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {cfg.memoSection?.name
                      ? `บันทึกข้อความ: ${cfg.memoSection.name}`
                      : cfg.docType === "COMMAND"
                      ? "คำสั่งโรงเรียน"
                      : cfg.docType === "ANNOUNCEMENT"
                      ? "ประกาศโรงเรียน"
                      : "หนังสือส่งออก"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-medium">
                    ตัวอย่างเลขที่จะออกถัดไป
                  </span>
                  <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                    {previewDocNo}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 mb-1 block">
                    คำนำหน้า (Prefix)
                  </label>
                  <input
                    type="text"
                    value={state.prefix}
                    onChange={(e) =>
                      updateConfigState(cfg.id, "prefix", e.target.value)
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-500 mb-1 block">
                    ลำดับถัดไป (Next Seq)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={state.nextSeq}
                    onChange={(e) =>
                      updateConfigState(
                        cfg.id,
                        "nextSeq",
                        parseInt(e.target.value, 10) || 1
                      )
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-500 mb-1 block">
                    ตัวเลขไทย
                  </label>
                  <select
                    value={state.useThaiNumerals ? "true" : "false"}
                    onChange={(e) =>
                      updateConfigState(
                        cfg.id,
                        "useThaiNumerals",
                        e.target.value === "true"
                      )
                    }
                    className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs outline-none cursor-pointer"
                  >
                    <option value="true">เลขไทย (๑, ๒, ๓)</option>
                    <option value="false">อารบิก (1, 2, 3)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  disabled={savingId === cfg.id}
                  onClick={() => handleSaveConfig(cfg)}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingId === cfg.id ? "กำลังบันทึก..." : "บันทึกรูปแบบนี้"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
