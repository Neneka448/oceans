import type { AssignDomainEvent } from "../domain/assign-domain-event.js";

export interface AssignEventPublisher {
  publish(event: AssignDomainEvent): void;
}
