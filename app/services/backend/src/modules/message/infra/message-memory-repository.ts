import { Message } from "../domain/message.js";
import type { MessageRepository } from "../domain/message-repository.js";

/**
 * Message 内存仓储实现
 * MVP 阶段使用内存存储
 */
export class MessageMemoryRepository implements MessageRepository {
  private messages: Map<string, Message> = new Map();

  findById(id: string): Message | null {
    const message = this.messages.get(id);
    return message ? this.clone(message) : null;
  }

  findByConversationId(conversationId: string): Message[] {
    const result: Message[] = [];
    for (const message of this.messages.values()) {
      if (message.conversationId === conversationId) {
        result.push(this.clone(message));
      }
    }
    // 按创建时间降序排序，时间相同时按ID降序（确保稳定性）
    return result.sort((a, b) => {
      const timeDiff = b.createdAt.getTime() - a.createdAt.getTime();
      if (timeDiff !== 0) return timeDiff;
      // 时间相同时，按ID降序排序（假设ID包含时间戳或自增）
      return b.id.localeCompare(a.id);
    });
  }

  findByConversationIdWithCursor(
    conversationId: string,
    beforeMessageId: string | null,
    pageSize: number
  ): { messages: Message[]; hasMore: boolean } {
    // 获取会话的所有消息（已按时间降序排序）
    let messages = this.findByConversationId(conversationId);

    // 如果指定了 beforeMessageId，找到该消息的位置，返回其后的消息
    if (beforeMessageId) {
      const index = messages.findIndex((m) => m.id === beforeMessageId);
      if (index !== -1) {
        messages = messages.slice(index + 1);
      }
    }

    // 分页
    const hasMore = messages.length > pageSize;
    const pagedMessages = messages.slice(0, pageSize);

    return {
      messages: pagedMessages,
      hasMore
    };
  }

  save(message: Message): void {
    this.messages.set(message.id, this.clone(message));
  }

  findLastMessageContent(conversationId: string): string | null {
    const messages = this.findByConversationId(conversationId);
    return messages.length > 0 ? messages[0].content : null;
  }

  count(): number {
    return this.messages.size;
  }

  countByConversationId(conversationId: string): number {
    let count = 0;
    for (const message of this.messages.values()) {
      if (message.conversationId === conversationId) {
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.messages.clear();
  }

  /**
   * 深拷贝消息对象，防止外部修改影响存储
   */
  private clone(message: Message): Message {
    return new Message(
      message.id,
      message.conversationId,
      message.senderId,
      message.content,
      message.relatedTaskId,
      new Date(message.createdAt)
    );
  }
}
