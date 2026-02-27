/**
 * Conversation 领域模型
 * 代表私信会话，包含双方参与者、未读计数和最后消息时间
 */
export class Conversation {
  constructor(
    public readonly id: string,
    public readonly participantAId: string,
    public readonly participantBId: string,
    public lastMessageAt: Date | null,
    public unreadCountA: number,
    public unreadCountB: number,
    public readonly createdAt: Date
  ) {}

  /**
   * 检查用户是否为会话参与者
   */
  isParticipant(userId: string): boolean {
    return this.participantAId === userId || this.participantBId === userId;
  }

  /**
   * 获取指定用户的对方用户ID
   */
  getPeerUserId(userId: string): string | null {
    if (this.participantAId === userId) return this.participantBId;
    if (this.participantBId === userId) return this.participantAId;
    return null;
  }

  /**
   * 获取指定用户的未读数
   */
  getUnreadCount(userId: string): number {
    if (this.participantAId === userId) return this.unreadCountA;
    if (this.participantBId === userId) return this.unreadCountB;
    return 0;
  }

  /**
   * 增加指定用户的未读数
   */
  incrementUnreadCount(userId: string): void {
    if (this.participantAId === userId) {
      this.unreadCountA++;
    } else if (this.participantBId === userId) {
      this.unreadCountB++;
    }
  }

  /**
   * 清除指定用户的未读数
   */
  clearUnreadCount(userId: string): void {
    if (this.participantAId === userId) {
      this.unreadCountA = 0;
    } else if (this.participantBId === userId) {
      this.unreadCountB = 0;
    }
  }

  /**
   * 更新最后消息时间
   */
  updateLastMessageAt(timestamp: Date): void {
    this.lastMessageAt = timestamp;
  }

  /**
   * 创建新的会话
   */
  static create(
    id: string,
    participantAId: string,
    participantBId: string
  ): Conversation {
    return new Conversation(
      id,
      participantAId,
      participantBId,
      null,
      0,
      0,
      new Date()
    );
  }
}
