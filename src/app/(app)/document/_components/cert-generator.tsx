"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  ArrowLeft, Plus, Trash2, Award, Calendar, CheckCircle2, 
  FileText, Search, Copy, Check, RefreshCw, Layers, Tag,
  Building2, User, Eye, X, ClipboardList, Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { issueActivityCertificatesBatch, getDocumentsList } from "@/app/actions/document";
import { useToast } from "@/components/toast-provider";
import { formatDocFullDate } from "@/lib/date-format";
import { useSession } from "@/lib/auth-client";

interface CertificateRoleItem {
  roleTitle: string;
  quantity: number;
}

const DEPARTMENTS = [
  "กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี",
  "กลุ่มสาระการเรียนรู้คณิตศาสตร์",
  "กลุ่มสาระการเรียนรู้ภาษาไทย",
  "กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ",
  "กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนา และวัฒนธรรม",
  "กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา",
  "กลุ่มสาระการเรียนรู้ศิลปะ",
  "กลุ่มสาระการเรียนรู้การงานอาชีพ",
  "กลุ่มบริหารงานวิชาการ",
  "กลุ่มบริหารงานบุคคล",
  "กลุ่มบริหารงานงบประมาณ",
  "กลุ่มบริหารงานทั่วไป",
  "งานกิจกรรมพัฒนาผู้เรียน",
  "โรงเรียนกุดจับประชาสรรค์"
];

const PRESET_ROLES = [
  "ผู้เข้าร่วมกิจกรรม",
  "วิทยากร",
  "ผู้ช่วยวิทยากร",
  "คณะกรรมการดำเนินงาน",
  "คณะกรรมการตัดสิน",
  "นักเรียนผู้ได้รับรางวัลชนะเลิศ",
  "นักเรียนผู้ได้รับรางวัลรองชนะเลิศอันดับ 1",
  "นักเรียนผู้ได้รับรางวัลรองชนะเลิศอันดับ 2",
  "นักเรียนผู้ได้รับรางวัลชมเชย",
  "ครูผู้ฝึกสอนนักเรียน",
];

export default function CertGenerator({ onBack }: { onBack?: () => void }) {
  const { showToast } = useToast();
  const { data: session } = useSession();

  const [activeTab, setActiveTab] = useState<"issue" | "history">("issue");

  // Form State
  const [activityTitle, setActivityTitle] = useState("");
  const [origin, setOrigin] = useState("กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี");
  const [customOrigin, setCustomOrigin] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [requesterName, setRequesterName] = useState("");
  const [roleItems, setRoleItems] = useState<CertificateRoleItem[]>([
    { roleTitle: "ผู้เข้าร่วมกิจกรรม", quantity: 50 },
    { roleTitle: "คณะกรรมการดำเนินงาน", quantity: 10 }
  ]);

  const [issuing, setIssuing] = useState(false);
  const [lastIssuedResult, setLastIssuedResult] = useState<any | null>(null);

  // History State
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBatchDetail, setSelectedBatchDetail] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Auto-fill user profile info
  useEffect(() => {
    if (session?.user) {
      if (!requesterName && session.user.name) {
        setRequesterName(session.user.name);
      }
      const userDept = (session.user as any)?.subjectGroup;
      if (userDept && DEPARTMENTS.includes(userDept)) {
        setOrigin(userDept);
      }
    }
  }, [session]);

  // Load History
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await getDocumentsList({ docType: "CERTIFICATE" });
      if (res.success && Array.isArray(res.data)) {
        setHistoryList(res.data);
      }
    } catch (e) {
      console.error("Error fetching certificate history:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Total Quantity Calculation
  const totalQuantity = useMemo(() => {
    return roleItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }, [roleItems]);

  // Handle Add Role
  const handleAddRole = (title = "ผู้เข้าร่วมกิจกรรม") => {
    setRoleItems(prev => [...prev, { roleTitle: title, quantity: 10 }]);
  };

  // Handle Remove Role
  const handleRemoveRole = (index: number) => {
    if (roleItems.length <= 1) {
      showToast("error", "ต้องมีอย่างน้อย 1 รายการบทบาท");
      return;
    }
    setRoleItems(prev => prev.filter((_, i) => i !== index));
  };

  // Handle Role Change
  const handleRoleChange = (index: number, field: "roleTitle" | "quantity", value: any) => {
    setRoleItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Handle Form Submit
  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityTitle.trim()) {
      showToast("error", "กรุณาระบุชื่อกิจกรรม / โครงการ");
      return;
    }
    if (totalQuantity <= 0) {
      showToast("error", "จำนวนเกียรติบัตรต้องมากกว่า 0 ใบ");
      return;
    }

    setIssuing(true);
    try {
      const finalOrigin = origin === "CUSTOM" ? customOrigin.trim() : origin;
      const res = await issueActivityCertificatesBatch({
        title: activityTitle.trim(),
        origin: finalOrigin || "โรงเรียนกุดจับประชาสรรค์",
        date: issueDate,
        requester: requesterName.trim() || session?.user?.name || "ครูผู้รับผิดชอบ",
        items: roleItems.map(item => ({
          roleTitle: item.roleTitle.trim(),
          quantity: Math.max(1, Number(item.quantity) || 1)
        }))
      });

      if (res.success && res.data) {
        showToast("success", `ออกเลขเกียรติบัตรสำเร็จ: ${res.data.docNo}`);
        setLastIssuedResult(res.data);
        await fetchHistory();
      } else {
        showToast("error", res.error || "เกิดข้อผิดพลาดในการออกเลข");
      }
    } catch (err: any) {
      showToast("error", err.message || "เกิดข้อผิดพลาดในการออกเลข");
    } finally {
      setIssuing(false);
    }
  };

  // Copy Helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast("success", `คัดลอก ${text} เรียบร้อยแล้ว`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return historyList;
    const q = searchQuery.toLowerCase();
    return historyList.filter(item => 
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.docNo && item.docNo.toLowerCase().includes(q)) ||
      (item.origin && item.origin.toLowerCase().includes(q)) ||
      (item.requester && item.requester.toLowerCase().includes(q))
    );
  }, [historyList, searchQuery]);

  // Parse breakdown from content string
  const parseBreakdown = (content: string) => {
    if (!content) return [];
    return content.split("\n").filter(line => line.trim().length > 0);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-6xl mx-auto">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
              title="ย้อนกลับ"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              ทะเบียนออกเลขเกียรติบัตร (Certificate Register)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ขอเลขทะเบียนเกียรติบัตรกิจกรรม และตรวจสอบประวัติการออกเลข
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => { setActiveTab("issue"); setLastIssuedResult(null); }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "issue"
                ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Plus className="w-4 h-4" />
            ขอเลขเกียรติบัตร
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("history"); fetchHistory(); }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "history"
                ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            ประวัติการออกเลข ({historyList.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Request Form */}
      {activeTab === "issue" && (
        <div className="space-y-6">
          {/* Success Banner if just issued */}
          {lastIssuedResult && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="p-5 sm:p-6 rounded-3xl bg-linear-to-r from-amber-500/15 via-emerald-500/10 to-teal-500/15 border-2 border-amber-500/40 dark:border-amber-400/40 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      🎉 ออกเลขทะเบียนเกียรติบัตรเรียบร้อยแล้ว!
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {lastIssuedResult.title}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(lastIssuedResult.docNo, "last_issued")}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 transition shadow-2xs"
                  >
                    {copiedId === "last_issued" ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    {copiedId === "last_issued" ? "คัดลอกแล้ว" : "คัดลอกเลขที่"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("history")}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs"
                  >
                    <ClipboardList className="w-4 h-4" />
                    ดูรายการในประวัติ
                  </button>
                </div>
              </div>

              {/* Number Range Pill Box */}
              <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-amber-200 dark:border-amber-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    เลขที่เกียรติบัตรที่ได้รับ
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight mt-0.5">
                    {lastIssuedResult.docNo}
                  </div>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 md:text-right">
                  <div>ผู้ขอ: <span className="font-bold">{lastIssuedResult.requester}</span></div>
                  <div>หน่วยงาน: <span className="font-bold">{lastIssuedResult.origin}</span></div>
                  <div>วันที่: <span className="font-bold">{formatDocFullDate(lastIssuedResult.date)}</span></div>
                </div>
              </div>

              {/* Roles Breakdown */}
              {lastIssuedResult.content && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5">
                  <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-500" />
                    การแจกแจงเลขที่ตามบทบาท:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                    {parseBreakdown(lastIssuedResult.content).map((line: string, idx: number) => (
                      <div key={idx} className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Form Card */}
          <form onSubmit={handleIssueSubmit} className="bg-white dark:bg-slate-900 p-5 sm:p-7 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                แบบฟอร์มขอเลขทะเบียนเกียรติบัตร
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                กรอกรายละเอียดกิจกรรมและจำนวนเกียรติบัตรที่ต้องการออกเลข
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Activity Title (Span 2) */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  ชื่อกิจกรรม / โครงการ / หลักสูตรฝึกอบรม <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={activityTitle}
                  onChange={(e) => setActivityTitle(e.target.value)}
                  placeholder="เช่น การแข่งขันตอบปัญหาวิชาการ สัปดาห์วิทยาศาสตร์ ประจำปีการศึกษา 2569"
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/50 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden transition"
                />
              </div>

              {/* Origin / Department */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-amber-500" />
                  กลุ่มสาระฯ / หน่วยงานผู้จัด <span className="text-rose-500">*</span>
                </label>
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/50 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden transition"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                  <option value="CUSTOM">ระบุหน่วยงานอื่น ๆ...</option>
                </select>

                {origin === "CUSTOM" && (
                  <input
                    type="text"
                    required
                    value={customOrigin}
                    onChange={(e) => setCustomOrigin(e.target.value)}
                    placeholder="ระบุชื่อกลุ่มงาน / โครงการ"
                    className="w-full mt-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden transition"
                  />
                )}
              </div>

              {/* Issue Date */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  วันที่ออกเกียรติบัตร <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/50 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden transition"
                />
              </div>

              {/* Requester */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-500" />
                  ผู้ขอ / ครูผู้รับผิดชอบโครงการ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="ชื่อ-นามสกุล ผู้ขอเลขเกียรติบัตร"
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/50 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden transition"
                />
              </div>
            </div>

            {/* Dynamic Roles & Quantity Section */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-500" />
                    รายการบทบาทและจำนวนใบที่ต้องการออกเลข
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    สามารถแยกบทบาทเพื่อกำหนดช่วงเลขที่ต่อเนื่องกันได้ เช่น ผู้เข้าร่วม, วิทยากร, กรรมการ
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-300 text-xs font-black">
                    รวมทั้งสิ้น {totalQuantity} ใบ
                  </span>
                </div>
              </div>

              {/* Role Items Table / List */}
              <div className="space-y-2.5">
                {roleItems.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800"
                  >
                    <div className="flex-1 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        required
                        value={item.roleTitle}
                        onChange={(e) => handleRoleChange(idx, "roleTitle", e.target.value)}
                        placeholder="ชื่อบทบาท เช่น ผู้เข้าร่วมกิจกรรม, วิทยากร"
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden transition"
                      />
                    </div>

                    <div className="flex items-center gap-2 sm:w-48">
                      <div className="flex-1 flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleRoleChange(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full text-center text-xs font-bold text-slate-900 dark:text-white outline-hidden bg-transparent"
                        />
                        <span className="text-[11px] font-semibold text-slate-500">ใบ</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveRole(idx)}
                        disabled={roleItems.length <= 1}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition"
                        title="ลบรายการ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Add Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleAddRole("ผู้เข้าร่วมกิจกรรม")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  เพิ่มแถวบทบาท
                </button>
                <span className="text-[11px] text-slate-400 mx-1">บทบาทด่วน:</span>
                {PRESET_ROLES.slice(1, 5).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleAddRole(preset)}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 text-amber-700 dark:text-amber-300 text-[11px] font-medium transition"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={issuing || totalQuantity <= 0}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 rounded-2xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-sm font-bold shadow-lg shadow-amber-500/25 disabled:opacity-50 transition"
              >
                {issuing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    กำลังออกเลข...
                  </>
                ) : (
                  <>
                    <Award className="w-4 h-4" />
                    บันทึกและออกเลขเกียรติบัตร ({totalQuantity} ใบ)
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: History Table */}
      {activeTab === "history" && (
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-7 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-amber-500" />
                ประวัติการออกเลขทะเบียนเกียรติบัตร
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                รายการขอเลขเกียรติบัตรทั้งหมดในระบบ ({filteredHistory.length} รายการ)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหากิจกรรม, เลขที่, หรือผู้ขอ..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-hidden transition"
                />
              </div>

              <button
                type="button"
                onClick={fetchHistory}
                disabled={loadingHistory}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-4 h-4 ${loadingHistory ? "animate-spin text-amber-500" : ""}`} />
              </button>
            </div>
          </div>

          {/* History Data Table */}
          {filteredHistory.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Award className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                {searchQuery ? "ไม่พบข้อมูลที่ตรงกับคำค้นหา" : "ยังไม่มีประวัติการออกเลขเกียรติบัตร"}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={() => setActiveTab("issue")}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs"
                >
                  + ขอเลขเกียรติบัตรรายการแรก
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4 font-bold text-center w-12">ลำดับ</th>
                    <th className="py-3 px-4 font-bold min-w-[140px]">เลขที่เกียรติบัตร</th>
                    <th className="py-3 px-4 font-bold min-w-[220px]">ชื่อกิจกรรม / โครงการ</th>
                    <th className="py-3 px-4 font-bold min-w-[150px]">หน่วยงานผู้จัด</th>
                    <th className="py-3 px-4 font-bold min-w-[120px]">ผู้ขอเลข</th>
                    <th className="py-3 px-4 font-bold text-center w-24">จำนวน (ใบ)</th>
                    <th className="py-3 px-4 font-bold min-w-[180px]">รายละเอียดบทบาท</th>
                    <th className="py-3 px-4 font-bold text-center w-20">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {filteredHistory.map((item, index) => {
                    const breakdown = parseBreakdown(item.content);
                    const totalQty = breakdown.reduce((sum: number, line: string) => {
                      const m = line.match(/\((\d+)\s*ใบ\)/);
                      return sum + (m ? parseInt(m[1]) : 0);
                    }, 0) || item.quantity || 1;

                    return (
                      <tr key={item.id} className="hover:bg-amber-50/30 dark:hover:bg-amber-950/10 transition">
                        <td className="py-3 px-4 text-center text-slate-400 font-mono">
                          {index + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-xs">
                              {item.docNo}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(item.docNo, item.id)}
                              className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                              title="คัดลอกเลขที่"
                            >
                              {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {formatDocFullDate(item.date || item.createdAt)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white line-clamp-2">
                            {item.title}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {item.origin || "-"}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {item.requester || "-"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-300 font-black font-mono text-xs">
                            {totalQty}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {breakdown.slice(0, 2).map((line: string, bIdx: number) => (
                              <span key={bIdx} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-medium truncate max-w-[160px]">
                                {line}
                              </span>
                            ))}
                            {breakdown.length > 2 && (
                              <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                                +{breakdown.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedBatchDetail(item)}
                            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-white text-slate-600 dark:text-slate-300 transition"
                            title="ดูรายละเอียด"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedBatchDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      รายละเอียดการออกเลขเกียรติบัตร
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">
                      เลขที่: {selectedBatchDetail.docNo}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedBatchDetail(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="font-bold text-slate-500">ชื่อกิจกรรม / โครงการ:</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {selectedBatchDetail.title}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="font-bold text-slate-500">หน่วยงาน:</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{selectedBatchDetail.origin || "-"}</div>
                  </div>
                  <div>
                    <div className="font-bold text-slate-500">ผู้ขอเลข:</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{selectedBatchDetail.requester || "-"}</div>
                  </div>
                  <div>
                    <div className="font-bold text-slate-500">วันที่ออกเลข:</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{formatDocFullDate(selectedBatchDetail.date || selectedBatchDetail.createdAt)}</div>
                  </div>
                  <div>
                    <div className="font-bold text-slate-500">สถานะ:</div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">✓ ออกเลขเรียบร้อย</div>
                  </div>
                </div>

                {/* Roles breakdown */}
                {selectedBatchDetail.content && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="font-bold text-slate-700 dark:text-slate-300">
                      รายการแจกแจงเลขที่ตามบทบาท:
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {parseBreakdown(selectedBatchDetail.content).map((line: string, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 font-mono text-[11px] text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800">
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleCopy(selectedBatchDetail.docNo, "modal_copy")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-200 transition"
                >
                  {copiedId === "modal_copy" ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copiedId === "modal_copy" ? "คัดลอกแล้ว" : "คัดลอกเลขที่"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBatchDetail(null)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
