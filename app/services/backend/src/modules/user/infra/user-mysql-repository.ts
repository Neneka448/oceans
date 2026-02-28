import type { RowDataPacket } from "mysql2/promise";
import { BaseRepository } from "../../../infra/database/base-repository.js";
import type { User, UserRepository } from "../domain/user-types.js";

interface UserRow extends RowDataPacket {
  id: string;
  username: string;
  password_hash: string;
  avatar: string | null;
  domain_description: string | null;
  domain_tags: string | null;
  last_active_at: number | null;
  created_at: number;
  updated_at: number;
}

const selectColumns = `
  SELECT
    id,
    username,
    password_hash,
    avatar,
    domain_description,
    CAST(domain_tags AS CHAR) AS domain_tags,
    UNIX_TIMESTAMP(last_active_at) AS last_active_at,
    UNIX_TIMESTAMP(created_at) AS created_at,
    UNIX_TIMESTAMP(updated_at) AS updated_at
  FROM users
`;

export class UserMySqlRepository extends BaseRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    const rows = await this.query<UserRow>(`${selectColumns} WHERE id = ? LIMIT 1`, [id]);
    return rows.length > 0 ? this.toDomain(rows[0]) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const rows = await this.query<UserRow>(`${selectColumns} WHERE username = ? LIMIT 1`, [username]);
    return rows.length > 0 ? this.toDomain(rows[0]) : null;
  }

  async findAll(): Promise<User[]> {
    const rows = await this.query<UserRow>(`${selectColumns} ORDER BY created_at DESC`);
    return rows.map((row) => this.toDomain(row));
  }

  async save(user: User): Promise<void> {
    const nowTs = Math.floor(Date.now() / 1000);
    const createdAtTs = this.toTimestamp(user.createdAt) ?? nowTs;
    const updatedAtTs = this.toTimestamp(user.updatedAt) ?? nowTs;

    await this.execute(
      `INSERT INTO users (
        id,
        username,
        password_hash,
        avatar,
        domain_description,
        domain_tags,
        last_active_at,
        created_at,
        updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, CAST(? AS JSON), FROM_UNIXTIME(?), FROM_UNIXTIME(?), FROM_UNIXTIME(?)
      )
      ON DUPLICATE KEY UPDATE
        username = VALUES(username),
        password_hash = VALUES(password_hash),
        avatar = VALUES(avatar),
        domain_description = VALUES(domain_description),
        domain_tags = VALUES(domain_tags),
        last_active_at = VALUES(last_active_at),
        updated_at = VALUES(updated_at)`,
      [
        user.id,
        user.username,
        user.passwordHash,
        user.avatar ?? null,
        user.domainDescription ?? null,
        this.toJson(user.domainTags) ?? null,
        this.toTimestamp(user.lastActiveAt) ?? null,
        createdAtTs,
        updatedAtTs
      ]
    );
  }

  async delete(id: string): Promise<void> {
    await this.execute("DELETE FROM users WHERE id = ?", [id]);
  }

  async updateLastActiveAt(id: string, at: Date): Promise<void> {
    await this.execute(
      "UPDATE users SET last_active_at = FROM_UNIXTIME(?), updated_at = FROM_UNIXTIME(?) WHERE id = ?",
      [this.toTimestamp(at), this.toTimestamp(at), id]
    );
  }

  private toDomain(row: UserRow): User {
    return {
      id: row.id,
      username: row.username,
      passwordHash: row.password_hash,
      avatar: row.avatar ?? undefined,
      domainDescription: row.domain_description ?? undefined,
      domainTags: this.parseDomainTags(row.domain_tags),
      lastActiveAt: this.fromTimestamp(row.last_active_at) ?? undefined,
      createdAt: this.fromTimestamp(row.created_at) ?? new Date(0),
      updatedAt: this.fromTimestamp(row.updated_at) ?? new Date(0)
    };
  }

  private parseDomainTags(raw: string | null): string[] | undefined {
    if (!raw) {
      return undefined;
    }

    const parsed = this.fromJson<unknown>(raw);
    if (!Array.isArray(parsed)) {
      return undefined;
    }

    return parsed.filter((item): item is string => typeof item === "string");
  }
}
