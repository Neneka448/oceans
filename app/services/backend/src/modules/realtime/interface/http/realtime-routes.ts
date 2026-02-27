import { randomUUID } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { AppError } from "../../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../../shared/errors/error-code.js";
import { ok } from "../../../../shared/interface/http-contract.js";
import type { HttpRouteModule } from "../../../../shared/interface/http-route-module.js";
import { requireCurrentUserId } from "../../../../shared/interface/current-user.js";
import { ConnectionAppService } from "../../application/connection-app-service.js";
import { InMemoryConnectionRepository } from "../../infra/in-memory-connection-repository.js";
import { InMemoryIdempotencyStore } from "../../infra/in-memory-idempotency-store.js";

type WsConnectHeaders = {
  upgrade?: string;
};

const connectionRepository = new InMemoryConnectionRepository();
const idempotencyStore = new InMemoryIdempotencyStore();
const connectionAppService = new ConnectionAppService(connectionRepository, idempotencyStore);

export const realtimeRoutes: HttpRouteModule = async (app) => {
  app.get("/ws", async (request: FastifyRequest<{ Headers: WsConnectHeaders }>) => {
    const userId = requireCurrentUserId(request);

    if (request.headers.upgrade?.toLowerCase() !== "websocket") {
      throw new AppError(ErrorCode.InvalidParams, "upgrade header must be websocket", 400, {
        field: "upgrade"
      });
    }

    const connection = connectionAppService.onConnect(randomUUID(), userId);

    return ok({
      connection_id: connection.connectionId,
      user_id: connection.userId,
      subscribed_channels: [...connection.subscriptions]
    });
  });
};
