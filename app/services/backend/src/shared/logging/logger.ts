import type { FastifyServerOptions } from "fastify";
import { env } from "../../config/env.js";

export const loggerOptions: FastifyServerOptions["logger"] = {
  level: env.LOG_LEVEL,
  messageKey: "message",
  timestamp: () => `,\"timestamp\":\"${new Date().toISOString()}\"`,
  base: {
    service: env.SERVICE_NAME,
    env: env.NODE_ENV
  },
  serializers: {
    req(request) {
      return {
        method: request.method,
        url: request.url,
        path: request.url.split("?")[0],
        remote_address: request.socket.remoteAddress,
        remote_port: request.socket.remotePort
      };
    },
    res(reply) {
      return {
        status_code: reply.statusCode
      };
    },
    err(error) {
      return {
        type: error.name,
        message: error.message,
        stack: error.stack ?? ""
      };
    }
  },
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            singleLine: true,
            translateTime: "SYS:standard"
          }
        }
      : undefined
};
