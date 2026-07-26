import { PrismaClient } from "@prisma/client";
import { EventPublisher } from "@/core/application/event-publisher";
import { DocumentActionSubmittedEvent } from "../../domain/events/document-action-submitted.event";

export interface CreateExecutiveDirectiveCommand {
  incomingDocId: string;
  assignedById: string;
  assigneeId: string;
  assigneeName: string;
  standardDirective?: string;
  directiveText?: string;
  signatureUrl?: string;
  dueDate?: Date;
}

export class CreateExecutiveDirectiveUseCase {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventPublisher: EventPublisher
  ) {}

  async execute(command: CreateExecutiveDirectiveCommand): Promise<string> {
    const pendingEvents: DocumentActionSubmittedEvent[] = [];
    let routingId = "";

    await this.prisma.$transaction(async (tx) => {
      const doc = await tx.incomingDocument.findUnique({
        where: { id: command.incomingDocId },
      });

      if (!doc) throw new Error("Incoming document not found");

      // Create routing step
      const createdRouting = await tx.documentRouting.create({
        data: {
          incomingDocId: command.incomingDocId,
          assignedById: command.assignedById,
          assigneeId: command.assigneeId,
          assigneeName: command.assigneeName,
          standardDirective: command.standardDirective,
          directiveText: command.directiveText,
          signatureUrl: command.signatureUrl,
          dueDate: command.dueDate,
          status: "PENDING",
        },
      });

      // Update doc status to ROUTING
      await tx.incomingDocument.update({
        where: { id: command.incomingDocId },
        data: { status: "ROUTING" },
      });

      routingId = createdRouting.id;

      pendingEvents.push(
        new DocumentActionSubmittedEvent({
          routingId: createdRouting.id,
          documentTitle: doc.title,
          assigneeName: command.assigneeName,
          status: "PENDING",
          reportText: command.directiveText || command.standardDirective,
        })
      );
    });

    for (const event of pendingEvents) {
      await this.eventPublisher.publish(event).catch((err) => {
        console.error(`[Post-Commit Dispatch Error] Event ${event.eventName} failed:`, err);
      });
    }

    return routingId;
  }
}
