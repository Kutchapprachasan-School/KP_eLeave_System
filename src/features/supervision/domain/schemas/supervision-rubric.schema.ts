import { z } from "zod";
import { Prisma } from "@prisma/client";

export const RubricDimensionSchema = z.object({
  dimensionId: z.string(),
  dimensionName: z.string(),
  score: z.number().min(1, "คะแนนต่ำสุดคือ 1").max(5, "คะแนนสูงสุดคือ 5"),
  maxScore: z.number().default(5),
  comment: z.string().optional(),
});

export const SupervisionRubricPayloadSchema = z.object({
  dimensions: z.array(RubricDimensionSchema).min(1, "ต้องมีเกณฑ์การประเมินอย่างน้อย 1 ข้อ"),
  calculatedAverage: z.number().min(1).max(5),
});

export type SupervisionRubricPayload = z.infer<typeof SupervisionRubricPayloadSchema>;

export function parseRubricToPrismaJson(data: unknown): Prisma.InputJsonValue {
  const validatedPayload = SupervisionRubricPayloadSchema.parse(data);
  return validatedPayload as unknown as Prisma.InputJsonValue;
}
