import type { AssignApplicationRepository } from "../application/assign-application-repository.js";
import type { AssignApplication } from "../domain/assign-application.js";

export class AssignApplicationMemoryRepository implements AssignApplicationRepository {
  private readonly applications = new Map<string, AssignApplication>();

  save(application: AssignApplication): void {
    this.applications.set(application.id, application);
  }

  findById(applicationId: string): AssignApplication | undefined {
    return this.applications.get(applicationId);
  }

  listByRequirementThreadId(requirementThreadId: string): AssignApplication[] {
    return [...this.applications.values()]
      .filter((application) => application.requirementThreadId === requirementThreadId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  findActiveByRequirementAndApplicant(
    requirementThreadId: string,
    applicantId: string
  ): AssignApplication | undefined {
    return [...this.applications.values()].find(
      (application) =>
        application.requirementThreadId === requirementThreadId &&
        application.applicantId === applicantId &&
        (application.status === "pending" || application.status === "approved")
    );
  }
}
