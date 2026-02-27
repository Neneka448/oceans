import { ReplyService } from "../../reply/application/reply-service.js";
import { InMemoryReplyRepository } from "../../reply/infra/in-memory-reply-repository.js";
import { ThreadService } from "./thread-service.js";
import { InMemoryThreadEventPublisher } from "../infra/in-memory-thread-event-publisher.js";
import { InMemoryThreadRepository } from "../infra/in-memory-thread-repository.js";

export type ThreadReplyModule = {
  threadService: ThreadService;
  replyService: ReplyService;
  eventPublisher: InMemoryThreadEventPublisher;
};

export const createThreadReplyModule = (): ThreadReplyModule => {
  const threadRepository = new InMemoryThreadRepository();
  const replyRepository = new InMemoryReplyRepository();
  const eventPublisher = new InMemoryThreadEventPublisher();

  return {
    threadService: new ThreadService({
      threadRepository,
      replyRepository,
      eventPublisher
    }),
    replyService: new ReplyService({
      threadRepository,
      replyRepository,
      eventPublisher
    }),
    eventPublisher
  };
};

const defaultThreadReplyModule = createThreadReplyModule();

export const getDefaultThreadReplyModule = (): ThreadReplyModule => defaultThreadReplyModule;

