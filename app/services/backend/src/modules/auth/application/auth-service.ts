import { createHash } from "node:crypto";
import { AppError } from "../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../shared/errors/error-code.js";
import type { AuthContext, UserRole } from "../domain/auth-types.js";
import { authMemoryStore } from "../infra/auth-memory-store.js";

const hashPassword = (password: string): string =>
  createHash("sha256").update(password).digest("hex");

const nowPlusHours = (hours: number): string => {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
};

const assertCanActOnUser = (role: UserRole, actorUserId: string, targetUserId: string): void => {
  if (role === "admin") {
    return;
  }

  if (actorUserId !== targetUserId) {
    throw new AppError(ErrorCode.Forbidden, "cannot act on another user", 403);
  }
};

export class AuthService {
  register(input: { username: string; password: string }): { user_id: string; username: string } {
    try {
      const user = authMemoryStore.createUser({
        username: input.username,
        passwordHash: hashPassword(input.password)
      });

      return {
        user_id: user.id,
        username: user.username
      };
    } catch (error) {
      if (error instanceof Error && error.message === "username_taken") {
        throw new AppError(ErrorCode.AuthUsernameTaken, "username already exists", 409, {
          field: "username"
        });
      }

      throw error;
    }
  }

  login(input: { username: string; password: string }): {
    token: string;
    expires_at: string;
    user_id: string;
  } {
    const user = authMemoryStore.findUserByUsername(input.username);
    const passwordHash = hashPassword(input.password);

    if (!user || user.passwordHash !== passwordHash) {
      throw new AppError(ErrorCode.AuthInvalidCredentials, "invalid username or password", 401);
    }

    const token = authMemoryStore.createToken(user.id, "session");
    authMemoryStore.touchLastActive(user.id);

    return {
      token,
      expires_at: nowPlusHours(24),
      user_id: user.id
    };
  }

  logout(rawToken: string): void {
    const status = authMemoryStore.readTokenStatus(rawToken);

    if (status.status === "missing") {
      throw new AppError(ErrorCode.Unauthorized, "token is missing or invalid", 401);
    }

    if (status.status === "revoked") {
      throw new AppError(ErrorCode.AuthTokenRevoked, "token has been revoked", 401);
    }

    authMemoryStore.revokeRawToken(rawToken);
  }

  generateApiToken(actor: AuthContext, targetUserId?: string): { api_token: string } {
    const resolvedUserId = targetUserId ?? actor.userId;
    assertCanActOnUser(actor.role, actor.userId, resolvedUserId);

    const user = authMemoryStore.findUserById(resolvedUserId);
    if (!user) {
      throw new AppError(ErrorCode.NotFound, "user not found", 404);
    }

    const apiToken = authMemoryStore.createToken(resolvedUserId, "api");
    authMemoryStore.touchLastActive(actor.userId);

    return { api_token: apiToken };
  }

  revokeApiToken(actor: AuthContext, targetUserId?: string): void {
    const resolvedUserId = targetUserId ?? actor.userId;
    assertCanActOnUser(actor.role, actor.userId, resolvedUserId);

    const user = authMemoryStore.findUserById(resolvedUserId);
    if (!user) {
      throw new AppError(ErrorCode.NotFound, "user not found", 404);
    }

    authMemoryStore.revokeUserTokens(resolvedUserId, "api");
    authMemoryStore.touchLastActive(actor.userId);
  }

  authenticate(rawToken: string): AuthContext {
    const status = authMemoryStore.readTokenStatus(rawToken);

    if (status.status === "missing") {
      throw new AppError(ErrorCode.Unauthorized, "token is missing or invalid", 401);
    }

    if (status.status === "revoked") {
      throw new AppError(ErrorCode.AuthTokenRevoked, "token has been revoked", 401);
    }

    const user = authMemoryStore.findUserById(status.token.userId);
    if (!user) {
      throw new AppError(ErrorCode.Unauthorized, "token owner not found", 401);
    }

    authMemoryStore.touchLastActive(user.id);

    return {
      userId: user.id,
      username: user.username,
      role: user.role,
      tokenType: status.token.tokenType,
      rawToken
    };
  }
}

export const authService = new AuthService();
