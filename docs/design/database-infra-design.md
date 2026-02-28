# Oceans 数据库 Infra 层设计方案

## 1. 现状分析

### 1.1 当前架构
Oceans 后端采用 **DDD (领域驱动设计)** 分层架构：

```
src/modules/{module}/
├── domain/          # 领域层：实体、值对象、领域事件、Repository 接口
├── application/     # 应用层：服务编排、用例实现
├── infra/           # 基础设施层：Repository 实现、外部服务
└── interface/http/  # 接口层：HTTP 路由、控制器
```

### 1.2 当前 Infra 层问题
**所有模块的 Repository 都是内存实现**：

- `auth-memory-store.ts`
- `conversation-memory-repository.ts`
- `message-memory-repository.ts`
- `notification-memory-repository.ts`
- `audit-memory-repository.ts`
- `knowledge-memory-repository.ts`
- `assign-application-memory-repository.ts`
- `task-memory-repository.ts`
- `in-memory-thread-repository.ts`
- `in-memory-reply-repository.ts`

**问题**：
- ❌ 服务重启数据丢失
- ❌ 无法支持多实例部署
- ❌ 没有数据库连接池管理
- ❌ 无法利用 MySQL 的事务能力

### 1.3 技术栈
- **框架**: Fastify 5.x
- **语言**: TypeScript (ES Modules)
- **数据库**: MySQL 8.0 (已通过 Docker 启动)
- **Node.js**: >= 20

---

## 2. 设计方案

### 2.1 总体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Fastify Application                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Routes    │  │  Services   │  │   Domain Events     │  │
│  └──────┬──────┘  └──────┬──────┘  └─────────────────────┘  │
│         │                │                                   │
│         └────────────────┼─────────────────┐                 │
│                          ▼                 │                 │
│  ┌──────────────────────────────────────┐  │                 │
│  │      Application Service Layer       │  │                 │
│  └──────────────────┬───────────────────┘  │                 │
│                     │                      │                 │
│                     ▼                      │                 │
│  ┌──────────────────────────────────────┐  │                 │
│  │    Repository Interface (Domain)     │  │                 │
│  └──────────────────┬───────────────────┘  │                 │
│                     │                      │                 │
│  ═══════════════════╪══════════════════════╪═════════════════│
│                     │         Infra Layer  │                 │
│                     ▼                      │                 │
│  ┌──────────────────────────────────────┐  │                 │
│  │   MySQL Repository Implementation    │──┘                 │
│  │   - UserMySqlRepository              │                     │
│  │   - ThreadMySqlRepository            │                     │
│  │   - ...                              │                     │
│  └──────────────────┬───────────────────┘                     │
│                     │                                         │
│  ┌──────────────────┴───────────────────┐                     │
│  │     Database Connection Pool         │◄──── Fastify Plugin │
│  │     (mysql2/promise)                 │                     │
│  └──────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   MySQL 8.0      │
                    │   localhost:3306 │
                    └──────────────────┘
```

### 2.2 核心组件

#### 2.2.1 数据库连接池 (DatabasePool)
- 封装 mysql2 连接池
- 支持连接健康检查
- 与 Fastify 生命周期集成

#### 2.2.2 BaseRepository
- 提供通用的 CRUD 操作
- 封装事务支持
- 类型安全封装

#### 2.2.3 MySQL Repository 实现
- 每个 Domain Repository 接口对应一个 MySQL 实现
- 使用原始 SQL + 参数化查询
- 领域对象与数据库记录的转换

---

## 3. 代码实现

### 3.1 安装依赖

```bash
cd app/services/backend
yarn add mysql2
yarn add -D @types/mysql2
```

### 3.2 环境变量配置

更新 `src/config/env.ts`：

```typescript
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  SERVICE_NAME: z.string().default("oceans-backend"),
  
  // 数据库配置
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().default("root"),
  DB_PASSWORD: z.string().default("root"),
  DB_NAME: z.string().default("oceans"),
  DB_CONNECTION_LIMIT: z.coerce.number().int().positive().default(10),
  DB_QUEUE_LIMIT: z.coerce.number().int().positive().default(0),
});

export type AppEnv = z.infer<typeof envSchema>;
export const env: AppEnv = envSchema.parse(process.env);
```

### 3.3 数据库连接池

创建 `src/infra/database/database-pool.ts`：

```typescript
import mysql from "mysql2/promise";
import type { FastifyInstance } from "fastify";
import { env } from "../../config/env.js";

export type { Pool, PoolConnection, RowDataPacket, OkPacket } from "mysql2/promise";

let pool: mysql.Pool | null = null;

export const createPool = (): mysql.Pool => {
  if (pool) return pool;

  pool = mysql.createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    connectionLimit: env.DB_CONNECTION_LIMIT,
    queueLimit: env.DB_QUEUE_LIMIT,
    waitForConnections: true,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    // 连接超时配置
    connectTimeout: 10000,
    acquireTimeout: 60000,
    timeout: 60000,
    // 字符集
    charset: "utf8mb4_unicode_ci",
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
  if (pool) {
    await pool.end();
    pool = null;
  }
};

// Fastify 插件
export async function databasePlugin(fastify: FastifyInstance): Promise<void> {
  const dbPool = createPool();
  
  // 测试连接
  try {
    const connection = await dbPool.getConnection();
    fastify.log.info("Database connection established");
    connection.release();
  } catch (error) {
    fastify.log.error({ err: error }, "Failed to connect to database");
    throw error;
  }

  // 装饰器：让 routes 可以通过 fastify.db 访问连接池
  fastify.decorate("db", dbPool);

  // 关闭时清理连接池
  fastify.addHook("onClose", async () => {
    await closePool();
    fastify.log.info("Database connection pool closed");
  });
}

// 类型声明扩展
declare module "fastify" {
  interface FastifyInstance {
    db: mysql.Pool;
  }
}
```

### 3.4 BaseRepository

创建 `src/infra/database/base-repository.ts`：

```typescript
import type { Pool, PoolConnection, RowDataPacket, OkPacket } from "mysql2/promise";
import { getPool } from "./database-pool.js";

export type QueryResult<T = RowDataPacket> = T[];
export type MutationResult = OkPacket;

export interface TransactionContext {
  connection: PoolConnection;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export abstract class BaseRepository {
  protected pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  protected async query<T extends RowDataPacket>(
    sql: string,
    params?: unknown[]
  ): Promise<T[]> {
    const [rows] = await this.pool.execute<T[]>(sql, params);
    return rows;
  }

  protected async execute(
    sql: string,
    params?: unknown[]
  ): Promise<OkPacket> {
    const [result] = await this.pool.execute<OkPacket>(sql, params);
    return result;
  }

  protected async transaction<T>(
    callback: (trx: TransactionContext) => Promise<T>
  ): Promise<T> {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const trx: TransactionContext = {
        connection,
        commit: () => connection.commit(),
        rollback: () => connection.rollback(),
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
    params?: unknown[]
  ): Promise<T[]> {
    const [rows] = await trx.connection.execute<T[]>(sql, params);
    return rows;
  }

  protected async executeInTransaction(
    trx: TransactionContext,
    sql: string,
    params?: unknown[]
  ): Promise<OkPacket> {
    const [result] = await trx.connection.execute<OkPacket>(sql, params);
    return result;
  }

  // 生成 UUID v4
  protected generateId(): string {
    return crypto.randomUUID();
  }

  // JSON 字段处理
  protected toJson<T>(data: T | null): string | null {
    return data ? JSON.stringify(data) : null;
  }

  protected fromJson<T>(json: string | null): T | null {
    return json ? JSON.parse(json) : null;
  }

  // 日期处理
  protected toTimestamp(date: Date | null): number | null {
    return date ? Math.floor(date.getTime() / 1000) : null;
  }

  protected fromTimestamp(timestamp: number | null): Date | null {
    return timestamp ? new Date(timestamp * 1000) : null;
  }
}
```

### 3.5 Repository 实现示例

#### UserMySqlRepository

创建 `src/modules/user/infra/user-mysql-repository.ts`：

```typescript
import { BaseRepository } from "../../../infra/database/base-repository.js";
import type { User, UserRepository } from "../domain/user-types.js";
import type { RowDataPacket } from "mysql2/promise";

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

export class UserMySqlRepository extends BaseRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    const rows = await this.query<UserRow>(
      "SELECT * FROM users WHERE id = ?",
      [id]
    );
    return rows.length > 0 ? this.toDomain(rows[0]) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const rows = await this.query<UserRow>(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );
    return rows.length > 0 ? this.toDomain(rows[0]) : null;
  }

  async findAll(): Promise<User[]> {
    const rows = await this.query<UserRow>("SELECT * FROM users ORDER BY created_at DESC");
    return rows.map((r) => this.toDomain(r));
  }

  async save(user: User): Promise<void> {
    await this.execute(
      `INSERT INTO users (id, username, password_hash, avatar, domain_description, domain_tags, last_active_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        this.toJson(user.domainTags),
        this.toTimestamp(user.lastActiveAt),
        this.toTimestamp(user.createdAt) ?? Math.floor(Date.now() / 1000),
        this.toTimestamp(user.updatedAt) ?? Math.floor(Date.now() / 1000),
      ]
    );
  }

  async delete(id: string): Promise<void> {
    await this.execute("DELETE FROM users WHERE id = ?", [id]);
  }

  async updateLastActiveAt(id: string, at: Date): Promise<void> {
    await this.execute(
      "UPDATE users SET last_active_at = ? WHERE id = ?",
      [this.toTimestamp(at), id]
    );
  }

  private toDomain(row: UserRow): User {
    return {
      id: row.id,
      username: row.username,
      passwordHash: row.password_hash,
      avatar: row.avatar ?? undefined,
      domainDescription: row.domain_description ?? undefined,
      domainTags: this.fromJson<string[]>(row.domain_tags) ?? undefined,
      lastActiveAt: row.last_active_at ? new Date(row.last_active_at * 1000) : undefined,
      createdAt: new Date(row.created_at * 1000),
      updatedAt: new Date(row.updated_at * 1000),
    };
  }
}
```

### 3.6 Server.ts 集成

更新 `src/server.ts`：

```typescript
import Fastify, { type FastifyInstance } from "fastify";
import sensible from "@fastify/sensible";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config/env.js";
import { loggerOptions } from "./shared/logging/logger.js";
import { registerErrorHandler } from "./shared/errors/error-handler.js";
import { registerRequestLoggingHooks } from "./shared/logging/request-logging.js";
import { databasePlugin } from "./infra/database/database-pool.js";

// ... 其他 imports

export const buildApp = (): FastifyInstance => {
  const app = Fastify({
    logger: loggerOptions,
    requestIdHeader: "x-request-id",
    disableRequestLogging: true
  });

  // 注册数据库插件（最先注册）
  app.register(databasePlugin);

  app.register(sensible);
  app.register(cors, { origin: true, credentials: true });
  app.register(helmet);
  app.register(rateLimit, { max: 200, timeWindow: "1 minute" });

  registerRequestLoggingHooks(app);
  registerErrorHandler(app);

  // ... 路由注册

  return app;
};
```

---

## 4. 迁移策略

### 4.1 逐步迁移计划

| 阶段 | 模块 | 优先级 | 说明 |
|------|------|--------|------|
| 1 | User + Auth | 🔴 高 | 基础依赖，其他模块都依赖它 |
| 2 | Thread + Reply | 🔴 高 | 核心业务 |
| 3 | Notification | 🟡 中 | 依赖 User |
| 4 | Task + Assign | 🟡 中 | 依赖 User, Thread |
| 5 | Conversation + Message | 🟡 中 | 依赖 User |
| 6 | Audit + Knowledge | 🟢 低 | 可独立进行 |
| 7 | Realtime | 🟢 低 | WebSocket 连接管理 |

### 4.2 单模块迁移步骤

以 User 模块为例：

1. **创建 MySQL Repository**
   ```bash
   touch src/modules/user/infra/user-mysql-repository.ts
   ```

2. **实现 Repository 接口**
   - 继承 `BaseRepository`
   - 实现 `UserRepository` 接口
   - 编写 SQL 语句
   - 处理数据转换

3. **更新 Service 层**（可选）
   - 如果 Service 层有兼容问题，进行适配

4. **替换依赖注入**
   ```typescript
   // server.ts 中替换
   // const userRepo = new UserMemoryRepository();
   const userRepo = new UserMySqlRepository();
   ```

5. **测试验证**
   - 单元测试
   - 接口测试
   - 数据一致性验证

---

## 5. 使用示例

### 5.1 在 Route 中使用

```typescript
import type { FastifyInstance } from "fastify";

export async function userRoutes(app: FastifyInstance): Promise<void> {
  // 通过依赖注入获取 Repository
  const userRepo = new UserMySqlRepository();

  app.get("/users/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await userRepo.findById(id);
    
    if (!user) {
      return reply.code(404).send({ error: "User not found" });
    }
    
    return user;
  });
}
```

### 5.2 事务使用示例

```typescript
class AssignService {
  async approveApplication(applicationId: string): Promise<void> {
    await this.assignRepo.transaction(async (trx) => {
      // 1. 更新申请状态
      await this.assignRepo.updateStatusInTrx(trx, applicationId, "approved");
      
      // 2. 创建任务
      const task = await this.taskRepo.createInTrx(trx, {
        requirementThreadId: app.requirementThreadId,
        assigneeId: app.applicantId,
        // ...
      });
      
      // 3. 发送通知
      await this.notificationRepo.createInTrx(trx, {
        recipientId: app.applicantId,
        type: "assign_approved",
        // ...
      });
    });
  }
}
```

---

## 6. 最佳实践

### 6.1 SQL 编写规范

1. **使用参数化查询**，防止 SQL 注入
   ```typescript
   // ✅ 正确
   await this.query("SELECT * FROM users WHERE id = ?", [userId]);
   
   // ❌ 错误
   await this.query(`SELECT * FROM users WHERE id = '${userId}'`);
   ```

2. **字段命名**：数据库 snake_case，TS camelCase
   ```typescript
   // 转换映射
   password_hash → passwordHash
   domain_tags → domainTags
   ```

3. **JSON 字段处理**：使用 BaseRepository 提供的工具方法
   ```typescript
   this.toJson(data)      // 存储前
   this.fromJson<T>(data) // 读取后
   ```

4. **时间戳处理**：统一使用 Unix 时间戳存储
   ```typescript
   this.toTimestamp(date)      // Date → number
   this.fromTimestamp(timestamp) // number → Date
   ```

### 6.2 错误处理

```typescript
try {
  await this.execute(sql, params);
} catch (error) {
  if (error.code === "ER_DUP_ENTRY") {
    throw new AppError(ErrorCode.CONFLICT, "数据已存在");
  }
  if (error.code === "ER_NO_REFERENCED_ROW") {
    throw new AppError(ErrorCode.NOT_FOUND, "关联数据不存在");
  }
  throw error;
}
```

### 6.3 性能优化

1. **批量操作**：使用 `INSERT ... VALUES (...), (...), (...)`
2. **连接池**：根据负载调整 `DB_CONNECTION_LIMIT`
3. **索引**：确保查询字段有合适的索引
4. **分页**：大数据量查询使用 LIMIT/OFFSET

---

## 7. 环境变量配置

在 `.env` 文件中添加：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=oceans
DB_CONNECTION_LIMIT=10
DB_QUEUE_LIMIT=0
```

---

## 8. 相关文档

- [MySQL 8.0 文档](https://dev.mysql.com/doc/refman/8.0/en/)
- [mysql2 npm 包](https://www.npmjs.com/package/mysql2)
- [Fastify 生命周期](https://fastify.dev/docs/latest/Reference/Lifecycle/)
- [DDD Repository 模式](https://martinfowler.com/eaaCatalog/repository.html)

---

## 9. 附录：完整模块清单

需实现 MySQL Repository 的模块：

| 模块 | Domain Repository 接口 | MySQL 实现文件 |
|------|------------------------|----------------|
| User | `UserRepository` | `user/infra/user-mysql-repository.ts` |
| Auth | `AuthStore` | `auth/infra/auth-mysql-store.ts` |
| Thread | `ThreadRepository` | `thread/infra/thread-mysql-repository.ts` |
| Reply | `ReplyRepository` | `reply/infra/reply-mysql-repository.ts` |
| Task | `TaskRepository` | `task/infra/task-mysql-repository.ts` |
| Assign | `AssignApplicationRepository` | `assign/infra/assign-mysql-repository.ts` |
| Notification | `NotificationRepository` | `notification/infra/notification-mysql-repository.ts` |
| Conversation | `ConversationRepository` | `conversation/infra/conversation-mysql-repository.ts` |
| Message | `MessageRepository` | `message/infra/message-mysql-repository.ts` |
| Audit | `AuditRepository` | `audit/infra/audit-mysql-repository.ts` |
| Knowledge | `KnowledgeRepository` | `knowledge/infra/knowledge-mysql-repository.ts` |

---

*文档版本: 1.0*
*创建时间: 2025-02-28*
*作者: Dev-Team*
