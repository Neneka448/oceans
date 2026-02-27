import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import Fastify, { type FastifyInstance } from "fastify";
import { registerErrorHandler } from "../../../../shared/errors/error-handler.js";
import { threadRoutes } from "./thread-routes.js";
import { createThreadReplyModule } from "../../application/thread-reply-module.js";

type TestContext = {
  app: FastifyInstance;
  module: ReturnType<typeof createThreadReplyModule>;
};

const activeApps: FastifyInstance[] = [];

const createTestContext = async (): Promise<TestContext> => {
  const app = Fastify({ logger: false });
  registerErrorHandler(app);
  const module = createThreadReplyModule();
  await app.register(threadRoutes, { module });
  await app.ready();
  activeApps.push(app);

  return { app, module };
};

afterEach(async () => {
  while (activeApps.length > 0) {
    const app = activeApps.pop();
    await app?.close();
  }
});

describe("thread-routes", () => {
  it("should_create_list_and_accept_reply_on_knowledge_thread", async () => {
    const { app, module } = await createTestContext();

    const createThreadRes = await app.inject({
      method: "POST",
      url: "/threads/create",
      headers: { "x-user-id": "user-author" },
      payload: {
        type: "knowledge",
        title: "How to optimize API latency",
        content: "Need guidance on p95 spikes",
        tags: ["backend", "perf"],
        mention_user_ids: ["user-helper", "user-helper"]
      }
    });
    assert.equal(createThreadRes.statusCode, 200);
    const threadId = createThreadRes.json().data.thread_id as string;

    const listRes = await app.inject({
      method: "GET",
      url: "/threads?type=knowledge&tags=backend&keyword=latency&page=1&page_size=20",
      headers: { "x-user-id": "user-author" }
    });
    assert.equal(listRes.statusCode, 200);
    assert.equal(listRes.json().data.total, 1);

    const createReplyRes = await app.inject({
      method: "POST",
      url: `/threads/${threadId}/replies/create`,
      headers: { "x-user-id": "user-helper" },
      payload: {
        content: "Use async profiler and reduce N+1 queries",
        mention_user_ids: ["user-author"]
      }
    });
    assert.equal(createReplyRes.statusCode, 200);
    const replyId = createReplyRes.json().data.reply_id as string;

    const acceptRes = await app.inject({
      method: "POST",
      url: `/threads/${threadId}/replies/${replyId}/accept`,
      headers: { "x-user-id": "user-author" }
    });
    assert.equal(acceptRes.statusCode, 200);
    assert.equal(acceptRes.json().data.is_accepted, true);

    const detailRes = await app.inject({
      method: "GET",
      url: `/threads/${threadId}`,
      headers: { "x-user-id": "user-author" }
    });
    assert.equal(detailRes.statusCode, 200);
    assert.equal(detailRes.json().data.replies[0].is_accepted, true);

    const eventNames = module.eventPublisher.list().map((event) => event.name);
    assert.deepEqual(eventNames, [
      "ThreadCreated",
      "MentionDetected",
      "ReplyAdded",
      "MentionDetected",
      "ReplyAccepted"
    ]);
  });

  it("should_reject_request_when_params_invalid", async () => {
    const { app } = await createTestContext();

    const invalidCreateRes = await app.inject({
      method: "POST",
      url: "/threads/create",
      headers: { "x-user-id": "user-1" },
      payload: {
        type: "knowledge",
        title: "",
        content: "content"
      }
    });

    assert.equal(invalidCreateRes.statusCode, 400);
    assert.equal(invalidCreateRes.json().error.code, "common.invalid_params");
  });

  it("should_reject_update_status_when_not_author", async () => {
    const { app } = await createTestContext();

    const createThreadRes = await app.inject({
      method: "POST",
      url: "/threads/create",
      headers: { "x-user-id": "author-user" },
      payload: {
        type: "requirement",
        title: "Implement webhook retries",
        content: "Need robust retry policies"
      }
    });
    const threadId = createThreadRes.json().data.thread_id as string;

    const updateStatusRes = await app.inject({
      method: "POST",
      url: `/threads/${threadId}/update-status`,
      headers: { "x-user-id": "other-user" },
      payload: {
        status: "answered"
      }
    });

    assert.equal(updateStatusRes.statusCode, 403);
    assert.equal(updateStatusRes.json().error.code, "thread.not_author");
  });

  it("should_reject_invalid_status_transition_when_thread_closed", async () => {
    const { app } = await createTestContext();

    const createThreadRes = await app.inject({
      method: "POST",
      url: "/threads/create",
      headers: { "x-user-id": "author-user" },
      payload: {
        type: "requirement",
        title: "Migrate queue consumers",
        content: "Need migration plan"
      }
    });
    const threadId = createThreadRes.json().data.thread_id as string;

    const closeRes = await app.inject({
      method: "POST",
      url: `/threads/${threadId}/update-status`,
      headers: { "x-user-id": "author-user" },
      payload: {
        status: "closed"
      }
    });
    assert.equal(closeRes.statusCode, 200);

    const reopenRes = await app.inject({
      method: "POST",
      url: `/threads/${threadId}/update-status`,
      headers: { "x-user-id": "author-user" },
      payload: {
        status: "open"
      }
    });

    assert.equal(reopenRes.statusCode, 409);
    assert.equal(reopenRes.json().error.code, "thread.invalid_status_transition");
  });

  it("should_reject_accept_reply_when_thread_not_knowledge", async () => {
    const { app } = await createTestContext();

    const createThreadRes = await app.inject({
      method: "POST",
      url: "/threads/create",
      headers: { "x-user-id": "author-user" },
      payload: {
        type: "requirement",
        title: "Design cache invalidation",
        content: "Need design proposal"
      }
    });
    const threadId = createThreadRes.json().data.thread_id as string;

    const createReplyRes = await app.inject({
      method: "POST",
      url: `/threads/${threadId}/replies/create`,
      headers: { "x-user-id": "helper-user" },
      payload: {
        content: "Consider key versioning"
      }
    });
    const replyId = createReplyRes.json().data.reply_id as string;

    const acceptRes = await app.inject({
      method: "POST",
      url: `/threads/${threadId}/replies/${replyId}/accept`,
      headers: { "x-user-id": "author-user" }
    });

    assert.equal(acceptRes.statusCode, 409);
    assert.equal(acceptRes.json().error.code, "thread.accept_only_knowledge");
  });

  it("should_reject_accept_when_thread_already_has_accepted_reply", async () => {
    const { app } = await createTestContext();

    const createThreadRes = await app.inject({
      method: "POST",
      url: "/threads/create",
      headers: { "x-user-id": "author-user" },
      payload: {
        type: "knowledge",
        title: "Best way to mock DB in tests",
        content: "Looking for patterns"
      }
    });
    const threadId = createThreadRes.json().data.thread_id as string;

    const createReplyARes = await app.inject({
      method: "POST",
      url: `/threads/${threadId}/replies/create`,
      headers: { "x-user-id": "helper-a" },
      payload: {
        content: "Use repository interface and fakes"
      }
    });
    const replyAId = createReplyARes.json().data.reply_id as string;

    const createReplyBRes = await app.inject({
      method: "POST",
      url: `/threads/${threadId}/replies/create`,
      headers: { "x-user-id": "helper-b" },
      payload: {
        content: "Use dockerized test DB"
      }
    });
    const replyBId = createReplyBRes.json().data.reply_id as string;

    const acceptARes = await app.inject({
      method: "POST",
      url: `/threads/${threadId}/replies/${replyAId}/accept`,
      headers: { "x-user-id": "author-user" }
    });
    assert.equal(acceptARes.statusCode, 200);

    const acceptBRes = await app.inject({
      method: "POST",
      url: `/threads/${threadId}/replies/${replyBId}/accept`,
      headers: { "x-user-id": "author-user" }
    });

    assert.equal(acceptBRes.statusCode, 409);
    assert.equal(acceptBRes.json().error.code, "thread.reply_already_accepted");
  });
});

