import { DomainEvent } from "../domain/domain-event";
import { EventPublisher } from "../application/event-publisher";

export class InMemoryEventBus implements EventPublisher {
  async publish(event: DomainEvent): Promise<void> {
    console.log(`[EventBus] Domain Event Published: ${event.eventName}`, event.payload);
  }
}

export const eventPublisher = new InMemoryEventBus();
