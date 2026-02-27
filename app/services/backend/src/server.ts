import Fastify, { type FastifyInstance } from "fastify";
import sensible from "@fastify/sensible";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config/env.js";
import { loggerOptions } from "./shared/logging/logger.js";
import { registerErrorHandler } from "./shared/errors/error-handler.js";
import { registerRequestLoggingHooks } from "./shared/logging/request-logging.js";

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

  return app;
};
