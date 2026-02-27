import type { ThreadEntity } from "./thread.js";

export type ThreadListFilter = {
  type?: ThreadEntity["type"];
  status?: ThreadEntity["status"];
  tags?: string[];
  keyword?: string;
};

export interface ThreadRepository {
  save(thread: ThreadEntity): void;
  findById(threadId: string): ThreadEntity | undefined;
  list(filter?: ThreadListFilter): ThreadEntity[];
}

