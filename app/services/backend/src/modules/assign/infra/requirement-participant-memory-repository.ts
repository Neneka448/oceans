import type {
  RequirementParticipantRepository,
  RequirementThreadSnapshot
} from "../application/requirement-participant-repository.js";

type RequirementThreadRecord = {
  id: string;
  authorId: string;
  participants: Set<string>;
};

export class RequirementParticipantMemoryRepository implements RequirementParticipantRepository {
  private readonly requirementThreads = new Map<string, RequirementThreadRecord>();

  ensureRequirementThread(requirementThreadId: string, authorId: string): RequirementThreadSnapshot {
    const existing = this.requirementThreads.get(requirementThreadId);

    if (existing) {
      return this.toSnapshot(existing);
    }

    const created: RequirementThreadRecord = {
      id: requirementThreadId,
      authorId,
      participants: new Set<string>([authorId])
    };

    this.requirementThreads.set(requirementThreadId, created);
    return this.toSnapshot(created);
  }

  findRequirementThread(requirementThreadId: string): RequirementThreadSnapshot | undefined {
    const found = this.requirementThreads.get(requirementThreadId);
    return found ? this.toSnapshot(found) : undefined;
  }

  addParticipant(requirementThreadId: string, userId: string): void {
    const requirementThread = this.requirementThreads.get(requirementThreadId);
    if (!requirementThread) {
      return;
    }

    requirementThread.participants.add(userId);
  }

  removeParticipant(requirementThreadId: string, userId: string): void {
    const requirementThread = this.requirementThreads.get(requirementThreadId);
    if (!requirementThread) {
      return;
    }

    requirementThread.participants.delete(userId);
  }

  isParticipant(requirementThreadId: string, userId: string): boolean {
    const requirementThread = this.requirementThreads.get(requirementThreadId);
    if (!requirementThread) {
      return false;
    }

    return requirementThread.participants.has(userId);
  }

  private toSnapshot(record: RequirementThreadRecord): RequirementThreadSnapshot {
    return {
      id: record.id,
      authorId: record.authorId,
      participants: [...record.participants.values()]
    };
  }
}
