import { z } from "zod";
import { threadStatuses, threadTypes } from "../../domain/thread.js";

const nonEmptyString = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => value.length > 0, "must not be empty");

const nonEmptyStringArray = z.array(nonEmptyString).default([]);

export const threadIdParamSchema = z.object({
  thread_id: nonEmptyString
});

export const threadAndReplyIdParamSchema = z.object({
  thread_id: nonEmptyString,
  reply_id: nonEmptyString
});

export const listThreadsQuerySchema = z.object({
  type: z.enum(threadTypes).optional(),
  status: z.enum(threadStatuses).optional(),
  tags: z
    .string()
    .transform((value) =>
      value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
    .optional(),
  keyword: z
    .string()
    .transform((value) => value.trim())
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20)
});

export const createThreadBodySchema = z.object({
  type: z.enum(threadTypes),
  title: nonEmptyString,
  content: nonEmptyString,
  tags: nonEmptyStringArray.optional(),
  mention_user_ids: nonEmptyStringArray.optional(),
  related_requirement_thread_id: nonEmptyString.nullable().optional(),
  related_task_id: nonEmptyString.nullable().optional()
});

export const updateThreadStatusBodySchema = z.object({
  status: z.enum(threadStatuses)
});

export const createReplyBodySchema = z.object({
  content: nonEmptyString,
  mention_user_ids: nonEmptyStringArray.optional()
});

