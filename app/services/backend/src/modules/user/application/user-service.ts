import { AppError } from "../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../shared/errors/error-code.js";
import type { AuthContext } from "../../auth/domain/auth-types.js";
import { authMemoryStore } from "../../auth/infra/auth-memory-store.js";
import type { ListUsersInput, UpdateUserInput } from "../domain/user-types.js";

const canEditUser = (actor: AuthContext, targetUserId: string): boolean => {
  if (actor.role === "admin") {
    return true;
  }

  return actor.userId === targetUserId;
};

export class UserService {
  listUsers(input: ListUsersInput): {
    items: Array<{
      user_id: string;
      username: string;
      avatar: string;
      domain_tags: string[];
      active_task_count: number;
      last_active_at: string | null;
    }>;
    total: number;
    page: number;
    page_size: number;
  } {
    const { items, total } = authMemoryStore.listUsers({
      tags: input.tags,
      page: input.page,
      pageSize: input.pageSize
    });

    return {
      items,
      total,
      page: input.page,
      page_size: input.pageSize
    };
  }

  getUserDetail(userId: string): {
    user_id: string;
    username: string;
    avatar: string;
    domain_description: string;
    domain_tags: string[];
    last_active_at: string | null;
    active_tasks: Array<{ task_id: string; title: string; status: string }>;
    authored_threads: Array<{ thread_id: string; title: string; type: string }>;
    participated_threads: Array<{ thread_id: string; title: string; reply_count: number }>;
  } {
    const detail = authMemoryStore.toUserDetail(userId);
    if (!detail) {
      throw new AppError(ErrorCode.NotFound, "user not found", 404);
    }

    return detail;
  }

  updateUser(actor: AuthContext, targetUserId: string, input: UpdateUserInput) {
    if (!canEditUser(actor, targetUserId)) {
      throw new AppError(ErrorCode.Forbidden, "cannot edit this user", 403);
    }

    try {
      const updated = authMemoryStore.updateUser(targetUserId, {
        username: input.username,
        avatar: input.avatar,
        domainDescription: input.domain_description,
        domainTags: input.domain_tags
      });

      if (!updated) {
        throw new AppError(ErrorCode.NotFound, "user not found", 404);
      }

      const detail = authMemoryStore.toUserDetail(targetUserId);
      if (!detail) {
        throw new AppError(ErrorCode.NotFound, "user not found", 404);
      }

      return detail;
    } catch (error) {
      if (error instanceof Error && error.message === "username_taken") {
        throw new AppError(ErrorCode.AuthUsernameTaken, "username already exists", 409, {
          field: "username"
        });
      }

      throw error;
    }
  }
}

export const userService = new UserService();
