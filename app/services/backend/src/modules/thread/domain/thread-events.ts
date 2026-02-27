import type { ThreadType } from "./thread.js";

type BaseEvent<TName extends string, TPayload> = {
  name: TName;
  payload: TPayload;
  occurredAt: string;
};

export type ThreadCreatedEvent = BaseEvent<
  "ThreadCreated",
  {
    threadId: string;
    threadType: ThreadType;
    authorId: string;
  }
>;

export type ReplyAddedEvent = BaseEvent<
  "ReplyAdded",
  {
    threadId: string;
    replyId: string;
    authorId: string;
  }
>;

export type ReplyAcceptedEvent = BaseEvent<
  "ReplyAccepted",
  {
    threadId: string;
    replyId: string;
    accepterId: string;
    replyAuthorId: string;
  }
>;

export type MentionDetectedEvent = BaseEvent<
  "MentionDetected",
  {
    sourceType: "thread" | "reply";
    sourceId: string;
    threadId: string;
    mentionedUserId: string;
    actorId: string;
  }
>;

export type ThreadDomainEvent =
  | ThreadCreatedEvent
  | ReplyAddedEvent
  | ReplyAcceptedEvent
  | MentionDetectedEvent;

