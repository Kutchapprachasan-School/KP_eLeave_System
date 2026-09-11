"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Upload,
  Download,
  Save,
  Copy,
  Trash2,
  Play,
  X,
  FileSpreadsheet,
  Settings2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  RefreshCw,
  Eye,
  Maximize2,
  Minimize2,
  RotateCw,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  type CertificateTemplateV1,
  type CertificateElement,
  CertificateTemplateV1Schema,
  DEFAULT_CERTIFICATE_ELEMENTS,
  sanitizeCellValue,
  sanitizeForExport,
  ptToCanvasPx,
} from "./cert-schema";
import {
  ensureFontsLoaded,
  loadCanvasImage,
  drawCertificatePage,
  generateCertificatePdfBatch,
  A4_DIMS,
} from "./cert-pdf-engine";
import {
  getCertificateTemplatesAction,
  saveCertificateTemplateAction,
  forkCertificateTemplateAction,
  deleteCertificateTemplateAction,
  uploadCertificateBackgroundAction,
} from "@/app/actions/document";

interface CertDesignerStudioProps {
  initialBatch?: {
    id: string;
    activityTitle: string;
    organization: string;
    issuedDate: string;
    items: Array<{
      recipientName: string;
      certificateNumber: string;
      roleTitle?: string;
      verifyToken?: string;
    }>;
  } | null;
  onClose?: () => void;
}

export function CertDesignerStudio({ initialBatch, onClose }: CertDesignerStudioProps) {
  // --- Templates & Current State ---
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateName, setTemplateName] = useState<string>("แบบเกียรติบัตรใหม่");
  const [orientation, setOrientation] = useState<"LANDSCAPE" | "PORTRAIT">("LANDSCAPE");
  const [scope, setScope] = useState<"PRIVATE" | "SCHOOL_SHARED" | "SYSTEM_PRESET">("PRIVATE");
  const [templateVersion, setTemplateVersion] = useState<number>(1);
  const [backgroundAttachmentId, setBackgroundAttachmentId] = useState<string>("");
  const [backgroundUrl, setBackgroundUrl] = useState<string>("");
  const [elements, setElements] = useState<CertificateElement[]>(DEFAULT_CERTIFICATE_ELEMENTS);
  const [selectedElementId, setSelectedElementId] = useState<string | null>("el_name");

  // --- Roster State ---
  const [roster, setRoster] = useState<Array<Record<string, string>>>(() => {
    if (initialBatch && initialBatch.items.length > 0) {
      return initialBatch.items.map((item) => ({
        fullName: item.recipientName || "",
        certNumber: item.certificateNumber || "",
        role: item.roleTitle || "",
        activityName: initialBatch.activityTitle || "",
        department: initialBatch.organization || "",
        date: initialBatch.issuedDate || "",
        qrCode: item.verifyToken
          ? `https://eleave.kutchap.ac.th/verify?token=${item.verifyToken}`
          : "https://eleave.kutchap.ac.th/verify",
      }));
    }
    return [
      {
        fullName: "นายสมศักดิ์ รักเรียน",
        certNumber: "กจ. 001/2569",
        role: "รางวัลชนะเลิศ",
        activityName: "สัปดาห์วิทยาศาสตร์ ประจำปีการศึกษา ๒๕๖๙",
        department: "โรงเรียนกุดจับประชาสรรค์",
        date: "๑๑ กันยายน พ.ศ. ๒๕๖๙",
        qrCode: "https://eleave.kutchap.ac.th/verify",
      },
    ];
  });
  const [previewIndex, setPreviewIndex] = useState<number>(0);

  // --- UI & Modals ---
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploadingBg, setUploadingBg] = useState<boolean>(false);
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);
  const [exportRangeMode, setExportRangeMode] = useState<"ALL" | "RANGE">("ALL");
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(10);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // --- Canvas & Drag References ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragElementIdRef = useRef<string | null>(null);

  // Load available templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await getCertificateTemplatesAction();
      if (res.success && res.data) {
        setTemplates(res.data);
        if (res.data.length > 0 && !selectedTemplateId) {
          applyTemplate(res.data[0]);
        }
      }
    } catch (err: any) {
      console.error("Load templates failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = (tmpl: any) => {
    setSelectedTemplateId(tmpl.id);
    setTemplateName(tmpl.name);
    setOrientation(tmpl.orientation);
    setScope(tmpl.scope);
    setTemplateVersion(tmpl.templateVersion || 1);
    setBackgroundAttachmentId(tmpl.backgroundAttachmentId);
    setBackgroundUrl(tmpl.backgroundUrl);

    if (tmpl.layoutConfig && tmpl.layoutConfig.elements) {
      setElements(tmpl.layoutConfig.elements);
    }
  };

  // Trigger Font Preload Gate
  useEffect(() => {
    ensureFontsLoaded();
  }, []);

  // Live Canvas Rendering (72 DPI preview)
  useEffect(() => {
    let cancelled = false;
    const renderPreview = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dims = A4_DIMS[orientation];
      canvas.width = dims.previewWidth;
      canvas.height = dims.previewHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw background or placeholder
      if (backgroundUrl) {
        try {
          const bgImg = await loadCanvasImage(backgroundUrl);
          if (cancelled) return;
          ctx.drawImage(bgImg, 0, 0, dims.previewWidth, dims.previewHeight);
        } catch (err) {
          console.warn("Background load error in preview:", err);
          drawPlaceholderBg(ctx, dims.previewWidth, dims.previewHeight);
        }
      } else {
        drawPlaceholderBg(ctx, dims.previewWidth, dims.previewHeight);
      }

      // Draw placeholders
      const activeData = roster[previewIndex] || roster[0] || {};
      for (const el of elements) {
        const rawValue = activeData[el.key] ?? el.sampleText ?? "";
        const displayText = `${el.prefix || ""}${rawValue}${el.suffix || ""}`;

        // Scaled to 72 DPI preview
        const fontSize = ptToCanvasPx(el.fontSizePt, 72);
        ctx.font = `${el.fontWeight === "bold" ? "bold" : "normal"} ${fontSize}px "${el.fontFamily}", sans-serif`;
        ctx.fillStyle = el.color || "#1e293b";
        ctx.textAlign = el.textAlign || "center";
        ctx.textBaseline = "middle";

        const x = (el.xPercent / 100) * dims.previewWidth;
        const y = (el.yPercent / 100) * dims.previewHeight;

        ctx.fillText(displayText, x, y);

        // Highlight selected element
        if (el.id === selectedElementId) {
          ctx.save();
          ctx.strokeStyle = "#3b82f6";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          const metrics = ctx.measureText(displayText);
          const textWidth = Math.max(metrics.width + 16, 60);
          const textHeight = fontSize + 8;
          let boxX = x - textWidth / 2;
          if (el.textAlign === "left") boxX = x - 8;
          if (el.textAlign === "right") boxX = x - textWidth + 8;
          ctx.strokeRect(boxX, y - textHeight / 2, textWidth, textHeight);
          ctx.restore();
        }
      }
    };

    renderPreview();
    return () => {
      cancelled = true;
    };
  }, [orientation, backgroundUrl, elements, roster, previewIndex, selectedElementId]);

  const drawPlaceholderBg = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, w - 32, h - 32);
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.strokeRect(24, 24, w - 48, h - 48);

    ctx.font = "normal 16px Sarabun, sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.textAlign = "center";
    ctx.fillText("กรุณาอัปโหลดภาพพื้นหลังเกียรติบัตร (JPG/PNG)", w / 2, h / 2 - 10);
    ctx.font = "normal 12px Sarabun, sans-serif";
    ctx.fillText(`ขนาดมาตรฐาน A4 ${orientation === "LANDSCAPE" ? "แนวนอน" : "แนวตั้ง"}`, w / 2, h / 2 + 16);
  };

  // --- Background Upload Handler ---
  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBg(true);
    setStatusMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("uploadSessionId", crypto.randomUUID());

      const res = await uploadCertificateBackgroundAction(formData);
      if (res.success && res.data) {
        setBackgroundAttachmentId(res.data.attachmentId);
        setBackgroundUrl(res.data.url);

        // Auto-detect image aspect ratio to suggest orientation
        const img = new Image();
        img.src = res.data.url;
        img.onload = () => {
          if (img.width < img.height && orientation === "LANDSCAPE") {
            setOrientation("PORTRAIT");
          } else if (img.width > img.height && orientation === "PORTRAIT") {
            setOrientation("LANDSCAPE");
          }
        };

        setStatusMessage({ type: "success", text: "อัปโหลดภาพพื้นหลังเรียบร้อย" });
      } else {
        setStatusMessage({ type: "error", text: res.error || "อัปโหลดล้มเหลว" });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "เกิดข้อผิดพลาดในการอัปโหลด" });
    } finally {
      setUploadingBg(false);
    }
  };

  // --- Save / Save As / Fork Handlers ---
  const handleSaveTemplate = async () => {
    if (!backgroundAttachmentId) {
      setStatusMessage({ type: "error", text: "กรุณาอัปโหลดภาพพื้นหลังก่อนบันทึกแบบ" });
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    const layoutConfig: CertificateTemplateV1 = {
      schemaVersion: 1,
      orientation,
      elements,
    };

    try {
      const res = await saveCertificateTemplateAction({
        id: selectedTemplateId || undefined,
        name: templateName,
        orientation,
        backgroundAttachmentId,
        layoutConfig,
        scope: scope === "SYSTEM_PRESET" ? "PRIVATE" : scope,
        expectedVersion: selectedTemplateId ? templateVersion : undefined,
      });

      if (res.success && res.data) {
        setSelectedTemplateId(res.data.id);
        setTemplateVersion(res.data.templateVersion);
        setStatusMessage({ type: "success", text: "บันทึกแบบเกียรติบัตรสำเร็จ" });
        loadTemplates();
      } else {
        setStatusMessage({ type: "error", text: res.error || "บันทึกไม่สำเร็จ" });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "เกิดข้อผิดพลาดในการบันทึก" });
    } finally {
      setSaving(false);
    }
  };

  const handleForkTemplate = async () => {
    if (!selectedTemplateId) return;
    setSaving(true);
    setStatusMessage(null);

    try {
      const res = await forkCertificateTemplateAction(selectedTemplateId);
      if (res.success && res.data) {
        applyTemplate(res.data);
        setStatusMessage({ type: "success", text: "คัดลอกแบบเกียรติบัตรสำเร็จ (ฉบับส่วนตัว)" });
        loadTemplates();
      } else {
        setStatusMessage({ type: "error", text: res.error || "คัดลอกไม่สำเร็จ" });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "เกิดข้อผิดพลาด" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplateId) return;
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบแบบเกียรติบัตรนี้?")) return;

    setSaving(true);
    setStatusMessage(null);

    try {
      const res = await deleteCertificateTemplateAction(selectedTemplateId);
      if (res.success) {
        setStatusMessage({ type: "success", text: "ลบแบบเกียรติบัตรเรียบร้อย" });
        setSelectedTemplateId("");
        loadTemplates();
      } else {
        setStatusMessage({ type: "error", text: res.error || "ลบไม่สำเร็จ" });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "เกิดข้อผิดพลาด" });
    } finally {
      setSaving(false);
    }
  };

  // --- Excel Roster Import ---
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

        if (data.length === 0) {
          setStatusMessage({ type: "error", text: "ไม่พบข้อมูลในไฟล์ Excel" });
          return;
        }

        const mapped = data.map((row) => ({
          fullName: String(row["ชื่อ-นามสกุล"] || row["ชื่อผู้รับ"] || row["fullName"] || row["name"] || "").trim(),
          certNumber: String(row["เลขที่เกียรติบัตร"] || row["certNumber"] || "").trim(),
          role: String(row["บทบาท/รางวัล"] || row["รางวัล"] || row["role"] || "").trim(),
          activityName: String(row["ชื่อกิจกรรม"] || row["activityName"] || "").trim(),
          department: String(row["หน่วยงาน"] || row["department"] || "").trim(),
          date: String(row["วันที่"] || row["date"] || "").trim(),
          qrCode: String(row["QR"] || row["qrCode"] || "").trim(),
        }));

        setRoster(mapped);
        setPreviewIndex(0);
        setStatusMessage({ type: "success", text: `นำเข้าข้อมูลผู้รับเกียรติบัตรสำเร็จ (${mapped.length} ท่าน)` });
      } catch (err: any) {
        setStatusMessage({ type: "error", text: `นำเข้า Excel ไม่สำเร็จ: ${err.message}` });
      }
    };
    reader.readAsBinaryString(file);
  };

  // Download Sample Excel Template
  const handleDownloadSampleExcel = () => {
    const sampleRows = [
      {
        "ชื่อ-นามสกุล": "นายสมศักดิ์ รักเรียน",
        "เลขที่เกียรติบัตร": "กจ. 001/2569",
        "บทบาท/รางวัล": "รางวัลชนะเลิศ การประกวดโครงงาน",
        "ชื่อกิจกรรม": "สัปดาห์วันวิทยาศาสตร์ ประจำปีการศึกษา ๒๕๖๙",
        "หน่วยงาน": "โรงเรียนกุดจับประชาสรรค์",
        "วันที่": "๑๑ กันยายน พ.ศ. ๒๕๖๙",
      },
      {
        "ชื่อ-นามสกุล": "นางสาวพรทิพย์ สุขใจ",
        "เลขที่เกียรติบัตร": "กจ. 002/2569",
        "บทบาท/รางวัล": "รางวัลรองชนะเลิศ อันดับ ๑",
        "ชื่อกิจกรรม": "สัปดาห์วันวิทยาศาสตร์ ประจำปีการศึกษา ๒๕๖๙",
        "หน่วยงาน": "โรงเรียนกุดจับประชาสรรค์",
        "วันที่": "๑๑ กันยายน พ.ศ. ๒๕๖๙",
      },
    ];

    // Non-mutating formula protection (Invariant G & U)
    const sanitized = sanitizeForExport(sampleRows);
    const ws = XLSX.utils.json_to_sheet(sanitized);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "รายชื่อผู้รับเกียรติบัตร");
    XLSX.writeFile(wb, "แบบฟอร์มรายชื่อเกียรติบัตร.xlsx");
  };

  // --- High-Fidelity PDF Batch Export ---
  const handleStartExport = async () => {
    if (!backgroundUrl) {
      setStatusMessage({ type: "error", text: "กรุณาอัปโหลดภาพพื้นหลังก่อนส่งออก PDF" });
      return;
    }

    const exportRoster =
      exportRangeMode === "RANGE"
        ? roster.slice(Math.max(0, rangeStart - 1), Math.min(roster.length, rangeEnd))
        : roster;

    if (exportRoster.length === 0) {
      setStatusMessage({ type: "error", text: "ไม่มีข้อมูลสำหรับส่งออกตามช่วงที่เลือก" });
      return;
    }

    setExportProgress({ current: 0, total: exportRoster.length });
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const layoutConfig: CertificateTemplateV1 = {
        schemaVersion: 1,
        orientation,
        elements,
      };

      const pdfBlob = await generateCertificatePdfBatch({
        template: layoutConfig,
        backgroundUrl,
        roster: exportRoster,
        signal: controller.signal,
        onProgress: (current, total) => {
          setExportProgress({ current, total });
        },
      });

      // Trigger browser file download
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `เกียรติบัตร_${templateName}_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      setStatusMessage({ type: "success", text: `ส่งออก PDF สำเร็จ (${exportRoster.length} แผ่น)` });
      setExportModalOpen(false);
    } catch (err: any) {
      if (err.message === "ABORTED") {
        setStatusMessage({ type: "error", text: "ยกเลิกการส่งออก PDF เรียบร้อย" });
      } else {
        setStatusMessage({ type: "error", text: `ส่งออก PDF ไม่สำเร็จ: ${err.message}` });
      }
    } finally {
      setExportProgress(null);
      abortControllerRef.current = null;
    }
  };

  const handleCancelExport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // --- Canvas Click & Drag to Reposition ---
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    // Find closest element within 5% distance
    let closestId: string | null = null;
    let minDist = 8;

    for (const el of elements) {
      const dist = Math.hypot(el.xPercent - clickX, el.yPercent - clickY);
      if (dist < minDist) {
        minDist = dist;
        closestId = el.id;
      }
    }

    if (closestId) {
      setSelectedElementId(closestId);
      isDraggingRef.current = true;
      dragElementIdRef.current = closestId;
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !dragElementIdRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const newX = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const newY = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    setElements((prev) =>
      prev.map((el) =>
        el.id === dragElementIdRef.current
          ? { ...el, xPercent: Math.max(5, Math.min(95, newX)), yPercent: Math.max(5, Math.min(95, newY)) }
          : el
      )
    );
  };

  const handleCanvasMouseUp = () => {
    isDraggingRef.current = false;
    dragElementIdRef.current = null;
  };

  const selectedElement = useMemo(() => {
    return elements.find((el) => el.id === selectedElementId) || null;
  }, [elements, selectedElementId]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {/* Top Studio Action Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200 gap-2 z-10">
        {/* Left: Template selection & Name */}
        <div className="flex items-center gap-2">
          <select
            value={selectedTemplateId}
            onChange={(e) => {
              const tmpl = templates.find((t) => t.id === e.target.value);
              if (tmpl) applyTemplate(tmpl);
            }}
            className="text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-1.5 bg-slate-50 hover:bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            <option value="">-- เลือกแบบเกียรติบัตร --</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.scope === "SYSTEM_PRESET" ? "⭐ " : t.scope === "SCHOOL_SHARED" ? "🏫 " : "🔒 "}
                {t.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="ชื่อแบบเกียรติบัตร"
            className="text-xs font-semibold px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-hidden w-48"
          />

          {/* Orientation Toggle (Invariant E) */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-100 text-xs">
            <button
              type="button"
              onClick={() => setOrientation("LANDSCAPE")}
              className={`px-2 py-1 rounded-md font-medium transition-all ${
                orientation === "LANDSCAPE" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              แนวนอน
            </button>
            <button
              type="button"
              onClick={() => setOrientation("PORTRAIT")}
              className={`px-2 py-1 rounded-md font-medium transition-all ${
                orientation === "PORTRAIT" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              แนวตั้ง
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Background Image Upload */}
          <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors">
            {uploadingBg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            <span>{backgroundUrl ? "เปลี่ยนภาพพื้นหลัง" : "อัปโหลดภาพพื้นหลัง"}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleBackgroundUpload}
              className="hidden"
            />
          </label>

          {/* Fork Button */}
          {selectedTemplateId && (
            <button
              type="button"
              onClick={handleForkTemplate}
              disabled={saving}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              title="คัดลอกเป็นแบบส่วนตัว"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>คัดลอก</span>
            </button>
          )}

          {/* Delete Button */}
          {selectedTemplateId && scope !== "SYSTEM_PRESET" && (
            <button
              type="button"
              onClick={handleDeleteTemplate}
              disabled={saving}
              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="ลบแบบนี้"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSaveTemplate}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>บันทึกแบบ</span>
          </button>

          {/* Export PDF Button */}
          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ส่งออก PDF ({roster.length})</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Notification Banner */}
      {statusMessage && (
        <div
          className={`flex items-center justify-between px-4 py-2 text-xs font-medium ${
            statusMessage.type === "success" ? "bg-emerald-50 text-emerald-800 border-b border-emerald-200" : "bg-rose-50 text-rose-800 border-b border-rose-200"
          }`}
        >
          <div className="flex items-center gap-1.5">
            {statusMessage.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{statusMessage.text}</span>
          </div>
          <button type="button" onClick={() => setStatusMessage(null)}>
            <X className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
          </button>
        </div>
      )}

      {/* Main Studio Body: Canvas Center + Sidebar Right */}
      <div className="flex flex-1 overflow-hidden">
        {/* Center: Interactive Canvas Studio */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-slate-200/70 p-6 flex flex-col items-center justify-center relative select-none"
        >
          {/* Canvas Wrapper */}
          <div className="relative shadow-xl rounded-lg overflow-hidden border border-slate-300 bg-white">
            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              className="cursor-crosshair block"
            />
          </div>

          {/* Bottom Preview Navigator */}
          <div className="mt-4 flex items-center gap-3 bg-white/95 backdrop-blur-xs px-3.5 py-1.5 rounded-full shadow-md border border-slate-200 text-xs text-slate-700">
            <span className="font-medium text-slate-500">ตัวอย่างผู้รับ:</span>
            <button
              type="button"
              onClick={() => setPreviewIndex((prev) => Math.max(0, prev - 1))}
              disabled={previewIndex <= 0}
              className="px-2 py-0.5 rounded-md hover:bg-slate-100 disabled:opacity-40"
            >
              ◀ ก่อนหน้า
            </button>
            <span className="font-semibold text-blue-600">
              {roster.length > 0 ? previewIndex + 1 : 0} / {roster.length}
            </span>
            <button
              type="button"
              onClick={() => setPreviewIndex((prev) => Math.min(roster.length - 1, prev + 1))}
              disabled={previewIndex >= roster.length - 1}
              className="px-2 py-0.5 rounded-md hover:bg-slate-100 disabled:opacity-40"
            >
              ถัดไป ▶
            </button>
            <span className="text-slate-400">|</span>
            <span className="truncate max-w-[180px] font-medium text-slate-800">
              {roster[previewIndex]?.fullName || "ไม่มีข้อมูล"}
            </span>
          </div>
        </div>

        {/* Right Sidebar: Element Inspector & Roster Panel */}
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col h-full overflow-y-auto">
          {/* Tab Selection */}
          <div className="p-3 border-b border-slate-100 bg-slate-50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Settings2 className="w-4 h-4 text-blue-600" />
              <span>เครื่องมือจัดวาง & ปรับแต่งตัวอักษร</span>
            </h3>
          </div>

          {/* Element Inspector */}
          {selectedElement ? (
            <div className="p-4 space-y-4 text-xs border-b border-slate-200">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">กล่องข้อความ</label>
                <div className="font-bold text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-md border border-blue-100">
                  {selectedElement.label} ({`{{${selectedElement.key}}}`})
                </div>
              </div>

              {/* Typography: Font Family & Size */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1">แบบอักษร</label>
                  <select
                    value={selectedElement.fontFamily}
                    onChange={(e) =>
                      setElements((prev) =>
                        prev.map((el) =>
                          el.id === selectedElement.id ? { ...el, fontFamily: e.target.value as any } : el
                        )
                      )
                    }
                    className="w-full border border-slate-200 rounded-md px-2 py-1.5 bg-white"
                  >
                    <option value="Sarabun">สารบรรณ (Sarabun)</option>
                    <option value="Prompt">พร้อมท์ (Prompt)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">ขนาด (pt)</label>
                  <input
                    type="number"
                    min="8"
                    max="100"
                    value={selectedElement.fontSizePt}
                    onChange={(e) =>
                      setElements((prev) =>
                        prev.map((el) =>
                          el.id === selectedElement.id ? { ...el, fontSizePt: Number(e.target.value) || 16 } : el
                        )
                      )
                    }
                    className="w-full border border-slate-200 rounded-md px-2 py-1.5"
                  />
                </div>
              </div>

              {/* Font Weight & Color */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1">น้ำหนักตัวอักษร</label>
                  <select
                    value={selectedElement.fontWeight}
                    onChange={(e) =>
                      setElements((prev) =>
                        prev.map((el) =>
                          el.id === selectedElement.id ? { ...el, fontWeight: e.target.value as any } : el
                        )
                      )
                    }
                    className="w-full border border-slate-200 rounded-md px-2 py-1.5 bg-white"
                  >
                    <option value="normal">ปกติ (Normal)</option>
                    <option value="bold">หนา (Bold)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">สีตัวอักษร</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={selectedElement.color}
                      onChange={(e) =>
                        setElements((prev) =>
                          prev.map((el) =>
                            el.id === selectedElement.id ? { ...el, color: e.target.value } : el
                          )
                        )
                      }
                      className="w-7 h-7 rounded border border-slate-200 cursor-pointer p-0.5"
                    />
                    <span className="font-mono text-[11px] text-slate-600">{selectedElement.color}</span>
                  </div>
                </div>
              </div>

              {/* Text Alignment */}
              <div>
                <label className="block text-slate-600 mb-1">การจัดแนวนอน</label>
                <div className="flex border border-slate-200 rounded-md p-0.5 bg-slate-50">
                  {(["left", "center", "right"] as const).map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() =>
                        setElements((prev) =>
                          prev.map((el) =>
                            el.id === selectedElement.id ? { ...el, textAlign: align } : el
                          )
                        )
                      }
                      className={`flex-1 py-1 text-center rounded capitalize font-medium ${
                        selectedElement.textAlign === align
                          ? "bg-white text-blue-600 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {align === "left" ? "ชิดซ้าย" : align === "center" ? "กึ่งกลาง" : "ชิดขวา"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Position Coordinates */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1">ตำแหน่ง X (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={selectedElement.xPercent}
                    onChange={(e) =>
                      setElements((prev) =>
                        prev.map((el) =>
                          el.id === selectedElement.id ? { ...el, xPercent: Number(e.target.value) || 0 } : el
                        )
                      )
                    }
                    className="w-full border border-slate-200 rounded-md px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">ตำแหน่ง Y (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={selectedElement.yPercent}
                    onChange={(e) =>
                      setElements((prev) =>
                        prev.map((el) =>
                          el.id === selectedElement.id ? { ...el, yPercent: Number(e.target.value) || 0 } : el
                        )
                      )
                    }
                    className="w-full border border-slate-200 rounded-md px-2 py-1.5"
                  />
                </div>
              </div>

              {/* Prefix & Suffix */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1">คำนำหน้า (Prefix)</label>
                  <input
                    type="text"
                    value={selectedElement.prefix || ""}
                    placeholder="เช่น เลขที่ "
                    onChange={(e) =>
                      setElements((prev) =>
                        prev.map((el) =>
                          el.id === selectedElement.id ? { ...el, prefix: e.target.value } : el
                        )
                      )
                    }
                    className="w-full border border-slate-200 rounded-md px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">คำต่อท้าย (Suffix)</label>
                  <input
                    type="text"
                    value={selectedElement.suffix || ""}
                    onChange={(e) =>
                      setElements((prev) =>
                        prev.map((el) =>
                          el.id === selectedElement.id ? { ...el, suffix: e.target.value } : el
                        )
                      )
                    }
                    className="w-full border border-slate-200 rounded-md px-2 py-1.5"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400">
              คลิกเลือกข้อความบนผืนผ้าใบเพื่อปรับแต่งตำแหน่งและรูปแบบ
            </div>
          )}

          {/* Roster Quick-Management Panel */}
          <div className="p-4 flex-1 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">รายชื่อผู้รับ ({roster.length} ท่าน)</span>
              <button
                type="button"
                onClick={handleDownloadSampleExcel}
                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                <span>ตัวอย่าง Excel</span>
              </button>
            </div>

            {/* Excel Upload button */}
            <label className="flex items-center justify-center gap-1.5 w-full py-2 px-3 border border-dashed border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer transition-colors">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>นำเข้าไฟล์ Excel / CSV</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelImport}
                className="hidden"
              />
            </label>

            {/* Quick List of Recipients */}
            <div className="flex-1 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-100 max-h-48 text-[11px]">
              {roster.map((row, idx) => (
                <div
                  key={idx}
                  onClick={() => setPreviewIndex(idx)}
                  className={`p-2 cursor-pointer flex items-center justify-between transition-colors ${
                    previewIndex === idx ? "bg-blue-50/80 font-semibold text-blue-900" : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className="truncate">{row.fullName || `ผู้รับ #${idx + 1}`}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">{row.certNumber}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Export Range & Progress Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-600" />
                <span>ส่งออกเกียรติบัตรเป็น PDF คุณภาพสูง (300 DPI)</span>
              </h3>
              {!exportProgress && (
                <button
                  type="button"
                  onClick={() => setExportModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {exportProgress ? (
              // Progress Bar with AbortController
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>กำลังเรนเดอร์ไฟล์ PDF คมชัดสูง...</span>
                  <span className="text-emerald-600">
                    {exportProgress.current} / {exportProgress.total} หน้า
                  </span>
                </div>

                {/* Animated Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-200 ease-out"
                    style={{
                      width: `${Math.round((exportProgress.current / exportProgress.total) * 100)}%`,
                    }}
                  />
                </div>

                <div className="text-[11px] text-slate-500 text-center">
                  กรุณาอย่าปิดหน้าต่างนี้ ระบบกำลังประมวลผลฟอนต์ภาษาไทยและสร้างเลย์เอาต์
                </div>

                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={handleCancelExport}
                    className="px-4 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
                  >
                    ยกเลิกการส่งออก
                  </button>
                </div>
              </div>
            ) : (
              // Range Selection Options
              <div className="space-y-4 text-xs">
                <div className="space-y-2">
                  <label className="font-semibold text-slate-700 block">เลือกช่วงการพิมพ์:</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        checked={exportRangeMode === "ALL"}
                        onChange={() => setExportRangeMode("ALL")}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>พิมพ์ทั้งหมด ({roster.length} แผ่น)</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        checked={exportRangeMode === "RANGE"}
                        onChange={() => setExportRangeMode("RANGE")}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>กำหนดช่วงลำดับที่พิมพ์:</span>
                    </label>

                    {exportRangeMode === "RANGE" && (
                      <div className="flex items-center gap-2 pl-6">
                        <span>ลำดับที่</span>
                        <input
                          type="number"
                          min="1"
                          max={roster.length}
                          value={rangeStart}
                          onChange={(e) => setRangeStart(Number(e.target.value) || 1)}
                          className="w-16 border border-slate-300 rounded px-2 py-1 text-center"
                        />
                        <span>ถึง</span>
                        <input
                          type="number"
                          min="1"
                          max={roster.length}
                          value={rangeEnd}
                          onChange={(e) => setRangeEnd(Number(e.target.value) || 1)}
                          className="w-16 border border-slate-300 rounded px-2 py-1 text-center"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-700">📌 คุณสมบัติไฟล์ PDF:</p>
                  <p>• ความละเอียด 300 DPI คมชัดระดับสิ่งพิมพ์</p>
                  <p>• รองรับวรรณยุกต์ภาษาไทยซ้อนหลายชั้นแบบไม่เพี้ยน</p>
                  <p>• จัดรูปแบบหน้า A4 ตามแนว {orientation === "LANDSCAPE" ? "แนวนอน" : "แนวตั้ง"}</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setExportModalOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    ปิด
                  </button>
                  <button
                    type="button"
                    onClick={handleStartExport}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
                  >
                    เริ่มสร้างและดาวน์โหลด PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
