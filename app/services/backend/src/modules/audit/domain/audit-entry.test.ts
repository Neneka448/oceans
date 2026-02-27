import { describe, it, expect } from "vitest";
import { AuditEntry } from "./audit-entry.js";

describe("AuditEntry", () => {
  describe("create", () => {
    it("should create audit entry with valid data", () => {
      const entry = AuditEntry.create(
        "entry-1",
        "user-1",
        "Test summary",
        [
          { seq: 1, toolName: "tool1", inputParams: { a: 1 }, returnValue: { result: "ok" } }
        ]
      );

      expect(entry.id).toBe("entry-1");
      expect(entry.userId).toBe("user-1");
      expect(entry.summary).toBe("Test summary");
      expect(entry.relatedEntityType).toBeNull();
      expect(entry.relatedEntityId).toBeNull();
      expect(entry.toolCalls).toHaveLength(1);
      expect(entry.toolCalls[0].seq).toBe(1);
    });

    it("should sort tool calls by seq", () => {
      const entry = AuditEntry.create(
        "entry-1",
        "user-1",
        "Test summary",
        [
          { seq: 3, toolName: "tool3", inputParams: {}, returnValue: {} },
          { seq: 1, toolName: "tool1", inputParams: {}, returnValue: {} },
          { seq: 2, toolName: "tool2", inputParams: {}, returnValue: {} }
        ]
      );

      expect(entry.toolCalls[0].seq).toBe(1);
      expect(entry.toolCalls[1].seq).toBe(2);
      expect(entry.toolCalls[2].seq).toBe(3);
      expect(entry.toolCalls[0].toolName).toBe("tool1");
      expect(entry.toolCalls[1].toolName).toBe("tool2");
      expect(entry.toolCalls[2].toolName).toBe("tool3");
    });

    it("should throw error when seq is not continuous starting from 1", () => {
      expect(() =>
        AuditEntry.create(
          "entry-1",
          "user-1",
          "Test summary",
          [
            { seq: 2, toolName: "tool2", inputParams: {}, returnValue: {} }
          ]
        )
      ).toThrow("Tool call sequence must be continuous starting from 1");
    });

    it("should throw error when seq has gaps", () => {
      expect(() =>
        AuditEntry.create(
          "entry-1",
          "user-1",
          "Test summary",
          [
            { seq: 1, toolName: "tool1", inputParams: {}, returnValue: {} },
            { seq: 3, toolName: "tool3", inputParams: {}, returnValue: {} }
          ]
        )
      ).toThrow("Tool call sequence must be continuous starting from 1");
    });

    it("should accept valid entity types", () => {
      const entryWithThread = AuditEntry.create(
        "entry-1",
        "user-1",
        "Test summary",
        [{ seq: 1, toolName: "tool1", inputParams: {}, returnValue: {} }],
        "thread",
        "thread-1"
      );

      expect(entryWithThread.relatedEntityType).toBe("thread");
      expect(entryWithThread.relatedEntityId).toBe("thread-1");

      const entryWithTask = AuditEntry.create(
        "entry-2",
        "user-1",
        "Test summary",
        [{ seq: 1, toolName: "tool1", inputParams: {}, returnValue: {} }],
        "task",
        "task-1"
      );

      expect(entryWithTask.relatedEntityType).toBe("task");
      expect(entryWithTask.relatedEntityId).toBe("task-1");
    });

    it("should throw error for invalid entity type", () => {
      expect(() =>
        AuditEntry.create(
          "entry-1",
          "user-1",
          "Test summary",
          [{ seq: 1, toolName: "tool1", inputParams: {}, returnValue: {} }],
          "invalid_type" as "thread",
          "entity-1"
        )
      ).toThrow("Invalid related_entity_type");
    });

    it("should throw error when entity_type is provided without entity_id", () => {
      expect(() =>
        AuditEntry.create(
          "entry-1",
          "user-1",
          "Test summary",
          [{ seq: 1, toolName: "tool1", inputParams: {}, returnValue: {} }],
          "thread",
          undefined
        )
      ).toThrow("related_entity_id is required when related_entity_type is provided");
    });
  });
});
