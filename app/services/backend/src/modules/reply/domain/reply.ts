export type ReplyEntity = {
  id: string;
  threadId: string;
  authorId: string;
  content: string;
  mentionUserIds: string[];
  isAccepted: boolean;
  createdAt: string;
};

