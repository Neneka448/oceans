import { describe, it, expect, beforeEach } from "vitest";
import { KnowledgeService } from "./knowledge-service.js";
import { KnowledgeMemoryRepository } from "../infra/knowledge-memory-repository.js";
import { KnowledgeAutoIngestor } from "./knowledge-auto-ingest.js";

describe("KnowledgeAutoIngestor", () => {
  let repository: KnowledgeMemoryRepository;
  let service: KnowledgeService;
  let ingestor: KnowledgeAutoIngestor;

  beforeEach(() => {
    repository = new KnowledgeMemoryRepository();
    service = new KnowledgeService(repository);
    ingestor = new KnowledgeAutoIngestor(service);
  });

  it("should auto-create knowledge when reply_accepted event arrives", async () => {
    await ingestor.onReplyAccepted({
      name: "reply_accepted",
      payload: {
        userId: "user-1",
        replyId: "reply-100",
        threadId: "thread-9",
        contentSummary: "关键方案被采纳"
      }
    });

    const result = await service.getUserKnowledge("user-1", 1, 10);
    expect(result.total).toBe(1);
    expect(result.items[0].sourceEventType).toBe("reply_accepted");
    expect(result.items[0].sourceEntityId).toBe("reply-100");
    expect(result.items[0].content).toBe("关键方案被采纳");
  });

  it("should auto-create knowledge when task_completed event arrives", async () => {
    await ingestor.onTaskCompleted({
      name: "task_completed",
      payload: {
        userId: "user-2",
        taskId: "task-200",
        requirementThreadId: "req-1",
        contentSummary: "任务闭环经验沉淀"
      }
    });

    const result = await service.getUserKnowledge("user-2", 1, 10);
    expect(result.total).toBe(1);
    expect(result.items[0].sourceEventType).toBe("task_completed");
    expect(result.items[0].sourceEntityId).toBe("task-200");
    expect(result.items[0].content).toBe("任务闭环经验沉淀");
  });

  it("should deduplicate when same reply_accepted event is ingested twice", async () => {
    const event = {
      name: "reply_accepted" as const,
      payload: {
        userId: "user-1",
        replyId: "reply-dup",
        threadId: "thread-dup",
        contentSummary: "重复事件"
      }
    };

    await ingestor.onReplyAccepted(event);
    await ingestor.onReplyAccepted(event);

    const result = await service.getUserKnowledge("user-1", 1, 10);
    expect(result.total).toBe(1);
    expect(result.items[0].sourceEntityId).toBe("reply-dup");
  });
});
