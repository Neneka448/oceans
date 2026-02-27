import { describe, it, expect, beforeEach } from "vitest";
import { ConversationService } from "./conversation-service.js";
import { ConversationMemoryRepository } from "../infra/conversation-memory-repository.js";
import { UserMemoryRepository } from "../infra/user-memory-repository.js";
import { MessageMemoryRepository } from "../../message/infra/message-memory-repository.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../shared/errors/error-code.js";

let idCounter = 0;
const generateId = (): string => {
  idCounter++;
  return `id-${idCounter}`;
};

describe("ConversationService", () => {
  let service: ConversationService;
  let convRepo: ConversationMemoryRepository;
  let userRepo: UserMemoryRepository;
  let msgRepo: MessageMemoryRepository;

  beforeEach(() => {
    convRepo = new ConversationMemoryRepository();
    userRepo = new UserMemoryRepository();
    msgRepo = new MessageMemoryRepository();
    service = new ConversationService(convRepo, userRepo, msgRepo, generateId);

    // Setup test users
    userRepo.save({ id: "user-1", username: "Alice", avatar: "avatar1.png" });
    userRepo.save({ id: "user-2", username: "Bob", avatar: "avatar2.png" });
    userRepo.save({ id: "user-3", username: "Charlie", avatar: null });
  });

  describe("getOrCreateConversation", () => {
    it("should create new conversation when none exists", () => {
      const result = service.getOrCreateConversation("user-1", "user-2");

      expect(result.created).toBe(true);
      expect(result.conversation_id).toBeDefined();
    });

    it("should return existing conversation when one exists", () => {
      const first = service.getOrCreateConversation("user-1", "user-2");
      const second = service.getOrCreateConversation("user-1", "user-2");

      expect(second.created).toBe(false);
      expect(second.conversation_id).toBe(first.conversation_id);
    });

    it("should return existing conversation regardless of order", () => {
      const first = service.getOrCreateConversation("user-1", "user-2");
      const second = service.getOrCreateConversation("user-2", "user-1");

      expect(second.created).toBe(false);
      expect(second.conversation_id).toBe(first.conversation_id);
    });

    it("should reject self-conversation", () => {
      expect(() => service.getOrCreateConversation("user-1", "user-1")).toThrow(
        AppError
      );
      expect(() => service.getOrCreateConversation("user-1", "user-1")).toThrow(
        "Cannot create conversation with yourself"
      );
    });

    it("should reject when peer user not found", () => {
      expect(() =>
        service.getOrCreateConversation("user-1", "nonexistent")
      ).toThrow(AppError);
    });
  });

  describe("validateParticipant", () => {
    it("should pass for valid participant", () => {
      const conv = service.getOrCreateConversation("user-1", "user-2");

      expect(() => {
        service.validateParticipant(conv.conversation_id, "user-1");
      }).not.toThrow();
    });

    it("should reject for non-participant", () => {
      const conv = service.getOrCreateConversation("user-1", "user-2");

      expect(() => {
        service.validateParticipant(conv.conversation_id, "user-3");
      }).toThrow(AppError);
    });

    it("should reject for non-existent conversation", () => {
      expect(() => {
        service.validateParticipant("nonexistent", "user-1");
      }).toThrow(AppError);
    });
  });

  describe("getConversations", () => {
    it("should return empty list when no conversations", () => {
      const result = service.getConversations("user-1", 1, 10);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("should return conversations for user", () => {
      service.getOrCreateConversation("user-1", "user-2");
      service.getOrCreateConversation("user-1", "user-3");

      const result = service.getConversations("user-1", 1, 10);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should not return other users' conversations", () => {
      service.getOrCreateConversation("user-1", "user-2");

      const result = service.getConversations("user-3", 1, 10);

      expect(result.items).toHaveLength(0);
    });

    it("should support pagination", () => {
      service.getOrCreateConversation("user-1", "user-2");
      service.getOrCreateConversation("user-1", "user-3");

      const result = service.getConversations("user-1", 1, 1);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(2);
    });
  });

  describe("updateOnNewMessage", () => {
    it("should update last message time", () => {
      const conv = service.getOrCreateConversation("user-1", "user-2");
      const now = new Date();

      service.updateOnNewMessage(conv.conversation_id, "user-1", now);

      const updated = convRepo.findById(conv.conversation_id);
      expect(updated?.lastMessageAt).toEqual(now);
    });

    it("should increment peer unread count", () => {
      const conv = service.getOrCreateConversation("user-1", "user-2");

      service.updateOnNewMessage(conv.conversation_id, "user-1", new Date());

      const updated = convRepo.findById(conv.conversation_id);
      expect(updated?.unreadCountB).toBe(1); // user-2's count
      expect(updated?.unreadCountA).toBe(0);
    });
  });

  describe("clearUnreadCount", () => {
    it("should clear unread count for user", () => {
      const conv = service.getOrCreateConversation("user-1", "user-2");
      service.updateOnNewMessage(conv.conversation_id, "user-2", new Date());

      service.clearUnreadCount(conv.conversation_id, "user-1");

      const updated = convRepo.findById(conv.conversation_id);
      expect(updated?.unreadCountA).toBe(0);
    });
  });
});
