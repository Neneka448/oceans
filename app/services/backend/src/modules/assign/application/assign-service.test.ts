import assert from "node:assert/strict";
import { test } from "vitest";
import { AppError } from "../../../shared/errors/app-error.js";
import { AssignService } from "./assign-service.js";
import { AssignErrorCode } from "../domain/assign-error-code.js";
import { AssignApplicationMemoryRepository } from "../infra/assign-application-memory-repository.js";
import { InMemoryAssignEventPublisher } from "../infra/in-memory-assign-event-publisher.js";
import { RequirementParticipantMemoryRepository } from "../infra/requirement-participant-memory-repository.js";

const createService = (): {
  service: AssignService;
  requirementRepository: RequirementParticipantMemoryRepository;
} => {
  const requirementRepository = new RequirementParticipantMemoryRepository();

  return {
    service: new AssignService({
      applicationRepository: new AssignApplicationMemoryRepository(),
      requirementParticipantRepository: requirementRepository,
      eventPublisher: new InMemoryAssignEventPublisher(),
      now: () => "2026-02-28T00:00:00.000Z"
    }),
    requirementRepository
  };
};

test("should_reject_duplicate_assign_when_existing_application_is_active", () => {
  const { service, requirementRepository } = createService();
  requirementRepository.ensureRequirementThread("req-1", "owner-1");

  service.apply({
    requirementThreadId: "req-1",
    reasonSummary: "i can help",
    actor: { userId: "user-1", username: "user-1", role: "user" }
  });

  const duplicateApply = () =>
    service.apply({
      requirementThreadId: "req-1",
      reasonSummary: "again",
      actor: { userId: "user-1", username: "user-1", role: "user" }
    });

  assert.throws(duplicateApply, (error) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.code, AssignErrorCode.AlreadyApplied);
    assert.equal(error.statusCode, 409);
    return true;
  });
});

test("should_reject_review_when_actor_is_not_requirement_author_or_admin", () => {
  const { service, requirementRepository } = createService();
  requirementRepository.ensureRequirementThread("req-2", "owner-2");

  const applied = service.apply({
    requirementThreadId: "req-2",
    reasonSummary: "let me try",
    actor: { userId: "user-2", username: "user-2", role: "user" }
  });

  const reviewByOtherUser = () =>
    service.review({
      applicationId: applied.applicationId,
      decision: "approved",
      actor: { userId: "other-user", username: "other-user", role: "user" }
    });

  assert.throws(reviewByOtherUser, (error) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.code, "common.forbidden");
    assert.equal(error.statusCode, 403);
    return true;
  });
});

test("should_set_withdrawn_and_reject_second_withdraw", () => {
  const { service, requirementRepository } = createService();
  requirementRepository.ensureRequirementThread("req-3", "owner-3");

  const applied = service.apply({
    requirementThreadId: "req-3",
    reasonSummary: "want to join",
    actor: { userId: "user-3", username: "user-3", role: "user" }
  });

  const withdrawn = service.withdraw({
    applicationId: applied.applicationId,
    actor: { userId: "user-3", username: "user-3", role: "user" }
  });

  assert.equal(withdrawn.status, "withdrawn");

  const secondWithdraw = () =>
    service.withdraw({
      applicationId: applied.applicationId,
      actor: { userId: "user-3", username: "user-3", role: "user" }
    });

  assert.throws(secondWithdraw, (error) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.code, AssignErrorCode.NotWithdrawable);
    assert.equal(error.statusCode, 409);
    return true;
  });
});
