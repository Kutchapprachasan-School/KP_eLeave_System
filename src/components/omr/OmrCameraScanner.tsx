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
  RotateCcw
} from "lucide-react";
import { processOmrSheet, OmrScanResult, RawImageData } from "@/lib/omr/omrEngine";
import { generate50ItemGridMetadata, generate20ItemGridMetadata, TemplateGridMetadata } from "@/lib/services/omrTemplateService";
import { ingestExamSubmissionAction } from "@/app/actions/omr";
import { useSession } from "@/lib/auth-client";

interface OmrCameraScannerProps {
  paperId?: string;
  totalItems?: number;
  onScanComplete?: (result: any) => void;
}

export function OmrCameraScanner({ paperId, totalItems = 50, onScanComplete }: OmrCameraScannerProps) {
  const { data: session } = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [batchMode, setBatchMode] = useState(true);

  // Scan Result Modal State
  const [scanResult, setScanResult] = useState<OmrScanResult | null>(null);
  const [savedSubmission, setSavedSubmission] = useState<any | null>(null);
  const [ingestLoading, setIngestLoading] = useState(false);

  // Template metadata
  const templateGrid: TemplateGridMetadata = totalItems === 20 
    ? generate20ItemGridMetadata() 
    : generate50ItemGridMetadata();

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
        navigator.vibrate(success ? [40, 30, 60] : [100, 50, 100]);
      }
    } catch {
      // Audio context might be blocked by browser policy until gesture
    }
  }, [soundEnabled]);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
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

  // Capture Frame & Process
  const captureAndProcess = async () => {
    if (!videoRef.current || isProcessing) return;

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    setIsProcessing(true);

    try {
      const canvas = canvasRef.current || document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context unavailable");

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const rawImage: RawImageData = {
        width: imgData.width,
        height: imgData.height,
        data: imgData.data
      };

      // Execute OMR processing
      const result = processOmrSheet(rawImage, templateGrid);

      if (result.success) {
        playChime(true);
        setScanResult(result);

        // Ingest into Database if paperId and session available
        if (paperId && session?.user?.id) {
          setIngestLoading(true);
          const clientScanId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

          try {
            const submission = await ingestExamSubmissionAction({
              clientScanId,
              examPaperId: paperId,
              studentId: result.studentId || "00000",
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

          const result = processOmrSheet(rawImage, templateGrid);
          setScanResult(result);
          playChime(result.success);

          if (result.success && paperId && session?.user?.id) {
            setIngestLoading(true);
            const clientScanId = `scan_up_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            const submission = await ingestExamSubmissionAction({
              clientScanId,
              examPaperId: paperId,
              studentId: result.studentId || "00000",
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

  const resetForNextScan = () => {
    setScanResult(null);
    setSavedSubmission(null);
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto rounded-3xl overflow-hidden bg-black text-white shadow-2xl">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top HUD Controls */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-bold tracking-wider uppercase text-emerald-400">
            {streamActive ? "LIVE HUD ACTIVE" : "CAMERA STANDBY"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md transition text-white"
            title={soundEnabled ? "ปิดเสียงบี๊บ" : "เปิดเสียงบี๊บ"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          <label className="p-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md transition text-white cursor-pointer" title="อัปโหลดรูปกระดาษคำตอบ">
            <Upload className="w-4 h-4" />
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Main Viewfinder Box */}
      <div className="relative w-full aspect-[3/4] sm:aspect-[4/3] max-h-[70vh] bg-slate-950 flex items-center justify-center overflow-hidden">
        {cameraError ? (
          <div className="p-6 text-center space-y-3 max-w-sm">
            <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
            <div className="text-sm font-bold text-white">{cameraError}</div>
            <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs cursor-pointer shadow-lg">
              <Upload className="w-4 h-4" /> เลือกไฟล์รูปภาพเพื่อตรวจ
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
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

            {/* 4 Corner Guide Reticles (Target Brackets) */}
            <div className="absolute inset-8 sm:inset-12 pointer-events-none border border-white/20 rounded-2xl">
              {/* Top-Left Reticle */}
              <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
              {/* Top-Right Reticle */}
              <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
              {/* Bottom-Left Reticle */}
              <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
              {/* Bottom-Right Reticle */}
              <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-emerald-400 rounded-br-xl shadow-[0_0_12px_rgba(52,211,153,0.8)]" />

              {/* Center Crosshair Target */}
              <div className="absolute inset-0 flex items-center justify-center opacity-30">
                <div className="w-8 h-0.5 bg-emerald-400" />
                <div className="w-0.5 h-8 bg-emerald-400 absolute" />
              </div>
            </div>

            {/* Scanning Laser Line Animation when processing */}
            {isProcessing && (
              <div className="absolute inset-x-8 sm:inset-x-12 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-bounce shadow-[0_0_15px_rgba(192,132,252,1)]" />
            )}
          </>
        )}
      </div>

      {/* Bottom Action Control Bar */}
      <div className="p-6 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
          <span>จัดมาร์กเกอร์สี่เหลี่ยมดำ 4 มุมให้ตรงกับเป้าเล็ง แล้วกดปุ่มถ่าย</span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            disabled={isProcessing || !streamActive}
            onClick={captureAndProcess}
            className="flex-1 sm:flex-none h-13 px-8 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-95 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-purple-500/30 transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> กำลังประมวลผล...
              </>
            ) : (
              <>
                <Camera className="w-5 h-5" /> ตรวจแผ่นคำตอบทันที
              </>
            )}
          </button>
        </div>
      </div>

      {/* Result Bottom Sheet / Modal */}
      {scanResult && (
        <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-md p-6 flex flex-col justify-end transition-all">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4 max-w-lg mx-auto w-full shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {scanResult.success ? (
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {scanResult.success ? "ตรวจคะแนนสำเร็จ!" : "ไม่สามารถตรวจคะแนนได้"}
                  </h3>
                  <div className="text-xs text-slate-400">
                    เวลาประมวลผล: {scanResult.executionTimeMs} ms • ความเชื่อมั่นเฉลี่ย: {(scanResult.confidenceAvg * 100).toFixed(1)}%
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
                <div className="grid grid-cols-3 gap-2 py-3 px-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-center">
                  <div>
                    <div className="text-[11px] text-slate-400">รหัสนักเรียน</div>
                    <div className="text-base font-bold text-purple-400">{scanResult.studentId || "00000"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">ชุดข้อสอบ</div>
                    <div className="text-base font-bold text-indigo-400">ชุด {scanResult.versionCode}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">คะแนนสุทธิ</div>
                    <div className="text-base font-bold text-emerald-400">
                      {savedSubmission ? `${Number(savedSubmission.netScore)} คะแนน` : "พร้อมบันทึก"}
                    </div>
                  </div>
                </div>

                {savedSubmission && (
                  <div className="flex items-center justify-between text-xs text-slate-300 px-1">
                    <span>ถูก: <strong className="text-emerald-400">{savedSubmission.totalCorrect}</strong></span>
                    <span>ผิด: <strong className="text-red-400">{savedSubmission.totalIncorrect}</strong></span>
                    <span>ไม่ตอบ: <strong className="text-slate-400">{savedSubmission.totalBlanks}</strong></span>
                    <span>ฝนซ้ำ: <strong className="text-amber-400">{savedSubmission.totalMultiple}</strong></span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-red-950/40 border border-red-900/60 text-xs text-red-300 space-y-1">
                <div className="font-bold">สาเหตุที่ไม่ผ่านเกณฑ์คุณภาพ (IQG):</div>
                <div>{scanResult.error || "ภาพเบลอหรือไม่สามารถปรับมุมมองได้"}</div>
              </div>
            )}

            {/* Quick Action Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={resetForNextScan}
                className="flex-1 h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition"
              >
                <RotateCcw className="w-4 h-4" /> สแกนแผ่นถัดไป
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
