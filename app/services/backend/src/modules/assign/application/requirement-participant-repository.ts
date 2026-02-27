export type RequirementThreadSnapshot = {
  id: string;
  authorId: string;
  participants: string[];
};

export interface RequirementParticipantRepository {
  ensureRequirementThread(requirementThreadId: string, authorId: string): RequirementThreadSnapshot;
  findRequirementThread(requirementThreadId: string): RequirementThreadSnapshot | undefined;
  addParticipant(requirementThreadId: string, userId: string): void;
  removeParticipant(requirementThreadId: string, userId: string): void;
  isParticipant(requirementThreadId: string, userId: string): boolean;
}
