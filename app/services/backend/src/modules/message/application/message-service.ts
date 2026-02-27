import { AppError } from "../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../shared/errors/error-code.js";
import type { ConversationService } from "../../conversation/application/conversation-service.js";
import { Message, MessageCreated } from "../domain/message.js";
import type { MessageRepository } from "../domain/message-repository.js";

export type MessageItem = {
  message_id: string;
  sender_id: string;
  content: string;
  related_task_id: string | null;
  created_at: string;
};

export type MessageListResult = {
  items: MessageItem[];
  has_more: boolean;
};

export type SendMessageResult = {
  message_id: string;
  created_at: string;
};

/**
 * 用户仓储接口（用于获取用户信息）
 */
export interface UserRepository {
  findById(id: string): { id: string; username: string } | null;
}

/**
 * 消息发送器接口（用于发布领域事件）
 */
export interface MessageEventPublisher {
  publishMessageCreated(event: MessageCreated): void;
}

export class MessageService {
  constructor(
    private readonly messageRepo: MessageRepository,
    private readonly conversationService: ConversationService,
    private readonly userRepo: UserRepository,
    private readonly eventPublisher: MessageEventPublisher,
    private readonly generateId: () => string
  ) {}

  /**
   * 获取会话的消息历史
   * 使用游标分页
   */
  getMessages(
    conversationId: string,
    userId: string,
    beforeMessageId: string | null,
    pageSize: number
  ): MessageListResult {
    // 验证用户是否为会话参与者
    this.conversationService.validateParticipant(conversationId, userId);

    // 限制分页大小
    const limit = Math.min(100, Math.max(1, pageSize));

    // 查询消息
    const { messages, hasMore } =
      this.messageRepo.findByConversationIdWithCursor(
        conversationId,
        beforeMessageId,
        limit
      );

    // 清除用户的未读数（用户已读消息）
    this.conversationService.clearUnreadCount(conversationId, userId);

    return {
      items: messages.map((msg) => ({
        message_id: msg.id,
        sender_id: msg.senderId,
        content: msg.content,
        related_task_id: msg.relatedTaskId,
        created_at: msg.createdAt.toISOString()
      })),
      has_more: hasMore
    };
  }

  /**
   * 发送消息
   */
  sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    relatedTaskId: string | null
  ): SendMessageResult {
    // 验证内容不为空
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      throw new AppError(
        ErrorCode.InvalidParams,
        "content is required",
        400,
        { field: "content" }
      );
    }

    // 验证用户是否为会话参与者
    this.conversationService.validateParticipant(conversationId, senderId);

    // 创建消息
    const messageId = this.generateId();
    const message = Message.create(
      messageId,
      conversationId,
      senderId,
      trimmedContent,
      relatedTaskId
    );

    // 保存消息
    this.messageRepo.save(message);

    // 更新会话的最后消息时间和未读数
    this.conversationService.updateOnNewMessage(
      conversationId,
      senderId,
      message.createdAt
    );

    // 获取发送者信息
    const sender = this.userRepo.findById(senderId);

    // 获取会话并验证
    const conversation = this.conversationService.getConversation(conversationId);
    if (!conversation) {
      throw new AppError(ErrorCode.NotFound, "Conversation not found", 404);
    }

    // 获取接收者ID（对方）
    const recipientId = conversation.getPeerUserId(senderId);
    if (!recipientId) {
      throw new AppError(ErrorCode.NotParticipant, "Invalid sender", 403);
    }

    // 发布 MessageCreated 领域事件
    const event = new MessageCreated(
      messageId,
      conversationId,
      senderId,
      sender?.username ?? "Unknown",
      trimmedContent,
      recipientId,
      message.createdAt
    );
    this.eventPublisher.publishMessageCreated(event);

    return {
      message_id: messageId,
      created_at: message.createdAt.toISOString()
    };
  }

  /**
   * 获取会话的最后一条消息内容
   */
  getLastMessageContent(conversationId: string): string | null {
    return this.messageRepo.findLastMessageContent(conversationId);
  }
}
