"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  FolderOpen,
  Hash,
  UserCheck,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Eye,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Check,
} from "lucide-react";
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

// ── Animation variants ──────────────────────────────────────────────
const containerVariants: any = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants: any = {
  hidden: { y: 16, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

// ── Types ────────────────────────────────────────────────────────────
type MemoSection = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  color?: string;
  icon?: string;
  sortOrder?: number;
};
type SigneePreset = {
  id: string;
  name: string;
  position: string;
  isCommon: boolean;
};
type DocConfig = {
  id: string;
  docType: string;
  memoSectionId: string | null;
  prefix: string;
  useThaiNumerals: boolean;
  paddingDigits: number;
  yearFormat: string;
  currentSeq: number;
  memoSection: MemoSection | null;
};

type Tab = "sections" | "patterns" | "signees";

// ── Tabs definition ──────────────────────────────────────────────────
const TABS: { key: Tab; label: string; icon: typeof FolderOpen }[] = [
  { key: "sections", label: "งานย่อยบันทึกข้อความ", icon: FolderOpen },
  { key: "patterns", label: "ตั้งค่ารูปแบบเลข", icon: Hash },
  { key: "signees", label: "ผู้ลงนามใช้บ่อย", icon: UserCheck },
];

// ── Pattern preview helper (client-side mirror of server formatDocNumber) ─
function renderPatternPreview(
  prefix: string,
  padding: number,
  useThai: boolean,
  yearFormat: string
) {
  const dummySeq = 124;
  const dummyYear = yearFormat === "TH_BE" ? 2569 : 2026;
  return formatDocNumber(
    "[PREFIX] [SEQ]/[YEAR]",
    prefix,
    dummySeq,
    dummyYear,
    padding,
    useThai
  );
}

// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════
export default function DocumentSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("sections");
  const [loading, setLoading] = useState(true);

  // Data
  const [sections, setSections] = useState<MemoSection[]>([]);
  const [configs, setConfigs] = useState<DocConfig[]>([]);
  const [signees, setSignees] = useState<SigneePreset[]>([]);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const showToast = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Load all data ────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c, p] = await Promise.all([
        getMemoSections(),
        getDocumentConfigs(),
        getSigneePresets(),
      ]);
      setSections(s as MemoSection[]);
      setConfigs(c as DocConfig[]);
      setSignees(p as SigneePreset[]);
    } catch (err: any) {
      showToast(err.message || "โหลดข้อมูลไม่สำเร็จ", "err");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Loading state ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-purple-200 border-t-purple-500 rounded-full"
        />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-purple-500" />
          ตั้งค่าระบบเอกสาร
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          จัดการงานย่อยบันทึกข้อความ รูปแบบเลขเอกสาร และรายชื่อผู้ลงนาม
        </p>
      </motion.div>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex gap-2 flex-wrap">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                active
                  ? "text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {active && (
                <motion.div
                  layoutId="activeSettingsTab"
                  className="absolute bottom-0 left-3 right-3 h-0.5 bg-purple-500 rounded-full"
                />
              )}
            </button>
          );
        })}
      </motion.div>

      {/* ── Tab Content ─────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTab === "sections" && (
          <MemoSectionsTab
            key="sections"
            sections={sections}
            onRefresh={loadAll}
            showToast={showToast}
          />
        )}
        {activeTab === "patterns" && (
          <PatternBuilderTab
            key="patterns"
            configs={configs}
            onRefresh={loadAll}
            showToast={showToast}
          />
        )}
        {activeTab === "signees" && (
          <SigneesTab
            key="signees"
            signees={signees}
            onRefresh={loadAll}
            showToast={showToast}
          />
        )}
      </AnimatePresence>

      {/* ── Toast ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium ${
              toast.type === "ok"
                ? "bg-emerald-500 text-white"
                : "bg-red-500 text-white"
            }`}
          >
            {toast.type === "ok" ? (
              <Check className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// TAB 1: MEMO SECTIONS
// ══════════════════════════════════════════════════════════════════════
function MemoSectionsTab({
  sections,
  onRefresh,
  showToast,
}: {
  sections: MemoSection[];
  onRefresh: () => Promise<void>;
  showToast: (m: string, t?: "ok" | "err") => void;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ 
    name: "", 
    code: "", 
    isActive: true, 
    color: "#6366f1", 
    icon: "Folder", 
    sortOrder: 0 
  });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const resetForm = () => {
    setForm({ 
      name: "", 
      code: "", 
      isActive: true, 
      color: "#6366f1", 
      icon: "Folder", 
      sortOrder: 0 
    });
    setEditId(null);
    setShowForm(false);
  };

  const handleEdit = (s: MemoSection) => {
    setEditId(s.id);
    setForm({ 
      name: s.name, 
      code: s.code, 
      isActive: s.isActive,
      color: s.color || "#6366f1",
      icon: s.icon || "Folder",
      sortOrder: s.sortOrder || 0
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      showToast("กรุณากรอกชื่อและรหัส", "err");
      return;
    }
    setSaving(true);
    try {
      await upsertMemoSection(
        editId, 
        form.name.trim(), 
        form.code.trim(), 
        form.isActive,
        form.color,
        form.icon,
        Number(form.sortOrder)
      );
      showToast(editId ? "แก้ไขสำเร็จ" : "เพิ่มสำเร็จ");
      resetForm();
      await onRefresh();
    } catch (err: any) {
      showToast(err.message || "เกิดข้อผิดพลาด", "err");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบงานย่อยนี้หรือไม่? (DocumentConfig ที่เชื่อมอยู่จะถูกลบด้วย)")) return;
    try {
      await deleteMemoSection(id);
      showToast("ลบสำเร็จ");
      await onRefresh();
    } catch (err: any) {
      showToast(err.message || "ลบไม่สำเร็จ", "err");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {/* Add Button */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          เพิ่มงานย่อย
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editId ? "แก้ไขงานย่อย" : "เพิ่มงานย่อยใหม่"}
              </h3>              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                    ชื่องานย่อย
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="เช่น ฝ่ายวิชาการ"
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                    รหัส (Code)
                  </label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) =>
                      setForm({ ...form, code: e.target.value.toUpperCase() })
                    }
                    placeholder="เช่น ACAD"
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-mono uppercase focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                    ลำดับความสำคัญ (Sort Order)
                  </label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) =>
                      setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })
                    }
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all"
                  />
                </div>
              </div>

              {/* Color & Icon Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 block">
                    สีประจำหมวดเอกสาร
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "#6366f1", // Indigo
                      "#3b82f6", // Blue
                      "#06b6d4", // Cyan
                      "#10b981", // Emerald
                      "#f59e0b", // Amber
                      "#ef4444", // Red
                      "#ec4899", // Pink
                      "#8b5cf6", // Violet
                    ].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm({ ...form, color: c })}
                        style={{ backgroundColor: c }}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          form.color === c ? "border-slate-900 dark:border-white scale-110 shadow-md" : "border-transparent hover:scale-105"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 block">
                    ไอคอน
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Folder", "GraduationCap", "Banknote", "Users", "Briefcase", "FileText", "BookOpen", "Settings"
                    ].map((iconName) => (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setForm({ ...form, icon: iconName })}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                          form.icon === iconName 
                            ? "bg-purple-600 border-purple-600 text-white shadow-sm" 
                            : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-650 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        {iconName === "Folder" && "📁 แฟ้ม"}
                        {iconName === "GraduationCap" && "🎓 วิชาการ"}
                        {iconName === "Banknote" && "💰 งบประมาณ"}
                        {iconName === "Users" && "👥 บุคคล"}
                        {iconName === "Briefcase" && "💼 ทั่วไป"}
                        {iconName === "FileText" && "📄 สารบรรณ"}
                        {iconName === "BookOpen" && "📖 ห้องสมุด"}
                        {iconName === "Settings" && "⚙️ แผนงาน"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className="flex items-center gap-2 text-sm"
                >
                  {form.isActive ? (
                    <ToggleRight className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-slate-400" />
                  )}
                  <span
                    className={
                      form.isActive
                        ? "text-emerald-600 dark:text-emerald-400 font-medium"
                        : "text-slate-400 font-medium"
                    }
                  >
                    {form.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                  </span>
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "กำลังบันทึก..." : "บันทึก"}
                </button>
                <button
                  onClick={resetForm}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm font-medium transition-colors"
                >
                  <X className="w-4 h-4" />
                  ยกเลิก
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <FolderOpen className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">ยังไม่มีงานย่อย</p>
            <p className="text-xs mt-1">กดปุ่ม &quot;เพิ่มงานย่อย&quot; เพื่อเริ่มต้น</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    รหัส
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    ชื่องานย่อย
                  </th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    สถานะ
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody>
                {sections.map((s, i) => (
                  <tr
                    key={s.id}
                    className={`border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                      !s.isActive ? "opacity-50" : ""
                    }`}
                  >                    <td className="px-6 py-3.5">
                      <span 
                        style={{ backgroundColor: `${s.color || "#6366f1"}15`, color: s.color || "#6366f1" }}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold font-mono"
                      >
                        {s.code}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-sm font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span 
                          style={{ color: s.color || "#6366f1" }} 
                          className="text-xs"
                        >
                          {s.icon === "GraduationCap" && "🎓"}
                          {s.icon === "Banknote" && "💰"}
                          {s.icon === "Users" && "👥"}
                          {s.icon === "Briefcase" && "💼"}
                          {s.icon === "FileText" && "📄"}
                          {s.icon === "BookOpen" && "📖"}
                          {s.icon === "Settings" && "⚙️"}
                          {(s.icon === "Folder" || !s.icon) && "📁"}
                        </span>
                        <span>{s.name}</span>
                        {s.sortOrder !== undefined && s.sortOrder > 0 && (
                          <span className="text-[10px] text-slate-400 font-normal">
                            (ลำดับ: {s.sortOrder})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          s.isActive
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            s.isActive ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        {s.isActive ? "เปิดใช้งาน" : "ปิด"}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(s)}
                          className="p-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-500/10 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                          title="แก้ไข"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="ลบ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// TAB 2: PATTERN BUILDER
// ══════════════════════════════════════════════════════════════════════
function PatternBuilderTab({
  configs,
  onRefresh,
  showToast,
}: {
  configs: DocConfig[];
  onRefresh: () => Promise<void>;
  showToast: (m: string, t?: "ok" | "err") => void;
}) {
  const [editingConfig, setEditingConfig] = useState<DocConfig | null>(null);
  const [localPrefix, setLocalPrefix] = useState("");
  const [localPadding, setLocalPadding] = useState(1);
  const [localUseThai, setLocalUseThai] = useState(true);
  const [localYearFormat, setLocalYearFormat] = useState("TH_BE");
  const [saving, setSaving] = useState(false);

  const startEdit = (c: DocConfig) => {
    setEditingConfig(c);
    setLocalPrefix(c.prefix);
    setLocalPadding(c.paddingDigits);
    setLocalUseThai(c.useThaiNumerals);
    setLocalYearFormat(c.yearFormat);
  };

  const cancelEdit = () => setEditingConfig(null);

  const handleSave = async () => {
    if (!editingConfig) return;
    setSaving(true);
    try {
      await saveDocumentConfig(
        editingConfig.id,
        localPrefix,
        localUseThai,
        localPadding,
        localYearFormat
      );
      showToast("บันทึกรูปแบบเลขสำเร็จ");
      cancelEdit();
      await onRefresh();
    } catch (err: any) {
      showToast(err.message || "บันทึกไม่สำเร็จ", "err");
    } finally {
      setSaving(false);
    }
  };

  // Live preview for the editing config
  const livePreview = editingConfig
    ? renderPatternPreview(localPrefix, localPadding, localUseThai, localYearFormat)
    : "";

  const docTypeLabel = (dt: string) => {
    switch (dt) {
      case "MEMO":
        return "บันทึกข้อความ";
      case "COMMAND":
        return "คำสั่ง";
      case "OUTGOING":
        return "หนังสือส่ง";
      default:
        return dt;
    }
  };

  const docTypeColor = (dt: string) => {
    switch (dt) {
      case "MEMO":
        return "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20";
      case "COMMAND":
        return "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20";
      case "OUTGOING":
        return "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20";
      default:
        return "bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {configs.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-16 flex flex-col items-center justify-center text-slate-400 shadow-sm">
          <Hash className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">ยังไม่มีรูปแบบเลขเอกสาร</p>
          <p className="text-xs mt-1">
            เพิ่มงานย่อยในแท็บแรกเพื่อสร้างรูปแบบเลขอัตโนมัติ
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {configs.map((c) => {
            const isEditing = editingConfig?.id === c.id;
            const preview = renderPatternPreview(
              c.prefix,
              c.paddingDigits,
              c.useThaiNumerals,
              c.yearFormat
            );

            return (
              <motion.div
                key={c.id}
                layout
                className={`bg-white dark:bg-slate-800 rounded-2xl border shadow-sm transition-all duration-200 ${
                  isEditing
                    ? "border-purple-300 dark:border-purple-500/50 ring-2 ring-purple-500/10"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                {/* Card Header */}
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${docTypeColor(
                        c.docType
                      )}`}
                    >
                      {docTypeLabel(c.docType)}
                    </span>
                    {c.memoSection && (
                      <>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {c.memoSection.name}
                        </span>
                      </>
                    )}
                  </div>
                  {!isEditing && (
                    <button
                      onClick={() => startEdit(c)}
                      className="p-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-500/10 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                      title="แก้ไข"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-5">
                  {isEditing ? (
                    <div className="space-y-4">
                      {/* Live Preview */}
                      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-500/5 dark:to-indigo-500/5 rounded-xl p-4 border border-purple-100 dark:border-purple-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Eye className="w-4 h-4 text-purple-500" />
                          <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                            ตัวอย่างเลขเอกสาร
                          </span>
                        </div>
                        <p className="text-xl font-bold text-purple-700 dark:text-purple-300 font-mono tracking-wide">
                          {livePreview}
                        </p>
                        <p className="text-[11px] text-purple-400 mt-1">
                          ลำดับตัวอย่าง: 124
                        </p>
                      </div>

                      {/* Fields */}
                      <div>
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                          คำนำหน้า (Prefix)
                        </label>
                        <input
                          type="text"
                          value={localPrefix}
                          onChange={(e) => setLocalPrefix(e.target.value)}
                          className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                            หลักเลข (Padding)
                          </label>
                          <select
                            value={localPadding}
                            onChange={(e) =>
                              setLocalPadding(Number(e.target.value))
                            }
                            className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:ring-2 focus:ring-purple-500/30 cursor-pointer"
                          >
                            {[1, 2, 3, 4, 5].map((n) => (
                              <option key={n} value={n}>
                                {n} หลัก (เช่น {String(1).padStart(n, "0")})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                            รูปแบบปี
                          </label>
                          <select
                            value={localYearFormat}
                            onChange={(e) => setLocalYearFormat(e.target.value)}
                            className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:ring-2 focus:ring-purple-500/30 cursor-pointer"
                          >
                            <option value="TH_BE">พ.ศ. (2569)</option>
                            <option value="AD">ค.ศ. (2026)</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setLocalUseThai(!localUseThai)}
                          className="flex items-center gap-2 text-sm"
                        >
                          {localUseThai ? (
                            <ToggleRight className="w-6 h-6 text-emerald-500" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-slate-400" />
                          )}
                          <span
                            className={
                              localUseThai
                                ? "text-emerald-600 dark:text-emerald-400 font-medium"
                                : "text-slate-400 font-medium"
                            }
                          >
                            {localUseThai
                              ? "ใช้เลขไทย (๑, ๒, ๓...)"
                              : "ใช้เลขอารบิก (1, 2, 3...)"}
                          </span>
                        </button>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                        >
                          <Save className="w-4 h-4" />
                          {saving ? "กำลังบันทึก..." : "บันทึก"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm font-medium transition-colors"
                        >
                          <X className="w-4 h-4" />
                          ยกเลิก
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Preview */}
                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                            ตัวอย่าง
                          </span>
                        </div>
                        <p className="text-lg font-bold text-slate-800 dark:text-slate-200 font-mono tracking-wide">
                          {preview}
                        </p>
                      </div>

                      {/* Config Details */}
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs text-slate-600 dark:text-slate-300">
                          Prefix: <strong className="ml-1">{c.prefix}</strong>
                        </span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs text-slate-600 dark:text-slate-300">
                          Padding: <strong className="ml-1">{c.paddingDigits}</strong>
                        </span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs text-slate-600 dark:text-slate-300">
                          {c.useThaiNumerals ? "เลขไทย" : "เลขอารบิก"}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs text-slate-600 dark:text-slate-300">
                          {c.yearFormat === "TH_BE" ? "พ.ศ." : "ค.ศ."}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-xs text-purple-600 dark:text-purple-400 font-semibold">
                          ลำดับปัจจุบัน: {c.currentSeq}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// TAB 3: SIGNEE PRESETS
// ══════════════════════════════════════════════════════════════════════
function SigneesTab({
  signees,
  onRefresh,
  showToast,
}: {
  signees: SigneePreset[];
  onRefresh: () => Promise<void>;
  showToast: (m: string, t?: "ok" | "err") => void;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", position: "", isCommon: true });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const resetForm = () => {
    setForm({ name: "", position: "", isCommon: true });
    setEditId(null);
    setShowForm(false);
  };

  const handleEdit = (s: SigneePreset) => {
    setEditId(s.id);
    setForm({ name: s.name, position: s.position, isCommon: s.isCommon });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.position.trim()) {
      showToast("กรุณากรอกชื่อและตำแหน่ง", "err");
      return;
    }
    setSaving(true);
    try {
      await upsertSigneePreset(
        editId,
        form.name.trim(),
        form.position.trim(),
        form.isCommon
      );
      showToast(editId ? "แก้ไขสำเร็จ" : "เพิ่มสำเร็จ");
      resetForm();
      await onRefresh();
    } catch (err: any) {
      showToast(err.message || "เกิดข้อผิดพลาด", "err");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบผู้ลงนามนี้หรือไม่?")) return;
    try {
      await deleteSigneePreset(id);
      showToast("ลบสำเร็จ");
      await onRefresh();
    } catch (err: any) {
      showToast(err.message || "ลบไม่สำเร็จ", "err");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {/* Add Button */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          เพิ่มผู้ลงนาม
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editId ? "แก้ไขผู้ลงนาม" : "เพิ่มผู้ลงนามใหม่"}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                    ชื่อ - นามสกุล
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="เช่น นายประธาน สมเกียรติ"
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">
                    ตำแหน่ง
                  </label>
                  <input
                    type="text"
                    value={form.position}
                    onChange={(e) =>
                      setForm({ ...form, position: e.target.value })
                    }
                    placeholder="เช่น ผู้อำนวยการโรงเรียน"
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isCommon: !form.isCommon })}
                  className="flex items-center gap-2 text-sm"
                >
                  {form.isCommon ? (
                    <ToggleRight className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-slate-400" />
                  )}
                  <span
                    className={
                      form.isCommon
                        ? "text-emerald-600 dark:text-emerald-400 font-medium"
                        : "text-slate-400 font-medium"
                    }
                  >
                    {form.isCommon ? "ใช้บ่อย (แสดงทุกครั้ง)" : "ไม่ใช้บ่อย"}
                  </span>
                </button>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "กำลังบันทึก..." : "บันทึก"}
                </button>
                <button
                  onClick={resetForm}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm font-medium transition-colors"
                >
                  <X className="w-4 h-4" />
                  ยกเลิก
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards Grid */}
      {signees.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-16 flex flex-col items-center justify-center text-slate-400 shadow-sm">
          <UserCheck className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">ยังไม่มีรายชื่อผู้ลงนาม</p>
          <p className="text-xs mt-1">
            กดปุ่ม &quot;เพิ่มผู้ลงนาม&quot; เพื่อเริ่มต้น
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {signees.map((s) => (
            <div
              key={s.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  {s.name.charAt(0)}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(s)}
                    className="p-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-500/10 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                    title="แก้ไข"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="ลบ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {s.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {s.position}
              </p>
              {s.isCommon && (
                <span className="inline-flex items-center gap-1 mt-3 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                  <Check className="w-3 h-3" />
                  ใช้บ่อย
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
