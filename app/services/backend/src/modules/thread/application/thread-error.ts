import { AppError } from "../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../shared/errors/error-code.js";

export const threadErrorCodes = {
  invalidStatusTransition: "thread.invalid_status_transition",
  acceptOnlyKnowledge: "thread.accept_only_knowledge",
  replyAlreadyAccepted: "thread.reply_already_accepted",
  notAuthor: "thread.not_author",
  notRequirement: "thread.not_requirement"
} as const;

export type ThreadErrorCode = (typeof threadErrorCodes)[keyof typeof threadErrorCodes];

const asErrorCode = (code: ThreadErrorCode): ErrorCode => code as unknown as ErrorCode;

export const threadAppError = (
  code: ThreadErrorCode,
  message: string,
  statusCode: number,
  details?: unknown
): AppError => new AppError(asErrorCode(code), message, statusCode, details);

