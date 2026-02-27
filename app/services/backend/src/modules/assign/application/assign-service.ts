import { AppError } from "../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../shared/errors/error-code.js";
import { AssignApplication, type AssignReviewDecision } from "../domain/assign-application.js";
import { AssignErrorCode } from "../domain/assign-error-code.js";
import type { AssignDomainEvent } from "../domain/assign-domain-event.js";
import type { AssignApplicationRepository } from "./assign-application-repository.js";
import type { AssignEventPublisher } from "./assign-event-publisher.js";
import type { RequestActor } from "./request-actor.js";
import type {
  RequirementParticipantRepository,
  RequirementThreadSnapshot
} from "./requirement-participant-repository.js";

const assignAppError = (code: string, message: string, statusCode: number): AppError =>
  new AppError(code as ErrorCode, message, statusCode);

export type AssignServiceDeps = {
  applicationRepository: AssignApplicationRepository;
  requirementParticipantRepository: RequirementParticipantRepository;
  eventPublisher: AssignEventPublisher;
  now?: () => string;
};

export class AssignService {
  private readonly now: () => string;

  constructor(private readonly deps: AssignServiceDeps) {
    this.now = deps.now ?? (() => new Date().toISOString());
  }

  apply(input: {
    requirementThreadId: string;
    reasonSummary: string;
    requirementAuthorId?: string;
    actor: RequestActor;
  }): { applicationId: string; status: "pending" } {
    this.getRequirementThreadOrThrow(input.requirementThreadId, input.requirementAuthorId);

    const existing = this.deps.applicationRepository.findActiveByRequirementAndApplicant(
      input.requirementThreadId,
      input.actor.userId
    );

    if (existing) {
      throw assignAppError(AssignErrorCode.AlreadyApplied, "already applied for this requirement", 409);
    }

    const application = AssignApplication.create({
      requirementThreadId: input.requirementThreadId,
      applicantId: input.actor.userId,
      reasonSummary: input.reasonSummary,
      now: this.now()
    });

    this.deps.applicationRepository.save(application);
    this.publish({
      name: "AssignApplied",
      occurredAt: this.now(),
      payload: {
        applicationId: application.id,
        requirementThreadId: application.requirementThreadId,
        applicantId: application.applicantId
      }
    });

    return {
      applicationId: application.id,
      status: "pending"
    };
  }

  withdraw(input: { applicationId: string; actor: RequestActor }): { applicationId: string; status: "withdrawn" } {
    const application = this.deps.applicationRepository.findById(input.applicationId);

    if (!application) {
      throw new AppError(ErrorCode.NotFound, "assign application not found", 404);
    }

    if (application.applicantId !== input.actor.userId) {
      throw new AppError(ErrorCode.Forbidden, "only applicant can withdraw", 403);
    }

    const previousStatus = application.status;
    application.withdraw(this.now());

    if (previousStatus === "approved") {
      this.deps.requirementParticipantRepository.removeParticipant(
        application.requirementThreadId,
        application.applicantId
      );
    }

    this.deps.applicationRepository.save(application);
    this.publish({
      name: "AssignWithdrawn",
      occurredAt: this.now(),
      payload: {
        applicationId: application.id,
        requirementThreadId: application.requirementThreadId,
        applicantId: application.applicantId
      }
    });

    return {
      applicationId: application.id,
      status: "withdrawn"
    };
  }

  review(input: {
    applicationId: string;
    decision: AssignReviewDecision;
    actor: RequestActor;
  }): { applicationId: string; status: "approved" | "rejected" } {
    const application = this.deps.applicationRepository.findById(input.applicationId);

    if (!application) {
      throw new AppError(ErrorCode.NotFound, "assign application not found", 404);
    }

    const requirementThread = this.getRequirementThreadOrThrow(application.requirementThreadId);
    this.assertCanManageRequirement(input.actor, requirementThread);

    application.review(input.decision, this.now());
    this.deps.applicationRepository.save(application);

    if (input.decision === "approved") {
      this.deps.requirementParticipantRepository.addParticipant(
        application.requirementThreadId,
        application.applicantId
      );
    }

    this.publish({
      name: "AssignReviewed",
      occurredAt: this.now(),
      payload: {
        applicationId: application.id,
        requirementThreadId: application.requirementThreadId,
        applicantId: application.applicantId,
        decision: input.decision,
        reviewerId: input.actor.userId
      }
    });

    return {
      applicationId: application.id,
      status: input.decision
    };
  }

  addParticipant(input: {
    requirementThreadId: string;
    targetUserId: string;
    requirementAuthorId?: string;
    actor: RequestActor;
  }): { userId: string; username: string; requirementThreadId: string } {
    const requirementThread = this.getRequirementThreadOrThrow(
      input.requirementThreadId,
      input.requirementAuthorId
    );

    this.assertCanManageRequirement(input.actor, requirementThread);
    this.deps.requirementParticipantRepository.addParticipant(input.requirementThreadId, input.targetUserId);

    return {
      userId: input.targetUserId,
      username: input.targetUserId,
      requirementThreadId: input.requirementThreadId
    };
  }

  listApplicationsByRequirement(requirementThreadId: string): {
    applicationId: string;
    applicantId: string;
    applicantName: string;
    reasonSummary: string;
    status: string;
    createdAt: string;
  }[] {
    this.getRequirementThreadOrThrow(requirementThreadId);

    return this.deps.applicationRepository.listByRequirementThreadId(requirementThreadId).map((application) => ({
      applicationId: application.id,
      applicantId: application.applicantId,
      applicantName: application.applicantId,
      reasonSummary: application.reasonSummary,
      status: application.status,
      createdAt: application.createdAt
    }));
  }

  private getRequirementThreadOrThrow(
    requirementThreadId: string,
    requirementAuthorId?: string
  ): RequirementThreadSnapshot {
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

  private assertCanManageRequirement(actor: RequestActor, requirementThread: RequirementThreadSnapshot): void {
    if (actor.role === "admin") {
      return;
    }

    if (actor.userId === requirementThread.authorId) {
      return;
    }

    throw new AppError(ErrorCode.Forbidden, "only requirement author or admin can manage assign", 403);
  }

  private publish(event: AssignDomainEvent): void {
    this.deps.eventPublisher.publish(event);
  }
}
