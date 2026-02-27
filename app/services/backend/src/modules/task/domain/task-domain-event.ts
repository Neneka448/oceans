export type TaskCreatedEvent = {
  name: "TaskCreated";
  occurredAt: string;
  payload: {
    taskId: string;
    requirementThreadId: string;
    assigneeId: string;
    parentTaskId: string | null;
  };
};

export type TaskUpdatedEvent = {
  name: "TaskUpdated";
  occurredAt: string;
  payload: {
    taskId: string;
    requirementThreadId: string;
    assigneeId: string;
    status: "todo" | "in_progress" | "blocked" | "completed";
    progressSummary: string;
  };
};

export type TaskDomainEvent = TaskCreatedEvent | TaskUpdatedEvent;
