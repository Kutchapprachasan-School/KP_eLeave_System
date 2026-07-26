"use client";

import { useState, useEffect } from "react";
import { Save, Sparkles, ChevronDown, Eye, Send, RefreshCw } from "lucide-react";
import { SearchableCombobox } from "@/features/document/ui/components/forms/searchable-combobox";

type MemoSection = { id: string; name: string; code: string; color?: string };

type OutboundFormProps = {
  sections: MemoSection[];
  issuing: boolean;
  onSubmit: (data: {
    docType: string;
    memoSectionId?: string;
    origin: string;
    to: string;
    title: string;
    requester: string;
    date: string;
    department?: string;
  }) => Promise<void>;
  username?: string;
  department?: string;
  outboundDocs?: any[];
  onRefresh?: () => void;
};

const DOC_TYPE_NAMES: Record<string, string> = {
  MEMO: "บันทึกข้อความ (ภายใน)",
  COMMAND: "คำสั่งโรงเรียน",
  OUTGOING_NORMAL: "หนังสือส่ง (ปกติ/ภายนอก)",
  OUTGOING_CIRCULAR: "หนังสือส่ง (จดหมายเวียน)",
  ANNOUNCEMENT: "ประกาศ",
};

const COMMON_RECIPIENTS = [
  "ผู้อำนวยการโรงเรียน",
  "รองผู้อำนวยการโรงเรียนฝ่ายบริหารงานบุคคล",
  "รองผู้อำนวยการโรงเรียนฝ่ายวิชาการ",
  "หัวหน้างานพัสดุและโรงเรียน",
  "ทุกคนในสถานศึกษา"
];

export default function OutboundForm({
  sections,
  issuing,
  onSubmit,
  username = "",
  department = "",
  outboundDocs = [],
  onRefresh,
}: OutboundFormProps) {
  // Default "จากหน่วยงาน" to requester's name
  const [formData, setFormData] = useState({
    docType: "MEMO",
    memoSectionId: sections[0]?.id || "",
    origin: username || department || "งานสารบรรณ",
    to: "ผู้อำนวยการโรงเรียน",
    title: "",
    requester: username || "",
    date: new Date().toISOString().split("T")[0],
    department: department || "",
  });

  const [selectedPreviewDoc, setSelectedPreviewDoc] = useState<any | null>(null);

  // Sync props when sections or user profile finish loading asynchronously
  useEffect(() => {
    if (sections.length > 0 && !formData.memoSectionId) {
      setFormData(prev => ({ ...prev, memoSectionId: sections[0].id }));
    }
  }, [sections]);

  useEffect(() => {
    if (username || department) {
      setFormData(prev => ({
        ...prev,
        requester: prev.requester || username || "",
        origin: (prev.origin === "งานสารบรรณ" || !prev.origin) ? (username || department || "งานสารบรรณ") : prev.origin,
        department: department || prev.department || ""
      }));
    }
  }, [username, department]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (issuing) return;
    
    onSubmit({
      docType: formData.docType,
      memoSectionId: formData.docType === "MEMO" ? formData.memoSectionId : undefined,
      origin: formData.origin.trim(),
      to: formData.to.trim(),
      title: formData.title.trim(),
      requester: formData.requester.trim(),
      date: formData.date,
      department: (department || formData.department || "").trim() || undefined,
    });
  };

  // Get the selected memo section for color display
  const selectedSection = sections.find(s => s.id === formData.memoSectionId);

  const selectedCategoryDocs = (outboundDocs || []).filter(d => {
    if (formData.docType === "MEMO") {
      return d.docType === "MEMO" && (!formData.memoSectionId || d.memoSectionId === formData.memoSectionId || d.memoSection?.id === formData.memoSectionId);
    }
    return d.docType === formData.docType;
  });

  const latestCategoryDoc = selectedCategoryDocs[0];

  const getDocBadge = (type: string) => {
    if (type === "MEMO") return { text: "ภายใน", bg: "bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300" };
    if (type === "COMMAND") return { text: "คำสั่ง", bg: "bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300" };
    return { text: "ภายนอก", bg: "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300" };
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-xs relative">
      <div className="lg:grid lg:grid-cols-12 lg:gap-8 space-y-6 lg:space-y-0 items-start">
        {/* Left Column (5 cols on lg): The Input Form (+ ออกเลขหนังสือใหม่) */}
        <form onSubmit={handleSubmit} className="lg:col-span-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-bold">
              +
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              ออกเลขหนังสือใหม่
            </h3>
          </div>

          {/* DocType Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              ประเภท
            </label>
            <div className="relative">
              <select
                value={formData.docType}
                onChange={(e) => setFormData({ ...formData, docType: e.target.value })}
                className="w-full h-10 pl-3 pr-9 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all appearance-none cursor-pointer outline-none"
              >
                <option value="MEMO">บันทึกข้อความ (ภายใน)</option>
                <option value="OUTGOING_NORMAL">หนังสือส่ง (ปกติ/ภายนอก)</option>
                <option value="COMMAND">คำสั่งโรงเรียน</option>
                <option value="OUTGOING_CIRCULAR">หนังสือส่ง (จดหมายเวียน)</option>
                <option value="ANNOUNCEMENT">ประกาศ</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Memo Section Select */}
          {formData.docType === "MEMO" && (
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                หมวดหมู่เอกสาร *
              </label>
              <div className="relative">
                <select
                  value={formData.memoSectionId}
                  onChange={(e) => setFormData({ ...formData, memoSectionId: e.target.value })}
                  className="w-full h-10 pl-3 pr-9 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all appearance-none cursor-pointer outline-none"
                  style={selectedSection?.color ? { borderLeftWidth: '4px', borderLeftColor: selectedSection.color } : {}}
                >
                  <option value="" disabled>-- เลือกหมวดหมู่บันทึกข้อความ --</option>
                  {sections.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>
          )}

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              วันที่ออกเลข *
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              เรื่อง
            </label>
            <textarea
              rows={2}
              required
              placeholder="ระบุชื่อเรื่อง..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none resize-none"
            />
          </div>

          {/* To / Recipient */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                เรียน / ถึง
              </label>
              <SearchableCombobox
                options={COMMON_RECIPIENTS.map((r) => ({ label: r, value: r }))}
                value={formData.to}
                onSelect={(val) => setFormData((prev) => ({ ...prev, to: val }))}
                triggerLabel="ผู้รับใช้บ่อย"
                placeholder="ค้นหาตำแหน่ง..."
              />
            </div>
            <input
              type="text"
              required
              placeholder="เช่น ผู้อำนวยการ..."
              value={formData.to}
              onChange={(e) => setFormData({ ...formData, to: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none"
            />
          </div>

          {/* Origin / Requester (Hidden or Compact) */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                จากหน่วยงาน
              </label>
              <input
                type="text"
                value={formData.origin}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[11px] text-slate-700 dark:text-slate-300 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                ผู้ขอออกเลข
              </label>
              <input
                type="text"
                value={formData.requester}
                onChange={(e) => setFormData({ ...formData, requester: e.target.value })}
                className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[11px] text-slate-700 dark:text-slate-300 outline-none"
              />
            </div>
          </div>

          {/* Green Preview Banner Card (เลขทะเบียนหนังสือของคุณ) */}
          <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl p-3.5 text-center space-y-1 shadow-2xs">
            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 block">
              เลขทะเบียนหนังสือของคุณ
            </span>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {latestCategoryDoc ? `ที่ ${latestCategoryDoc.docNo}` : "ถัดไปในระบบ"}
            </div>
          </div>

          {/* Purple Submit Action Button */}
          <button
            type="submit"
            disabled={issuing}
            className="w-full h-11 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-purple-600/20 disabled:opacity-50 cursor-pointer border border-purple-500/20"
          >
            <Send className="w-4 h-4" />
            {issuing ? "กำลังขอออกเลขเอกสาร..." : "🚀 ยืนยันขอเลข"}
          </button>
        </form>

        {/* Right Column (7 cols on lg): Recent History Table (🕒 ประวัติการออกเลขล่าสุด) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 md:p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-base">🕒</span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                ประวัติการออกเลขล่าสุด
              </h3>
            </div>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/50 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                รีเฟรช
              </button>
            )}
          </div>

          {/* History List Table */}
          {outboundDocs.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              ยังไม่มีประวัติการขอออกเลขหนังสือ
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2 px-2.5">เลขที่</th>
                    <th className="py-2 px-2">ประเภท</th>
                    <th className="py-2 px-2.5">เรื่อง</th>
                    <th className="py-2 px-2">ผู้ขอ</th>
                    <th className="py-2 px-2 text-right">เวลา</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {outboundDocs.slice(0, 10).map((doc, idx) => {
                    const badge = getDocBadge(doc.docType);
                    const formattedDate = doc.date ? new Date(doc.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '';
                    const formattedTime = doc.createdAt ? new Date(doc.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '';
                    
                    return (
                      <tr
                        key={doc.id || idx}
                        onClick={() => setSelectedPreviewDoc(doc)}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition cursor-pointer group"
                      >
                        <td className="py-3 px-2.5 font-mono font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 whitespace-nowrap">
                          {doc.docNo}
                        </td>
                        <td className="py-3 px-2 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg}`}>
                            {badge.text}
                          </span>
                        </td>
                        <td className="py-3 px-2.5 max-w-[200px] truncate text-slate-700 dark:text-slate-300 font-medium">
                          {doc.title}
                        </td>
                        <td className="py-3 px-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {doc.requester || doc.origin || '-'}
                        </td>
                        <td className="py-3 px-2 text-right whitespace-nowrap text-[10px] text-slate-400">
                          <div>{formattedTime}</div>
                          <div>{formattedDate}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick Preview Document Modal */}
      {selectedPreviewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-sm">📄</span>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">รายละเอียดเอกสารออกเลข</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPreviewDoc(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center text-xs font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-purple-50/60 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/40 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">เลขที่ออกเอกสาร</span>
                  <span className="font-mono text-sm font-extrabold text-purple-600 dark:text-purple-400">{selectedPreviewDoc.docNo}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                  {selectedPreviewDoc.status || "ISSUED"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">วันที่ออกเลข</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedPreviewDoc.date ? new Date(selectedPreviewDoc.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">ประเภท</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedPreviewDoc.docType === "MEMO" ? (selectedPreviewDoc.memoSection?.name || "บันทึกข้อความ") : (DOC_TYPE_NAMES[selectedPreviewDoc.docType] || selectedPreviewDoc.docType)}</span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block font-medium">เรื่อง (ชื่อเอกสาร)</span>
                <p className="font-semibold text-slate-900 dark:text-white leading-relaxed">{selectedPreviewDoc.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">ผู้ขอออกเลข</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedPreviewDoc.requester || '-'}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">กลุ่มงาน/หน่วยงาน</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedPreviewDoc.department || selectedPreviewDoc.origin || '-'}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedPreviewDoc(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
