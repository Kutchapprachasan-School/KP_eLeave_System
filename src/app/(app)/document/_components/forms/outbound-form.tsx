"use client";

import { useState, useEffect } from "react";
import { Save, Sparkles, ChevronDown, Eye, Send, RefreshCw, Calendar } from "lucide-react";
import { SearchableCombobox } from "@/features/document/ui/components/forms/searchable-combobox";
import { useI18n } from "@/lib/i18n";
import { formatLeaveDate } from "@/lib/date-format";

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
    unitType?: "DEPARTMENT" | "SUBJECT_GROUP";
    isBulkBatch?: boolean;
    quantity?: number;
    roleType?: "PARTICIPANT" | "SPEAKER" | "COMMITTEE" | "OTHER";
    roleTitle?: string;
  }) => Promise<any>;
  username?: string;
  department?: string;
  outboundDocs?: any[];
  onRefresh?: () => void;
  onGoToHistory?: () => void;
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

const DEPARTMENT_OPTIONS = [
  "บุคคล",
  "งบประมาณ",
  "ทั่วไป",
  "วิชาการ",
  "กิจการนักเรียน",
  "งานสารบรรณ",
];

const SUBJECT_GROUP_OPTIONS = [
  "กลุ่มสาระการเรียนรู้ภาษาไทย",
  "กลุ่มสาระการเรียนรู้คณิตศาสตร์",
  "กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี",
  "กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนา และวัฒนธรรม",
  "กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา",
  "กลุ่มสาระการเรียนรู้ศิลปะ",
  "กลุ่มสาระการเรียนรู้การงานอาชีพ",
  "กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ",
];

function formatThaiDateDisplay(dateStr: string, lang: "th" | "en" = "th"): string {
  return formatLeaveDate(dateStr, lang);
}

export default function OutboundForm({
  sections,
  issuing,
  onSubmit,
  username = "",
  department = "",
  outboundDocs = [],
  onRefresh,
  onGoToHistory,
}: OutboundFormProps) {
  const { lang } = useI18n();

  // Default "จากหน่วยงาน" to requester's department or "บุคคล"
  const [formData, setFormData] = useState({
    docType: "MEMO",
    outgoingSubtype: "OUTGOING_NORMAL",
    memoSectionId: sections[0]?.id || "",
    unitType: (department && department.includes("กลุ่มสาระ") ? "SUBJECT_GROUP" : "DEPARTMENT") as "DEPARTMENT" | "SUBJECT_GROUP",
    origin: (department && department.includes("กลุ่มสาระ")) ? department : "บุคคล",
    to: "ผู้อำนวยการโรงเรียน",
    title: "",
    requester: username || "",
    date: new Date().toISOString().split("T")[0],
    department: department || "",
    isBulkBatch: false,
    quantity: 10,
    roleType: "PARTICIPANT" as "PARTICIPANT" | "SPEAKER" | "COMMITTEE" | "OTHER",
    roleTitle: "",
  });

  const [selectedPreviewDoc, setSelectedPreviewDoc] = useState<any | null>(null);
  const [lastIssuedDoc, setLastIssuedDoc] = useState<any | null>(null);
  const [localDocs, setLocalDocs] = useState<any[]>(outboundDocs || []);

  useEffect(() => {
    if (outboundDocs && Array.isArray(outboundDocs)) {
      setLocalDocs(outboundDocs);
    }
  }, [outboundDocs]);

  // Sync props when sections or user profile finish loading asynchronously
  useEffect(() => {
    if (sections.length > 0 && !formData.memoSectionId) {
      setFormData(prev => ({ ...prev, memoSectionId: sections[0].id }));
    }
  }, [sections]);

  useEffect(() => {
    if (username || department) {
      setFormData(prev => {
        const isSubGroup = Boolean(department && department.includes("กลุ่มสาระ"));
        const defaultOrigin = isSubGroup ? department : (DEPARTMENT_OPTIONS.includes(prev.origin) ? prev.origin : "บุคคล");
        return {
          ...prev,
          requester: prev.requester || username || "",
          unitType: isSubGroup ? "SUBJECT_GROUP" : prev.unitType,
          origin: defaultOrigin,
          department: department || prev.department || ""
        };
      });
    }
  }, [username, department]);

  const selectedCategoryDocs = (localDocs || []).filter(d => {
    if (formData.docType === "MEMO") {
      return d.docType === "MEMO";
    }
    if (formData.docType === "OUTGOING") {
      return d.docType.startsWith("OUTGOING");
    }
    return d.docType === formData.docType;
  });

  const latestCategoryDoc = selectedCategoryDocs[0];

  const latestDocDateStr = latestCategoryDoc?.date
    ? formatThaiDateDisplay(latestCategoryDoc.date, lang)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (issuing) return;
    
    const activeDocType = formData.docType === "OUTGOING" ? formData.outgoingSubtype : formData.docType;

    const resultDoc = await onSubmit({
      docType: activeDocType,
      memoSectionId: formData.docType === "MEMO" ? formData.memoSectionId : undefined,
      origin: formData.origin.trim(),
      to: formData.to.trim(),
      title: formData.title.trim(),
      requester: formData.requester.trim(),
      date: formData.date,
      department: (department || formData.department || "").trim() || undefined,
      unitType: formData.unitType,
      isBulkBatch: formData.docType === "CERTIFICATE" ? formData.isBulkBatch : false,
      quantity: formData.docType === "CERTIFICATE" && formData.isBulkBatch ? formData.quantity : 1,
      roleType: formData.docType === "CERTIFICATE" ? formData.roleType : undefined,
      roleTitle: formData.docType === "CERTIFICATE" && formData.roleType === "OTHER" ? formData.roleTitle : undefined,
    });

    if (resultDoc && resultDoc.docNo) {
      setLastIssuedDoc(resultDoc);
      setLocalDocs(prev => [resultDoc, ...prev]);
    }
  };

  const selectedSection = sections.find(s => s.id === formData.memoSectionId);

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-xs relative">
      <div className="lg:grid lg:grid-cols-12 lg:gap-8 space-y-6 lg:space-y-0 items-start">
        {/* Left Column: Input Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-5 space-y-4.5">
          <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-bold">
              +
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              ออกเลขหนังสือใหม่
            </h3>
          </div>

          {/* DocType Dropdown */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              ประเภทเอกสาร *
            </label>
            <div className="relative">
              <select
                value={formData.docType}
                onChange={(e) => setFormData({ ...formData, docType: e.target.value })}
                className="w-full h-11 pl-3.5 pr-9 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all appearance-none cursor-pointer outline-none"
              >
                <option value="MEMO">บันทึกข้อความ</option>
                <option value="OUTGOING">หนังสือส่ง</option>
                <option value="COMMAND">คำสั่ง</option>
                <option value="ANNOUNCEMENT">ประกาศ</option>
                <option value="CERTIFICATE">เกียรติบัตร</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Sub-option for หนังสือส่ง */}
          {formData.docType === "OUTGOING" && (
            <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/60 space-y-2">
              <label className="block text-xs font-bold text-purple-800 dark:text-purple-300">
                ประเภทหนังสือส่ง *
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="outgoingSubtype"
                    value="OUTGOING_NORMAL"
                    checked={formData.outgoingSubtype === "OUTGOING_NORMAL"}
                    onChange={() => setFormData({ ...formData, outgoingSubtype: "OUTGOING_NORMAL" })}
                    className="accent-purple-600 w-4 h-4"
                  />
                  ปกติ
                </label>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="outgoingSubtype"
                    value="OUTGOING_CIRCULAR"
                    checked={formData.outgoingSubtype === "OUTGOING_CIRCULAR"}
                    onChange={() => setFormData({ ...formData, outgoingSubtype: "OUTGOING_CIRCULAR" })}
                    className="accent-purple-600 w-4 h-4"
                  />
                  หนังสือเวียน
                </label>
              </div>
            </div>
          )}

          {/* Certificate Bulk & Dynamic Role Options */}
          {formData.docType === "CERTIFICATE" && (
            <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 space-y-3">
              <label className="flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isBulkBatch}
                  onChange={(e) => setFormData({ ...formData, isBulkBatch: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                />
                🎓 ขอออกเลขเกียรติบัตรเป็นชุด (Bulk Batch Request)
              </label>

              {formData.isBulkBatch && (
                <div className="pl-6 space-y-2 pt-1 border-t border-amber-200/60 dark:border-amber-800/40">
                  <div>
                    <label className="block text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">
                      จำนวนเลขที่ต้องการออก (ฉบับ) *
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={100}
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 2 })}
                      className="w-full h-9 px-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-sm text-amber-900 dark:text-amber-100 outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="pt-1">
                <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1.5">
                  ประเภทบทบาท / การเข้าร่วม *
                </label>
                <div className="grid grid-cols-2 gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="roleType"
                      value="PARTICIPANT"
                      checked={formData.roleType === "PARTICIPANT"}
                      onChange={() => setFormData({ ...formData, roleType: "PARTICIPANT" })}
                      className="accent-amber-600 w-4 h-4"
                    />
                    เข้าร่วมกิจกรรม
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="roleType"
                      value="SPEAKER"
                      checked={formData.roleType === "SPEAKER"}
                      onChange={() => setFormData({ ...formData, roleType: "SPEAKER" })}
                      className="accent-amber-600 w-4 h-4"
                    />
                    วิทยากร
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="roleType"
                      value="COMMITTEE"
                      checked={formData.roleType === "COMMITTEE"}
                      onChange={() => setFormData({ ...formData, roleType: "COMMITTEE" })}
                      className="accent-amber-600 w-4 h-4"
                    />
                    กรรมการ / คณะทำงาน
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="roleType"
                      value="OTHER"
                      checked={formData.roleType === "OTHER"}
                      onChange={() => setFormData({ ...formData, roleType: "OTHER" })}
                      className="accent-amber-600 w-4 h-4"
                    />
                    อื่นๆ
                  </label>
                </div>

                {formData.roleType === "OTHER" && (
                  <input
                    type="text"
                    required
                    placeholder="ระบุชื่อบทบาท..."
                    value={formData.roleTitle}
                    onChange={(e) => setFormData({ ...formData, roleTitle: e.target.value })}
                    className="w-full h-9 mt-2 px-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-sm text-amber-900 dark:text-amber-100 outline-none"
                  />
                )}
              </div>
            </div>
          )}

          {/* Memo Section Select */}
          {formData.docType === "MEMO" && (
            <div>
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                หมวดหมู่เอกสาร *
              </label>
              <div className="relative">
                <select
                  value={formData.memoSectionId}
                  onChange={(e) => setFormData({ ...formData, memoSectionId: e.target.value })}
                  className="w-full h-11 pl-3.5 pr-9 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all appearance-none cursor-pointer outline-none"
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

          {/* Requester Unit Radio Selector (ฝ่ายงาน vs กลุ่มสาระ) */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-2.5">
            <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
              หน่วยงาน/สังกัด เจ้าของเรื่อง *
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="unitType"
                  value="DEPARTMENT"
                  checked={formData.unitType === "DEPARTMENT"}
                  onChange={() => setFormData({ 
                    ...formData, 
                    unitType: "DEPARTMENT",
                    origin: DEPARTMENT_OPTIONS[0]
                  })}
                  className="accent-purple-600 w-4 h-4"
                />
                🏢 ฝ่ายงาน
              </label>
              <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="unitType"
                  value="SUBJECT_GROUP"
                  checked={formData.unitType === "SUBJECT_GROUP"}
                  onChange={() => {
                    const defaultSG = (department && department.includes("กลุ่มสาระ")) ? department : SUBJECT_GROUP_OPTIONS[0];
                    setFormData({ 
                      ...formData, 
                      unitType: "SUBJECT_GROUP",
                      origin: defaultSG
                    });
                  }}
                  className="accent-purple-600 w-4 h-4"
                />
                📚 กลุ่มสาระการเรียนรู้
              </label>
            </div>

            {formData.unitType === "DEPARTMENT" ? (
              <select
                value={formData.origin}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-white outline-none cursor-pointer"
              >
                {DEPARTMENT_OPTIONS.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            ) : (
              <div>
                {department && department.includes("กลุ่มสาระ") ? (
                  <input
                    type="text"
                    required
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white outline-none font-medium"
                    placeholder="กลุ่มสาระ..."
                  />
                ) : (
                  <select
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-white outline-none cursor-pointer"
                  >
                    {SUBJECT_GROUP_OPTIONS.map((sg) => (
                      <option key={sg} value={sg}>{sg}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              วันที่ออกเลข *
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={formData.date}
                max={formData.docType === "CERTIFICATE" ? undefined : todayStr}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none opacity-0 absolute inset-0 z-10 cursor-pointer"
              />
              <div className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-white flex items-center justify-between pointer-events-none">
                <span>{formatThaiDateDisplay(formData.date, lang) || formData.date}</span>
                <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            {formData.docType !== "CERTIFICATE" && (
              <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block">
                * เอกสารทั่วไปไม่อนุญาตให้ลงวันที่ล่วงหน้าในอนาคต (ลงได้สูงสุดถึงวันนี้)
              </span>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              เรื่อง
            </label>
            <textarea
              rows={2}
              required
              placeholder="ระบุชื่อเรื่อง..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none resize-none"
            />
          </div>

          {/* To / Recipient */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
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
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none"
            />
          </div>

          {/* Requester (Clean Single Input) */}
          <div className="pt-1">
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              ผู้ขอออกเลข *
            </label>
            <input
              type="text"
              required
              value={formData.requester}
              onChange={(e) => setFormData({ ...formData, requester: e.target.value })}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none font-medium"
              placeholder="ชื่อผู้ขอออกเลข..."
            />
          </div>

          {/* Card Slot: Show Green Success Card if lastIssuedDoc exists, otherwise show Amber Reference Card */}
          {lastIssuedDoc ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/70 border-2 border-emerald-500/60 dark:border-emerald-600/60 rounded-xl p-4 space-y-2 text-center shadow-md animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-center gap-1.5 text-sm font-black text-emerald-700 dark:text-emerald-300">
                <span className="text-lg">🎉</span>
                ออกเลขหนังสือของคุณสำเร็จเรียบร้อย!
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {lastIssuedDoc.docNo}
              </div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-1">
                เรื่อง: {lastIssuedDoc.title}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center justify-center gap-2">
                <span>ถึง: {lastIssuedDoc.to}</span>
                <span>•</span>
                <span>วันที่: {new Date(lastIssuedDoc.date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
              <div className="pt-1 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(lastIssuedDoc.docNo)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  📋 คัดลอกเลขหนังสือ
                </button>
                <button
                  type="button"
                  onClick={() => setLastIssuedDoc(null)}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-sm font-semibold transition cursor-pointer"
                >
                  ออกเลขฉบับต่อไป
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 rounded-xl p-4 space-y-1.5 text-center shadow-2xs">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center justify-center gap-1">
                📌 เลขล่าสุดที่ถูกขอในหมวดนี้ (อ้างอิง)
              </span>
              <div className="text-xl sm:text-2xl font-black font-mono text-amber-900 dark:text-amber-200">
                {latestCategoryDoc ? latestCategoryDoc.docNo : "ยังไม่มีประวัติในหมวดนี้"}
              </div>
              {latestDocDateStr && (
                <span className="text-xs font-semibold text-amber-700/90 dark:text-amber-400/90 block pt-0.5">
                  📅 ออกเมื่อวันที่: {latestDocDateStr}
                </span>
              )}
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={issuing}
            className="w-full h-12 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-purple-600/20 disabled:opacity-50 cursor-pointer border border-purple-500/20"
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
              <span className="text-lg">🕒</span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                ประวัติการออกเลขล่าสุด
              </h3>
            </div>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/50 transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                รีเฟรช
              </button>
            )}
          </div>

          {/* History List Table */}
          {(!localDocs || localDocs.length === 0) ? (
            <div className="text-center py-12 text-sm text-slate-400">
              ยังไม่มีประวัติการขอออกเลขหนังสือ
            </div>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">เลขที่</th>
                      <th className="py-2.5 px-2">ประเภท</th>
                      <th className="py-2.5 px-2">วันที่</th>
                      <th className="py-2.5 px-3">เรื่อง</th>
                      <th className="py-2.5 px-2">ผู้ขอ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {localDocs.slice(0, 10).map((doc, idx) => {
                      const getDocBadge = (type: string) => {
                        if (type === "MEMO") return { text: "ภายใน", bg: "bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300" };
                        if (type === "COMMAND") return { text: "คำสั่ง", bg: "bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300" };
                        if (type === "ANNOUNCEMENT") return { text: "ประกาศ", bg: "bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300" };
                        if (type === "CERTIFICATE") return { text: "เกียรติบัตร", bg: "bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300" };
                        return { text: "ภายนอก", bg: "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300" };
                      };
                      const badge = getDocBadge(doc.docType);
                      const formattedDate = doc.date ? formatThaiDateDisplay(doc.date, lang) : '';
                      
                      return (
                        <tr
                          key={doc.id || idx}
                          onClick={() => setSelectedPreviewDoc(doc)}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition cursor-pointer group text-sm"
                        >
                          <td className="py-3.5 px-3 font-mono font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 whitespace-nowrap">
                            {doc.docNo}
                          </td>
                          <td className="py-3.5 px-2 whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${badge.bg}`}>
                              {badge.text}
                            </span>
                          </td>
                          <td className="py-3.5 px-2 text-slate-600 dark:text-slate-400 whitespace-nowrap text-xs">
                            {formattedDate}
                          </td>
                          <td className="py-3.5 px-3 max-w-[200px] truncate text-slate-700 dark:text-slate-300 font-medium">
                            {doc.title}
                          </td>
                          <td className="py-3.5 px-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {doc.requester || doc.origin || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer subtext & shortcut button to full history */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                <span className="text-slate-400 dark:text-slate-500 font-medium">
                  📌 แสดงเฉพาะ 10 รายการล่าสุด
                </span>
                {onGoToHistory && (
                  <button
                    type="button"
                    onClick={onGoToHistory}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-sm font-bold border border-purple-200/60 dark:border-purple-800/60 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>🔍</span>
                    ดูประวัติและทะเบียนออกเลขหนังสือทั้งหมด
                  </button>
                )}
              </div>
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
                <span className="text-base">📄</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">รายละเอียดเอกสารออกเลข</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPreviewDoc(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center text-xs font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="bg-purple-50/60 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/40 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">เลขที่ออกเอกสาร</span>
                  <span className="font-mono text-base font-extrabold text-purple-600 dark:text-purple-400">{selectedPreviewDoc.docNo}</span>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                  {selectedPreviewDoc.status === "ISSUED" || !selectedPreviewDoc.status
                    ? "ออกเลขสำเร็จ"
                    : selectedPreviewDoc.status === "PRINTED"
                    ? "พิมพ์แล้ว"
                    : selectedPreviewDoc.status === "CANCELLED"
                    ? "ยกเลิก"
                    : selectedPreviewDoc.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-400 block font-medium">วันที่ออกเลข</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedPreviewDoc.date ? new Date(selectedPreviewDoc.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-400 block font-medium">ประเภท</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedPreviewDoc.docType === "MEMO" ? (selectedPreviewDoc.memoSection?.name || "บันทึกข้อความ") : (DOC_TYPE_NAMES[selectedPreviewDoc.docType] || selectedPreviewDoc.docType)}</span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-xs text-slate-400 block font-medium">เรื่อง (ชื่อเอกสาร)</span>
                <p className="font-semibold text-slate-900 dark:text-white leading-relaxed">{selectedPreviewDoc.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-400 block font-medium">ผู้ขอออกเลข</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedPreviewDoc.requester || '-'}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-400 block font-medium">กลุ่มงาน/หน่วยงาน</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedPreviewDoc.department || selectedPreviewDoc.origin || '-'}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedPreviewDoc(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm transition cursor-pointer"
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
