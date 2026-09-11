// @ts-ignore
import { qrcodegen } from "./qr-lib.js";


export interface QrMatrix {
  size: number;
  getModule: (col: number, row: number) => boolean;
  modules: boolean[][];
}

export interface DrawQrBadgeOptions {
  label?: string; // e.g. "สแกนตรวจสอบ"
  showBadgeCard?: boolean; // default true (white rounded card with quiet zone and border)
  dpi?: number; // target DPI (default 72)
  bgColor?: string;
  fgColor?: string;
  borderColor?: string;
}

/**
 * Layer 1: Pure QR Code Matrix Generation (Senior Lock 5).
 * Encodes text into an immutable boolean matrix with High Error Correction (level H).
 */
export function generateQrMatrix(
  text: string,
  errorCorrection: "L" | "M" | "Q" | "H" = "H"
): QrMatrix {
  const eccMap: Record<string, any> = {
    L: qrcodegen.QrCode.Ecc.LOW,
    M: qrcodegen.QrCode.Ecc.MEDIUM,
    Q: qrcodegen.QrCode.Ecc.QUARTILE,
    H: qrcodegen.QrCode.Ecc.HIGH,
  };
  const qr = qrcodegen.QrCode.encodeText(text.trim(), eccMap[errorCorrection] || qrcodegen.QrCode.Ecc.HIGH);
  
  const modules: boolean[][] = [];
  for (let r = 0; r < qr.size; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < qr.size; c++) {
      row.push(qr.getModule(c, r));
    }
    modules.push(row);
  }

  return {
    size: qr.size,
    getModule: (col: number, row: number) => qr.getModule(col, row),
    modules,
  };
}

/**
 * Layer 2: Render QR Matrix directly onto Canvas context without container card.
 */
export function renderQrMatrix(
  ctx: CanvasRenderingContext2D,
  matrix: QrMatrix,
  x: number,
  y: number,
  sizePx: number,
  fgColor: string = "#000000"
): void {
  const numModules = matrix.size;
  const moduleSize = sizePx / numModules;

  ctx.save();
  ctx.fillStyle = fgColor;
  for (let r = 0; r < numModules; r++) {
    for (let c = 0; c < numModules; c++) {
      if (matrix.getModule(c, r)) {
        const mx = Math.floor(x + c * moduleSize);
        const my = Math.floor(y + r * moduleSize);
        const mw = Math.ceil(moduleSize);
        const mh = Math.ceil(moduleSize);
        ctx.fillRect(mx, my, mw, mh);
      }
    }
  }
  ctx.restore();
}

/**
 * Layer 3: Render QR Badge with White Container Card, Quiet Zone, and Label.
 */
export function drawQRCodeBadge(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  baseSizePx: number,
  text: string,
  options: DrawQrBadgeOptions = {}
): void {
  const {
    label = "สแกนตรวจสอบ",
    showBadgeCard = true,
    dpi = 72,
    bgColor = "#FFFFFF",
    fgColor = "#000000",
    borderColor = "#cbd5e1",
  } = options;

  if (!text || !text.trim()) return;

  const matrix = generateQrMatrix(text, "H");

  if (showBadgeCard) {
    const padding = Math.max(6, baseSizePx * 0.08);
    const labelHeight = label ? Math.max(14, baseSizePx * 0.18) : 0;
    const cardWidth = baseSizePx + padding * 2;
    const cardHeight = baseSizePx + padding * 2 + labelHeight;
    const cardX = centerX - cardWidth / 2;
    const cardY = centerY - cardHeight / 2;
    const cornerRadius = Math.max(4, baseSizePx * 0.05);

    ctx.save();
    // 1. White background container card
    ctx.fillStyle = bgColor;
    ctx.shadowColor = "rgba(0, 0, 0, 0.08)";
    ctx.shadowBlur = Math.max(3, baseSizePx * 0.04);
    ctx.shadowOffsetY = Math.max(1, baseSizePx * 0.015);

    if (typeof (ctx as any).roundRect === "function") {
      ctx.beginPath();
      (ctx as any).roundRect(cardX, cardY, cardWidth, cardHeight, cornerRadius);
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = Math.max(1, dpi / 150);
      ctx.stroke();
    } else {
      ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
      ctx.shadowColor = "transparent";
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = Math.max(1, dpi / 150);
      ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);
    }

    // 2. Render QR matrix inside card with quiet zone
    const qrX = cardX + padding;
    const qrY = cardY + padding;
    renderQrMatrix(ctx, matrix, qrX, qrY, baseSizePx, fgColor);

    // 3. Draw micro-label "สแกนตรวจสอบ"
    if (label) {
      ctx.fillStyle = "#334155";
      const fontSize = Math.max(8, labelHeight * 0.65);
      ctx.font = `600 ${fontSize}px Sarabun, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, centerX, cardY + cardHeight - labelHeight / 2);
    }

    ctx.restore();
  } else {
    // Pure QR matrix without badge card
    const qrX = centerX - baseSizePx / 2;
    const qrY = centerY - baseSizePx / 2;
    renderQrMatrix(ctx, matrix, qrX, qrY, baseSizePx, fgColor);
  }
}
