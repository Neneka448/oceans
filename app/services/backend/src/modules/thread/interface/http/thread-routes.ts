import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";
import { AppError } from "../../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../../shared/errors/error-code.js";
import { ok } from "../../../../shared/interface/http-contract.js";
import {
  createThreadBodySchema,
  createReplyBodySchema,
  listThreadsQuerySchema,
  threadAndReplyIdParamSchema,
  threadIdParamSchema,
  updateThreadStatusBodySchema
} from "./thread-route-schema.js";
import {
  createThreadReplyModule,
  getDefaultThreadReplyModule,
  type ThreadReplyModule
} from "../../application/thread-reply-module.js";

type ThreadRoutesOptions = {
  module?: ThreadReplyModule;
};

type ThreadListQuery = {
  type?: string;
  status?: string;
  tags?: string;
  keyword?: string;
  page?: string | number;
  page_size?: string | number;
};

const parseOrThrow = <TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  value: unknown
): z.infer<TSchema> => {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path.join(".") || undefined;
    const message = issue?.message ?? "invalid params";

    throw new AppError(ErrorCode.InvalidParams, message, 400, { field });
  }

  return parsed.data;
};

const getActorId = (request: FastifyRequest): string => {
  const rawHeaderValue = request.headers["x-user-id"];
  const actorId = (Array.isArray(rawHeaderValue) ? rawHeaderValue[0] : rawHeaderValue)?.trim();

  if (!actorId) {
    throw new AppError(ErrorCode.Unauthorized, "x-user-id header is required", 401);
  }

  return actorId;
};

export const threadRoutes: FastifyPluginAsync<ThreadRoutesOptions> = async (app, options) => {
  const module = options.module ?? getDefaultThreadReplyModule();

  app.get("/threads", async (request: FastifyRequest<{ Querystring: ThreadListQuery }>) => {
    const actorId = getActorId(request);
    const query = parseOrThrow(listThreadsQuerySchema, request.query);
    const result = module.threadService.listThreads({
      actorId,
      type: query.type,
      status: query.status,
      tags: query.tags,
      keyword: query.keyword,
      page: query.page,
      pageSize: query.page_size
    });

    return ok({
      items: result.items.map((item) => ({
        thread_id: item.threadId,
        type: item.type,
        title: item.title,
        author_id: item.authorId,
        author_name: item.authorName,
        status: item.status,
        tags: item.tags,
        reply_count: item.replyCount,
        created_at: item.createdAt,
        updated_at: item.updatedAt
      })),
      total: result.total,
      page: result.page,
      page_size: result.pageSize
    });
  });

  app.get("/threads/:thread_id", async (request: FastifyRequest<{ Params: { thread_id: string } }>) => {
    const actorId = getActorId(request);
    const params = parseOrThrow(threadIdParamSchema, request.params);
    const result = module.threadService.getThreadDetail(actorId, params.thread_id);

    return ok({
      thread_id: result.threadId,
      type: result.type,
      title: result.title,
      content: result.content,
      author_id: result.authorId,
      status: result.status,
      tags: result.tags,
      mention_user_ids: result.mentionUserIds,
      related_requirement_thread_id: result.relatedRequirementThreadId,
      related_task_id: result.relatedTaskId,
      created_at: result.createdAt,
      updated_at: result.updatedAt,
      replies: result.replies.map((reply) => ({
        reply_id: reply.replyId,
        author_id: reply.authorId,
        content: reply.content,
        mention_user_ids: reply.mentionUserIds,
        is_accepted: reply.isAccepted,
        created_at: reply.createdAt
      }))
    });
  });

  app.post(
    "/threads/create",
    async (
      request: FastifyRequest<{
        Body: {
          type: string;
          title: string;
          content: string;
          tags?: string[];
          mention_user_ids?: string[];
          related_requirement_thread_id?: string | null;
          related_task_id?: string | null;
        };
      }>
    ) => {
      const actorId = getActorId(request);
      const body = parseOrThrow(createThreadBodySchema, request.body);
      const result = module.threadService.createThread({
        actorId,
        type: body.type,
        title: body.title,
        content: body.content,
        tags: body.tags ?? [],
        mentionUserIds: body.mention_user_ids ?? [],
        relatedRequirementThreadId: body.related_requirement_thread_id ?? null,
        relatedTaskId: body.related_task_id ?? null
      });

      return ok({ thread_id: result.threadId });
    }
  );

  app.post(
    "/threads/:thread_id/update-status",
    async (
      request: FastifyRequest<{
        Params: { thread_id: string };
        Body: { status: string };
      }>
    ) => {
      const actorId = getActorId(request);
      const params = parseOrThrow(threadIdParamSchema, request.params);
      const body = parseOrThrow(updateThreadStatusBodySchema, request.body);
      const result = module.threadService.updateStatus({
        actorId,
        threadId: params.thread_id,
        status: body.status
      });

      return ok({
        thread_id: result.threadId,
        status: result.status
      });
    }
  );

  app.post(
    "/threads/:thread_id/replies/create",
    async (
      request: FastifyRequest<{
        Params: { thread_id: string };
        Body: { content: string; mention_user_ids?: string[] };
      }>
    ) => {
      const actorId = getActorId(request);
      const params = parseOrThrow(threadIdParamSchema, request.params);
      const body = parseOrThrow(createReplyBodySchema, request.body);
      const result = module.replyService.createReply({
        actorId,
        threadId: params.thread_id,
        content: body.content,
        mentionUserIds: body.mention_user_ids ?? []
      });

      return ok({
        reply_id: result.replyId
      });
    }
  );

  app.post(
    "/threads/:thread_id/replies/:reply_id/accept",
    async (request: FastifyRequest<{ Params: { thread_id: string; reply_id: string } }>) => {
      const actorId = getActorId(request);
      const params = parseOrThrow(threadAndReplyIdParamSchema, request.params);
      const result = module.replyService.acceptReply({
        actorId,
        threadId: params.thread_id,
        replyId: params.reply_id
      });

      return ok({
        reply_id: result.replyId,
        is_accepted: result.isAccepted
      });
    }
  );
};

export const createIsolatedThreadRoutesModule = (): ThreadReplyModule => createThreadReplyModule();
