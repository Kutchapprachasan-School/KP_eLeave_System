"use client";

import { useState } from "react";
import { Plus, Trash2, UserCheck } from "lucide-react";
import {
  upsertSigneePreset,
  deleteSigneePreset,
} from "@/app/actions/document-settings";
import { ConfirmActionModal } from "@/features/document/ui/modals/confirm-action-modal";

interface SigneesTabProps {
  signees: any[];
  onRefresh: () => void;
  showToast?: (msg: string, type?: "success" | "error") => void;
}

export function SigneesTab({
  signees,
  onRefresh,
  showToast,
}: SigneesTabProps) {
  const [signeeName, setSigneeName] = useState("");
  const [signeePosition, setSigneePosition] = useState("");
  const [editingSigneeId, setEditingSigneeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handleSaveSignee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signeeName.trim() || !signeePosition.trim()) return;

    setSaving(true);
    try {
      await upsertSigneePreset(
        editingSigneeId,
        signeeName.trim(),
        signeePosition.trim(),
        true
      );

      if (showToast) showToast("บันทึกรายชื่อผู้ลงนามสำเร็จ", "success");
      setSigneeName("");
      setSigneePosition("");
      setEditingSigneeId(null);
      onRefresh();
    } catch (err: any) {
      if (showToast)
        showToast(err.message || "เกิดข้อผิดพลาดในการบันทึก", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSignee = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteSigneePreset(deleteTargetId);
      if (showToast) showToast("ลบผู้ลงนามเรียบร้อยแล้ว", "success");
      setDeleteTargetId(null);
      onRefresh();
    } catch (err: any) {
      if (showToast) showToast(err.message || "ลบผู้ลงนามล้มเหลว", "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-white">
            รายชื่อผู้ลงนามประจำ ({signees.length})
          </h4>
          <p className="text-xs text-slate-400">
            ตั้งค่ารายชื่อและตำแหน่งผู้ลงนามที่ใช้บ่อยในเอกสาร
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSaveSignee}
        className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-3"
      >
        <h5 className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
          {editingSigneeId ? "แก้ไขผู้ลงนาม" : "เพิ่มผู้ลงนามใหม่"}
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
              ชื่อ-นามสกุล *
            </label>
            <input
              type="text"
              required
              value={signeeName}
              onChange={(e) => setSigneeName(e.target.value)}
              placeholder="เช่น นายสมชาย ใจดี"
              className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
              ตำแหน่ง *
            </label>
            <input
              type="text"
              required
              value={signeePosition}
              onChange={(e) => setSigneePosition(e.target.value)}
              placeholder="เช่น ผู้อำนวยการโรงเรียน..."
              className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            {saving ? "กำลังบันทึก..." : editingSigneeId ? "บันทึกการแก้ไข" : "เพิ่มผู้ลงนาม"}
          </button>
          {editingSigneeId && (
            <button
              type="button"
              onClick={() => {
                setEditingSigneeId(null);
                setSigneeName("");
                setSigneePosition("");
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              ยกเลิก
            </button>
          )}
        </div>
      </form>

      <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
        {signees.map((sig) => (
          <div
            key={sig.id}
            className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {sig.name}
                </p>
                <span className="text-[10px] text-slate-400">
                  {sig.position}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingSigneeId(sig.id);
                  setSigneeName(sig.name);
                  setSigneePosition(sig.position);
                }}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                แก้ไข
              </button>
              <button
                type="button"
                onClick={() => setDeleteTargetId(sig.id)}
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
        title="ลบรายชื่อผู้ลงนาม"
        description="คุณแน่ใจหรือไม่ว่าต้องการลบรายชื่อผู้ลงนามนี้ออกจากรายการตัวเลือกประจำ?"
        confirmLabel="ยืนยันการลบ"
        confirmVariant="danger"
        onConfirm={handleDeleteSignee}
        onClose={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
