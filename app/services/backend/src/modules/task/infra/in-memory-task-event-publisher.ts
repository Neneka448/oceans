import type { TaskEventPublisher } from "../application/task-event-publisher.js";
import type { TaskDomainEvent } from "../domain/task-domain-event.js";

export class InMemoryTaskEventPublisher implements TaskEventPublisher {
  private readonly events: TaskDomainEvent[] = [];

  publish(event: TaskDomainEvent): void {
    this.events.push(event);
  }

  list(): TaskDomainEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events.length = 0;
  }
}
