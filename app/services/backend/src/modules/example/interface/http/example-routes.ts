import type { FastifyRequest } from "fastify";
import { AppError } from "../../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../../shared/errors/error-code.js";
import { ok } from "../../../../shared/interface/http-contract.js";
import type { HttpRouteModule } from "../../../../shared/interface/http-route-module.js";
import { ExampleService } from "../../application/example-service.js";
import { ExampleMemoryRepository } from "../../infra/example-memory-repository.js";

type EchoBody = {
  message?: string;
};

const service = new ExampleService();
const repository = new ExampleMemoryRepository();

export const exampleRoutes: HttpRouteModule = async (app) => {
  app.get("/ping", async () => ok({ message: "pong" }));

  app.get("/info", async () => ok(service.getInfo()));

  app.post("/echo", async (request: FastifyRequest<{ Body: EchoBody }>) => {
    const message = request.body?.message?.trim();

    if (!message) {
      throw new AppError(ErrorCode.InvalidParams, "message is required", 400, {
        field: "message"
      });
    }

    repository.push(message);

    return ok({
      ...service.echo(message),
      history: repository.list()
    });
  });
};
