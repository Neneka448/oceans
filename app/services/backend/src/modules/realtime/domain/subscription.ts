import { AppError } from "../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../shared/errors/error-code.js";

export type SubscriptionChannel = `thread:${string}` | `task:${string}` | `user_audit:${string}` | "user_feed";

const channelPatterns: RegExp[] = [/^thread:[^\s:]+$/, /^task:[^\s:]+$/, /^user_audit:[^\s:]+$/];

export const isSubscriptionChannel = (value: string): value is SubscriptionChannel => {
  if (value === "user_feed") {
    return true;
  }

  return channelPatterns.some((pattern) => pattern.test(value));
};

export const ensureSubscriptionChannel = (value: string): SubscriptionChannel => {
  if (!isSubscriptionChannel(value)) {
    throw new AppError(ErrorCode.InvalidParams, "invalid channel", 400, {
      field: "channel"
    });
  }

  return value;
};
