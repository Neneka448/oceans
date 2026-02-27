import { AppError } from "../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../shared/errors/error-code.js";
import { Conversation } from "../domain/conversation.js";
import type { ConversationRepository } from "../domain/conversation-repository.js";

export type ConversationListItem = {
  conversation_id: string;
  peer_user_id: string;
  peer_username: string;
  peer_avatar: string;
  last_message: string;
  unread_count: number;
  last_message_at: string;
};

export type ConversationListResult = {
  items: ConversationListItem[];
  total: number;
  page: number;
  page_size: number;
};

export type GetOrCreateResult = {
  conversation_id: string;
  created: boolean;
};

/**
 * 用户仓储接口（用于获取用户信息）
 */
export interface UserRepository {
  findById(id: string): { id: string; username: string; avatar: string | null } | null;
}

/**
 * 消息仓储接口（用于获取最后一条消息）
 */
export interface MessagePreviewRepository {
  findLastMessageContent(conversationId: string): string | null;
}

export class ConversationService {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly userRepo: UserRepository,
    private readonly messageRepo: MessagePreviewRepository,
    private readonly generateId: () => string
  ) {}

  /**
   * 获取用户的会话列表
   */
  getConversations(
    userId: string,
    page: number,
    pageSize: number
  ): ConversationListResult {
    const allConversations = this.conversationRepo.findByParticipant(userId);
    const total = allConversations.length;

    // 分页
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pagedConversations = allConversations.slice(startIndex, endIndex);

    const items: ConversationListItem[] = pagedConversations.map((conv) => {
      const peerUserId = conv.getPeerUserId(userId)!;
      const peerUser = this.userRepo.findById(peerUserId);
      const lastMessage = this.messageRepo.findLastMessageContent(conv.id);

      return {
        conversation_id: conv.id,
        peer_user_id: peerUserId,
        peer_username: peerUser?.username ?? "Unknown",
        peer_avatar: peerUser?.avatar ?? "",
        last_message: lastMessage ?? "",
        unread_count: conv.getUnreadCount(userId),
        last_message_at: conv.lastMessageAt?.toISOString() ?? ""
      };
    });

    return {
      items,
      total,
      page,
      page_size: pageSize
    };
  }

  /**
   * 获取或创建会话
   */
  getOrCreateConversation(
    currentUserId: string,
    peerUserId: string
  ): GetOrCreateResult {
    // 检查是否尝试与自己建立会话
    if (currentUserId === peerUserId) {
      throw new AppError(
        ErrorCode.SelfConversation,
        "Cannot create conversation with yourself",
        400
      );
    }

    // 检查对方用户是否存在
    const peerUser = this.userRepo.findById(peerUserId);
    if (!peerUser) {
      throw new AppError(
        ErrorCode.NotFound,
        "Peer user not found",
        404
      );
    }

    // 查找是否已存在会话
    const existingConversation = this.conversationRepo.findByParticipants(
      currentUserId,
      peerUserId
    );

    if (existingConversation) {
      return {
        conversation_id: existingConversation.id,
        created: false
      };
    }

    // 创建新会话
    const conversationId = this.generateId();
    const conversation = Conversation.create(
      conversationId,
      currentUserId,
      peerUserId
    );

    this.conversationRepo.save(conversation);

    return {
      conversation_id: conversationId,
      created: true
    };
  }

  /**
   * 验证用户是否为会话参与者
   */
  validateParticipant(conversationId: string, userId: string): void {
    const conversation = this.conversationRepo.findById(conversationId);
    if (!conversation) {
      throw new AppError(
        ErrorCode.NotFound,
        "Conversation not found",
        404
      );
    }

    if (!conversation.isParticipant(userId)) {
      throw new AppError(
        ErrorCode.NotParticipant,
        "You are not a participant of this conversation",
        403
      );
    }
  }

  /**
   * 更新会话的最后消息时间和未读数
   */
  updateOnNewMessage(
    conversationId: string,
    senderId: string,
    timestamp: Date
  ): void {
    const conversation = this.conversationRepo.findById(conversationId);
    if (!conversation) return;

    conversation.updateLastMessageAt(timestamp);

    // 增加对方的未读数
    const peerId = conversation.getPeerUserId(senderId);
    if (peerId) {
      conversation.incrementUnreadCount(peerId);
    }

    this.conversationRepo.save(conversation);
  }

  /**
   * 清除用户的未读数
   */
  clearUnreadCount(conversationId: string, userId: string): void {
    const conversation = this.conversationRepo.findById(conversationId);
    if (!conversation) return;

    conversation.clearUnreadCount(userId);
    this.conversationRepo.save(conversation);
  }

  /**
   * 获取会话信息
   */
  getConversation(conversationId: string): Conversation | null {
    return this.conversationRepo.findById(conversationId);
  }
}
