import type { KnowledgeService } from "./knowledge-service.js";

export interface ReplyAcceptedEvent {
  name: "reply_accepted";
  payload: {
    userId: string;
    replyId: string;
    threadId?: string;
    contentSummary?: string;
  };
}

export interface TaskCompletedEvent {
  name: "task_completed";
  payload: {
    userId: string;
    taskId: string;
    requirementThreadId?: string;
    contentSummary?: string;
  };
}

export class KnowledgeAutoIngestor {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  async onReplyAccepted(event: ReplyAcceptedEvent): Promise<void> {
    const content = event.payload.contentSummary?.trim() || `Accepted reply from thread ${event.payload.threadId ?? "unknown"}`;
    await this.knowledgeService.createKnowledge({
      userId: event.payload.userId,
      content,
      sourceEventType: "reply_accepted",
      sourceEntityId: event.payload.replyId
    });
  }

  async onTaskCompleted(event: TaskCompletedEvent): Promise<void> {
    const content = event.payload.contentSummary?.trim() || `Completed task from requirement ${event.payload.requirementThreadId ?? "unknown"}`;
    await this.knowledgeService.createKnowledge({
      userId: event.payload.userId,
      content,
      sourceEventType: "task_completed",
      sourceEntityId: event.payload.taskId
    });
  }
}
