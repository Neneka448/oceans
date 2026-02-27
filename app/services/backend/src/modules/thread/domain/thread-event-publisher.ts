import type { ThreadDomainEvent } from "./thread-events.js";

export interface ThreadEventPublisher {
  publish(event: ThreadDomainEvent): void;
}

