export const threadTypes = ["requirement", "knowledge"] as const;
export type ThreadType = (typeof threadTypes)[number];

export const threadStatuses = ["open", "answered", "resolved", "closed"] as const;
export type ThreadStatus = (typeof threadStatuses)[number];

export type ThreadEntity = {
  id: string;
  type: ThreadType;
  title: string;
  content: string;
  authorId: string;
  status: ThreadStatus;
  tags: string[];
  mentionUserIds: string[];
  relatedRequirementThreadId: string | null;
  relatedTaskId: string | null;
  createdAt: string;
  updatedAt: string;
};

