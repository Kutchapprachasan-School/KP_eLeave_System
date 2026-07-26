"use client";

import { useState, useEffect } from "react";
import { Save, Sparkles, Settings, ChevronDown } from "lucide-react";

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
};

const DOC_TYPE_NAMES: Record<string, string> = {
  MEMO: "บันทึกข้อความ",
  COMMAND: "คำสั่งโรงเรียน",
  OUTGOING_NORMAL: "หนังสือส่ง (ปกติ)",
  OUTGOING_CIRCULAR: "หนังสือส่ง (จดหมายเวียน)",
  ANNOUNCEMENT: "ประกาศ",
};

const COMMON_TITLES = [
  "ขออนุมัติจัดซื้อวัสดุสำนักงาน",
  "รายงานผลการปฏิบัติงานตามโครงการ",
  "ขออนุมัติเบิกจ่ายงบประมาณโครงการพัฒนาผู้เรียน",
  "ขออนุญาตจัดส่งบุคลากรเข้าร่วมการอบรมเชิงปฏิบัติการ",
  "ขออนุมัติจัดจ้างทำความสะอาดอาคารเรียน"
];

const COMMON_RECIPIENTS = [
  "ผู้อำนวยการโรงเรียน",
  "รองผู้อำนวยการโรงเรียนฝ่ายบริหารงานบุคคล",
  "รองผู้อำนวยการโรงเรียนฝ่ายวิชาการ",
  "หัวหน้างานพัสดุและโรงเรียน",
  "ทุกคนในสถานศึกษา"
];

const DEPARTMENT_OPTIONS = [
  "กลุ่มบริหารงานวิชาการ",
  "กลุ่มบริหารงานงบประมาณ",
  "กลุ่มบริหารงานบุคคล",
  "กลุ่มบริหารงานทั่วไป",
  "กลุ่มกิจการนักเรียน",
];

export default function OutboundForm({
  sections,
  issuing,
  onSubmit,
  username = "",
  department = "",
  outboundDocs = [],
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
    connectBudget: false,
  });

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
        department: prev.department || department || ""
      }));
    }
  }, [username, department]);

  const [showTitlePresets, setShowTitlePresets] = useState(false);
  const [showToPresets, setShowToPresets] = useState(false);
  const [customDepartment, setCustomDepartment] = useState(false);

  // Determine if the current department is a custom value (not in the preset list)
  const isCustomDepartment = formData.department !== "" && !DEPARTMENT_OPTIONS.includes(formData.department);

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
      department: formData.department.trim() || undefined,
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

  return (
    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="lg:grid lg:grid-cols-12 lg:gap-8 space-y-6 lg:space-y-0 items-start">
        {/* Left Column (7 cols): The Input Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-5">
          {/* Form Fields: Date & DocType */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                วันที่ออกเลข *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                ประเภทเอกสาร *
              </label>
              <div className="relative">
                <select
                  value={formData.docType}
                  onChange={(e) => setFormData({ ...formData, docType: e.target.value })}
                  className="w-full h-11 pl-3.5 pr-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="MEMO">บันทึกข้อความ</option>
                  <option value="COMMAND">คำสั่ง</option>
                  <option value="OUTGOING_NORMAL">หนังสือส่ง (ปกติ)</option>
                  <option value="OUTGOING_CIRCULAR">หนังสือส่ง (จดหมายเวียน)</option>
                  <option value="ANNOUNCEMENT">ประกาศ</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Memo Section Select */}
          {formData.docType === "MEMO" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                หมวดหมู่เอกสาร *
              </label>
              <div className="relative">
                <select
                  value={formData.memoSectionId}
                  onChange={(e) => setFormData({ ...formData, memoSectionId: e.target.value })}
                  className="w-full h-11 pl-3.5 pr-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all appearance-none cursor-pointer"
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
              {selectedSection && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-white shadow-xs"
                    style={{ backgroundColor: selectedSection.color || '#6366f1' }}
                  />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    หมวด: {selectedSection.name} ({selectedSection.code})
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Origin & To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                จากหน่วยงาน *
              </label>
              <input
                type="text"
                required
                placeholder="ชื่อผู้ขอ / หน่วยงาน"
                value={formData.origin}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>

            <div className="relative">
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  เรียน/ถึง *
                </label>
                <button
                  type="button"
                  onClick={() => setShowToPresets(!showToPresets)}
                  className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold hover:underline flex items-center gap-0.5"
                >
                  <Sparkles className="w-3 h-3 text-orange-500" />
                  + ผู้รับใช้บ่อย
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="เช่น ผู้อำนวยการโรงเรียน"
                value={formData.to}
                onFocus={() => setShowToPresets(true)}
                onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
              {showToPresets && (
                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-2 space-y-1">
                  <div className="flex justify-between items-center text-[11px] text-slate-400 px-2 pb-1 border-b border-slate-100 dark:border-slate-800 font-semibold">
                    <span>เลือกคำลงท้าย/ผู้รับใช้บ่อย</span>
                    <button type="button" onClick={() => setShowToPresets(false)} className="text-rose-500 hover:underline">ปิด</button>
                  </div>
                  {COMMON_RECIPIENTS.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, to: r }));
                        setShowToPresets(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-orange-50 dark:hover:bg-orange-950/30 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="relative">
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                เรื่อง (ชื่อเอกสาร) *
              </label>
              <button
                type="button"
                onClick={() => setShowTitlePresets(!showTitlePresets)}
                className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold hover:underline flex items-center gap-0.5"
              >
                <Sparkles className="w-3 h-3 text-orange-500" />
                + เรื่องใช้บ่อย
              </button>
            </div>
            <input
              type="text"
              required
              placeholder="เช่น ขออนุมัติจัดซื้อวัสดุสำนักงาน..."
              value={formData.title}
              onFocus={() => setShowTitlePresets(true)}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
            {showTitlePresets && (
              <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-2 space-y-1">
                <div className="flex justify-between items-center text-[11px] text-slate-400 px-2 pb-1 border-b border-slate-100 dark:border-slate-800 font-semibold">
                  <span>เลือกหัวข้อเรื่องที่ใช้บ่อย</span>
                  <button type="button" onClick={() => setShowTitlePresets(false)} className="text-rose-500 hover:underline">ปิด</button>
                </div>
                {COMMON_TITLES.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, title: t }));
                      setShowTitlePresets(false);
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-orange-50 dark:hover:bg-orange-950/30 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Requester & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                ผู้ปฏิบัติ/ผู้ขอออกเลข
              </label>
              <input
                type="text"
                required
                value={formData.requester}
                onChange={(e) => setFormData({ ...formData, requester: e.target.value })}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                กลุ่มงาน/ฝ่ายที่เกี่ยวข้อง
              </label>
              {customDepartment || isCustomDepartment ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="ระบุกลุ่มงานเอง"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="flex-1 h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => { setCustomDepartment(false); setFormData({ ...formData, department: "" }); }}
                    className="h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-500 hover:bg-slate-50 transition cursor-pointer whitespace-nowrap"
                  >
                    เลือกจากรายการ
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={formData.department}
                    onChange={(e) => {
                      if (e.target.value === "__custom__") {
                        setCustomDepartment(true);
                        setFormData({ ...formData, department: "" });
                      } else {
                        setFormData({ ...formData, department: e.target.value });
                      }
                    }}
                    className="w-full h-11 pl-3.5 pr-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">-- เลือกกลุ่มงาน --</option>
                    {DEPARTMENT_OPTIONS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                    <option value="__custom__">อื่นๆ (ระบุเอง)</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Budget Link Toggle */}
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
            <input
              type="checkbox"
              id="connectBudget"
              checked={formData.connectBudget}
              onChange={(e) => setFormData({ ...formData, connectBudget: e.target.checked })}
              className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer accent-orange-500"
            />
            <label htmlFor="connectBudget" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              🔗 เชื่อมโยงกับระบบแผน/งบประมาณโครงการโรงเรียน
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={issuing}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 active:scale-[0.99] text-white text-xs md:text-sm font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-50 cursor-pointer border border-orange-400/30"
          >
            <Save className="w-4 h-4" />
            {issuing ? "กำลังขอออกเลขเอกสาร..." : "ยืนยันขอออกเลขเอกสาร (หนังสือออก)"}
          </button>
        </form>

        {/* Right Column (5 cols): Quick Status & 10 Recent Items Panel */}
        <div className="lg:col-span-5 bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4.5 space-y-4 shadow-xs">
          {/* Header Badge */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-3.5 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <span>📌</span> สถานะเลขหมวดหมู่นี้:
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200/60 dark:border-orange-800/40">
                {formData.docType === "MEMO" ? (selectedSection ? `${selectedSection.name}` : "บันทึกข้อความ") : (DOC_TYPE_NAMES[formData.docType] || formData.docType)}
              </span>
            </div>

            <div className="pt-1 flex items-baseline justify-between border-t border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">เลขล่าสุดในระบบ:</span>
                <span className="text-sm md:text-base font-black text-orange-600 dark:text-orange-400 font-mono">
                  {latestCategoryDoc ? latestCategoryDoc.docNo : "ยังไม่มีการออกเลข"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">ออกแล้วในปีนี้</span>
                <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                  {selectedCategoryDocs.length} ฉบับ
                </span>
              </div>
            </div>
          </div>

          {/* 10 Recent Items List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>📋</span> 10 รายการล่าสุดในหมวดนี้
              </h4>
              <span className="text-[10px] text-slate-400 font-medium">
                {selectedCategoryDocs.length > 0 ? `${Math.min(selectedCategoryDocs.length, 10)} รายการ` : ""}
              </span>
            </div>

            {selectedCategoryDocs.length === 0 ? (
              <div className="text-center py-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                ยังไม่มีประวัติการออกเลขในหมวดหมู่นี้
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[360px] overflow-y-auto">
                {selectedCategoryDocs.slice(0, 10).map((doc, idx) => (
                  <div key={doc.id || idx} className="p-2.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                          {doc.docNo}
                        </span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {doc.date ? new Date(doc.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : ''}
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 dark:text-slate-200 truncate mt-0.5 font-medium" title={doc.title}>
                        {doc.title}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded whitespace-nowrap">
                      {doc.requester || doc.origin || '-'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
