import type { ThreadEventPublisher } from "../domain/thread-event-publisher.js";
import type { ThreadDomainEvent } from "../domain/thread-events.js";

export class InMemoryThreadEventPublisher implements ThreadEventPublisher {
  private readonly events: ThreadDomainEvent[] = [];

  publish(event: ThreadDomainEvent): void {
    this.events.push(event);
  }

  list(): ThreadDomainEvent[] {
    return [...this.events];
  }
}

