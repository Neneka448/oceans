import type { Message } from "./message.js";

/**
 * Message 仓储接口
 */
export interface MessageRepository {
  /**
   * 根据ID查找消息
   */
  findById(id: string): Message | null;

  /**
   * 查找会话中的所有消息
   * 按创建时间降序排列
   */
  findByConversationId(conversationId: string): Message[];

  /**
   * 游标分页查询消息
   * @param conversationId 会话ID
   * @param beforeMessageId 在此消息ID之前（不包含）
   * @param pageSize 每页数量
   */
  findByConversationIdWithCursor(
    conversationId: string,
    beforeMessageId: string | null,
    pageSize: number
  ): { messages: Message[]; hasMore: boolean };

  /**
   * 保存消息
   */
  save(message: Message): void;

  /**
   * 获取会话的最后一条消息内容
   */
  findLastMessageContent(conversationId: string): string | null;

  /**
   * 获取所有消息数量
   */
  count(): number;

  /**
   * 获取指定会话的消息数量
   */
  countByConversationId(conversationId: string): number;

  /**
   * 清空所有消息（用于测试）
   */
  clear(): void;
}
