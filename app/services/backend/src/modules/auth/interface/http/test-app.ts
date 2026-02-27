import Fastify, { type FastifyInstance } from "fastify";
import { registerErrorHandler } from "../../../../shared/errors/error-handler.js";
import { authRoutes } from "./auth-routes.js";
import { userRoutes } from "../../../user/interface/http/user-routes.js";

export const buildTestApp = async (): Promise<FastifyInstance> => {
  const app = Fastify({ logger: false });

  registerErrorHandler(app);
  app.register(authRoutes, { prefix: "/auth" });
  app.register(userRoutes, { prefix: "/users" });

  await app.ready();

  return app;
};
