/**
 * Message 领域模型
 * 代表私信消息
 */
export class Message {
  constructor(
    public readonly id: string,
    public readonly conversationId: string,
    public readonly senderId: string,
    public content: string,
    public readonly relatedTaskId: string | null,
    public readonly createdAt: Date
  ) {}

  /**
   * 创建新消息
   */
  static create(
    id: string,
    conversationId: string,
    senderId: string,
    content: string,
    relatedTaskId: string | null = null
  ): Message {
    return new Message(
      id,
      conversationId,
      senderId,
      content,
      relatedTaskId,
      new Date()
    );
  }
}

/**
 * MessageCreated 领域事件
 * 当新消息创建时触发
 */
export class MessageCreated {
  constructor(
    public readonly messageId: string,
    public readonly conversationId: string,
    public readonly senderId: string,
    public readonly senderName: string,
    public readonly content: string,
    public readonly recipientId: string,
    public readonly createdAt: Date
  ) {}
}
