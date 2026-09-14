import { prisma } from "../db.ts";
import { ExamSheetType } from "@prisma/client";
import {
  generate50ItemGridMetadata,
  generate20ItemGridMetadata,
  DEFAULT_CALIBRATION_PARAMS,
} from "../omr/omrTemplateGrid.ts";

export * from "../omr/omrTemplateGrid.ts";


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
