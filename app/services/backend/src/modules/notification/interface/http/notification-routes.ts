import type { FastifyRequest } from "fastify";
import { AppError } from "../../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../../shared/errors/error-code.js";
import { ok } from "../../../../shared/interface/http-contract.js";
import type { HttpRouteModule } from "../../../../shared/interface/http-route-module.js";
import { requireCurrentUserId } from "../../../../shared/interface/current-user.js";
import { NotificationService } from "../../application/notification-service.js";
import { NotificationMemoryRepository } from "../../infra/notification-memory-repository.js";

type NotificationListQuery = {
  is_read?: string;
  page?: string;
  page_size?: string;
};

type MarkReadBody = {
  notification_ids?: string[];
};

const repository = new NotificationMemoryRepository();
const service = new NotificationService(repository);

const parsePositiveInteger = (rawValue: string | undefined, fieldName: string, fallback: number): number => {
  if (rawValue === undefined) {
    return fallback;
  }

  const value = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(value) || value <= 0) {
    throw new AppError(ErrorCode.InvalidParams, `${fieldName} must be a positive integer`, 400, {
      field: fieldName
    });
  }

  return value;
};

const parseIsRead = (rawValue: string | undefined): boolean | undefined => {
  if (rawValue === undefined) {
    return undefined;
  }

  if (rawValue === "true") {
    return true;
  }

  if (rawValue === "false") {
    return false;
  }

  throw new AppError(ErrorCode.InvalidParams, "is_read must be true or false", 400, {
    field: "is_read"
  });
};

const normalizeNotificationIds = (request: FastifyRequest<{ Body: MarkReadBody }>): string[] | undefined => {
  const notificationIds = request.body?.notification_ids;

  if (notificationIds === undefined) {
    return undefined;
  }

  if (!Array.isArray(notificationIds)) {
    throw new AppError(ErrorCode.InvalidParams, "notification_ids must be an array", 400, {
      field: "notification_ids"
    });
  }

  for (const notificationId of notificationIds) {
    if (typeof notificationId !== "string" || notificationId.trim().length === 0) {
      throw new AppError(
        ErrorCode.InvalidParams,
        "notification_ids must only contain non-empty strings",
        400,
        {
          field: "notification_ids"
        }
      );
    }
  }

  return notificationIds;
};

export const notificationRoutes: HttpRouteModule = async (app) => {
  app.get(
    "/notifications",
    async (request: FastifyRequest<{ Querystring: NotificationListQuery }>) => {
      const userId = requireCurrentUserId(request);
      const page = parsePositiveInteger(request.query.page, "page", 1);
      const pageSize = parsePositiveInteger(request.query.page_size, "page_size", 20);
      const isRead = parseIsRead(request.query.is_read);

      return ok(
        service.listNotifications(userId, {
          page,
          pageSize,
          isRead
        })
      );
    }
  );

  app.get("/notifications/unread-count", async (request) => {
    const userId = requireCurrentUserId(request);
    return ok(service.getUnreadCount(userId));
  });

  app.post("/notifications/mark-read", async (request: FastifyRequest<{ Body: MarkReadBody }>) => {
    const userId = requireCurrentUserId(request);
    const notificationIds = normalizeNotificationIds(request);

    return ok(service.markRead(userId, notificationIds));
  });
};
