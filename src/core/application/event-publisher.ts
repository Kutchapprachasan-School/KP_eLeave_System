import { DomainEvent } from "../domain/domain-event";

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
}
