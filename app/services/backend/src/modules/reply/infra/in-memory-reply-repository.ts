import type { ReplyEntity } from "../domain/reply.js";
import type { ReplyRepository } from "../domain/reply-repository.js";

const cloneReply = (reply: ReplyEntity): ReplyEntity => ({
  ...reply,
  mentionUserIds: [...reply.mentionUserIds]
});

export class InMemoryReplyRepository implements ReplyRepository {
  private readonly replies = new Map<string, ReplyEntity>();

  save(reply: ReplyEntity): void {
    this.replies.set(reply.id, cloneReply(reply));
  }

  findById(replyId: string): ReplyEntity | undefined {
    const found = this.replies.get(replyId);
    return found ? cloneReply(found) : undefined;
  }

  listByThreadId(threadId: string): ReplyEntity[] {
    return [...this.replies.values()]
      .filter((reply) => reply.threadId === threadId)
      .map((reply) => cloneReply(reply));
  }

  countByThreadId(threadId: string): number {
    let count = 0;

    for (const reply of this.replies.values()) {
      if (reply.threadId === threadId) {
        count += 1;
      }
    }

    return count;
  }

  hasAcceptedReply(threadId: string): boolean {
    for (const reply of this.replies.values()) {
      if (reply.threadId === threadId && reply.isAccepted) {
        return true;
      }
    }

    return false;
  }
}

