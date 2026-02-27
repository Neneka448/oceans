import type { IncomingHttpHeaders } from "node:http";
import { AppError } from "../../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../../shared/errors/error-code.js";
import type { RequestActor } from "../../application/request-actor.js";

const readHeaderValue = (headers: IncomingHttpHeaders, key: string): string | undefined => {
  const value = headers[key];
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

export const parseRequestActor = (headers: IncomingHttpHeaders): RequestActor => {
  const userId = readHeaderValue(headers, "x-user-id")?.trim();

  if (!userId) {
    throw new AppError(ErrorCode.Unauthorized, "x-user-id header is required", 401);
  }

  const role = readHeaderValue(headers, "x-user-role") === "admin" ? "admin" : "user";
  const username = readHeaderValue(headers, "x-user-name")?.trim() || userId;

  return {
    userId,
    username,
    role
  };
};

export const parseRequirementAuthorIdHint = (headers: IncomingHttpHeaders): string | undefined => {
  const value = readHeaderValue(headers, "x-requirement-author-id")?.trim();
  return value || undefined;
};
