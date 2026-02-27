import { AppError } from "../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../shared/errors/error-code.js";
import { AssignErrorCode } from "../../assign/domain/assign-error-code.js";
import type { RequirementParticipantRepository } from "../../assign/application/requirement-participant-repository.js";
import { Task, type TaskStatus } from "../domain/task.js";
import { TaskErrorCode } from "../domain/task-error-code.js";
import type { TaskDomainEvent } from "../domain/task-domain-event.js";
import type { RequestActor } from "./request-actor.js";
import type { TaskEventPublisher } from "./task-event-publisher.js";
import type { TaskRepository } from "./task-repository.js";

const taskAppError = (code: string, message: string, statusCode: number): AppError =>
  new AppError(code as ErrorCode, message, statusCode);

export type TaskServiceDeps = {
  taskRepository: TaskRepository;
  requirementParticipantRepository: RequirementParticipantRepository;
  eventPublisher: TaskEventPublisher;
  now?: () => string;
};

export class TaskService {
  private readonly now: () => string;

  constructor(private readonly deps: TaskServiceDeps) {
    this.now = deps.now ?? (() => new Date().toISOString());
  }

  createTask(input: {
    requirementThreadId: string;
    title: string;
    description?: string;
    assigneeId?: string;
    requirementAuthorId?: string;
    actor: RequestActor;
  }): { taskId: string; status: "todo" } {
    const requirementThread = this.getRequirementThreadOrThrow(
      input.requirementThreadId,
      input.requirementAuthorId
    );

    const isManager = input.actor.role === "admin" || input.actor.userId === requirementThread.authorId;

    if (!isManager && input.assigneeId && input.assigneeId !== input.actor.userId) {
      throw new AppError(ErrorCode.Forbidden, "non manager cannot assign task to others", 403);
    }

    if (!isManager && !this.deps.requirementParticipantRepository.isParticipant(input.requirementThreadId, input.actor.userId)) {
      throw taskAppError(AssignErrorCode.NotApproved, "only approved participant can create task", 403);
    }

    const assigneeId = input.assigneeId ?? input.actor.userId;

    if (!this.deps.requirementParticipantRepository.isParticipant(input.requirementThreadId, assigneeId)) {
      this.deps.requirementParticipantRepository.addParticipant(input.requirementThreadId, assigneeId);
    }

    const task = Task.create({
      requirementThreadId: input.requirementThreadId,
      parentTaskId: null,
      title: input.title,
      description: input.description,
      assigneeId,
      now: this.now()
    });

    this.deps.taskRepository.save(task);
    this.publish({
      name: "TaskCreated",
      occurredAt: this.now(),
      payload: {
        taskId: task.id,
        requirementThreadId: task.requirementThreadId,
        assigneeId: task.assigneeId,
        parentTaskId: task.parentTaskId
      }
    });

    return {
      taskId: task.id,
      status: "todo"
    };
  }

  createSubTask(input: {
    parentTaskId: string;
    title: string;
    description?: string;
    actor: RequestActor;
  }): { taskId: string; parentTaskId: string } {
    const parentTask = this.deps.taskRepository.findById(input.parentTaskId);

    if (!parentTask) {
      throw new AppError(ErrorCode.NotFound, "parent task not found", 404);
    }

    if (parentTask.assigneeId !== input.actor.userId) {
      throw taskAppError(TaskErrorCode.NotAssignee, "only assignee can create sub task", 403);
    }

    const subTask = Task.create({
      requirementThreadId: parentTask.requirementThreadId,
      parentTaskId: parentTask.id,
      title: input.title,
      description: input.description,
      assigneeId: input.actor.userId,
      now: this.now()
    });

    this.deps.taskRepository.save(subTask);
    this.publish({
      name: "TaskCreated",
      occurredAt: this.now(),
      payload: {
        taskId: subTask.id,
        requirementThreadId: subTask.requirementThreadId,
        assigneeId: subTask.assigneeId,
        parentTaskId: subTask.parentTaskId
      }
    });

    return {
      taskId: subTask.id,
      parentTaskId: parentTask.id
    };
  }

  getTaskDetail(taskId: string): {
    taskId: string;
    title: string;
    description: string;
    requirementThreadId: string;
    parentTaskId: string | null;
    assigneeId: string;
    assigneeName: string;
    status: TaskStatus;
    progressSummary: string;
    subTasks: { taskId: string; title: string; status: TaskStatus }[];
    relatedThreads: { threadId: string; title: string; status: string }[];
    createdAt: string;
    updatedAt: string;
  } {
    const task = this.deps.taskRepository.findById(taskId);

    if (!task) {
      throw new AppError(ErrorCode.NotFound, "task not found", 404);
    }

    return {
      taskId: task.id,
      title: task.title,
      description: task.description,
      requirementThreadId: task.requirementThreadId,
      parentTaskId: task.parentTaskId,
      assigneeId: task.assigneeId,
      assigneeName: task.assigneeId,
      status: task.status,
      progressSummary: task.progressSummary,
      subTasks: this.deps.taskRepository.listByParentTaskId(task.id).map((subTask) => ({
        taskId: subTask.id,
        title: subTask.title,
        status: subTask.status
      })),
      relatedThreads: [],
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    };
  }

  updateTaskStatus(input: {
    taskId: string;
    status: TaskStatus;
    actor: RequestActor;
  }): { taskId: string; status: TaskStatus } {
    const task = this.deps.taskRepository.findById(input.taskId);

    if (!task) {
      throw new AppError(ErrorCode.NotFound, "task not found", 404);
    }

    const requirementThread = this.getRequirementThreadOrThrow(task.requirementThreadId);
    const canUpdate =
      input.actor.userId === task.assigneeId ||
      input.actor.role === "admin" ||
      input.actor.userId === requirementThread.authorId;

    if (!canUpdate) {
      throw taskAppError(TaskErrorCode.NotAssignee, "only assignee/author/admin can update status", 403);
    }

    task.updateStatus(input.status, this.now());
    this.deps.taskRepository.save(task);

    this.publish({
      name: "TaskUpdated",
      occurredAt: this.now(),
      payload: {
        taskId: task.id,
        requirementThreadId: task.requirementThreadId,
        assigneeId: task.assigneeId,
        status: task.status,
        progressSummary: task.progressSummary
      }
    });

    return {
      taskId: task.id,
      status: task.status
    };
  }

  updateTaskProgress(input: {
    taskId: string;
    progressSummary: string;
    actor: RequestActor;
  }): { taskId: string } {
    const task = this.deps.taskRepository.findById(input.taskId);

    if (!task) {
      throw new AppError(ErrorCode.NotFound, "task not found", 404);
    }

    if (input.actor.userId !== task.assigneeId) {
      throw taskAppError(TaskErrorCode.NotAssignee, "only assignee can update progress", 403);
    }

    task.updateProgress(input.progressSummary, this.now());
    this.deps.taskRepository.save(task);

    this.publish({
      name: "TaskUpdated",
      occurredAt: this.now(),
      payload: {
        taskId: task.id,
        requirementThreadId: task.requirementThreadId,
        assigneeId: task.assigneeId,
        status: task.status,
        progressSummary: task.progressSummary
      }
    });

    return {
      taskId: task.id
    };
  }

  private getRequirementThreadOrThrow(requirementThreadId: string, requirementAuthorId?: string): {
    id: string;
    authorId: string;
    participants: string[];
  } {
    const found = this.deps.requirementParticipantRepository.findRequirementThread(requirementThreadId);

    if (found) {
      return found;
    }

    if (requirementAuthorId) {
      return this.deps.requirementParticipantRepository.ensureRequirementThread(
        requirementThreadId,
        requirementAuthorId
      );
    }

    throw new AppError(ErrorCode.NotFound, "requirement thread not found", 404);
  }

  private publish(event: TaskDomainEvent): void {
    this.deps.eventPublisher.publish(event);
  }
}
