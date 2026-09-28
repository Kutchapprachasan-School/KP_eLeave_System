import { prisma } from "../db.ts";
import { ExamSheetType } from "@prisma/client";
import {
  generate100ItemGridMetadata,
  generate80ItemGridMetadata,
  generate60ItemGridMetadata,
  generate40ItemGridMetadata,
  generate20ItemGridMetadata,
  generate75ItemGridMetadata,
  generate50ItemGridMetadata,
  DEFAULT_CALIBRATION_PARAMS
} from "../omr/omrTemplateGeometry.ts";

export * from "../omr/omrTemplateGeometry.ts";

export function resolvePaperChoiceCount(paper: any): 4 | 5 | 6 {
  if (paper?.choiceCount === 5 || paper?.choiceCount === 6) {
    return paper.choiceCount;
  }
  const tplCode = String(paper?.template?.code || "");
  if (tplCode.endsWith("-6C")) return 6;
  if (tplCode.endsWith("-5C")) return 5;
  const metaChoiceCount = paper?.template?.gridMetadata?.choiceCount;
  if (metaChoiceCount === 6) return 6;
  if (metaChoiceCount === 5) return 5;

  // Fallback: inspect answer keys if present
  const keys = paper?.answerKeys || [];
  for (const k of keys) {
    for (const item of k?.items || []) {
      if (Array.isArray(item.correctChoices)) {
        if (item.correctChoices.includes("F")) return 6;
        if (item.correctChoices.includes("E")) return 5;
      }
    }
  }
  return 4;
}

/**
 * Ensure standard templates exist in the database (20, 40, 60, 80, 100 for 4/5/6 choices)
 */
export async function ensureStandardTemplatesAction() {
  const choiceVariants: Array<4 | 5 | 6> = [4, 5, 6];
  const templates: Array<{
    code: string;
    version: number;
    name: string;
    sheetType: ExamSheetType;
    canvasWidth: number;
    canvasHeight: number;
    gridMetadata: any;
    calibrationDefaults: any;
  }> = [];

  for (const cc of choiceVariants) {
    const suffix = cc === 4 ? "" : `-${cc}C`;
    const ccLabel = cc === 4 ? "4 ตัวเลือก ก-ง" : cc === 5 ? "5 ตัวเลือก ก-จ" : "6 ตัวเลือก ก-ฉ";
    templates.push(
      {
        code: `KP-OMR-A4-100${suffix}`,
        version: 1,
        name: `แบบฟอร์มกระดาษคำตอบ 100 ข้อ (${ccLabel})`,
        sheetType: ExamSheetType.SHEET_100_ITEMS,
        canvasWidth: 1654,
        canvasHeight: 2339,
        gridMetadata: { ...generate100ItemGridMetadata(cc), choiceCount: cc } as any,
        calibrationDefaults: DEFAULT_CALIBRATION_PARAMS
      },
      {
        code: `KP-OMR-A4-80${suffix}`,
        version: 1,
        name: `แบบฟอร์มกระดาษคำตอบ 80 ข้อ (${ccLabel})`,
        sheetType: ExamSheetType.CUSTOM,
        canvasWidth: 1654,
        canvasHeight: 2339,
        gridMetadata: { ...generate80ItemGridMetadata(cc), choiceCount: cc } as any,
        calibrationDefaults: DEFAULT_CALIBRATION_PARAMS
      },
      {
        code: `KP-OMR-A4-60${suffix}`,
        version: 1,
        name: `แบบฟอร์มกระดาษคำตอบ 60 ข้อ (${ccLabel})`,
        sheetType: ExamSheetType.CUSTOM,
        canvasWidth: 1654,
        canvasHeight: 2339,
        gridMetadata: { ...generate60ItemGridMetadata(cc), choiceCount: cc } as any,
        calibrationDefaults: DEFAULT_CALIBRATION_PARAMS
      },
      {
        code: `KP-OMR-A4-40${suffix}`,
        version: 1,
        name: `แบบฟอร์มกระดาษคำตอบ 40 ข้อ (${ccLabel})`,
        sheetType: ExamSheetType.CUSTOM,
        canvasWidth: 1654,
        canvasHeight: 2339,
        gridMetadata: { ...generate40ItemGridMetadata(cc), choiceCount: cc } as any,
        calibrationDefaults: DEFAULT_CALIBRATION_PARAMS
      },
      {
        code: `KP-OMR-A4-20${suffix}`,
        version: 1,
        name: `แบบฟอร์มกระดาษคำตอบ 20 ข้อ (${ccLabel})`,
        sheetType: ExamSheetType.SHEET_20_ITEMS,
        canvasWidth: 1654,
        canvasHeight: 2339,
        gridMetadata: { ...generate20ItemGridMetadata(cc), choiceCount: cc } as any,
        calibrationDefaults: DEFAULT_CALIBRATION_PARAMS
      }
    );
  }

  // Legacy support
  templates.push(
    {
      code: "KP-OMR-A4-50",
      version: 1,
      name: "แบบฟอร์มกระดาษคำตอบ 50 ข้อ มาตรฐาน 2569",
      sheetType: ExamSheetType.SHEET_50_ITEMS,
      canvasWidth: 1654,
      canvasHeight: 2339,
      gridMetadata: { ...generate50ItemGridMetadata(), choiceCount: 4 } as any,
      calibrationDefaults: DEFAULT_CALIBRATION_PARAMS
    },
    {
      code: "KP-OMR-A4-75",
      version: 1,
      name: "แบบฟอร์มกระดาษคำตอบ 75 ข้อ มาตรฐาน 2569",
      sheetType: ExamSheetType.SHEET_75_ITEMS,
      canvasWidth: 1654,
      canvasHeight: 2339,
      gridMetadata: { ...generate75ItemGridMetadata(), choiceCount: 4 } as any,
      calibrationDefaults: DEFAULT_CALIBRATION_PARAMS
    }
  );

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
