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

/**
 * Element Layout Schema for V1 Templates.
 */
export const CertificateElementSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "qrcode"]),
  key: z.string(), // Token key e.g. "fullName", "certNumber", "role", "activityName", "department", "date", "qrCode"
  label: z.string(),
  xPercent: z.number().min(0).max(100), // Normalized 0..100% position on canvas
  yPercent: z.number().min(0).max(100),
  widthPercent: z.number().min(1).max(100).optional(),
  fontSizePt: z.number().min(8).max(120).default(24),
  fontFamily: z.enum(["Sarabun", "Prompt"]).default("Sarabun"),
  fontWeight: z.enum(["normal", "bold"]).default("normal"),
  color: z.string().default("#1e293b"),
  textAlign: z.enum(["left", "center", "right"]).default("center"),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  sampleText: z.string().optional(),
});

export type CertificateElement = z.infer<typeof CertificateElementSchema>;

/**
 * V1 Layout Configuration Schema.
 */
export const CertificateTemplateV1Schema = z.object({
  schemaVersion: z.literal(1).default(1),
  orientation: z.enum(["LANDSCAPE", "PORTRAIT"]).default("LANDSCAPE"),
  elements: z.array(CertificateElementSchema),
});

export type CertificateTemplateV1 = z.infer<typeof CertificateTemplateV1Schema>;

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
