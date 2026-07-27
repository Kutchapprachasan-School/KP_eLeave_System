import { z } from "zod";
import { Prisma } from "@prisma/client";

export const SupervisionCompletedEventPayloadSchema = z.object({
  sessionId: z.string().cuid(),
  teacherId: z.string(),
  directorId: z.string(),
  finalScore: z.number().min(1).max(5),
  completedAt: z.string().datetime(),
});

export type SupervisionCompletedEventPayload = z.infer<
  typeof SupervisionCompletedEventPayloadSchema
>;

export type OutboxEventType = "SUPERVISION_COMPLETED";

export function parseOutboxPayloadToPrismaJson(
  eventType: OutboxEventType,
  payload: unknown
): Prisma.InputJsonValue {
  switch (eventType) {
    case "SUPERVISION_COMPLETED": {
      const validated = SupervisionCompletedEventPayloadSchema.parse(payload);
      return validated as unknown as Prisma.InputJsonValue;
    }
    default: {
      const _exhaustiveCheck: never = eventType;
      throw new Error(`Unsupported Outbox Event Type: ${_exhaustiveCheck}`);
    }
  }
}
