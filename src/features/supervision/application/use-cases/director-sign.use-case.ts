import { PrismaClient, SupervisionStatus } from "@prisma/client";
import { generateAdvisoryLockKey } from "@/core/infrastructure/db/advisory-lock";
import { parseOutboxPayloadToPrismaJson } from "../../domain/schemas/outbox-event.schema";

export interface DirectorSignCommand {
  sessionId: string;
  directorId: string;
  directorComment?: string;
}

export class DirectorSignUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(command: DirectorSignCommand): Promise<{ success: boolean; sessionId: string }> {
    return await this.prisma.$transaction(async (tx) => {
      // 🔒 1. Advisory Lock เพื่อป้องกัน Race Condition
      const lockKey = generateAdvisoryLockKey(`supervision:session:${command.sessionId}`);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

      // 🔍 2. Fetch & Validate State Sequence
      const session = await tx.supervisionSession.findUnique({
        where: { id: command.sessionId },
      });

      if (!session) throw new Error("Supervision session not found");
      if (session.status !== SupervisionStatus.WAITING_DIRECTOR_SIGN) {
        throw new Error("Session is not in WAITING_DIRECTOR_SIGN status");
      }

      // 📝 3. Update Session Status -> COMPLETED
      const updatedSession = await tx.supervisionSession.update({
        where: { id: command.sessionId },
        data: {
          status: SupervisionStatus.COMPLETED,
          directorSignedBy: command.directorId,
          directorSignedAt: new Date(),
          directorComment: command.directorComment,
        },
      });

      // 🛡️ 4. In-Transaction Audit Log
      await tx.supervisionAuditLog.create({
        data: {
          sessionId: updatedSession.id,
          actionBy: command.directorId,
          actionType: "DIRECTOR_SIGN",
          reason: command.directorComment ?? "ลงนามเห็นชอบผลการนิเทศเรียบร้อยแล้ว",
        },
      });

      // 📦 5. Guaranteed Transactional Outbox Record
      const validatedPayload = parseOutboxPayloadToPrismaJson("SUPERVISION_COMPLETED", {
        sessionId: updatedSession.id,
        teacherId: updatedSession.teacherId,
        directorId: command.directorId,
        finalScore: updatedSession.totalScore ?? 0,
        completedAt: new Date().toISOString(),
      });

      await tx.outboxEvent.create({
        data: {
          aggregateType: "SUPERVISION_SESSION",
          aggregateId: updatedSession.id,
          eventType: "SUPERVISION_COMPLETED",
          payload: validatedPayload,
          status: "PENDING",
          retryCount: 0,
        },
      });

      return { success: true, sessionId: updatedSession.id };
    });
  }
}
