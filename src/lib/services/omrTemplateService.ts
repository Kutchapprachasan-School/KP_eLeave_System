import { prisma } from "../db.ts";
import { ExamSheetType } from "@prisma/client";

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
}

export const DEFAULT_CALIBRATION_PARAMS = {
  minContrast: 80,
  targetMargin: 0.25,
  confidenceTiers: {
    high: 0.85,
    medium: 0.65
  },
  iqgTolerances: {
    blurVarianceMin: 110.0,
    glareMaxPercentage: 2.0,
    curvatureMaxPercentage: 3.5,
    aspectRatioTolerance: 0.12
  }
};

/**
 * Generate normalized coordinate grid for 50-Item Standard Sheet (2 columns of 25)
 * Canonical Canvas: 1654 x 2339 px (A4 @ 200 DPI)
 */
export function generate50ItemGridMetadata(): TemplateGridMetadata {
  const canvasWidth = 1654;
  const canvasHeight = 2339;

  // Fiducial Markers (12mm x 12mm approx 94px at 200DPI)
  // Margins: 60px from edges
  const markerW = 94 / canvasWidth;
  const markerH = 94 / canvasHeight;
  const marginX = 60 / canvasWidth;
  const marginY = 60 / canvasHeight;

  // Student ID: 5 digits (0-4), 10 rows (0-9)
  // Located at top-left below header: u = 0.08 to 0.38, v = 0.14 to 0.28
  const studentDigits: StudentIdDigitCoordinate[] = [];
  const idStartU = 0.10;
  const idStartV = 0.145;
  const idStepU = 0.045;
  const idStepV = 0.013;
  const bubbleR = 12 / canvasWidth;

  for (let digit = 0; digit < 5; digit++) {
    for (let val = 0; val <= 9; val++) {
      studentDigits.push({
        digitIndex: digit,
        value: val,
        u: idStartU + digit * idStepU,
        v: idStartV + val * idStepV,
        radius: bubbleR
      });
    }
  }

  // Version Codes: 4 versions (01, 02, 03, 04)
  // Located next to student ID: u = 0.40 to 0.55, v = 0.16 to 0.22
  const versions: VersionCodeCoordinate[] = [
    { versionCode: "01", u: 0.42, v: 0.17, radius: bubbleR },
    { versionCode: "02", u: 0.46, v: 0.17, radius: bubbleR },
    { versionCode: "03", u: 0.50, v: 0.17, radius: bubbleR },
    { versionCode: "04", u: 0.54, v: 0.17, radius: bubbleR }
  ];

  // Question Blocks: 50 Questions (2 columns of 25)
  // Column 1: Items 1 - 25 (u = 0.08 to 0.48, v = 0.32 to 0.92)
  // Column 2: Items 26 - 50 (u = 0.52 to 0.92, v = 0.32 to 0.92)
  const questionBlocks: QuestionCoordinate[] = [];
  const choices = ["A", "B", "C", "D"];
  const choiceStepU = 0.055;
  const rowStepV = 0.024;
  const startV = 0.325;

  // Col 1: 1..25
  for (let i = 1; i <= 25; i++) {
    const rowIdx = i - 1;
    const v = startV + rowIdx * rowStepV;
    const bubbles: BubbleCoordinate[] = choices.map((c, cIdx) => ({
      choice: c,
      u: 0.18 + cIdx * choiceStepU,
      v,
      radius: bubbleR
    }));
    questionBlocks.push({ itemNo: i, bubbles });
  }

  // Col 2: 26..50
  for (let i = 26; i <= 50; i++) {
    const rowIdx = i - 26;
    const v = startV + rowIdx * rowStepV;
    const bubbles: BubbleCoordinate[] = choices.map((c, cIdx) => ({
      choice: c,
      u: 0.62 + cIdx * choiceStepU,
      v,
      radius: bubbleR
    }));
    questionBlocks.push({ itemNo: i, bubbles });
  }

  return {
    canvasWidth,
    canvasHeight,
    fiducialMarkers: {
      topLeft: { u: marginX, v: marginY, width: markerW, height: markerH },
      topRight: { u: 1.0 - marginX - markerW, v: marginY, width: markerW, height: markerH },
      bottomLeft: { u: marginX, v: 1.0 - marginY - markerH, width: markerW, height: markerH },
      bottomRight: { u: 1.0 - marginX - markerW, v: 1.0 - marginY - markerH, width: markerW, height: markerH }
    },
    qrCodeAnchor: {
      u: 0.82,
      v: 0.04,
      size: 130 / canvasWidth
    },
    studentIdGrid: {
      digitsCount: 5,
      digits: studentDigits
    },
    versionCodeGrid: {
      versions
    },
    questionBlocks
  };
}

/**
 * Generate normalized coordinate grid for 20-Item Standard Sheet (1 column of 20)
 */
export function generate20ItemGridMetadata(): TemplateGridMetadata {
  const metadata = generate50ItemGridMetadata();
  // Filter only items 1 to 20
  const choices = ["A", "B", "C", "D"];
  const choiceStepU = 0.07;
  const rowStepV = 0.028;
  const startV = 0.32;
  const bubbleR = 14 / metadata.canvasWidth;

  const questionBlocks: QuestionCoordinate[] = [];
  for (let i = 1; i <= 20; i++) {
    const rowIdx = i - 1;
    const v = startV + rowIdx * rowStepV;
    const bubbles: BubbleCoordinate[] = choices.map((c, cIdx) => ({
      choice: c,
      u: 0.38 + cIdx * choiceStepU,
      v,
      radius: bubbleR
    }));
    questionBlocks.push({ itemNo: i, bubbles });
  }

  return {
    ...metadata,
    questionBlocks
  };
}

/**
 * Ensure standard templates exist in the database
 */
export async function ensureStandardTemplatesAction() {
  const templates = [
    {
      code: "KP-OMR-A4-50",
      version: 1,
      name: "แบบฟอร์มกระดาษคำตอบ 50 ข้อ มาตรฐาน 2569",
      sheetType: ExamSheetType.SHEET_50_ITEMS,
      canvasWidth: 1654,
      canvasHeight: 2339,
      gridMetadata: generate50ItemGridMetadata() as any,
      calibrationDefaults: DEFAULT_CALIBRATION_PARAMS
    },
    {
      code: "KP-OMR-A4-20",
      version: 1,
      name: "แบบฟอร์มกระดาษคำตอบ 20 ข้อ มาตรฐาน 2569",
      sheetType: ExamSheetType.SHEET_20_ITEMS,
      canvasWidth: 1654,
      canvasHeight: 2339,
      gridMetadata: generate20ItemGridMetadata() as any,
      calibrationDefaults: DEFAULT_CALIBRATION_PARAMS
    }
  ];

  for (const t of templates) {
    await prisma.examTemplate.upsert({
      where: {
        code_version: {
          code: t.code,
          version: t.version
        }
      },
      update: {
        name: t.name,
        gridMetadata: t.gridMetadata,
        calibrationDefaults: t.calibrationDefaults
      },
      create: {
        code: t.code,
        version: t.version,
        name: t.name,
        sheetType: t.sheetType,
        canvasWidth: t.canvasWidth,
        canvasHeight: t.canvasHeight,
        gridMetadata: t.gridMetadata,
        calibrationDefaults: t.calibrationDefaults
      }
    });
  }

  return await prisma.examTemplate.findMany({
    where: { isDeprecated: false }
  });
}
