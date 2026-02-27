import { createHash, randomBytes } from "node:crypto";
import type {
  AccessTokenRecord,
  AccessTokenType,
  UserDetail,
  UserRecord,
  UserSummary
} from "../domain/auth-types.js";

type ListUsersInput = {
  tags: string[];
  page: number;
  pageSize: number;
};

type UpdateUserInput = {
  username?: string;
  avatar?: string;
  domainDescription?: string;
  domainTags?: string[];
};

type TokenStatus =
  | { status: "missing" }
  | { status: "revoked"; token: AccessTokenRecord }
  | { status: "active"; token: AccessTokenRecord };

const hashValue = (value: string): string => createHash("sha256").update(value).digest("hex");

const nowIso = (): string => new Date().toISOString();

class AuthMemoryStore {
  private userSeq = 1;
  private tokenSeq = 1;
  private readonly usersById = new Map<string, UserRecord>();
  private readonly userIdByName = new Map<string, string>();
  private readonly tokensByHash = new Map<string, AccessTokenRecord>();

  reset(): void {
    this.userSeq = 1;
    this.tokenSeq = 1;
    this.usersById.clear();
    this.userIdByName.clear();
    this.tokensByHash.clear();
  }

  createUser(input: { username: string; passwordHash: string }): UserRecord {
    const normalizedUsername = input.username.trim();

    if (this.userIdByName.has(normalizedUsername)) {
      throw new Error("username_taken");
    }

    const id = `user_${this.userSeq++}`;
    const createdAt = nowIso();

    const user: UserRecord = {
      id,
      username: normalizedUsername,
      passwordHash: input.passwordHash,
      avatar: "",
      domainDescription: "",
      domainTags: [],
      lastActiveAt: null,
      role: normalizedUsername === "admin" ? "admin" : "user",
      createdAt,
      updatedAt: createdAt
    };

    this.usersById.set(id, user);
    this.userIdByName.set(normalizedUsername, id);

    return { ...user, domainTags: [...user.domainTags] };
  }

  findUserById(userId: string): UserRecord | null {
    const user = this.usersById.get(userId);
    if (!user) {
      return null;
    }

    return { ...user, domainTags: [...user.domainTags] };
  }

  findUserByUsername(username: string): UserRecord | null {
    const userId = this.userIdByName.get(username);
    if (!userId) {
      return null;
    }

    return this.findUserById(userId);
  }

  updateUser(userId: string, input: UpdateUserInput): UserRecord | null {
    const original = this.usersById.get(userId);
    if (!original) {
      return null;
    }

    if (input.username && input.username !== original.username) {
      if (this.userIdByName.has(input.username)) {
        throw new Error("username_taken");
      }

      this.userIdByName.delete(original.username);
      this.userIdByName.set(input.username, userId);
      original.username = input.username;
    }

    if (input.avatar !== undefined) {
      original.avatar = input.avatar;
    }

    if (input.domainDescription !== undefined) {
      original.domainDescription = input.domainDescription;
    }

    if (input.domainTags !== undefined) {
      original.domainTags = [...input.domainTags];
    }

    original.updatedAt = nowIso();

    return { ...original, domainTags: [...original.domainTags] };
  }

  listUsers(input: ListUsersInput): { items: UserSummary[]; total: number } {
    const normalizedTags = input.tags.map((tag) => tag.trim()).filter(Boolean);

    const filtered = [...this.usersById.values()].filter((user) => {
      if (normalizedTags.length === 0) {
        return true;
      }

      return normalizedTags.every((tag) => user.domainTags.includes(tag));
    });

    const total = filtered.length;
    const offset = (input.page - 1) * input.pageSize;
    const paged = filtered.slice(offset, offset + input.pageSize);

    const items: UserSummary[] = paged.map((user) => ({
      user_id: user.id,
      username: user.username,
      avatar: user.avatar,
      domain_tags: [...user.domainTags],
      active_task_count: 0,
      last_active_at: user.lastActiveAt
    }));

    return { items, total };
  }

  createToken(userId: string, tokenType: AccessTokenType): string {
    const rawToken = `${tokenType}_${randomBytes(24).toString("hex")}`;
    const tokenHash = hashValue(rawToken);

    const token: AccessTokenRecord = {
      id: `token_${this.tokenSeq++}`,
      userId,
      tokenHash,
      tokenType,
      isActive: true,
      createdAt: nowIso(),
      revokedAt: null
    };

    this.tokensByHash.set(tokenHash, token);
    return rawToken;
  }

  readTokenStatus(rawToken: string): TokenStatus {
    const tokenHash = hashValue(rawToken);
    const token = this.tokensByHash.get(tokenHash);

    if (!token) {
      return { status: "missing" };
    }

    if (!token.isActive) {
      return { status: "revoked", token: { ...token } };
    }

    return { status: "active", token: { ...token } };
  }

  revokeRawToken(rawToken: string): boolean {
    const tokenHash = hashValue(rawToken);
    const token = this.tokensByHash.get(tokenHash);
    if (!token || !token.isActive) {
      return false;
    }

    token.isActive = false;
    token.revokedAt = nowIso();
    return true;
  }

  revokeUserTokens(userId: string, tokenType: AccessTokenType): number {
    let revokedCount = 0;

    for (const token of this.tokensByHash.values()) {
      if (token.userId !== userId || token.tokenType !== tokenType || !token.isActive) {
        continue;
      }

      token.isActive = false;
      token.revokedAt = nowIso();
      revokedCount += 1;
    }

    return revokedCount;
  }

  touchLastActive(userId: string): void {
    const user = this.usersById.get(userId);
    if (!user) {
      return;
    }

    user.lastActiveAt = nowIso();
    user.updatedAt = user.lastActiveAt;
  }

  toUserDetail(userId: string): UserDetail | null {
    const user = this.usersById.get(userId);
    if (!user) {
      return null;
    }

    return {
      user_id: user.id,
      username: user.username,
      avatar: user.avatar,
      domain_description: user.domainDescription,
      domain_tags: [...user.domainTags],
      last_active_at: user.lastActiveAt,
      active_tasks: [],
      authored_threads: [],
      participated_threads: []
    };
  }
}

export const authMemoryStore = new AuthMemoryStore();

export const resetAuthMemoryStore = (): void => {
  authMemoryStore.reset();
};
