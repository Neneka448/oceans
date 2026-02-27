import type { ThreadRepository, ThreadListFilter } from "../domain/thread-repository.js";
import type { ThreadEntity } from "../domain/thread.js";

const cloneThread = (thread: ThreadEntity): ThreadEntity => ({
  ...thread,
  tags: [...thread.tags],
  mentionUserIds: [...thread.mentionUserIds]
});

export class InMemoryThreadRepository implements ThreadRepository {
  private readonly threads = new Map<string, ThreadEntity>();

  save(thread: ThreadEntity): void {
    this.threads.set(thread.id, cloneThread(thread));
  }

  findById(threadId: string): ThreadEntity | undefined {
    const found = this.threads.get(threadId);
    return found ? cloneThread(found) : undefined;
  }

  list(filter?: ThreadListFilter): ThreadEntity[] {
    return [...this.threads.values()]
      .filter((thread) => this.matchFilter(thread, filter))
      .map((thread) => cloneThread(thread));
  }

  private matchFilter(thread: ThreadEntity, filter?: ThreadListFilter): boolean {
    if (!filter) {
      return true;
    }

    if (filter.type && thread.type !== filter.type) {
      return false;
    }

    if (filter.status && thread.status !== filter.status) {
      return false;
    }

    if (filter.tags && filter.tags.length > 0) {
      const expectedTags = new Set(filter.tags);

      for (const expectedTag of expectedTags) {
        if (!thread.tags.includes(expectedTag)) {
          return false;
        }
      }
    }

    if (filter.keyword) {
      const keyword = filter.keyword.toLowerCase();
      const haystack = `${thread.title} ${thread.content}`.toLowerCase();

      if (!haystack.includes(keyword)) {
        return false;
      }
    }

    return true;
  }
}

