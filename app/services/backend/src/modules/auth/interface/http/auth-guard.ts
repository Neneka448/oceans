import type { FastifyRequest } from "fastify";
import { AppError } from "../../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../../shared/errors/error-code.js";
import type { AuthContext } from "../../domain/auth-types.js";
import { authService } from "../../application/auth-service.js";

const parseBearerToken = (authorization?: string): string => {
  if (!authorization) {
    throw new AppError(ErrorCode.Unauthorized, "missing authorization header", 401);
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new AppError(ErrorCode.Unauthorized, "invalid authorization header", 401);
  }

  return token;
};

export const authenticateRequest = (request: FastifyRequest): AuthContext => {
  const rawToken = parseBearerToken(request.headers.authorization);
  return authService.authenticate(rawToken);
};
