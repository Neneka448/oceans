import type { FastifyRequest } from "fastify";
import { AppError } from "../../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../../shared/errors/error-code.js";
import { ok } from "../../../../shared/interface/http-contract.js";
import type { HttpRouteModule } from "../../../../shared/interface/http-route-module.js";
import type { ConversationService } from "../../application/conversation-service.js";

type GetOrCreateBody = {
  peer_user_id?: string;
};

type PaginationQuery = {
  page?: string;
  page_size?: string;
};

export const createConversationRoutes = (
  conversationService: ConversationService
): HttpRouteModule => {
  return async (app) => {
    // GET /conversations - 获取会话列表
    app.get("/", async (request: FastifyRequest<{ Querystring: PaginationQuery }>) => {
      const userId = request.user?.id;
      if (!userId) {
        throw new AppError(ErrorCode.Unauthorized, "Authentication required", 401);
      }

      const page = Math.max(1, parseInt(request.query.page ?? "1", 10) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(request.query.page_size ?? "20", 10) || 20));

      const result = conversationService.getConversations(userId, page, pageSize);
      return ok(result);
    });

    // POST /conversations/get-or-create - 获取或创建会话
    app.post("/get-or-create", async (request: FastifyRequest<{ Body: GetOrCreateBody }>) => {
      const userId = request.user?.id;
      if (!userId) {
        throw new AppError(ErrorCode.Unauthorized, "Authentication required", 401);
      }

      const peerUserId = request.body?.peer_user_id?.trim();
      if (!peerUserId) {
        throw new AppError(ErrorCode.InvalidParams, "peer_user_id is required", 400, {
          field: "peer_user_id"
        });
      }

      const result = conversationService.getOrCreateConversation(userId, peerUserId);
      return ok(result);
    });
  };
};
