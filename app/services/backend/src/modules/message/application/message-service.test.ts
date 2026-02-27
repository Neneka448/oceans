import { describe, it, expect, beforeEach, vi } from "vitest";
import { MessageService } from "./message-service.js";
import { MessageMemoryRepository } from "../infra/message-memory-repository.js";
import { ConversationMemoryRepository } from "../../conversation/infra/conversation-memory-repository.js";
import { UserMemoryRepository } from "../../conversation/infra/user-memory-repository.js";
import { ConversationService } from "../../conversation/application/conversation-service.js";
import { SimpleMessageEventPublisher } from "../domain/message-event-publisher.js";
import type { MessageCreated } from "../domain/message.js";
import { AppError } from "../../../shared/errors/app-error.js";

let idCounter = 0;
const generateId = (): string => {
  idCounter++;
  return `id-${idCounter}`;
};

describe("MessageService", () => {
  let service: MessageService;
  let msgRepo: MessageMemoryRepository;
  let convRepo: ConversationMemoryRepository;
  let userRepo: UserMemoryRepository;
  let convService: ConversationService;
  let eventPublisher: SimpleMessageEventPublisher;

  beforeEach(() => {
    msgRepo = new MessageMemoryRepository();
    convRepo = new ConversationMemoryRepository();
    userRepo = new UserMemoryRepository();
    eventPublisher = new SimpleMessageEventPublisher();
    convService = new ConversationService(
      convRepo,
      userRepo,
      msgRepo,
      generateId
    );
    service = new MessageService(
      msgRepo,
      convService,
      userRepo,
      eventPublisher,
      generateId
    );

    // Setup test users
    userRepo.save({ id: "user-1", username: "Alice", avatar: null });
    userRepo.save({ id: "user-2", username: "Bob", avatar: null });
  });

  describe("sendMessage", () => {
    it("should send message successfully", () => {
      const convResult = convService.getOrCreateConversation("user-1", "user-2");

      const result = service.sendMessage(
        convResult.conversation_id,
        "user-1",
        "Hello!",
        null
      );

      expect(result.message_id).toBeDefined();
      expect(result.created_at).toBeDefined();
    });

    it("should reject empty content", () => {
      const convResult = convService.getOrCreateConversation("user-1", "user-2");

      expect(() => {
        service.sendMessage(convResult.conversation_id, "user-1", "   ", null);
      }).toThrow(AppError);
    });

    it("should reject non-participant sender", () => {
      const convResult = convService.getOrCreateConversation("user-1", "user-2");
      userRepo.save({ id: "user-3", username: "Charlie", avatar: null });

      expect(() => {
        service.sendMessage(
          convResult.conversation_id,
          "user-3",
          "Hello!",
          null
        );
      }).toThrow(AppError);
    });

    it("should update conversation last message time", () => {
      const convResult = convService.getOrCreateConversation("user-1", "user-2");

      service.sendMessage(convResult.conversation_id, "user-1", "Hello!", null);

      const conv = convRepo.findById(convResult.conversation_id);
      expect(conv?.lastMessageAt).not.toBeNull();
    });

    it("should increment peer unread count", () => {
      const convResult = convService.getOrCreateConversation("user-1", "user-2");

      service.sendMessage(convResult.conversation_id, "user-1", "Hello!", null);

      const conv = convRepo.findById(convResult.conversation_id);
      expect(conv?.unreadCountB).toBe(1); // user-2's count
    });

    it("should publish MessageCreated event", () => {
      const handler = vi.fn();
      eventPublisher.subscribe(handler);

      const convResult = convService.getOrCreateConversation("user-1", "user-2");
      service.sendMessage(convResult.conversation_id, "user-1", "Hello!", null);

      expect(handler).toHaveBeenCalledOnce();
      const event = handler.mock.calls[0][0] as MessageCreated;
      expect(event.conversationId).toBe(convResult.conversation_id);
      expect(event.senderId).toBe("user-1");
      expect(event.recipientId).toBe("user-2");
      expect(event.content).toBe("Hello!");
    });
  });

  describe("getMessages", () => {
    it("should return messages for participant", () => {
      const convResult = convService.getOrCreateConversation("user-1", "user-2");
      service.sendMessage(convResult.conversation_id, "user-1", "Hello!", null);
      service.sendMessage(convResult.conversation_id, "user-2", "Hi!", null);

      const result = service.getMessages(
        convResult.conversation_id,
        "user-1",
        null,
        10
      );

      expect(result.items).toHaveLength(2);
      expect(result.has_more).toBe(false);
    });

    it("should reject non-participant access", () => {
      const convResult = convService.getOrCreateConversation("user-1", "user-2");
      userRepo.save({ id: "user-3", username: "Charlie", avatar: null });

      expect(() => {
        service.getMessages(convResult.conversation_id, "user-3", null, 10);
      }).toThrow(AppError);
    });

    it("should clear unread count when fetching messages", () => {
      const convResult = convService.getOrCreateConversation("user-1", "user-2");
      service.sendMessage(convResult.conversation_id, "user-2", "Hello!", null);

      // user-1 fetches messages
      service.getMessages(convResult.conversation_id, "user-1", null, 10);

      const conv = convRepo.findById(convResult.conversation_id);
      expect(conv?.unreadCountA).toBe(0);
    });

    it("should support cursor pagination", () => {
      const convResult = convService.getOrCreateConversation("user-1", "user-2");

      // Send 5 messages
      const messageIds: string[] = [];
      for (let i = 0; i < 5; i++) {
        const result = service.sendMessage(
          convResult.conversation_id,
          "user-1",
          `Message ${i}`,
          null
        );
        messageIds.push(result.message_id);
      }

      // Get first 2
      const firstPage = service.getMessages(
        convResult.conversation_id,
        "user-1",
        null,
        2
      );
      expect(firstPage.items).toHaveLength(2);
      expect(firstPage.has_more).toBe(true);

      // Get next page using cursor
      const secondPage = service.getMessages(
        convResult.conversation_id,
        "user-1",
        firstPage.items[1].message_id,
        2
      );
      expect(secondPage.items).toHaveLength(2);
      expect(secondPage.has_more).toBe(true);
    });
  });

  describe("getLastMessageContent", () => {
    it("should return last message content", () => {
      const convResult = convService.getOrCreateConversation("user-1", "user-2");
      service.sendMessage(convResult.conversation_id, "user-1", "Hello!", null);
      service.sendMessage(convResult.conversation_id, "user-1", "Latest!", null);

      const content = service.getLastMessageContent(convResult.conversation_id);
      expect(content).toBe("Latest!");
    });

    it("should return null when no messages", () => {
      const convResult = convService.getOrCreateConversation("user-1", "user-2");

      const content = service.getLastMessageContent(convResult.conversation_id);
      expect(content).toBeNull();
    });
  });
});
