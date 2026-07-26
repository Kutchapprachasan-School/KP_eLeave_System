import { DomainEvent } from "@/core/domain/domain-event";

export interface DocumentActionPayload {
  routingId: string;
  documentTitle: string;
  assigneeName: string;
  status: string;
  reportText?: string;
}

export class DocumentActionSubmittedEvent implements DomainEvent<DocumentActionPayload> {
  readonly eventId: string = crypto.randomUUID();
  readonly eventName = "DocumentActionSubmitted";
  readonly version = 1;
  readonly occurredOn = new Date();

  constructor(public readonly payload: DocumentActionPayload) {}
}
