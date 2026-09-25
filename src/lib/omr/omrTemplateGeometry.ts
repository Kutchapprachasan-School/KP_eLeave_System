/**
 * OMR Rev 11.0 Template Geometry Specification (Full-Page Side-by-Side Architecture)
 * Canonical Resolution: 1000 x 1414 pixels (Full A4 Portrait 210mm x 297mm)
 *
 * Key Architectural Upgrades (ADR-20260925):
 * 1. Full-Page Side-by-Side Layout (No Subjective Half-Page):
 *    - Left Sidebar (u = 0.095..0.305):
 *      a) 5-Digit Student ID (`เลขประจำตัว` 0-9)
 *      b) 2-Digit Seat No (`เลขที่` 0-9) + 1-Column Exam Version (`รหัสชุด` ก ข ค ง)
 *      c) Shading Example Box (`ตัวอย่างการระบาย`)
 *    - Right Zone (u = 0.340..0.915):
 *      a) Multiple-Choice Answer Columns with 5-row visual block grouping (`1-5`, `6-10`, ...)
 *      b) Column Header Timing Squares (`■`) at the top of every answer column
 *      c) Right-Edge Horizontal Timing Bars (`▬`) aligned with every question row
 * 2. Multi-Mode Choice Support (`numChoices = 4 | 5 | 6`):
 *    - Standard 4-choice (`ก ข ค ง` / `A B C D`) with extra-large bubbles
 *    - Special 5-choice (`ก ข ค ง จ` / `A B C D E`) and 6-choice (`ก ข ค ง จ ฉ` / `A B C D E F`)
 */

import type {
  TemplateGridMetadata,
  StudentIdDigitCoordinate,
  VersionCodeCoordinate,
  QuestionCoordinate,
  TimingMark as EngineTimingMark
} from "./omrEngine.ts";

export type ChoiceLabel = "A" | "B" | "C" | "D" | "E" | "F";
export type ChoiceCount = 4 | 5 | 6;

export const ALL_CHOICE_LABELS: ChoiceLabel[] = ["A", "B", "C", "D", "E", "F"];
export const THAI_CHOICE_LABELS: Record<ChoiceLabel, string> = {
  A: "ก",
  B: "ข",
  C: "ค",
  D: "ง",
  E: "จ",
  F: "ฉ"
};

export const DEFAULT_CALIBRATION_PARAMS = {
  fillThresholdMultiplier: 0.28,
  minConfidenceThreshold: 0.65,
  multipleMarkRatioThreshold: 0.72,
  scanZoneAspectRatio: 0.6761
};

export interface NormalizedPoint {
  u: number; // 0.0 to 1.0 (Horizontal X / Width)
  v: number; // 0.0 to 1.0 (Vertical Y / Height)
}

export interface BubbleCoordinate {
  u: number;
  v: number;
  radius: number; // Normalized radius relative to width (e.g. 0.011 = 11px on 1000px width)
}

export interface QuestionRowGeometry {
  itemNo: number;
  columnIndex: number; // 0-indexed column
  rowIndexInColumn: number; // 0-indexed row inside column
  numberLabelPos: NormalizedPoint; // Position of question number label
  choices: Partial<Record<ChoiceLabel, BubbleCoordinate>> & Record<"A" | "B" | "C" | "D", BubbleCoordinate>;
}

export interface ColumnHeaderGeometry {
  columnIndex: number;
  markerPos: NormalizedPoint; // Position of black square `■` at top of column
  choiceLabelPositions: { label: ChoiceLabel; thaiLabel: string; u: number; v: number }[];
}

export interface DigitColumnGeometry {
  columnIndex: number; // 0 to 4 for 5-digit student ID, or 0 to 1 for 2-digit Seat No
  boxCenter: NormalizedPoint; // Center of the top [ _ ] digit box
  digits: Record<number, BubbleCoordinate>; // 0 to 9
}

export interface SubjectiveScoreColumn {
  tens: Record<number, BubbleCoordinate>;
  units: Record<number, BubbleCoordinate>;
}

export interface TimingMark {
  rowIndex: number; // 0-based row index within column
  columnIndex: number; // 0-based column index
  u: number; // Normalized X center of timing mark
  v: number; // Normalized Y center of timing mark
  width: number; // Normalized width
  height: number; // Normalized height
  kind?: "ROW_BAR" | "COLUMN_HEADER";
}

export interface OmrTemplateGeometry {
  code: string;
  version: number;
  canonicalWidth: number;
  canonicalHeight: number;
  scanZoneAspectRatio: number; // Width / Height of the fiducial marker bounding box
  totalItems: number;
  numChoices: ChoiceCount;
  choiceLabels: ChoiceLabel[];
  rowsPerColumn: number;
  numColumns: number;
  fiducialMarkers: {
    topLeft: { u: number; v: number; width: number; height: number };
    topRight: { u: number; v: number; width: number; height: number };
    midLeft: { u: number; v: number; width: number; height: number };
    midRight: { u: number; v: number; width: number; height: number };
    bottomLeft: { u: number; v: number; width: number; height: number };
    bottomRight: { u: number; v: number; width: number; height: number };
  };
  studentIdMatrix: DigitColumnGeometry[]; // 5 columns (00000 - 99999)
  seatNoMatrix: DigitColumnGeometry[]; // 2 columns (00 - 99) (`เลขที่`)
  versionMatrix: {
    boxCenter: NormalizedPoint;
    bubbles: Record<string, BubbleCoordinate>; // "01"(ก), "02"(ข), "03"(ค), "04"(ง)
  };
  columnHeaders: ColumnHeaderGeometry[];
  questions: QuestionRowGeometry[];
  timingMarks: TimingMark[]; // Right-edge horizontal row timing bars `▬` + column header marks `■`
  subjectiveScoreMatrix: SubjectiveScoreColumn | null; // Null in Rev 11.0 (Multiple-Choice Only)
}

const CANVAS_W = 1000;
const CANVAS_H = 1414;

/**
 * 6-Point Full-Page Fiducial Markers (`TL, TR, ML, MR, BL, BR`)
 * Framing the entire A4 Answer Sheet (mirrors the standard Thai OMR layout).
 * Horizontal span: u = 0.065 .. 0.935 (du = 0.870 -> 182.7mm)
 * Vertical span:   v = 0.045 .. 0.955 (dv = 0.910 -> 270.3mm)
 * Aspect Ratio:    (0.870 * 1000) / (0.910 * 1414) = 870 / 1286.74 = 0.6761
 */
function createFullPageFiducialMarkers() {
  const mw = 26 / CANVAS_W; // 26px (~5.5mm square)
  const mh = 26 / CANVAS_H;
  return {
    topLeft: { u: 0.065 - mw / 2, v: 0.045 - mh / 2, width: mw, height: mh },
    topRight: { u: 0.935 - mw / 2, v: 0.045 - mh / 2, width: mw, height: mh },
    midLeft: { u: 0.045 - mw / 2, v: 0.500 - mh / 2, width: mw, height: mh },
    midRight: { u: 0.955 - mw / 2, v: 0.500 - mh / 2, width: mw, height: mh },
    bottomLeft: { u: 0.065 - mw / 2, v: 0.955 - mh / 2, width: mw, height: mh },
    bottomRight: { u: 0.935 - mw / 2, v: 0.955 - mh / 2, width: mw, height: mh }
  };
}

/**
 * Left Sidebar Section 1: 5-Digit Student ID (`เลขประจำตัว`)
 * 5 columns x 10 rows (0-9)
 * Situated at u = 0.115 .. 0.235, v = 0.285 .. 0.510
 */
function createStudentIdMatrix(): DigitColumnGeometry[] {
  const startU = 0.115;
  const stepU = 0.030;
  const boxV = 0.246;
  const startV = 0.285;
  const stepV = 0.025;
  const radius = 10.2 / CANVAS_W; // ~4.3mm diameter

  const columns: DigitColumnGeometry[] = [];
  for (let col = 0; col < 5; col++) {
    const u = Number((startU + col * stepU).toFixed(4));
    const digits: Record<number, BubbleCoordinate> = {};
    for (let d = 0; d <= 9; d++) {
      digits[d] = {
        u,
        v: Number((startV + d * stepV).toFixed(4)),
        radius
      };
    }
    columns.push({
      columnIndex: col,
      boxCenter: { u, v: boxV },
      digits
    });
  }
  return columns;
}

/**
 * Left Sidebar Section 2A: 2-Digit Seat Number (`เลขที่` 00-99)
 * 2 columns x 10 rows (0-9)
 * Situated directly below Student ID at u = 0.115 .. 0.145, v = 0.610 .. 0.835
 */
function createSeatNoMatrix(): DigitColumnGeometry[] {
  const startU = 0.115;
  const stepU = 0.030;
  const boxV = 0.572;
  const startV = 0.610;
  const stepV = 0.025;
  const radius = 10.2 / CANVAS_W;

  const columns: DigitColumnGeometry[] = [];
  for (let col = 0; col < 2; col++) {
    const u = Number((startU + col * stepU).toFixed(4));
    const digits: Record<number, BubbleCoordinate> = {};
    for (let d = 0; d <= 9; d++) {
      digits[d] = {
        u,
        v: Number((startV + d * stepV).toFixed(4)),
        radius
      };
    }
    columns.push({
      columnIndex: col,
      boxCenter: { u, v: boxV },
      digits
    });
  }
  return columns;
}

/**
 * Left Sidebar Section 2B: Exam Version (`รหัสชุด` ก ข ค ง -> "01", "02", "03", "04")
 * 1 column x 4 rows right next to Seat No at u = 0.195, v = 0.610 .. 0.685
 */
function createVersionMatrix(): {
  boxCenter: NormalizedPoint;
  bubbles: Record<string, BubbleCoordinate>;
} {
  const u = 0.195;
  const boxV = 0.572;
  const startV = 0.610;
  const stepV = 0.025;
  const radius = 10.2 / CANVAS_W;
  const codes = ["01", "02", "03", "04"];
  const bubbles: Record<string, BubbleCoordinate> = {};
  codes.forEach((code, idx) => {
    bubbles[code] = {
      u,
      v: Number((startV + idx * stepV).toFixed(4)),
      radius
    };
  });
  return {
    boxCenter: { u, v: boxV },
    bubbles
  };
}

/**
 * Computes the exact vertical coordinate `v` of row `r` (0-based)
 * incorporating a subtle 5-item visual group spacing (`1-5`, `6-10`, `11-15`, ...)
 */
export function computeQuestionRowV(
  rowIndex: number,
  startV: number,
  stepV: number,
  blockGapV: number
): number {
  const groupIndex = Math.floor(rowIndex / 5);
  return Number((startV + rowIndex * stepV + groupIndex * blockGapV).toFixed(4));
}

/**
 * Generates Right-Side Answer Columns, Column Headers (`■`), and Right-Edge Row Timing Bars (`▬`)
 */
function buildAnswerZoneGeometry(params: {
  totalItems: number;
  numChoices: ChoiceCount;
  rowsPerColumn: number;
  columnStartUs: number[]; // U position of the first choice bubble ('A'/'ก') in each column
  choiceStepU: number;
  bubbleRadius: number;
  headerV: number;
  startV: number;
  stepV: number;
  blockGapV: number;
  rightTimingBarU: number;
}) {
  const choiceLabels = ALL_CHOICE_LABELS.slice(0, params.numChoices);
  const questions: QuestionRowGeometry[] = [];
  const columnHeaders: ColumnHeaderGeometry[] = [];
  const timingMarks: TimingMark[] = [];

  const barW = 18 / CANVAS_W; // ~3.8mm horizontal bar `▬`
  const barH = 8 / CANVAS_H; // ~1.7mm thick bar

  // 1. Build Column Headers (`■` + ก ข ค ง ...)
  params.columnStartUs.forEach((firstBubbleU, colIdx) => {
    const markerU = Number((firstBubbleU - 0.032).toFixed(4));
    const choiceLabelPositions = choiceLabels.map((label, cIdx) => ({
      label,
      thaiLabel: THAI_CHOICE_LABELS[label],
      u: Number((firstBubbleU + cIdx * params.choiceStepU).toFixed(4)),
      v: params.headerV
    }));
    columnHeaders.push({
      columnIndex: colIdx,
      markerPos: { u: markerU, v: params.headerV },
      choiceLabelPositions
    });
  });

  // 2. Build Right-Edge Row Timing Bars (`▬`) for every row `0 .. rowsPerColumn - 1`
  for (let r = 0; r < params.rowsPerColumn; r++) {
    const v = computeQuestionRowV(r, params.startV, params.stepV, params.blockGapV);
    for (let colIdx = 0; colIdx < params.columnStartUs.length; colIdx++) {
      timingMarks.push({
        rowIndex: r,
        columnIndex: colIdx,
        u: params.rightTimingBarU,
        v,
        width: barW,
        height: barH,
        kind: "ROW_BAR"
      });
    }
  }

  // 3. Build Question Rows (`1 .. totalItems`)
  for (let itemNo = 1; itemNo <= params.totalItems; itemNo++) {
    const colIdx = Math.floor((itemNo - 1) / params.rowsPerColumn);
    const rowIdx = (itemNo - 1) % params.rowsPerColumn;
    const firstBubbleU = params.columnStartUs[colIdx];
    const v = computeQuestionRowV(rowIdx, params.startV, params.stepV, params.blockGapV);

    const choices: any = {};
    choiceLabels.forEach((label, cIdx) => {
      choices[label] = {
        u: Number((firstBubbleU + cIdx * params.choiceStepU).toFixed(4)),
        v,
        radius: params.bubbleRadius
      };
    });

    questions.push({
      itemNo,
      columnIndex: colIdx,
      rowIndexInColumn: rowIdx,
      numberLabelPos: {
        u: Number((firstBubbleU - 0.032).toFixed(4)),
        v
      },
      choices
    });
  }

  return { choiceLabels, columnHeaders, questions, timingMarks };
}

/**
 * Dynamic Template Generator supporting all 5 Tiers (20, 40, 60, 80, 100)
 * and 3 Choice Modes (4 = ก-ง Standard, 5 = ก-จ Special, 6 = ก-ฉ Special)
 */
export function buildOmrTemplateGeometry(
  totalItemsInput: number,
  numChoicesInput: ChoiceCount = 4
): OmrTemplateGeometry {
  const numChoices: ChoiceCount =
    numChoicesInput === 5 ? 5 : numChoicesInput === 6 ? 6 : 4;

  const tier =
    totalItemsInput <= 20
      ? 20
      : totalItemsInput <= 40
      ? 40
      : totalItemsInput <= 60
      ? 60
      : totalItemsInput <= 80
      ? 80
      : 100;

  let rowsPerColumn = 14;
  let columnStartUs: number[] = [0.382, 0.560, 0.738];
  let choiceStepU = 0.031;
  let bubbleRadius = 10.8 / CANVAS_W;
  const headerV = 0.242;
  let startV = 0.282;
  let stepV = 0.033;
  let blockGapV = 0.012;
  const rightTimingBarU = 0.912;

  if (tier === 20) {
    // 2 columns x 10 rows (1-10, 11-20)
    rowsPerColumn = 10;
    columnStartUs = [0.405, 0.655];
    choiceStepU = numChoices === 4 ? 0.038 : numChoices === 5 ? 0.031 : 0.026;
    bubbleRadius = (numChoices === 4 ? 12.5 : numChoices === 5 ? 11.2 : 10.0) / CANVAS_W;
    startV = 0.285;
    stepV = 0.042;
    blockGapV = 0.016;
  } else if (tier === 40) {
    // 3 columns x 14 rows (1-14, 15-28, 29-40) — Exact Reference Layout
    rowsPerColumn = 14;
    columnStartUs = [0.382, 0.560, 0.738];
    choiceStepU = numChoices === 4 ? 0.031 : numChoices === 5 ? 0.0245 : 0.0202;
    bubbleRadius = (numChoices === 4 ? 10.8 : numChoices === 5 ? 9.4 : 8.2) / CANVAS_W;
    startV = 0.282;
    stepV = 0.033;
    blockGapV = 0.012;
  } else if (tier === 60) {
    // 3 columns x 20 rows (1-20, 21-40, 41-60)
    rowsPerColumn = 20;
    columnStartUs = [0.382, 0.560, 0.738];
    choiceStepU = numChoices === 4 ? 0.031 : numChoices === 5 ? 0.0245 : 0.0202;
    bubbleRadius = (numChoices === 4 ? 10.2 : numChoices === 5 ? 9.0 : 8.0) / CANVAS_W;
    startV = 0.278;
    stepV = 0.0275;
    blockGapV = 0.009;
  } else if (tier === 80) {
    // 4 columns x 20 rows (1-20, 21-40, 41-60, 61-80)
    rowsPerColumn = 20;
    columnStartUs = [0.362, 0.496, 0.630, 0.764];
    choiceStepU = numChoices === 4 ? 0.0242 : numChoices === 5 ? 0.0192 : 0.0158;
    bubbleRadius = (numChoices === 4 ? 9.0 : numChoices === 5 ? 7.8 : 6.8) / CANVAS_W;
    startV = 0.278;
    stepV = 0.0275;
    blockGapV = 0.009;
  } else {
    // 100 items: 4 columns x 25 rows (1-25, 26-50, 51-75, 76-100)
    rowsPerColumn = 25;
    columnStartUs = [0.362, 0.496, 0.630, 0.764];
    choiceStepU = numChoices === 4 ? 0.0242 : numChoices === 5 ? 0.0192 : 0.0158;
    bubbleRadius = (numChoices === 4 ? 8.6 : numChoices === 5 ? 7.5 : 6.6) / CANVAS_W;
    startV = 0.274;
    stepV = 0.0232;
    blockGapV = 0.0075;
  }

  const { choiceLabels, columnHeaders, questions, timingMarks } = buildAnswerZoneGeometry({
    totalItems: tier,
    numChoices,
    rowsPerColumn,
    columnStartUs,
    choiceStepU,
    bubbleRadius,
    headerV,
    startV,
    stepV,
    blockGapV,
    rightTimingBarU
  });

  const codeSuffix = numChoices === 4 ? `${tier}` : `${tier}-${numChoices}C`;

  return {
    code: `KP-OMR-A4-${codeSuffix}`,
    version: 11,
    canonicalWidth: CANVAS_W,
    canonicalHeight: CANVAS_H,
    scanZoneAspectRatio: 0.6761, // Full-page A4 fiducial frame (870px / 1286.7px)
    totalItems: tier,
    numChoices,
    choiceLabels,
    rowsPerColumn,
    numColumns: columnStartUs.length,
    fiducialMarkers: createFullPageFiducialMarkers(),
    studentIdMatrix: createStudentIdMatrix(),
    seatNoMatrix: createSeatNoMatrix(),
    versionMatrix: createVersionMatrix(),
    columnHeaders,
    questions,
    timingMarks,
    subjectiveScoreMatrix: null
  };
}

export const OMR_TEMPLATE_20: OmrTemplateGeometry = buildOmrTemplateGeometry(20, 4);
export const OMR_TEMPLATE_40: OmrTemplateGeometry = buildOmrTemplateGeometry(40, 4);
export const OMR_TEMPLATE_60: OmrTemplateGeometry = buildOmrTemplateGeometry(60, 4);
export const OMR_TEMPLATE_80: OmrTemplateGeometry = buildOmrTemplateGeometry(80, 4);
export const OMR_TEMPLATE_100: OmrTemplateGeometry = buildOmrTemplateGeometry(100, 4);

/**
 * Helper to select the appropriate geometry template based on totalItems and numChoices (4, 5, 6)
 */
export function getTemplateGeometry(
  totalItems: number,
  numChoices: ChoiceCount = 4
): OmrTemplateGeometry {
  if (numChoices === 4) {
    if (totalItems <= 20) return OMR_TEMPLATE_20;
    if (totalItems <= 40) return OMR_TEMPLATE_40;
    if (totalItems <= 60) return OMR_TEMPLATE_60;
    if (totalItems <= 80) return OMR_TEMPLATE_80;
    return OMR_TEMPLATE_100;
  }
  return buildOmrTemplateGeometry(totalItems, numChoices);
}

/**
 * Converts OmrTemplateGeometry into TemplateGridMetadata for `omrEngine.ts` and DB persistence
 */
export function convertGeometryToGridMetadata(geom: OmrTemplateGeometry): TemplateGridMetadata {
  const digits: StudentIdDigitCoordinate[] = [];
  for (const col of geom.studentIdMatrix) {
    for (let d = 0; d <= 9; d++) {
      const b = col.digits[d];
      digits.push({
        digitIndex: col.columnIndex,
        value: d,
        u: b.u,
        v: b.v,
        radius: b.radius
      });
    }
  }

  const seatDigits: StudentIdDigitCoordinate[] = [];
  for (const col of geom.seatNoMatrix) {
    for (let d = 0; d <= 9; d++) {
      const b = col.digits[d];
      seatDigits.push({
        digitIndex: col.columnIndex,
        value: d,
        u: b.u,
        v: b.v,
        radius: b.radius
      });
    }
  }

  const versions: VersionCodeCoordinate[] = Object.entries(geom.versionMatrix.bubbles).map(
    ([code, b]) => ({
      versionCode: code,
      u: b.u,
      v: b.v,
      radius: b.radius
    })
  );

  const questionBlocks: QuestionCoordinate[] = geom.questions.map(q => ({
    itemNo: q.itemNo,
    bubbles: geom.choiceLabels.map(choice => {
      const coord = q.choices[choice]!;
      return {
        choice,
        u: coord.u,
        v: coord.v,
        radius: coord.radius
      };
    })
  }));

  const timingMarks: EngineTimingMark[] = geom.timingMarks.map(tm => ({
    rowIndex: tm.rowIndex,
    colIndex: tm.columnIndex,
    u: tm.u,
    v: tm.v,
    size: tm.width
  }));

  return {
    canvasWidth: geom.canonicalWidth,
    canvasHeight: geom.canonicalHeight,
    fiducialMarkers: geom.fiducialMarkers,
    studentIdGrid: {
      digitsCount: 5,
      digits
    },
    seatNoGrid: {
      digitsCount: 2,
      digits: seatDigits
    },
    versionCodeGrid: {
      versions
    },
    subjectiveScores: [],
    timingMarks,
    questionBlocks,
    choiceCount: geom.numChoices,
    rowsPerColumn: geom.rowsPerColumn,
    scanZoneAspectRatio: geom.scanZoneAspectRatio
  };
}

export function generate20ItemGridMetadata(numChoices: ChoiceCount = 4): TemplateGridMetadata {
  return convertGeometryToGridMetadata(getTemplateGeometry(20, numChoices));
}

export function generate40ItemGridMetadata(numChoices: ChoiceCount = 4): TemplateGridMetadata {
  return convertGeometryToGridMetadata(getTemplateGeometry(40, numChoices));
}

export function generate50ItemGridMetadata(numChoices: ChoiceCount = 4): TemplateGridMetadata {
  const meta = convertGeometryToGridMetadata(getTemplateGeometry(60, numChoices));
  meta.questionBlocks = meta.questionBlocks.slice(0, 50);
  return meta;
}

export function generate60ItemGridMetadata(numChoices: ChoiceCount = 4): TemplateGridMetadata {
  return convertGeometryToGridMetadata(getTemplateGeometry(60, numChoices));
}

export function generate75ItemGridMetadata(numChoices: ChoiceCount = 4): TemplateGridMetadata {
  const meta = convertGeometryToGridMetadata(getTemplateGeometry(80, numChoices));
  meta.questionBlocks = meta.questionBlocks.slice(0, 75);
  return meta;
}

export function generate80ItemGridMetadata(numChoices: ChoiceCount = 4): TemplateGridMetadata {
  return convertGeometryToGridMetadata(getTemplateGeometry(80, numChoices));
}

export function generate100ItemGridMetadata(numChoices: ChoiceCount = 4): TemplateGridMetadata {
  return convertGeometryToGridMetadata(getTemplateGeometry(100, numChoices));
}

export function getTemplateGridForItems(
  totalItems: number,
  numChoices: ChoiceCount = 4
): TemplateGridMetadata {
  if (totalItems <= 20) return generate20ItemGridMetadata(numChoices);
  if (totalItems <= 40) return generate40ItemGridMetadata(numChoices);
  if (totalItems <= 50) return generate50ItemGridMetadata(numChoices);
  if (totalItems <= 60) return generate60ItemGridMetadata(numChoices);
  if (totalItems <= 75) return generate75ItemGridMetadata(numChoices);
  if (totalItems <= 80) return generate80ItemGridMetadata(numChoices);
  return generate100ItemGridMetadata(numChoices);
}
