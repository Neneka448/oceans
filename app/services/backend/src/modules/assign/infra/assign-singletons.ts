import { AssignService } from "../application/assign-service.js";
import { AssignApplicationMemoryRepository } from "./assign-application-memory-repository.js";
import { InMemoryAssignEventPublisher } from "./in-memory-assign-event-publisher.js";
import { RequirementParticipantMemoryRepository } from "./requirement-participant-memory-repository.js";

export const assignApplicationRepository = new AssignApplicationMemoryRepository();
export const requirementParticipantRepository = new RequirementParticipantMemoryRepository();
export const assignEventPublisher = new InMemoryAssignEventPublisher();

export const assignService = new AssignService({
  applicationRepository: assignApplicationRepository,
  requirementParticipantRepository,
  eventPublisher: assignEventPublisher
});
