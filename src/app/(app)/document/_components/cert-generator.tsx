"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  ArrowLeft, Printer, Plus, Trash2, Award, FileCheck, Calendar, Layers, 
  Sparkles, CheckCircle2, ChevronDown, ChevronUp, Tag, FileText, Send, Eye, 
  X, Trophy, Medal, Search, Copy, Sliders, Download, Check, ExternalLink, 
  FileSpreadsheet, BookOpen, ShieldCheck, Filter, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { issueActivityCertificatesBatch, getDocumentsList } from "@/app/actions/document";
import { useToast } from "@/components/toast-provider";
import { formatLeaveDate } from "@/lib/date-format";
import { useI18n } from "@/lib/i18n";

interface CertificateRoleItem {
  roleTitle: string;
  quantity: number;
}

function CertQrCode({ url, size = 56 }: { url: string; size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="bg-white p-1 rounded-lg border border-amber-300 shadow-2xs flex items-center justify-center shrink-0"
    >
      <svg viewBox="0 0 24 24" className="w-full h-full text-slate-900" fill="currentColor">
        <path d="M2,2H10V10H2V2M4,4V8H8V4H4M14,2H22V10H14V2M16,4V8H20V4H16M2,14H10V22H2V14M4,16V20H8V16H4M14,14H16V16H14V14M18,14H20V16H18V14M20,16H22V18H20V16M14,18H16V20H14V18M16,20H18V22H16V20M18,18H20V20H18V18M20,20H22V22H20V20Z" />
      </svg>
    </div>
  );
}

export default function CertGenerator({ onBack }: { onBack: () => void }) {
  const { showToast } = useToast();
  const { lang } = useI18n();
  const [activeTab, setActiveTab] = useState<"batch_issue" | "print_individual" | "history">("batch_issue");

  // --- Category Selector (4 Options) ---
  const [issueCategory, setIssueCategory] = useState<"GENERAL" | "COMPETITION" | "STAFF" | "MERIT">("GENERAL");

  // --- Batch Activity State ---
  const [activityTitle, setActivityTitle] = useState("");
  const [competitionSubTitle, setCompetitionSubTitle] = useState("");
  const [activityOrigin, setActivityOrigin] = useState("กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [requesterName, setRequesterName] = useState("");
  const [customPrefix, setCustomPrefix] = useState("");
  
  // Role Items
  const [roleItems, setRoleItems] = useState<CertificateRoleItem[]>([
    { roleTitle: "เข้าร่วมกิจกรรม", quantity: 100 },
    { roleTitle: "วิทยากร", quantity: 15 },
    { roleTitle: "ผู้ช่วยวิทยากร", quantity: 20 },
  ]);

  const [issuing, setIssuing] = useState(false);
  const [issuedBatches, setIssuedBatches] = useState<any[]>([]);
  const [selectedDetailBatch, setSelectedDetailBatch] = useState<any | null>(null);
  const [copiedBatchId, setCopiedBatchId] = useState<string | null>(null);

  // History Filter State
  const [historySearch, setHistorySearch] = useState("");
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState("ALL");

  // --- Individual Print & Theme State ---
  const [certTheme, setCertTheme] = useState<"ROYAL_GOLD" | "CLASSIC_NAVY" | "PURPLE_ELEGANCE" | "EMERALD_HONOR">("ROYAL_GOLD");
  const [printForm, setPrintForm] = useState({
    name: "นายสมชาย ใจดี",
    activity: "ผ่านการฝึกอบรมการบริหารจัดการยุคดิจิทัล ระดับดีเยี่ยม",
    date: new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" }),
    signatoryName: "นายสมคิด ดีเลิศ",
    signatoryPosition: "ผู้อำนวยการโรงเรียนกุดจับประชาสรรค์",
    certNo: "กป.กบ ๐๐๑/๒๕๖๙"
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

  const getCertCount = (batch: any): number => {
    if (typeof batch?.quantity === "number" && batch.quantity > 0) {
      return batch.quantity;
    }
    if (!batch?.docNo) return 1;

    const match = String(batch.docNo).match(/^(\d+)-(\d+)/);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = parseInt(match[2], 10);
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        return end - start + 1;
      }
    }

    if (batch.content) {
      try {
        const items = JSON.parse(batch.content);
        if (Array.isArray(items)) {
          const sum = items.reduce((acc: number, it: any) => acc + (Number(it.quantity) || 0), 0);
          if (sum > 0) return sum;
        }
      } catch (e) {
        const leafMatches = String(batch.content).matchAll(/\((\d+)\s*ใบ\)/g);
        let sum = 0;
        for (const m of leafMatches) {
          sum += parseInt(m[1], 10) || 0;
        }
        if (sum > 0) return sum;
      }
    }

    return 1;
  };

  // Preset Role Packages Shortcuts
  const PACKAGE_PRESETS = [
    {
      name: "🎓 ชุดกิจกรรมอบรมพัฒนาครู",
      desc: "วิทยากร 5 ใบ • คณะทำงาน 15 ใบ • ผู้เข้าร่วม 100 ใบ",
      items: [
        { roleTitle: "เข้าร่วมการอบรม", quantity: 100 },
        { roleTitle: "วิทยากรบรรยาย", quantity: 5 },
        { roleTitle: "คณะทำงานผู้จัดกิจกรรม", quantity: 15 },
      ]
    },
    {
      name: "🏆 ชุดแข่งขันทักษะวิชาการ",
      desc: "ชนะเลิศ (1) • รองอันดับหนึ่ง (1) • รองอันดับสอง (1) • ชมเชย (3) • ครูผู้ฝึกสอน (5) • ผู้แข่งขัน (30)",
      items: [
        { roleTitle: "รางวัลชนะเลิศอันดับที่ 1", quantity: 1 },
        { roleTitle: "รางวัลรองชนะเลิศอันดับที่ 1", quantity: 1 },
        { roleTitle: "รางวัลรองชนะเลิศอันดับที่ 2", quantity: 1 },
        { roleTitle: "รางวัลชมเชย", quantity: 3 },
        { roleTitle: "ครูผู้ฝึกสอนนักเรียน", quantity: 5 },
        { roleTitle: "ผู้เข้าร่วมการแข่งขัน", quantity: 30 },
      ]
    },
    {
      name: "👨‍🏫 ชุดปฏิบัติราชการ/ครูดีเด่น",
      desc: "ผ่านการประเมิน 20 ใบ • กรรมการประเมิน 5 ใบ",
      items: [
        { roleTitle: "ผ่านการประเมินการปฏิบัติงานระดับดีเยี่ยม", quantity: 20 },
        { roleTitle: "คณะกรรมการประเมินผลงาน", quantity: 5 },
      ]
    },
    {
      name: "🎖️ ชุดกิจกรรมนักเรียน & คุณธรรม",
      desc: "คณะกรรมการสภานักเรียน 15 ใบ • ผู้ผ่านกิจกรรม 200 ใบ",
      items: [
        { roleTitle: "คณะกรรมการสภานักเรียน", quantity: 15 },
        { roleTitle: "ผู้ผ่านกิจกรรมบำเพ็ญประโยชน์", quantity: 200 },
      ]
    }
  ];

  const handleApplyPackagePreset = (pkg: typeof PACKAGE_PRESETS[0]) => {
    setRoleItems(pkg.items);
    showToast("success", `นำเข้าแม่แบบ "${pkg.name}" เรียบร้อยแล้ว`);
  };

  const handleAddRoleItem = () => {
    setRoleItems((prev) => [...prev, { roleTitle: "", quantity: 10 }]);
  };

  const handleRemoveRoleItem = (index: number) => {
    if (roleItems.length <= 1) {
      showToast("error", "ต้องระบุอย่างน้อย 1 ประเภทเกียรติบัตร");
      return;
    }
    setRoleItems((prev) => prev.filter((_, i) => i !== index));
  };

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

    if (customPrefix.trim()) {
      finalTitle = `[${customPrefix.trim()}] ${finalTitle}`;
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
        setCustomPrefix("");
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

  const handleCopyReference = (batch: any) => {
    const thaiDateStr = batch.date
      ? new Date(batch.date).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })
      : "";
    const refText = `ที่ ${batch.docNo} ลงวันที่ ${thaiDateStr} เรื่อง ${batch.title}`;
    navigator.clipboard.writeText(refText);
    setCopiedBatchId(batch.id);
    showToast("success", "คัดลอกข้อความอ้างอิงเรียบร้อยแล้ว!");
    setTimeout(() => setCopiedBatchId(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    return issuedBatches.filter((b) => {
      const matchSearch =
        !historySearch.trim() ||
        (b.title || "").toLowerCase().includes(historySearch.toLowerCase()) ||
        (b.docNo || "").toLowerCase().includes(historySearch.toLowerCase()) ||
        (b.origin || "").toLowerCase().includes(historySearch.toLowerCase());

      const matchCategory =
        historyCategoryFilter === "ALL" ||
        (historyCategoryFilter === "COMPETITION" && (b.title || "").includes("(")) ||
        (historyCategoryFilter === "GENERAL" && !(b.title || "").includes("("));

      return matchSearch && matchCategory;
    });
  }, [issuedBatches, historySearch, historyCategoryFilter]);

  // Overall Stats
  const totalCertificatesCount = useMemo(() => {
    return issuedBatches.reduce((sum, b) => sum + getCertCount(b), 0);
  }, [issuedBatches]);

  // Theme Styles for Print Certificate Canvas
  const THEME_STYLES = {
    ROYAL_GOLD: {
      border: "border-amber-600/80",
      accentBg: "bg-amber-500/10",
      accentText: "text-amber-900",
      subText: "text-amber-700",
      underline: "decoration-amber-500",
      badgeBg: "bg-amber-500",
      headerFont: "font-serif",
      titleColor: "text-amber-900",
    },
    CLASSIC_NAVY: {
      border: "border-sky-900/80",
      accentBg: "bg-sky-900/10",
      accentText: "text-sky-950",
      subText: "text-sky-800",
      underline: "decoration-sky-600",
      badgeBg: "bg-sky-900",
      headerFont: "font-serif",
      titleColor: "text-sky-950",
    },
    PURPLE_ELEGANCE: {
      border: "border-purple-600/80",
      accentBg: "bg-purple-500/10",
      accentText: "text-purple-950",
      subText: "text-purple-700",
      underline: "decoration-purple-500",
      badgeBg: "bg-purple-600",
      headerFont: "font-serif",
      titleColor: "text-purple-950",
    },
    EMERALD_HONOR: {
      border: "border-emerald-600/80",
      accentBg: "bg-emerald-500/10",
      accentText: "text-emerald-950",
      subText: "text-emerald-700",
      underline: "decoration-emerald-500",
      badgeBg: "bg-emerald-600",
      headerFont: "font-serif",
      titleColor: "text-emerald-950",
    },
  };

  const currentThemeStyle = THEME_STYLES[certTheme];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Dynamic inline styles for A4 landscape print orientation */}
      <style jsx global>{`
        @media print {
          html, body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #print-certificate-area, #print-certificate-area * {
            visibility: visible;
          }
          #print-certificate-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
            margin: 0 !important;
            padding: 12mm 16mm !important;
            box-sizing: border-box !important;
            background: white !important;
            border: 10px double #d97706 !important;
            box-shadow: none !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 landscape;
            margin: 0;
          }
        }
      `}</style>

      {/* ── Top Header Banner & Stats ────────────────────────────── */}
      <div className="print:hidden bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 dark:from-amber-950 dark:via-amber-900 dark:to-yellow-950 text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden space-y-5">
        <div className="absolute -right-8 -bottom-8 w-56 h-56 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center transition cursor-pointer shrink-0"
              title="กลับไปหน้าเมนูหลัก"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider backdrop-blur-md">
                  Certificate System Management
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-2">
                <Award className="w-6 h-6 text-yellow-300" />
                ศูนย์ขอเลขและออกแบบเกียรติบัตรออนไลน์
              </h2>
            </div>
          </div>

          {/* Quick Nav Tabs */}
          <div className="flex bg-white/15 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 self-start md:self-auto shrink-0">
            <button
              onClick={() => setActiveTab("batch_issue")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "batch_issue"
                  ? "bg-white text-amber-900 shadow-md scale-102"
                  : "text-white/90 hover:text-white hover:bg-white/10"
              }`}
            >
              <Award className="w-4 h-4" />
              ขอเลขเกียรติบัตรแบบรวม
            </button>

            <button
              onClick={() => setActiveTab("print_individual")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "print_individual"
                  ? "bg-white text-amber-900 shadow-md scale-102"
                  : "text-white/90 hover:text-white hover:bg-white/10"
              }`}
            >
              <Printer className="w-4 h-4" />
              ออกแบบ & พิมพ์เกียรติบัตร
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "history"
                  ? "bg-white text-amber-900 shadow-md scale-102"
                  : "text-white/90 hover:text-white hover:bg-white/10"
              }`}
            >
              <Layers className="w-4 h-4" />
              ประวัติคุมเลข ({issuedBatches.length})
            </button>
          </div>
        </div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 relative z-10">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 flex items-center justify-between">
            <div>
              <p className="text-[10.5px] font-bold text-amber-100 uppercase">ยอดรวมเลขเกียรติบัตร</p>
              <p className="text-xl font-black text-white mt-0.5">{totalCertificatesCount.toLocaleString()} ใบ</p>
            </div>
            <Award className="w-7 h-7 text-yellow-300 opacity-80" />
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 flex items-center justify-between">
            <div>
              <p className="text-[10.5px] font-bold text-amber-100 uppercase">โครงการที่ออกเลขปีนี้</p>
              <p className="text-xl font-black text-white mt-0.5">{issuedBatches.length} โครงการ</p>
            </div>
            <FileSpreadsheet className="w-7 h-7 text-yellow-300 opacity-80" />
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 flex items-center justify-between">
            <div>
              <p className="text-[10.5px] font-bold text-amber-100 uppercase">หมวดหมู่เกียรติบัตร</p>
              <p className="text-xl font-black text-white mt-0.5">4 หมวดหลัก</p>
            </div>
            <Trophy className="w-7 h-7 text-yellow-300 opacity-80" />
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 flex items-center justify-between">
            <div>
              <p className="text-[10.5px] font-bold text-amber-100 uppercase">ระบบพิมพ์เกียรติบัตร</p>
              <p className="text-xs font-bold text-emerald-200 mt-1">● พร้อมพิมพ์ A4 Landscape</p>
            </div>
            <Printer className="w-7 h-7 text-yellow-300 opacity-80" />
          </div>
        </div>
      </div>

      {/* ── TAB 1: ขอเลขเกียรติบัตรรายกิจกรรม (Bulk Certificate Numbering) ──────── */}
      {activeTab === "batch_issue" && (
        <div className="space-y-8">
          {/* Top Form Section */}
          <form onSubmit={handleSubmitBatch} className="bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/50 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    ขอออกเลขทะเบียนเกียรติบัตรแบบรวม (Bulk Certificate Generator)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  กรอกรายละเอียดโครงการและกำหนดประเภทบทบาท/รางวัล เพื่อออกเลขคุมทะเบียนรวดเร็วในครั้งเดียว
                </p>
              </div>

              {/* Category Selector 4 Options */}
              <div className="flex flex-wrap bg-amber-50/80 dark:bg-amber-950/60 p-1.5 rounded-2xl border border-amber-200/60 dark:border-amber-900/50 text-xs font-bold gap-1">
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
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                    issueCategory === "GENERAL"
                      ? "bg-amber-500 text-white shadow-xs"
                      : "text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  ทั่วไป/บทบาท
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIssueCategory("COMPETITION");
                    setRoleItems([
                      { roleTitle: "รางวัลชนะเลิศอันดับที่ 1", quantity: 1 },
                      { roleTitle: "รางวัลรองชนะเลิศอันดับที่ 1", quantity: 1 },
                      { roleTitle: "รางวัลรองชนะเลิศอันดับที่ 2", quantity: 1 },
                      { roleTitle: "รางวัลชมเชย", quantity: 3 },
                      { roleTitle: "ครูผู้ฝึกสอนนักเรียน", quantity: 5 },
                      { roleTitle: "ผู้เข้าร่วมการแข่งขัน", quantity: 30 },
                    ]);
                  }}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                    issueCategory === "COMPETITION"
                      ? "bg-amber-500 text-white shadow-xs"
                      : "text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  การแข่งขัน/รางวัล 🏆
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIssueCategory("STAFF");
                    setRoleItems([
                      { roleTitle: "ผ่านการอบรมพัฒนาตนเอง", quantity: 50 },
                      { roleTitle: "คณะกรรมการดำเนินงาน", quantity: 10 },
                    ]);
                  }}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                    issueCategory === "STAFF"
                      ? "bg-amber-500 text-white shadow-xs"
                      : "text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                  }`}
                >
                  <Medal className="w-3.5 h-3.5" />
                  ผลงานครู/บุคลากร
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIssueCategory("MERIT");
                    setRoleItems([
                      { roleTitle: "นักเรียนดีเด่นด้านคุณธรรม", quantity: 20 },
                      { roleTitle: "คณะกรรมการสภานักเรียน", quantity: 15 },
                      { roleTitle: "ผู้ผ่านกิจกรรมจิตอาสา", quantity: 150 },
                    ]);
                  }}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                    issueCategory === "MERIT"
                      ? "bg-amber-500 text-white shadow-xs"
                      : "text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  คุณธรรม/กิจกรรมนักเรียน
                </button>
              </div>
            </div>

            {/* Quick Package Presets Bar */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-950/40 border border-amber-200/70 dark:border-amber-900/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  ทางลัดเลือกชุดแม่แบบสำเร็จรูป (Quick Starter Packages):
                </span>
                <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                  คลิกเพื่อโหลดโครงสร้างบทบาทอัตโนมัติ
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
                {PACKAGE_PRESETS.map((pkg, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPackagePreset(pkg)}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-800/60 hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/60 transition text-left cursor-pointer shadow-2xs group"
                  >
                    <p className="text-xs font-bold text-amber-950 dark:text-amber-200 group-hover:text-amber-600 transition">
                      {pkg.name}
                    </p>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                      {pkg.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Form Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className={issueCategory === "COMPETITION" ? "md:col-span-6" : "md:col-span-8"}>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  ชื่อกิจกรรม / โครงการหลัก *
                </label>
                <input
                  type="text"
                  required
                  value={activityTitle}
                  onChange={(e) => setActivityTitle(e.target.value)}
                  placeholder={
                    issueCategory === "COMPETITION"
                      ? "เช่น งานสัปดาห์วิทยาศาสตร์ ประจำปี 2569"
                      : issueCategory === "STAFF"
                      ? "เช่น การอบรมเชิงปฏิบัติการพัฒนาหลักสูตรสถานศึกษา"
                      : issueCategory === "MERIT"
                      ? "เช่น โครงการส่งเสริมคุณธรรมจริยธรรมนักเรียน"
                      : "เช่น โครงการพัฒนาศักยภาพครูยุคดิจิทัล"
                  }
                  className="w-full h-10.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none"
                />
              </div>

              {issueCategory === "COMPETITION" ? (
                <div className="md:col-span-6">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    ชื่อรายการแข่งขัน / สาขาวิชา (ระบุเพิ่มเติม)
                  </label>
                  <input
                    type="text"
                    value={competitionSubTitle}
                    onChange={(e) => setCompetitionSubTitle(e.target.value)}
                    placeholder="เช่น การแข่งขันตอบคำถามวิทยาศาสตร์ ระดับ ม.ปลาย"
                    className="w-full h-10.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none"
                  />
                </div>
              ) : (
                <div className="md:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    รหัสคำนำหน้าเฉพาะโครงการ (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    value={customPrefix}
                    onChange={(e) => setCustomPrefix(e.target.value)}
                    placeholder="เช่น SCI-2569 หรือ ACAD"
                    className="w-full h-10.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 outline-none"
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
                  className="w-full h-10.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 outline-none"
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
                    className="w-full h-10.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 opacity-0 absolute inset-0 z-10 cursor-pointer"
                  />
                  <div className="w-full h-10.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white flex items-center justify-between pointer-events-none">
                    <span>{formatLeaveDate(issueDate, lang) || issueDate}</span>
                    <Calendar className="w-4 h-4 text-amber-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Role & Quantity Manager */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  {issueCategory === "COMPETITION"
                    ? "🏆 รายการรางวัล & จำนวนเลขที่ขอ *"
                    : "🏷️ รายการประเภทบทบาทในกิจกรรม & จำนวนเลขที่ขอ *"}
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
                  <div key={idx} className="flex items-center gap-2 bg-slate-50/80 dark:bg-slate-950 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="w-5.5 h-5.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 text-[11px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    <input
                      type="text"
                      required
                      value={item.roleTitle}
                      onChange={(e) => handleRoleItemChange(idx, "roleTitle", e.target.value)}
                      placeholder={
                        issueCategory === "COMPETITION"
                          ? "เช่น รางวัลชนะเลิศอันดับที่ 1"
                          : "เช่น เข้าร่วมกิจกรรม, วิทยากร"
                      }
                      className="flex-1 h-8.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 outline-none"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => handleRoleItemChange(idx, "quantity", e.target.value)}
                        className="w-14 h-8.5 px-1.5 text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 outline-none"
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40">
              <div>
                <p className="text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4.5 h-4.5 text-amber-500" />
                  สรุปรายการขอออกเลขเกียรติบัตร ({roleItems.length} หมวดรายการ)
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl truncate">
                  {roleItems.map(r => `${r.roleTitle || 'ระบุบทบาท'}: ${r.quantity} เลข`).join(" • ")}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{totalQuantity}</span>
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 ml-1">หมายเลข</span>
                </div>

                <button
                  type="submit"
                  disabled={issuing || totalQuantity <= 0}
                  className="h-11 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Award className="w-4.5 h-4.5" />
                  {issuing ? "กำลังออกเลข..." : `ยืนยันออกเลขแบบรวม (${totalQuantity} หมายเลข)`}
                </button>
              </div>
            </div>
          </form>

          {/* Quick Table Preview: Recent History */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-500" />
                ประวัติการขอออกเลขเกียรติบัตรล่าสุด
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className="text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-1 cursor-pointer"
              >
                ดูประวัติคุมเลขทั้งหมด ({issuedBatches.length} รายการ) →
              </button>
            </div>

            {issuedBatches.length === 0 ? (
              <div className="p-10 text-center text-slate-400 dark:text-slate-500">
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
                    {issuedBatches.slice(0, 5).map((batch) => {
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
                            <span className="font-bold px-2.5 py-1 rounded-lg bg-amber-100/70 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                              {getCertCount(batch)} เลข
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 font-medium whitespace-nowrap">
                            {formattedDate}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {batch.origin} ({batch.requester || "ไม่ระบุ"})
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center gap-1.5 justify-end">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyReference(batch);
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-slate-700 dark:text-slate-300 font-bold transition flex items-center gap-1 cursor-pointer"
                                title="คัดลอกข้อความอ้างอิง"
                              >
                                {copiedBatchId === batch.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDetailBatch(batch);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold hover:bg-amber-100 transition flex items-center gap-1.5 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                ดูรายละเอียด
                              </button>
                            </div>
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

      {/* ── TAB 2: ออกแบบ & พิมพ์เกียรติบัตรรายบุคคล (A4 Live Certificate Canvas) ── */}
      {activeTab === "print_individual" && (
        <div className="space-y-6">
          {/* Top Controls Header */}
          <div className="print:hidden bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-500" />
                ออกแบบและพิมพ์เกียรติบัตรรายบุคคล (A4 Landscape Preview)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                เลือกธีมกรอบลายเกียรติบัตร กรอกข้อมูล และกดสั่งพิมพ์ผ่านเบราว์เซอร์ได้ทันที
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={handlePrint}
                className="w-full md:w-auto text-xs bg-amber-500 hover:bg-amber-600 text-white font-extrabold px-5 py-2.5 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 shrink-0"
              >
                <Printer className="w-4 h-4" />
                พิมพ์เกียรติบัตร (A4 Landscape)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left: Certificate Theme & Form Controls */}
            <div className="print:hidden xl:col-span-4 space-y-5">
              {/* Theme Frame Selector */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-amber-500" />
                  เลือกธีมและกรอบเกียรติบัตร (Theme Frame):
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCertTheme("ROYAL_GOLD")}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      certTheme === "ROYAL_GOLD"
                        ? "bg-amber-50 border-amber-500 ring-2 ring-amber-500/20"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-amber-500 inline-block mr-1.5" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Royal Gold</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">ขอบทองคำลายไทย</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCertTheme("CLASSIC_NAVY")}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      certTheme === "CLASSIC_NAVY"
                        ? "bg-sky-50 border-sky-600 ring-2 ring-sky-500/20"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-sky-800 inline-block mr-1.5" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Classic Navy</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">ขอบน้ำเงินสถาบัน</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCertTheme("PURPLE_ELEGANCE")}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      certTheme === "PURPLE_ELEGANCE"
                        ? "bg-purple-50 border-purple-500 ring-2 ring-purple-500/20"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-purple-600 inline-block mr-1.5" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Purple Elegance</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">ขอบม่วงพรีเมียม</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCertTheme("EMERALD_HONOR")}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      certTheme === "EMERALD_HONOR"
                        ? "bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/20"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block mr-1.5" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Emerald Honor</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">ขอบเขียวมรกต</p>
                  </button>
                </div>
              </div>

              {/* Form Input Data */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <h4 className="text-xs font-extrabold text-slate-850 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-amber-500" />
                  กรอกข้อมูลบนเกียรติบัตร
                </h4>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">เลขทะเบียนเกียรติบัตร</label>
                  <input
                    type="text"
                    value={printForm.certNo}
                    onChange={(e) => setPrintForm({ ...printForm, certNo: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"
                    placeholder="เช่น กป.กบ ๐๐๑/๒๕๖๙"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">ชื่อผู้รับเกียรติบัตร *</label>
                  <input
                    type="text"
                    required
                    value={printForm.name}
                    onChange={(e) => setPrintForm({ ...printForm, name: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 text-xs font-bold focus:ring-2 focus:ring-amber-500/20 transition-all outline-none"
                    placeholder="ชื่อ-นามสกุล"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">ข้อความกิจกรรม / เหตุผลในการมอบ *</label>
                  <textarea
                    rows={3}
                    required
                    value={printForm.activity}
                    onChange={(e) => setPrintForm({ ...printForm, activity: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2 focus:ring-amber-500/20 transition-all outline-none resize-none"
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
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2 focus:ring-amber-500/20 transition-all outline-none"
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
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2 focus:ring-amber-500/20 transition-all outline-none"
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
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2 focus:ring-amber-500/20 transition-all outline-none"
                    placeholder="ตำแหน่ง"
                  />
                </div>
              </div>
            </div>

            {/* Right: A4 Certificate Live Canvas Preview */}
            <div className="print:w-full print:m-0 xl:col-span-8 flex justify-center">
              <div
                id="print-certificate-area"
                className={`w-full max-w-[297mm] aspect-[297/210] bg-white rounded-3xl border-8 border-double ${currentThemeStyle.border} p-8 sm:p-12 shadow-2xl flex flex-col justify-between text-center relative overflow-hidden text-slate-900 transition-all`}
              >
                {/* Certificate Background Watermark Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:16px_16px] opacity-5 pointer-events-none" />

                {/* Top Corner Ornaments */}
                <div className="absolute top-3 left-3 w-10 h-10 border-t-2 border-l-2 border-amber-600/60 pointer-events-none" />
                <div className="absolute top-3 right-3 w-10 h-10 border-t-2 border-r-2 border-amber-600/60 pointer-events-none" />
                <div className="absolute bottom-3 left-3 w-10 h-10 border-b-2 border-l-2 border-amber-600/60 pointer-events-none" />
                <div className="absolute bottom-3 right-3 w-10 h-10 border-b-2 border-r-2 border-amber-600/60 pointer-events-none" />

                {/* Header Logo & School Name */}
                <div className="space-y-2 pt-2 relative z-10">
                  <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center text-amber-700 font-black text-xl shadow-xs">
                    KP
                  </div>
                  <h1 className={`text-2xl sm:text-3xl font-black ${currentThemeStyle.titleColor} tracking-wide ${currentThemeStyle.headerFont}`}>
                    โรงเรียนกุดจับประชาสรรค์
                  </h1>
                  <p className={`text-xs sm:text-sm font-bold ${currentThemeStyle.subText} tracking-widest uppercase`}>
                    Kutchapprachasan School Certificate of Achievement
                  </p>
                </div>

                {/* Body Content */}
                <div className="space-y-4 my-auto py-5 relative z-10">
                  <div className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-mono font-bold">
                    เลขทะเบียน: {printForm.certNo || "กป.กบ ๐๐๑/๒๕๖๙"}
                  </div>

                  <p className="text-sm sm:text-base font-semibold text-slate-600">
                    เกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า
                  </p>

                  <h2 className={`text-2xl sm:text-4xl font-black text-slate-900 underline ${currentThemeStyle.underline} decoration-2 underline-offset-8`}>
                    {printForm.name || "ชื่อ-นามสกุล"}
                  </h2>

                  <p className="text-sm sm:text-base text-slate-700 leading-relaxed max-w-2xl mx-auto pt-2 font-medium">
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
                      <span className="font-serif italic text-base text-slate-400 opacity-60">(ลายเซ็นดิจิทัล)</span>
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

      {/* ── TAB 3: ประวัติคุมเลขและค้นหาเกียรติบัตร (Certificate Register History) ── */}
      {activeTab === "history" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
            {/* Header & Filter Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-500" />
                  ทะเบียนและประวัติคุมเลขเกียรติบัตรทั้งหมด ({issuedBatches.length} รายการ)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ค้นหา ตรวจสอบรายละเอียดช่วงเลขทะเบียน หรือคัดลอกข้อความอ้างอิงเพื่อใช้งาน
                </p>
              </div>

              {/* Search & Category Filter */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="ค้นหาชื่อกิจกรรม / เลขทะเบียน..."
                    className="w-full h-9.5 pl-9 pr-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                  {historySearch && (
                    <button
                      onClick={() => setHistorySearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <select
                  value={historyCategoryFilter}
                  onChange={(e) => setHistoryCategoryFilter(e.target.value)}
                  className="w-full sm:w-auto h-9.5 px-3 rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                >
                  <option value="ALL">ทุกประเภทกิจกรรม</option>
                  <option value="GENERAL">เกียรติบัตรทั่วไป/บทบาท</option>
                  <option value="COMPETITION">เกียรติบัตรการแข่งขัน 🏆</option>
                </select>
              </div>
            </div>

            {/* History Table */}
            {filteredHistory.length === 0 ? (
              <div className="p-12 text-center text-slate-400 dark:text-slate-500">
                <Award className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-500" />
                <p className="text-sm font-semibold">ไม่พบข้อมูลทะเบียนเกียรติบัตรตามเงื่อนไขค้นหา</p>
                <p className="text-xs mt-1">ลองเปลี่ยนคำค้นหาหรือตัวกรองหมวดหมู่</p>
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
                    {filteredHistory.map((batch) => {
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
                            <span className="font-bold px-2.5 py-1 rounded-lg bg-amber-100/70 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                              {getCertCount(batch)} เลข
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 font-medium whitespace-nowrap">
                            {formattedDate}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {batch.origin} ({batch.requester || "ไม่ระบุ"})
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center gap-1.5 justify-end">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyReference(batch);
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-slate-700 dark:text-slate-300 font-bold transition flex items-center gap-1 cursor-pointer"
                                title="คัดลอกข้อความอ้างอิง"
                              >
                                {copiedBatchId === batch.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                คัดลอก
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDetailBatch(batch);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold hover:bg-amber-100 transition flex items-center gap-1.5 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                ดูรายละเอียด
                              </button>
                            </div>
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
                      รวม {getCertCount(selectedDetailBatch)} หมายเลข
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

              {/* Copy Reference Line Box */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 uppercase block">
                    ข้อความอ้างอิงสำหรับหนังสือราชการ:
                  </span>
                  <p className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate mt-0.5">
                    ที่ {selectedDetailBatch.docNo} ลงวันที่ {selectedDetailBatch.date ? new Date(selectedDetailBatch.date).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" }) : ""} เรื่อง {selectedDetailBatch.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyReference(selectedDetailBatch)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  คัดลอก
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
                  const contentStr = selectedDetailBatch.content;

                  if (contentStr) {
                    try {
                      const parsed = JSON.parse(contentStr);
                      if (Array.isArray(parsed)) breakdown = parsed;
                    } catch (e) {
                      const lines = String(contentStr).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
                      breakdown = lines.map((line) => {
                        const colonIdx = line.indexOf(":");
                        if (colonIdx !== -1) {
                          const roleTitle = line.substring(0, colonIdx).trim();
                          const rest = line.substring(colonIdx + 1).trim();
                          const parenMatch = rest.match(/^(.*?)\s*\((\d+)\s*ใบ\)$/);
                          if (parenMatch) {
                            return {
                              roleTitle,
                              rangeText: parenMatch[1].trim(),
                              quantity: parseInt(parenMatch[2], 10),
                            };
                          }
                          return { roleTitle, rangeText: rest, quantity: null };
                        }
                        return { roleTitle: line, rangeText: "", quantity: null };
                      });
                    }
                  }

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
                            {b.quantity ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-amber-200/50">
                                {b.quantity} ใบ
                              </span>
                            ) : null}
                          </div>
                          {b.rangeText ? (
                            <div className="font-mono text-xs font-bold text-amber-700 dark:text-amber-300 pt-1">
                              {b.rangeText}
                            </div>
                          ) : null}
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
    </div>
  );
}
