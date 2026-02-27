# AGENTS 协作手册（Oceans）

## 1. 目的
本文件用于指导多名开发者并行开发 Oceans，确保：
- 文档理解一致
- 模块边界清晰
- 接口与事件契约稳定
- 数据库结构始终与代码同步

---

## 2. 开发前必读顺序
所有开发者首次进入项目，按以下顺序阅读：

1. `docs/requirements/overview.md`（产品全局）
2. `docs/requirements/backend.md`（后端需求语义）
3. `docs/requirements/analyze/user-case.md`（用例全集）
4. `docs/requirements/analyze/er-diagram.md`（实体与关系）
5. `docs/design/api/interface-layer.md`（HTTP/WS 接口契约）
6. `docs/design/realtime/websocket-system.md`（WS 子系统设计）
7. `docs/workstreams/00-overview.md`（并行分工总览）
8. 自己负责的 workstream 文档（01~06）

原则：先理解契约再写代码，不允许“写完再补文档”。

---

## 3. 角色分工（可并行）

### Dev-01：用户与认证
- 对应文档：`docs/workstreams/01-user-auth.md`
- 范围：Auth、User、权限基础

### Dev-02：Thread 与 Reply
- 对应文档：`docs/workstreams/02-thread-reply.md`
- 范围：需求帖/知识帖、回复、采纳、@mention

### Dev-03：Assign 与 Task
- 对应文档：`docs/workstreams/03-assign-task.md`
- 范围：申请/审核/撤回、任务创建与状态流转

### Dev-04：通知与 WebSocket
- 对应文档：`docs/workstreams/04-notification-ws.md`
- 范围：通知记录、WS 连接与订阅、事件推送

### Dev-05：私信会话与消息
- 对应文档：`docs/workstreams/05-conversation-message.md`
- 范围：Conversation、Message、未读计数

### Dev-06：Audit 与领域知识
- 对应文档：`docs/workstreams/06-audit-knowledge.md`
- 范围：AuditEntry/ToolCall、DomainKnowledgeItem

### 3.1 开工声明与边界强约束（必须遵守）
- 每位开发者开始开发前，必须先声明“我是 Dev-0X，负责 workstream-0X”。
- 开发者**只能修改自己分工范围内**的代码与文档。
- 禁止实现、修改、重构他人工作流中的功能（包括“顺手改一下”）。
- 如确需跨工作流改动：先提交阻塞说明，在跨组同步中确认后，由对应负责人实施或结对实施。
- 未声明分工或跨边界开发的提交，视为无效提交，必须回滚。

---

## 4. 模块协作关系图

```mermaid
graph LR
  Client[Web/Claw Client]

  subgraph API[HTTP Interface Layer]
    AuthAPI[Auth & User API]
    ThreadAPI[Thread & Reply API]
    TaskAPI[Assign & Task API]
    MsgAPI[Conversation & Message API]
    AuditAPI[Audit API]
    NotiAPI[Notification API]
  end

  subgraph Domain[Business Modules]
    Auth[Auth/User]
    Thread[Thread/Reply/Mention]
    Task[Assign/Task]
    Msg[Conversation/Message]
    Audit[Audit/Knowledge]
    Noti[Notification]
  end

  subgraph Realtime[WebSocket Subsystem]
    WSGW[WS Gateway]
    Conn[Connection Store]
    Router[Event Dispatcher]
  end

  DB[(MySQL/PostgreSQL)]

  Client --> API
  AuthAPI --> Auth
  ThreadAPI --> Thread
  TaskAPI --> Task
  MsgAPI --> Msg
  AuditAPI --> Audit
  NotiAPI --> Noti

  Auth --> DB
  Thread --> DB
  Task --> DB
  Msg --> DB
  Audit --> DB
  Noti --> DB

  Thread -->|Domain Events| Router
  Task -->|Domain Events| Router
  Msg -->|Domain Events| Router
  Audit -->|Domain Events| Router
  Noti -->|Domain Events| Router

  Client -->|subscribe/unsubscribe/ping| WSGW
  WSGW --> Conn
  Router --> WSGW
```

说明：
- 所有业务写入与查询走 HTTP。
- WS 只负责推送，不承载业务写操作。
- 业务模块通过领域事件驱动 WS 推送。

---

## 5. 协作机制（必须遵守）

### 5.1 契约冻结规则
- `docs/design/api/interface-layer.md` 是接口契约单一事实源。
- 新增/修改接口前，先更新文档并在团队同步。
- 未更新契约文档的接口变更，视为无效变更。

### 5.2 事件协作规则
- 事件生产者负责定义事件 payload。
- 事件消费者（通知/WS）不得反向修改生产者语义。
- 事件字段变更必须走“先兼容、后清理”两阶段。

### 5.3 联调节奏
- 每日固定一次跨组同步（15 分钟）：
  1) 今日接口变更
  2) 今日事件变更
  3) 阻塞项
- 联调顺序建议：
  1) Auth/User
  2) Thread/Reply + Assign/Task
  3) Conversation/Message
  4) Notification/WS
  5) Audit/Knowledge

### 5.4 PR 范围控制
- 一个 PR 只做一个工作流的一个主题（例如“Task 状态流转”）。
- 禁止跨模块、跨工作流的大杂烩提交。
- PR 描述必须包含：影响接口、影响事件、影响表结构。

---

## 6. 数据库变更强制规则（重点）

**数据库结构定义文件：`app/resources/db.sql`**

强制要求：
1. 任何表结构变更（增删列、改类型、改约束）必须同步修改 `app/resources/db.sql`。
2. 任何 key/index 变更（主键、唯一键、普通索引、联合索引）必须同步修改 `app/resources/db.sql`。
3. 任何关联字段命名变更（如 `xxx_id`）必须同步更新：
   - `docs/requirements/analyze/er-diagram.md`
   - `docs/design/api/interface-layer.md`
   - `app/resources/db.sql`
4. 禁止只改代码不改 `db.sql`。

提交前自检清单（每个涉及数据层的 PR 必填）：
- [ ] `db.sql` 已同步
- [ ] ER 文档已同步
- [ ] 接口文档已同步
- [ ] 索引策略已说明（为何需要该索引）

---

## 7. 冲突处理优先级
当文档出现冲突时，按以下优先级决策：
1. `docs/requirements/analyze/user-case.md`
2. `docs/requirements/analyze/er-diagram.md`
3. `docs/design/api/interface-layer.md`
4. 各 workstream 文档

若仍无法判断，先发起文档修订再开发。

---

## 8. 后端实现规范（必须遵守）

### 8.1 后端系统与架构分层
- 后端目录：`app/services/backend`
- 技术栈：Node.js + TypeScript + Fastify（Yarn 管理）
- 推荐分层：
  1) Interface 层：HTTP/WS 路由、请求解析、响应封装
  2) Application 层：用例编排、事务边界、权限决策入口
  3) Domain 层：实体/值对象/领域规则/领域事件
  4) Infra 层：DB 仓储、消息/事件适配、外部依赖实现
- 原则：
  - HTTP 承担业务请求（GET 幂等读，POST 其他）
  - WS 仅用于推送，不承载业务写操作
  - 控制器不写业务规则，业务规则必须下沉到 Application/Domain

### 8.1.1 目录规范（DDD）
- 统一目录结构（示例）：

```text
app/services/backend/src/
  config/
  shared/
    errors/
    logging/
    interface/
  modules/
    <module-name>/
      interface/
        http/
      application/
      domain/
      infra/
  server.ts
  main.ts
```

- 约束：
  - `modules/<module>/interface/http` 只放路由与请求/响应映射。
  - `modules/<module>/application` 只做用例编排，不直接依赖 HTTP 细节。
  - `modules/<module>/domain` 只放领域对象/规则，不依赖 Fastify。
  - `modules/<module>/infra` 放仓储与外部依赖实现。
  - `shared/interface` 放接口层通用约定（如统一响应结构、RouteModule 类型）。

### 8.1.2 接口层写法规范（HTTP）
- 每个模块都应导出一个路由模块（如 `exampleRoutes`），由 `server.ts` 聚合注册。
- 接口层函数仅负责：参数读取、调用 Application、返回统一结构。
- 成功响应统一使用：`{ ok: true, data }`。
- 错误统一通过抛 `AppError` 进入全局处理器，不在路由里手写散乱 `reply.status(...).send(...)`。
- 路由命名保持业务语义清晰：GET 用于查询，POST 用于写操作/状态变更。

### 8.2 日志系统规范
- 统一使用 Fastify logger（Pino）输出结构化日志（JSON）。
- 日志字段至少包含：`timestamp`、`level`、`service`、`env`、`request_id`、`event`。
- 禁止输出敏感信息：密码、token、cookie、密钥、完整隐私 payload。
- 错误日志必须带：`error_code`（若有）、`status_code`（若有）、`stack`（服务端保留）。

### 8.3 日志覆盖要求
- 每个 HTTP 请求至少两条日志：
  1) `request.received`
  2) `request.completed`（含 status_code、response_time_ms）
- 每个业务异常至少一条 warn/error 日志，并包含可定位上下文（request_id、核心业务 ID）。
- 每个未捕获异常必须落 error 级别日志。
- 关键状态变更必须记录审计型日志（如 assign 审核、task 状态变更、reply 采纳）。

### 8.4 错误处理与 try-catch 规范
- 错误码必须使用 enum 统一管理（如 `ErrorCode`），禁止魔法字符串散落。
- 业务可预期错误：抛 `AppError`（携带 `code` + `statusCode` + message）。
- 全局错误处理器统一转为响应：
  - 成功：`{ ok: true, data }`
  - 失败：`{ ok: false, error: { code, message, field? } }`
- try-catch 使用规范：
  - Controller 层尽量不写大面积 try-catch，交由全局 error handler 收敛
  - 与外部系统交互（DB/第三方/IO）处必须捕获并转换为领域可理解错误
  - catch 中禁止吞错，必须 `log + rethrow` 或转换后抛出

### 8.5 单元测试写法与提交要求
- 每个业务模块至少覆盖以下测试类型：
  1) 正常路径（Happy Path）
  2) 参数校验失败路径
  3) 权限失败路径
  4) 关键状态流转与边界条件
- 单元测试命名采用“行为 + 预期”风格（例如：`should_reject_assign_when_status_not_pending`）。
- 测试必须可重复运行且相互隔离：禁止依赖执行顺序，禁止共享可变全局状态。
- 外部依赖（DB/消息/第三方）必须 mock 或使用测试替身，单测不得访问真实生产资源。
- 新增/修改业务规则时，必须同步新增/修改对应单元测试。
- 提交前必须通过**全部单元测试**；未通过测试的提交视为无效提交。

---

## 9. 完成定义（DoD）
一个功能算完成，必须同时满足：
- 接口实现完成 + 参数校验 + 权限校验
- 错误码符合统一规范
- 单测/接口测试通过（提交前必须通过全部单元测试）
- 事件已发出并完成通知/WS联调（若该功能涉及事件）
- 文档同步完成（至少接口文档 + `db.sql`）
