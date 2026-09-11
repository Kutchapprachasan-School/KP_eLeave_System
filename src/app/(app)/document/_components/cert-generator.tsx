"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  ArrowLeft, Plus, Trash2, Award, Calendar, CheckCircle2, 
  Search, Copy, Check, RefreshCw, Layers,
  Building2, User, Eye, X, ClipboardList, FileSpreadsheet,
  Printer, Edit3, Ban, AlertTriangle, ShieldCheck, Send, Palette
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import { 
  issueActivityCertificatesBatch, 
  getDocumentsList,
  getCertificateBatchItems,
  updateCertificateMetadata,
  cancelDoc
} from "@/app/actions/document";
import { useToast } from "@/components/toast-provider";
import { formatDocFullDate } from "@/lib/date-format";
import { useSession } from "@/lib/auth-client";
import { QRCodeSVG } from "qrcode.react";
import { CertDesignerStudio } from "./designer/cert-designer-studio";

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
  { title: "ผู้เข้าร่วมกิจกรรม", defaultQty: 50 },
  { title: "วิทยากร", defaultQty: 5 },
  { title: "ผู้ช่วยวิทยากร", defaultQty: 5 },
  { title: "คณะกรรมการดำเนินงาน", defaultQty: 10 },
  { title: "คณะกรรมการตัดสิน", defaultQty: 5 },
  { title: "นักเรียนผู้ได้รับรางวัลชนะเลิศ", defaultQty: 1 },
  { title: "นักเรียนผู้ได้รับรางวัลรองชนะเลิศอันดับ 1", defaultQty: 1 },
  { title: "นักเรียนผู้ได้รับรางวัลรองชนะเลิศอันดับ 2", defaultQty: 1 },
  { title: "นักเรียนผู้ได้รับรางวัลชมเชย", defaultQty: 2 },
  { title: "ครูผู้ฝึกสอนนักเรียน", defaultQty: 5 },
];

export default function CertGenerator({ onBack }: { onBack?: () => void }) {
  const { showToast } = useToast();
  const { data: session } = useSession();

  const [activeTab, setActiveTab] = useState<"issue" | "history" | "studio">("issue");
  const [studioBatch, setStudioBatch] = useState<any | null>(null);

  // Form State
  const [activityTitle, setActivityTitle] = useState("");
  const [origin, setOrigin] = useState("");
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingBatchId, setDownloadingBatchId] = useState<string | null>(null);

  // Modals State
  const [selectedBatchDetail, setSelectedBatchDetail] = useState<any | null>(null);
  const [editingBatch, setEditingBatch] = useState<any | null>(null);
  const [cancellingBatch, setCancellingBatch] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [slipModalBatch, setSlipModalBatch] = useState<any | null>(null);
  const [slipFirstItem, setSlipFirstItem] = useState<any | null>(null);

  // Auto-fill user profile info (name only; origin is left blank by user request)
  useEffect(() => {
    if (session?.user) {
      if (!requesterName && session.user.name) {
        setRequesterName(session.user.name);
      }
    }
  }, [session]);

  // Load History
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await getDocumentsList({ docType: "CERTIFICATE", includeCertificates: true });
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

  // Launch Visual Mail-Merge Studio with pre-loaded batch items
  const handleLaunchStudio = async (batchItem: any) => {
    setLoadingHistory(true);
    try {
      const res = await getCertificateBatchItems(batchItem.id);
      if (res.success && Array.isArray(res.data)) {
        setStudioBatch({
          id: batchItem.id,
          activityTitle: batchItem.title || "",
          organization: batchItem.origin || "",
          issuedDate: batchItem.date ? formatDocFullDate(new Date(batchItem.date)) : "",
          items: res.data,
        });
        setActiveTab("studio");
      } else {
        showToast("error", "ไม่สามารถดึงข้อมูลรายการเกียรติบัตรสำหรับสตูดิโอได้");
      }
    } catch (err: any) {
      showToast("error", err?.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoadingHistory(false);
    }
  };

  // Total Quantity Calculation
  const totalQuantity = useMemo(() => {
    return roleItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }, [roleItems]);

  // Handle Add Role
  const handleAddRole = (title = "ผู้เข้าร่วมกิจกรรม", defaultQty = 10) => {
    setRoleItems(prev => {
      const existingIdx = prev.findIndex(item => item.roleTitle.trim() === title.trim());
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + defaultQty
        };
        return next;
      }
      return [...prev, { roleTitle: title, quantity: defaultQty }];
    });
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

    const finalOrigin = origin === "CUSTOM" ? customOrigin.trim() : origin.trim();
    if (!finalOrigin) {
      showToast("error", "กรุณาเลือกกลุ่มสาระฯ หรือระบุหน่วยงานผู้จัด");
      return;
    }

    setIssuing(true);
    try {
      const clientKey = `cert_batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const res = await issueActivityCertificatesBatch({
        title: activityTitle.trim(),
        origin: finalOrigin,
        date: issueDate,
        requester: requesterName.trim() || session?.user?.name || "ครูผู้รับผิดชอบ",
        items: roleItems.map(item => ({
          roleTitle: item.roleTitle.trim(),
          quantity: Math.max(1, Number(item.quantity) || 1)
        })),
        idempotencyKey: clientKey,
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

  // 🔴 Export Mail Merge Excel directly from committed DB snapshot
  const handleExportMailMergeXlsx = async (batch: any, passedItems?: any[]) => {
    setDownloadingBatchId(batch.id);
    try {
      let committedItems = passedItems;
      if (!committedItems || committedItems.length === 0) {
        const res = await getCertificateBatchItems(batch.id);
        if (res.success && Array.isArray(res.data)) {
          committedItems = res.data;
        } else {
          showToast("error", "ไม่สามารถดึงข้อมูลเลขเกียรติบัตรจากฐานข้อมูลได้");
          return;
        }
      }

      const appOrigin = typeof window !== "undefined" ? window.location.origin : "";
      const thDate = formatDocFullDate(batch.date || batch.createdAt);

      const rows = committedItems.map((item: any, idx: number) => ({
        "ลำดับ": idx + 1,
        "เลขที่เกียรติบัตร": item.certificateNumber,
        "บทบาท": item.roleTitle,
        "ชื่อ-นามสกุลผู้รับ (พิมพ์ชื่อที่นี่)": item.recipientName || "",
        "โรงเรียน / หน่วยงาน": batch.origin || "โรงเรียนกุดจับประชาสรรค์",
        "วันที่ออกเกียรติบัตร": thDate,
        "ชื่อกิจกรรม / โครงการ": batch.title,
        "ลิงก์ตรวจสอบ QR Code": item.verifyToken ? `${appOrigin}/verify/cert?token=${item.verifyToken}` : "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet["!cols"] = [
        { wch: 8 },  // ลำดับ
        { wch: 18 }, // เลขที่
        { wch: 22 }, // บทบาท
        { wch: 30 }, // ชื่อผู้รับ
        { wch: 28 }, // โรงเรียน
        { wch: 20 }, // วันที่
        { wch: 45 }, // ชื่อกิจกรรม
        { wch: 45 }, // QR Link
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "รายชื่อเกียรติบัตร");

      const safeTitle = (batch.title || "เกียรติบัตร").replace(/[/\\?%*:|"<>]/g, "_").slice(0, 30);
      XLSX.writeFile(workbook, `${safeTitle}_เลขเกียรติบัตร_MailMerge.xlsx`);
      showToast("success", `ดาวน์โหลดไฟล์ Excel สำหรับ Mail Merge สำเร็จ (${committedItems.length} แถว)`);
    } catch (e: any) {
      console.error("Export error:", e);
      showToast("error", e.message || "เกิดข้อผิดพลาดในการสร้างไฟล์ Excel");
    } finally {
      setDownloadingBatchId(null);
    }
  };

  // Open Printable Slip Modal
  const handleOpenSlipModal = async (batch: any) => {
    setSlipModalBatch(batch);
    try {
      const res = await getCertificateBatchItems(batch.id);
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setSlipFirstItem(res.data[0]);
      } else {
        setSlipFirstItem(null);
      }
    } catch (e) {
      setSlipFirstItem(null);
    }
  };

  // Handle Edit Metadata Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;

    setSubmittingAction(true);
    try {
      const res = await updateCertificateMetadata(editingBatch.id, {
        title: editingBatch.title,
        origin: editingBatch.origin,
        requester: editingBatch.requester,
        date: editingBatch.date,
      });

      if (res.success) {
        showToast("success", "บันทึกการแก้ไขข้อมูลเรียบร้อยแล้ว");
        setEditingBatch(null);
        await fetchHistory();
      } else {
        showToast("error", res.error || "เกิดข้อผิดพลาดในการแก้ไขข้อมูล");
      }
    } catch (err: any) {
      showToast("error", err.message || "เกิดข้อผิดพลาด");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Handle Cancel Batch Submit
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingBatch) return;
    if (!cancelReason.trim()) {
      showToast("error", "กรุณาระบุเหตุผลในการยกเลิกเลขเกียรติบัตร");
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await cancelDoc(cancellingBatch.id, cancelReason.trim());
      if (res.success) {
        showToast("success", `ยกเลิกเลข ${cancellingBatch.docNo} เรียบร้อยแล้ว (เลขถูกคงไว้ในประวัติ ห้ามนำมาออกซ้ำ)`);
        setCancellingBatch(null);
        setCancelReason("");
        await fetchHistory();
      } else {
        showToast("error", res.error || "เกิดข้อผิดพลาดในการยกเลิก");
      }
    } catch (err: any) {
      showToast("error", err.message || "เกิดข้อผิดพลาด");
    } finally {
      setSubmittingAction(false);
    }
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

  // Parse breakdown lines from content string
  const parseBreakdown = (content: string) => {
    if (!content) return [];
    return content.split("\n").filter(line => line.trim().length > 0);
  };

  const appOrigin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Seamless Tab Navigation Bar (Cut out the redundant inner header card) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/70 dark:border-slate-750">
          <button
            type="button"
            onClick={() => { setActiveTab("issue"); setLastIssuedResult(null); }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "issue"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            ขอเลขเกียรติบัตร
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("history"); fetchHistory(); }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "history"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            ประวัติการออกเลข ({historyList.length})
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("studio"); }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "studio"
                ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-purple-500" />
            🎨 สตูดิโอออกแบบ & พิมพ์
          </button>
        </div>

        {onBack && (
          <button
            onClick={onBack}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            ย้อนกลับ
          </button>
        )}
      </div>

      {/* Tab 1: Studio Issue Mode (Clean 2-Column Workspace matching outbound-form typography) */}
      {activeTab === "issue" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-xs relative">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8 space-y-6 lg:space-y-0 items-start">
            
            {/* Left Column (7 cols on lg): The Input Form */}
            <form onSubmit={handleIssueSubmit} className="lg:col-span-7 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-extrabold">
                  +
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  ออกเลขเกียรติบัตรกิจกรรม
                </h3>
              </div>

              {/* Activity Title */}
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  ชื่อกิจกรรม / โครงการ / หลักสูตรฝึกอบรม <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={activityTitle}
                  onChange={(e) => setActivityTitle(e.target.value)}
                  placeholder="เช่น การแข่งขันตอบปัญหาวิชาการ สัปดาห์วิทยาศาสตร์ ประจำปีการศึกษา 2569"
                  className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none resize-none"
                />
              </div>

              {/* Department & Date 2-Col Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    กลุ่มสาระฯ / หน่วยงานผู้จัด <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full h-11 pl-3.5 pr-9 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer outline-none"
                  >
                    <option value="" disabled>-- เลือกกลุ่มสาระฯ / หน่วยงานผู้จัด --</option>
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
                      className="w-full mt-2 h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    />
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                      วันที่ออกเกียรติบัตร <span className="text-rose-500">*</span>
                    </label>
                    {issueDate && (
                      <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
                        📅 {formatDocFullDate(issueDate)}
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Requester Name */}
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  ผู้ขอเลข / ครูผู้รับผิดชอบ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="ชื่อ-นามสกุล ครูผู้ขอออกเลขเกียรติบัตร"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                />
              </div>

              {/* Dynamic Roles & Quantities */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                    รายการบทบาทและจำนวนใบ <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
                    รวมทั้งสิ้น {totalQuantity} ใบ
                  </span>
                </div>

                {/* Quick Add Role Chips (Soft Indigo theme) */}
                <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-1.5">
                  <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300 block">
                    ⚡ แตะเพื่อเพิ่มบทบาทด่วน:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_ROLES.map((preset) => (
                      <button
                        key={preset.title}
                        type="button"
                        onClick={() => handleAddRole(preset.title, preset.defaultQty)}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200/80 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 text-[11px] font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition cursor-pointer shadow-2xs"
                      >
                        + {preset.title} ({preset.defaultQty})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Role List Inputs */}
                <div className="space-y-2">
                  {roleItems.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800"
                    >
                      <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        required
                        value={item.roleTitle}
                        onChange={(e) => handleRoleChange(idx, "roleTitle", e.target.value)}
                        placeholder="ชื่อบทบาท เช่น ผู้เข้าร่วมกิจกรรม"
                        className="flex-1 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                      />
                      <div className="w-24 flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-lg px-2 h-9">
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleRoleChange(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full text-center text-xs font-bold text-slate-900 dark:text-white outline-none bg-transparent"
                        />
                        <span className="text-[10px] text-slate-400">ใบ</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRole(idx)}
                        disabled={roleItems.length <= 1}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-30 transition cursor-pointer"
                        title="ลบแถวนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleAddRole("ผู้เข้าร่วมกิจกรรม", 10)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  เพิ่มแถวใหม่
                </button>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={issuing || totalQuantity <= 0}
                className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer border border-indigo-500/20"
              >
                {issuing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    กำลังขอออกเลขเกียรติบัตร...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    🚀 ยืนยันขอออกเลขเกียรติบัตร ({totalQuantity} ใบ)
                  </>
                )}
              </button>
            </form>

            {/* Right Column (5 cols on lg): Live Summary & Last Issued Result Card */}
            <div className="lg:col-span-5 space-y-4">
              {/* Success Card if just issued */}
              {lastIssuedResult ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/70 border-2 border-emerald-500/60 dark:border-emerald-600/60 rounded-xl p-4 space-y-2.5 text-center shadow-md animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-black text-emerald-700 dark:text-emerald-300">
                    <span className="text-base">🎉</span>
                    ออกเลขเกียรติบัตรของคุณสำเร็จเรียบร้อย!
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {lastIssuedResult.docNo}
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-1">
                    เรื่อง: {lastIssuedResult.title}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-center gap-2">
                    <span>ผู้ขอ: {lastIssuedResult.requester}</span>
                    <span>•</span>
                    <span>{formatDocFullDate(lastIssuedResult.date)}</span>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleExportMailMergeXlsx(lastIssuedResult, lastIssuedResult.certificateItems)}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      📥 ดาวน์โหลด Excel สำหรับ Mail Merge
                    </button>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(lastIssuedResult.docNo, "last_issued")}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        {copiedId === "last_issued" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedId === "last_issued" ? "คัดลอกแล้ว" : "คัดลอกช่วงเลข"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenSlipModal(lastIssuedResult)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-indigo-500" />
                        พิมพ์ใบสรุปเลข
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLaunchStudio(lastIssuedResult)}
                      className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs mt-2"
                    >
                      <Palette className="w-4 h-4" />
                      🎨 ออกแบบ & พิมพ์เกียรติบัตรชุดนี้ (Studio)
                    </button>
                  </div>
                </div>
              ) : (
                /* Live Preview Card */
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 md:p-5 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-base">📊</span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      สรุปข้อมูลการขอออกเลข
                    </h3>
                  </div>

                  {/* Stat Card */}
                  <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/60 rounded-xl p-4 text-center shadow-2xs space-y-3">
                    {/* Activity Title */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                        ชื่อกิจกรรม / โครงการ
                      </span>
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white line-clamp-2 px-1">
                        {activityTitle.trim() || (
                          <span className="text-slate-400 dark:text-slate-500 font-normal italic">
                            (ยังไม่ได้ระบุชื่อกิจกรรม)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Total Quantity */}
                    <div className="pt-2.5 border-t border-indigo-100 dark:border-indigo-900/50">
                      <span className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 block">
                        จำนวนที่ขอออกเลขทั้งหมด
                      </span>
                      <div className="text-2xl sm:text-3xl font-black font-mono text-indigo-600 dark:text-indigo-400 my-0.5">
                        {totalQuantity} <span className="text-sm font-bold text-slate-500">ใบ</span>
                      </div>
                    </div>

                    {/* Certificate Issue Date */}
                    <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/50 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5">
                      <span>📅</span>
                      <span>วันที่ออกเลขเกียรติบัตร:</span>
                      <span className="font-extrabold text-indigo-700 dark:text-indigo-300">
                        {issueDate ? formatDocFullDate(issueDate) : "-"}
                      </span>
                    </div>
                  </div>

                  {/* Feature Hint Box */}
                  <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                    <FileSpreadsheet className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                    <span>
                      เมื่อออกเลขแล้ว ดาวน์โหลดไฟล์ Excel เพื่อนำไปผสานข้อมูล (Mail Merge) ใน Canva หรือ Word ได้ทันที
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Registry History View (Matches Outbound History style) */}
      {activeTab === "history" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 md:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-base">🕒</span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                ทะเบียนประวัติการออกเลขเกียรติบัตร ({filteredHistory.length} รายการ)
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหากิจกรรม, เลขที่, ผู้ขอ..."
                  className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <button
                type="button"
                onClick={fetchHistory}
                disabled={loadingHistory}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition cursor-pointer border border-slate-200 dark:border-slate-750"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
                รีเฟรช
              </button>
            </div>
          </div>

          {/* Table */}
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              {searchQuery ? "ไม่พบข้อมูลที่ตรงกับคำค้นหา" : "ยังไม่มีประวัติการขอออกเลขเกียรติบัตร"}
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2 px-2.5 text-center w-12">ลำดับ</th>
                    <th className="py-2 px-2.5">เลขที่</th>
                    <th className="py-2 px-2.5">ชื่อกิจกรรม / โครงการ</th>
                    <th className="py-2 px-2">หน่วยงานผู้จัด</th>
                    <th className="py-2 px-2">ผู้ขอเลข</th>
                    <th className="py-2 px-2 text-center">สถานะ</th>
                    <th className="py-2 px-2 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredHistory.map((item, index) => {
                    const isCancelled = item.status === "CANCELLED";
                    const formattedDate = item.date ? new Date(item.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '';

                    return (
                      <tr key={item.id} className={`transition ${isCancelled ? "bg-rose-50/30 dark:bg-rose-950/20" : "hover:bg-slate-50/80 dark:hover:bg-slate-800/50"}`}>
                        <td className="py-3 px-2.5 text-center text-slate-400 font-mono">
                          {index + 1}
                        </td>
                        <td className="py-3 px-2.5 font-mono font-bold whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={isCancelled ? "line-through text-rose-600 dark:text-rose-400 font-bold" : "text-slate-900 dark:text-white hover:text-indigo-600"}>
                              {item.docNo}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(item.docNo, item.id)}
                              className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                              title="คัดลอกเลขที่"
                            >
                              {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {formattedDate}
                          </div>
                        </td>
                        <td className={`py-3 px-2.5 max-w-[240px] truncate text-xs ${isCancelled ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-300 font-medium"}`}>
                          {item.title}
                        </td>
                        <td className="py-3 px-2 text-slate-600 dark:text-slate-400 whitespace-nowrap text-xs">
                          {item.origin || "-"}
                        </td>
                        <td className="py-3 px-2 text-slate-600 dark:text-slate-400 whitespace-nowrap text-xs">
                          {item.requester || "-"}
                        </td>
                        <td className="py-3 px-2 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-lg text-xs font-extrabold border ${
                            isCancelled 
                              ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/70 dark:border-rose-900 dark:text-rose-400 line-through" 
                              : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/70 dark:border-emerald-900 dark:text-emerald-300"
                          }`}>
                            {isCancelled ? "ยกเลิก" : "ออกเลขแล้ว"}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {/* Launch Studio */}
                            <button
                              type="button"
                              onClick={() => handleLaunchStudio(item)}
                              className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 transition cursor-pointer"
                              title="🎨 ออกแบบ & พิมพ์เกียรติบัตร (Mail Merge Studio)"
                            >
                              <Palette className="w-3.5 h-3.5" />
                            </button>

                            {/* Download Excel */}
                            <button
                              type="button"
                              onClick={() => handleExportMailMergeXlsx(item)}
                              disabled={downloadingBatchId === item.id}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 transition cursor-pointer"
                              title="ดาวน์โหลด Excel สำหรับ Mail Merge"
                            >
                              {downloadingBatchId === item.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Print Slip */}
                            <button
                              type="button"
                              onClick={() => handleOpenSlipModal(item)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300 transition cursor-pointer"
                              title="พิมพ์ใบสรุปเลข (Print Slip)"
                            >
                              <Printer className="w-3.5 h-3.5 text-indigo-500" />
                            </button>

                            {/* View Detail */}
                            <button
                              type="button"
                              onClick={() => setSelectedBatchDetail(item)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300 transition cursor-pointer"
                              title="ดูรายละเอียด"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Metadata */}
                            {!isCancelled && (
                              <button
                                type="button"
                                onClick={() => setEditingBatch({ ...item, date: item.date ? new Date(item.date).toISOString().split("T")[0] : "" })}
                                className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 transition cursor-pointer"
                                title="แก้ไขชื่อกิจกรรม/หน่วยงาน"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Cancel Batch */}
                            {!isCancelled && (
                              <button
                                type="button"
                                onClick={() => setCancellingBatch(item)}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 transition cursor-pointer"
                                title="ยกเลิกเลขเกียรติบัตรชุดนี้"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
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
      )}

      {/* Tab 3: Visual Mail-Merge Studio */}
      {activeTab === "studio" && (
        <CertDesignerStudio
          initialBatch={studioBatch}
          onClose={() => setActiveTab("history")}
        />
      )}

      {/* Modal 1: Detail Modal */}
      <AnimatePresence>
        {selectedBatchDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      รายละเอียดการออกเลขเกียรติบัตร
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">
                      เลขที่: {selectedBatchDetail.docNo}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedBatchDetail(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
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
                    <div className={`font-bold mt-0.5 ${selectedBatchDetail.status === "CANCELLED" ? "text-rose-600 line-through" : "text-emerald-600"}`}>
                      {selectedBatchDetail.status === "CANCELLED" ? "✕ ยกเลิกแล้ว" : "✓ ออกเลขเรียบร้อย"}
                    </div>
                  </div>
                </div>

                {selectedBatchDetail.content && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="font-bold text-slate-700 dark:text-slate-300">
                      รายการแจกแจงเลขที่ตามบทบาท:
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {parseBreakdown(selectedBatchDetail.content).map((line: string, idx: number) => (
                        <div key={idx} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 font-mono text-[11px] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800">
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleExportMailMergeXlsx(selectedBatchDetail)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  ดาวน์โหลด Excel
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(selectedBatchDetail.docNo, "modal_copy")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  {copiedId === "modal_copy" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === "modal_copy" ? "คัดลอกแล้ว" : "คัดลอกช่วงเลข"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBatchDetail(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  ปิด
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 2: Edit Metadata Modal */}
      <AnimatePresence>
        {editingBatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    แก้ไขข้อมูลกิจกรรม (เลขที่ {editingBatch.docNo})
                  </h3>
                </div>
                <button onClick={() => setEditingBatch(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/60 text-[11px] text-indigo-900 dark:text-indigo-300">
                ℹ️ เลขที่เกียรติบัตรและจำนวนใบจะไม่เปลี่ยนแปลง เพื่อรักษาความถูกต้องของทะเบียนโรงเรียน
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    ชื่อกิจกรรม / โครงการ *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingBatch.title || ""}
                    onChange={(e) => setEditingBatch({ ...editingBatch, title: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    กลุ่มสาระฯ / หน่วยงาน
                  </label>
                  <input
                    type="text"
                    value={editingBatch.origin || ""}
                    onChange={(e) => setEditingBatch({ ...editingBatch, origin: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      วันที่ออกเกียรติบัตร
                    </label>
                    <input
                      type="date"
                      value={editingBatch.date || ""}
                      onChange={(e) => setEditingBatch({ ...editingBatch, date: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      ผู้ขอเลข
                    </label>
                    <input
                      type="text"
                      value={editingBatch.requester || ""}
                      onChange={(e) => setEditingBatch({ ...editingBatch, requester: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingBatch(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAction}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {submittingAction ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    บันทึกการแก้ไข
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 3: Cancel Batch Modal */}
      <AnimatePresence>
        {cancellingBatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    ยืนยันยกเลิกเลขเกียรติบัตร
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {cancellingBatch.docNo}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-300 space-y-1">
                <p className="font-bold">⚠️ กฎความปลอดภัยทางทะเบียน:</p>
                <p>
                  เลขที่ถูกยกเลิกจะถูกคงไว้ในทะเบียนและขึ้นสถานะ "ยกเลิก" จะไม่มีการนำเลขนี้กลับมาออกซ้ำ เพื่อความโปร่งใสของเอกสาร
                </p>
              </div>

              <form onSubmit={handleCancelSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    ระบุเหตุผลในการยกเลิกเลข <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="เช่น กรอกจำนวนผิดพลาด, กิจกรรมถูกยกเลิก..."
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/20 outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setCancellingBatch(null); setCancelReason(""); }}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    ปิด
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAction || !cancelReason.trim()}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {submittingAction ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                    ยืนยันยกเลิกเลข
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 4: Official Printable Slip Modal with QR */}
      <AnimatePresence>
        {slipModalBatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    ใบสรุปการขอเลขทะเบียนเกียรติบัตร (Certificate Slip)
                  </h3>
                </div>
                <button onClick={() => setSlipModalBatch(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Slip Printable Sheet */}
              <div id="cert-slip-sheet" className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="text-center border-b border-slate-200 dark:border-slate-800 pb-3">
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                    โรงเรียนกุดจับประชาสรรค์
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    ใบยืนยันการออกเลขทะเบียนเกียรติบัตรกิจกรรม
                  </p>
                  <div className="mt-2 text-xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                    {slipModalBatch.docNo}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">ชื่อกิจกรรม:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">{slipModalBatch.title}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">หน่วยงาน:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block">{slipModalBatch.origin || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">วันที่ออกเกียรติบัตร:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block">{formatDocFullDate(slipModalBatch.date || slipModalBatch.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">ผู้ขอเลข:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block">{slipModalBatch.requester || "-"}</span>
                  </div>
                </div>

                {/* QR Code Verification Link */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-4">
                  <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs shrink-0">
                    <QRCodeSVG
                      value={slipFirstItem?.verifyToken ? `${appOrigin}/verify/cert?token=${slipFirstItem.verifyToken}` : `${appOrigin}/document?view=cert`}
                      size={75}
                      level="M"
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 space-y-1">
                    <span className="font-bold text-slate-700 dark:text-slate-300 block flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      รหัสรับรองระบบดิจิทัล (QR Verification)
                    </span>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      สแกน QR Code เพื่อตรวจสอบความถูกต้องของเลขเกียรติบัตรชุดนี้บนระบบสารบรรณกลาง
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  พิมพ์ใบสรุป
                </button>
                <button
                  type="button"
                  onClick={() => setSlipModalBatch(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  ปิด
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
