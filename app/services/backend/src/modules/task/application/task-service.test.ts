import assert from "node:assert/strict";
import { test } from "vitest";
import { AppError } from "../../../shared/errors/app-error.js";
import { AssignErrorCode } from "../../assign/domain/assign-error-code.js";
import { RequirementParticipantMemoryRepository } from "../../assign/infra/requirement-participant-memory-repository.js";
import { TaskErrorCode } from "../domain/task-error-code.js";
import { InMemoryTaskEventPublisher } from "../infra/in-memory-task-event-publisher.js";
import { TaskMemoryRepository } from "../infra/task-memory-repository.js";
import { TaskService } from "./task-service.js";

const createService = (): {
  service: TaskService;
  requirementRepository: RequirementParticipantMemoryRepository;
} => {
  const requirementRepository = new RequirementParticipantMemoryRepository();

  return {
    service: new TaskService({
      taskRepository: new TaskMemoryRepository(),
      requirementParticipantRepository: requirementRepository,
      eventPublisher: new InMemoryTaskEventPublisher(),
      now: () => "2026-02-28T00:00:00.000Z"
    }),
    requirementRepository
  };
};

test("should_reject_task_creation_when_user_is_not_approved_participant", () => {
  const { service, requirementRepository } = createService();
  requirementRepository.ensureRequirementThread("req-1", "owner-1");

  const createTask = () =>
    service.createTask({
      requirementThreadId: "req-1",
      title: "implement api",
      actor: { userId: "user-1", username: "user-1", role: "user" }
    });

  assert.throws(createTask, (error) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.code, AssignErrorCode.NotApproved);
    assert.equal(error.statusCode, 403);
    return true;
  });
});

test("should_reject_invalid_status_transition", () => {
  const { service, requirementRepository } = createService();
  requirementRepository.ensureRequirementThread("req-2", "owner-2");
  requirementRepository.addParticipant("req-2", "assignee-2");

  const created = service.createTask({
    requirementThreadId: "req-2",
    title: "ship feature",
    actor: { userId: "assignee-2", username: "assignee-2", role: "user" }
  });

  const invalidTransition = () =>
    service.updateTaskStatus({
      taskId: created.taskId,
      status: "completed",
      actor: { userId: "assignee-2", username: "assignee-2", role: "user" }
    });

  assert.throws(invalidTransition, (error) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.code, TaskErrorCode.InvalidStatusTransition);
    assert.equal(error.statusCode, 409);
    return true;
  });
});

test("should_reject_progress_update_when_actor_is_not_assignee", () => {
  const { service, requirementRepository } = createService();
  requirementRepository.ensureRequirementThread("req-3", "owner-3");
  requirementRepository.addParticipant("req-3", "assignee-3");

  const created = service.createTask({
    requirementThreadId: "req-3",
    title: "build handler",
    actor: { userId: "assignee-3", username: "assignee-3", role: "user" }
  });

  const updateByAnotherUser = () =>
    service.updateTaskProgress({
      taskId: created.taskId,
      progressSummary: "done",
      actor: { userId: "other-user", username: "other-user", role: "user" }
    });

  assert.throws(updateByAnotherUser, (error) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.code, TaskErrorCode.NotAssignee);
    assert.equal(error.statusCode, 403);
    return true;
  });
});
