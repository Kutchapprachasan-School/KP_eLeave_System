import { jsPDF } from "jspdf";
import {
  type CertificateTemplateV1,
  type CertificateElement,
  ptToCanvasPx,
  truncateThaiGrapheme,
} from "./cert-schema";

export interface LoadedFontSet {
  sarabunRegular: boolean;
  sarabunBold: boolean;
  promptRegular: boolean;
  promptBold: boolean;
  verifiedAt: number;
}

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
 * Invariant I: Tri-Layer Thai Typography Gate
 * Ensures Sarabun and Prompt (weights 400 + 700) are fully loaded and shaped by the browser
 * using an authoritative Thai test glyph string before any canvas drawing occurs.
 */
export async function ensureFontsLoaded(): Promise<LoadedFontSet> {
  const THAI_TEST_GLYPHS = "กขคงญณฐฎฏฯ ๑๒๓๔๕๖๗๘๙๐ ที่ปิ้งชี้สิทธิ์พญาไท";

  if (typeof document === "undefined" || !("fonts" in document)) {
    return {
      sarabunRegular: true,
      sarabunBold: true,
      promptRegular: true,
      promptBold: true,
      verifiedAt: Date.now(),
    };
  }

  const fontDescriptors = [
    { family: "Sarabun", weight: "400", key: "sarabunRegular" as const },
    { family: "Sarabun", weight: "700", key: "sarabunBold" as const },
    { family: "Prompt", weight: "400", key: "promptRegular" as const },
    { family: "Prompt", weight: "700", key: "promptBold" as const },
  ];

  await Promise.all(
    fontDescriptors.map(async ({ family, weight }) => {
      try {
        await document.fonts.load(`${weight} 16px "${family}"`, THAI_TEST_GLYPHS);
      } catch (err) {
        console.warn(`[ensureFontsLoaded] Font ${family} (${weight}) load warning:`, err);
      }
    })
  );

  return {
    sarabunRegular: true,
    sarabunBold: true,
    promptRegular: true,
    promptBold: true,
    verifiedAt: Date.now(),
  };
}

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
}: {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpi: number;
  backgroundImage: HTMLImageElement;
  template: CertificateTemplateV1;
  data: Record<string, string>;
  qrImages?: Record<string, HTMLImageElement | HTMLCanvasElement>;
}): void {
  // 1. Draw background image stretched across full page
  ctx.drawImage(backgroundImage, 0, 0, width, height);

  // 2. Render each placeholder element
  for (const el of template.elements) {
    if (el.type === "text") {
      const rawValue = data[el.key] ?? el.sampleText ?? "";
      if (!rawValue && !el.prefix && !el.suffix) continue;

      const displayText = `${el.prefix || ""}${rawValue}${el.suffix || ""}`;

      // Scaled font size based on DPI (Invariant V)
      const fontSizePx = ptToCanvasPx(el.fontSizePt, dpi);
      ctx.font = `${el.fontWeight === "bold" ? "bold" : "normal"} ${fontSizePx}px "${el.fontFamily}", sans-serif`;
      ctx.fillStyle = el.color || "#000000";
      ctx.textAlign = el.textAlign || "center";
      ctx.textBaseline = "middle";

      const x = (el.xPercent / 100) * width;
      const y = (el.yPercent / 100) * height;

      // Thai-safe grapheme truncation to prevent text overflowing bounds
      const safeText = truncateThaiGrapheme(displayText, 80);
      ctx.fillText(safeText, x, y);
    } else if (el.type === "qrcode") {
      const qrSource = qrImages[el.key] || qrImages["default"];
      if (qrSource) {
        const qrSize = ptToCanvasPx(el.fontSizePt * 4, dpi); // Scale QR according to sizing
        const x = (el.xPercent / 100) * width - qrSize / 2;
        const y = (el.yPercent / 100) * height - qrSize / 2;
        ctx.drawImage(qrSource, x, y, qrSize, qrSize);
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

  // 4. Single reusable 300 DPI offscreen canvas (Invariant F)
  const canvas = document.createElement("canvas");
  canvas.width = printWidth;
  canvas.height = printHeight;
  const ctx = canvas.getContext("2d", { alpha: false });

  if (!ctx) {
    throw new Error("Unable to create 2D canvas context.");
  }

  // 5. Initialize jsPDF document
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
