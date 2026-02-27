import type { FastifyRequest } from "fastify";
import { AppError } from "../../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../../shared/errors/error-code.js";
import { ok } from "../../../../shared/interface/http-contract.js";
import type { HttpRouteModule } from "../../../../shared/interface/http-route-module.js";
import { AssignQueryService } from "../../application/assign-query-service.js";
import { assignService, requirementParticipantRepository } from "../../infra/assign-singletons.js";
import { taskRepository } from "../../../task/infra/task-singletons.js";
import { parseRequestActor, parseRequirementAuthorIdHint } from "./request-actor.js";

type ThreadParams = {
  thread_id: string;
};

type AppParams = {
  app_id: string;
};

type ApplyAssignBody = {
  reason_summary?: string;
};

type ReviewAssignBody = {
  decision?: "approved" | "rejected";
};

type AddParticipantBody = {
  user_id?: string;
};

const assignQueryService = new AssignQueryService(
  assignService,
  requirementParticipantRepository,
  taskRepository
);

const trimOrThrow = (value: string | undefined, field: string): string => {
  const trimmed = value?.trim();

  if (!trimmed) {
    throw new AppError(ErrorCode.InvalidParams, `${field} is required`, 400, { field });
  }

  return trimmed;
};

export const assignRoutes: HttpRouteModule = async (app) => {
  app.post(
    "/threads/:thread_id/assign/apply",
    async (request: FastifyRequest<{ Params: ThreadParams; Body: ApplyAssignBody }>) => {
      const actor = parseRequestActor(request.headers);
      const reasonSummary = trimOrThrow(request.body?.reason_summary, "reason_summary");

      const result = assignService.apply({
        requirementThreadId: request.params.thread_id,
        reasonSummary,
        requirementAuthorId: parseRequirementAuthorIdHint(request.headers),
        actor
      });

      return ok({
        application_id: result.applicationId,
        status: result.status
      });
    }
  );

  app.post(
    "/assign-applications/:app_id/withdraw",
    async (request: FastifyRequest<{ Params: AppParams }>) => {
      const actor = parseRequestActor(request.headers);
      const result = assignService.withdraw({
        applicationId: request.params.app_id,
        actor
      });

      return ok({
        application_id: result.applicationId,
        status: result.status
      });
    }
  );

  app.post(
    "/assign-applications/:app_id/review",
    async (request: FastifyRequest<{ Params: AppParams; Body: ReviewAssignBody }>) => {
      const actor = parseRequestActor(request.headers);
      const decision = request.body?.decision;

      if (decision !== "approved" && decision !== "rejected") {
        throw new AppError(ErrorCode.InvalidParams, "decision must be approved or rejected", 400, {
          field: "decision"
        });
      }

      const result = assignService.review({
        applicationId: request.params.app_id,
        decision,
        actor
      });

      return ok({
        application_id: result.applicationId,
        status: result.status
      });
    }
  );

  app.post(
    "/threads/:thread_id/assign/add",
    async (request: FastifyRequest<{ Params: ThreadParams; Body: AddParticipantBody }>) => {
      const actor = parseRequestActor(request.headers);
      const targetUserId = trimOrThrow(request.body?.user_id, "user_id");

      const result = assignService.addParticipant({
        requirementThreadId: request.params.thread_id,
        targetUserId,
        requirementAuthorId: parseRequirementAuthorIdHint(request.headers),
        actor
      });

      return ok({
        user_id: result.userId,
        username: result.username,
        requirement_thread_id: result.requirementThreadId
      });
    }
  );

  app.get("/threads/:thread_id/assign", async (request: FastifyRequest<{ Params: ThreadParams }>) => {
    const result = assignQueryService.listRequirementParticipation(request.params.thread_id);

    return ok({
      applications: result.applications.map((application) => ({
        application_id: application.applicationId,
        applicant_id: application.applicantId,
        applicant_name: application.applicantName,
        reason_summary: application.reasonSummary,
        status: application.status,
        created_at: application.createdAt
      })),
      top_tasks: result.topTasks.map((task) => ({
        task_id: task.taskId,
        assignee_id: task.assigneeId,
        assignee_name: task.assigneeName,
        status: task.status,
        progress_summary: task.progressSummary
      }))
    });
  });
};
