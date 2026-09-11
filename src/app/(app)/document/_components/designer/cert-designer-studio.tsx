"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Upload,
  Download,
  Save,
  Copy,
  Trash2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Layers,
  Sparkles,
  Eye,
  EyeOff,
  Type,
  QrCode,
  Sliders,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Palette,
  ArrowUp,
  ArrowDown,
  RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  type CertificateTemplateV1,
  type CertificateElement,
  CertificateTemplateV1Schema,
  DEFAULT_CERTIFICATE_ELEMENTS,
  ELEMENT_PRESETS,
  FONT_MANIFEST,
  SUPPORTED_FONTS,
  type SupportedFont,
  sanitizeCellValue,
  sanitizeForExport,
  ptToCanvasPx,
  screenToDocumentPercent,
  documentPointToScreen,
  computeSnap,
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
  // --- Templates & State ---
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

  // --- Canva-like Studio UI Panels & Tools ---
  const [activeLeftTab, setActiveLeftTab] = useState<"elements" | "layers">("elements");
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // --- Command History (Undo / Redo) ---
  const [undoStack, setUndoStack] = useState<CertificateElement[][]>([]);
  const [redoStack, setRedoStack] = useState<CertificateElement[][]>([]);

  const pushHistory = useCallback(
    (newElements: CertificateElement[]) => {
      setUndoStack((prev) => [...prev.slice(-29), elements]);
      setRedoStack([]);
      setElements(newElements);
    },
    [elements]
  );

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [...prev, elements]);
    setElements(previous);
  }, [undoStack, elements]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setUndoStack((prev) => [...prev, elements]);
    setElements(next);
  }, [redoStack, elements]);

  // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Delete, Ctrl+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((mod && e.key.toLowerCase() === "y") || (mod && e.shiftKey && e.key.toLowerCase() === "z")) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        const activeTag = (document.activeElement?.tagName || "").toLowerCase();
        if (activeTag !== "input" && activeTag !== "textarea" && selectedElementId) {
          e.preventDefault();
          handleDeleteElement(selectedElementId);
        }
      } else if (mod && e.key.toLowerCase() === "d" && selectedElementId) {
        e.preventDefault();
        handleDuplicateElement(selectedElementId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, selectedElementId]);

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
          ? `${typeof window !== "undefined" ? window.location.origin : "https://eleave.kutchap.ac.th"}/verify/cert?token=${item.verifyToken}`
          : "https://eleave.kutchap.ac.th/verify/cert?token=SAMPLE",
      }));
    }
    return [
      {
        fullName: "นายสมศักดิ์ รักเรียน",
        certNumber: "กจ. 001/2569",
        role: "รางวัลชนะเลิศ การแข่งขันโครงงานวิทยาศาสตร์",
        activityName: "สัปดาห์วิทยาศาสตร์ ประจำปีการศึกษา ๒๕๖๙",
        department: "โรงเรียนกุดจับประชาสรรค์",
        date: "๑๑ กันยายน พ.ศ. ๒๕๖๙",
        qrCode: "https://eleave.kutchap.ac.th/verify/cert?token=SAMPLE",
      },
    ];
  });
  const [previewIndex, setPreviewIndex] = useState<number>(0);

  // --- UI Modals & Loaders ---
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploadingBg, setUploadingBg] = useState<boolean>(false);
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);
  const [exportRangeMode, setExportRangeMode] = useState<"ALL" | "RANGE">("ALL");
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(10);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // --- Snap & Drag References ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragElementIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const localPreviewUrlRef = useRef<string | null>(null);

  // Active snap guides line positions
  const [activeGuides, setActiveGuides] = useState<{ x?: number; y?: number }>({});

  // Clean up local preview object URLs on unmount
  useEffect(() => {
    return () => {
      if (localPreviewUrlRef.current) {
        URL.revokeObjectURL(localPreviewUrlRef.current);
      }
    };
  }, []);

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
      setUndoStack([]);
      setRedoStack([]);
    }
  };

  // Selected element shortcut
  const selectedElement = useMemo(() => {
    return elements.find((el) => el.id === selectedElementId) || null;
  }, [elements, selectedElementId]);

  // Update a single property on the active element
  const updateSelectedElement = (partial: Partial<CertificateElement>) => {
    if (!selectedElementId) return;
    const nextElements = elements.map((el) => {
      if (el.id === selectedElementId) {
        return { ...el, ...partial };
      }
      return el;
    });
    pushHistory(nextElements);
  };

  // --- Element Manager Handlers ---
  const handleAddElementPreset = (presetKey: string) => {
    const preset = ELEMENT_PRESETS.find((p) => p.key === presetKey);
    if (!preset) return;

    const newId = `el_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const newElement: CertificateElement = {
      ...preset.defaultElement,
      id: newId,
      // Stagger position slightly if multiple
      xPercent: 50,
      yPercent: Math.min(85, 30 + elements.length * 6),
    } as CertificateElement;

    pushHistory([...elements, newElement]);
    setSelectedElementId(newId);
  };

  const handleDeleteElement = (id: string) => {
    pushHistory(elements.filter((el) => el.id !== id));
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
  };

  const handleDuplicateElement = (id: string) => {
    const target = elements.find((el) => el.id === id);
    if (!target) return;

    const newId = `el_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const clone: CertificateElement = {
      ...target,
      id: newId,
      label: `${target.label} (สำเนา)`,
      xPercent: Math.min(95, target.xPercent + 3),
      yPercent: Math.min(95, target.yPercent + 3),
    };

    pushHistory([...elements, clone]);
    setSelectedElementId(newId);
  };

  const handleMoveLayer = (id: string, direction: "up" | "down") => {
    const idx = elements.findIndex((el) => el.id === id);
    if (idx < 0) return;
    if (direction === "up" && idx === elements.length - 1) return;
    if (direction === "down" && idx === 0) return;

    const newArr = [...elements];
    const targetIdx = direction === "up" ? idx + 1 : idx - 1;
    const temp = newArr[idx];
    newArr[idx] = newArr[targetIdx];
    newArr[targetIdx] = temp;

    pushHistory(newArr);
  };

  // --- Zoom Controls ---
  const handleZoomIn = () => setZoomScale((z) => Math.min(2.0, Math.round((z + 0.1) * 10) / 10));
  const handleZoomOut = () => setZoomScale((z) => Math.max(0.4, Math.round((z - 0.1) * 10) / 10));
  const handleZoomReset = () => setZoomScale(1.0);
  const handleZoomFit = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dims = A4_DIMS[orientation];
    const pad = 60;
    const scaleW = (rect.width - pad) / dims.previewWidth;
    const scaleH = (rect.height - pad) / dims.previewHeight;
    const fit = Math.min(scaleW, scaleH);
    setZoomScale(Math.max(0.4, Math.min(1.5, Math.round(fit * 100) / 100)));
  };

  // --- Background Upload Handler with 0ms Instant Preview ---
  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Instant 0ms Local Preview
    if (localPreviewUrlRef.current) {
      URL.revokeObjectURL(localPreviewUrlRef.current);
    }
    const localUrl = URL.createObjectURL(file);
    localPreviewUrlRef.current = localUrl;
    setBackgroundUrl(localUrl);
    setStatusMessage(null);

    // Auto-detect image aspect ratio to adjust orientation immediately
    const img = new Image();
    img.src = localUrl;
    img.onload = () => {
      if (img.width < img.height && orientation === "LANDSCAPE") {
        setOrientation("PORTRAIT");
      } else if (img.width > img.height && orientation === "PORTRAIT") {
        setOrientation("LANDSCAPE");
      }
    };

    // 2. Commit to Cloud Storage with R2 -> Supabase resilient fallback
    setUploadingBg(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("uploadSessionId", crypto.randomUUID());

      const res = await uploadCertificateBackgroundAction(formData);
      if (res.success && res.data) {
        setBackgroundAttachmentId(res.data.attachmentId);
        setBackgroundUrl(res.data.url);
        setStatusMessage({ type: "success", text: "อัปโหลดภาพพื้นหลังไปยังคลาวด์สำเร็จ" });
      } else {
        setStatusMessage({ type: "error", text: res.error || "อัปโหลดคลาวด์ไม่สำเร็จ (ใช้งานพรีวิวภาพปัจจุบันได้)" });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "เกิดข้อผิดพลาดในการอัปโหลด" });
    } finally {
      setUploadingBg(false);
    }
  };

  // --- Live Canvas Preview Renderer ---
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

      // 1. Draw Background or placeholder
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

      // 2. Draw Active Certificate Elements using shared PDF engine
      const activeData = roster[previewIndex] || roster[0] || {};
      drawCertificatePage({
        ctx,
        width: dims.previewWidth,
        height: dims.previewHeight,
        dpi: 72,
        backgroundImage: { width: dims.previewWidth, height: dims.previewHeight } as any,
        template: { schemaVersion: 1, orientation, elements },
        data: activeData,
      });

      // 3. Draw Active Snap Guides if dragging
      if (activeGuides.x !== undefined) {
        ctx.save();
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        const gx = (activeGuides.x / 100) * dims.previewWidth;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, dims.previewHeight);
        ctx.stroke();
        ctx.restore();
      }

      if (activeGuides.y !== undefined) {
        ctx.save();
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        const gy = (activeGuides.y / 100) * dims.previewHeight;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(dims.previewWidth, gy);
        ctx.stroke();
        ctx.restore();
      }

      // 4. Highlight Selected Element Bounding Box
      if (selectedElement && !selectedElement.hidden) {
        ctx.save();
        ctx.strokeStyle = "#4f46e5";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        const sx = (selectedElement.xPercent / 100) * dims.previewWidth;
        const sy = (selectedElement.yPercent / 100) * dims.previewHeight;

        let boxW = 100;
        let boxH = 40;
        if (selectedElement.type === "text") {
          const fontSize = ptToCanvasPx(selectedElement.fontSizePt, 72);
          ctx.font = `${selectedElement.fontWeight === "bold" ? "bold" : "normal"} ${fontSize}px "${selectedElement.fontFamily}", sans-serif`;
          const val = activeData[selectedElement.key] ?? selectedElement.sampleText ?? "";
          const metrics = ctx.measureText(`${selectedElement.prefix || ""}${val}${selectedElement.suffix || ""}`);
          boxW = Math.max(metrics.width + 16, 50);
          boxH = fontSize + 12;
        } else if (selectedElement.type === "qrcode") {
          const qrSize = ptToCanvasPx(selectedElement.fontSizePt * 4, 72);
          boxW = qrSize + 16;
          boxH = qrSize + 32;
        }

        let boxX = sx - boxW / 2;
        if (selectedElement.textAlign === "left") boxX = sx - 8;
        if (selectedElement.textAlign === "right") boxX = sx - boxW + 8;
        const boxY = sy - boxH / 2;

        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Corner handles
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#4f46e5";
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        const handleSize = 7;
        const drawHandle = (hx: number, hy: number) => {
          ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
          ctx.strokeRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
        };
        drawHandle(boxX, boxY);
        drawHandle(boxX + boxW, boxY);
        drawHandle(boxX, boxY + boxH);
        drawHandle(boxX + boxW, boxY + boxH);

        ctx.restore();
      }
    };

    renderPreview();
    return () => {
      cancelled = true;
    };
  }, [orientation, backgroundUrl, elements, roster, previewIndex, selectedElementId, selectedElement, activeGuides]);

  const drawPlaceholderBg = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = "#ffffff";
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
    ctx.fillText("กรุณาอัปโหลดภาพพื้นหลังเกียรติบัตร (JPG/PNG/WEBP)", w / 2, h / 2 - 10);
    ctx.font = "normal 12px Sarabun, sans-serif";
    ctx.fillText(`ขนาดมาตรฐาน A4 ${orientation === "LANDSCAPE" ? "แนวนอน" : "แนวตั้ง"}`, w / 2, h / 2 + 16);
  };

  // --- Smooth Drag-and-Drop with Internal Offset & Snap (Senior Lock 3) ---
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseDoc = screenToDocumentPercent(e.clientX, e.clientY, rect);

    // Find closest element
    let closestId: string | null = null;
    let minDist = 10; // 10% hit area radius

    for (const el of elements) {
      if (el.hidden) continue;
      const dist = Math.hypot(el.xPercent - mouseDoc.xPercent, el.yPercent - mouseDoc.yPercent);
      if (dist < minDist) {
        minDist = dist;
        closestId = el.id;
      }
    }

    if (closestId) {
      setSelectedElementId(closestId);
      isDraggingRef.current = true;
      dragElementIdRef.current = closestId;

      const targetEl = elements.find((el) => el.id === closestId);
      if (targetEl) {
        // Record internal cursor offset so element doesn't jump to center
        dragOffsetRef.current = {
          dx: mouseDoc.xPercent - targetEl.xPercent,
          dy: mouseDoc.yPercent - targetEl.yPercent,
        };
      }
    } else {
      setSelectedElementId(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !dragElementIdRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseDoc = screenToDocumentPercent(e.clientX, e.clientY, rect);

    // Calculate raw new position factoring in internal cursor grab offset
    let rawX = mouseDoc.xPercent - dragOffsetRef.current.dx;
    let rawY = mouseDoc.yPercent - dragOffsetRef.current.dy;

    // Collect snap guide targets: Canvas Center (50) and siblings
    const otherElements = elements.filter((el) => el.id !== dragElementIdRef.current && !el.hidden);
    const snapTargetsX = [50, ...otherElements.map((el) => el.xPercent)];
    const snapTargetsY = [50, ...otherElements.map((el) => el.yPercent)];

    const snapX = computeSnap(rawX, snapTargetsX, 1.2);
    const snapY = computeSnap(rawY, snapTargetsY, 1.2);

    const targetX = snapX.isSnapped ? snapX.snappedVal : Math.round(rawX * 10) / 10;
    const targetY = snapY.isSnapped ? snapY.snappedVal : Math.round(rawY * 10) / 10;

    setActiveGuides({
      x: snapX.isSnapped ? snapX.guidePos : undefined,
      y: snapY.isSnapped ? snapY.guidePos : undefined,
    });

    // Update live coordinates
    setElements((prev) =>
      prev.map((el) => {
        if (el.id === dragElementIdRef.current) {
          return {
            ...el,
            xPercent: Math.max(0, Math.min(100, targetX)),
            yPercent: Math.max(0, Math.min(100, targetY)),
          };
        }
        return el;
      })
    );
  };

  const handleCanvasMouseUp = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      dragElementIdRef.current = null;
      setActiveGuides({});
      // Push history snapshot after drag complete
      setUndoStack((prev) => [...prev.slice(-29), elements]);
      setRedoStack([]);
    }
  };

  // --- Save / Fork / Delete Actions ---
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
    const forkedName = `${templateName} (ฉบับคัดลอก)`;

    setSaving(true);
    setStatusMessage(null);

    try {
      const res = await forkCertificateTemplateAction({
        sourceTemplateId: selectedTemplateId,
        newName: forkedName,
        targetScope: "PRIVATE",
      });

      if (res.success && res.data) {
        setSelectedTemplateId(res.data.id);
        setTemplateName(res.data.name);
        setTemplateVersion(res.data.templateVersion);
        setStatusMessage({ type: "success", text: "คัดลอกแบบเกียรติบัตรเรียบร้อย" });
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

  // --- Excel Import & Export ---
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

        const origin = typeof window !== "undefined" ? window.location.origin : "https://eleave.kutchap.ac.th";
        const mapped = data.map((row) => ({
          fullName: String(row["ชื่อ-นามสกุล"] || row["ชื่อผู้รับ"] || row["fullName"] || row["name"] || "").trim(),
          certNumber: String(row["เลขที่เกียรติบัตร"] || row["certNumber"] || "").trim(),
          role: String(row["บทบาท/รางวัล"] || row["รางวัล"] || row["role"] || "").trim(),
          activityName: String(row["ชื่อกิจกรรม"] || row["activityName"] || "").trim(),
          department: String(row["หน่วยงาน"] || row["department"] || "").trim(),
          date: String(row["วันที่"] || row["date"] || "").trim(),
          qrCode: String(row["QR"] || row["qrCode"] || `${origin}/verify/cert?token=SAMPLE`).trim(),
        }));

        setRoster(mapped);
        setPreviewIndex(0);
        setStatusMessage({ type: "success", text: `นำเข้าข้อมูลสำเร็จ (${mapped.length} ท่าน)` });
      } catch (err: any) {
        setStatusMessage({ type: "error", text: `นำเข้าไม่สำเร็จ: ${err.message}` });
      }
    };
    reader.readAsBinaryString(file);
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
      setStatusMessage({ type: "error", text: "ไม่มีรายชื่อที่จะส่งออก PDF" });
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

  return (
    <div
      className={`flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 ${
        isFullscreen ? "fixed inset-0 z-50 h-screen w-screen" : "h-[calc(100vh-4rem)] min-h-[700px] rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800"
      }`}
    >
      {/* ─────────────────────────────────────────────────────────────────────────────
          1. TOP NAVIGATION BAR (Canva-style)
      ───────────────────────────────────────────────────────────────────────────── */}
      <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between gap-3 shrink-0 select-none">
        {/* Left: Brand & Template Switcher */}
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition"
              title="ย้อนกลับ"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-200/60 dark:border-indigo-800/40">
              Studio v5.1
            </span>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="font-bold text-sm bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-800 px-2 py-1 rounded border border-transparent focus:border-indigo-500 focus:outline-none transition w-48 sm:w-64"
              placeholder="ชื่อแบบเกียรติบัตร"
            />
          </div>
        </div>

        {/* Center: Undo / Redo & Zoom Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Undo / Redo */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 rounded text-slate-700 dark:text-slate-300 transition"
              title="เลิกทำ (Undo - Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 rounded text-slate-700 dark:text-slate-300 transition"
              title="ทำซ้ำ (Redo - Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1 hidden sm:block" />

          {/* Zoom Stepper */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 transition"
              title="ซูมออก (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomReset}
              className="px-2 py-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 transition min-w-[52px] text-center"
              title="คลิกเพื่อรีเซ็ต 100%"
            >
              {Math.round(zoomScale * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 transition"
              title="ซูมเข้า (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomFit}
              className="px-2 py-1 hover:bg-white dark:hover:bg-slate-700 rounded text-indigo-600 dark:text-indigo-400 font-bold transition ml-0.5"
              title="พอดีหน้าจอ (Fit)"
            >
              Fit
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition"
            title={isFullscreen ? "ออกจากเต็มจอ" : "เต็มหน้าจอ (Fullscreen)"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Right: Roster Preview Switcher & Actions */}
        <div className="flex items-center gap-2">
          {/* Recipient Switcher */}
          {roster.length > 0 && (
            <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-xs text-slate-600 dark:text-slate-300 gap-1.5">
              <button
                disabled={previewIndex <= 0}
                onClick={() => setPreviewIndex((p) => Math.max(0, p - 1))}
                className="p-0.5 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 rounded"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono font-bold">
                {previewIndex + 1} / {roster.length}
              </span>
              <button
                disabled={previewIndex >= roster.length - 1}
                onClick={() => setPreviewIndex((p) => Math.min(roster.length - 1, p + 1))}
                className="p-0.5 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 rounded"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSaveTemplate}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">บันทึก</span>
          </button>

          {/* Export PDF Button */}
          <button
            onClick={() => setExportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ส่งออก PDF</span>
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-indigo-800 text-[10px]">
              {roster.length}
            </span>
          </button>
        </div>
      </header>

      {/* Status Notification Banner */}
      {statusMessage && (
        <div
          className={`px-4 py-2 text-xs font-semibold flex items-center justify-between ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-b border-emerald-200"
              : "bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-b border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="p-0.5 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. MAIN STUDIO WORKSPACE (3-PANEL LAYOUT)
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ─── LEFT PANEL: ELEMENTS & LAYERS (Canva style) ─── */}
        <aside className="w-72 sm:w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
          {/* Panel Tab Navigation */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-bold">
            <button
              onClick={() => setActiveLeftTab("elements")}
              className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 transition ${
                activeLeftTab === "elements"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/20"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Plus className="w-4 h-4" />
              องค์ประกอบ
            </button>
            <button
              onClick={() => setActiveLeftTab("layers")}
              className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 transition ${
                activeLeftTab === "layers"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/20"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Layers className="w-4 h-4" />
              เลเยอร์ ({elements.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {activeLeftTab === "elements" ? (
              <>
                {/* Background Upload Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>ภาพพื้นหลังเกียรติบัตร</span>
                    <span className="text-[10px] text-slate-400 font-normal">A4 (JPG/PNG)</span>
                  </div>
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-xl p-3 cursor-pointer bg-slate-50 dark:bg-slate-800/40 hover:bg-indigo-50/30 transition group">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleBackgroundUpload}
                      className="hidden"
                    />
                    {uploadingBg ? (
                      <div className="flex items-center gap-2 py-1 text-xs text-indigo-600 font-bold">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>กำลังอัปโหลดคลาวด์...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 py-1 text-xs text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 font-semibold">
                        <Upload className="w-4 h-4" />
                        <span>{backgroundUrl ? "เปลี่ยนภาพพื้นหลัง" : "อัปโหลดภาพพื้นหลัง"}</span>
                      </div>
                    )}
                  </label>
                </div>

                {/* Quick Add Presets Grid */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      เพิ่มหัวข้อลงเกียรติบัตร
                    </span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                      คลิกเพื่อเพิ่ม
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {ELEMENT_PRESETS.map((preset) => {
                      const Icon = preset.type === "qrcode" ? QrCode : Type;
                      return (
                        <button
                          key={preset.key}
                          onClick={() => handleAddElementPreset(preset.key)}
                          className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 text-left transition group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center text-slate-600 dark:text-slate-300 transition shrink-0">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="truncate">
                            <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 truncate">
                              {preset.label}
                            </div>
                            <div className="text-[9px] text-slate-400 truncate">
                              {preset.type === "qrcode" ? "Square Badge" : preset.defaultElement.fontFamily}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Excel Mail-Merge Roster Box */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>รายชื่อ Mail-Merge</span>
                    <span className="text-[10px] text-slate-400">{roster.length} รายการ</span>
                  </div>
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer transition">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>นำเข้า Excel</span>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleExcelImport}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={() => {
                        const sampleRows = [
                          { "ชื่อ-นามสกุล": "นายสมศักดิ์ รักเรียน", "เลขที่เกียรติบัตร": "กจ. 001/2569", "บทบาท/รางวัล": "รางวัลชนะเลิศ", "ชื่อกิจกรรม": "สัปดาห์วิทยาศาสตร์", "หน่วยงาน": "โรงเรียนกุดจับประชาสรรค์", "วันที่": "๑๑ กันยายน พ.ศ. ๒๕๖๙" },
                        ];
                        const ws = XLSX.utils.json_to_sheet(sanitizeForExport(sampleRows));
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "รายชื่อ");
                        XLSX.writeFile(wb, "ตัวอย่างรายชื่อเกียรติบัตร.xlsx");
                      }}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 transition"
                      title="ดาวน์โหลดไฟล์ตัวอย่าง Excel"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Layers View */
              <div className="space-y-1.5">
                {elements
                  .slice()
                  .reverse()
                  .map((el, revIdx) => {
                    const idx = elements.length - 1 - revIdx;
                    const isSelected = el.id === selectedElementId;
                    return (
                      <div
                        key={el.id}
                        onClick={() => setSelectedElementId(el.id)}
                        className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition ${
                          isSelected
                            ? "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 font-bold text-indigo-900 dark:text-indigo-200"
                            : "bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {el.type === "qrcode" ? (
                            <QrCode className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          ) : (
                            <Type className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span className="truncate">{el.label}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Visibility Toggle */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateSelectedElement({ hidden: !el.hidden });
                            }}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-700"
                            title={el.hidden ? "แสดง" : "ซ่อน"}
                          >
                            {el.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>

                          {/* Move Layer Up */}
                          <button
                            disabled={idx === elements.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveLayer(el.id, "up");
                            }}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-20 rounded"
                            title="เลื่อนขึ้นหน้า"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>

                          {/* Move Layer Down */}
                          <button
                            disabled={idx === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveLayer(el.id, "down");
                            }}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-20 rounded"
                            title="เลื่อนลงหลัง"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteElement(el.id);
                            }}
                            className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded text-slate-400 hover:text-rose-600"
                            title="ลบ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </aside>

        {/* ─── CENTER: CERTIFICATE CANVAS VIEWPORT ─── */}
        <main
          ref={containerRef}
          className="flex-1 bg-slate-200/70 dark:bg-slate-950/90 overflow-auto flex items-center justify-center p-6 relative select-none"
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        >
          {/* Scaled Canvas Container */}
          <div
            style={{
              transform: `scale(${zoomScale})`,
              transformOrigin: "center center",
              transition: isDraggingRef.current ? "none" : "transform 0.15s ease-out",
            }}
            className="shadow-2xl rounded-sm overflow-hidden bg-white shrink-0 border border-slate-300 dark:border-slate-800"
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              className="cursor-crosshair block"
            />
          </div>
        </main>

        {/* ─── RIGHT PANEL: PROPERTIES INSPECTOR (Canva style) ─── */}
        <aside className="w-72 sm:w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
          <div className="h-12 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-500" />
              {selectedElement ? selectedElement.label : "การตั้งค่าแบบ"}
            </span>
            {selectedElement && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleDuplicateElement(selectedElement.id)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500"
                  title="ทำสำเนา (Ctrl+D)"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteElement(selectedElement.id)}
                  className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded text-rose-500"
                  title="ลบหัวข้อนี้ (Delete)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedElement ? (
              <>
                {selectedElement.type === "text" && (
                  <>
                    {/* Font Family Selector with Visual Previews */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        แบบอักษร (Font)
                      </label>
                      <select
                        value={selectedElement.fontFamily}
                        onChange={(e) => updateSelectedElement({ fontFamily: e.target.value })}
                        className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        {SUPPORTED_FONTS.map((fId) => {
                          const font = FONT_MANIFEST[fId];
                          return (
                            <option key={fId} value={font.family}>
                              {font.name}
                            </option>
                          );
                        })}
                      </select>
                      <p className="text-[10px] text-slate-400">
                        {FONT_MANIFEST[selectedElement.fontFamily as SupportedFont]?.description || "ฟอนต์ภาษาไทย"}
                      </p>
                    </div>

                    {/* Font Size (pt) & Styles (Bold, Italic) */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        ขนาดและลักษณะตัวอักษร
                      </label>
                      <div className="flex items-center gap-2">
                        {/* Size Stepper */}
                        <div className="flex-1 flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1">
                          <input
                            type="number"
                            min="8"
                            max="100"
                            value={selectedElement.fontSizePt}
                            onChange={(e) => updateSelectedElement({ fontSizePt: Number(e.target.value) || 12 })}
                            className="w-full bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-400 font-bold ml-1">pt</span>
                        </div>

                        {/* Bold / Italic Toggles */}
                        <button
                          onClick={() =>
                            updateSelectedElement({
                              fontWeight: selectedElement.fontWeight === "bold" ? "normal" : "bold",
                            })
                          }
                          className={`p-2 rounded-xl border transition ${
                            selectedElement.fontWeight === "bold"
                              ? "bg-indigo-600 text-white border-indigo-600 font-black"
                              : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600"
                          }`}
                          title="ตัวหนา (Bold)"
                        >
                          <Bold className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => updateSelectedElement({ italic: !selectedElement.italic })}
                          className={`p-2 rounded-xl border transition ${
                            selectedElement.italic
                              ? "bg-indigo-600 text-white border-indigo-600 font-black"
                              : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600"
                          }`}
                          title="ตัวเอียง (Italic)"
                        >
                          <Italic className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Text Alignment */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        การจัดชิดข้อความ
                      </label>
                      <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        <button
                          onClick={() => updateSelectedElement({ textAlign: "left" })}
                          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center transition ${
                            selectedElement.textAlign === "left"
                              ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-xs"
                              : "text-slate-500"
                          }`}
                        >
                          <AlignLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => updateSelectedElement({ textAlign: "center" })}
                          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center transition ${
                            selectedElement.textAlign === "center"
                              ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-xs"
                              : "text-slate-500"
                          }`}
                        >
                          <AlignCenter className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => updateSelectedElement({ textAlign: "right" })}
                          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center transition ${
                            selectedElement.textAlign === "right"
                              ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-xs"
                              : "text-slate-500"
                          }`}
                        >
                          <AlignRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Color Picker & Palette */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        สีตัวอักษร (Color)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedElement.color || "#1e293b"}
                          onChange={(e) => updateSelectedElement({ color: e.target.value })}
                          className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700 p-0.5 bg-transparent"
                        />
                        <input
                          type="text"
                          value={selectedElement.color || "#1e293b"}
                          onChange={(e) => updateSelectedElement({ color: e.target.value })}
                          className="flex-1 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 focus:outline-none"
                        />
                      </div>
                      {/* Presets */}
                      <div className="flex gap-1.5 pt-1">
                        {["#0f172a", "#1e3a8a", "#b45309", "#047857", "#dc2626", "#64748b"].map((c) => (
                          <button
                            key={c}
                            onClick={() => updateSelectedElement({ color: c })}
                            style={{ backgroundColor: c }}
                            className="w-5 h-5 rounded-full border border-white/50 shadow-xs hover:scale-110 transition"
                          />
                        ))}
                      </div>
                    </div>

                    {/* Text Effects: Letter Spacing & Shadow */}
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        เอฟเฟกต์ตัวอักษร (Text Effects)
                      </label>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>ระยะห่างตัวอักษร</span>
                          <span>{selectedElement.letterSpacing || 0}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="12"
                          value={selectedElement.letterSpacing || 0}
                          onChange={(e) => updateSelectedElement({ letterSpacing: Number(e.target.value) })}
                          className="w-full accent-indigo-600"
                        />
                      </div>

                      <label className="flex items-center gap-2 pt-1 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedElement.shadow || false}
                          onChange={(e) => updateSelectedElement({ shadow: e.target.checked })}
                          className="rounded text-indigo-600"
                        />
                        <span>เปิดเงาตัวอักษร (Drop Shadow)</span>
                      </label>
                    </div>

                    {/* Sample / Prefix / Suffix */}
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">คำนำหน้า (Prefix)</label>
                        <input
                          type="text"
                          value={selectedElement.prefix || ""}
                          onChange={(e) => updateSelectedElement({ prefix: e.target.value })}
                          className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1"
                          placeholder="เช่น เลขที่, มอบให้แก่"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">ข้อความตัวอย่าง (Sample)</label>
                        <input
                          type="text"
                          value={selectedElement.sampleText || ""}
                          onChange={(e) => updateSelectedElement({ sampleText: e.target.value })}
                          className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1"
                        />
                      </div>
                    </div>
                  </>
                )}

                {selectedElement.type === "qrcode" && (
                  <div className="space-y-3">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/50 space-y-1.5">
                      <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                        <QrCode className="w-4 h-4 text-indigo-600" />
                        <span>Square QR Badge (ระดับ H)</span>
                      </div>
                      <p className="text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
                        การ์ดสี่เหลี่ยมสีขาวพร้อม Quiet Zone และข้อความ &quot;สแกนตรวจสอบ&quot; สแกนติดง่าย 100% แม้พื้นหลังเกียรติบัตรมีลวดลายเข้ม
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        ขนาดกล่อง QR (pt)
                      </label>
                      <input
                        type="number"
                        min="12"
                        max="36"
                        value={selectedElement.fontSizePt}
                        onChange={(e) => updateSelectedElement({ fontSizePt: Number(e.target.value) || 16 })}
                        className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2"
                      />
                    </div>
                  </div>
                )}

                {/* Alignment Shortcuts */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    จัดตำแหน่งกึ่งกลางเอกสาร
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    <button
                      onClick={() => updateSelectedElement({ xPercent: 15 })}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600"
                    >
                      ชิดซ้าย
                    </button>
                    <button
                      onClick={() => updateSelectedElement({ xPercent: 50 })}
                      className="p-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 font-bold"
                    >
                      กึ่งกลาง (Center)
                    </button>
                    <button
                      onClick={() => updateSelectedElement({ xPercent: 85 })}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600"
                    >
                      ชิดขวา
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Template General Settings */
              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    ทิศทางเกียรติบัตร (Orientation)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setOrientation("LANDSCAPE")}
                      className={`p-2.5 rounded-xl border text-center font-bold transition ${
                        orientation === "LANDSCAPE"
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      แนวนอน (A4)
                    </button>
                    <button
                      onClick={() => setOrientation("PORTRAIT")}
                      className={`p-2.5 rounded-xl border text-center font-bold transition ${
                        orientation === "PORTRAIT"
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      แนวตั้ง (A4)
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    ขอบเขตการใช้งาน (Scope)
                  </label>
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 font-semibold"
                  >
                    <option value="PRIVATE">ส่วนตัว (เฉพาะฉัน)</option>
                    <option value="SCHOOL_SHARED">แชร์ทั้งโรงเรียน</option>
                  </select>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <button
                    onClick={handleForkTemplate}
                    disabled={!selectedTemplateId}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold flex items-center justify-center gap-2 text-slate-700 dark:text-slate-300 transition disabled:opacity-30"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>คัดลอกเป็นแบบใหม่ (Fork)</span>
                  </button>

                  <button
                    onClick={handleDeleteTemplate}
                    disabled={!selectedTemplateId || scope === "SYSTEM_PRESET"}
                    className="w-full py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold flex items-center justify-center gap-2 text-rose-600 transition disabled:opacity-30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบแบบเกียรติบัตรนี้</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. BATCH EXPORT PDF MODAL
      ───────────────────────────────────────────────────────────────────────────── */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  ส่งออกเกียรติบัตร PDF (300 DPI)
                </h3>
              </div>
              <button
                onClick={() => setExportModalOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1 border border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  แบบเกียรติบัตร: {templateName}
                </div>
                <div className="text-slate-500">
                  จำนวนรายชื่อในระบบ: <span className="font-bold text-indigo-600">{roster.length} ท่าน</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  ความละเอียด 300 DPI สำหรับพิมพ์ใบจริง พร้อม QR Code ตรวจสอบ
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  ช่วงการส่งออก (Export Range)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setExportRangeMode("ALL")}
                    className={`py-2 rounded-xl border text-center font-bold transition ${
                      exportRangeMode === "ALL"
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "border-slate-200 dark:border-slate-700 text-slate-600"
                    }`}
                  >
                    ทั้งหมด ({roster.length} แผ่น)
                  </button>
                  <button
                    onClick={() => setExportRangeMode("RANGE")}
                    className={`py-2 rounded-xl border text-center font-bold transition ${
                      exportRangeMode === "RANGE"
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "border-slate-200 dark:border-slate-700 text-slate-600"
                    }`}
                  >
                    กำหนดช่วงหน้า
                  </button>
                </div>
              </div>

              {exportRangeMode === "RANGE" && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-slate-500">จากแผ่นที่</span>
                  <input
                    type="number"
                    min="1"
                    max={roster.length}
                    value={rangeStart}
                    onChange={(e) => setRangeStart(Number(e.target.value) || 1)}
                    className="w-20 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center font-bold"
                  />
                  <span className="text-slate-500">ถึงแผ่นที่</span>
                  <input
                    type="number"
                    min={rangeStart}
                    max={roster.length}
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(Number(e.target.value) || roster.length)}
                    className="w-20 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center font-bold"
                  />
                </div>
              )}

              {exportProgress && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span>กำลังประมวลผล PDF...</span>
                    <span>
                      {exportProgress.current} / {exportProgress.total} แผ่น
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      style={{
                        width: `${Math.round((exportProgress.current / exportProgress.total) * 100)}%`,
                      }}
                      className="bg-indigo-600 h-full transition-all duration-150"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setExportModalOpen(false)}
                disabled={Boolean(exportProgress)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleStartExport}
                disabled={Boolean(exportProgress)}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-sm flex items-center justify-center gap-2"
              >
                {exportProgress ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>{exportProgress ? "กำลังสร้าง PDF..." : "ดาวน์โหลด PDF"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
