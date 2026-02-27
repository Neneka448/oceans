import { AppError } from "../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../shared/errors/error-code.js";
import type { AssignService } from "./assign-service.js";
import type { RequirementParticipantRepository } from "./requirement-participant-repository.js";

export type TopTaskSummary = {
  taskId: string;
  assigneeId: string;
  assigneeName: string;
  status: string;
  progressSummary: string;
};

export interface TopTaskReadRepository {
  listTopByRequirementThreadId(requirementThreadId: string): TopTaskSummary[];
}

export class AssignQueryService {
  constructor(
    private readonly assignService: AssignService,
    private readonly requirementParticipantRepository: RequirementParticipantRepository,
    private readonly topTaskReadRepository: TopTaskReadRepository
  ) {}

  listRequirementParticipation(requirementThreadId: string): {
    applications: {
      applicationId: string;
      applicantId: string;
      applicantName: string;
      reasonSummary: string;
      status: string;
      createdAt: string;
    }[];
    topTasks: TopTaskSummary[];
  } {
    const requirementThread = this.requirementParticipantRepository.findRequirementThread(requirementThreadId);

    if (!requirementThread) {
      throw new AppError(ErrorCode.NotFound, "requirement thread not found", 404);
    }

    return {
      applications: this.assignService.listApplicationsByRequirement(requirementThreadId),
      topTasks: this.topTaskReadRepository.listTopByRequirementThreadId(requirementThreadId)
    };
  }
}
