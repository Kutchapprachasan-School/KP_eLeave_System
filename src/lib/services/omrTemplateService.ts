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

/**
 * Ensure standard templates exist in the database (20, 40, 60, 80, 100)
 */
export async function ensureStandardTemplatesAction() {
  const templates = [
    {
      code: "KP-OMR-A4-100",
      version: 1,
      name: "แบบฟอร์มกระดาษคำตอบ 100 ข้อ มาตรฐาน 2569 (5 คอลัมน์ x 20)",
      sheetType: ExamSheetType.SHEET_100_ITEMS,
      canvasWidth: 1654,
      canvasHeight: 2339,
      gridMetadata: generate100ItemGridMetadata() as any,
      calibrationDefaults: DEFAULT_CALIBRATION_PARAMS
    },
    {
      code: "KP-OMR-A4-80",
      version: 1,
      name: "แบบฟอร์มกระดาษคำตอบ 80 ข้อ มาตรฐาน 2569 (4 คอลัมน์ x 20)",
      sheetType: ExamSheetType.CUSTOM,
      canvasWidth: 1654,
      canvasHeight: 2339,
      gridMetadata: generate80ItemGridMetadata() as any,
      calibrationDefaults: DEFAULT_CALIBRATION_PARAMS
    },
    {
      code: "KP-OMR-A4-60",
      version: 1,
      name: "แบบฟอร์มกระดาษคำตอบ 60 ข้อ มาตรฐาน 2569 (3 คอลัมน์ x 20)",
      sheetType: ExamSheetType.CUSTOM,
      canvasWidth: 1654,
      canvasHeight: 2339,
      gridMetadata: generate60ItemGridMetadata() as any,
      calibrationDefaults: DEFAULT_CALIBRATION_PARAMS
    },
    {
      code: "KP-OMR-A4-40",
      version: 1,
      name: "แบบฟอร์มกระดาษคำตอบ 40 ข้อ มาตรฐาน 2569 (2 คอลัมน์ x 20)",
      sheetType: ExamSheetType.CUSTOM,
      canvasWidth: 1654,
      canvasHeight: 2339,
      gridMetadata: generate40ItemGridMetadata() as any,
      calibrationDefaults: DEFAULT_CALIBRATION_PARAMS
    },
    {
      code: "KP-OMR-A4-20",
      version: 1,
      name: "แบบฟอร์มกระดาษคำตอบ 20 ข้อ มาตรฐาน 2569 (2 คอลัมน์ x 10)",
      sheetType: ExamSheetType.SHEET_20_ITEMS,
      canvasWidth: 1654,
      canvasHeight: 2339,
      gridMetadata: generate20ItemGridMetadata() as any,
      calibrationDefaults: DEFAULT_CALIBRATION_PARAMS
    },
    // Legacy support
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
      code: "KP-OMR-A4-75",
      version: 1,
      name: "แบบฟอร์มกระดาษคำตอบ 75 ข้อ มาตรฐาน 2569",
      sheetType: ExamSheetType.SHEET_75_ITEMS,
      canvasWidth: 1654,
      canvasHeight: 2339,
      gridMetadata: generate75ItemGridMetadata() as any,
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
