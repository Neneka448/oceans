import { Conversation } from "../domain/conversation.js";
import type { ConversationRepository } from "../domain/conversation-repository.js";

/**
 * Conversation 内存仓储实现
 * MVP 阶段使用内存存储
 */
export class ConversationMemoryRepository implements ConversationRepository {
  private conversations: Map<string, Conversation> = new Map();

  findById(id: string): Conversation | null {
    const conversation = this.conversations.get(id);
    return conversation ? this.clone(conversation) : null;
  }

  findByParticipants(user1Id: string, user2Id: string): Conversation | null {
    // 不考虑顺序，查找两个用户之间的会话
    for (const conversation of this.conversations.values()) {
      if (
        (conversation.participantAId === user1Id &&
          conversation.participantBId === user2Id) ||
        (conversation.participantAId === user2Id &&
          conversation.participantBId === user1Id)
      ) {
        return this.clone(conversation);
      }
    }
    return null;
  }

  findByParticipant(userId: string): Conversation[] {
    const result: Conversation[] = [];
    for (const conversation of this.conversations.values()) {
      if (
        conversation.participantAId === userId ||
        conversation.participantBId === userId
      ) {
        result.push(this.clone(conversation));
      }
    }
    // 按最后消息时间降序排序
    return result.sort((a, b) => {
      const timeA = a.lastMessageAt?.getTime() ?? 0;
      const timeB = b.lastMessageAt?.getTime() ?? 0;
      return timeB - timeA;
    });
  }

  save(conversation: Conversation): void {
    this.conversations.set(conversation.id, this.clone(conversation));
  }

  count(): number {
    return this.conversations.size;
  }

  clear(): void {
    this.conversations.clear();
  }

  /**
   * 深拷贝会话对象，防止外部修改影响存储
   */
  private clone(conversation: Conversation): Conversation {
    return new Conversation(
      conversation.id,
      conversation.participantAId,
      conversation.participantBId,
      conversation.lastMessageAt ? new Date(conversation.lastMessageAt) : null,
      conversation.unreadCountA,
      conversation.unreadCountB,
      new Date(conversation.createdAt)
    );
  }
}
