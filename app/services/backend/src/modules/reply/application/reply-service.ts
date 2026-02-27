import { randomUUID } from "node:crypto";
import { AppError } from "../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../shared/errors/error-code.js";
import { threadAppError, threadErrorCodes } from "../../thread/application/thread-error.js";
import type { ThreadEventPublisher } from "../../thread/domain/thread-event-publisher.js";
import type { ThreadRepository } from "../../thread/domain/thread-repository.js";
import type { ThreadEntity } from "../../thread/domain/thread.js";
import type { ReplyEntity } from "../domain/reply.js";
import type { ReplyRepository } from "../domain/reply-repository.js";

type ReplyServiceDeps = {
  threadRepository: ThreadRepository;
  replyRepository: ReplyRepository;
  eventPublisher: ThreadEventPublisher;
  idGenerator?: () => string;
  now?: () => Date;
};

export type CreateReplyInput = {
  actorId: string;
  threadId: string;
  content: string;
  mentionUserIds: string[];
};

export type AcceptReplyInput = {
  actorId: string;
  threadId: string;
  replyId: string;
};

export class ReplyService {
  private readonly idGenerator: () => string;
  private readonly now: () => Date;

  constructor(private readonly deps: ReplyServiceDeps) {
    this.idGenerator = deps.idGenerator ?? (() => randomUUID());
    this.now = deps.now ?? (() => new Date());
  }

  createReply(input: CreateReplyInput): { replyId: string } {
    this.assertActor(input.actorId);
    const thread = this.requireThread(input.threadId);
    const nowIso = this.now().toISOString();
    const reply: ReplyEntity = {
      id: this.idGenerator(),
      threadId: thread.id,
      authorId: input.actorId,
      content: input.content,
      mentionUserIds: this.normalizeStringArray(input.mentionUserIds),
      isAccepted: false,
      createdAt: nowIso
    };

    this.deps.replyRepository.save(reply);
    this.deps.eventPublisher.publish({
      name: "ReplyAdded",
      occurredAt: nowIso,
      payload: {
        threadId: thread.id,
        replyId: reply.id,
        authorId: reply.authorId
      }
    });

    for (const mentionedUserId of reply.mentionUserIds) {
      this.deps.eventPublisher.publish({
        name: "MentionDetected",
        occurredAt: nowIso,
        payload: {
          sourceType: "reply",
          sourceId: reply.id,
          threadId: thread.id,
          mentionedUserId,
          actorId: input.actorId
        }
      });
    }

    return { replyId: reply.id };
  }

  acceptReply(input: AcceptReplyInput): { replyId: string; isAccepted: true } {
    this.assertActor(input.actorId);
    const thread = this.requireThread(input.threadId);

    if (thread.authorId !== input.actorId) {
      throw threadAppError(
        threadErrorCodes.notAuthor,
        "only thread author can accept a reply",
        403
      );
    }

    if (thread.type !== "knowledge") {
      throw threadAppError(
        threadErrorCodes.acceptOnlyKnowledge,
        "accept reply is only available for knowledge thread",
        409
      );
    }

    const reply = this.deps.replyRepository.findById(input.replyId);

    if (!reply || reply.threadId !== thread.id) {
      throw new AppError(ErrorCode.NotFound, "reply not found", 404);
    }

    if (reply.isAccepted || this.deps.replyRepository.hasAcceptedReply(thread.id)) {
      throw threadAppError(
        threadErrorCodes.replyAlreadyAccepted,
        "reply has already been accepted for this thread",
        409
      );
    }

    this.deps.replyRepository.save({ ...reply, isAccepted: true });
    this.deps.eventPublisher.publish({
      name: "ReplyAccepted",
      occurredAt: this.now().toISOString(),
      payload: {
        threadId: thread.id,
        replyId: reply.id,
        accepterId: input.actorId,
        replyAuthorId: reply.authorId
      }
    });

    return { replyId: reply.id, isAccepted: true };
  }

  private normalizeStringArray(items: string[]): string[] {
    const uniqueValues = new Set<string>();

    for (const item of items) {
      const normalized = item.trim();

      if (normalized.length > 0) {
        uniqueValues.add(normalized);
      }
    }

    return [...uniqueValues];
  }

  private requireThread(threadId: string): ThreadEntity {
    const thread = this.deps.threadRepository.findById(threadId);

    if (!thread) {
      throw new AppError(ErrorCode.NotFound, "thread not found", 404);
    }

    return thread;
  }

  private assertActor(actorId: string): void {
    if (!actorId.trim()) {
      throw new AppError(ErrorCode.Unauthorized, "authentication required", 401);
    }
  }
}

