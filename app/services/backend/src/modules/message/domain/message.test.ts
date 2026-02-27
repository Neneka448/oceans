import { describe, it, expect } from "vitest";
import { Message, MessageCreated } from "./message.js";

describe("Message Domain", () => {
  describe("create", () => {
    it("should create a message with required fields", () => {
      const msg = Message.create("msg-1", "conv-1", "user-1", "Hello!");

      expect(msg.id).toBe("msg-1");
      expect(msg.conversationId).toBe("conv-1");
      expect(msg.senderId).toBe("user-1");
      expect(msg.content).toBe("Hello!");
      expect(msg.relatedTaskId).toBeNull();
      expect(msg.createdAt).toBeInstanceOf(Date);
    });

    it("should create a message with related task", () => {
      const msg = Message.create("msg-1", "conv-1", "user-1", "Hello!", "task-1");

      expect(msg.relatedTaskId).toBe("task-1");
    });
  });
});

describe("MessageCreated Event", () => {
  it("should create event with all fields", () => {
    const now = new Date();
    const event = new MessageCreated(
      "msg-1",
      "conv-1",
      "user-1",
      "Alice",
      "Hello!",
      "user-2",
      now
    );

    expect(event.messageId).toBe("msg-1");
    expect(event.conversationId).toBe("conv-1");
    expect(event.senderId).toBe("user-1");
    expect(event.senderName).toBe("Alice");
    expect(event.content).toBe("Hello!");
    expect(event.recipientId).toBe("user-2");
    expect(event.createdAt).toBe(now);
  });
});
