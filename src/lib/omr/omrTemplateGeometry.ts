/**
 * KP Academic OMR - Compact Scan Zone Template Geometry (Rev 9.0)
 * 
 * ออกแบบใหม่ทั้งหมด: รวม bubbles ทั้งหมดไว้ใน "Compact Scan Zone" (v: 0.02→0.58)
 * เพื่อแก้ปัญหากล้องมือถือจับตำแหน่ง bubble ไม่ตรงเมื่อกระจายทั่วกระดาษ A4
 * 
 * รองรับตัวเลือก A-F (สูงสุด 6 ตัวเลือก ตามที่ครูกำหนด)
 */

export interface BubbleCoordinate {
  choice: string;
  u: number; // 0.0 - 1.0 (normalized X)
  v: number; // 0.0 - 1.0 (normalized Y)
  radius: number; // normalized radius
}

export interface QuestionCoordinate {
  itemNo: number;
  bubbles: BubbleCoordinate[];
}

export interface StudentIdDigitCoordinate {
  digitIndex: number; // 0 to 4 (5 digits)
  value: number; // 0 to 9
  u: number;
  v: number;
  radius: number;
}

export interface VersionCodeCoordinate {
  versionCode: string; // "01", "02", "03", "04"
  u: number;
  v: number;
  radius: number;
}

export interface TemplateGridMetadata {
  canvasWidth: number;
  canvasHeight: number;
  fiducialMarkers: {
    topLeft: { u: number; v: number; width: number; height: number };
    topRight: { u: number; v: number; width: number; height: number };
    bottomLeft: { u: number; v: number; width: number; height: number };
    bottomRight: { u: number; v: number; width: number; height: number };
  };
  qrCodeAnchor: {
    u: number;
    v: number;
    size: number;
  };
  studentIdGrid: {
    digitsCount: number;
    digits: StudentIdDigitCoordinate[];
  };
  versionCodeGrid: {
    versions: VersionCodeCoordinate[];
  };
  questionBlocks: QuestionCoordinate[];
  /** จำนวนตัวเลือกที่ใช้ (4-6) */
  choiceCount: number;
  /** สัดส่วนของ scan zone (width/height) สำหรับ IQG validation */
  scanZoneAspectRatio: number;
}

export const DEFAULT_CALIBRATION_PARAMS = {
  minContrast: 80,
  targetMargin: 0.25,
  confidenceTiers: {
    high: 0.85,
    medium: 0.65
  },
  iqgTolerances: {
    blurVarianceMin: 60.0,
    glareMaxPercentage: 4.0,
    curvatureMaxPercentage: 20.0,
    aspectRatioTolerance: 0.20
  }
};

const ALL_CHOICES = ["A", "B", "C", "D", "E", "F"];

/** ขนาด canvas มาตรฐาน A4 @ 200 DPI */
const CANVAS_W = 1654;
const CANVAS_H = 2339;

/** มาร์กเกอร์สี่เหลี่ยมดำ ~12mm = 94px @ 200DPI */
const MARKER_W = 94 / CANVAS_W;
const MARKER_H = 94 / CANVAS_H;
const MARGIN_X = 50 / CANVAS_W;
const MARGIN_Y = 40 / CANVAS_H;

/** ขอบเขต Scan Zone: ด้านบน v=MARGIN_Y ถึง v=SCAN_ZONE_BOTTOM */
const SCAN_ZONE_BOTTOM = 0.575;

/** Bubble radius ใหญ่ขึ้น 15% สำหรับสแกนมือถือ */
const BUBBLE_R = 14 / CANVAS_W;

/**
 * สร้าง fiducial markers 4 มุมรอบ Scan Zone (ไม่ใช่มุมกระดาษ A4)
 */
function createScanZoneMarkers() {
  return {
    topLeft: { u: MARGIN_X, v: MARGIN_Y, width: MARKER_W, height: MARKER_H },
    topRight: { u: 1.0 - MARGIN_X - MARKER_W, v: MARGIN_Y, width: MARKER_W, height: MARKER_H },
    bottomLeft: { u: MARGIN_X, v: SCAN_ZONE_BOTTOM, width: MARKER_W, height: MARKER_H },
    bottomRight: { u: 1.0 - MARGIN_X - MARKER_W, v: SCAN_ZONE_BOTTOM, width: MARKER_W, height: MARKER_H }
  };
}

/**
 * สร้าง Student ID Grid (5 หลัก, ค่า 0-9)
 * ตำแหน่ง: u 0.08-0.32, v 0.10-0.23
 */
function createStudentIdGrid(): TemplateGridMetadata["studentIdGrid"] {
  const digits: StudentIdDigitCoordinate[] = [];
  const startU = 0.09;
  const startV = 0.105;
  const stepU = 0.042;
  const stepV = 0.0125;

  for (let digit = 0; digit < 5; digit++) {
    for (let val = 0; val <= 9; val++) {
      digits.push({
        digitIndex: digit,
        value: val,
        u: startU + digit * stepU,
        v: startV + val * stepV,
        radius: BUBBLE_R * 0.85
      });
    }
  }

  return { digitsCount: 5, digits };
}

/**
 * สร้าง Version Code Grid (01-04)
 * ตำแหน่ง: u 0.38-0.55, v 0.12-0.16
 */
function createVersionCodeGrid(): TemplateGridMetadata["versionCodeGrid"] {
  return {
    versions: [
      { versionCode: "01", u: 0.40, v: 0.135, radius: BUBBLE_R },
      { versionCode: "02", u: 0.445, v: 0.135, radius: BUBBLE_R },
      { versionCode: "03", u: 0.49, v: 0.135, radius: BUBBLE_R },
      { versionCode: "04", u: 0.535, v: 0.135, radius: BUBBLE_R }
    ]
  };
}

/**
 * สร้าง QR Code Anchor
 */
function createQrAnchor() {
  return { u: 0.82, v: 0.035, size: 130 / CANVAS_W };
}

/**
 * คำนวณ aspect ratio ของ scan zone
 * scan zone กว้าง = (1.0 - 2*MARGIN_X) * CANVAS_W
 * scan zone สูง = (SCAN_ZONE_BOTTOM - MARGIN_Y) * CANVAS_H
 */
function calcScanZoneAspectRatio(): number {
  const zoneW = (1.0 - 2 * MARGIN_X) * CANVAS_W;
  const zoneH = (SCAN_ZONE_BOTTOM - MARGIN_Y) * CANVAS_H;
  return zoneH / zoneW; // ~0.82 (กว้างกว่าสูง)
}

// =============================================================================
// COMPACT GRID GENERATORS
// =============================================================================

/**
 * สร้าง Compact Grid สำหรับ 20 ข้อ (1 คอลัมน์)
 * Bubble zone: v 0.265 → 0.545 (ระยะห่างกว้างสบายตา)
 */
export function generate20ItemGridMetadata(choiceCount: number = 4): TemplateGridMetadata {
  const choices = ALL_CHOICES.slice(0, Math.min(6, Math.max(2, choiceCount)));
  const rowStepV = 0.014;
  const startV = 0.265;
  // จัดตัวเลือกให้อยู่กลาง
  const totalChoiceWidth = (choices.length - 1) * 0.052;
  const choiceStartU = 0.5 - totalChoiceWidth / 2;

  const questionBlocks: QuestionCoordinate[] = [];
  for (let i = 1; i <= 20; i++) {
    const v = startV + (i - 1) * rowStepV;
    const bubbles: BubbleCoordinate[] = choices.map((c, cIdx) => ({
      choice: c,
      u: choiceStartU + cIdx * 0.052,
      v,
      radius: BUBBLE_R
    }));
    questionBlocks.push({ itemNo: i, bubbles });
  }

  return {
    canvasWidth: CANVAS_W,
    canvasHeight: CANVAS_H,
    fiducialMarkers: createScanZoneMarkers(),
    qrCodeAnchor: createQrAnchor(),
    studentIdGrid: createStudentIdGrid(),
    versionCodeGrid: createVersionCodeGrid(),
    questionBlocks,
    choiceCount: choices.length,
    scanZoneAspectRatio: calcScanZoneAspectRatio()
  };
}

/**
 * สร้าง Compact Grid สำหรับ 50 ข้อ (2 คอลัมน์ x 25 ข้อ)
 * Bubble zone: v 0.265 → 0.545
 */
export function generate50ItemGridMetadata(choiceCount: number = 4): TemplateGridMetadata {
  const choices = ALL_CHOICES.slice(0, Math.min(6, Math.max(2, choiceCount)));
  const rowStepV = 0.0112;
  const startV = 0.265;

  // คำนวณ choice step ตามจำนวนตัวเลือก
  const choiceStepU = choices.length <= 4 ? 0.052 : 0.042;

  // Col 1 base U, Col 2 base U (แบ่งครึ่งหน้ากระดาษ)
  const col1BaseU = 0.12;
  const col2BaseU = 0.57;

  const questionBlocks: QuestionCoordinate[] = [];

  // Col 1: ข้อ 1-25
  for (let i = 1; i <= 25; i++) {
    const v = startV + (i - 1) * rowStepV;
    const bubbles: BubbleCoordinate[] = choices.map((c, cIdx) => ({
      choice: c,
      u: col1BaseU + cIdx * choiceStepU,
      v,
      radius: BUBBLE_R
    }));
    questionBlocks.push({ itemNo: i, bubbles });
  }

  // Col 2: ข้อ 26-50
  for (let i = 26; i <= 50; i++) {
    const v = startV + (i - 26) * rowStepV;
    const bubbles: BubbleCoordinate[] = choices.map((c, cIdx) => ({
      choice: c,
      u: col2BaseU + cIdx * choiceStepU,
      v,
      radius: BUBBLE_R
    }));
    questionBlocks.push({ itemNo: i, bubbles });
  }

  return {
    canvasWidth: CANVAS_W,
    canvasHeight: CANVAS_H,
    fiducialMarkers: createScanZoneMarkers(),
    qrCodeAnchor: createQrAnchor(),
    studentIdGrid: createStudentIdGrid(),
    versionCodeGrid: createVersionCodeGrid(),
    questionBlocks,
    choiceCount: choices.length,
    scanZoneAspectRatio: calcScanZoneAspectRatio()
  };
}

/**
 * สร้าง Compact Grid สำหรับ 75 ข้อ (3 คอลัมน์ x 25 ข้อ)
 * Bubble zone: v 0.265 → 0.545
 */
export function generate75ItemGridMetadata(choiceCount: number = 4): TemplateGridMetadata {
  const choices = ALL_CHOICES.slice(0, Math.min(6, Math.max(2, choiceCount)));
  const rowStepV = 0.0112;
  const startV = 0.265;
  const choiceStepU = choices.length <= 4 ? 0.042 : 0.034;

  const colBaseUs = [0.08, 0.38, 0.68];

  const questionBlocks: QuestionCoordinate[] = [];
  for (let i = 1; i <= 75; i++) {
    const colIdx = Math.floor((i - 1) / 25);
    const rowIdx = (i - 1) % 25;
    const v = startV + rowIdx * rowStepV;
    const baseU = colBaseUs[colIdx];
    const bubbles: BubbleCoordinate[] = choices.map((c, cIdx) => ({
      choice: c,
      u: baseU + cIdx * choiceStepU,
      v,
      radius: BUBBLE_R * 0.85
    }));
    questionBlocks.push({ itemNo: i, bubbles });
  }

  return {
    canvasWidth: CANVAS_W,
    canvasHeight: CANVAS_H,
    fiducialMarkers: createScanZoneMarkers(),
    qrCodeAnchor: createQrAnchor(),
    studentIdGrid: createStudentIdGrid(),
    versionCodeGrid: createVersionCodeGrid(),
    questionBlocks,
    choiceCount: choices.length,
    scanZoneAspectRatio: calcScanZoneAspectRatio()
  };
}

/**
 * สร้าง Compact Grid สำหรับ 100 ข้อ (4 คอลัมน์ x 25 ข้อ)
 * Bubble zone: v 0.265 → 0.545
 */
export function generate100ItemGridMetadata(choiceCount: number = 4): TemplateGridMetadata {
  const choices = ALL_CHOICES.slice(0, Math.min(6, Math.max(2, choiceCount)));
  const rowStepV = 0.0112;
  const startV = 0.265;
  const choiceStepU = choices.length <= 4 ? 0.036 : 0.029;

  const colBaseUs = [0.06, 0.30, 0.54, 0.78];

  const questionBlocks: QuestionCoordinate[] = [];
  for (let i = 1; i <= 100; i++) {
    const colIdx = Math.floor((i - 1) / 25);
    const rowIdx = (i - 1) % 25;
    const v = startV + rowIdx * rowStepV;
    const baseU = colBaseUs[colIdx];
    const bubbles: BubbleCoordinate[] = choices.map((c, cIdx) => ({
      choice: c,
      u: baseU + cIdx * choiceStepU,
      v,
      radius: BUBBLE_R * 0.75
    }));
    questionBlocks.push({ itemNo: i, bubbles });
  }

  return {
    canvasWidth: CANVAS_W,
    canvasHeight: CANVAS_H,
    fiducialMarkers: createScanZoneMarkers(),
    qrCodeAnchor: createQrAnchor(),
    studentIdGrid: createStudentIdGrid(),
    versionCodeGrid: createVersionCodeGrid(),
    questionBlocks,
    choiceCount: choices.length,
    scanZoneAspectRatio: calcScanZoneAspectRatio()
  };
}

/**
 * Helper: เลือก TemplateGridMetadata ตามจำนวนข้อ
 * @param totalItems จำนวนข้อทั้งหมด (1-100)
 * @param choiceCount จำนวนตัวเลือก (2-6, default 4 = A,B,C,D)
 */
export function getTemplateGridForItems(
  totalItems: number,
  choiceCount: number = 4
): TemplateGridMetadata {
  if (totalItems <= 20) return generate20ItemGridMetadata(choiceCount);
  if (totalItems <= 50) return generate50ItemGridMetadata(choiceCount);
  if (totalItems <= 75) return generate75ItemGridMetadata(choiceCount);
  return generate100ItemGridMetadata(choiceCount);
}
