import type { FastifyInstance } from "fastify";
import mysql from "mysql2/promise";
import { env } from "../../config/env.js";

export type { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from "mysql2/promise";

let pool: mysql.Pool | null = null;

export const createPool = (): mysql.Pool => {
  if (pool) {
    return pool;
  }

  pool = mysql.createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    waitForConnections: true,
    connectionLimit: env.DB_CONNECTION_LIMIT,
    queueLimit: env.DB_QUEUE_LIMIT,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    connectTimeout: 10_000,
    charset: "utf8mb4"
  });

  return pool;
};

export const getPool = (): mysql.Pool => {
  if (!pool) {
    throw new Error("Database pool not initialized");
  }

  return pool;
};

export const closePool = async (): Promise<void> => {
  if (!pool) {
    return;
  }

  await pool.end();
  pool = null;
};

export const databasePlugin = async (fastify: FastifyInstance): Promise<void> => {
  const db = createPool();

  try {
    const connection = await db.getConnection();
    connection.release();
    fastify.log.info({ event: "database.connection.established" }, "Database connection established");
  } catch (error) {
    fastify.log.error({ err: error, event: "database.connection.failed" }, "Failed to connect to database");
    throw error;
  }

  fastify.decorate("db", db);

  fastify.addHook("onClose", async () => {
    await closePool();
    fastify.log.info({ event: "database.pool.closed" }, "Database connection pool closed");
  });
};

declare module "fastify" {
  interface FastifyInstance {
    db: mysql.Pool;
  }
}
