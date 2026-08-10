"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Printer, Plus, Trash2, Award, FileCheck, Calendar, Layers, Sparkles, CheckCircle2, ChevronDown, ChevronUp, Tag, FileText, Send, Eye, X, Trophy, Medal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { issueActivityCertificatesBatch, getDocumentsList } from "@/app/actions/document";
import { useToast } from "@/components/toast-provider";
import { formatLeaveDate } from "@/lib/date-format";
import { useI18n } from "@/lib/i18n";

interface CertificateRoleItem {
  roleTitle: string;
  quantity: number;
}

export default function CertGenerator({ onBack }: { onBack: () => void }) {
  const { showToast } = useToast();
  const { lang } = useI18n();
  const [activeTab, setActiveTab] = useState<"batch_issue" | "print_individual">("batch_issue");

  // --- Category / Mode Selector: General vs Competition ---
  const [issueCategory, setIssueCategory] = useState<"GENERAL" | "COMPETITION">("GENERAL");

  // --- Batch Activity State ---
  const [activityTitle, setActivityTitle] = useState("");
  const [competitionSubTitle, setCompetitionSubTitle] = useState("");
  const [activityOrigin, setActivityOrigin] = useState("กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [requesterName, setRequesterName] = useState("");
  
  // General Roles
  const [roleItems, setRoleItems] = useState<CertificateRoleItem[]>([
    { roleTitle: "เข้าร่วมกิจกรรม", quantity: 100 },
    { roleTitle: "วิทยากร", quantity: 15 },
    { roleTitle: "ผู้ช่วยวิทยากร", quantity: 20 },
  ]);

  const [issuing, setIssuing] = useState(false);
  const [issuedBatches, setIssuedBatches] = useState<any[]>([]);
  const [selectedDetailBatch, setSelectedDetailBatch] = useState<any | null>(null);

  // --- Individual Print State ---
  const [printForm, setPrintForm] = useState({
    name: "นายสมชาย ใจดี",
    activity: "ผ่านการฝึกอบรมการบริหารจัดการยุคดิจิทัล ระดับดีเยี่ยม",
    date: new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" }),
    signatoryName: "นายสมคิด ดีเลิศ",
    signatoryPosition: "ผู้อำนวยการโรงเรียนกุดจับประชาสรรค์"
  });

  const totalQuantity = roleItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  // Load history of issued certificates
  const fetchHistory = async () => {
    try {
      const res = await getDocumentsList({ docType: "CERTIFICATE" });
      if (res.success && Array.isArray(res.data)) {
        setIssuedBatches(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Preset Buttons for Competition Awards
  const COMPETITION_PRESETS = [
    { label: "🥇 ชนะเลิศอันดับที่ 1", title: "ชนะเลิศอันดับที่ 1", qty: 1 },
    { label: "🥈 รองชนะเลิศอันดับที่ 1", title: "รองชนะเลิศอันดับที่ 1", qty: 1 },
    { label: "🥉 รองชนะเลิศอันดับที่ 2", title: "รองชนะเลิศอันดับที่ 2", qty: 1 },
    { label: "🏅 รางวัลชมเชย", title: "รางวัลชมเชย", qty: 3 },
    { label: "🎗️ ผู้เข้าร่วมการแข่งขัน", title: "ผู้เข้าร่วมการแข่งขัน", qty: 50 },
    { label: "👨‍🏫 ครูผู้ฝึกสอน", title: "ครูผู้ฝึกสอน", qty: 5 },
  ];

  const handleAddPresetRole = (preset: { title: string; qty: number }) => {
    // Avoid duplicating exact role title if already present
    const exists = roleItems.some(r => r.roleTitle === preset.title);
    if (exists) {
      showToast("error", `มีบทบาท/รางวัล "${preset.title}" ในรายการแล้ว`);
      return;
    }
    setRoleItems(prev => [...prev, { roleTitle: preset.title, quantity: preset.qty }]);
  };

  // Add a new role breakdown row
  const handleAddRoleItem = () => {
    setRoleItems((prev) => [...prev, { roleTitle: "", quantity: 10 }]);
  };

  // Remove a role breakdown row
  const handleRemoveRoleItem = (index: number) => {
    if (roleItems.length <= 1) {
      showToast("error", "ต้องระบุอย่างน้อย 1 ประเภทเกียรติบัตร");
      return;
    }
    setRoleItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Update role title or quantity
  const handleRoleItemChange = (index: number, field: keyof CertificateRoleItem, value: any) => {
    setRoleItems((prev) => {
      const next = [...prev];
      if (field === "quantity") {
        next[index].quantity = Math.max(1, parseInt(value) || 1);
      } else {
        next[index].roleTitle = value;
      }
      return next;
    });
  };

  // Submit Activity Certificate Batch Request
  const handleSubmitBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (issuing) return;

    if (!activityTitle.trim()) {
      showToast("error", "กรุณากรอกชื่อกิจกรรม/โครงการ");
      return;
    }

    const validItems = roleItems.filter(it => it.roleTitle.trim() && it.quantity > 0);
    if (validItems.length === 0) {
      showToast("error", "กรุณาระบุประเภทเกียรติบัตรและจำนวนให้ถูกต้อง");
      return;
    }

    let finalTitle = activityTitle.trim();
    if (issueCategory === "COMPETITION" && competitionSubTitle.trim()) {
      finalTitle = `${activityTitle.trim()} (${competitionSubTitle.trim()})`;
    }

    setIssuing(true);
    try {
      const res = await issueActivityCertificatesBatch({
        title: finalTitle,
        origin: activityOrigin.trim(),
        date: issueDate,
        requester: requesterName || "ครูผู้รับผิดชอบโครงการ",
        items: validItems
      });

      if (res.success && res.data) {
        showToast("success", `ออกเลขเกียรติบัตรสำเร็จ! รวม ${totalQuantity} หมายเลข (${res.data.docNo})`);
        setActivityTitle("");
        setCompetitionSubTitle("");
        fetchHistory();
      } else {
        showToast("error", res.error || "เกิดข้อผิดพลาดในการออกเลขเกียรติบัตร");
      }
    } catch (err: any) {
      showToast("error", err.message || "เกิดข้อผิดพลาด");
    } finally {
      setIssuing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Dynamic inline styles for A4 landscape print orientation */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-certificate-area, #print-certificate-area * {
            visibility: visible;
          }
          #print-certificate-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 297mm;
            height: 210mm;
            margin: 0;
            padding: 20mm;
            box-sizing: border-box;
            background: white !important;
            border: 12px double #d97706 !important;
            box-shadow: none !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
          @page {
            size: A4 landscape;
            margin: 0;
          }
        }
      `}</style>

      {/* ── Top Toolbar ──────────────────────────────────────── */}
      <div className="print:hidden flex justify-between items-center gap-4 flex-wrap border-b border-slate-200/80 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs cursor-pointer"
            title="กลับไปหน้าเมนูหลัก"
          >
            <ArrowLeft className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              ระบบขอเลขและออกเกียรติบัตร (Certificates Management)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ขอเลขเกียรติบัตรแบบรวมรายกิจกรรม (แยกตามบทบาท/รางวัลการแข่งขัน) หรือ ออกแบบพิมพ์เกียรติบัตร
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700">
          <button
            onClick={() => setActiveTab("batch_issue")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "batch_issue"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Award className="w-4 h-4" />
            ขอเลขเกียรติบัตรรายกิจกรรม
          </button>

          <button
            onClick={() => setActiveTab("print_individual")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "print_individual"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Printer className="w-4 h-4" />
            พิมพ์เกียรติบัตร (A4 Landscape)
          </button>
        </div>
      </div>

      {/* ── TAB 1: ขอเลขเกียรติบัตรรายกิจกรรม (Activity Batch Issue) ──────── */}
      {activeTab === "batch_issue" && (
        <div className="space-y-8">
          {/* Top Form Section */}
          <form onSubmit={handleSubmitBatch} className="bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/40 rounded-3xl p-6 shadow-sm space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  ขอเลขเกียรติบัตรแบบรวม (แยกประเภทบทบาท / รางวัลการแข่งขัน)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ระบุรายละเอียดกิจกรรมเพื่ออกเลขเกียรติบัตรครั้งเดียวแบบรวมรายการ
                </p>
              </div>

              {/* Mode Toggle: General vs Competition */}
              <div className="flex bg-amber-50 dark:bg-amber-950/60 p-1 rounded-xl border border-amber-200/60 dark:border-amber-900/50 text-xs font-bold self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setIssueCategory("GENERAL");
                    setRoleItems([
                      { roleTitle: "เข้าร่วมกิจกรรม", quantity: 100 },
                      { roleTitle: "วิทยากร", quantity: 15 },
                      { roleTitle: "ผู้ช่วยวิทยากร", quantity: 20 },
                    ]);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    issueCategory === "GENERAL"
                      ? "bg-amber-500 text-white shadow-xs"
                      : "text-amber-800 dark:text-amber-300 hover:bg-amber-100"
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  เกียรติบัตรทั่วไป/บทบาท
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIssueCategory("COMPETITION");
                    setRoleItems([
                      { roleTitle: "ชนะเลิศอันดับที่ 1", quantity: 1 },
                      { roleTitle: "รองชนะเลิศอันดับที่ 1", quantity: 1 },
                      { roleTitle: "รองชนะเลิศอันดับที่ 2", quantity: 1 },
                      { roleTitle: "รางวัลชมเชย", quantity: 3 },
                      { roleTitle: "ผู้เข้าร่วมการแข่งขัน", quantity: 30 },
                    ]);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    issueCategory === "COMPETITION"
                      ? "bg-amber-500 text-white shadow-xs"
                      : "text-amber-800 dark:text-amber-300 hover:bg-amber-100"
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  เกียรติบัตรการแข่งขัน/รางวัล 🏆
                </button>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className={issueCategory === "COMPETITION" ? "md:col-span-6" : "md:col-span-12"}>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  ชื่อกิจกรรม / โครงการหลัก *
                </label>
                <input
                  type="text"
                  required
                  value={activityTitle}
                  onChange={(e) => setActivityTitle(e.target.value)}
                  placeholder={issueCategory === "COMPETITION" ? "เช่น งานสัปดาห์วิทยาศาสตร์ ประจำปี 2569" : "เช่น โครงการพัฒนาศักยภาพครูยุคดิจิทัล"}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none"
                />
              </div>

              {issueCategory === "COMPETITION" && (
                <div className="md:col-span-6">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    ชื่อรายการแข่งขัน / สาขาวิชา (ระบุเพิ่มเติม)
                  </label>
                  <input
                    type="text"
                    value={competitionSubTitle}
                    onChange={(e) => setCompetitionSubTitle(e.target.value)}
                    placeholder="เช่น การแข่งขันตอบคำถามวิทยาศาสตร์ ระดับ ม.ปลาย"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none"
                  />
                </div>
              )}

              <div className="md:col-span-6">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  หน่วยงาน / กลุ่มสาระการเรียนรู้ที่ขอ *
                </label>
                <input
                  type="text"
                  required
                  value={activityOrigin}
                  onChange={(e) => setActivityOrigin(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 outline-none"
                />
              </div>

              <div className="md:col-span-6">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  วันที่ออกเกียรติบัตร *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 opacity-0 absolute inset-0 z-10 cursor-pointer"
                  />
                  <div className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white flex items-center justify-between pointer-events-none">
                    <span>{formatLeaveDate(issueDate, lang) || issueDate}</span>
                    <Calendar className="w-4 h-4 text-amber-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Competition Preset Buttons */}
            {issueCategory === "COMPETITION" && (
              <div className="space-y-2 p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/40">
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <Medal className="w-4 h-4 text-amber-500" />
                  ทางลัดเพิ่มประเภทรางวัลการแข่งขัน:
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {COMPETITION_PRESETS.map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => handleAddPresetRole(preset)}
                      className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-amber-300/80 dark:border-amber-800 text-xs font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-50 transition cursor-pointer shadow-2xs"
                    >
                      + {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Role Items Breakdown Manager */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  {issueCategory === "COMPETITION" ? "🏆 รายการรางวัล & จำนวนเลขที่ขอ *" : "🏷️ รายการประเภทบทบาทในกิจกรรม & จำนวนเลขที่ขอ *"}
                </label>
                <button
                  type="button"
                  onClick={handleAddRoleItem}
                  className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  เพิ่มประเภทบทบาท/รางวัล
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {roleItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                    <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 text-[11px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    <input
                      type="text"
                      required
                      value={item.roleTitle}
                      onChange={(e) => handleRoleItemChange(idx, "roleTitle", e.target.value)}
                      placeholder={issueCategory === "COMPETITION" ? "เช่น ชนะเลิศอันดับที่ 1" : "เช่น เข้าร่วมกิจกรรม, วิทยากร"}
                      className="flex-1 h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 outline-none"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => handleRoleItemChange(idx, "quantity", e.target.value)}
                        className="w-14 h-8 px-1.5 text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 outline-none"
                      />
                      <span className="text-[11px] text-slate-400 font-medium">เลข</span>
                    </div>
                    {roleItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRoleItem(idx)}
                        className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition shrink-0 cursor-pointer"
                        title="ลบรายการนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Total Calculation Card & Submit Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30">
              <div>
                <p className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-500" />
                  สรุปรายการขอออกเลขเกียรติบัตร ({roleItems.length} หมวด)
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl truncate">
                  {roleItems.map(r => `${r.roleTitle || 'ระบุบทบาท'}: ${r.quantity} เลข`).join(" • ")}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-xl font-black text-amber-600 dark:text-amber-400">{totalQuantity}</span>
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300 ml-1">หมายเลข</span>
                </div>

                <button
                  type="submit"
                  disabled={issuing || totalQuantity <= 0}
                  className="h-11 px-5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white text-xs font-bold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Award className="w-4 h-4" />
                  {issuing ? "กำลังออกเลข..." : `ยืนยันออกเลขแบบรวม (${totalQuantity} หมายเลข)`}
                </button>
              </div>
            </div>
          </form>

          {/* Table View: History of Certificate Batches */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-500" />
                ประวัติการขอเลขเกียรติบัตรทั้งหมด ({issuedBatches.length} รายการ)
              </h3>
              <span className="text-xs font-medium text-slate-500">
                คลิกที่แถวรายการเพื่อดูรายละเอียดช่วงเลขย่อย
              </span>
            </div>

            {issuedBatches.length === 0 ? (
              <div className="p-12 text-center text-slate-400 dark:text-slate-500">
                <Award className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-500" />
                <p className="text-sm font-semibold">ยังไม่มีประวัติการขอเลขเกียรติบัตร</p>
                <p className="text-xs mt-1">กรุณากรอกฟอร์มด้านบนเพื่อออกเลขเกียรติบัตรใหม่</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">เลขทะเบียน (Range)</th>
                      <th className="py-3.5 px-4">ชื่อกิจกรรม / โครงการ</th>
                      <th className="py-3.5 px-4">รวมหมายเลข</th>
                      <th className="py-3.5 px-4">วันที่ออก</th>
                      <th className="py-3.5 px-4">หน่วยงาน / ผู้ขอ</th>
                      <th className="py-3.5 px-4 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {issuedBatches.map((batch) => {
                      const formattedDate = batch.date ? formatLeaveDate(batch.date, lang) : "-";
                      const isCancelled = batch.status === "CANCELLED";

                      return (
                        <tr
                          key={batch.id}
                          onClick={() => setSelectedDetailBatch(batch)}
                          className={`hover:bg-amber-50/40 dark:hover:bg-slate-800/50 transition cursor-pointer ${
                            isCancelled ? "bg-rose-50/40 dark:bg-rose-950/20 opacity-80" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                            <span className={isCancelled ? "line-through text-rose-600 decoration-rose-500 decoration-2" : ""}>
                              {batch.docNo}
                            </span>
                            {isCancelled && (
                              <span className="ml-2 text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-600">
                                ยกเลิก
                              </span>
                            )}
                          </td>
                          <td className={`py-3.5 px-4 max-w-xs truncate ${isCancelled ? "line-through text-slate-400" : "font-bold text-slate-800 dark:text-slate-200"}`}>
                            {batch.title}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-bold px-2 py-0.5 rounded-md bg-amber-100/70 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                              {batch.quantity || 1} เลข
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 font-medium whitespace-nowrap">
                            {formattedDate}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {batch.origin} ({batch.requester || "ไม่ระบุ"})
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDetailBatch(batch);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold hover:bg-amber-100 transition flex items-center gap-1.5 ml-auto cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              ดูรายละเอียด
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
        </div>
      )}

      {/* ── Certificate Breakdown Detail Modal ─────────────── */}
      <AnimatePresence>
        {selectedDetailBatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200">
                      {selectedDetailBatch.docNo}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      รวม {selectedDetailBatch.quantity || 1} หมายเลข
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-2">
                    {selectedDetailBatch.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedDetailBatch.origin} • ออกเมื่อ: {selectedDetailBatch.date ? formatLeaveDate(selectedDetailBatch.date, lang) : "-"} • ผู้ขอ: {selectedDetailBatch.requester || "ไม่ระบุ"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDetailBatch(null)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Breakdown Details Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-amber-500" />
                  การแบ่งช่วงเลขทะเบียนตามบทบาท/รางวัลในกิจกรรม:
                </h4>

                {(() => {
                  let breakdown: any[] = [];
                  try {
                    if (selectedDetailBatch.content) breakdown = JSON.parse(selectedDetailBatch.content);
                  } catch (e) {}

                  if (!Array.isArray(breakdown) || breakdown.length === 0) {
                    return (
                      <p className="text-xs text-slate-500 p-4 bg-slate-50 rounded-xl text-center">
                        ไม่มีข้อมูลการแบ่งช่วงย่อย
                      </p>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {breakdown.map((b, bIdx) => (
                        <div key={bIdx} className="bg-amber-50/60 dark:bg-amber-950/30 p-3.5 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-xs text-amber-900 dark:text-amber-200">{b.roleTitle}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-amber-200/50">
                              {b.quantity} เลข
                            </span>
                          </div>
                          <div className="font-mono text-xs font-bold text-amber-700 dark:text-amber-300 pt-1">
                            {b.rangeText || (b.startNo === b.endNo ? b.startNo : `${b.startNo} - ${b.endNo}`)}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedDetailBatch(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── TAB 2: พิมพ์เกียรติบัตร (A4 Landscape Print Preview) ─────────── */}
      {activeTab === "print_individual" && (
        <div>
          <div className="print:hidden flex justify-end pb-3">
            <button
              onClick={handlePrint}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-4.5 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 shrink-0"
            >
              <Printer className="w-4 h-4" />
              สั่งพิมพ์เกียรติบัตร (A4 Landscape)
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left: Individual Print Form */}
            <div className="print:hidden xl:col-span-4 space-y-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-4">
                <h4 className="text-sm font-extrabold text-slate-850 dark:text-white pb-2 border-b border-slate-50 dark:border-slate-800 flex items-center gap-1.5">
                  <FileCheck className="w-4.5 h-4.5 text-rose-500" />
                  กรอกข้อมูลพิมพ์เกียรติบัตรรายบุคคล
                </h4>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">ชื่อผู้รับเกียรติบัตร</label>
                  <input
                    type="text"
                    required
                    value={printForm.name}
                    onChange={(e) => setPrintForm({ ...printForm, name: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all outline-none"
                    placeholder="ชื่อ-นามสกุล"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">ข้อความกิจกรรม / เหตุผลในการมอบ</label>
                  <textarea
                    rows={3}
                    required
                    value={printForm.activity}
                    onChange={(e) => setPrintForm({ ...printForm, activity: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all outline-none resize-none"
                    placeholder="รายละเอียดกิจกรรม..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">วันที่ออกเกียรติบัตร</label>
                  <input
                    type="text"
                    required
                    value={printForm.date}
                    onChange={(e) => setPrintForm({ ...printForm, date: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all outline-none"
                    placeholder="เช่น ๑๕ มกราคม ๒๕๖๙"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">ชื่อผู้ลงนาม</label>
                  <input
                    type="text"
                    required
                    value={printForm.signatoryName}
                    onChange={(e) => setPrintForm({ ...printForm, signatoryName: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all outline-none"
                    placeholder="ชื่อ-นามสกุล ผู้ลงนาม"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">ตำแหน่งผู้ลงนาม</label>
                  <input
                    type="text"
                    required
                    value={printForm.signatoryPosition}
                    onChange={(e) => setPrintForm({ ...printForm, signatoryPosition: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all outline-none"
                    placeholder="ตำแหน่ง"
                  />
                </div>
              </div>
            </div>

            {/* Right: A4 Certificate Preview */}
            <div className="print:w-full print:m-0 xl:col-span-8 flex justify-center">
              <div
                id="print-certificate-area"
                className="w-full max-w-[297mm] aspect-[297/210] bg-white rounded-3xl border-8 border-double border-amber-600/80 p-8 sm:p-12 shadow-2xl flex flex-col justify-between text-center relative overflow-hidden text-slate-900"
              >
                {/* Certificate Background Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:16px_16px] opacity-5 pointer-events-none" />

                {/* Header Logo & School Name */}
                <div className="space-y-2 pt-2 relative z-10">
                  <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center text-amber-600 font-extrabold text-xl shadow-xs">
                    KP
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-amber-900 tracking-wide font-serif">
                    โรงเรียนกุดจับประชาสรรค์
                  </h1>
                  <p className="text-xs sm:text-sm font-bold text-amber-700 tracking-widest uppercase">
                    Kutchapprachasan School Certificate of Achievement
                  </p>
                </div>

                {/* Body Content */}
                <div className="space-y-4 my-auto py-6 relative z-10">
                  <p className="text-sm sm:text-base font-semibold text-slate-600">
                    เกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า
                  </p>

                  <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 underline decoration-amber-500 decoration-2 underline-offset-8">
                    {printForm.name || "ชื่อ-นามสกุล"}
                  </h2>

                  <p className="text-sm sm:text-base text-slate-700 leading-relaxed max-w-2xl mx-auto pt-2">
                    {printForm.activity || "รายละเอียดกิจกรรม..."}
                  </p>

                  <p className="text-xs sm:text-sm font-semibold text-slate-500 pt-2">
                    ให้ไว้ ณ วันที่ {printForm.date || "-"}
                  </p>
                </div>

                {/* Footer Signatory Section */}
                <div className="flex justify-between items-end pt-6 border-t border-amber-200/60 relative z-10">
                  <div className="text-left">
                    <CertQrCode url={`https://kpschool.ac.th/verify-cert?id=DEMO`} size={56} />
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">Verify ID: DEMO-CERT</p>
                  </div>

                  <div className="text-center space-y-1">
                    <div className="h-10 flex items-end justify-center">
                      <span className="font-serif italic text-lg text-slate-400 opacity-60">(ลายเซ็นดิจิทัล)</span>
                    </div>
                    <p className="text-sm font-extrabold text-slate-900">({printForm.signatoryName || "ผู้ลงนาม"})</p>
                    <p className="text-xs font-semibold text-slate-600">{printForm.signatoryPosition || "ตำแหน่ง"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
