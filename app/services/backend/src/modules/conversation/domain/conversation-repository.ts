import type { Conversation } from "./conversation.js";

/**
 * Conversation 仓储接口
 */
export interface ConversationRepository {
  /**
   * 根据ID查找会话
   */
  findById(id: string): Conversation | null;

  /**
   * 查找两个用户之间的会话
   * 不考虑顺序，即 (user1, user2) 和 (user2, user1) 是相同的
   */
  findByParticipants(user1Id: string, user2Id: string): Conversation | null;

  /**
   * 查找用户参与的所有会话
   */
  findByParticipant(userId: string): Conversation[];

  /**
   * 保存会话（新增或更新）
   */
  save(conversation: Conversation): void;

  /**
   * 获取所有会话数量
   */
  count(): number;

  /**
   * 清空所有会话（用于测试）
   */
  clear(): void;
}
