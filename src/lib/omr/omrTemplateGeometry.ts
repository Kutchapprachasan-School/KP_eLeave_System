/**
 * KP Academic OMR - Compact Scan Zone Template Geometry (Rev 10.0)
 * 
 * รองรับ 5 แม่แบบมาตรฐาน (20, 40, 60, 80, 100 ข้อ):
 * - 20 ข้อ: 2 คอลัมน์ คอลัมน์ละ 10 ข้อ (ปัดทุก 10 ข้อ)
 * - 40 ข้อ: 2 คอลัมน์ คอลัมน์ละ 20 ข้อ
 * - 60 ข้อ: 3 คอลัมน์ คอลัมน์ละ 20 ข้อ
 * - 80 ข้อ: 4 คอลัมน์ คอลัมน์ละ 20 ข้อ
 * - 100 ข้อ: 5 คอลัมน์ คอลัมน์ละ 20 ข้อ
 * 
 * รองรับตัวเลือก A-F (สูงสุด 6 ตัวเลือก ตามที่ครูกำหนด)
 * รองรับคะแนนอัตนัยแบบยืดหยุ่น 0-30 คะแนน (หลักสิบ 0-3, หลักหน่วย 0-9)
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

export interface SubjectiveScoreCoordinate {
  itemNo: number;
  tens: { value: number; u: number; v: number; radius: number }[]; // 0, 1, 2, 3 (for 0-30 points)
  units: { value: number; u: number; v: number; radius: number }[]; // 0 to 9
}

/** ZipGrade-style row timing marks for scan alignment */
export interface TimingMark {
  /** 0-based row index within the column */
  rowIndex: number;
  /** 0-based column index */
  colIndex: number;
  /** normalized X (left edge of timing mark) */
  u: number;
  /** normalized Y (same as question row center) */
  v: number;
  /** normalized width/height of the timing mark square */
  size: number;
}

export interface TemplateGridMetadata {
  canvasWidth: number;
  canvasHeight: number;
  fiducialMarkers: {
    topLeft: { u: number; v: number; width: number; height: number };
    topRight: { u: number; v: number; width: number; height: number };
    bottomLeft: { u: number; v: number; width: number; height: number };
    bottomRight: { u: number; v: number; width: number; height: number };
    midLeft?: { u: number; v: number; width: number; height: number };
    midRight?: { u: number; v: number; width: number; height: number };
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
  subjectiveScores?: SubjectiveScoreCoordinate[];
  /** Row-level timing marks for scan alignment (ZipGrade-style) */
  timingMarks?: TimingMark[];
  questionBlocks: QuestionCoordinate[];
  /** จำนวนตัวเลือกที่ใช้ (2-6) */
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

/** Mid-side markers 8mm = 63px @ 200DPI */
const MARKER_MID_W = 63 / CANVAS_W;
const MARKER_MID_H = 63 / CANVAS_H;

/** Timing mark ~3mm = 24px @ 200DPI */
const TIMING_MARK_SIZE = 24 / CANVAS_W;

/** ขอบเขต Scan Zone: ด้านบน v=MARGIN_Y ถึง v=SCAN_ZONE_BOTTOM */
const SCAN_ZONE_BOTTOM = 0.575;

/** Bubble radius ใหญ่ขึ้นสำหรับสแกนมือถือ (Rev 10.0: 16px จากเดิม 13.5px) */
const BUBBLE_R = 16 / CANVAS_W;

/**
 * สร้าง fiducial markers 6 จุดรอบ Scan Zone (4 มุม + 2 กลาง)
 * Rev 10.0: เพิ่ม midLeft/midRight เพื่อเพิ่มความแม่นยำในการสแกน
 */
function createScanZoneMarkers() {
  const midV = (MARGIN_Y + SCAN_ZONE_BOTTOM) / 2 - MARKER_MID_H / 2;
  return {
    topLeft: { u: MARGIN_X, v: MARGIN_Y, width: MARKER_W, height: MARKER_H },
    topRight: { u: 1.0 - MARGIN_X - MARKER_W, v: MARGIN_Y, width: MARKER_W, height: MARKER_H },
    bottomLeft: { u: MARGIN_X, v: SCAN_ZONE_BOTTOM, width: MARKER_W, height: MARKER_H },
    bottomRight: { u: 1.0 - MARGIN_X - MARKER_W, v: SCAN_ZONE_BOTTOM, width: MARKER_W, height: MARKER_H },
    midLeft: { u: MARGIN_X, v: midV, width: MARKER_MID_W, height: MARKER_MID_H },
    midRight: { u: 1.0 - MARGIN_X - MARKER_MID_W, v: midV, width: MARKER_MID_W, height: MARKER_MID_H }
  };
}

/**
 * สร้าง Student ID Grid (5 หลัก, ค่า 0-9)
 */
function createStudentIdGrid(): TemplateGridMetadata["studentIdGrid"] {
  const digits: StudentIdDigitCoordinate[] = [];
  const startU = 0.10;
  const startV = 0.105;
  const stepU = 0.040;
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
 */
function createVersionCodeGrid(): TemplateGridMetadata["versionCodeGrid"] {
  return {
    versions: [
      { versionCode: "01", u: 0.42, v: 0.125, radius: BUBBLE_R },
      { versionCode: "02", u: 0.465, v: 0.125, radius: BUBBLE_R },
      { versionCode: "03", u: 0.51, v: 0.125, radius: BUBBLE_R },
      { versionCode: "04", u: 0.555, v: 0.125, radius: BUBBLE_R }
    ]
  };
}

/**
 * สร้าง Combined Subjective Score Grid (0-30 คะแนนรวม: หลักสิบ 0-3, หลักหน่วย 0-9)
 * Rev 10.0: คะแนนรวมทุกข้ออัตนัยในช่องเดียว
 */
function createCombinedSubjectiveScore(): SubjectiveScoreCoordinate[] {
  const baseV = 0.17;

  // Single combined entry (itemNo = 0 means "total")
  const vTens = baseV;
  const vUnits = vTens + 0.015;

  // Tens: 0, 1, 2, 3
  const tens = [0, 1, 2, 3].map((val, idx) => ({
    value: val,
    u: 0.45 + idx * 0.032,
    v: vTens,
    radius: BUBBLE_R * 0.8
  }));

  // Units: 0 to 9
  const units = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((val, idx) => ({
    value: val,
    u: 0.45 + idx * 0.032,
    v: vUnits,
    radius: BUBBLE_R * 0.8
  }));

  return [{ itemNo: 0, tens, units }];
}

/**
 * สร้าง QR Code Anchor
 */
function createQrAnchor() {
  return { u: 0.82, v: 0.035, size: 130 / CANVAS_W };
}

/**
 * คำนวณ aspect ratio ของ scan zone
 */
function calcScanZoneAspectRatio(): number {
  const zoneW = (1.0 - 2 * MARGIN_X) * CANVAS_W;
  const zoneH = (SCAN_ZONE_BOTTOM - MARGIN_Y) * CANVAS_H;
  return zoneH / zoneW;
}

// =============================================================================
// TIMING MARKS GENERATOR (ZipGrade-style row alignment)
// =============================================================================

/**
 * สร้าง Timing Marks สำหรับทุกแถวข้อสอบในแต่ละคอลัมน์ (ZipGrade-style)
 * ใช้เป็นจุดอ้างอิงแถวเพื่อให้สแกนแม่นยำ
 */
function createTimingMarks(
  questionBlocks: QuestionCoordinate[],
  colBaseUs: number[],
  rowsPerCol: number
): TimingMark[] {
  const marks: TimingMark[] = [];
  const offset = 0.022; // offset ทางซ้ายจาก column base

  for (let colIdx = 0; colIdx < colBaseUs.length; colIdx++) {
    const colStartItem = colIdx * rowsPerCol + 1;
    for (let rowIdx = 0; rowIdx < rowsPerCol; rowIdx++) {
      const itemNo = colStartItem + rowIdx;
      const question = questionBlocks.find(q => q.itemNo === itemNo);
      if (!question || question.bubbles.length === 0) continue;

      marks.push({
        rowIndex: rowIdx,
        colIndex: colIdx,
        u: colBaseUs[colIdx] - offset,
        v: question.bubbles[0].v,
        size: TIMING_MARK_SIZE
      });
    }
  }

  return marks;
}

// =============================================================================
// STANDARDIZED 5-TIER GRID GENERATORS (20, 40, 60, 80, 100)
// =============================================================================

/**
 * 1. แม่แบบ 20 ข้อ: 2 คอลัมน์ x 10 ข้อ (ปัดทุก 10 ข้อ)
 * Col 1: ข้อ 1 - 10 | Col 2: ข้อ 11 - 20
 */
export function generate20ItemGridMetadata(choiceCount: number = 4): TemplateGridMetadata {
  const choices = ALL_CHOICES.slice(0, Math.min(6, Math.max(2, choiceCount)));
  const rowStepV = 0.022; // ระยะห่างกว้าง โล่ง สบายตา
  const startV = 0.280;
  const choiceStepU = choices.length <= 4 ? 0.052 : 0.042;

  const col1BaseU = 0.18;
  const col2BaseU = 0.58;

  const questionBlocks: QuestionCoordinate[] = [];

  // Col 1: ข้อ 1 - 10
  for (let i = 1; i <= 10; i++) {
    const v = startV + (i - 1) * rowStepV;
    questionBlocks.push({
      itemNo: i,
      bubbles: choices.map((c, cIdx) => ({
        choice: c,
        u: col1BaseU + cIdx * choiceStepU,
        v,
        radius: BUBBLE_R * 1.1
      }))
    });
  }

  // Col 2: ข้อ 11 - 20
  for (let i = 11; i <= 20; i++) {
    const v = startV + (i - 11) * rowStepV;
    questionBlocks.push({
      itemNo: i,
      bubbles: choices.map((c, cIdx) => ({
        choice: c,
        u: col2BaseU + cIdx * choiceStepU,
        v,
        radius: BUBBLE_R * 1.1
      }))
    });
  }

  const timingMarks = createTimingMarks(questionBlocks, [col1BaseU, col2BaseU], 10);

  return {
    canvasWidth: CANVAS_W,
    canvasHeight: CANVAS_H,
    fiducialMarkers: createScanZoneMarkers(),
    qrCodeAnchor: createQrAnchor(),
    studentIdGrid: createStudentIdGrid(),
    versionCodeGrid: createVersionCodeGrid(),
    subjectiveScores: createCombinedSubjectiveScore(),
    timingMarks,
    questionBlocks,
    choiceCount: choices.length,
    scanZoneAspectRatio: calcScanZoneAspectRatio()
  };
}

/**
 * 2. แม่แบบ 40 ข้อ: 2 คอลัมน์ x 20 ข้อ
 * Col 1: ข้อ 1 - 20 | Col 2: ข้อ 21 - 40
 */
export function generate40ItemGridMetadata(choiceCount: number = 4): TemplateGridMetadata {
  const choices = ALL_CHOICES.slice(0, Math.min(6, Math.max(2, choiceCount)));
  const rowStepV = 0.0132;
  const startV = 0.270;
  const choiceStepU = choices.length <= 4 ? 0.050 : 0.040;

  const col1BaseU = 0.14;
  const col2BaseU = 0.57;

  const questionBlocks: QuestionCoordinate[] = [];

  // Col 1: 1 - 20
  for (let i = 1; i <= 20; i++) {
    const v = startV + (i - 1) * rowStepV;
    questionBlocks.push({
      itemNo: i,
      bubbles: choices.map((c, cIdx) => ({
        choice: c,
        u: col1BaseU + cIdx * choiceStepU,
        v,
        radius: BUBBLE_R
      }))
    });
  }

  // Col 2: 21 - 40
  for (let i = 21; i <= 40; i++) {
    const v = startV + (i - 21) * rowStepV;
    questionBlocks.push({
      itemNo: i,
      bubbles: choices.map((c, cIdx) => ({
        choice: c,
        u: col2BaseU + cIdx * choiceStepU,
        v,
        radius: BUBBLE_R
      }))
    });
  }

  const timingMarks = createTimingMarks(questionBlocks, [col1BaseU, col2BaseU], 20);

  return {
    canvasWidth: CANVAS_W,
    canvasHeight: CANVAS_H,
    fiducialMarkers: createScanZoneMarkers(),
    qrCodeAnchor: createQrAnchor(),
    studentIdGrid: createStudentIdGrid(),
    versionCodeGrid: createVersionCodeGrid(),
    subjectiveScores: createCombinedSubjectiveScore(),
    timingMarks,
    questionBlocks,
    choiceCount: choices.length,
    scanZoneAspectRatio: calcScanZoneAspectRatio()
  };
}

/**
 * 3. แม่แบบ 60 ข้อ: 3 คอลัมน์ x 20 ข้อ
 * Col 1: 1 - 20 | Col 2: 21 - 40 | Col 3: 41 - 60
 */
export function generate60ItemGridMetadata(choiceCount: number = 4): TemplateGridMetadata {
  const choices = ALL_CHOICES.slice(0, Math.min(6, Math.max(2, choiceCount)));
  const rowStepV = 0.0132;
  const startV = 0.270;
  const choiceStepU = choices.length <= 4 ? 0.038 : 0.031;

  const colBaseUs = [0.08, 0.38, 0.68];
  const questionBlocks: QuestionCoordinate[] = [];

  for (let i = 1; i <= 60; i++) {
    const colIdx = Math.floor((i - 1) / 20);
    const rowIdx = (i - 1) % 20;
    const v = startV + rowIdx * rowStepV;
    const baseU = colBaseUs[colIdx];

    questionBlocks.push({
      itemNo: i,
      bubbles: choices.map((c, cIdx) => ({
        choice: c,
        u: baseU + cIdx * choiceStepU,
        v,
        radius: BUBBLE_R * 0.9
      }))
    });
  }

  const timingMarks = createTimingMarks(questionBlocks, colBaseUs, 20);

  return {
    canvasWidth: CANVAS_W,
    canvasHeight: CANVAS_H,
    fiducialMarkers: createScanZoneMarkers(),
    qrCodeAnchor: createQrAnchor(),
    studentIdGrid: createStudentIdGrid(),
    versionCodeGrid: createVersionCodeGrid(),
    subjectiveScores: createCombinedSubjectiveScore(),
    timingMarks,
    questionBlocks,
    choiceCount: choices.length,
    scanZoneAspectRatio: calcScanZoneAspectRatio()
  };
}

/**
 * 4. แม่แบบ 80 ข้อ: 4 คอลัมน์ x 20 ข้อ
 * Col 1: 1-20 | Col 2: 21-40 | Col 3: 41-60 | Col 4: 61-80
 */
export function generate80ItemGridMetadata(choiceCount: number = 4): TemplateGridMetadata {
  const choices = ALL_CHOICES.slice(0, Math.min(6, Math.max(2, choiceCount)));
  const rowStepV = 0.0132;
  const startV = 0.270;
  const choiceStepU = choices.length <= 4 ? 0.033 : 0.026;

  const colBaseUs = [0.06, 0.29, 0.52, 0.75];
  const questionBlocks: QuestionCoordinate[] = [];

  for (let i = 1; i <= 80; i++) {
    const colIdx = Math.floor((i - 1) / 20);
    const rowIdx = (i - 1) % 20;
    const v = startV + rowIdx * rowStepV;
    const baseU = colBaseUs[colIdx];

    questionBlocks.push({
      itemNo: i,
      bubbles: choices.map((c, cIdx) => ({
        choice: c,
        u: baseU + cIdx * choiceStepU,
        v,
        radius: BUBBLE_R * 0.8
      }))
    });
  }

  const timingMarks = createTimingMarks(questionBlocks, colBaseUs, 20);

  return {
    canvasWidth: CANVAS_W,
    canvasHeight: CANVAS_H,
    fiducialMarkers: createScanZoneMarkers(),
    qrCodeAnchor: createQrAnchor(),
    studentIdGrid: createStudentIdGrid(),
    versionCodeGrid: createVersionCodeGrid(),
    subjectiveScores: createCombinedSubjectiveScore(),
    timingMarks,
    questionBlocks,
    choiceCount: choices.length,
    scanZoneAspectRatio: calcScanZoneAspectRatio()
  };
}

/**
 * 5. แม่แบบ 100 ข้อ: 5 คอลัมน์ x 20 ข้อ
 * Col 1..5 x 20 items each
 */
export function generate100ItemGridMetadata(choiceCount: number = 4): TemplateGridMetadata {
  const choices = ALL_CHOICES.slice(0, Math.min(6, Math.max(2, choiceCount)));
  const rowStepV = 0.0132;
  const startV = 0.270;
  const choiceStepU = choices.length <= 4 ? 0.028 : 0.022;

  const colBaseUs = [0.05, 0.235, 0.42, 0.605, 0.79];
  const questionBlocks: QuestionCoordinate[] = [];

  for (let i = 1; i <= 100; i++) {
    const colIdx = Math.floor((i - 1) / 20);
    const rowIdx = (i - 1) % 20;
    const v = startV + rowIdx * rowStepV;
    const baseU = colBaseUs[colIdx];

    questionBlocks.push({
      itemNo: i,
      bubbles: choices.map((c, cIdx) => ({
        choice: c,
        u: baseU + cIdx * choiceStepU,
        v,
        radius: BUBBLE_R * 0.75
      }))
    });
  }

  const timingMarks = createTimingMarks(questionBlocks, colBaseUs, 20);

  return {
    canvasWidth: CANVAS_W,
    canvasHeight: CANVAS_H,
    fiducialMarkers: createScanZoneMarkers(),
    qrCodeAnchor: createQrAnchor(),
    studentIdGrid: createStudentIdGrid(),
    versionCodeGrid: createVersionCodeGrid(),
    subjectiveScores: createCombinedSubjectiveScore(),
    timingMarks,
    questionBlocks,
    choiceCount: choices.length,
    scanZoneAspectRatio: calcScanZoneAspectRatio()
  };
}

// Aliases for backward compatibility
export const generate50ItemGridMetadata = generate60ItemGridMetadata;
export const generate75ItemGridMetadata = generate80ItemGridMetadata;

/**
 * Dispatcher: เลือก TemplateGridMetadata อัตโนมัติตาม totalItems
 * - <= 20: แม่แบบ 20 (2 x 10)
 * - <= 40: แม่แบบ 40 (2 x 20)
 * - <= 60: แม่แบบ 60 (3 x 20)
 * - <= 80: แม่แบบ 80 (4 x 20)
 * - > 80: แม่แบบ 100 (5 x 20)
 */
export function getTemplateGridForItems(
  totalItems: number,
  choiceCount: number = 4
): TemplateGridMetadata {
  if (totalItems <= 20) return generate20ItemGridMetadata(choiceCount);
  if (totalItems <= 40) return generate40ItemGridMetadata(choiceCount);
  if (totalItems <= 60) return generate60ItemGridMetadata(choiceCount);
  if (totalItems <= 80) return generate80ItemGridMetadata(choiceCount);
  return generate100ItemGridMetadata(choiceCount);
}
