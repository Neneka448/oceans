import assert from "node:assert/strict";
import { test } from "vitest";
import { ConnectionAppService } from "./connection-app-service.js";
import { InMemoryConnectionRepository } from "../infra/in-memory-connection-repository.js";
import { InMemoryIdempotencyStore } from "../infra/in-memory-idempotency-store.js";

const createService = (): ConnectionAppService => {
  return new ConnectionAppService(new InMemoryConnectionRepository(), new InMemoryIdempotencyStore());
};

test("should_manage_connection_lifecycle", () => {
  const service = createService();

  service.onConnect("conn-1", "user-1");
  service.subscribe("conn-1", "thread:thread-1");
  service.unsubscribe("conn-1", "thread:thread-1");

  const closed = service.closeStaleConnections(0, Date.now() + 1);
  assert.deepEqual(closed, ["conn-1"]);
});

test("should_cleanup_all_user_connections_on_logout", () => {
  const service = createService();

  service.onConnect("conn-1", "user-1");
  service.onConnect("conn-2", "user-1");
  service.onConnect("conn-3", "user-2");

  const removed = service.logoutUser("user-1");
  assert.deepEqual(removed.sort(), ["conn-1", "conn-2"]);
});
