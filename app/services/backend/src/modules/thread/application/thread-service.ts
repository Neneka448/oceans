import { randomUUID } from "node:crypto";
import { AppError } from "../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../shared/errors/error-code.js";
import type { ReplyRepository } from "../../reply/domain/reply-repository.js";
import type { ThreadEventPublisher } from "../domain/thread-event-publisher.js";
import type { ThreadRepository } from "../domain/thread-repository.js";
import type { ThreadEntity, ThreadStatus, ThreadType } from "../domain/thread.js";
import { canTransitionThreadStatus } from "../domain/thread-status-rule.js";
import { threadAppError, threadErrorCodes } from "./thread-error.js";

export type ListThreadsInput = {
  actorId: string;
  type?: ThreadType;
  status?: ThreadStatus;
  tags?: string[];
  keyword?: string;
  page: number;
  pageSize: number;
};

export type ListThreadsResult = {
  items: Array<{
    threadId: string;
    type: ThreadType;
    title: string;
    authorId: string;
    authorName: string;
    status: ThreadStatus;
    tags: string[];
    replyCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
};

export type GetThreadDetailResult = {
  threadId: string;
  type: ThreadType;
  title: string;
  content: string;
  authorId: string;
  status: ThreadStatus;
  tags: string[];
  mentionUserIds: string[];
  relatedRequirementThreadId: string | null;
  relatedTaskId: string | null;
  createdAt: string;
  updatedAt: string;
  replies: Array<{
    replyId: string;
    authorId: string;
    content: string;
    mentionUserIds: string[];
    isAccepted: boolean;
    createdAt: string;
  }>;
};

export type CreateThreadInput = {
  actorId: string;
  type: ThreadType;
  title: string;
  content: string;
  tags: string[];
  mentionUserIds: string[];
  relatedRequirementThreadId: string | null;
  relatedTaskId: string | null;
};

export type UpdateThreadStatusInput = {
  actorId: string;
  threadId: string;
  status: ThreadStatus;
};

type ThreadServiceDeps = {
  threadRepository: ThreadRepository;
  replyRepository: ReplyRepository;
  eventPublisher: ThreadEventPublisher;
  idGenerator?: () => string;
  now?: () => Date;
};

export class ThreadService {
  private readonly idGenerator: () => string;
  private readonly now: () => Date;

  constructor(private readonly deps: ThreadServiceDeps) {
    this.idGenerator = deps.idGenerator ?? (() => randomUUID());
    this.now = deps.now ?? (() => new Date());
  }

  listThreads(input: ListThreadsInput): ListThreadsResult {
    this.assertActor(input.actorId);

    const filteredThreads = this.deps.threadRepository.list({
      type: input.type,
      status: input.status,
      tags: input.tags,
      keyword: input.keyword
    });

    const sortedThreads = filteredThreads.sort(
      (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
    );
    const total = sortedThreads.length;
    const offset = (input.page - 1) * input.pageSize;
    const pageItems = sortedThreads.slice(offset, offset + input.pageSize);

    return {
      items: pageItems.map((thread) => ({
        threadId: thread.id,
        type: thread.type,
        title: thread.title,
        authorId: thread.authorId,
        authorName: thread.authorId,
        status: thread.status,
        tags: [...thread.tags],
        replyCount: this.deps.replyRepository.countByThreadId(thread.id),
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt
      })),
      total,
      page: input.page,
      pageSize: input.pageSize
    };
  }

  getThreadDetail(actorId: string, threadId: string): GetThreadDetailResult {
    this.assertActor(actorId);
    const thread = this.requireThread(threadId);
    const replies = this.deps.replyRepository
      .listByThreadId(threadId)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

    return {
      threadId: thread.id,
      type: thread.type,
      title: thread.title,
      content: thread.content,
      authorId: thread.authorId,
      status: thread.status,
      tags: [...thread.tags],
      mentionUserIds: [...thread.mentionUserIds],
      relatedRequirementThreadId: thread.relatedRequirementThreadId,
      relatedTaskId: thread.relatedTaskId,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      replies: replies.map((reply) => ({
        replyId: reply.id,
        authorId: reply.authorId,
        content: reply.content,
        mentionUserIds: [...reply.mentionUserIds],
        isAccepted: reply.isAccepted,
        createdAt: reply.createdAt
      }))
    };
  }

  createThread(input: CreateThreadInput): { threadId: string } {
    this.assertActor(input.actorId);
    this.assertKnowledgeRelationship(input.type, input.relatedRequirementThreadId, input.relatedTaskId);

    if (input.relatedRequirementThreadId) {
      const relatedRequirement = this.requireThread(input.relatedRequirementThreadId);

      if (relatedRequirement.type !== "requirement") {
        throw threadAppError(
          threadErrorCodes.notRequirement,
          "related_requirement_thread_id must reference a requirement thread",
          409
        );
      }
    }

    const nowIso = this.now().toISOString();
    const thread: ThreadEntity = {
      id: this.idGenerator(),
      type: input.type,
      title: input.title,
      content: input.content,
      authorId: input.actorId,
      status: "open",
      tags: this.normalizeStringArray(input.tags),
      mentionUserIds: this.normalizeStringArray(input.mentionUserIds),
      relatedRequirementThreadId: input.relatedRequirementThreadId,
      relatedTaskId: input.relatedTaskId,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    this.deps.threadRepository.save(thread);
    this.deps.eventPublisher.publish({
      name: "ThreadCreated",
      occurredAt: nowIso,
      payload: {
        threadId: thread.id,
        threadType: thread.type,
        authorId: thread.authorId
      }
    });

    this.publishMentionEvents({
      sourceType: "thread",
      sourceId: thread.id,
      threadId: thread.id,
      actorId: thread.authorId,
      mentionUserIds: thread.mentionUserIds,
      occurredAt: nowIso
    });

    return { threadId: thread.id };
  }

  updateStatus(input: UpdateThreadStatusInput): { threadId: string; status: ThreadStatus } {
    this.assertActor(input.actorId);
    const thread = this.requireThread(input.threadId);

    if (thread.authorId !== input.actorId) {
      throw threadAppError(
        threadErrorCodes.notAuthor,
        "only thread author can update thread status",
        403
      );
    }

    if (!canTransitionThreadStatus(thread.status, input.status)) {
      throw threadAppError(
        threadErrorCodes.invalidStatusTransition,
        `cannot transition status from ${thread.status} to ${input.status}`,
        409
      );
    }

    if (thread.status !== input.status) {
      this.deps.threadRepository.save({
        ...thread,
        status: input.status,
        updatedAt: this.now().toISOString()
      });
    }

    return { threadId: thread.id, status: input.status };
  }

  private publishMentionEvents(input: {
    sourceType: "thread" | "reply";
    sourceId: string;
    threadId: string;
    actorId: string;
    mentionUserIds: string[];
    occurredAt: string;
  }): void {
    for (const mentionedUserId of input.mentionUserIds) {
      this.deps.eventPublisher.publish({
        name: "MentionDetected",
        occurredAt: input.occurredAt,
        payload: {
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          threadId: input.threadId,
          actorId: input.actorId,
          mentionedUserId
        }
      });
    }
  }

  private assertKnowledgeRelationship(
    type: ThreadType,
    relatedRequirementThreadId: string | null,
    relatedTaskId: string | null
  ): void {
    if (type === "requirement" && (relatedRequirementThreadId || relatedTaskId)) {
      throw new AppError(
        ErrorCode.InvalidParams,
        "requirement thread cannot set related_requirement_thread_id or related_task_id",
        400
      );
    }

    if (type === "knowledge" && relatedRequirementThreadId && relatedTaskId) {
      throw new AppError(
        ErrorCode.InvalidParams,
        "knowledge thread can only set one of related_requirement_thread_id or related_task_id",
        400
      );
    }
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

