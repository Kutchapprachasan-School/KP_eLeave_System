"use client";

import { useState } from "react";
import { Plus, Trash2, Save, Folder, Check } from "lucide-react";
import {
  upsertMemoSection,
  deleteMemoSection,
} from "@/app/actions/document-settings";
import { ConfirmActionModal } from "@/features/document/ui/modals/confirm-action-modal";

interface SectionsTabProps {
  sections: any[];
  configs: any[];
  onRefresh: () => void;
  showToast?: (msg: string, type?: "success" | "error") => void;
}

export function SectionsTab({
  sections,
  configs,
  onRefresh,
  showToast,
}: SectionsTabProps) {
  const [editingSection, setEditingSection] = useState<any | null>(null);
  const [secName, setSecName] = useState("");
  const [secCode, setSecCode] = useState("");
  const [secPrefix, setSecPrefix] = useState("");
  const [secStartSeq, setSecStartSeq] = useState<number>(1);
  const [secUseThai, setSecUseThai] = useState(true);
  const [secPadding, setSecPadding] = useState(1);
  const [saving, setSaving] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handleOpenSectionEdit = (sec?: any) => {
    if (sec) {
      setEditingSection(sec);
      setSecName(sec.name);
      setSecCode(sec.code);
      const cfg = configs.find((c) => c.memoSectionId === sec.id);
      setSecPrefix(cfg?.prefix || sec.code);
      setSecStartSeq(cfg ? (cfg.currentSeq || 0) + 1 : 1);
      setSecUseThai(cfg?.useThaiNumerals ?? true);
      setSecPadding(cfg?.paddingDigits ?? 1);
    } else {
      setEditingSection({ id: null });
      setSecName("");
      setSecCode("");
      setSecPrefix("ศธ ");
      setSecStartSeq(1);
      setSecUseThai(true);
      setSecPadding(1);
    }
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secName.trim() || !secCode.trim()) return;

    setSaving(true);
    try {
      await upsertMemoSection(
        editingSection?.id || null,
        secName.trim(),
        secCode.trim().toUpperCase(),
        true,
        "#6366f1",
        "Folder",
        0,
        secPrefix.trim(),
        secUseThai,
        secPadding,
        "TH_BE",
        secStartSeq
      );

      if (showToast) showToast("บันทึกหมวดหมู่เอกสารเรียบร้อยแล้ว", "success");
      setEditingSection(null);
      onRefresh();
    } catch (err: any) {
      if (showToast)
        showToast(err.message || "เกิดข้อผิดพลาดในการบันทึก", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSection = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteMemoSection(deleteTargetId);
      if (showToast) showToast("ลบหมวดหมู่เรียบร้อยแล้ว", "success");
      setDeleteTargetId(null);
      onRefresh();
    } catch (err: any) {
      if (showToast) showToast(err.message || "ลบหมวดหมู่ล้มเหลว", "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-white">
            หมวดหมู่บันทึกข้อความ ({sections.length})
          </h4>
          <p className="text-xs text-slate-400">
            จัดการหมวดหมู่บันทึกข้อความแยกตามกลุ่มงาน
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenSectionEdit()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          เพิ่มหมวดหมู่ใหม่
        </button>
      </div>

      {editingSection && (
        <form
          onSubmit={handleSaveSection}
          className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-3"
        >
          <h5 className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
            {editingSection.id ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่ใหม่"}
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                ชื่อหมวดหมู่ *
              </label>
              <input
                type="text"
                required
                value={secName}
                onChange={(e) => setSecName(e.target.value)}
                placeholder="เช่น กลุ่มบริหารงานบุคคล"
                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                รหัสหมวดหมู่ *
              </label>
              <input
                type="text"
                required
                value={secCode}
                onChange={(e) => setSecCode(e.target.value)}
                placeholder="เช่น PERS"
                className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs uppercase font-mono outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer"
            >
              {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
            </button>
            <button
              type="button"
              onClick={() => setEditingSection(null)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      )}

      <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
        {sections.map((sec) => (
          <div
            key={sec.id}
            className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Folder className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {sec.name}
                </p>
                <span className="text-[10px] font-mono text-slate-400">
                  รหัส: {sec.code}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenSectionEdit(sec)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                แก้ไข
              </button>
              <button
                type="button"
                onClick={() => setDeleteTargetId(sec.id)}
                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmActionModal
        isOpen={Boolean(deleteTargetId)}
        title="ลบหมวดหมู่เอกสาร"
        description="คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่นี้? ข้อมูลเอกสารที่มีอยู่อาจได้รับผลกระทบ"
        confirmLabel="ยืนยันการลบ"
        confirmVariant="danger"
        onConfirm={handleDeleteSection}
        onClose={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
