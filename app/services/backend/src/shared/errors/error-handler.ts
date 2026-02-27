import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "./app-error.js";
import { ErrorCode } from "./error-code.js";

type ErrorBody = {
  ok: false;
  error: {
    code: string;
    message: string;
    field?: string;
  };
};

export const registerErrorHandler = (app: FastifyInstance): void => {
  app.setErrorHandler((error: Error, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof AppError) {
      request.log.warn(
        {
          error_code: error.code,
          status_code: error.statusCode,
          details: error.details
        },
        "application error"
      );

      const body: ErrorBody = {
        ok: false,
        error: {
          code: error.code,
          message: error.message
        }
      };

      reply.status(error.statusCode).send(body);
      return;
    }

    request.log.error({ err: error }, "unhandled error");

    reply.status(500).send({
      ok: false,
      error: {
        code: ErrorCode.ServerError,
        message: "Internal Server Error"
      }
    } satisfies ErrorBody);
  });
};
