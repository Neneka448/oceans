import { describe, it, expect, beforeEach } from "vitest";
import { AuditService } from "./audit-service.js";
import { AuditMemoryRepository } from "../infra/audit-memory-repository.js";

describe("AuditService", () => {
  let repository: AuditMemoryRepository;
  let service: AuditService;

  beforeEach(() => {
    repository = new AuditMemoryRepository();
    service = new AuditService(repository);
  });

  describe("submitAudit", () => {
    it("should create audit entry and return entry_id", async () => {
      const result = await service.submitAudit({
        userId: "user-1",
        summary: "Test action",
        toolCalls: [
          { seq: 1, toolName: "tool1", inputParams: { input: "data" }, returnValue: { success: true } }
        ]
      });

      expect(result.entryId).toBeDefined();
      expect(typeof result.entryId).toBe("string");
    });

    it("should save multiple tool calls in order", async () => {
      const result = await service.submitAudit({
        userId: "user-1",
        summary: "Test action",
        toolCalls: [
          { seq: 1, toolName: "tool1", inputParams: {}, returnValue: {} },
          { seq: 2, toolName: "tool2", inputParams: {}, returnValue: {} },
          { seq: 3, toolName: "tool3", inputParams: {}, returnValue: {} }
        ]
      });

      const entry = await service.getAuditEntry(result.entryId);
      expect(entry).not.toBeNull();
      expect(entry!.toolCalls).toHaveLength(3);
      expect(entry!.toolCalls[0].seq).toBe(1);
      expect(entry!.toolCalls[1].seq).toBe(2);
      expect(entry!.toolCalls[2].seq).toBe(3);
    });

    it("should emit entry_created event", async () => {
      const events: { entryId: string; userId: string }[] = [];
      service.onEntryCreated((event) => {
        events.push(event.payload);
      });

      const result = await service.submitAudit({
        userId: "user-1",
        summary: "Test action",
        toolCalls: [{ seq: 1, toolName: "tool1", inputParams: {}, returnValue: {} }]
      });

      expect(events).toHaveLength(1);
      expect(events[0].entryId).toBe(result.entryId);
      expect(events[0].userId).toBe("user-1");
    });
  });

  describe("getAuditEntry", () => {
    it("should return entry detail with tool calls", async () => {
      const { entryId } = await service.submitAudit({
        userId: "user-1",
        summary: "Test summary",
        toolCalls: [
          { seq: 1, toolName: "tool1", inputParams: { a: 1 }, returnValue: { result: "ok" } }
        ],
        relatedEntityType: "thread",
        relatedEntityId: "thread-1"
      });

      const entry = await service.getAuditEntry(entryId);

      expect(entry).not.toBeNull();
      expect(entry!.entryId).toBe(entryId);
      expect(entry!.userId).toBe("user-1");
      expect(entry!.summary).toBe("Test summary");
      expect(entry!.relatedEntityType).toBe("thread");
      expect(entry!.relatedEntityId).toBe("thread-1");
      expect(entry!.toolCalls).toHaveLength(1);
      expect(entry!.toolCalls[0].toolName).toBe("tool1");
    });

    it("should return null for non-existent entry", async () => {
      const entry = await service.getAuditEntry("non-existent-id");
      expect(entry).toBeNull();
    });
  });

  describe("listAuditEntries", () => {
    beforeEach(async () => {
      // Create test data
      await service.submitAudit({
        userId: "user-1",
        summary: "Entry 1",
        toolCalls: [{ seq: 1, toolName: "tool1", inputParams: {}, returnValue: {} }]
      });

      await service.submitAudit({
        userId: "user-1",
        summary: "Entry 2",
        toolCalls: [{ seq: 1, toolName: "tool1", inputParams: {}, returnValue: {} }],
        relatedEntityType: "task",
        relatedEntityId: "task-1"
      });

      await service.submitAudit({
        userId: "user-2",
        summary: "Entry 3",
        toolCalls: [{ seq: 1, toolName: "tool1", inputParams: {}, returnValue: {} }],
        relatedEntityType: "thread",
        relatedEntityId: "thread-1"
      });
    });

    it("should list all entries with pagination", async () => {
      const result = await service.listAuditEntries({}, 1, 10);

      expect(result.total).toBe(3);
      expect(result.items).toHaveLength(3);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it("should filter by user_id", async () => {
      const result = await service.listAuditEntries({ userId: "user-1" }, 1, 10);

      expect(result.total).toBe(2);
      expect(result.items.every((item) => item.userId === "user-1")).toBe(true);
    });

    it("should filter by entity_type", async () => {
      const result = await service.listAuditEntries({ entityType: "task" }, 1, 10);

      expect(result.total).toBe(1);
      expect(result.items[0].relatedEntityType).toBe("task");
    });

    it("should filter by entity_id", async () => {
      const result = await service.listAuditEntries({ entityId: "thread-1" }, 1, 10);

      expect(result.total).toBe(1);
      expect(result.items[0].relatedEntityId).toBe("thread-1");
    });

    it("should filter by combination of conditions", async () => {
      const result = await service.listAuditEntries(
        { userId: "user-1", entityType: "task" },
        1,
        10
      );

      expect(result.total).toBe(1);
      expect(result.items[0].userId).toBe("user-1");
      expect(result.items[0].relatedEntityType).toBe("task");
    });

    it("should sort by created_at desc", async () => {
      const result = await service.listAuditEntries({}, 1, 10);

      // Entries should be sorted by created_at in descending order
      for (let i = 1; i < result.items.length; i++) {
        const prev = new Date(result.items[i - 1].createdAt).getTime();
        const curr = new Date(result.items[i].createdAt).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });

    it("should respect pagination", async () => {
      const result = await service.listAuditEntries({}, 1, 2);

      expect(result.total).toBe(3);
      expect(result.items).toHaveLength(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(2);
    });
  });
});
