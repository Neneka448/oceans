import { describe, it, expect, beforeEach } from "vitest";
import { Conversation } from "./conversation.js";

describe("Conversation Domain", () => {
  describe("create", () => {
    it("should create a conversation with two participants", () => {
      const conv = Conversation.create("conv-1", "user-a", "user-b");

      expect(conv.id).toBe("conv-1");
      expect(conv.participantAId).toBe("user-a");
      expect(conv.participantBId).toBe("user-b");
      expect(conv.lastMessageAt).toBeNull();
      expect(conv.unreadCountA).toBe(0);
      expect(conv.unreadCountB).toBe(0);
    });
  });

  describe("isParticipant", () => {
    it("should return true for participant A", () => {
      const conv = Conversation.create("conv-1", "user-a", "user-b");
      expect(conv.isParticipant("user-a")).toBe(true);
    });

    it("should return true for participant B", () => {
      const conv = Conversation.create("conv-1", "user-a", "user-b");
      expect(conv.isParticipant("user-b")).toBe(true);
    });

    it("should return false for non-participant", () => {
      const conv = Conversation.create("conv-1", "user-a", "user-b");
      expect(conv.isParticipant("user-c")).toBe(false);
    });
  });

  describe("getPeerUserId", () => {
    it("should return B when called by A", () => {
      const conv = Conversation.create("conv-1", "user-a", "user-b");
      expect(conv.getPeerUserId("user-a")).toBe("user-b");
    });

    it("should return A when called by B", () => {
      const conv = Conversation.create("conv-1", "user-a", "user-b");
      expect(conv.getPeerUserId("user-b")).toBe("user-a");
    });

    it("should return null for non-participant", () => {
      const conv = Conversation.create("conv-1", "user-a", "user-b");
      expect(conv.getPeerUserId("user-c")).toBeNull();
    });
  });

  describe("unread count management", () => {
    it("should increment unread count for user", () => {
      const conv = Conversation.create("conv-1", "user-a", "user-b");
      conv.incrementUnreadCount("user-a");
      expect(conv.unreadCountA).toBe(1);
    });

    it("should clear unread count for user", () => {
      const conv = Conversation.create("conv-1", "user-a", "user-b");
      conv.incrementUnreadCount("user-a");
      conv.incrementUnreadCount("user-a");
      expect(conv.unreadCountA).toBe(2);

      conv.clearUnreadCount("user-a");
      expect(conv.unreadCountA).toBe(0);
    });

    it("should track unread counts independently for each user", () => {
      const conv = Conversation.create("conv-1", "user-a", "user-b");
      conv.incrementUnreadCount("user-a");
      conv.incrementUnreadCount("user-b");

      expect(conv.unreadCountA).toBe(1);
      expect(conv.unreadCountB).toBe(1);
    });
  });

  describe("updateLastMessageAt", () => {
    it("should update last message timestamp", () => {
      const conv = Conversation.create("conv-1", "user-a", "user-b");
      const now = new Date();
      conv.updateLastMessageAt(now);

      expect(conv.lastMessageAt).toEqual(now);
    });
  });
});
