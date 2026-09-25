"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { 
  Camera, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Upload, 
  Volume2, 
  VolumeX, 
  ChevronRight, 
  Loader2, 
  ShieldCheck,
  X,
  RotateCcw,
  Maximize,
  Minimize,
  Settings,
  Clock,
  Play,
  Pause,
  Sliders,
  Check
} from "lucide-react";
import { processOmrSheet, warpPerspectiveBilinear, OmrScanResult, RawImageData, QuadPoints } from "@/lib/omr/omrEngine";
import { getTemplateGridForItems, ChoiceCount } from "@/lib/omr/omrTemplateGeometry";
import type { TemplateGridMetadata } from "@/lib/omr/omrEngine";
import { detectFiducialMarkers, MarkerDetectionResult } from "@/lib/omr/omrMarkerDetector";
import { ingestExamSubmissionAction, updateSubmissionStudentIdentityAction } from "@/app/actions/omr";
import { useSession } from "@/lib/auth-client";

interface OmrCameraScannerProps {
  paperId?: string;
  totalItems?: number;
  choiceCount?: number;
  initialFullscreen?: boolean;
  onScanComplete?: (result: any) => void;
  onCloseFullscreen?: () => void;
}

type AdvanceMode = "auto" | "manual";

export function OmrCameraScanner({ 
  paperId, 
  totalItems = 40, 
  choiceCount = 4,
  initialFullscreen = false,
  onScanComplete,
  onCloseFullscreen
}: OmrCameraScannerProps) {
  const { data: session } = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(initialFullscreen);
  const [activeChoiceCount, setActiveChoiceCount] = useState<ChoiceCount>(
    choiceCount === 5 ? 5 : choiceCount === 6 ? 6 : 4
  );

  // Auto-Capture & Marker Lock States
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);
  const [markerStatus, setMarkerStatus] = useState<"searching" | "partial" | "locked">("searching");
  const [markersDetectedCount, setMarkersDetectedCount] = useState(0);
  const detectedCornersRef = useRef<QuadPoints | null>(null);
  const lockStreakRef = useRef(0);
  const isCapturingRef = useRef(false);

  // Settings & Advance Configuration (Saved in localStorage)
  const [advanceMode, setAdvanceMode] = useState<AdvanceMode>("auto");
  const [advanceSeconds, setAdvanceSeconds] = useState(5);
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);
  const [isCountdownPaused, setIsCountdownPaused] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Scan Result Modal State + Visual Bubble Alignment Overlay + Quick Identity Edit
  const [scanResult, setScanResult] = useState<OmrScanResult | null>(null);
  const [diagnosticImageUrl, setDiagnosticImageUrl] = useState<string | null>(null);
  const [showBubbleOverlay, setShowBubbleOverlay] = useState<boolean>(true);
  const [savedSubmission, setSavedSubmission] = useState<any | null>(null);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [editStudentId, setEditStudentId] = useState<string>("");
  const [editSeatNo, setEditSeatNo] = useState<string>("");
  const [savingIdentity, setSavingIdentity] = useState<boolean>(false);

  // Template metadata
  const templateGrid: TemplateGridMetadata = getTemplateGridForItems(totalItems, activeChoiceCount);
  const templateLabel = totalItems <= 20
    ? `20 ข้อ (${activeChoiceCount} ตัวเลือก)`
    : totalItems <= 40
    ? `40 ข้อ (${activeChoiceCount} ตัวเลือก)`
    : totalItems <= 60
    ? `60 ข้อ (${activeChoiceCount} ตัวเลือก)`
    : totalItems <= 80
    ? `80 ข้อ (${activeChoiceCount} ตัวเลือก)`
    : `100 ข้อ (${activeChoiceCount} ตัวเลือก)`;

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem("omr_advance_mode") as AdvanceMode;
      if (savedMode === "auto" || savedMode === "manual") setAdvanceMode(savedMode);

      const savedSecs = localStorage.getItem("omr_advance_seconds");
      if (savedSecs) setAdvanceSeconds(parseInt(savedSecs, 10) || 5);

      const savedAutoCap = localStorage.getItem("omr_auto_capture");
      if (savedAutoCap !== null) setAutoCaptureEnabled(savedAutoCap === "true");

      const savedSound = localStorage.getItem("omr_sound");
      if (savedSound !== null) setSoundEnabled(savedSound === "true");
    } catch {
      // LocalStorage not available or blocked
    }
  }, []);

  const saveAdvanceMode = (mode: AdvanceMode) => {
    setAdvanceMode(mode);
    try { localStorage.setItem("omr_advance_mode", mode); } catch {}
  };

  const saveAdvanceSeconds = (secs: number) => {
    setAdvanceSeconds(secs);
    try { localStorage.setItem("omr_advance_seconds", secs.toString()); } catch {}
  };

  const saveAutoCapture = (enabled: boolean) => {
    setAutoCaptureEnabled(enabled);
    try { localStorage.setItem("omr_auto_capture", enabled ? "true" : "false"); } catch {}
  };

  const saveSoundEnabled = (enabled: boolean) => {
    setSoundEnabled(enabled);
    try { localStorage.setItem("omr_sound", enabled ? "true" : "false"); } catch {}
  };

  // Play audio chime
  const playChime = useCallback((success: boolean) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      if (success) {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      } else {
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.setValueAtTime(200, ctx.currentTime + 0.1);
      }

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);

      if (navigator.vibrate) {
        navigator.vibrate(success ? [50, 40, 80] : [120, 60, 120]);
      }
    } catch {
      // Audio context might be blocked
    }
  }, [soundEnabled]);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          await videoRef.current.play();
          setStreamActive(true);
        }
      } else {
        setCameraError("เบราว์เซอร์นี้ไม่รองรับการเข้าถึงกล้อง กรุณาอัปโหลดรูปภาพแทน");
      }
    } catch (err: any) {
      console.warn("Camera access failed:", err);
      setCameraError("ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตสิทธิ์เข้าถึงกล้อง หรือใช้วิธีอัปโหลดรูป");
    }
  }, []);

  // Stop Camera Stream
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setStreamActive(false);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // Visual Bubble Alignment Overlay Generator (ชี้วงกลมแต่ละข้อ + Timing Marks + 6 Fiducial Markers)
  const buildDiagnosticOverlayUrl = useCallback((
    rawImage: RawImageData,
    cornersToUse: QuadPoints | undefined,
    result: OmrScanResult
  ): string | null => {
    try {
      const canonical = cornersToUse
        ? warpPerspectiveBilinear(
            rawImage,
            cornersToUse,
            templateGrid.canvasWidth,
            templateGrid.canvasHeight,
            templateGrid.fiducialMarkers
          )
        : rawImage;

      const scanZoneCropHeight = Math.min(
        canonical.height,
        Math.round(canonical.height * 0.64)
      );
      const outCanvas = document.createElement("canvas");
      outCanvas.width = canonical.width;
      outCanvas.height = scanZoneCropHeight;
      const octx = outCanvas.getContext("2d");
      if (!octx) return null;

      const fullImgData = new ImageData(
        new Uint8ClampedArray(canonical.data),
        canonical.width,
        canonical.height
      );
      octx.putImageData(fullImgData, 0, 0);

      // 1. วาดกรอบ Fiducial Markers ทั้ง 6 จุด (4 มุม + 2 จุดกลาง)
      const fm = templateGrid.fiducialMarkers;
      const markerEntries = [
        { label: "M1:TL", m: fm.topLeft },
        { label: "M2:TR", m: fm.topRight },
        { label: "M3:ML", m: fm.midLeft },
        { label: "M4:MR", m: fm.midRight },
        { label: "M5:BL", m: fm.bottomLeft },
        { label: "M6:BR", m: fm.bottomRight }
      ];
      octx.lineWidth = 4;
      octx.font = "bold 20px monospace";
      for (const entry of markerEntries) {
        if (!entry.m) continue;
        const mx = entry.m.u * canonical.width;
        const my = entry.m.v * canonical.height;
        const mw = entry.m.width * canonical.width;
        const mh = entry.m.height * canonical.height;
        octx.strokeStyle = "#06b6d4";
        octx.strokeRect(mx - 2, my - 2, mw + 4, mh + 4);
        octx.fillStyle = "#06b6d4";
        octx.fillText(entry.label, mx, Math.max(22, my - 6));
      }

      // 2. วาดจุด Timing Marks ของแต่ละแถวข้อสอบ (ZipGrade Row Timing Marks)
      if (result.detectedTimingMarks && result.detectedTimingMarks.length > 0) {
        for (const tm of result.detectedTimingMarks) {
          const tx = tm.u * canonical.width;
          const ty = tm.v * canonical.height;
          octx.strokeStyle = tm.detected ? "#22d3ee" : "#94a3b8";
          octx.lineWidth = 2.5;
          octx.strokeRect(tx - 10, ty - 10, 20, 20);
        }
      }

      // 3. วาดวงกลมชี้แต่ละข้อและแต่ละตัวเลือก (Bubble ROI Inspection Overlay)
      for (const item of result.items) {
        if (item.itemNo > totalItems) continue;
        const positions = item.bubblePositions || [];
        for (const bp of positions) {
          const bx = bp.u * canonical.width;
          const by = bp.v * canonical.height;
          const br = Math.max(8, bp.radius * canonical.width);

          octx.beginPath();
          octx.arc(bx, by, br, 0, Math.PI * 2);
          if (bp.isMarked) {
            octx.strokeStyle = item.detectedChoices.length > 1 ? "#f59e0b" : "#10b981";
            octx.lineWidth = 4.5;
            octx.fillStyle = item.detectedChoices.length > 1
              ? "rgba(245, 158, 11, 0.28)"
              : "rgba(16, 185, 129, 0.28)";
            octx.fill();
          } else {
            octx.strokeStyle = "rgba(168, 85, 247, 0.75)";
            octx.lineWidth = 2;
          }
          octx.stroke();
        }
      }

      return outCanvas.toDataURL("image/jpeg", 0.85);
    } catch {
      return null;
    }
  }, [templateGrid, totalItems]);

  // Reset / Next Scan Action
  const resetForNextScan = useCallback(() => {
    setScanResult(null);
    setDiagnosticImageUrl(null);
    setSavedSubmission(null);
    setCountdownRemaining(null);
    setIsCountdownPaused(false);
    lockStreakRef.current = 0;
    isCapturingRef.current = false;
    detectedCornersRef.current = null;
    setMarkerStatus("searching");
  }, []);

  // Built-in Scan Calibration & Visual Bubble Pointer Simulator
  const runSimulationDiagnosticScan = useCallback(() => {
    setIsProcessing(true);
    try {
      const w = templateGrid.canvasWidth;
      const h = templateGrid.canvasHeight;
      const simCanvas = document.createElement("canvas");
      simCanvas.width = w;
      simCanvas.height = h;
      const sctx = simCanvas.getContext("2d");
      if (!sctx) return;

      // 1. พื้นหลังกระดาษสีขาว
      sctx.fillStyle = "#f8fafc";
      sctx.fillRect(0, 0, w, h);

      // 2. วาด Fiducial Markers ทั้ง 6 จุด
      const fm = templateGrid.fiducialMarkers;
      sctx.fillStyle = "#0f172a";
      for (const m of [fm.topLeft, fm.topRight, fm.midLeft, fm.midRight, fm.bottomLeft, fm.bottomRight]) {
        if (!m) continue;
        sctx.fillRect(m.u * w, m.v * h, m.width * w, m.height * h);
      }

      // 3. วาด Timing Marks ประจำแถวข้อสอบ (ZipGrade-style)
      if (templateGrid.timingMarks) {
        for (const tm of templateGrid.timingMarks) {
          const sz = tm.size * w;
          sctx.fillRect(tm.u * w - sz / 2, tm.v * h - sz / 2, sz, sz);
        }
      }

      // 4. จำลองการฝนรหัสนักเรียน (69001), เลขที่ (01) และชุดข้อสอบ (01)
      const targetStudentDigits = [6, 9, 0, 0, 1];
      for (const d of templateGrid.studentIdGrid.digits) {
        const cx = d.u * w;
        const cy = d.v * h;
        const r = d.radius * w;
        sctx.beginPath();
        sctx.arc(cx, cy, r, 0, Math.PI * 2);
        if (targetStudentDigits[d.digitIndex] === d.value) {
          sctx.fillStyle = "#0f172a";
          sctx.fill();
        } else {
          sctx.strokeStyle = "#64748b";
          sctx.lineWidth = 1.5;
          sctx.stroke();
        }
      }

      if (templateGrid.seatNoGrid) {
        const targetSeatDigits = [0, 1];
        for (const d of templateGrid.seatNoGrid.digits) {
          const cx = d.u * w;
          const cy = d.v * h;
          const r = d.radius * w;
          sctx.beginPath();
          sctx.arc(cx, cy, r, 0, Math.PI * 2);
          if (targetSeatDigits[d.digitIndex] === d.value) {
            sctx.fillStyle = "#0f172a";
            sctx.fill();
          } else {
            sctx.strokeStyle = "#64748b";
            sctx.lineWidth = 1.5;
            sctx.stroke();
          }
        }
      }

      // 5. จำลองการฝนข้อสอบครบทุกข้อ (1..totalItems)
      const choices = ["A", "B", "C", "D", "E", "F"].slice(0, activeChoiceCount);
      for (const q of templateGrid.questionBlocks) {
        if (q.itemNo > totalItems) continue;
        const chosenChoice = choices[(q.itemNo - 1) % choices.length];
        for (const b of q.bubbles) {
          const cx = b.u * w;
          const cy = b.v * h;
          const r = b.radius * w;
          sctx.beginPath();
          sctx.arc(cx, cy, r, 0, Math.PI * 2);
          if (b.choice === chosenChoice) {
            sctx.fillStyle = "#0f172a";
            sctx.fill();
          } else {
            sctx.strokeStyle = "#475569";
            sctx.lineWidth = 2;
            sctx.stroke();
          }
        }
      }

      const simImgData = sctx.getImageData(0, 0, w, h);
      const rawImage: RawImageData = { width: w, height: h, data: simImgData.data };

      const simCorners: QuadPoints = {
        topLeft: { x: (fm.topLeft.u + fm.topLeft.width / 2) * w, y: (fm.topLeft.v + fm.topLeft.height / 2) * h },
        topRight: { x: (fm.topRight.u + fm.topRight.width / 2) * w, y: (fm.topRight.v + fm.topRight.height / 2) * h },
        bottomLeft: { x: (fm.bottomLeft.u + fm.bottomLeft.width / 2) * w, y: (fm.bottomLeft.v + fm.bottomLeft.height / 2) * h },
        bottomRight: { x: (fm.bottomRight.u + fm.bottomRight.width / 2) * w, y: (fm.bottomRight.v + fm.bottomRight.height / 2) * h },
        midLeft: fm.midLeft ? { x: (fm.midLeft.u + fm.midLeft.width / 2) * w, y: (fm.midLeft.v + fm.midLeft.height / 2) * h } : undefined,
        midRight: fm.midRight ? { x: (fm.midRight.u + fm.midRight.width / 2) * w, y: (fm.midRight.v + fm.midRight.height / 2) * h } : undefined
      };

      const result = processOmrSheet(rawImage, templateGrid, simCorners, {
        expectedAspectRatio: templateGrid.scanZoneAspectRatio
      });
      const overlayUrl = buildDiagnosticOverlayUrl(rawImage, simCorners, result);
      setDiagnosticImageUrl(overlayUrl);
      setScanResult(result);
      setEditStudentId(result.studentId || "69001");
      setEditSeatNo(result.seatNoStr || (result.seatNo ? String(result.seatNo) : "01"));
      playChime(result.success);
    } finally {
      setIsProcessing(false);
    }
  }, [templateGrid, totalItems, activeChoiceCount, buildDiagnosticOverlayUrl, playChime]);

  // Frame Capture & Processing Function
  const captureAndProcess = useCallback(async (explicitCorners?: QuadPoints | null) => {
    if (!videoRef.current || isProcessing || isCapturingRef.current) return;

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    isCapturingRef.current = true;
    setIsProcessing(true);

    try {
      const canvas = canvasRef.current || document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Canvas 2D context unavailable");

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const rawImage: RawImageData = {
        width: imgData.width,
        height: imgData.height,
        data: imgData.data
      };

      const cornersToUse = explicitCorners || detectedCornersRef.current || undefined;

      // Execute OMR processing with 6-point perspective warp + timing marks
      const result = processOmrSheet(rawImage, templateGrid, cornersToUse, {
        expectedAspectRatio: templateGrid.scanZoneAspectRatio
      });
      const overlayUrl = buildDiagnosticOverlayUrl(rawImage, cornersToUse, result);
      setDiagnosticImageUrl(overlayUrl);

      if (result.success) {
        playChime(true);
        setScanResult(result);
        setEditStudentId(result.studentId || "");
        setEditSeatNo(result.seatNoStr || (result.seatNo ? String(result.seatNo) : ""));

        if (paperId && session?.user?.id) {
          setIngestLoading(true);
          const clientScanId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

          try {
            const submission = await ingestExamSubmissionAction({
              clientScanId,
              examPaperId: paperId,
              studentId: result.studentId || "00000",
              rawDetectedStudentId: result.rawDetectedStudentId,
              seatNo: result.seatNo ?? null,
              versionCode: result.versionCode || "01",
              scannedByUserId: session.user.id,
              items: result.items.map(item => ({
                itemNo: item.itemNo,
                detectedChoices: item.detectedChoices,
                fillRatios: item.fillRatios,
                confidenceScore: item.confidenceScore
              }))
            });

            setSavedSubmission(submission);
            if (submission?.studentId && !submission.studentId.startsWith("UNREAD_")) {
              setEditStudentId(submission.studentId);
            }
            if (submission?.seatNo != null) {
              setEditSeatNo(String(submission.seatNo).padStart(2, "0"));
            }
            if (onScanComplete) onScanComplete(submission);
          } catch (err: any) {
            console.error("Failed to ingest submission:", err);
          } finally {
            setIngestLoading(false);
          }
        }
      } else {
        playChime(false);
        setScanResult(result);
      }
    } catch (err: any) {
      console.error("Scanning error:", err);
      playChime(false);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, paperId, session, templateGrid, playChime, onScanComplete, buildDiagnosticOverlayUrl]);

  // Quick-Edit Student ID / Seat No Handler inside Camera Modal (Q2 - Option C)
  const handleSaveStudentIdentity = useCallback(async () => {
    const cleanId = editStudentId.trim();
    const parsedSeat = editSeatNo.trim() ? parseInt(editSeatNo.trim(), 10) : null;
    if (!cleanId) return;

    if (scanResult) {
      setScanResult({
        ...scanResult,
        studentId: cleanId,
        rawDetectedStudentId: cleanId,
        seatNo: parsedSeat,
        seatNoStr: editSeatNo.trim()
      });
    }

    if (savedSubmission?.id) {
      setSavingIdentity(true);
      try {
        const updated = await updateSubmissionStudentIdentityAction({
          submissionId: savedSubmission.id,
          studentId: cleanId,
          seatNo: parsedSeat,
          performedByUserId: session?.user?.id
        });
        setSavedSubmission(updated);
        if (onScanComplete) onScanComplete(updated);
      } catch (err) {
        console.error("Failed to update student identity:", err);
      } finally {
        setSavingIdentity(false);
      }
    }
  }, [editStudentId, editSeatNo, scanResult, savedSubmission, session, onScanComplete]);

  // Real-Time 6-Point Fiducial Marker Detection Analysis Loop (~250ms interval)
  useEffect(() => {
    if (!streamActive || isProcessing || scanResult) {
      return;
    }

    const intervalId = setInterval(() => {
      if (!videoRef.current || isProcessing || isCapturingRef.current || scanResult) return;
      const video = videoRef.current;
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      try {
        const offscreenCanvas = document.createElement("canvas");
        const maxSide = 480;
        const scale = Math.min(1.0, maxSide / Math.max(video.videoWidth, video.videoHeight));
        offscreenCanvas.width = Math.round(video.videoWidth * scale);
        offscreenCanvas.height = Math.round(video.videoHeight * scale);

        const ctx = offscreenCanvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
        const imgData = ctx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);

        const detection: MarkerDetectionResult = detectFiducialMarkers(
          imgData.data,
          offscreenCanvas.width,
          offscreenCanvas.height,
          templateGrid.scanZoneAspectRatio
        );

        setMarkersDetectedCount(detection.markersDetected);

        if (detection.found && detection.corners) {
          const invScale = 1 / scale;
          const fullCorners: QuadPoints = {
            topLeft: { x: detection.corners.topLeft.x * invScale, y: detection.corners.topLeft.y * invScale },
            topRight: { x: detection.corners.topRight.x * invScale, y: detection.corners.topRight.y * invScale },
            bottomLeft: { x: detection.corners.bottomLeft.x * invScale, y: detection.corners.bottomLeft.y * invScale },
            bottomRight: { x: detection.corners.bottomRight.x * invScale, y: detection.corners.bottomRight.y * invScale },
            midLeft: detection.corners.midLeft
              ? { x: detection.corners.midLeft.x * invScale, y: detection.corners.midLeft.y * invScale }
              : undefined,
            midRight: detection.corners.midRight
              ? { x: detection.corners.midRight.x * invScale, y: detection.corners.midRight.y * invScale }
              : undefined
          };

          detectedCornersRef.current = fullCorners;
          lockStreakRef.current += 1;
          setMarkerStatus("locked");

          if (autoCaptureEnabled && lockStreakRef.current >= 2 && !isCapturingRef.current) {
            captureAndProcess(fullCorners);
          }
        } else {
          detectedCornersRef.current = null;
          lockStreakRef.current = 0;
          setMarkerStatus(detection.markersDetected > 0 ? "partial" : "searching");
        }
      } catch (err) {
        // Marker detection frame error ignored to keep video smooth
      }
    }, 250);

    return () => clearInterval(intervalId);
  }, [streamActive, isProcessing, scanResult, autoCaptureEnabled, templateGrid, captureAndProcess]);

  // Countdown timer for Auto-Advance
  useEffect(() => {
    if (!scanResult || advanceMode !== "auto" || isCountdownPaused) {
      setCountdownRemaining(null);
      return;
    }

    setCountdownRemaining(advanceSeconds);

    const timer = setInterval(() => {
      setCountdownRemaining(prev => {
        if (prev === null) return advanceSeconds;
        if (prev <= 1) {
          clearInterval(timer);
          resetForNextScan();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [scanResult, advanceMode, advanceSeconds, isCountdownPaused, resetForNextScan]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
      if (onCloseFullscreen) onCloseFullscreen();
    }
  };

  // File Upload Fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        setIsProcessing(true);
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, img.width, img.height);

          const rawImage: RawImageData = {
            width: imgData.width,
            height: imgData.height,
            data: imgData.data
          };

          // Try marker detection on uploaded image
          const detection = detectFiducialMarkers(rawImage.data, rawImage.width, rawImage.height, templateGrid.scanZoneAspectRatio);
          const cornersToUse = detection.found ? detection.corners || undefined : undefined;

          const result = processOmrSheet(rawImage, templateGrid, cornersToUse, {
            expectedAspectRatio: templateGrid.scanZoneAspectRatio
          });
          const overlayUrl = buildDiagnosticOverlayUrl(rawImage, cornersToUse, result);
          setDiagnosticImageUrl(overlayUrl);
          setScanResult(result);
          setEditStudentId(result.studentId || "");
          setEditSeatNo(result.seatNoStr || (result.seatNo ? String(result.seatNo) : ""));
          playChime(result.success);

          if (result.success && paperId && session?.user?.id) {
            setIngestLoading(true);
            const clientScanId = `scan_up_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            const submission = await ingestExamSubmissionAction({
              clientScanId,
              examPaperId: paperId,
              studentId: result.studentId || "00000",
              rawDetectedStudentId: result.rawDetectedStudentId,
              seatNo: result.seatNo ?? null,
              versionCode: result.versionCode || "01",
              scannedByUserId: session.user.id,
              items: result.items.map(item => ({
                itemNo: item.itemNo,
                detectedChoices: item.detectedChoices,
                fillRatios: item.fillRatios,
                confidenceScore: item.confidenceScore
              }))
            });
            setSavedSubmission(submission);
            if (submission?.studentId && !submission.studentId.startsWith("UNREAD_")) {
              setEditStudentId(submission.studentId);
            }
            if (submission?.seatNo != null) {
              setEditSeatNo(String(submission.seatNo).padStart(2, "0"));
            }
            if (onScanComplete) onScanComplete(submission);
            setIngestLoading(false);
          }
        } catch (err) {
          console.error("File processing error:", err);
        } finally {
          setIsProcessing(false);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Determine reticle border color
  const reticleBorderClass = markerStatus === "locked"
    ? "border-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.9)]"
    : markerStatus === "partial"
    ? "border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]"
    : "border-red-400/80 shadow-[0_0_8px_rgba(248,113,113,0.4)]";

  return (
    <div 
      ref={containerRef}
      className={`relative w-full overflow-hidden bg-black text-white ${
        isFullscreen 
          ? "fixed inset-0 z-50 rounded-none flex flex-col justify-between" 
          : "max-w-4xl mx-auto rounded-3xl shadow-2xl"
      }`}
    >
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top HUD Controls */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-black/85 via-black/50 to-transparent">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${
            markerStatus === "locked" ? "bg-emerald-400 animate-ping" : markerStatus === "partial" ? "bg-amber-400" : "bg-red-400"
          }`} />
          <span className="text-xs font-bold tracking-wider uppercase">
            {markerStatus === "locked" ? (
              <span className="text-emerald-400 flex items-center gap-1">🎯 LOCKED {markersDetectedCount >= 6 ? "6/6" : "4/6"} มาร์กเกอร์</span>
            ) : markerStatus === "partial" ? (
              <span className="text-amber-400">🔍 กำลังล็อค ({markersDetectedCount}/6)</span>
            ) : (
              <span className="text-slate-300">เล็งมาร์กเกอร์ 6 จุด</span>
            )}
          </span>
          <span className="hidden sm:inline-block text-[11px] bg-white/10 backdrop-blur-md border border-white/20 text-purple-300 font-mono px-2 py-0.5 rounded-full">
            {templateLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 4 / 5 / 6 Choice Mode Switcher */}
          <button
            type="button"
            onClick={() =>
              setActiveChoiceCount((prev) => (prev === 4 ? 5 : prev === 5 ? 6 : 4))
            }
            className="px-2.5 py-1.5 rounded-xl bg-purple-500/25 hover:bg-purple-500/40 border border-purple-400/50 backdrop-blur-md transition text-purple-200 text-[11px] font-bold"
            title="คลิกเพื่อสลับแบบกระดาษคำตอบ: 4 ตัวเลือก (ก-ง มาตรฐาน), 5 ตัวเลือก (ก-จ พิเศษ), 6 ตัวเลือก (ก-ฉ พิเศษ)"
          >
            {activeChoiceCount} ตัวเลือก ({activeChoiceCount === 4 ? "ก-ง" : activeChoiceCount === 5 ? "ก-จ" : "ก-ฉ"})
          </button>

          {/* Test / Simulate Scan & Visual Bubble Pointer */}
          <button
            type="button"
            onClick={runSimulationDiagnosticScan}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 backdrop-blur-md transition text-emerald-300 text-[11px] font-bold flex items-center gap-1"
            title="ทดสอบระบบสแกนและแสดงวงกลมชี้แต่ละข้อ (ZipGrade 6-Point Mode)"
          >
            🎯 ทดสอบชี้วงกลม
          </button>

          {/* Settings Trigger */}
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md transition text-white"
            title="ตั้งค่าการสแกนและโหมดเปลี่ยนแผ่นอัตโนมัติ"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Sound Mute/Unmute */}
          <button
            type="button"
            onClick={() => saveSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md transition text-white"
            title={soundEnabled ? "ปิดเสียงบี๊บ" : "เปิดเสียงบี๊บ"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          {/* Upload Fallback */}
          <label className="p-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md transition text-white cursor-pointer" title="อัปโหลดรูปกระดาษคำตอบ">
            <Upload className="w-4 h-4" />
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-purple-600 hover:bg-purple-700 backdrop-blur-md transition text-white font-bold"
            title={isFullscreen ? "ย่อหน้าจอ" : "แสดงเต็มหน้าจอ (เหมาะสำหรับมือถือ)"}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Viewfinder Box */}
      <div className={`relative w-full bg-slate-950 flex items-center justify-center overflow-hidden ${
        isFullscreen ? "flex-1 h-full" : "aspect-[3/4] sm:aspect-[4/3] max-h-[70vh]"
      }`}>
        {cameraError ? (
          <div className="p-6 text-center space-y-3 max-w-sm">
            <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
            <div className="text-sm font-bold text-white">{cameraError}</div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs cursor-pointer shadow-lg">
                <Upload className="w-4 h-4" /> เลือกไฟล์รูปภาพเพื่อตรวจ
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
              <button
                type="button"
                onClick={runSimulationDiagnosticScan}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-lg"
              >
                🎯 ทดสอบชี้วงกลมสแกน
              </button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />

            {/* 6-Point Guide Reticles (4 Corners + 2 Mid-Side Markers) - Dynamic Color by Lock Status */}
            <div className="absolute inset-6 sm:inset-12 pointer-events-none border border-white/20 rounded-3xl transition-all duration-200">
              {/* Top-Left Reticle */}
              <div className={`absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 rounded-tl-2xl transition-all duration-200 ${reticleBorderClass}`} />
              {/* Top-Right Reticle */}
              <div className={`absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 rounded-tr-2xl transition-all duration-200 ${reticleBorderClass}`} />
              {/* Mid-Left Reticle (Point 3) */}
              <div className={`absolute top-1/2 -translate-y-1/2 -left-1 w-4 h-10 border-l-4 border-y-2 rounded-l-lg transition-all duration-200 ${reticleBorderClass}`} />
              {/* Mid-Right Reticle (Point 4) */}
              <div className={`absolute top-1/2 -translate-y-1/2 -right-1 w-4 h-10 border-r-4 border-y-2 rounded-r-lg transition-all duration-200 ${reticleBorderClass}`} />
              {/* Bottom-Left Reticle */}
              <div className={`absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 rounded-bl-2xl transition-all duration-200 ${reticleBorderClass}`} />
              {/* Bottom-Right Reticle */}
              <div className={`absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 rounded-br-2xl transition-all duration-200 ${reticleBorderClass}`} />

              {/* Center Crosshair Target */}
              <div className="absolute inset-0 flex items-center justify-center opacity-25">
                <div className="w-10 h-0.5 bg-white" />
                <div className="w-0.5 h-10 bg-white absolute" />
              </div>

              {/* Status Pill Badge inside Viewfinder */}
              <div className="absolute top-4 inset-x-0 flex justify-center pointer-events-none">
                <div className={`px-3 py-1 rounded-full text-[11px] font-bold backdrop-blur-md transition-all ${
                  markerStatus === "locked"
                    ? "bg-emerald-500/80 text-white shadow-lg shadow-emerald-500/30 scale-105"
                    : markerStatus === "partial"
                    ? "bg-amber-500/80 text-white"
                    : "bg-black/60 text-slate-300 border border-white/10"
                }`}>
                  {markerStatus === "locked" 
                    ? `🎯 ล็อคมาร์กเกอร์ ${markersDetectedCount}/6 จุดสำเร็จ - กำลังถ่ายภาพอัตโนมัติ` 
                    : markerStatus === "partial"
                    ? `🔍 ตรวจพบ ${markersDetectedCount}/6 จุด (จัดกระดาษให้อยู่ในกรอบ)`
                    : "วางกระดาษคำตอบให้มาร์กเกอร์ 6 จุด (4 มุม + 2 ข้าง) อยู่ในกรอบ"}
                </div>
              </div>
            </div>

            {/* Scanning Laser Line Animation when processing */}
            {isProcessing && (
              <div className="absolute inset-x-6 sm:inset-x-12 h-1.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-bounce shadow-[0_0_20px_rgba(192,132,252,1)]" />
            )}
          </>
        )}
      </div>

      {/* Bottom Action Control Bar */}
      <div className="p-4 sm:p-5 bg-gradient-to-t from-black via-black/90 to-transparent flex items-center justify-between gap-4 z-10">
        <div className="text-xs text-slate-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="hidden sm:inline">
            {autoCaptureEnabled ? "โหมดถ่ายอัตโนมัติ 6 จุด (ZipGrade)" : "โหมดกดถ่ายด้วยตัวเอง"}
          </span>
          <span className="text-[11px] text-purple-300 font-mono">
            {advanceMode === "auto" ? `• ถัดไปอัตโนมัติ ${advanceSeconds}s` : "• กดเปลี่ยนแผ่น"}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            disabled={isProcessing}
            onClick={runSimulationDiagnosticScan}
            className="h-12 px-3.5 rounded-2xl font-bold text-xs bg-slate-800 hover:bg-slate-700 border border-emerald-500/40 text-emerald-300 transition flex items-center gap-1.5"
          >
            🎯 ชี้วงกลมทดสอบ
          </button>

          {/* Manual Capture Button (Always available as fallback) */}
          <button
            type="button"
            disabled={isProcessing || !streamActive}
            onClick={() => captureAndProcess(null)}
            className={`h-12 px-6 rounded-2xl font-bold text-sm shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 ${
              markerStatus === "locked"
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-500/30"
                : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-500/30"
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> กำลังตรวจ...
              </>
            ) : (
              <>
                <Camera className="w-5 h-5" /> ตรวจแผ่นคำตอบ
              </>
            )}
          </button>
        </div>
      </div>

      {/* Result Bottom Sheet / Modal */}
      {scanResult && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md p-4 sm:p-6 flex flex-col justify-end transition-all overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-6 space-y-4 max-w-lg mx-auto w-full shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {scanResult.success ? (
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {scanResult.success ? "ตรวจคำตอบสำเร็จ!" : "ไม่สามารถตรวจคะแนนได้"}
                  </h3>
                  <div className="text-xs text-slate-400">
                    ประมวลผล: {scanResult.executionTimeMs} ms • มาร์กเกอร์: {scanResult.markersUsed || 6} จุด • ความเชื่อมั่น: {(scanResult.confidenceAvg * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={resetForNextScan}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {scanResult.success ? (
              <div className="space-y-3">
                {/* Score Big Display (Pure Multiple-Choice + Student ID + Seat No + Version) */}
                <div className="grid grid-cols-4 gap-2 py-3 px-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-center">
                  <div>
                    <div className="text-[10px] text-slate-400">เลขประจำตัว</div>
                    <div className="text-sm font-bold text-purple-400">
                      {savedSubmission?.studentId && !savedSubmission.studentId.startsWith("UNREAD_")
                        ? savedSubmission.studentId
                        : scanResult.rawDetectedStudentId?.includes("?")
                        ? scanResult.rawDetectedStudentId
                        : scanResult.studentId || "00000"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">เลขที่</div>
                    <div className="text-sm font-bold text-cyan-400">
                      {savedSubmission?.seatNo != null
                        ? String(savedSubmission.seatNo).padStart(2, "0")
                        : scanResult.seatNoStr || (scanResult.seatNo ? String(scanResult.seatNo).padStart(2, "0") : "-")}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">ชุดข้อสอบ</div>
                    <div className="text-sm font-bold text-indigo-400">ชุด {scanResult.versionCode}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">คะแนนปรนัย</div>
                    <div className="text-sm font-bold text-emerald-400">
                      {savedSubmission
                        ? `${Number(savedSubmission.netScore)} คะแนน`
                        : `ตอบ ${scanResult.items.filter(i => i.itemNo <= totalItems && i.detectedChoices.length > 0).length}/${totalItems} ข้อ`}
                    </div>
                  </div>
                </div>

                {/* Inline Quick-Edit Student Identity Bar (Q2 - Option C) */}
                <div className="p-2.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-200">
                      {savedSubmission?.studentName
                        ? `👤 ${savedSubmission.studentName} ${savedSubmission.classroom ? `(${savedSubmission.classroom})` : ""}`
                        : scanResult.rawDetectedStudentId?.includes("?")
                        ? "⚠️ พบรหัสนักเรียนไม่ครบ (แยกเก็บในคิวตรวจสอบแล้ว หรือพิมพ์แก้ด้านล่างได้ทันที)"
                        : "✏️ แก้ไขเลขประจำตัว / เลขที่ด่วน"}
                    </span>
                    {savedSubmission?.attemptNo > 1 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                        สแกนครั้งที่ {savedSubmission.attemptNo}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">รหัส 5 หลัก:</span>
                      <input
                        type="text"
                        maxLength={10}
                        value={editStudentId}
                        onFocus={() => setIsCountdownPaused(true)}
                        onChange={(e) => setEditStudentId(e.target.value)}
                        placeholder="เช่น 69001"
                        className="w-full h-8 px-2.5 rounded-lg bg-slate-900 border border-slate-600 text-xs font-mono font-bold text-white focus:border-purple-400 outline-none"
                      />
                    </div>
                    <div className="w-24 flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">เลขที่:</span>
                      <input
                        type="text"
                        maxLength={3}
                        value={editSeatNo}
                        onFocus={() => setIsCountdownPaused(true)}
                        onChange={(e) => setEditSeatNo(e.target.value)}
                        placeholder="01"
                        className="w-full h-8 px-2 rounded-lg bg-slate-900 border border-slate-600 text-xs font-mono font-bold text-white text-center focus:border-purple-400 outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={savingIdentity}
                      onClick={handleSaveStudentIdentity}
                      className="h-8 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-[11px] whitespace-nowrap transition"
                    >
                      {savingIdentity ? "กำลังบันทึก..." : "บันทึกรหัส"}
                    </button>
                  </div>
                </div>

                {/* Visual Bubble Alignment Inspection Overlay ("ชี้ช่วงวงกลมแต่ละข้อในการแสกน") */}
                {diagnosticImageUrl && (
                  <div className="rounded-2xl border border-slate-700 bg-slate-950/90 p-2.5 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                        🎯 ภาพชี้ตำแหน่งวงกลมแต่ละข้อ &amp; Timing Marks (ZipGrade Mode)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowBubbleOverlay(!showBubbleOverlay)}
                        className="text-purple-300 hover:text-white underline text-[10.5px]"
                      >
                        {showBubbleOverlay ? "ซ่อนภาพวงกลม" : "แสดงภาพวงกลม"}
                      </button>
                    </div>
                    {showBubbleOverlay && (
                      <>
                        <div className="rounded-xl overflow-hidden border border-slate-800 max-h-56 overflow-y-auto bg-black">
                          <img
                            src={diagnosticImageUrl}
                            alt="OMR Bubble Alignment Overlay"
                            className="w-full h-auto object-contain"
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-300 px-1">
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> วงกลมที่ตรวจพบการฝน
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full border border-purple-400 inline-block" /> วงกลมตัวเลือกแต่ละข้อ
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2.5 h-2.5 bg-cyan-400 inline-block" /> 6 จุดมาร์กเกอร์ &amp; Timing Marks
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {savedSubmission && (
                  <div className="flex items-center justify-between text-xs text-slate-300 px-1 py-1 rounded-xl bg-slate-800/50">
                    <span>ถูก: <strong className="text-emerald-400">{savedSubmission.totalCorrect}</strong></span>
                    <span>ผิด: <strong className="text-red-400">{savedSubmission.totalIncorrect}</strong></span>
                    <span>ไม่ตอบ: <strong className="text-slate-400">{savedSubmission.totalBlanks}</strong></span>
                    <span>ฝนซ้ำ: <strong className="text-amber-400">{savedSubmission.totalMultiple}</strong></span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-900/60 text-xs text-red-300 space-y-1">
                <div className="font-bold">สาเหตุที่ไม่ผ่านการตรวจสอบ:</div>
                <div>{scanResult.error || "ภาพเบลอหรือไม่สามารถปรับมุมมองได้"}</div>
              </div>
            )}

            {/* Auto-Advance Countdown Indicator */}
            {advanceMode === "auto" && scanResult.success && countdownRemaining !== null && (
              <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-purple-300">
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>
                    กำลังเปลี่ยนไปแผ่นถัดไปใน <strong>{countdownRemaining}</strong> วินาที
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCountdownPaused(!isCountdownPaused)}
                  className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-[11px]"
                >
                  {isCountdownPaused ? "นับถอยหลังต่อ" : "หยุดชั่วคราว"}
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={resetForNextScan}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition"
              >
                <RotateCcw className="w-4 h-4" /> สแกนแผ่นถัดไปทันที
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal (Configurable Auto-Capture & Advance Timer) */}
      {showSettingsModal && (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md p-4 flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-5 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">ตั้งค่าระบบสแกนตรวจข้อสอบ</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Setting 1: Auto-Capture on 4 Markers Lock */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-300">การถ่ายภาพอัตโนมัติ (Auto-Capture)</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => saveAutoCapture(true)}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition ${
                    autoCaptureEnabled
                      ? "bg-purple-600/30 border-purple-500 text-white"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750"
                  }`}
                >
                  <span>ถ่ายอัตโนมัติเมื่อล็อค 4 มุม</span>
                  {autoCaptureEnabled && <Check className="w-4 h-4 text-emerald-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => saveAutoCapture(false)}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition ${
                    !autoCaptureEnabled
                      ? "bg-purple-600/30 border-purple-500 text-white"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750"
                  }`}
                >
                  <span>กดปุ่มถ่ายด้วยตัวเอง</span>
                  {!autoCaptureEnabled && <Check className="w-4 h-4 text-emerald-400" />}
                </button>
              </div>
            </div>

            {/* Setting 2: Next Sheet Advance Mode */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-300">โหมดการตรวจแผ่นถัดไป</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => saveAdvanceMode("auto")}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition ${
                    advanceMode === "auto"
                      ? "bg-purple-600/30 border-purple-500 text-white"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750"
                  }`}
                >
                  <span>นับถอยหลังอัตโนมัติ</span>
                  {advanceMode === "auto" && <Check className="w-4 h-4 text-emerald-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => saveAdvanceMode("manual")}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition ${
                    advanceMode === "manual"
                      ? "bg-purple-600/30 border-purple-500 text-white"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750"
                  }`}
                >
                  <span>กดปุ่ม &quot;ถัดไป&quot; เอง</span>
                  {advanceMode === "manual" && <Check className="w-4 h-4 text-emerald-400" />}
                </button>
              </div>
            </div>

            {/* Setting 3: Countdown Seconds (Only if Auto mode) */}
            {advanceMode === "auto" && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300">ระยะเวลานับถอยหลังก่อนไปแผ่นถัดไป</div>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 5, 7, 10].map((secs) => (
                    <button
                      key={secs}
                      type="button"
                      onClick={() => saveAdvanceSeconds(secs)}
                      className={`py-2.5 rounded-xl border text-xs font-bold transition ${
                        advanceSeconds === secs
                          ? "bg-purple-600 text-white border-purple-400"
                          : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {secs} วินาที
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="w-full h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition"
            >
              บันทึกและปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
