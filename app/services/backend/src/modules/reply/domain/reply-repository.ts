import type { ReplyEntity } from "./reply.js";

export interface ReplyRepository {
  save(reply: ReplyEntity): void;
  findById(replyId: string): ReplyEntity | undefined;
  listByThreadId(threadId: string): ReplyEntity[];
  countByThreadId(threadId: string): number;
  hasAcceptedReply(threadId: string): boolean;
}

