"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
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
  PenTool,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  type CertificateTemplateV1,
  type CertificateElement,
  CertificateTemplateV1Schema,
  DEFAULT_CERTIFICATE_ELEMENTS,
  ELEMENT_PRESETS,
  SIGNEE_LAYOUT_PRESETS,
  type ElementPresetItem,
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
  clearImageCache,
  evictImageCache,
  isValidDrawableImage,
  drawCertificatePage,
  generateCertificatePdfBatch,
  A4_DIMS,
} from "./cert-pdf-engine";
import {
  removeSignatureBackground,
} from "./signature-processor";
import {
  getCertificateTemplatesAction,
  saveCertificateTemplateAction,
  forkCertificateTemplateAction,
  deleteCertificateTemplateAction,
  uploadCertificateBackgroundAction,
  uploadCertificateSignatureAction,
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
  const [leftPanelOpen, setLeftPanelOpen] = useState<boolean>(true);
  const [rightPanelOpen, setRightPanelOpen] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  // Responsive device check using matchMedia for exact Tailwind lg (1024px) alignment (Senior Invariant 5)
  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mql = window.matchMedia("(max-width: 1023px)");
    const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const mobile = e.matches;
      setIsMobile(mobile);
      if (mobile) {
        // Automatically close sidebars on mobile so preview canvas is front-and-center
        setLeftPanelOpen(false);
        setRightPanelOpen(false);
      }
    };

    handleMediaChange(mql);

    if (mql.addEventListener) {
      mql.addEventListener("change", handleMediaChange);
      return () => mql.removeEventListener("change", handleMediaChange);
    } else if ((mql as any).addListener) {
      (mql as any).addListener(handleMediaChange);
      return () => (mql as any).removeListener(handleMediaChange);
    }
  }, []);

  // Lock body scroll while in fullscreen portal to prevent background page scrolling (Senior Invariant 4)
  useEffect(() => {
    if (isFullscreen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isFullscreen]);

  // HTML5 Fullscreen API synchronization with try/catch fallback (Senior Invariant 3)
  const handleToggleFullscreen = useCallback(async () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        // Fallback gracefully to CSS Portal Fullscreen if native fullscreen is denied
        console.warn("Native fullscreen denied, fallback to Portal CSS fullscreen:", err);
      }
    } else {
      setIsFullscreen(false);
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch (err) {
        console.warn("Native fullscreen exit failed:", err);
      }
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      // If native fullscreen was released because the OS file picker opened, DO NOT exit studio fullscreen!
      if (!document.fullscreenElement && isFullscreen) {
        if (isFileDialogOpenRef.current) {
          return;
        }
        setIsFullscreen(false);
      }
    };

    const handleWindowFocus = () => {
      if (isFileDialogOpenRef.current) {
        setTimeout(() => {
          isFileDialogOpenRef.current = false;
          // Re-engage native fullscreen if we are in studio fullscreen
          if (isFullscreen && !document.fullscreenElement && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        }, 300);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("focus", handleWindowFocus);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [isFullscreen]);

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

  // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Delete, Ctrl+D, Ctrl+\, Esc)
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
      } else if (mod && e.key === "\\") {
        e.preventDefault();
        setLeftPanelOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        // Senior Invariant 6: Accessibility hierarchy - close open drawer first before exiting fullscreen
        if (isMobile && (leftPanelOpen || rightPanelOpen)) {
          e.preventDefault();
          setLeftPanelOpen(false);
          setRightPanelOpen(false);
        } else if (isFullscreen) {
          e.preventDefault();
          handleToggleFullscreen();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, selectedElementId, isFullscreen, isMobile, leftPanelOpen, rightPanelOpen, handleToggleFullscreen]);

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
          ? `${typeof window !== "undefined" ? window.location.origin : "https://eleave.kutchap.ac.th"}/v/${item.verifyToken}`
          : "https://eleave.kutchap.ac.th/v/SAMPLE",
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
        qrCode: "https://eleave.kutchap.ac.th/v/SAMPLE",
      },
    ];
  });
  const [previewIndex, setPreviewIndex] = useState<number>(0);

  // --- UI Modals & Loaders ---
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploadingBg, setUploadingBg] = useState<boolean>(false);
  const [uploadingSigId, setUploadingSigId] = useState<string | null>(null);
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
  const activeBgImageRef = useRef<CanvasImageSource | null>(null);
  const activeSignaturesRef = useRef<Record<string, CanvasImageSource>>({});
  const isFileDialogOpenRef = useRef<boolean>(false);
  const rawSigFilesRef = useRef<Map<string, File | Blob>>(new Map());

  const openFileDialog = useCallback(() => {
    isFileDialogOpenRef.current = true;
  }, []);

  const closeFileDialog = useCallback(() => {
    setTimeout(() => {
      isFileDialogOpenRef.current = false;
    }, 400);
  }, []);

  // Active snap guides line positions
  const [activeGuides, setActiveGuides] = useState<{ x?: number; y?: number }>({});

  // Clean up local preview object URLs & release bounded image cache on unmount (Senior Invariant 2)
  useEffect(() => {
    return () => {
      if (localPreviewUrlRef.current) {
        URL.revokeObjectURL(localPreviewUrlRef.current);
        localPreviewUrlRef.current = null;
      }
      clearImageCache();
    };
  }, []);

  // Sync roster when initialBatch changes
  useEffect(() => {
    if (initialBatch && initialBatch.items && initialBatch.items.length > 0) {
      setRoster(
        initialBatch.items.map((item) => ({
          fullName: item.recipientName || "",
          certNumber: item.certificateNumber || "",
          role: item.roleTitle || "",
          activityName: initialBatch.activityTitle || "",
          department: initialBatch.organization || "",
          date: initialBatch.issuedDate || "",
          qrCode: item.verifyToken
            ? `${typeof window !== "undefined" ? window.location.origin : "https://eleave.kutchap.ac.th"}/v/${item.verifyToken}`
            : "https://eleave.kutchap.ac.th/v/SAMPLE",
        }))
      );
      setPreviewIndex(0);
    }
  }, [initialBatch]);

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
    // Revoke any pending local object URL
    if (localPreviewUrlRef.current) {
      URL.revokeObjectURL(localPreviewUrlRef.current);
      localPreviewUrlRef.current = null;
    }

    // Evict old template background from cache (Senior Invariant 2)
    if (backgroundUrl && backgroundUrl !== tmpl.backgroundUrl) {
      evictImageCache(backgroundUrl);
    }
    if (backgroundAttachmentId && backgroundAttachmentId !== tmpl.backgroundAttachmentId) {
      evictImageCache(backgroundAttachmentId);
    }

    setSelectedTemplateId(tmpl.id);
    setTemplateName(tmpl.name);
    setOrientation(tmpl.orientation);
    setScope(tmpl.scope);
    setTemplateVersion(tmpl.templateVersion || 1);
    setBackgroundAttachmentId(tmpl.backgroundAttachmentId);
    setBackgroundUrl(tmpl.backgroundUrl || "");
    activeBgImageRef.current = null;

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

  // Update a single property by element id
  const updateElementById = (id: string, partial: Partial<CertificateElement>) => {
    const nextElements = elements.map((el) => {
      if (el.id === id) {
        return { ...el, ...partial };
      }
      return el;
    });
    pushHistory(nextElements);
  };

  // Update a single property on the active element
  const updateSelectedElement = (partial: Partial<CertificateElement>) => {
    if (!selectedElementId) return;
    updateElementById(selectedElementId, partial);
  };

  // --- Element Manager Handlers ---
  const handleAddElementPreset = (presetKey: string) => {
    const preset = ELEMENT_PRESETS.find((p) => p.key === presetKey);
    if (!preset) return;

    if (preset.multiplicity !== "unlimited") {
      const existing = elements.find((el) => el.key === preset.key);
      if (existing) {
        setSelectedElementId(existing.id);
        setStatusMessage({
          type: "error",
          text: `"${preset.label}" มีอยู่ในแบบแล้ว (สามารถมีได้เพียง 1 รายการ)`,
        });
        return;
      }
    }

    const newId = `el_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const newElement: CertificateElement = {
      ...preset.defaultElement,
      id: newId,
      xPercent: preset.defaultElement.xPercent ?? 50,
      yPercent: preset.defaultElement.yPercent ?? Math.min(85, 30 + elements.length * 6),
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

    const preset = ELEMENT_PRESETS.find((p) => p.key === target.key);
    if (preset && preset.multiplicity !== "unlimited") {
      setStatusMessage({
        type: "error",
        text: `ไม่สามารถทำสำเนา "${target.label}" ได้เนื่องจากกำหนดให้มีได้เพียง 1 รายการ`,
      });
      return;
    }

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

  // Senior Architecture Pattern: Apply Signee Layout Strategies
  const handleApplySigneeStrategy = (strategy: "SINGLE_SIGNEE" | "DUAL_SIGNEE_BALANCED") => {
    const presetConfig = SIGNEE_LAYOUT_PRESETS[strategy];
    let newElements = [...elements];

    if (strategy === "SINGLE_SIGNEE") {
      // 1 Signee in center (50%)
      const signee1Idx = newElements.findIndex((el) => el.key === "signee1");
      if (signee1Idx >= 0) {
        newElements[signee1Idx] = {
          ...newElements[signee1Idx],
          xPercent: presetConfig.signee1.xPercent,
          yPercent: presetConfig.signee1.yPercent,
          textAlign: "center",
        };
      } else {
        const signee1Preset = ELEMENT_PRESETS.find((p) => p.key === "signee1");
        if (signee1Preset) {
          newElements.push({
            ...signee1Preset.defaultElement,
            id: `el_${Date.now().toString(36)}_s1`,
            xPercent: presetConfig.signee1.xPercent,
            yPercent: presetConfig.signee1.yPercent,
          } as CertificateElement);
        }
      }

      // If signature1 exists, center it too
      const sig1Idx = newElements.findIndex((el) => el.key === "signature1");
      if (sig1Idx >= 0) {
        newElements[sig1Idx] = {
          ...newElements[sig1Idx],
          xPercent: presetConfig.signature1.xPercent,
          yPercent: presetConfig.signature1.yPercent,
        };
      }

      setStatusMessage({ type: "success", text: "ปรับตำแหน่งเป็น: ผู้ลงนาม 1 ท่าน (กึ่งกลาง 50%)" });
    } else {
      // 2 Signees (signee1 left 28%, signee2 right 72%)
      const signee1Idx = newElements.findIndex((el) => el.key === "signee1");
      if (signee1Idx >= 0) {
        newElements[signee1Idx] = {
          ...newElements[signee1Idx],
          xPercent: presetConfig.signee1.xPercent,
          yPercent: presetConfig.signee1.yPercent,
          textAlign: "center",
        };
      } else {
        const p1 = ELEMENT_PRESETS.find((p) => p.key === "signee1");
        if (p1) {
          newElements.push({
            ...p1.defaultElement,
            id: `el_${Date.now().toString(36)}_s1`,
            xPercent: presetConfig.signee1.xPercent,
            yPercent: presetConfig.signee1.yPercent,
          } as CertificateElement);
        }
      }

      const sig1Idx = newElements.findIndex((el) => el.key === "signature1");
      if (sig1Idx >= 0) {
        newElements[sig1Idx] = {
          ...newElements[sig1Idx],
          xPercent: presetConfig.signature1.xPercent,
          yPercent: presetConfig.signature1.yPercent,
        };
      }

      const signee2Idx = newElements.findIndex((el) => el.key === "signee2");
      if (signee2Idx >= 0) {
        newElements[signee2Idx] = {
          ...newElements[signee2Idx],
          xPercent: presetConfig.signee2.xPercent,
          yPercent: presetConfig.signee2.yPercent,
          textAlign: "center",
        };
      } else {
        const p2 = ELEMENT_PRESETS.find((p) => p.key === "signee2");
        if (p2) {
          newElements.push({
            ...p2.defaultElement,
            id: `el_${Date.now().toString(36)}_s2`,
            xPercent: presetConfig.signee2.xPercent,
            yPercent: presetConfig.signee2.yPercent,
          } as CertificateElement);
        }
      }

      const sig2Idx = newElements.findIndex((el) => el.key === "signature2");
      if (sig2Idx >= 0) {
        newElements[sig2Idx] = {
          ...newElements[sig2Idx],
          xPercent: presetConfig.signature2.xPercent,
          yPercent: presetConfig.signature2.yPercent,
        };
      }

      setStatusMessage({ type: "success", text: "ปรับตำแหน่งเป็น: ผู้ลงนาม 2 ท่าน (คู่ ซ้าย 28% / ขวา 72%)" });
    }

    pushHistory(newElements);
  };

  // --- Signature Upload & Transparent Ink Processor ---
  const handleSignatureUpload = async (elementId: string, file: File) => {
    if (!file) return;

    rawSigFilesRef.current.set(elementId, file);

    const targetEl = elements.find((el) => el.id === elementId);
    const shouldRemoveBg = targetEl?.signatureRemoveBg !== false;
    const threshold = targetEl?.signatureThreshold || 215;

    await executeSignatureProcessingAndUpload(elementId, file, shouldRemoveBg, threshold);
  };

  const reprocessSignature = async (elementId: string, customThreshold?: number, removeBg?: boolean) => {
    const rawFile = rawSigFilesRef.current.get(elementId);
    const targetEl = elements.find((el) => el.id === elementId);
    if (!targetEl) return;

    const source = rawFile || targetEl.previewUrl;
    if (!source) {
      setStatusMessage({ type: "error", text: "ไม่พบไฟล์ภาพลายเซ็นต้นฉบับสำหรับการประมวลผล กรุณาเลือกไฟล์ใหม่" });
      return;
    }

    const shouldRemoveBg = removeBg !== undefined ? removeBg : (targetEl.signatureRemoveBg !== false);
    const threshold = customThreshold !== undefined ? customThreshold : (targetEl.signatureThreshold || 215);

    await executeSignatureProcessingAndUpload(elementId, source, shouldRemoveBg, threshold);
  };

  const executeSignatureProcessingAndUpload = async (
    elementId: string,
    source: File | Blob | string,
    removeBg: boolean,
    threshold: number
  ) => {
    setUploadingSigId(elementId);
    try {
      let uploadFile: File;
      let previewUrl = "";
      let aspectRatio = 2.5;

      if (removeBg) {
        setStatusMessage({ type: "success", text: "กำลังตัดพื้นหลังกระดาษให้เป็นหมึกโปร่งใสอัตโนมัติ..." });
        const processed = await removeSignatureBackground(source, {
          threshold,
          autoCrop: true,
          darkenInk: true,
        });
        previewUrl = processed.dataUrl;
        aspectRatio = processed.aspectRatio;
        const fileName = (typeof source === "object" && "name" in source && (source as any).name)
          ? (source as any).name.replace(/\.[^.]+$/, ".png")
          : `signature_${Date.now()}.png`;
        uploadFile = new File([processed.blob], fileName, { type: "image/png" });
      } else {
        if (typeof source === "string") {
          previewUrl = source;
          const blob = await fetch(source).then((r) => r.blob());
          uploadFile = new File([blob], `signature_${Date.now()}.png`, { type: blob.type || "image/png" });
        } else {
          previewUrl = URL.createObjectURL(source);
          uploadFile = source instanceof File ? source : new File([source], `signature_${Date.now()}.png`, { type: "image/png" });
        }
      }

      // 1. Instant 0ms Preview Update
      updateElementById(elementId, {
        previewUrl,
        aspectRatio,
        signatureRemoveBg: removeBg,
        signatureThreshold: threshold,
      });

      // 2. Commit to Cloud Storage with R2 -> Supabase resilient fallback
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("uploadSessionId", crypto.randomUUID());

      const res = await uploadCertificateSignatureAction(formData);
      if (res.success && res.data) {
        updateElementById(elementId, {
          signatureAttachmentId: res.data.attachmentId,
          previewUrl: previewUrl || res.data.url,
          signatureRemoveBg: removeBg,
          signatureThreshold: threshold,
        });
        setStatusMessage({
          type: "success",
          text: removeBg ? "ตัดพื้นหลังโปร่งใสและอัปโหลดลายเซ็นสำเร็จ" : "อัปโหลดภาพลายเซ็นสำเร็จ",
        });
      } else {
        setStatusMessage({
          type: "error",
          text: res.error || "อัปโหลดภาพลายเซ็นไม่สำเร็จ (ใช้งานภาพที่แสดงผลปัจจุบันได้)",
        });
      }
    } catch (err: any) {
      console.error("Signature processing error:", err);
      setStatusMessage({ type: "error", text: err.message || "เกิดข้อผิดพลาดในการประมวลผลลายเซ็น" });
    } finally {
      setUploadingSigId(null);
    }
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
  const handleZoomFit = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const dims = A4_DIMS[orientation];
    const pad = 32;
    const scaleW = Math.max(0.2, (rect.width - pad) / dims.previewWidth);
    const scaleH = Math.max(0.2, (rect.height - pad) / dims.previewHeight);
    const fit = Math.min(scaleW, scaleH);
    setZoomScale(Math.max(0.3, Math.min(2.5, Math.round(fit * 100) / 100)));
  }, [orientation]);

  // Auto-fit canvas to container on mount, orientation switch, fullscreen toggle, and panel collapse/expand
  useEffect(() => {
    const timer = setTimeout(() => {
      handleZoomFit();
    }, 150);
    return () => clearTimeout(timer);
  }, [isFullscreen, leftPanelOpen, rightPanelOpen, orientation, handleZoomFit]);

  useEffect(() => {
    const handleResize = () => {
      handleZoomFit();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleZoomFit]);

  // --- Background Upload Handler with ObjectURL Lifecycle (Senior Invariant 1) ---
  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so selecting the same file again triggers onChange
    e.target.value = "";

    // 1. Instant 0ms Local Preview via Object URL (low memory footprint, avoids Base64 heap bloating)
    if (localPreviewUrlRef.current) {
      URL.revokeObjectURL(localPreviewUrlRef.current);
    }
    const localUrl = URL.createObjectURL(file);
    localPreviewUrlRef.current = localUrl;
    setBackgroundUrl(localUrl);
    setStatusMessage(null);

    // Auto-detect image aspect ratio to adjust orientation immediately
    const img = new Image();
    img.onload = () => {
      activeBgImageRef.current = img;
      if (img.width < img.height && orientation === "LANDSCAPE") {
        setOrientation("PORTRAIT");
      } else if (img.width > img.height && orientation === "PORTRAIT") {
        setOrientation("LANDSCAPE");
      }
    };
    img.src = localUrl;

    // 2. Commit to Cloud Storage with resilient fallback
    setUploadingBg(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("uploadSessionId", crypto.randomUUID());

      const res = await uploadCertificateBackgroundAction(formData);
      if (res.success && res.data) {
        setBackgroundAttachmentId(res.data.attachmentId);
        if (res.data.url) {
          try {
            // Preload and cache using canonical attachmentId identity (Senior Invariant 2)
            const preloaded = await loadCanvasImage(res.data.url, res.data.attachmentId);
            activeBgImageRef.current = preloaded;
            setBackgroundUrl(res.data.url);

            // Cleanly revoke local Object URL now that cloud URL is active in cache
            if (localPreviewUrlRef.current) {
              URL.revokeObjectURL(localPreviewUrlRef.current);
              localPreviewUrlRef.current = null;
            }
          } catch (loadErr) {
            console.warn("Could not preload remote background, retaining local Object URL:", loadErr);
          }
        }
        setStatusMessage({ type: "success", text: "อัปโหลดภาพพื้นหลังสำเร็จ" });
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
      if (canvas.width !== dims.previewWidth) canvas.width = dims.previewWidth;
      if (canvas.height !== dims.previewHeight) canvas.height = dims.previewHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // ── Step 0: Immediate synchronous paint ──
      // Always paint immediately with currently available cache / fallback card.
      // This guarantees the canvas is NEVER blank/white on initial mount, portal switch, or drag!
      const activeData = roster[previewIndex] || roster[0] || {};
      const currentBg = activeBgImageRef.current;
      drawCertificatePage({
        ctx,
        width: dims.previewWidth,
        height: dims.previewHeight,
        dpi: 72,
        background: { mode: currentBg ? "IMAGE" : "FALLBACK", image: currentBg },
        template: { schemaVersion: 1, orientation, elements },
        data: activeData,
        signatureImages: activeSignaturesRef.current,
      });

      // ── Step 1: Load background image if available & not yet cached ──
      let bgImg: CanvasImageSource | null = currentBg;
      if (backgroundUrl) {
        try {
          const loaded = await loadCanvasImage(backgroundUrl);
          if (cancelled) return;
          if (isValidDrawableImage(loaded)) {
            bgImg = loaded;
            activeBgImageRef.current = loaded;
          }
        } catch (err) {
          console.warn("Background load error in preview:", err);
          if (activeBgImageRef.current && isValidDrawableImage(activeBgImageRef.current)) {
            bgImg = activeBgImageRef.current;
          }
        }
      } else if (activeBgImageRef.current && isValidDrawableImage(activeBgImageRef.current)) {
        bgImg = activeBgImageRef.current;
      }

      // ── Step 2: Preload signature images for studio canvas preview ──
      for (const el of elements) {
        if (el.type === "signature" && !el.hidden) {
          const sigSrc = el.previewUrl;
          if (sigSrc && !activeSignaturesRef.current[sigSrc]) {
            try {
              const loadedImg = await loadCanvasImage(sigSrc);
              if (el.signatureAttachmentId) {
                activeSignaturesRef.current[el.signatureAttachmentId] = loadedImg;
              }
              if (el.id) {
                activeSignaturesRef.current[el.id] = loadedImg;
              }
              activeSignaturesRef.current[sigSrc] = loadedImg;
            } catch (err) {
              console.warn("Could not preload signature image for preview:", err);
            }
          }
        }
      }
      if (cancelled) return;

      // ── Step 3: Draw Active Certificate Elements with all loaded assets ──
      drawCertificatePage({
        ctx,
        width: dims.previewWidth,
        height: dims.previewHeight,
        dpi: 72,
        background: { mode: bgImg ? "IMAGE" : "FALLBACK", image: bgImg },
        template: { schemaVersion: 1, orientation, elements },
        data: activeData,
        signatureImages: activeSignaturesRef.current,
      });

      // ── Step 4: Draw Active Snap Guides if dragging ──
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

      // ── Step 5: Highlight Selected Element Bounding Box ──
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
        } else if (selectedElement.type === "signature") {
          boxW = ((selectedElement.imageWidthPercent || 14) / 100) * dims.previewWidth + 8;
          boxH = boxW / (selectedElement.aspectRatio || 2.5) + 8;
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
    const rafId = requestAnimationFrame(() => {
      if (!cancelled) renderPreview();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [
    orientation,
    backgroundUrl,
    elements,
    roster,
    previewIndex,
    selectedElementId,
    selectedElement,
    activeGuides,
    isFullscreen,
    mounted,
  ]);

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
        const mapped = data.map((row, idx) => {
          const item = initialBatch?.items?.[idx];
          const certNumber = String(row["เลขที่เกียรติบัตร"] || row["certNumber"] || item?.certificateNumber || "").trim();
          const role = String(row["บทบาท/รางวัล"] || row["รางวัล"] || row["role"] || item?.roleTitle || "").trim();
          const qrCode = String(
            row["QR"] ||
            row["qrCode"] ||
            (item?.verifyToken
              ? `${origin}/v/${item.verifyToken}`
              : `${origin}/v/SAMPLE`)
          ).trim();

          return {
            fullName: String(row["ชื่อ-นามสกุล"] || row["ชื่อผู้รับ"] || row["fullName"] || row["name"] || item?.recipientName || "").trim(),
            certNumber,
            role,
            activityName: String(row["ชื่อกิจกรรม"] || row["activityName"] || initialBatch?.activityTitle || "").trim(),
            department: String(row["หน่วยงาน"] || row["department"] || initialBatch?.organization || "").trim(),
            date: String(row["วันที่"] || row["date"] || initialBatch?.issuedDate || "").trim(),
            qrCode,
          };
        });

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

  const studioLayout = (
    <div
      className={`flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 ${
        isFullscreen
          ? "fixed inset-0 z-[99999] w-screen h-screen m-0 p-0 overflow-hidden"
          : "h-[calc(100vh-4rem)] min-h-[700px] rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800"
      }`}
    >
      {/* ─────────────────────────────────────────────────────────────────────────────
          1. TOP NAVIGATION BAR (Canva-style)
      ───────────────────────────────────────────────────────────────────────────── */}
      <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-3 shrink-0 select-none">
        {/* Left: Brand & Template Switcher + Left Panel Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 transition"
              title="ย้อนกลับ"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Left Panel Toggle (Elements & Layers) */}
          <button
            onClick={() => setLeftPanelOpen((p) => !p)}
            aria-expanded={leftPanelOpen}
            aria-controls="studio-left-panel"
            aria-label={leftPanelOpen ? "พับแถบเครื่องมือซ้าย" : "เปิดแถบเครื่องมือซ้าย"}
            className={`p-2 rounded-lg transition ${
              leftPanelOpen
                ? "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400"
                : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}
            title={leftPanelOpen ? "พับแถบเครื่องมือซ้าย (Ctrl+\\)" : "เปิดแถบเครื่องมือซ้าย (Ctrl+\\)"}
          >
            <Layers className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-200/60 dark:border-indigo-800/40 hidden sm:inline-block">
              Studio v5.1
            </span>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="font-bold text-sm bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-800 px-2 py-1 rounded border border-transparent focus:border-indigo-500 focus:outline-none transition w-32 sm:w-52 md:w-64 truncate"
              placeholder="ชื่อแบบเกียรติบัตร"
            />
          </div>
        </div>

        {/* Center: Undo / Redo & Zoom Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Undo / Redo */}
          <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
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
              className="px-2 py-1 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 transition min-w-[48px] text-center"
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
            onClick={handleToggleFullscreen}
            className={`p-2 rounded-lg transition ${
              isFullscreen
                ? "bg-indigo-600 text-white shadow-xs"
                : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}
            title={isFullscreen ? "ออกจากเต็มจอ (Esc)" : "เต็มหน้าจอ (Fullscreen)"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Right: Roster Preview Switcher, Right Panel Toggle & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
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

          {/* Right Panel Toggle (Properties Inspector) */}
          <button
            onClick={() => setRightPanelOpen((p) => !p)}
            aria-expanded={rightPanelOpen}
            aria-controls="studio-right-panel"
            aria-label={rightPanelOpen ? "พับแถบปรับแต่งขวา" : "เปิดแถบปรับแต่งขวา"}
            className={`p-2 rounded-lg transition ${
              rightPanelOpen
                ? "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400"
                : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}
            title={rightPanelOpen ? "พับแถบปรับแต่งขวา" : "เปิดแถบปรับแต่งขวา"}
          >
            <Sliders className="w-4 h-4" />
          </button>

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
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">ส่งออก PDF</span>
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
      <div className="flex-1 flex overflow-hidden relative">
        {/* ─── LEFT PANEL (Desktop collapsible / Mobile slide-over drawer) ─── */}
        {isMobile && leftPanelOpen && (
          <div
            role="button"
            tabIndex={0}
            aria-label="ปิดแผงเครื่องมือ"
            onClick={() => setLeftPanelOpen(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setLeftPanelOpen(false);
              }
            }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          />
        )}

        <aside
          id="studio-left-panel"
          aria-label="แผงเครื่องมือองค์ประกอบ"
          aria-hidden={!leftPanelOpen}
          inert={!leftPanelOpen ? true : undefined}
          className={`bg-white dark:bg-slate-900 flex flex-col shrink-0 transition-all duration-300 ease-in-out ${
            isMobile
              ? `fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] shadow-2xl ${
                  leftPanelOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
                }`
              : `border-r border-slate-200 dark:border-slate-800 ${
                  leftPanelOpen ? "w-72 sm:w-80 opacity-100" : "w-0 border-r-0 overflow-hidden opacity-0 pointer-events-none"
                }`
          }`}
        >
          {/* Mobile Drawer Close Header */}
          {isMobile && (
            <div className="h-12 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                เครื่องมือและองค์ประกอบ
              </span>
              <button
                onClick={() => setLeftPanelOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

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
                  <label
                    onClick={openFileDialog}
                    className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-xl p-3 cursor-pointer bg-slate-50 dark:bg-slate-800/40 hover:bg-indigo-50/30 transition group"
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onClick={openFileDialog}
                      onChange={(e) => {
                        closeFileDialog();
                        handleBackgroundUpload(e);
                      }}
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

                {/* Senior Architecture Pattern: Signee Layout Strategy Presets */}
                <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>จัดรูปแบบผู้ลงนาม</span>
                    <span className="text-[10px] text-indigo-600 font-medium">ตำแหน่งอัตโนมัติ</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleApplySigneeStrategy("SINGLE_SIGNEE")}
                      className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition text-center group"
                    >
                      <span className="group-hover:text-indigo-600">👤 ผู้ลงนาม 1 ท่าน</span>
                      <span className="text-[9px] text-slate-400 font-normal">กึ่งกลาง (50%)</span>
                    </button>
                    <button
                      onClick={() => handleApplySigneeStrategy("DUAL_SIGNEE_BALANCED")}
                      className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition text-center group"
                    >
                      <span className="group-hover:text-indigo-600">👥 ผู้ลงนาม 2 ท่าน</span>
                      <span className="text-[9px] text-slate-400 font-normal">คู่ ซ้าย/ขวา (28%/72%)</span>
                    </button>
                  </div>
                </div>

                {/* Quick Add Presets Grid */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      เพิ่มหัวข้อลงเกียรติบัตร
                    </span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                      คลิกเพื่อเพิ่ม / เลือก
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {ELEMENT_PRESETS.map((preset) => {
                      const Icon = preset.type === "qrcode" ? QrCode : preset.type === "signature" ? PenTool : Type;
                      const isAlreadyAdded = preset.multiplicity !== "unlimited" && elements.some((el) => el.key === preset.key);

                      return (
                        <button
                          key={preset.key}
                          onClick={() => {
                            if (isAlreadyAdded) {
                              const existing = elements.find((el) => el.key === preset.key);
                              if (existing) {
                                setSelectedElementId(existing.id);
                                setStatusMessage({
                                  type: "success",
                                  text: `เลือก "${preset.label}" บนหน้าจอแล้ว`,
                                });
                              }
                            } else {
                              handleAddElementPreset(preset.key);
                            }
                          }}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition group relative ${
                            isAlreadyAdded
                              ? "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/20"
                              : "border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30"
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition shrink-0 ${
                              isAlreadyAdded
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                                : "bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-600 group-hover:text-white text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="truncate flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 truncate">
                                {preset.label}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[9px] text-slate-400 truncate">
                              <span className="truncate">
                                {preset.type === "qrcode"
                                  ? "Square Badge"
                                  : preset.type === "signature"
                                  ? "สแกน PNG"
                                  : preset.defaultElement.fontFamily}
                              </span>
                              {isAlreadyAdded && (
                                <span className="ml-1 text-[8px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                                  ✔ มีแล้ว
                                </span>
                              )}
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
                    <label
                      onClick={openFileDialog}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer transition"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>นำเข้า Excel</span>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onClick={openFileDialog}
                        onChange={(e) => {
                          closeFileDialog();
                          handleExcelImport(e);
                        }}
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
                              updateElementById(el.id, { hidden: !el.hidden });
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
          className="flex-1 bg-slate-200/70 dark:bg-slate-950/90 overflow-auto flex items-center justify-center p-3 sm:p-6 relative select-none"
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        >
          {/* Desktop Floating Pills when Panels are Collapsed */}
          {!isMobile && !leftPanelOpen && (
            <button
              onClick={() => setLeftPanelOpen(true)}
              className="absolute left-3 top-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 shadow-md border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 hover:text-indigo-600 transition"
              title="เปิดแถบองค์ประกอบ (Ctrl+\)"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>องค์ประกอบ</span>
            </button>
          )}

          {!isMobile && !rightPanelOpen && (
            <button
              onClick={() => setRightPanelOpen(true)}
              className="absolute right-3 top-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 shadow-md border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 hover:text-indigo-600 transition"
              title="เปิดแถบปรับแต่ง"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>ปรับแต่ง</span>
            </button>
          )}

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
              width={A4_DIMS[orientation].previewWidth}
              height={A4_DIMS[orientation].previewHeight}
              style={{
                width: `${A4_DIMS[orientation].previewWidth}px`,
                height: `${A4_DIMS[orientation].previewHeight}px`,
              }}
              onMouseDown={handleCanvasMouseDown}
              className="cursor-crosshair block"
            />
          </div>
        </main>

        {/* ─── RIGHT PANEL (Desktop collapsible / Mobile slide-over drawer) ─── */}
        {isMobile && rightPanelOpen && (
          <div
            role="button"
            tabIndex={0}
            aria-label="ปิดแผงปรับแต่ง"
            onClick={() => setRightPanelOpen(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setRightPanelOpen(false);
              }
            }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          />
        )}

        <aside
          id="studio-right-panel"
          aria-label="แผงปรับแต่งคุณสมบัติ"
          aria-hidden={!rightPanelOpen}
          inert={!rightPanelOpen ? true : undefined}
          className={`bg-white dark:bg-slate-900 flex flex-col shrink-0 transition-all duration-300 ease-in-out ${
            isMobile
              ? `fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] shadow-2xl ${
                  rightPanelOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
                }`
              : `border-l border-slate-200 dark:border-slate-800 ${
                  rightPanelOpen ? "w-72 sm:w-80 opacity-100" : "w-0 border-l-0 overflow-hidden opacity-0 pointer-events-none"
                }`
          }`}
        >
          <div className="h-12 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-500" />
              {selectedElement ? selectedElement.label : "การตั้งค่าแบบ"}
            </span>
            <div className="flex items-center gap-1">
              {selectedElement && (
                <button
                  onClick={() => handleDuplicateElement(selectedElement.id)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500"
                  title="ทำสำเนา (Ctrl+D)"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}
              {selectedElement && (
                <button
                  onClick={() => handleDeleteElement(selectedElement.id)}
                  className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded text-rose-500"
                  title="ลบหัวข้อนี้ (Delete)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              {isMobile && (
                <button
                  onClick={() => setRightPanelOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 ml-1"
                  title="ปิดแถบปรับแต่ง"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
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

                    {/* Element Label / Sample / Prefix / Suffix */}
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">ชื่อหัวข้อ (Label)</label>
                        <input
                          type="text"
                          value={selectedElement.label || ""}
                          onChange={(e) => updateSelectedElement({ label: e.target.value })}
                          className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          placeholder="เช่น หัวข้อเกียรติบัตร, ชื่องาน"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-500">
                            ข้อความที่แสดง / ตัวอย่าง (Text / Sample)
                          </label>
                          <span className="text-[9px] text-slate-400">กด Enter ขึ้นบรรทัดใหม่ได้</span>
                        </div>
                        <textarea
                          rows={3}
                          value={selectedElement.sampleText || ""}
                          onChange={(e) => updateSelectedElement({ sampleText: e.target.value })}
                          className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-y"
                          placeholder="ระบุข้อความที่จะแสดงบนเกียรติบัตร (รองรับหลายบรรทัด เช่น ชื่อ-สกุล และตำแหน่ง)"
                        />
                        {selectedElement.key.startsWith("signee") && (
                          <button
                            type="button"
                            onClick={() => {
                              const curr = selectedElement.sampleText || "";
                              if (!curr.includes("\n")) {
                                updateSelectedElement({ sampleText: `${curr}\nผู้อำนวยการโรงเรียนกุดจับประชาสรรค์` });
                              } else {
                                updateSelectedElement({ sampleText: `${curr}\nสังกัดสำนักงานเขตพื้นที่การศึกษามัธยมศึกษาอุดรธานี` });
                              }
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            + เพิ่มบรรทัดตำแหน่ง / หน่วยงาน
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">คำนำหน้า (Prefix)</label>
                          <input
                            type="text"
                            value={selectedElement.prefix || ""}
                            onChange={(e) => updateSelectedElement({ prefix: e.target.value })}
                            className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            placeholder="เช่น เลขที่ "
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">คำต่อท้าย (Suffix)</label>
                          <input
                            type="text"
                            value={selectedElement.suffix || ""}
                            onChange={(e) => updateSelectedElement({ suffix: e.target.value })}
                            className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            placeholder="เช่น  บาท,  คน"
                          />
                        </div>
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

                {selectedElement.type === "signature" && (
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800/50 space-y-1.5">
                      <div className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                        <PenTool className="w-4 h-4 text-blue-600" />
                        <span>ภาพลายเซ็น (ตัดพื้นหลังกระดาษอัตโนมัติ)</span>
                      </div>
                      <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                        รองรับทั้งภาพถ่ายลายเซ็นบนกระดาษ (JPG/PNG) โดยระบบจะสกัดเฉพาะลายเส้นหมึกให้โปร่งใส และรักษาอัตราส่วนภาพจริงโดยอัตโนมัติ
                      </p>
                    </div>

                    {/* Signature Image Upload / Replace */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        ไฟล์ภาพลายเซ็น
                      </label>
                      <label
                        onClick={openFileDialog}
                        className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-xl p-3 cursor-pointer bg-slate-50 dark:bg-slate-800/40 hover:bg-blue-50/30 transition group"
                      >
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onClick={openFileDialog}
                          onChange={async (e) => {
                            closeFileDialog();
                            const file = e.target.files?.[0];
                            if (!file) return;
                            await handleSignatureUpload(selectedElement.id, file);
                          }}
                          className="hidden"
                        />
                        {uploadingSigId === selectedElement.id ? (
                          <div className="flex items-center gap-2 py-1 text-xs text-blue-600 font-bold">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>กำลังตัดพื้นหลัง & อัปโหลด...</span>
                          </div>
                        ) : selectedElement.previewUrl ? (
                          <div className="space-y-2 w-full flex flex-col items-center">
                            {/* Checkerboard Pattern for transparent ink verification */}
                            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[size:10px_10px] dark:bg-[linear-gradient(45deg,#1e293b_25%,transparent_25%),linear-gradient(-45deg,#1e293b_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1e293b_75%),linear-gradient(-45deg,transparent_75%,#1e293b_75%)] w-full flex items-center justify-center min-h-[60px]">
                              <img
                                src={selectedElement.previewUrl}
                                alt="Signature preview"
                                className="max-h-16 object-contain"
                              />
                            </div>
                            <span className="text-[11px] text-blue-600 font-semibold group-hover:underline">
                              คลิกเพื่อเปลี่ยนรูปภาพใหม่
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 py-1 text-xs text-slate-600 dark:text-slate-400 group-hover:text-blue-600 font-semibold">
                            <Upload className="w-4 h-4" />
                            <span>อัปโหลดลายเซ็น (PNG/JPG กระดาษ)</span>
                          </div>
                        )}
                      </label>
                    </div>

                    {/* Automatic Background Removal Controls */}
                    {selectedElement.previewUrl && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>ตัดพื้นหลังกระดาษ (Transparent)</span>
                          </label>
                          <input
                            type="checkbox"
                            checked={selectedElement.signatureRemoveBg !== false}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              updateSelectedElement({ signatureRemoveBg: checked });
                              reprocessSignature(selectedElement.id, selectedElement.signatureThreshold || 215, checked);
                            }}
                            className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </div>

                        {selectedElement.signatureRemoveBg !== false && (
                          <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-slate-700">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-600 dark:text-slate-400 font-medium">ความไวในการตัดพื้นหลัง</span>
                              <span className="font-bold text-blue-600">
                                {selectedElement.signatureThreshold || 215}
                              </span>
                            </div>
                            <input
                              type="range"
                              min="150"
                              max="245"
                              step="1"
                              value={selectedElement.signatureThreshold || 215}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                updateSelectedElement({ signatureThreshold: val });
                              }}
                              onMouseUp={(e) => {
                                const val = Number((e.target as HTMLInputElement).value);
                                reprocessSignature(selectedElement.id, val, true);
                              }}
                              onTouchEnd={(e) => {
                                const val = Number((e.target as HTMLInputElement).value);
                                reprocessSignature(selectedElement.id, val, true);
                              }}
                              className="w-full accent-blue-600 cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-slate-400">
                              <span>หมึกเข้ม/กระดาษสว่าง</span>
                              <span>กระดาษมีเงา/สลัว</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => reprocessSignature(selectedElement.id, selectedElement.signatureThreshold || 215, true)}
                              disabled={uploadingSigId === selectedElement.id}
                              className="w-full mt-1.5 py-1 px-2 rounded-lg bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <RefreshCw className={`w-3 h-3 ${uploadingSigId === selectedElement.id ? "animate-spin" : ""}`} />
                              <span>ประมวลผลตัดพื้นหลังใหม่</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Width Slider (% of page width) */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          ความกว้างของลายเซ็น (% ของเอกสาร)
                        </label>
                        <span className="text-xs font-bold text-blue-600">
                          {selectedElement.imageWidthPercent || 14}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="6"
                        max="35"
                        step="1"
                        value={selectedElement.imageWidthPercent || 14}
                        onChange={(e) =>
                          updateSelectedElement({ imageWidthPercent: Number(e.target.value) })
                        }
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>

                    {/* Associated signee role selector */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        ผูกกับผู้ลงนาม
                      </label>
                      <select
                        value={selectedElement.signatureFor || "signee1"}
                        onChange={(e) =>
                          updateSelectedElement({ signatureFor: e.target.value as "signee1" | "signee2" })
                        }
                        className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2"
                      >
                        <option value="signee1">ผู้ลงนามคนที่ 1 (signee1)</option>
                        <option value="signee2">ผู้ลงนามคนที่ 2 (signee2)</option>
                      </select>
                    </div>

                    {selectedElement.previewUrl && (
                      <button
                        onClick={() =>
                          updateSelectedElement({
                            signatureAttachmentId: undefined,
                            previewUrl: undefined,
                          })
                        }
                        className="w-full py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/50 transition font-medium"
                      >
                        ลบภาพลายเซ็นนี้ออก
                      </button>
                    )}
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

      {/* ─── 4. MOBILE FLOATING ACTION BAR ─── */}
      {isMobile && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-2 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800">
          <button
            onClick={() => {
              setLeftPanelOpen((p) => !p);
              setRightPanelOpen(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              leftPanelOpen
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>องค์ประกอบ</span>
          </button>
          <button
            onClick={() => {
              setRightPanelOpen((p) => !p);
              setLeftPanelOpen(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              rightPanelOpen
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>ปรับแต่ง</span>
          </button>
          <button
            onClick={handleZoomFit}
            className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition"
            title="พอดีหน้าจอ"
          >
            Fit
          </button>
        </div>
      )}

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

  // Mount directly to document.body via React Portal when fullscreen to escape any ancestor container constraints
  if (isFullscreen && mounted && typeof document !== "undefined") {
    return createPortal(studioLayout, document.body);
  }

  return studioLayout;
}
