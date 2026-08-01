export interface DomainEvent<T = any> {
  readonly eventId: string;
  readonly eventName: string;
  readonly version: number;
  readonly occurredOn: Date;
  readonly payload: T;
}
