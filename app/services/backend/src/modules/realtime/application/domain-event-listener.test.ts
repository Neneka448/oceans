import assert from "node:assert/strict";
import test from "node:test";
import { InMemoryDomainEventBus } from "../../../shared/interface/domain-event-bus.js";
import { ConnectionAppService } from "./connection-app-service.js";
import { DomainEventListener } from "./domain-event-listener.js";
import { EventDispatchAppService } from "./event-dispatch-app-service.js";
import { InMemoryConnectionRepository } from "../infra/in-memory-connection-repository.js";
import { InMemoryIdempotencyStore } from "../infra/in-memory-idempotency-store.js";
import { InMemoryWsFrameAdapter } from "../infra/in-memory-ws-frame-adapter.js";

const setup = (): {
  bus: InMemoryDomainEventBus;
  adapter: InMemoryWsFrameAdapter;
  listener: DomainEventListener;
} => {
  const bus = new InMemoryDomainEventBus();
  const repository = new InMemoryConnectionRepository();
  const idempotencyStore = new InMemoryIdempotencyStore();
  const connectionService = new ConnectionAppService(repository, idempotencyStore);
  connectionService.onConnect("conn-user-1", "user-1");
  connectionService.onConnect("conn-user-2", "user-2");
  connectionService.subscribe("conn-user-1", "thread:thread-1");
  connectionService.subscribe("conn-user-1", "task:task-1");
  connectionService.subscribe("conn-user-1", "user_audit:user-1");

  const adapter = new InMemoryWsFrameAdapter();
  const dispatchService = new EventDispatchAppService(repository, adapter);
  const listener = new DomainEventListener(bus, dispatchService);
  listener.start();

  return {
    bus,
    adapter,
    listener
  };
};

test("should_route_notification_created_to_user_feed", () => {
  const { bus, adapter, listener } = setup();

  bus.publish({
    name: "NotificationCreated",
    payload: {
      recipient_id: "user-1",
      notification_id: "noti-1"
    }
  });

  const user1Frames = adapter.listSentFrames("conn-user-1");
  const user2Frames = adapter.listSentFrames("conn-user-2");

  assert.equal(user1Frames.length, 1);
  assert.equal(user1Frames[0]?.type, "event");
  assert.deepEqual(user2Frames, []);

  listener.stop();
});

test("should_route_thread_reply_to_thread_channel_subscribers", () => {
  const { bus, adapter, listener } = setup();

  bus.publish({
    name: "ReplyAdded",
    payload: {
      thread_id: "thread-1",
      reply_id: "reply-1"
    }
  });

  const user1Frames = adapter.listSentFrames("conn-user-1");
  assert.equal(user1Frames.length, 1);

  const frame = user1Frames[0];

  if (!frame || frame.type !== "event") {
    throw new Error("expected event frame");
  }

  assert.equal(frame.event.name, "thread.replied");

  listener.stop();
});

test("should_route_all_supported_domain_events", () => {
  const { bus, adapter, listener } = setup();

  bus.publish({
    name: "MessageCreated",
    payload: {
      recipient_id: "user-1",
      message_id: "message-1"
    }
  });
  bus.publish({
    name: "TaskUpdated",
    payload: {
      task_id: "task-1"
    }
  });
  bus.publish({
    name: "AssignReviewed",
    payload: {
      applicant_id: "user-1",
      application_id: "app-1"
    }
  });
  bus.publish({
    name: "AuditEntryCreated",
    payload: {
      user_id: "user-1",
      entry_id: "audit-1"
    }
  });

  const sentEventNames: string[] = [];

  for (const frame of adapter.listSentFrames("conn-user-1")) {
    if (frame.type === "event") {
      sentEventNames.push(frame.event.name);
    }
  }

  assert.ok(sentEventNames.includes("message.new"));
  assert.ok(sentEventNames.includes("task.updated"));
  assert.ok(sentEventNames.includes("assign.reviewed"));
  assert.ok(sentEventNames.includes("audit.entry"));

  listener.stop();
});
