import type { DomainEvent, DomainEventBus } from "../../../shared/interface/domain-event-bus.js";
import { EventDispatchAppService } from "./event-dispatch-app-service.js";

const readString = (value: unknown): string | null => {
  return typeof value === "string" && value.length > 0 ? value : null;
};

const hasPayloadField = (event: DomainEvent, key: string): string | null => {
  return readString(event.payload[key]);
};

export class DomainEventListener {
  private readonly unsubscribers: Array<() => void> = [];

  constructor(
    private readonly domainEventBus: DomainEventBus,
    private readonly eventDispatchAppService: EventDispatchAppService
  ) {}

  start(): void {
    this.unsubscribers.push(
      this.domainEventBus.subscribe("NotificationCreated", (event) => {
        const recipientId = hasPayloadField(event, "recipient_id");

        if (!recipientId) {
          return;
        }

        this.eventDispatchAppService.dispatchToUser("notification.new", recipientId, event.payload);
      })
    );

    this.unsubscribers.push(
      this.domainEventBus.subscribe("MessageCreated", (event) => {
        const recipientId = hasPayloadField(event, "recipient_id");

        if (!recipientId) {
          return;
        }

        this.eventDispatchAppService.dispatchToUser("message.new", recipientId, event.payload);
      })
    );

    this.unsubscribers.push(
      this.domainEventBus.subscribe("ReplyAdded", (event) => {
        const threadId = hasPayloadField(event, "thread_id");

        if (!threadId) {
          return;
        }

        this.eventDispatchAppService.dispatch("thread.replied", `thread:${threadId}`, event.payload);
      })
    );

    this.unsubscribers.push(
      this.domainEventBus.subscribe("TaskUpdated", (event) => {
        const taskId = hasPayloadField(event, "task_id");

        if (!taskId) {
          return;
        }

        this.eventDispatchAppService.dispatch("task.updated", `task:${taskId}`, event.payload);
      })
    );

    this.unsubscribers.push(
      this.domainEventBus.subscribe("AssignReviewed", (event) => {
        const applicantId = hasPayloadField(event, "applicant_id");

        if (!applicantId) {
          return;
        }

        this.eventDispatchAppService.dispatchToUser("assign.reviewed", applicantId, event.payload);
      })
    );

    this.unsubscribers.push(
      this.domainEventBus.subscribe("AuditEntryCreated", (event) => {
        const userId = hasPayloadField(event, "user_id");

        if (!userId) {
          return;
        }

        this.eventDispatchAppService.dispatch("audit.entry", `user_audit:${userId}`, event.payload);
      })
    );
  }

  stop(): void {
    for (const unsubscribe of this.unsubscribers.splice(0, this.unsubscribers.length)) {
      unsubscribe();
    }
  }
}
