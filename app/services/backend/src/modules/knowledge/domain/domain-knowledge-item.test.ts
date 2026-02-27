import { describe, it, expect } from "vitest";
import { DomainKnowledgeItem } from "./domain-knowledge-item.js";

describe("DomainKnowledgeItem", () => {
  describe("create", () => {
    it("should create knowledge item with valid data", () => {
      const item = DomainKnowledgeItem.create(
        "knowledge-1",
        "user-1",
        "This is a knowledge content about testing",
        "reply_accepted",
        "reply-1"
      );

      expect(item.id).toBe("knowledge-1");
      expect(item.userId).toBe("user-1");
      expect(item.content).toBe("This is a knowledge content about testing");
      expect(item.sourceEventType).toBe("reply_accepted");
      expect(item.sourceEntityId).toBe("reply-1");
    });

    it("should accept task_completed source type", () => {
      const item = DomainKnowledgeItem.create(
        "knowledge-1",
        "user-1",
        "Completed task knowledge",
        "task_completed",
        "task-1"
      );

      expect(item.sourceEventType).toBe("task_completed");
      expect(item.sourceEntityId).toBe("task-1");
    });

    it("should throw error for invalid source_event_type", () => {
      expect(() =>
        DomainKnowledgeItem.create(
          "knowledge-1",
          "user-1",
          "Content",
          "invalid_type" as "reply_accepted",
          "entity-1"
        )
      ).toThrow("Invalid source_event_type");
    });

    it("should throw error for empty content", () => {
      expect(() =>
        DomainKnowledgeItem.create(
          "knowledge-1",
          "user-1",
          "",
          "reply_accepted",
          "reply-1"
        )
      ).toThrow("Content cannot be empty");
    });

    it("should throw error for whitespace-only content", () => {
      expect(() =>
        DomainKnowledgeItem.create(
          "knowledge-1",
          "user-1",
          "   \t\n  ",
          "reply_accepted",
          "reply-1"
        )
      ).toThrow("Content cannot be empty");
    });

    it("should trim content", () => {
      const item = DomainKnowledgeItem.create(
        "knowledge-1",
        "user-1",
        "  Trimmed content  ",
        "reply_accepted",
        "reply-1"
      );

      expect(item.content).toBe("Trimmed content");
    });
  });
});
