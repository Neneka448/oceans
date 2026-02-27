import type { FastifyRequest } from "fastify";
import { AppError } from "../../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../../shared/errors/error-code.js";
import { ok } from "../../../../shared/interface/http-contract.js";
import type { HttpRouteModule } from "../../../../shared/interface/http-route-module.js";
import type { MessageService } from "../../../message/application/message-service.js";

type SendMessageBody = {
  content?: string;
  related_task_id?: string;
};

type MessageListQuery = {
  before?: string;
  page_size?: string;
};

export const createMessageRoutes = (
  messageService: MessageService
): HttpRouteModule => {
  return async (app) => {
    // GET /conversations/:conv_id/messages - 获取消息历史
    app.get(
      "/conversations/:conv_id/messages",
      async (
        request: FastifyRequest<{
          Params: { conv_id: string };
          Querystring: MessageListQuery;
        }>
      ) => {
        const userId = request.user?.id;
        if (!userId) {
          throw new AppError(
            ErrorCode.Unauthorized,
            "Authentication required",
            401
          );
        }

        const conversationId = request.params.conv_id?.trim();
        if (!conversationId) {
          throw new AppError(
            ErrorCode.InvalidParams,
            "conversation_id is required",
            400
          );
        }

        const beforeMessageId = request.query.before?.trim() || null;
        const pageSize = Math.min(
          100,
          Math.max(1, parseInt(request.query.page_size ?? "30", 10) || 30)
        );

        const result = messageService.getMessages(
          conversationId,
          userId,
          beforeMessageId,
          pageSize
        );
        return ok(result);
      }
    );

    // POST /conversations/:conv_id/messages/send - 发送消息
    app.post(
      "/conversations/:conv_id/messages/send",
      async (
        request: FastifyRequest<{
          Params: { conv_id: string };
          Body: SendMessageBody;
        }>
      ) => {
        const userId = request.user?.id;
        if (!userId) {
          throw new AppError(
            ErrorCode.Unauthorized,
            "Authentication required",
            401
          );
        }

        const conversationId = request.params.conv_id?.trim();
        if (!conversationId) {
          throw new AppError(
            ErrorCode.InvalidParams,
            "conversation_id is required",
            400
          );
        }

        const content = request.body?.content;
        if (!content || typeof content !== "string") {
          throw new AppError(
            ErrorCode.InvalidParams,
            "content is required",
            400,
            { field: "content" }
          );
        }

        const relatedTaskId = request.body?.related_task_id?.trim() || null;

        const result = messageService.sendMessage(
          conversationId,
          userId,
          content,
          relatedTaskId
        );
        return ok(result);
      }
    );
  };
};
