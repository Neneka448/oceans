import { randomUUID } from "node:crypto";
import { AppError } from "../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../shared/errors/error-code.js";
import { TaskErrorCode, type TaskErrorCodeValue } from "./task-error-code.js";

export type TaskStatus = "todo" | "in_progress" | "blocked" | "completed";

export type TaskSnapshot = {
  id: string;
  requirementThreadId: string;
  parentTaskId: string | null;
  title: string;
  description: string;
  assigneeId: string;
  assignApplicationId: string | null;
  status: TaskStatus;
  progressSummary: string;
  createdAt: string;
  updatedAt: string;
};

const taskAppError = (code: TaskErrorCodeValue, message: string): AppError =>
  new AppError(code as ErrorCode, message, 409);

const allowedStatusTransitions: Record<TaskStatus, TaskStatus[]> = {
  todo: ["in_progress"],
  in_progress: ["blocked", "completed"],
  blocked: ["in_progress"],
  completed: []
};

export class Task {
  private constructor(private readonly snapshot: TaskSnapshot) {}

  static create(input: {
    requirementThreadId: string;
    parentTaskId: string | null;
    title: string;
    description?: string;
    assigneeId: string;
    assignApplicationId?: string | null;
    now: string;
  }): Task {
    return new Task({
      id: randomUUID(),
      requirementThreadId: input.requirementThreadId,
      parentTaskId: input.parentTaskId,
      title: input.title,
      description: input.description ?? "",
      assigneeId: input.assigneeId,
      assignApplicationId: input.assignApplicationId ?? null,
      status: "todo",
      progressSummary: "",
      createdAt: input.now,
      updatedAt: input.now
    });
  }

  static rehydrate(snapshot: TaskSnapshot): Task {
    return new Task({ ...snapshot });
  }

  get id(): string {
    return this.snapshot.id;
  }

  get requirementThreadId(): string {
    return this.snapshot.requirementThreadId;
  }

  get parentTaskId(): string | null {
    return this.snapshot.parentTaskId;
  }

  get title(): string {
    return this.snapshot.title;
  }

  get description(): string {
    return this.snapshot.description;
  }

  get assigneeId(): string {
    return this.snapshot.assigneeId;
  }

  get status(): TaskStatus {
    return this.snapshot.status;
  }

  get progressSummary(): string {
    return this.snapshot.progressSummary;
  }

  get createdAt(): string {
    return this.snapshot.createdAt;
  }

  get updatedAt(): string {
    return this.snapshot.updatedAt;
  }

  updateStatus(nextStatus: TaskStatus, now: string): void {
    if (this.snapshot.status === nextStatus) {
      return;
    }

    const allowedNext = allowedStatusTransitions[this.snapshot.status];

    if (!allowedNext.includes(nextStatus)) {
      throw taskAppError(
        TaskErrorCode.InvalidStatusTransition,
        `cannot transition from ${this.snapshot.status} to ${nextStatus}`
      );
    }

    this.snapshot.status = nextStatus;
    this.snapshot.updatedAt = now;
  }

  updateProgress(progressSummary: string, now: string): void {
    this.snapshot.progressSummary = progressSummary;
    this.snapshot.updatedAt = now;
  }

  toSnapshot(): TaskSnapshot {
    return { ...this.snapshot };
  }
}
