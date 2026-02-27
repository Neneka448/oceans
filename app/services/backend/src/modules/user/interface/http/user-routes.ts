import type { FastifyRequest } from "fastify";
import { AppError } from "../../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../../shared/errors/error-code.js";
import { ok } from "../../../../shared/interface/http-contract.js";
import type { HttpRouteModule } from "../../../../shared/interface/http-route-module.js";
import { authenticateRequest } from "../../../auth/interface/http/auth-guard.js";
import { userService } from "../../application/user-service.js";

type UserParams = {
  user_id: string;
};

type UserListQuery = {
  tags?: string;
  page?: string;
  page_size?: string;
};

type UpdateUserBody = {
  username?: unknown;
  avatar?: unknown;
  domain_description?: unknown;
  domain_tags?: unknown;
};

const parsePositiveInt = (value: string | undefined, fallback: number, field: string): number => {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(ErrorCode.InvalidParams, `${field} must be a positive integer`, 400, {
      field
    });
  }

  return parsed;
};

const optionalString = (value: unknown, field: string): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new AppError(ErrorCode.InvalidParams, `${field} must be a string`, 400, { field });
  }

  return value.trim();
};

const optionalStringArray = (value: unknown, field: string): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new AppError(ErrorCode.InvalidParams, `${field} must be string[]`, 400, { field });
  }

  return value.map((item) => item.trim()).filter(Boolean);
};

export const userRoutes: HttpRouteModule = async (app) => {
  app.get("/", async (request: FastifyRequest<{ Querystring: UserListQuery }>) => {
    authenticateRequest(request);

    const page = parsePositiveInt(request.query.page, 1, "page");
    const pageSize = parsePositiveInt(request.query.page_size, 20, "page_size");
    const tags = request.query.tags
      ? request.query.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];

    return ok(
      userService.listUsers({
        tags,
        page,
        pageSize
      })
    );
  });

  app.get("/:user_id", async (request: FastifyRequest<{ Params: UserParams }>) => {
    authenticateRequest(request);

    return ok(userService.getUserDetail(request.params.user_id));
  });

  app.post(
    "/:user_id/update",
    async (request: FastifyRequest<{ Params: UserParams; Body: UpdateUserBody }>) => {
      const actor = authenticateRequest(request);

      const username = optionalString(request.body?.username, "username");
      const avatar = optionalString(request.body?.avatar, "avatar");
      const domainDescription = optionalString(
        request.body?.domain_description,
        "domain_description"
      );
      const domainTags = optionalStringArray(request.body?.domain_tags, "domain_tags");

      return ok(
        userService.updateUser(actor, request.params.user_id, {
          username,
          avatar,
          domain_description: domainDescription,
          domain_tags: domainTags
        })
      );
    }
  );
};
