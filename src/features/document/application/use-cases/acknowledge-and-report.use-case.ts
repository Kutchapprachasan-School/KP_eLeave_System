import { PrismaClient } from "@prisma/client";
import { EventPublisher } from "@/core/application/event-publisher";
import { DocumentActionSubmittedEvent } from "../../domain/events/document-action-submitted.event";

export interface AcknowledgeAndReportCommand {
  routingId: string;
  userId: string;
  actionReport?: string;
  actionAttachmentUrl?: string;
}

export class AcknowledgeAndReportUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventPublisher: EventPublisher
  ) {}

  async execute(command: AcknowledgeAndReportCommand): Promise<void> {
    // 🟢 1. Events Collector สำหรับยิงนอก Transaction
    const pendingEvents: DocumentActionSubmittedEvent[] = [];

    // 🟢 2. Atomic Database Transaction Boundary
    await this.prisma.$transaction(async (tx) => {
      const routing = await tx.documentRouting.findUnique({
        where: { id: command.routingId },
        include: { incomingDoc: true },
      });

      if (!routing) throw new Error("Document routing record not found");

      const isReporting = Boolean(command.actionReport || command.actionAttachmentUrl);
      const newStatus = isReporting ? "COMPLETED" : "ACKNOWLEDGED";
      const now = new Date();

      const updatedRouting = await tx.documentRouting.update({
        where: { id: command.routingId },
        data: {
          status: newStatus,
          acknowledgedAt: routing.acknowledgedAt ?? now,
          actionReport: command.actionReport ?? routing.actionReport,
          actionAttachmentUrl: command.actionAttachmentUrl ?? routing.actionAttachmentUrl,
          completedAt: isReporting ? now : routing.completedAt,
        },
      });

      // ฝาก Event ลงใน Collector (ยังไม่ยิง Side-effect จนกว่า DB จะ Commit)
      pendingEvents.push(
        new DocumentActionSubmittedEvent({
          routingId: updatedRouting.id,
          documentTitle: routing.incomingDoc?.title || "หนังสือรับ",
          assigneeName: routing.assigneeName || "ผู้รับผิดชอบ",
          status: newStatus,
          reportText: command.actionReport,
        })
      );
    }); // 🔒 DB Transaction Finished Here

    // 🟢 3. Post-Commit Side-Effect Execution (LINE Notify / Background Worker)
    for (const event of pendingEvents) {
      await this.eventPublisher.publish(event).catch((err) => {
        console.error(`[Post-Commit Dispatch Error] Event ${event.eventName} failed:`, err);
      });
    }
  }
}
