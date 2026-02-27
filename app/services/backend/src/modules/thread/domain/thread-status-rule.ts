import type { ThreadStatus } from "./thread.js";

const transitionMap: Record<ThreadStatus, ReadonlySet<ThreadStatus>> = {
  open: new Set<ThreadStatus>(["open", "answered", "resolved", "closed"]),
  answered: new Set<ThreadStatus>(["answered", "resolved", "closed"]),
  resolved: new Set<ThreadStatus>(["resolved", "closed"]),
  closed: new Set<ThreadStatus>(["closed"])
};

export const canTransitionThreadStatus = (
  currentStatus: ThreadStatus,
  nextStatus: ThreadStatus
): boolean => transitionMap[currentStatus].has(nextStatus);

