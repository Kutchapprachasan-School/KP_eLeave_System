// Dynamic jsPDF import for bundler code-splitting and Node test immunity

import {
  type CertificateTemplateV1,
  type CertificateElement,
  ptToCanvasPx,
  truncateThaiGrapheme,
  FONT_MANIFEST,
  SUPPORTED_FONTS,
} from "./cert-schema.ts";
import { drawQRCodeBadge } from "./qr-renderer.ts";
export { ensureFontsLoaded, type LoadedFontSet } from "./font-loader.ts";

export const A4_DIMS = {
  LANDSCAPE: {
    printWidth: 3508,
    printHeight: 2480,
    previewWidth: 842,
    previewHeight: 595,
  },
  PORTRAIT: {
    printWidth: 2480,
    printHeight: 3508,
    previewWidth: 595,
    previewHeight: 842,
  },
} as const;

/**
 * Invariant R & H: Cloud Storage CORS Image Loader
 * Sets crossOrigin = "anonymous".
 * Fails transparently with bucket policy instructions if CORS fails.
 */
export async function loadCanvasImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!url) {
      return reject(new Error("Background image URL is required."));
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => resolve(img);
    img.onerror = () => {
      reject(
        new Error(
          `Failed to load image from "${url}". Please ensure Cloudflare R2 / Supabase bucket CORS allows origin "${typeof window !== "undefined" ? window.location.origin : "*"}" with AllowedHeaders: ["*"] and AllowedMethods: ["GET", "HEAD"].`
        )
      );
    };

    img.src = url;
  });
}

export function isValidDrawableImage(src: any): src is CanvasImageSource {
  if (!src || typeof src !== "object") return false;
  if (typeof HTMLImageElement !== "undefined" && src instanceof HTMLImageElement) {
    return src.complete && src.naturalWidth > 0;
  }
  if (typeof HTMLCanvasElement !== "undefined" && src instanceof HTMLCanvasElement) {
    return src.width > 0 && src.height > 0;
  }
  if (typeof ImageBitmap !== "undefined" && src instanceof ImageBitmap) {
    return src.width > 0 && src.height > 0;
  }
  if (typeof OffscreenCanvas !== "undefined" && src instanceof OffscreenCanvas) {
    return src.width > 0 && src.height > 0;
  }
  if (typeof SVGImageElement !== "undefined" && src instanceof SVGImageElement) {
    return true;
  }
  if (typeof (src as any).nodeName === "string" && (src as any).nodeName === "IMG") {
    return true;
  }
  return false;
}

/**
 * Draws a single certificate onto the provided canvas context.
 */
export function drawCertificatePage({
  ctx,
  width,
  height,
  dpi,
  backgroundImage,
  template,
  data,
  qrImages = {},
  signatureImages = {},
}: {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpi: number;
  backgroundImage?: CanvasImageSource | null;
  template: CertificateTemplateV1;
  data: Record<string, string>;
  qrImages?: Record<string, HTMLImageElement | HTMLCanvasElement>;
  signatureImages?: Record<string, CanvasImageSource>;
}): void {
  // 1. Draw background image stretched across full page if provided and valid
  if (isValidDrawableImage(backgroundImage)) {
    try {
      ctx.drawImage(backgroundImage, 0, 0, width, height);
    } catch (err) {
      console.warn("Could not draw background image:", err);
    }
  }

  // 2. Render each placeholder element
  for (const el of template.elements) {
    if (el.hidden) continue;

    if (el.type === "text") {
      const rawValue =
        data[el.key] !== undefined && data[el.key] !== ""
          ? data[el.key]
          : (el.sampleText || el.label || "");
      if (!rawValue && !el.prefix && !el.suffix) continue;

      const displayText = `${el.prefix || ""}${rawValue}${el.suffix || ""}`;

      // Scaled font size based on DPI (Invariant V)
      const fontSizePx = ptToCanvasPx(el.fontSizePt, dpi);
      const fontStyle = el.italic ? "italic " : "";
      const fontWeight = el.fontWeight === "bold" ? "bold" : "normal";
      ctx.font = `${fontStyle}${fontWeight} ${fontSizePx}px "${el.fontFamily}", sans-serif`;
      ctx.fillStyle = el.color || "#000000";
      ctx.textAlign = el.textAlign || "center";
      ctx.textBaseline = "middle";

      // Text effects: shadow & letter spacing
      ctx.save();
      if (el.shadow) {
        ctx.shadowColor = el.shadowColor || "rgba(0, 0, 0, 0.25)";
        ctx.shadowBlur = (el.shadowBlur || 4) * (dpi / 72);
        ctx.shadowOffsetY = 2 * (dpi / 72);
      }

      if (el.letterSpacing && typeof (ctx as any).letterSpacing !== "undefined") {
        (ctx as any).letterSpacing = `${el.letterSpacing * (dpi / 72)}px`;
      }

      const x = (el.xPercent / 100) * width;
      const y = (el.yPercent / 100) * height;

      // Thai-safe grapheme truncation to prevent text overflowing bounds
      const safeText = truncateThaiGrapheme(displayText, 100);
      ctx.fillText(safeText, x, y);
      ctx.restore();
    } else if (el.type === "qrcode") {
      const rawUrl = data[el.key] || el.sampleText || "https://eleave.kutchap.ac.th/verify/cert?token=SAMPLE";
      const qrBaseSizePx = ptToCanvasPx(el.fontSizePt * 4, dpi);
      const centerX = (el.xPercent / 100) * width;
      const centerY = (el.yPercent / 100) * height;

      // Draw high-fidelity square QR badge directly on canvas context
      drawQRCodeBadge(ctx, centerX, centerY, qrBaseSizePx, rawUrl, {
        label: "สแกนตรวจสอบ",
        showBadgeCard: true,
        dpi,
      });
    } else if (el.type === "signature") {
      // Senior Instruction: Preserve natural aspect ratio and render smoothly
      const targetWidth = ((el.imageWidthPercent || 14) / 100) * width;
      const centerX = (el.xPercent / 100) * width;
      const centerY = (el.yPercent / 100) * height;

      const sigImg =
        (el.signatureAttachmentId && signatureImages[el.signatureAttachmentId]) ||
        (el.previewUrl && signatureImages[el.previewUrl]);

      if (sigImg && isValidDrawableImage(sigImg)) {
        const naturalW = (sigImg as any).naturalWidth || (sigImg as any).width || 200;
        const naturalH = (sigImg as any).naturalHeight || (sigImg as any).height || 80;
        const aspect = naturalW / naturalH;
        const targetHeight = targetWidth / aspect;

        ctx.save();
        ctx.drawImage(
          sigImg,
          centerX - targetWidth / 2,
          centerY - targetHeight / 2,
          targetWidth,
          targetHeight
        );
        ctx.restore();
      } else {
        // Fallback placeholder box in studio preview
        const targetHeight = targetWidth / (el.aspectRatio || 2.5);
        ctx.save();
        ctx.strokeStyle = "#93c5fd";
        ctx.lineWidth = Math.max(1, 1.5 * (dpi / 72));
        ctx.setLineDash([4 * (dpi / 72), 3 * (dpi / 72)]);
        ctx.strokeRect(
          centerX - targetWidth / 2,
          centerY - targetHeight / 2,
          targetWidth,
          targetHeight
        );

        ctx.font = `normal ${Math.max(10, Math.round(11 * (dpi / 72)))}px Sarabun, sans-serif`;
        ctx.fillStyle = "#60a5fa";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("✍️ ลายเซ็นสแกน", centerX, centerY);
        ctx.restore();
      }
    }
  }
}

export interface BatchExportOptions {
  template: CertificateTemplateV1;
  backgroundUrl: string;
  roster: Array<Record<string, string>>;
  qrImages?: Record<string, HTMLImageElement | HTMLCanvasElement>;
  signal?: AbortSignal;
  onProgress?: (current: number, total: number) => void;
}

/**
 * Invariant E, F: High-Performance Bounded Single-Canvas PDF Exporter.
 * Allocates exactly ONE 300 DPI canvas, yields the event loop on each page,
 * checks signal.aborted at page boundaries, and streams into jsPDF.
 */
export async function generateCertificatePdfBatch({
  template,
  backgroundUrl,
  roster,
  qrImages = {},
  signal,
  onProgress,
}: BatchExportOptions): Promise<Blob> {
  if (roster.length === 0) {
    throw new Error("Roster contains 0 recipients.");
  }

  // 1. Ensure fonts loaded & shaped
  await ensureFontsLoaded();

  // 2. Load background image with CORS
  const bgImage = await loadCanvasImage(backgroundUrl);

  // 3. Dynamic orientation dimensions (Invariant E)
  const orientation = template.orientation === "PORTRAIT" ? "PORTRAIT" : "LANDSCAPE";
  const dims = A4_DIMS[orientation];
  const printWidth = dims.printWidth;
  const printHeight = dims.printHeight;
  const dpi = 300;

  // 3b. Preload signature images keyed by attachmentId (Senior Patch 1 & 2)
  const signatureImages: Record<string, HTMLImageElement> = {};
  for (const el of template.elements) {
    if (el.type === "signature") {
      const idKey = el.signatureAttachmentId || el.previewUrl;
      const urlToLoad = el.previewUrl;
      if (idKey && urlToLoad && !signatureImages[idKey]) {
        try {
          const sigImg = await loadCanvasImage(urlToLoad);
          signatureImages[idKey] = sigImg;
        } catch (err) {
          console.warn(`Failed to preload signature image for ${idKey}:`, err);
        }
      }
    }
  }

  // 4. Single reusable 300 DPI offscreen canvas (Invariant F)
  const canvas = document.createElement("canvas");
  canvas.width = printWidth;
  canvas.height = printHeight;
  const ctx = canvas.getContext("2d", { alpha: false });

  if (!ctx) {
    throw new Error("Unable to create 2D canvas context.");
  }

  // 5. Initialize jsPDF document (dynamically loaded)
  const { jsPDF } = await import("jspdf");
  const pdfOrientation = orientation === "PORTRAIT" ? "p" : "l";
  const doc = new jsPDF({
    orientation: pdfOrientation,
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const total = roster.length;

  for (let i = 0; i < total; i++) {
    // Check cancellation signal at page boundary
    if (signal?.aborted) {
      ctx.clearRect(0, 0, printWidth, printHeight);
      throw new Error("ABORTED");
    }

    const row = roster[i];

    // Clear canvas before drawing (Zero memory retention)
    ctx.clearRect(0, 0, printWidth, printHeight);

    // Render current recipient certificate
    drawCertificatePage({
      ctx,
      width: printWidth,
      height: printHeight,
      dpi,
      backgroundImage: bgImage,
      template,
      data: row,
      qrImages,
      signatureImages,
    });

    // Encode to high-quality JPEG
    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    if (i > 0) {
      doc.addPage("a4", pdfOrientation);
    }

    const pdfWidthMm = orientation === "PORTRAIT" ? 210 : 297;
    const pdfHeightMm = orientation === "PORTRAIT" ? 297 : 210;

    doc.addImage(imgData, "JPEG", 0, 0, pdfWidthMm, pdfHeightMm, undefined, "FAST");

    if (onProgress) {
      onProgress(i + 1, total);
    }

    // Yield event loop to prevent browser UI freezing (Invariant F)
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  // Final cleanup of canvas memory
  ctx.clearRect(0, 0, printWidth, printHeight);

  return doc.output("blob");
}
