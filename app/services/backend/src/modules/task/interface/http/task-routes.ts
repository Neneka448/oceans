import type { FastifyRequest } from "fastify";
import { AppError } from "../../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../../shared/errors/error-code.js";
import { ok } from "../../../../shared/interface/http-contract.js";
import type { HttpRouteModule } from "../../../../shared/interface/http-route-module.js";
import type { TaskStatus } from "../../domain/task.js";
import { taskService } from "../../infra/task-singletons.js";
import { parseRequestActor, parseRequirementAuthorIdHint } from "./request-actor.js";

type TaskParams = {
  task_id: string;
};

type CreateTaskBody = {
  requirement_thread_id?: string;
  title?: string;
  description?: string;
  assignee_id?: string;
};

type CreateSubTaskBody = {
  title?: string;
  description?: string;
};

type UpdateStatusBody = {
  status?: TaskStatus;
};

type UpdateProgressBody = {
  progress_summary?: string;
};

const trimOrThrow = (value: string | undefined, field: string): string => {
  const trimmed = value?.trim();

  if (!trimmed) {
    throw new AppError(ErrorCode.InvalidParams, `${field} is required`, 400, { field });
  }

  return trimmed;
};

const validateTaskStatus = (status: TaskStatus | undefined): TaskStatus => {
  if (status === "todo" || status === "in_progress" || status === "blocked" || status === "completed") {
    return status;
  }

  throw new AppError(ErrorCode.InvalidParams, "status is invalid", 400, { field: "status" });
};

export const taskRoutes: HttpRouteModule = async (app) => {
  app.post("/tasks/create", async (request: FastifyRequest<{ Body: CreateTaskBody }>) => {
    const actor = parseRequestActor(request.headers);
    const requirementThreadId = trimOrThrow(request.body?.requirement_thread_id, "requirement_thread_id");
    const title = trimOrThrow(request.body?.title, "title");

    const result = taskService.createTask({
      requirementThreadId,
      title,
      description: request.body?.description,
      assigneeId: request.body?.assignee_id?.trim() || undefined,
      requirementAuthorId: parseRequirementAuthorIdHint(request.headers),
      actor
    });

    return ok({
      task_id: result.taskId,
      status: result.status
    });
  });

  app.post(
    "/tasks/:task_id/subtasks/create",
    async (request: FastifyRequest<{ Params: TaskParams; Body: CreateSubTaskBody }>) => {
      const actor = parseRequestActor(request.headers);
      const title = trimOrThrow(request.body?.title, "title");

      const result = taskService.createSubTask({
        parentTaskId: request.params.task_id,
        title,
        description: request.body?.description,
        actor
      });

      return ok({
        task_id: result.taskId,
        parent_task_id: result.parentTaskId
      });
    }
  );

  app.get("/tasks/:task_id", async (request: FastifyRequest<{ Params: TaskParams }>) => {
    const task = taskService.getTaskDetail(request.params.task_id);

    return ok({
      task_id: task.taskId,
      title: task.title,
      description: task.description,
      requirement_thread_id: task.requirementThreadId,
      parent_task_id: task.parentTaskId,
      assignee_id: task.assigneeId,
      assignee_name: task.assigneeName,
      status: task.status,
      progress_summary: task.progressSummary,
      sub_tasks: task.subTasks.map((subTask) => ({
        task_id: subTask.taskId,
        title: subTask.title,
        status: subTask.status
      })),
      related_threads: task.relatedThreads.map((thread) => ({
        thread_id: thread.threadId,
        title: thread.title,
        status: thread.status
      })),
      created_at: task.createdAt,
      updated_at: task.updatedAt
    });
  });

  app.post(
    "/tasks/:task_id/update-status",
    async (request: FastifyRequest<{ Params: TaskParams; Body: UpdateStatusBody }>) => {
      const actor = parseRequestActor(request.headers);
      const status = validateTaskStatus(request.body?.status);

      const result = taskService.updateTaskStatus({
        taskId: request.params.task_id,
        status,
        actor
      });

      return ok({
        task_id: result.taskId,
        status: result.status
      });
    }
  );

  app.post(
    "/tasks/:task_id/update-progress",
    async (request: FastifyRequest<{ Params: TaskParams; Body: UpdateProgressBody }>) => {
      const actor = parseRequestActor(request.headers);
      const progressSummary = trimOrThrow(request.body?.progress_summary, "progress_summary");

      const result = taskService.updateTaskProgress({
        taskId: request.params.task_id,
        progressSummary,
        actor
      });

      return ok({
        task_id: result.taskId
      });
    }
  );
};
