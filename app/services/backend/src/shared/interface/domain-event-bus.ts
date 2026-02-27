export type DomainEventPayload = Record<string, unknown>;

export type DomainEvent = {
  name: string;
  payload: DomainEventPayload;
};

export type DomainEventHandler = (event: DomainEvent) => void;

export interface DomainEventBus {
  publish(event: DomainEvent): void;
  subscribe(eventName: string, handler: DomainEventHandler): () => void;
}

export class InMemoryDomainEventBus implements DomainEventBus {
  private readonly handlers = new Map<string, Set<DomainEventHandler>>();

  publish(event: DomainEvent): void {
    const scopedHandlers = this.handlers.get(event.name);

    if (!scopedHandlers) {
      return;
    }

    for (const handler of scopedHandlers) {
      handler(event);
    }
  }

  subscribe(eventName: string, handler: DomainEventHandler): () => void {
    const scopedHandlers = this.handlers.get(eventName) ?? new Set<DomainEventHandler>();
    scopedHandlers.add(handler);
    this.handlers.set(eventName, scopedHandlers);

    return () => {
      const nextHandlers = this.handlers.get(eventName);

      if (!nextHandlers) {
        return;
      }

      nextHandlers.delete(handler);

      if (nextHandlers.size === 0) {
        this.handlers.delete(eventName);
      }
    };
  }
}
