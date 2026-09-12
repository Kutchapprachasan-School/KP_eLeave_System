import { z } from "zod";

/**
 * Typographic point (pt) to pixel converter.
 * Invariant V: fontSize is stored in pt and scaled according to target DPI.
 * Preview: 72 DPI (1pt = 1px)
 * Print/PDF Export: 300 DPI (1pt = 300 / 72 px ≈ 4.1667px)
 */
export function ptToCanvasPx(pt: number, dpi: number = 72): number {
  return (pt * dpi) / 72;
}

/**
 * Formula Injection Protection (Invariant U & G).
 * Prevents Excel/Spreadsheet formula execution without stripping valid characters (e.g. -500).
 * Prepends a single quote (') if string begins with =, +, -, @, \t, or \r.
 */
export function sanitizeCellValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Non-mutating copy sanitizer for CSV/Excel export (Invariant G).
 * Generates a clean new array, leaving raw domain/state objects completely untouched.
 */
export function sanitizeForExport<T extends Record<string, any>>(rows: T[]): T[] {
  return rows.map((row) => {
    const copy: any = { ...row };
    for (const key of Object.keys(copy)) {
      if (typeof copy[key] === "string") {
        copy[key] = sanitizeCellValue(copy[key]);
      }
    }
    return copy;
  });
}

/**
 * Grapheme-Aware Thai Text Truncation.
 * Preserves tone marks, upper vowels, and lower diacritics without producing
 * broken combining marks or orphan dotted circles (\\u25CC).
 */
export function truncateThaiGrapheme(text: string, maxGraphemes: number): string {
  if (!text) return "";

  if (typeof Intl !== "undefined" && (Intl as any).Segmenter) {
    const segmenter = new (Intl as any).Segmenter("th", { granularity: "grapheme" });
    const segments = Array.from(segmenter.segment(text));

    if (segments.length <= maxGraphemes) {
      return text;
    }

    return (
      segments
        .slice(0, maxGraphemes)
        .map((s: any) => s.segment)
        .join("") + "..."
    );
  }

  // Fallback for environments lacking Intl.Segmenter
  return text.length > maxGraphemes ? text.slice(0, maxGraphemes) + "..." : text;
}

export {
  SUPPORTED_FONTS,
  type SupportedFont,
  type FontManifestItem,
  FONT_MANIFEST,
} from "./font-manifest.ts";

/**
 * Screen (clientX, clientY) -> Normalized Document Coordinate (0..100%).
 * Completely immune to CSS transform scale, pan, and client scrolling.
 */
export function screenToDocumentPercent(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect
): { xPercent: number; yPercent: number } {
  const rawX = ((clientX - canvasRect.left) / canvasRect.width) * 100;
  const rawY = ((clientY - canvasRect.top) / canvasRect.height) * 100;

  return {
    xPercent: Math.max(0, Math.min(100, Math.round(rawX * 10) / 10)),
    yPercent: Math.max(0, Math.min(100, Math.round(rawY * 10) / 10)),
  };
}

/**
 * Normalized Document Coordinate (0..100%) -> Screen (clientX, clientY).
 */
export function documentPointToScreen(
  xPercent: number,
  yPercent: number,
  canvasRect: DOMRect
): { screenX: number; screenY: number } {
  const screenX = canvasRect.left + (xPercent / 100) * canvasRect.width;
  const screenY = canvasRect.top + (yPercent / 100) * canvasRect.height;
  return { screenX, screenY };
}

/**
 * Proximity Snap calculation for Center X/Y and sibling alignment guides.
 */
export function computeSnap(
  val: number,
  targets: number[],
  threshold: number = 1.5
): { snappedVal: number; isSnapped: boolean; guidePos?: number } {
  for (const target of targets) {
    if (Math.abs(val - target) <= threshold) {
      return { snappedVal: target, isSnapped: true, guidePos: target };
    }
  }
  return { snappedVal: val, isSnapped: false };
}

export type PresetMultiplicity = "singleton" | "role-singleton" | "unlimited";

export const SINGLETON_KEYS = [
  "fullName",
  "certNumber",
  "role",
  "activityName",
  "department",
  "date",
  "qrCode",
] as const;

export const ROLE_SINGLETON_KEYS = [
  "signee1",
  "signee2",
  "signature1",
  "signature2",
  "signeeName",
  "signeePosition",
] as const;

/**
 * Element Layout Schema for V1 Templates.
 */
export const CertificateElementSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "qrcode", "signature"]),
  key: z.string(), // Token key e.g. "fullName", "certNumber", "role", "activityName", "department", "date", "qrCode", "signee1", "signature1", etc.
  label: z.string(),
  xPercent: z.number().min(0).max(100), // Normalized 0..100% position on canvas
  yPercent: z.number().min(0).max(100),
  widthPercent: z.number().min(1).max(100).optional(),
  fontSizePt: z.number().min(8).max(120).default(24),
  fontFamily: z.string().default("Sarabun"),
  fontWeight: z.enum(["normal", "bold"]).default("normal"),
  italic: z.boolean().optional().default(false),
  color: z.string().default("#1e293b"),
  textAlign: z.enum(["left", "center", "right"]).default("center"),
  letterSpacing: z.number().optional().default(0),
  shadow: z.boolean().optional().default(false),
  shadowColor: z.string().optional().default("rgba(0,0,0,0.2)"),
  shadowBlur: z.number().optional().default(4),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  sampleText: z.string().optional(),
  hidden: z.boolean().optional().default(false),
  // Senior Patch 1 & 5: Storage SOT Attachment ID & Semantic Signee link
  signatureAttachmentId: z.string().optional(),
  signatureFor: z.enum(["signee1", "signee2"]).optional(),
  imageWidthPercent: z.number().min(3).max(50).default(14),
  aspectRatio: z.number().positive().optional(),
  previewUrl: z.string().optional(), // Client-side instant preview URL
  signatureRemoveBg: z.boolean().optional().default(true),
  signatureThreshold: z.number().min(100).max(255).optional().default(215),
});

export type CertificateElement = z.infer<typeof CertificateElementSchema>;

/**
 * V1 Layout Configuration Schema with Senior Boundary Validation.
 */
export const CertificateTemplateV1Schema = z
  .object({
    schemaVersion: z.literal(1).default(1),
    orientation: z.enum(["LANDSCAPE", "PORTRAIT"]).default("LANDSCAPE"),
    elements: z.array(CertificateElementSchema),
  })
  .refine(
    (data) => {
      // 1. Enforce singleton keys (at most 1 per layout)
      const keyCounts = new Map<string, number>();
      for (const el of data.elements) {
        keyCounts.set(el.key, (keyCounts.get(el.key) || 0) + 1);
      }

      for (const sKey of SINGLETON_KEYS) {
        if ((keyCounts.get(sKey) || 0) > 1) {
          return false;
        }
      }

      for (const rKey of ROLE_SINGLETON_KEYS) {
        if ((keyCounts.get(rKey) || 0) > 1) {
          return false;
        }
      }

      return true;
    },
    {
      message: "INVALID_LAYOUT: Layout contains duplicate singleton or role-singleton element keys.",
    }
  );

export type CertificateTemplateV1 = z.infer<typeof CertificateTemplateV1Schema>;

/**
 * Senior Architecture Pattern: Signee Layout Strategy Presets
 */
export const SIGNEE_LAYOUT_PRESETS = {
  SINGLE_SIGNEE: {
    signee1: { xPercent: 50, yPercent: 88 },
    signature1: { xPercent: 50, yPercent: 80 },
  },
  DUAL_SIGNEE_BALANCED: {
    signee1: { xPercent: 28, yPercent: 88 },
    signature1: { xPercent: 28, yPercent: 80 },
    signee2: { xPercent: 72, yPercent: 88 },
    signature2: { xPercent: 72, yPercent: 80 },
  },
} as const;


export interface ElementPresetItem {
  key: string;
  label: string;
  type: "text" | "qrcode" | "signature";
  multiplicity: PresetMultiplicity;
  defaultElement: Omit<CertificateElement, "id">;
}

/**
 * Teacher-Friendly Typography Presets for School Certificates.
 */
export const ELEMENT_PRESETS: ElementPresetItem[] = [
  {
    key: "fullName",
    label: "ชื่อ-นามสกุล ผู้รับ",
    type: "text",
    multiplicity: "singleton",
    defaultElement: {
      type: "text",
      key: "fullName",
      label: "ชื่อ - นามสกุล ผู้รับ",
      xPercent: 50,
      yPercent: 48,
      fontSizePt: 34,
      fontFamily: "Kanit",
      fontWeight: "bold",
      italic: false,
      color: "#0f172a",
      textAlign: "center",
      sampleText: "นายสมศักดิ์ รักเรียน",
    },
  },
  {
    key: "certNumber",
    label: "เลขที่เกียรติบัตร",
    type: "text",
    multiplicity: "singleton",
    defaultElement: {
      type: "text",
      key: "certNumber",
      label: "เลขที่เกียรติบัตร",
      xPercent: 85,
      yPercent: 12,
      fontSizePt: 15,
      fontFamily: "Sarabun",
      fontWeight: "normal",
      italic: false,
      color: "#64748b",
      textAlign: "right",
      prefix: "เลขที่ ",
      sampleText: "กจ. 001/2569",
    },
  },
  {
    key: "role",
    label: "รางวัล / บทบาทที่ได้รับ",
    type: "text",
    multiplicity: "singleton",
    defaultElement: {
      type: "text",
      key: "role",
      label: "รางวัล / บทบาทที่ได้รับ",
      xPercent: 50,
      yPercent: 66,
      fontSizePt: 22,
      fontFamily: "Prompt",
      fontWeight: "bold",
      italic: false,
      color: "#b45309",
      textAlign: "center",
      sampleText: "รางวัลชนะเลิศ อันดับ ๑",
    },
  },
  {
    key: "activityName",
    label: "ชื่องาน / กิจกรรม",
    type: "text",
    multiplicity: "singleton",
    defaultElement: {
      type: "text",
      key: "activityName",
      label: "ชื่องาน / กิจกรรม",
      xPercent: 50,
      yPercent: 58,
      fontSizePt: 20,
      fontFamily: "Sarabun",
      fontWeight: "normal",
      italic: false,
      color: "#1e293b",
      textAlign: "center",
      sampleText: "การแข่งขันโครงงานวิทยาศาสตร์และเทคโนโลยี ประจำปีการศึกษา ๒๕๖๙",
    },
  },
  {
    key: "department",
    label: "กลุ่มสาระฯ / หน่วยงาน",
    type: "text",
    multiplicity: "singleton",
    defaultElement: {
      type: "text",
      key: "department",
      label: "กลุ่มสาระฯ / หน่วยงาน",
      xPercent: 50,
      yPercent: 26,
      fontSizePt: 18,
      fontFamily: "Sarabun",
      fontWeight: "bold",
      italic: false,
      color: "#1e3a8a",
      textAlign: "center",
      sampleText: "โรงเรียนกุดจับประชาสรรค์",
    },
  },
  {
    key: "date",
    label: "วันที่ออกเกียรติบัตร",
    type: "text",
    multiplicity: "singleton",
    defaultElement: {
      type: "text",
      key: "date",
      label: "วันที่ออกเกียรติบัตร",
      xPercent: 50,
      yPercent: 75,
      fontSizePt: 16,
      fontFamily: "Sarabun",
      fontWeight: "normal",
      italic: false,
      color: "#475569",
      textAlign: "center",
      prefix: "ให้ไว้ ณ วันที่ ",
      sampleText: "๑๑ กันยายน พ.ศ. ๒๕๖๙",
    },
  },
  {
    key: "signee1",
    label: "ผู้ลงนามคนที่ 1",
    type: "text",
    multiplicity: "role-singleton",
    defaultElement: {
      type: "text",
      key: "signee1",
      label: "ผู้ลงนามคนที่ 1",
      xPercent: 28,
      yPercent: 88,
      fontSizePt: 16,
      fontFamily: "Taviraj",
      fontWeight: "bold",
      italic: false,
      color: "#0f172a",
      textAlign: "center",
      sampleText: "( นายสมเกียรติ สว่างวงศ์ )\nครูที่ปรึกษา / หัวหน้าโครงการ",
    },
  },
  {
    key: "signature1",
    label: "ลายเซ็นสแกน (คนที่ 1)",
    type: "signature",
    multiplicity: "role-singleton",
    defaultElement: {
      type: "signature",
      key: "signature1",
      label: "ลายเซ็นสแกน (คนที่ 1)",
      signatureFor: "signee1",
      xPercent: 28,
      yPercent: 80,
      imageWidthPercent: 14,
      fontSizePt: 14,
      fontFamily: "Sarabun",
      fontWeight: "normal",
      italic: false,
      color: "#3b82f6",
      textAlign: "center",
    },
  },
  {
    key: "signee2",
    label: "ผู้ลงนามคนที่ 2",
    type: "text",
    multiplicity: "role-singleton",
    defaultElement: {
      type: "text",
      key: "signee2",
      label: "ผู้ลงนามคนที่ 2",
      xPercent: 72,
      yPercent: 88,
      fontSizePt: 16,
      fontFamily: "Taviraj",
      fontWeight: "bold",
      italic: false,
      color: "#0f172a",
      textAlign: "center",
      sampleText: "( นายวิจิตร สุขสงบ )\nผู้อำนวยการโรงเรียนกุดจับประชาสรรค์",
    },
  },
  {
    key: "signature2",
    label: "ลายเซ็นสแกน (คนที่ 2)",
    type: "signature",
    multiplicity: "role-singleton",
    defaultElement: {
      type: "signature",
      key: "signature2",
      label: "ลายเซ็นสแกน (คนที่ 2)",
      signatureFor: "signee2",
      xPercent: 72,
      yPercent: 80,
      imageWidthPercent: 14,
      fontSizePt: 14,
      fontFamily: "Sarabun",
      fontWeight: "normal",
      italic: false,
      color: "#3b82f6",
      textAlign: "center",
    },
  },
  {
    key: "qrCode",
    label: "กล่อง QR Code ตรวจสอบ",
    type: "qrcode",
    multiplicity: "singleton",
    defaultElement: {
      type: "qrcode",
      key: "qrCode",
      label: "กล่อง QR Code ตรวจสอบ",
      xPercent: 88,
      yPercent: 82,
      fontSizePt: 18,
      fontFamily: "Sarabun",
      fontWeight: "normal",
      italic: false,
      color: "#000000",
      textAlign: "center",
      sampleText: "https://eleave.kutchap.ac.th/verify/cert?token=SAMPLE",
    },
  },
  {
    key: "customText",
    label: "ข้อความกำหนดเอง",
    type: "text",
    multiplicity: "unlimited",
    defaultElement: {
      type: "text",
      key: "customText",
      label: "ข้อความกำหนดเอง",
      xPercent: 50,
      yPercent: 40,
      fontSizePt: 18,
      fontFamily: "Sarabun",
      fontWeight: "normal",
      italic: false,
      color: "#1e293b",
      textAlign: "center",
      sampleText: "ข้อความเพิ่มเติม...",
    },
  },
];


/**
 * Standard Default Elements for Thai School Certificates.
 */
export const DEFAULT_CERTIFICATE_ELEMENTS: CertificateElement[] = [
  {
    id: "el_school",
    type: "text",
    key: "department",
    label: "กลุ่มสาระฯ / หน่วยงาน",
    xPercent: 50,
    yPercent: 28,
    fontSizePt: 18,
    fontFamily: "Sarabun",
    fontWeight: "bold",
    color: "#1e3a8a",
    textAlign: "center",
    sampleText: "โรงเรียนกุดจับประชาสรรค์",
  },
  {
    id: "el_cert_num",
    type: "text",
    key: "certNumber",
    label: "เลขที่เกียรติบัตร",
    xPercent: 50,
    yPercent: 35,
    fontSizePt: 14,
    fontFamily: "Sarabun",
    fontWeight: "normal",
    color: "#64748b",
    textAlign: "center",
    prefix: "เลขที่ ",
    sampleText: "กจ. 001/2569",
  },
  {
    id: "el_name",
    type: "text",
    key: "fullName",
    label: "ชื่อ - นามสกุล ผู้รับ",
    xPercent: 50,
    yPercent: 48,
    fontSizePt: 36,
    fontFamily: "Sarabun",
    fontWeight: "bold",
    color: "#0f172a",
    textAlign: "center",
    sampleText: "นายสมศักดิ์ รักเรียน",
  },
  {
    id: "el_activity",
    type: "text",
    key: "activityName",
    label: "ชื่อกิจกรรม / งาน",
    xPercent: 50,
    yPercent: 58,
    fontSizePt: 20,
    fontFamily: "Sarabun",
    fontWeight: "normal",
    color: "#1e293b",
    textAlign: "center",
    sampleText: "ได้เข้าร่วมกิจกรรมสัปดาห์วันวิทยาศาสตร์ ประจำปีการศึกษา ๒๕๖๙",
  },
  {
    id: "el_role",
    type: "text",
    key: "role",
    label: "บทบาท / รางวัลที่ได้รับ",
    xPercent: 50,
    yPercent: 66,
    fontSizePt: 22,
    fontFamily: "Sarabun",
    fontWeight: "bold",
    color: "#b45309",
    textAlign: "center",
    sampleText: "รางวัลชนะเลิศ การแข่งขันโครงงานวิทยาศาสตร์",
  },
  {
    id: "el_date",
    type: "text",
    key: "date",
    label: "วันที่ออกเกียรติบัตร",
    xPercent: 50,
    yPercent: 75,
    fontSizePt: 16,
    fontFamily: "Sarabun",
    fontWeight: "normal",
    color: "#475569",
    textAlign: "center",
    prefix: "ให้ไว้ ณ วันที่ ",
    sampleText: "๑๑ กันยายน พ.ศ. ๒๕๖๙",
  },
  {
    id: "el_qr",
    type: "qrcode",
    key: "qrCode",
    label: "QR Code ตรวจสอบ",
    xPercent: 88,
    yPercent: 82,
    fontSizePt: 12,
    fontFamily: "Sarabun",
    fontWeight: "normal",
    color: "#000000",
    textAlign: "center",
    sampleText: "https://eleave.kutchap.ac.th/verify",
  },
];

/**
 * Validates verification token string format before executing any DB query.
 * Contract:
 *  - 22-char Base64URL (Standard 128-bit): /^[A-Za-z0-9_-]{22}$/
 *  - Legacy 48/64 hex characters: /^[a-fA-F0-9]{48,64}$/
 */
export function isValidVerificationTokenFormat(token: string): boolean {
  if (!token || typeof token !== "string") return false;
  const trimmed = token.trim();
  const isBase64Url128 = /^[A-Za-z0-9_-]{22}$/.test(trimmed);
  const isLegacyHex = /^[a-fA-F0-9]{48,64}$/.test(trimmed);
  return isBase64Url128 || isLegacyHex;
}

