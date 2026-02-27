import assert from "node:assert/strict";
import test from "node:test";
import { ConnectionAppService } from "./connection-app-service.js";
import { WsMessageHandler } from "./ws-message-handler.js";
import { InMemoryConnectionRepository } from "../infra/in-memory-connection-repository.js";
import { InMemoryIdempotencyStore } from "../infra/in-memory-idempotency-store.js";

const setup = (): {
  handler: WsMessageHandler;
  service: ConnectionAppService;
} => {
  const repository = new InMemoryConnectionRepository();
  const idempotencyStore = new InMemoryIdempotencyStore();
  const service = new ConnectionAppService(repository, idempotencyStore);
  service.onConnect("conn-1", "user-1");

  return {
    handler: new WsMessageHandler(service, idempotencyStore),
    service
  };
};

test("should_ack_subscribe_and_deduplicate_by_frame_id", () => {
  const { handler } = setup();

  const first = handler.handleFrame("conn-1", {
    type: "subscribe",
    id: "frame-1",
    channel: "thread:thread-1"
  });

  assert.deepEqual(first, {
    type: "ack",
    id: "frame-1"
  });

  const duplicated = handler.handleFrame("conn-1", {
    type: "subscribe",
    id: "frame-1",
    channel: "thread:thread-1"
  });

  assert.deepEqual(duplicated, {
    type: "ack",
    id: "frame-1",
    duplicated: true
  });
});

test("should_reply_pong_for_ping_frame", () => {
  const { handler } = setup();

  const response = handler.handleFrame("conn-1", {
    type: "ping"
  });

  assert.deepEqual(response, {
    type: "pong"
  });
});
