import type { AssignApplication } from "../domain/assign-application.js";

export interface AssignApplicationRepository {
  save(application: AssignApplication): void;
  findById(applicationId: string): AssignApplication | undefined;
  listByRequirementThreadId(requirementThreadId: string): AssignApplication[];
  findActiveByRequirementAndApplicant(
    requirementThreadId: string,
    applicantId: string
  ): AssignApplication | undefined;
}
