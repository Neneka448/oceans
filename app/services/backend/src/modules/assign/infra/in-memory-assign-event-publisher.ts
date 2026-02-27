import type { AssignEventPublisher } from "../application/assign-event-publisher.js";
import type { AssignDomainEvent } from "../domain/assign-domain-event.js";

export class InMemoryAssignEventPublisher implements AssignEventPublisher {
  private readonly events: AssignDomainEvent[] = [];

  publish(event: AssignDomainEvent): void {
    this.events.push(event);
  }

  list(): AssignDomainEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events.length = 0;
  }
}
