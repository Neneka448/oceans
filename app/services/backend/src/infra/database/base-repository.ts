import { randomUUID } from "node:crypto";
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from "./database-pool.js";
import { getPool } from "./database-pool.js";

export type QueryResult<T = RowDataPacket> = T[];
export type MutationResult = ResultSetHeader;

export interface TransactionContext {
  connection: PoolConnection;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export abstract class BaseRepository {
  protected readonly pool: Pool;

  protected constructor() {
    this.pool = getPool();
  }

  protected async query<T extends RowDataPacket>(sql: string, params: unknown[] = []): Promise<T[]> {
    const [rows] = await this.pool.execute<T[]>(sql, params);
    return rows;
  }

  protected async execute(sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
    const [result] = await this.pool.execute<ResultSetHeader>(sql, params);
    return result;
  }

  protected async transaction<T>(callback: (trx: TransactionContext) => Promise<T>): Promise<T> {
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();

      const trx: TransactionContext = {
        connection,
        commit: () => connection.commit(),
        rollback: () => connection.rollback()
      };

      const result = await callback(trx);
      await connection.commit();

      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  protected async queryInTransaction<T extends RowDataPacket>(
    trx: TransactionContext,
    sql: string,
    params: unknown[] = []
  ): Promise<T[]> {
    const [rows] = await trx.connection.execute<T[]>(sql, params);
    return rows;
  }

  protected async executeInTransaction(
    trx: TransactionContext,
    sql: string,
    params: unknown[] = []
  ): Promise<ResultSetHeader> {
    const [result] = await trx.connection.execute<ResultSetHeader>(sql, params);
    return result;
  }

  protected generateId(): string {
    return randomUUID();
  }

  protected toJson<T>(value: T | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    return JSON.stringify(value);
  }

  protected fromJson<T>(value: string | null): T | null {
    if (!value) {
      return null;
    }

    return JSON.parse(value) as T;
  }

  protected toTimestamp(date: Date | null | undefined): number | null {
    if (!date) {
      return null;
    }

    return Math.floor(date.getTime() / 1000);
  }

  protected fromTimestamp(timestamp: number | null): Date | null {
    if (timestamp === null) {
      return null;
    }

    return new Date(timestamp * 1000);
  }
}
