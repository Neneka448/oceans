import type { TaskDomainEvent } from "../domain/task-domain-event.js";

export interface TaskEventPublisher {
  publish(event: TaskDomainEvent): void;
}
