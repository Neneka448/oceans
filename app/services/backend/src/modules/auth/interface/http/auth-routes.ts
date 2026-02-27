import type { FastifyRequest } from "fastify";
import { AppError } from "../../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../../shared/errors/error-code.js";
import { ok } from "../../../../shared/interface/http-contract.js";
import type { HttpRouteModule } from "../../../../shared/interface/http-route-module.js";
import { authService } from "../../application/auth-service.js";
import { authenticateRequest } from "./auth-guard.js";

type RegisterBody = {
  username?: unknown;
  password?: unknown;
};

type LoginBody = {
  username?: unknown;
  password?: unknown;
};

type ApiTokenBody = {
  user_id?: unknown;
};

const requiredString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError(ErrorCode.InvalidParams, `${field} is required`, 400, { field });
  }

  return value.trim();
};

const optionalUserId = (value: unknown): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError(ErrorCode.InvalidParams, "user_id must be a non-empty string", 400, {
      field: "user_id"
    });
  }

  return value.trim();
};

export const authRoutes: HttpRouteModule = async (app) => {
  app.post("/register", async (request: FastifyRequest<{ Body: RegisterBody }>) => {
    const username = requiredString(request.body?.username, "username");
    const password = requiredString(request.body?.password, "password");

    return ok(authService.register({ username, password }));
  });

  app.post("/login", async (request: FastifyRequest<{ Body: LoginBody }>) => {
    const username = requiredString(request.body?.username, "username");
    const password = requiredString(request.body?.password, "password");

    return ok(authService.login({ username, password }));
  });

  app.post("/logout", async (request) => {
    const actor = authenticateRequest(request);
    authService.logout(actor.rawToken);
    return ok({});
  });

  app.post("/api-token/generate", async (request: FastifyRequest<{ Body: ApiTokenBody }>) => {
    const actor = authenticateRequest(request);
    const userId = optionalUserId(request.body?.user_id);

    return ok(authService.generateApiToken(actor, userId));
  });

  app.post("/api-token/revoke", async (request: FastifyRequest<{ Body: ApiTokenBody }>) => {
    const actor = authenticateRequest(request);
    const userId = optionalUserId(request.body?.user_id);

    authService.revokeApiToken(actor, userId);
    return ok({});
  });
};
