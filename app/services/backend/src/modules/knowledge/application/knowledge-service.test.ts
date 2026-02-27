import { describe, it, expect, beforeEach } from "vitest";
import { KnowledgeService } from "./knowledge-service.js";
import { KnowledgeMemoryRepository } from "../infra/knowledge-memory-repository.js";

describe("KnowledgeService", () => {
  let repository: KnowledgeMemoryRepository;
  let service: KnowledgeService;

  beforeEach(() => {
    repository = new KnowledgeMemoryRepository();
    service = new KnowledgeService(repository);
  });

  describe("createKnowledge", () => {
    it("should create knowledge item for reply_accepted", async () => {
      const result = await service.createKnowledge({
        userId: "user-1",
        content: "Knowledge from accepted reply",
        sourceEventType: "reply_accepted",
        sourceEntityId: "reply-123"
      });

      expect(result.knowledgeId).toBeDefined();
      expect(result.created).toBe(true);
    });

    it("should create knowledge item for task_completed", async () => {
      const result = await service.createKnowledge({
        userId: "user-1",
        content: "Knowledge from completed task",
        sourceEventType: "task_completed",
        sourceEntityId: "task-456"
      });

      expect(result.knowledgeId).toBeDefined();
      expect(result.created).toBe(true);
    });

    it("should not create duplicate for same user, source type and entity", async () => {
      // First creation
      await service.createKnowledge({
        userId: "user-1",
        content: "Original knowledge",
        sourceEventType: "reply_accepted",
        sourceEntityId: "reply-123"
      });

      // Duplicate creation
      const result = await service.createKnowledge({
        userId: "user-1",
        content: "Duplicate knowledge",
        sourceEventType: "reply_accepted",
        sourceEntityId: "reply-123"
      });

      expect(result.created).toBe(false);
    });

    it("should allow same source entity for different users", async () => {
      const result1 = await service.createKnowledge({
        userId: "user-1",
        content: "User 1 knowledge",
        sourceEventType: "reply_accepted",
        sourceEntityId: "reply-123"
      });

      const result2 = await service.createKnowledge({
        userId: "user-2",
        content: "User 2 knowledge",
        sourceEventType: "reply_accepted",
        sourceEntityId: "reply-123"
      });

      expect(result1.created).toBe(true);
      expect(result2.created).toBe(true);
    });

    it("should emit item_created event", async () => {
      const events: { knowledgeId: string; userId: string }[] = [];
      service.onItemCreated((event) => {
        events.push(event.payload);
      });

      const result = await service.createKnowledge({
        userId: "user-1",
        content: "Event test knowledge",
        sourceEventType: "task_completed",
        sourceEntityId: "task-789"
      });

      expect(events).toHaveLength(1);
      expect(events[0].knowledgeId).toBe(result.knowledgeId);
      expect(events[0].userId).toBe("user-1");
    });

    it("should not emit event when duplicate is detected", async () => {
      const events: { knowledgeId: string }[] = [];
      service.onItemCreated((event) => {
        events.push(event.payload);
      });

      // First creation
      await service.createKnowledge({
        userId: "user-1",
        content: "Original",
        sourceEventType: "reply_accepted",
        sourceEntityId: "reply-123"
      });

      // Duplicate - should not emit event
      await service.createKnowledge({
        userId: "user-1",
        content: "Duplicate",
        sourceEventType: "reply_accepted",
        sourceEntityId: "reply-123"
      });

      expect(events).toHaveLength(1);
    });
  });

  describe("getUserKnowledge", () => {
    beforeEach(async () => {
      // Create test data
      await service.createKnowledge({
        userId: "user-1",
        content: "Knowledge 1",
        sourceEventType: "reply_accepted",
        sourceEntityId: "reply-1"
      });

      await service.createKnowledge({
        userId: "user-1",
        content: "Knowledge 2",
        sourceEventType: "task_completed",
        sourceEntityId: "task-1"
      });

      await service.createKnowledge({
        userId: "user-2",
        content: "Knowledge 3",
        sourceEventType: "reply_accepted",
        sourceEntityId: "reply-2"
      });
    });

    it("should return knowledge items for user", async () => {
      const result = await service.getUserKnowledge("user-1", 1, 10);

      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(result.items.every((item) => item.sourceEventType === "reply_accepted" || item.sourceEventType === "task_completed")).toBe(true);
    });

    it("should sort by created_at desc", async () => {
      const result = await service.getUserKnowledge("user-1", 1, 10);

      for (let i = 1; i < result.items.length; i++) {
        const prev = new Date(result.items[i - 1].createdAt).getTime();
        const curr = new Date(result.items[i].createdAt).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });

    it("should return empty list for user with no knowledge", async () => {
      const result = await service.getUserKnowledge("user-3", 1, 10);

      expect(result.total).toBe(0);
      expect(result.items).toHaveLength(0);
    });

    it("should respect pagination", async () => {
      const result = await service.getUserKnowledge("user-1", 1, 1);

      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(1);
    });
  });
});
