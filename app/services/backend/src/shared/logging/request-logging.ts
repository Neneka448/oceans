import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export const registerRequestLoggingHooks = (app: FastifyInstance): void => {
  app.addHook("onRequest", (request: FastifyRequest, _reply: FastifyReply, done) => {
    request.log.info(
      {
        request_id: request.id,
        event: "request.received"
      },
      "request received"
    );

    done();
  });

  app.addHook("onResponse", (request: FastifyRequest, reply: FastifyReply, done) => {
    request.log.info(
      {
        request_id: request.id,
        event: "request.completed",
        status_code: reply.statusCode,
        response_time_ms: reply.elapsedTime
      },
      "request completed"
    );

    done();
  });
};
