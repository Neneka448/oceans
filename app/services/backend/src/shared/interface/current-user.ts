import type { FastifyRequest } from "fastify";
import { AppError } from "../errors/app-error.js";
import { ErrorCode } from "../errors/error-code.js";

const USER_ID_HEADER = "x-user-id";

const readHeaderValue = (request: FastifyRequest, headerName: string): string | undefined => {
  const value = request.headers[headerName];

  if (Array.isArray(value)) {
    return value[0];
  }

  if (typeof value === "string") {
    return value;
  }

  return undefined;
};

export const requireCurrentUserId = (request: FastifyRequest): string => {
  const userId = readHeaderValue(request, USER_ID_HEADER)?.trim();

  if (!userId) {
    throw new AppError(ErrorCode.Unauthorized, "missing x-user-id header", 401);
  }

  return userId;
};
