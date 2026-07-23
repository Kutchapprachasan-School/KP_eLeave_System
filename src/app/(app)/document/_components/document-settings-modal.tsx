"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Plus, Trash2, Folder, Check, Settings2, FileText, UserCheck, Hash, Calendar } from "lucide-react";
import {
  getMemoSections,
  upsertMemoSection,
  deleteMemoSection,
  getSigneePresets,
  upsertSigneePreset,
  deleteSigneePreset,
  getDocumentConfigs,
  saveDocumentConfig,
} from "@/app/actions/document-settings";
import { formatDocNumber } from "@/lib/document-utils";

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
  const [saving, setSaving] = useState(false);

  // Data states
  const [sections, setSections] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [signees, setSignees] = useState<any[]>([]);

  // Editing Section state
  const [editingSection, setEditingSection] = useState<any | null>(null);
  const [secName, setSecName] = useState("");
  const [secCode, setSecCode] = useState("");
  const [secPrefix, setSecPrefix] = useState("");
  const [secStartSeq, setSecStartSeq] = useState<number>(1);
  const [secUseThai, setSecUseThai] = useState(true);
  const [secPadding, setSecPadding] = useState(1);

  // Editing Signee state
  const [signeeName, setSigneeName] = useState("");
  const [signeePosition, setSigneePosition] = useState("");
  const [editingSigneeId, setEditingSigneeId] = useState<string | null>(null);

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
      setSections(secs);
      setConfigs(cfgs);
      setSignees(signs);
    } catch (err: any) {
      if (showToast) showToast(err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูลตั้งค่า", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSectionEdit = (sec?: any) => {
    if (sec) {
      setEditingSection(sec);
      setSecName(sec.name);
      setSecCode(sec.code);
      const cfg = configs.find((c) => c.memoSectionId === sec.id);
      setSecPrefix(cfg?.prefix || sec.code);
      // Next sequence is currentSeq + 1
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
    if (!secName.trim() || !secCode.trim()) {
      if (showToast) showToast("กรุณากรอกชื่อกลุ่มงานและรหัสหมวด", "error");
      return;
    }

    setSaving(true);
    try {
      await upsertMemoSection(
        editingSection?.id || null,
        secName.trim(),
        secCode.trim(),
        true,
        "#6366f1",
        "Folder",
        0,
        secPrefix.trim(),
        secUseThai,
        secPadding,
        "TH_BE",
        secStartSeq // Pass target nextSeq (e.g. 49)
      );
      if (showToast) showToast("บันทึกหมวดบันทึกข้อความและเลขเริ่มต้นสำเร็จ", "success");
      setEditingSection(null);
      await loadData();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      if (showToast) showToast(err.message || "เกิดข้อผิดพลาดในการบันทึก", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบหมวดบันทึกข้อความนี้?")) return;
    try {
      await deleteMemoSection(id);
      if (showToast) showToast("ลบหมวดบันทึกข้อความสำเร็จ", "success");
      await loadData();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      if (showToast) showToast(err.message || "ลบไม่สำเร็จ", "error");
    }
  };

  const handleSaveConfigItem = async (cfg: any, newStartSeq: number, newPrefix: string, newThai: boolean) => {
    try {
      await saveDocumentConfig(
        cfg.id,
        newPrefix.trim(),
        newThai,
        cfg.paddingDigits || 1,
        cfg.yearFormat || "TH_BE",
        newStartSeq
      );
      if (showToast) showToast(`อัปเดตการตั้งค่า ${cfg.docType} สำเร็จ`, "success");
      await loadData();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      if (showToast) showToast(err.message || "เกิดข้อผิดพลาดในการบันทึก", "error");
    }
  };

  const handleSaveSignee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signeeName.trim() || !signeePosition.trim()) return;
    try {
      await upsertSigneePreset(editingSigneeId, signeeName.trim(), signeePosition.trim(), true);
      if (showToast) showToast("บันทึกผู้ลงนามประจำสำเร็จ", "success");
      setSigneeName("");
      setSigneePosition("");
      setEditingSigneeId(null);
      await loadData();
    } catch (err: any) {
      if (showToast) showToast(err.message || "เกิดข้อผิดพลาด", "error");
    }
  };

  const handleDeleteSignee = async (id: string) => {
    try {
      await deleteSigneePreset(id);
      if (showToast) showToast("ลบผู้ลงนามสำเร็จ", "success");
      await loadData();
    } catch (err: any) {
      if (showToast) showToast(err.message || "เกิดข้อผิดพลาด", "error");
    }
  };

  if (!isOpen) return null;

  const currentThaiYear = new Date().getFullYear() + 543;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden my-8"
        >
          {/* Header */}
          <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                <Settings2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">ตั้งค่าระบบขอเลข & หมวดบันทึกข้อความ</h3>
                <p className="text-xs text-slate-400">
                  กำหนดหมวดกลุ่มงาน คำนำหน้า และเลขเริ่มต้นปี พ.ศ. {currentThaiYear} สำหรับออกเลขออนไลน์ต่อเนื่อง
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-6 pt-3 gap-2">
            <button
              onClick={() => setActiveTab("sections")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition border-b-2 cursor-pointer ${
                activeTab === "sections"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-sm"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <Folder className="w-4 h-4" />
              <span>หมวดบันทึกข้อความ & เลขเริ่มต้น</span>
            </button>
            <button
              onClick={() => setActiveTab("configs")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition border-b-2 cursor-pointer ${
                activeTab === "configs"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-sm"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>คำสั่ง / ประกาศ / หนังสือส่ง</span>
            </button>
            <button
              onClick={() => setActiveTab("signees")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition border-b-2 cursor-pointer ${
                activeTab === "signees"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-sm"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>ผู้ลงนามประจำ</span>
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 max-h-[65vh] overflow-y-auto">
            {loading ? (
              <div className="py-12 text-center text-slate-400 text-xs font-medium">กำลังโหลดข้อมูลตั้งค่า...</div>
            ) : (
              <>
                {/* TAB 1: Memo Sections */}
                {activeTab === "sections" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          หมวดกลุ่มงาน & การกำหนดเลขเริ่มต้น
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          ตั้งค่าคำนำหน้าและกำหนดเลขที่เริ่มต้นของปี พ.ศ. {currentThaiYear} สำหรับเริ่มใช้ออนไลน์ต่อเนื่องจากเลขออฟไลน์เดิม
                        </p>
                      </div>
                      <button
                        onClick={() => handleOpenSectionEdit()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>เพิ่มหมวดกลุ่มงาน</span>
                      </button>
                    </div>

                    {/* Section Edit Form */}
                    {editingSection && (
                      <form onSubmit={handleSaveSection} className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-4">
                        <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900 pb-2">
                          <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                            {editingSection.id ? "✏️ แก้ไขหมวดบันทึกข้อความ" : "➕ เพิ่มหมวดบันทึกข้อความใหม่"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingSection(null)}
                            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            ยกเลิก
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                              ชื่อกลุ่มงาน / หมวดบันทึกข้อความ *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="เช่น กลุ่มบริหารงานบุคคล"
                              value={secName}
                              onChange={(e) => setSecName(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                              รหัสกลุ่มงาน (Short Code) *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="เช่น HR หรือ PERS"
                              value={secCode}
                              onChange={(e) => setSecCode(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                              คำนำหน้าเลขหนังสือ (Prefix)
                            </label>
                            <input
                              type="text"
                              placeholder="เช่น ศธ ๐๔๓๔๙.๐๑/"
                              value={secPrefix}
                              onChange={(e) => setSecPrefix(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>

                          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
                            <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1 flex items-center gap-1.5">
                              <Hash className="w-3.5 h-3.5 text-amber-600" />
                              <span>เลขเริ่มต้นที่จะถูกออก (ปี พ.ศ. {currentThaiYear}) *</span>
                            </label>
                            <input
                              type="number"
                              min={1}
                              required
                              value={secStartSeq}
                              onChange={(e) => setSecStartSeq(parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-xs font-bold text-amber-900 dark:text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                            <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-1">
                              💡 หากเคยบันทึกแมนนวลถึงเลข 48 ให้กรอก <strong>49</strong> เพื่อให้เลขออนไลน์ถัดไปออกเป็น <strong>49/{currentThaiYear}</strong>
                            </p>
                          </div>
                        </div>

                        {/* Live Preview Pill */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900">
                          <span className="text-xs text-slate-500 dark:text-slate-400">ตัวอย่างเลขถัดไปที่จะออก:</span>
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {formatDocNumber(
                              "[PREFIX][SEQ]/[YEAR]",
                              secPrefix || secCode || "ศธ ",
                              secStartSeq,
                              currentThaiYear,
                              secPadding,
                              secUseThai
                            )}
                          </span>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setEditingSection(null)}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>{saving ? "กำลังบันทึก..." : "บันทึกข้อมูลหมวด"}</span>
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Section List */}
                    <div className="space-y-3">
                      {sections.map((sec) => {
                        const cfg = configs.find((c) => c.memoSectionId === sec.id);
                        const nextSeq = cfg ? (cfg.currentSeq || 0) + 1 : 1;
                        const sampleDocNo = formatDocNumber(
                          "[PREFIX][SEQ]/[YEAR]",
                          cfg?.prefix || sec.code,
                          nextSeq,
                          currentThaiYear,
                          cfg?.paddingDigits || 1,
                          cfg?.useThaiNumerals ?? true
                        );

                        return (
                          <div
                            key={sec.id}
                            className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 transition bg-white dark:bg-slate-900 shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-xs"
                                style={{ backgroundColor: sec.color || "#6366f1" }}
                              >
                                {sec.code}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">{sec.name}</h5>
                                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-mono">
                                    {sec.code}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  เลขถัดไปที่จะออก: <strong className="text-indigo-600 dark:text-indigo-400">{sampleDocNo}</strong>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenSectionEdit(sec)}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                              >
                                ⚙️ กำหนดเลขเริ่มต้น
                              </button>
                              <button
                                onClick={() => handleDeleteSection(sec.id)}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition cursor-pointer"
                                title="ลบหมวดนี้"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB 2: Other Document Types (Commands, Announcements, Outgoing) */}
                {activeTab === "configs" && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        คำสั่ง / ประกาศ / หนังสือส่งภายนอก
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        กำหนดคำนำหน้าและลำดับเลขเริ่มต้นของหนังสือประเภทอื่นๆ
                      </p>
                    </div>

                    <div className="space-y-3">
                      {configs
                        .filter((c) => !c.memoSectionId)
                        .map((cfg) => {
                          const nextSeq = (cfg.currentSeq || 0) + 1;
                          return (
                            <ConfigCardItem
                              key={cfg.id}
                              config={cfg}
                              currentThaiYear={currentThaiYear}
                              onSave={handleSaveConfigItem}
                            />
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* TAB 3: Signee Presets */}
                {activeTab === "signees" && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        ตั้งค่ารายชื่อผู้ลงนามประจำ
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        เพิ่มผู้ลงนามที่ใช้งานบ่อย เช่น ผู้อำนวยการโรงเรียน เพื่อความรวดเร็วในการออกเลข
                      </p>
                    </div>

                    <form onSubmit={handleSaveSignee} className="flex gap-2 items-center flex-wrap p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <input
                        type="text"
                        required
                        placeholder="ชื่อ-นามสกุล (เช่น นายสมชาย ใจดี)"
                        value={signeeName}
                        onChange={(e) => setSigneeName(e.target.value)}
                        className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        type="text"
                        required
                        placeholder="ตำแหน่ง (เช่น ผู้อำนวยการโรงเรียน)"
                        value={signeePosition}
                        onChange={(e) => setSigneePosition(e.target.value)}
                        className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="submit"
                        className="flex items-center gap-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>เพิ่มผู้ลงนาม</span>
                      </button>
                    </form>

                    <div className="space-y-2">
                      {signees.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                        >
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{s.name}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">({s.position})</span>
                          </div>
                          <button
                            onClick={() => handleDeleteSignee(s.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Inline Subcomponent for Config Cards
function ConfigCardItem({ config, currentThaiYear, onSave }: any) {
  const [prefix, setPrefix] = useState(config.prefix || "");
  const [startSeq, setStartSeq] = useState((config.currentSeq || 0) + 1);
  const [useThai, setUseThai] = useState(config.useThaiNumerals ?? true);

  const docTypeName =
    config.docType === "COMMAND"
      ? "คำสั่งโรงเรียน"
      : config.docType === "ANNOUNCEMENT"
      ? "ประกาศโรงเรียน"
      : config.docType === "OUTGOING"
      ? "หนังสือส่งภายนอก"
      : config.docType;

  return (
    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-900 dark:text-white">{docTypeName}</span>
        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-bold">
          ตัวอย่าง: {formatDocNumber("[PREFIX][SEQ]/[YEAR]", prefix, startSeq, currentThaiYear, 1, useThai)}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">คำนำหน้า</label>
          <input
            type="text"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">เลขเริ่มต้นที่ต้องการออก</label>
          <input
            type="number"
            min={1}
            value={startSeq}
            onChange={(e) => setStartSeq(parseInt(e.target.value) || 1)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-indigo-600 dark:text-indigo-400"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={() => onSave(config, startSeq, prefix, useThai)}
            className="w-full py-1.5 px-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
          >
            บันทึกการตั้งค่า
          </button>
        </div>
      </div>
    </div>
  );
}
