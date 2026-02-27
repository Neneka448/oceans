import { test, afterEach, beforeEach } from "vitest";
import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";
import { resetAuthMemoryStore } from "../../infra/auth-memory-store.js";
import { buildTestApp } from "./test-app.js";

let app: FastifyInstance;

beforeEach(async () => {
  resetAuthMemoryStore();
  app = await buildTestApp();
});

afterEach(async () => {
  await app.close();
});

test("should_register_and_login_user", async () => {
  const registerRes = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: {
      username: "alice",
      password: "secret"
    }
  });

  assert.equal(registerRes.statusCode, 200);
  const registerBody = registerRes.json();
  assert.equal(registerBody.ok, true);
  assert.equal(registerBody.data.username, "alice");
  assert.ok(registerBody.data.user_id);

  const loginRes = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: {
      username: "alice",
      password: "secret"
    }
  });

  assert.equal(loginRes.statusCode, 200);
  const loginBody = loginRes.json();
  assert.equal(loginBody.ok, true);
  assert.ok(loginBody.data.token);
  assert.equal(loginBody.data.user_id, registerBody.data.user_id);
});

test("should_reject_register_when_username_taken", async () => {
  await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: {
      username: "alice",
      password: "secret"
    }
  });

  const res = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: {
      username: "alice",
      password: "secret-2"
    }
  });

  assert.equal(res.statusCode, 409);
  const body = res.json();
  assert.equal(body.ok, false);
  assert.equal(body.error.code, "auth.username_taken");
});

test("should_reject_login_when_credentials_invalid", async () => {
  await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: {
      username: "alice",
      password: "secret"
    }
  });

  const res = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: {
      username: "alice",
      password: "wrong"
    }
  });

  assert.equal(res.statusCode, 401);
  const body = res.json();
  assert.equal(body.error.code, "auth.invalid_credentials");
});

test("should_logout_and_reject_revoked_session_token", async () => {
  await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: {
      username: "alice",
      password: "secret"
    }
  });

  const loginRes = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: {
      username: "alice",
      password: "secret"
    }
  });

  const sessionToken = loginRes.json().data.token as string;

  const logoutRes = await app.inject({
    method: "POST",
    url: "/auth/logout",
    headers: {
      authorization: `Bearer ${sessionToken}`
    }
  });

  assert.equal(logoutRes.statusCode, 200);

  const usersRes = await app.inject({
    method: "GET",
    url: "/users",
    headers: {
      authorization: `Bearer ${sessionToken}`
    }
  });

  assert.equal(usersRes.statusCode, 401);
  const usersBody = usersRes.json();
  assert.equal(usersBody.error.code, "auth.token_revoked");
});

test("should_generate_and_revoke_api_token", async () => {
  await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: {
      username: "alice",
      password: "secret"
    }
  });

  const loginRes = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: {
      username: "alice",
      password: "secret"
    }
  });

  const sessionToken = loginRes.json().data.token as string;

  const generateRes = await app.inject({
    method: "POST",
    url: "/auth/api-token/generate",
    headers: {
      authorization: `Bearer ${sessionToken}`
    },
    payload: {}
  });

  assert.equal(generateRes.statusCode, 200);
  const apiToken = generateRes.json().data.api_token as string;
  assert.ok(apiToken.startsWith("api_"));

  const useApiTokenRes = await app.inject({
    method: "GET",
    url: "/users",
    headers: {
      authorization: `Bearer ${apiToken}`
    }
  });

  assert.equal(useApiTokenRes.statusCode, 200);

  const revokeRes = await app.inject({
    method: "POST",
    url: "/auth/api-token/revoke",
    headers: {
      authorization: `Bearer ${sessionToken}`
    },
    payload: {}
  });

  assert.equal(revokeRes.statusCode, 200);

  const revokedAccessRes = await app.inject({
    method: "GET",
    url: "/users",
    headers: {
      authorization: `Bearer ${apiToken}`
    }
  });

  assert.equal(revokedAccessRes.statusCode, 401);
  assert.equal(revokedAccessRes.json().error.code, "auth.token_revoked");
});

test("should_allow_admin_to_generate_token_for_other_user", async () => {
  const adminRegisterRes = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: {
      username: "admin",
      password: "secret"
    }
  });

  const bobRegisterRes = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: {
      username: "bob",
      password: "secret"
    }
  });

  const adminUserId = adminRegisterRes.json().data.user_id as string;
  const bobUserId = bobRegisterRes.json().data.user_id as string;
  assert.notEqual(adminUserId, bobUserId);

  const adminLoginRes = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: {
      username: "admin",
      password: "secret"
    }
  });

  const adminToken = adminLoginRes.json().data.token as string;

  const generateRes = await app.inject({
    method: "POST",
    url: "/auth/api-token/generate",
    headers: {
      authorization: `Bearer ${adminToken}`
    },
    payload: {
      user_id: bobUserId
    }
  });

  assert.equal(generateRes.statusCode, 200);
  assert.ok(generateRes.json().data.api_token);
});

test("should_forbid_non_admin_from_generating_token_for_other_user", async () => {
  await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: {
      username: "alice",
      password: "secret"
    }
  });

  const bobRegisterRes = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: {
      username: "bob",
      password: "secret"
    }
  });

  const bobUserId = bobRegisterRes.json().data.user_id as string;

  const aliceLoginRes = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: {
      username: "alice",
      password: "secret"
    }
  });

  const aliceToken = aliceLoginRes.json().data.token as string;

  const res = await app.inject({
    method: "POST",
    url: "/auth/api-token/generate",
    headers: {
      authorization: `Bearer ${aliceToken}`
    },
    payload: {
      user_id: bobUserId
    }
  });

  assert.equal(res.statusCode, 403);
  assert.equal(res.json().error.code, "common.forbidden");
});
