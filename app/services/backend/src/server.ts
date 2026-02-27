import Fastify, { type FastifyInstance } from "fastify";
import sensible from "@fastify/sensible";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config/env.js";
import { loggerOptions } from "./shared/logging/logger.js";
import { registerErrorHandler } from "./shared/errors/error-handler.js";
import { registerRequestLoggingHooks } from "./shared/logging/request-logging.js";
import { exampleRoutes } from "./modules/example/interface/http/example-routes.js";
import { authRoutes } from "./modules/auth/interface/http/auth-routes.js";
import { userRoutes } from "./modules/user/interface/http/user-routes.js";
import { threadRoutes } from "./modules/thread/interface/http/thread-routes.js";
import { assignRoutes } from "./modules/assign/interface/http/assign-routes.js";
import { taskRoutes } from "./modules/task/interface/http/task-routes.js";
import { notificationRoutes } from "./modules/notification/interface/http/notification-routes.js";
import { realtimeRoutes } from "./modules/realtime/interface/http/realtime-routes.js";
import { ConversationService } from "./modules/conversation/application/conversation-service.js";
import { ConversationMemoryRepository } from "./modules/conversation/infra/conversation-memory-repository.js";
import { UserMemoryRepository } from "./modules/conversation/infra/user-memory-repository.js";
import { createConversationRoutes } from "./modules/conversation/interface/http/conversation-routes.js";
import { MessageService } from "./modules/message/application/message-service.js";
import { MessageMemoryRepository } from "./modules/message/infra/message-memory-repository.js";
import { createMessageRoutes } from "./modules/message/interface/http/message-routes.js";
import { InMemoryDomainEventPublisher } from "./shared/events/domain-event-publisher.js";
import { auditRoutes } from "./modules/audit/interface/http/audit-routes.js";
import { knowledgeRoutes } from "./modules/knowledge/interface/http/knowledge-routes.js";

let idCounter = 0;
const generateId = (): string => {
  idCounter++;
  return `${Date.now()}-${idCounter}-${Math.random().toString(36).substring(2, 11)}`;
};

const conversationRepo = new ConversationMemoryRepository();
const messageRepo = new MessageMemoryRepository();
const userRepo = new UserMemoryRepository();
const eventPublisher = new InMemoryDomainEventPublisher();

userRepo.createTestUsers();

const conversationService = new ConversationService(
  conversationRepo,
  userRepo,
  messageRepo,
  generateId
);

const messageService = new MessageService(
  messageRepo,
  conversationService,
  userRepo,
  eventPublisher,
  generateId
);

export const buildApp = (): FastifyInstance => {
  const app = Fastify({
    logger: loggerOptions,
    requestIdHeader: "x-request-id",
    disableRequestLogging: true
  });

  app.register(sensible);
  app.register(cors, { origin: true, credentials: true });
  app.register(helmet);
  app.register(rateLimit, { max: 200, timeWindow: "1 minute" });

  registerRequestLoggingHooks(app);
  registerErrorHandler(app);

  app.get("/healthz", async () => ({ ok: true, service: env.SERVICE_NAME }));
  app.register(authRoutes, { prefix: "/auth" });
  app.register(userRoutes, { prefix: "/users" });
  app.register(exampleRoutes, { prefix: "/example" });
  app.register(threadRoutes);
  app.register(assignRoutes);
  app.register(taskRoutes);
  app.register(notificationRoutes);
  app.register(realtimeRoutes);
  app.register(auditRoutes, { prefix: "/audit" });
  app.register(knowledgeRoutes, { prefix: "/users/:user_id/domain-knowledge" });
  app.register(createConversationRoutes(conversationService), { prefix: "/conversations" });
  app.register(createMessageRoutes(messageService), { prefix: "/conversations/:conv_id/messages" });

  return app;
};
