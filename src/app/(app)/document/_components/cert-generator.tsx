"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Printer, Plus, Trash2, Award, FileCheck, Calendar, Layers, Sparkles, CheckCircle2, ChevronDown, ChevronUp, Tag, FileText, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CertQrCode } from "@/features/document/ui/components/cert-qr-code";
import { issueActivityCertificatesBatch, getDocumentsList } from "@/app/actions/document";
import { useToast } from "@/components/toast-provider";
import { formatLeaveDate } from "@/lib/date-format";
import { useI18n } from "@/lib/i18n";

interface CertificateRoleItem {
  roleTitle: string;
  quantity: number;
}

interface CertificateBatchRecord {
  id: string;
  docNo: string;
  title: string;
  origin: string;
  date: string | Date;
  quantity: number;
  requester: string;
  content: string; // JSON role breakdown
  createdAt: string | Date;
}

export default function CertGenerator({ onBack }: { onBack: () => void }) {
  const { showToast } = useToast();
  const { lang } = useI18n();
  const [activeTab, setActiveTab] = useState<"batch_issue" | "print_individual">("batch_issue");

  // --- Batch Activity State ---
  const [activityTitle, setActivityTitle] = useState("");
  const [activityOrigin, setActivityOrigin] = useState("กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [requesterName, setRequesterName] = useState("");
  const [roleItems, setRoleItems] = useState<CertificateRoleItem[]>([
    { roleTitle: "เข้าร่วมกิจกรรม", quantity: 100 },
    { roleTitle: "วิทยากร", quantity: 15 },
    { roleTitle: "ผู้ช่วยวิทยากร", quantity: 20 },
  ]);
  const [issuing, setIssuing] = useState(false);
  const [issuedBatches, setIssuedBatches] = useState<any[]>([]);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

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

    setIssuing(true);
    try {
      const res = await issueActivityCertificatesBatch({
        title: activityTitle.trim(),
        origin: activityOrigin.trim(),
        date: issueDate,
        requester: requesterName || "ครูผู้รับผิดชอบโครงการ",
        items: validItems
      });

      if (res.success && res.data) {
        showToast("success", `ออกเลขเกียรติบัตรสำเร็จ! รวม ${totalQuantity} หมายเลข (${res.data.docNo})`);
        setActivityTitle("");
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
              ขอเลขเกียรติบัตรแบบรวมรายกิจกรรม (แยกตามหลายประเภท/บทบาท) หรือ ออกแบบพิมพ์เกียรติบัตร
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("batch_issue")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "batch_issue"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5 inline mr-1.5" />
            ขอเลขเกียรติบัตรรายกิจกรรม
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("print_individual")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "print_individual"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Printer className="w-3.5 h-3.5 inline mr-1.5" />
            พิมพ์เกียรติบัตร (A4 Landscape)
          </button>
        </div>
      </div>

      {/* ── TAB 1: ขอเลขเกียรติบัตรรายกิจกรรม (Activity Batch Issue) ──────── */}
      {activeTab === "batch_issue" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Request Form */}
          <div className="lg:col-span-6 space-y-6">
            <form onSubmit={handleSubmitBatch} className="bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/40 rounded-3xl p-6 shadow-sm space-y-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  ขอเลขเกียรติบัตรแบบกิจกรรม (หลายประเภท)
                </h3>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/50">
                  รวม {totalQuantity} หมายเลข
                </span>
              </div>

              {/* Activity Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  ชื่อกิจกรรม / โครงการ *
                </label>
                <input
                  type="text"
                  required
                  value={activityTitle}
                  onChange={(e) => setActivityTitle(e.target.value)}
                  placeholder="เช่น งานสัปดาห์วิทยาศาสตร์ ประจำปี 2569"
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none"
                />
              </div>

              {/* Department / Origin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    หน่วยงาน / กลุ่มสาระที่ขอ
                  </label>
                  <input
                    type="text"
                    required
                    value={activityOrigin}
                    onChange={(e) => setActivityOrigin(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
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

              {/* Role Items Breakdown Manager */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                    ประเภทบทบาทในกิจกรรม & จำนวนเลขที่ขอ *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddRoleItem}
                    className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    เพิ่มประเภทบทบาท
                  </button>
                </div>

                <div className="space-y-2.5">
                  {roleItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                      <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>
                      <input
                        type="text"
                        required
                        value={item.roleTitle}
                        onChange={(e) => handleRoleItemChange(idx, "roleTitle", e.target.value)}
                        placeholder="เช่น เข้าร่วมกิจกรรม, วิทยากร, ผู้ช่วยวิทยากร"
                        className="flex-1 h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 outline-none"
                      />
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-slate-500 font-medium">จำนวน:</span>
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleRoleItemChange(idx, "quantity", e.target.value)}
                          className="w-16 h-9 px-2 text-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 outline-none"
                        />
                        <span className="text-xs text-slate-500 font-medium">เลข</span>
                      </div>
                      {roleItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRoleItem(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition shrink-0 cursor-pointer"
                          title="ลบประเภทบทบาทนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Calculation Card */}
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-300">สรุปการออกเลขเกียรติบัตรรายกิจกรรม</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {roleItems.map(r => `${r.roleTitle || 'ระบุบทบาท'}: ${r.quantity} เลข`).join(" • ")}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-amber-600 dark:text-amber-400">{totalQuantity}</span>
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300 ml-1">หมายเลข</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={issuing || totalQuantity <= 0}
                className="w-full h-12 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white text-sm font-bold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Award className="w-5 h-5" />
                {issuing ? "กำลังออกเลขเกียรติบัตร..." : `ออกเลขเกียรติบัตรแบบรวม (${totalQuantity} หมายเลข)`}
              </button>
            </form>
          </div>

          {/* Right: Consolidated History List */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-500" />
                ประวัติการขอเลขเกียรติบัตร (รวมรายกิจกรรม)
              </h3>
              <span className="text-xs font-medium text-slate-500">
                {issuedBatches.length} กิจกรรม
              </span>
            </div>

            {issuedBatches.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-10 text-center text-slate-400 dark:text-slate-500">
                <Award className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-500" />
                <p className="text-sm font-semibold">ยังไม่มีประวัติการขอเลขเกียรติบัตร</p>
                <p className="text-xs mt-1">กรุณากรอกฟอร์มทางซ้ายมือเพื่อออกเลขเกียรติบัตรใหม่</p>
              </div>
            ) : (
              <div className="space-y-3">
                {issuedBatches.map((batch) => {
                  let breakdown: any[] = [];
                  try {
                    if (batch.content) breakdown = JSON.parse(batch.content);
                  } catch (e) {}

                  const isExpanded = expandedBatchId === batch.id;
                  const formattedDate = batch.date ? formatLeaveDate(batch.date, lang) : "-";

                  return (
                    <div key={batch.id} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 hover:border-amber-300 transition shadow-2xs space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-mono text-sm font-bold px-2.5 py-0.5 rounded-lg border ${
                              batch.status === "CANCELLED"
                                ? "line-through text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border-rose-200/60 decoration-rose-500 decoration-2"
                                : "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200/50"
                            }`}>
                              {batch.docNo}
                            </span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              รวม {batch.quantity || 1} หมายเลข
                            </span>
                            {batch.status === "CANCELLED" && (
                              <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                                ยกเลิกแล้ว
                              </span>
                            )}
                          </div>
                          <h4 className={`text-sm mt-2 ${batch.status === "CANCELLED" ? "line-through text-slate-400 dark:text-slate-500" : "font-bold text-slate-900 dark:text-white"}`}>
                            {batch.title}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {batch.origin} • วันที่ออก: {formattedDate} • ผู้ขอ: {batch.requester || "ไม่ระบุ"}
                          </p>
                        </div>

                        {breakdown.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedBatchId(isExpanded ? null : batch.id)}
                            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 text-slate-600 dark:text-slate-300 transition cursor-pointer shrink-0"
                            title="ดูรายละเอียดการแบ่งช่วงเลขตามบทบาท"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                      </div>

                      {/* Expanded Breakdown Table */}
                      {breakdown.length > 0 && (
                        <div className={`pt-2 border-t border-slate-100 dark:border-slate-800 ${isExpanded ? "block" : "hidden sm:block"}`}>
                          <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                            <Tag className="w-3 h-3 text-amber-500" />
                            การแบ่งช่วงเลขทะเบียนตามบทบาทในกิจกรรม:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {breakdown.map((b, bIdx) => (
                              <div key={bIdx} className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                                <div>
                                  <span className="font-bold text-slate-800 dark:text-slate-200">{b.roleTitle}</span>
                                  <span className="text-slate-400 text-[10px] ml-1">({b.quantity} เลข)</span>
                                </div>
                                <span className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400">
                                  {b.rangeText || b.startNo}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

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
                    value={printForm.date}
                    onChange={(e) => setPrintForm({ ...printForm, date: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2 focus:ring-rose-500/20 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">ชื่อผู้ลงนาม</label>
                  <input
                    type="text"
                    value={printForm.signatoryName}
                    onChange={(e) => setPrintForm({ ...printForm, signatoryName: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2 focus:ring-rose-500/20 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">ตำแหน่งผู้ลงนาม</label>
                  <input
                    type="text"
                    value={printForm.signatoryPosition}
                    onChange={(e) => setPrintForm({ ...printForm, signatoryPosition: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2 focus:ring-rose-500/20 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Right: Interactive Certificate Canvas Preview */}
            <div className="xl:col-span-8">
              <div
                id="print-certificate-area"
                className="w-full aspect-[1.414/1] bg-white border-[10px] border-double border-amber-600 p-8 sm:p-12 shadow-xl flex flex-col justify-between text-center relative overflow-hidden rounded-xl"
              >
                <div className="space-y-4">
                  <div className="flex justify-center mb-2">
                    <Award className="w-16 h-16 text-amber-500" />
                  </div>
                  <h3 className="text-amber-800 font-extrabold text-2xl sm:text-4xl tracking-wide uppercase">
                    โรงเรียนกุดจับประชาสรรค์
                  </h3>
                  <p className="text-amber-600 font-bold text-sm sm:text-base tracking-wider uppercase">
                    เกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า
                  </p>
                  <div className="py-2">
                    <h2 className="text-slate-900 font-black text-2xl sm:text-4xl border-b-2 border-amber-400/50 inline-block px-8 pb-1">
                      {printForm.name || "ชื่อ-นามสกุล"}
                    </h2>
                  </div>
                  <p className="text-slate-700 text-sm sm:text-lg max-w-xl mx-auto leading-relaxed pt-2">
                    {printForm.activity}
                  </p>
                </div>

                <div className="grid grid-cols-2 items-end pt-8">
                  <div className="text-left text-xs text-slate-500 space-y-1">
                    <CertQrCode value={`ID:${printForm.name}|Act:${printForm.activity}`} size={70} />
                    <p className="pt-1 text-[10px] text-slate-400">สแกน QR เพื่อตรวจสอบความถูกต้อง</p>
                  </div>

                  <div className="text-center space-y-1">
                    <p className="text-xs text-slate-600">ให้ไว้ ณ วันที่ {printForm.date}</p>
                    <div className="h-12 flex items-center justify-center">
                      <span className="font-serif italic text-slate-400 text-sm">(ลงชื่อ).....................................................</span>
                    </div>
                    <p className="font-bold text-sm text-slate-900">{printForm.signatoryName}</p>
                    <p className="text-xs text-slate-600">{printForm.signatoryPosition}</p>
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
