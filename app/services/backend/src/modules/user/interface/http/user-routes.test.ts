import { test, afterEach, beforeEach } from "vitest";
import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";
import { resetAuthMemoryStore } from "../../../auth/infra/auth-memory-store.js";
import { buildTestApp } from "../../../auth/interface/http/test-app.js";

let app: FastifyInstance;

beforeEach(async () => {
  resetAuthMemoryStore();
  app = await buildTestApp();
});

afterEach(async () => {
  await app.close();
});

const registerAndLogin = async (
  username: string,
  password: string
): Promise<{ userId: string; token: string }> => {
  const registerRes = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: {
      username,
      password
    }
  });

  const userId = registerRes.json().data.user_id as string;

  const loginRes = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: {
      username,
      password
    }
  });

  return {
    userId,
    token: loginRes.json().data.token as string
  };
};

test("should_reject_users_list_when_unauthorized", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/users"
  });

  assert.equal(res.statusCode, 401);
  assert.equal(res.json().error.code, "common.unauthorized");
});

test("should_return_paginated_user_list", async () => {
  const { token } = await registerAndLogin("alice", "secret");
  await registerAndLogin("bob", "secret");

  const res = await app.inject({
    method: "GET",
    url: "/users?page=1&page_size=1",
    headers: {
      authorization: `Bearer ${token}`
    }
  });

  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.ok, true);
  assert.equal(body.data.page, 1);
  assert.equal(body.data.page_size, 1);
  assert.equal(body.data.items.length, 1);
  assert.equal(body.data.total, 2);
});

test("should_return_user_detail", async () => {
  const { userId, token } = await registerAndLogin("alice", "secret");

  const res = await app.inject({
    method: "GET",
    url: `/users/${userId}`,
    headers: {
      authorization: `Bearer ${token}`
    }
  });

  assert.equal(res.statusCode, 200);
  const body = res.json();
  assert.equal(body.data.user_id, userId);
  assert.deepEqual(body.data.active_tasks, []);
  assert.deepEqual(body.data.authored_threads, []);
  assert.deepEqual(body.data.participated_threads, []);
});

test("should_forbid_updating_other_user_profile", async () => {
  const { token } = await registerAndLogin("alice", "secret");
  const { userId: bobUserId } = await registerAndLogin("bob", "secret");

  const res = await app.inject({
    method: "POST",
    url: `/users/${bobUserId}/update`,
    headers: {
      authorization: `Bearer ${token}`
    },
    payload: {
      domain_description: "new"
    }
  });

  assert.equal(res.statusCode, 403);
  assert.equal(res.json().error.code, "common.forbidden");
});

test("should_allow_admin_to_update_any_user", async () => {
  const { token: adminToken } = await registerAndLogin("admin", "secret");
  const { userId: bobUserId } = await registerAndLogin("bob", "secret");

  const updateRes = await app.inject({
    method: "POST",
    url: `/users/${bobUserId}/update`,
    headers: {
      authorization: `Bearer ${adminToken}`
    },
    payload: {
      domain_description: "infra",
      domain_tags: ["backend", "infra"],
      avatar: "https://example.com/bob.png"
    }
  });

  assert.equal(updateRes.statusCode, 200);
  const body = updateRes.json();
  assert.equal(body.data.domain_description, "infra");
  assert.deepEqual(body.data.domain_tags, ["backend", "infra"]);
  assert.equal(body.data.avatar, "https://example.com/bob.png");
});

test("should_reject_invalid_page_query", async () => {
  const { token } = await registerAndLogin("alice", "secret");

  const res = await app.inject({
    method: "GET",
    url: "/users?page=0",
    headers: {
      authorization: `Bearer ${token}`
    }
  });

  assert.equal(res.statusCode, 400);
  assert.equal(res.json().error.code, "common.invalid_params");
});

test("should_update_self_profile", async () => {
  const { userId, token } = await registerAndLogin("alice", "secret");

  const updateRes = await app.inject({
    method: "POST",
    url: `/users/${userId}/update`,
    headers: {
      authorization: `Bearer ${token}`
    },
    payload: {
      username: "alice-renamed",
      domain_description: "platform",
      domain_tags: ["backend"]
    }
  });

  assert.equal(updateRes.statusCode, 200);
  const body = updateRes.json();
  assert.equal(body.data.username, "alice-renamed");
  assert.equal(body.data.domain_description, "platform");
  assert.deepEqual(body.data.domain_tags, ["backend"]);
});
