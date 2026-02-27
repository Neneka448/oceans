# WebSocket 实时推送子系统设计

---

## 1. 职责边界

### 1.1 HTTP vs WebSocket 的全局划分

系统同时提供 HTTP REST API 和 WebSocket，两者职责严格分离：

| 协议 | 适用场景 | 示例 |
|------|---------|------|
| **HTTP REST** | 所有有请求-响应语义的操作，无状态，可重试 | 登录、注册、发帖、回复、任务操作、查询列表、上传、Audit 提交等一切业务操作 |
| **WebSocket** | 纯粹的服务端主动推送通道 | 新通知、新私信、Thread 新回复、Task 状态变更、Audit 条目实时推送 |

**WebSocket 上只允许三种客户端帧**：`subscribe` / `unsubscribe` / `ping`，即"订阅管理"和"心跳"。业务操作**不走** WebSocket，原因：

- WS 没有标准 status code 和错误格式，错误处理需自行约定
- HTTP 中间件（鉴权、限流、日志链路追踪、幂等）开箱即用，WS 需全部单独实现
- HTTP 天然无状态、可独立重试；WS 帧依赖连接状态，重试语义复杂

**典型交互模式**：

```
前端发起操作（如发回复）
    │
    │ POST /threads/{id}/replies   ← HTTP
    ▼
  后端执行业务逻辑
    │
    │ 发布领域事件 ReplyAdded
    ▼
  WS 子系统监听事件
    │
    │ 推送 thread.replied 到订阅了 thread:{id} 的客户端  ← WebSocket
    ▼
  其他在线用户实时收到新回复
```

### 1.2 WS 子系统职责

本子系统只负责**连接持有与事件分发**，不产生任何业务数据：

- 维护已认证用户的 WebSocket 长连接
- 管理客户端的订阅意图（订阅哪些频道）
- 监听其他领域抛出的领域事件，路由并推送到对应连接
- 心跳检测与连接清理

不负责的事：通知的持久化、消息的存储、事件的生产（由各业务领域负责）

---

## 2. 分层结构

```
┌─────────────────────────────────────────────────────────┐
│                    Interface Layer                       │
│   WsHandshakeController  │  WsMessageHandler            │
│   （HTTP Upgrade 端点）   │  （收客户端帧的路由）         │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                  Application Layer                       │
│   ConnectionAppService   │  EventDispatchAppService      │
│   （连接生命周期编排）    │  （事件→连接路由编排）        │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                   Domain Layer                           │
│   Connection（聚合根）    │  Subscription（值对象）       │
│   ConnectionRepository    │  RealtimeEvent（领域事件）   │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                Infrastructure Layer                      │
│   ConnectionStore（WsSession 持有）                      │
│   IdempotencyStore（帧去重，TTL Map）                    │
│   DomainEventListener（监听其他领域事件）                 │
│   WsFrameAdapter（框架适配，收发原始帧）                  │
└─────────────────────────────────────────────────────────┘
```

---

## 3. 协议设计

### 3.1 握手

```
GET /ws
Upgrade: websocket
Authorization: Bearer <token>          # 或 ?token=<token> query param
```

握手阶段完成认证，失败直接返回 `401`，不建立连接。

### 3.2 帧格式（JSON）

**客户端 → 服务端（Client Frame）**

```ts
{
  type: "subscribe" | "unsubscribe" | "ping",
  channel?: string,    // subscribe/unsubscribe 时必填
  entityId?: string,   // 频道需要关联实体时填写
  id?: string          // subscribe/unsubscribe 时必填，用于幂等去重；ping 可省略
}
```

**服务端 → 客户端（Server Frame）**

```ts
{
  type: "event" | "ack" | "pong" | "error",
  id?: string,          // 对应客户端请求 ID
  duplicated?: boolean, // true 表示该帧已被处理过，本次为去重响应
  event?: {
    name: string,       // 事件名，见 §3.4
    payload: object
  },
  error?: string
}
```

### 3.3 频道（Channel）定义

| channel | entityId | 说明 | 自动订阅 |
|---------|----------|------|---------|
| `user_feed` | — | 接收发给自己的所有通知、私信新消息 | 连接建立后自动 |
| `thread:{id}` | thread_id | 订阅某帖子的新回复 | 进入帖子详情页时 |
| `task:{id}` | task_id | 订阅某 Task 的状态变更 | 进入 Task 详情页时 |
| `user_audit:{id}` | user_id | 订阅某用户的最新 Audit 条目 | 进入用户详情页时 |

### 3.4 推送事件名（event.name）

| 事件名 | 触发场景 | 推送到频道 |
|--------|---------|------------|
| `notification.new` | 任意通知产生 | `user_feed` |
| `message.new` | 私信新消息 | `user_feed` |
| `thread.replied` | Thread 有新 Reply | `thread:{id}` |
| `task.updated` | Task 状态/进展变更 | `task:{id}` |
| `assign.reviewed` | Assign 申请审核完成 | `user_feed` |
| `audit.entry` | 用户新产生 Audit 条目 | `user_audit:{id}` |

### 3.5 帧幂等性（去重防重放）

**适用范围**：`subscribe` 和 `unsubscribe` 帧。`ping` 天然幂等，不需要去重。

**机制**：

客户端对每个 `subscribe` / `unsubscribe` 帧分配唯一 `id`（建议使用 UUID 或自增序号）。服务端在处理前先查 IdempotencyStore：

```
去重 key = connectionId + ":" + frameId
```

```
if IdempotencyStore.exists(key):
    → 直接返回缓存的 ack（带 duplicated: true），不执行业务逻辑
else:
    → 执行业务逻辑
    → 将 key 写入 IdempotencyStore，TTL = 60s
    → 返回正常 ack
```

**TTL 选择**：60s 足够覆盖前端因网络抖动导致的重试窗口，同时避免 key 无限堆积。

**缺失 id 的处理**：`subscribe` / `unsubscribe` 帧如未携带 `id`，直接返回 error frame，不执行操作。前端必须保证携带 id。

**幂等语义说明**：`subscribe` 本身在领域层已做幂等（重复订阅同一频道无副作用），去重的价值在于避免日志噪声、避免不必要的存储写入，以及在 `unsubscribe` 场景下防止误取消已重新订阅的频道。

---

## 4. 领域模型层

### 4.1 Connection（聚合根）

```
Connection
  connectionId: string          # 全局唯一，由 infra 生成
  userId: string                # 认证后绑定
  subscriptions: Set<Subscription>
  connectedAt: Instant
  lastHeartbeatAt: Instant

  + subscribe(channel: Channel): void
  + unsubscribe(channel: Channel): void
  + isSubscribed(channel: Channel): boolean
  + touch(): void               # 更新 lastHeartbeatAt
```

### 4.2 Subscription（值对象）

```
Subscription
  channel: string     # e.g. "thread:abc123"

  # 工厂方法
  + userFeed(): Subscription
  + thread(threadId): Subscription
  + task(taskId): Subscription
  + userAudit(userId): Subscription
```

### 4.3 ConnectionRepository（接口）

```
interface ConnectionRepository {
  save(connection: Connection): void
  findById(connectionId: string): Connection?
  findByUserId(userId: string): List<Connection>
  findBySubscription(channel: string): List<Connection>
  remove(connectionId: string): void
}
```

> Domain 层只知道接口，不感知存储实现是内存 Map 还是 Redis。

### 4.4 领域事件

```
UserConnected    { connectionId, userId, connectedAt }
UserDisconnected { connectionId, userId, reason }
```

---

## 5. 业务编排层（Application Layer）

### 5.1 ConnectionAppService

```
# 握手完成后调用
onConnect(connectionId, userId):
  conn = new Connection(connectionId, userId)
  conn.subscribe(Subscription.userFeed())   # 自动订阅 user_feed
  repository.save(conn)
  publish(UserConnected)

# 连接断开时调用
onDisconnect(connectionId, reason):
  conn = repository.findById(connectionId)
  repository.remove(connectionId)
  publish(UserDisconnected)

# 处理客户端 subscribe 帧
subscribe(connectionId, channel):
  conn = repository.findById(connectionId)
  conn.subscribe(Subscription(channel))
  repository.save(conn)
  return ack

# 处理客户端 unsubscribe 帧
unsubscribe(connectionId, channel):
  conn = repository.findById(connectionId)
  conn.unsubscribe(Subscription(channel))
  repository.save(conn)
  return ack

# 处理 ping
ping(connectionId):
  conn = repository.findById(connectionId)
  conn.touch()
  repository.save(conn)
  return pong
```

### 5.2 EventDispatchAppService

```
# 被 DomainEventListener 调用
dispatch(eventName, channel, payload):
  connections = repository.findBySubscription(channel)
  for conn in connections:
    wsFrameAdapter.send(conn.connectionId, {
      type: "event",
      event: { name: eventName, payload }
    })
```

对于 `user_feed` 类事件（只发给特定用户）：

```
dispatchToUser(eventName, userId, payload):
  channel = "user_feed"
  connections = repository.findByUserId(userId)
    .filter(c => c.isSubscribed(channel))
  for conn in connections:
    wsFrameAdapter.send(conn.connectionId, ...)
```

---

## 6. 接口层（Interface Layer）

### 6.1 WsHandshakeController

```
POST /ws  (HTTP Upgrade)
  → 读取 Authorization header / token query param
  → 调用 AuthService.verify(token) → userId
  → 失败：返回 401，终止
  → 成功：分配 connectionId，回调 ConnectionAppService.onConnect()
  → 升级协议
```

### 6.2 WsMessageHandler

接收客户端帧，解析 `type` 字段路由，**在路由前先执行去重检查**：

```
onFrame(connectionId, frame):
  # 1. subscribe / unsubscribe 必须携带 id
  if frame.type in ["subscribe", "unsubscribe"] and not frame.id:
    send error("missing id")
    return

  # 2. 幂等检查
  if frame.type in ["subscribe", "unsubscribe"]:
    key = connectionId + ":" + frame.id
    if idempotencyStore.exists(key):
      send ack(frame.id, duplicated=true)
      return

  # 3. 路由执行
  switch frame.type:
    "subscribe"   → ConnectionAppService.subscribe(connectionId, frame.channel)
                    idempotencyStore.set(key, ttl=60s)
    "unsubscribe" → ConnectionAppService.unsubscribe(connectionId, frame.channel)
                    idempotencyStore.set(key, ttl=60s)
    "ping"        → ConnectionAppService.ping(connectionId)
    default       → send error frame
```

---

## 7. 基础设施层（Infrastructure Layer）

### 7.1 ConnectionStore（ConnectionRepository 实现）

**单节点（MVP）**：内存 `ConcurrentHashMap`

```
connectionMap:  Map<connectionId, Connection>
userIndex:      Map<userId, Set<connectionId>>        # 加速按用户查
channelIndex:   Map<channel, Set<connectionId>>       # 加速按频道查
```

三个 Map 需要在 save/remove 时同步维护。

**多节点（后续扩展）**：ConnectionStore 改为 Redis 实现
- Connection 序列化存入 Redis Hash
- channel 订阅关系存入 Redis Set (`channel:{name}` → Set of connectionId)
- WsSession 仍在各节点本地持有，推送时先从 Redis 查到 connectionId，再查本地 Session；若不在本节点则通过 Redis Pub/Sub 路由到目标节点

### 7.2 IdempotencyStore

**接口**：

```
interface IdempotencyStore {
  exists(key: string): boolean
  set(key: string, ttl: Duration): void
  deleteByPrefix(prefix: string): void   # 连接断开时清理该连接所有 key
}
```

**MVP 实现**：内存 `ConcurrentHashMap<String, Instant>`，后台每 30s 扫描清除过期 key。

**连接断开时**：调用 `deleteByPrefix(connectionId + ":")`，避免 key 残留到 TTL 自然过期。

**多节点扩展**：改为 Redis 实现，`SET key 1 EX 60 NX` 天然原子幂等，无需额外锁。

### 7.3 DomainEventListener

监听其他领域（Notification、Message、Thread、Task、Audit）抛出的领域事件，调用 `EventDispatchAppService`：

| 监听事件 | 转换为推送 |
|---------|-----------|
| `NotificationCreated` | `dispatchToUser("notification.new", recipientId, payload)` |
| `MessageCreated` | `dispatchToUser("message.new", recipientId, payload)` |
| `ReplyAdded` | `dispatch("thread.replied", "thread:{threadId}", payload)` |
| `TaskUpdated` | `dispatch("task.updated", "task:{taskId}", payload)` |
| `AssignReviewed` | `dispatchToUser("assign.reviewed", applicantId, payload)` |
| `AuditEntryCreated` | `dispatch("audit.entry", "user_audit:{userId}", payload)` |

### 7.4 WsFrameAdapter

封装具体 WebSocket 框架（如 Netty/Spring WebSocket/ws 库）的收发操作，Domain/Application 层不感知框架细节：

```
interface WsFrameAdapter {
  send(connectionId: string, frame: ServerFrame): void
  close(connectionId: string, reason: string): void
}
```

---

## 8. 心跳与连接清理

- 客户端每 **30s** 发一次 `ping`，服务端回 `pong` 并 `touch()` 连接
- 后台定时任务每 **60s** 扫描一次，对 `lastHeartbeatAt` 超过 **90s** 的连接执行强制断开 + `onDisconnect()`
- 客户端检测到 90s 内未收到 `pong` 则主动重连

---

## 9. 订阅生命周期

### 9.1 完整生命周期状态图

```
                    握手认证
                       │
                       ▼
              ┌─────────────────┐
              │   CONNECTED     │  自动订阅 user_feed
              └────────┬────────┘
                       │ 进入页面
                       ▼
              ┌─────────────────┐
              │  SUBSCRIBED     │  +订阅 thread/task/user_audit 频道
              └────────┬────────┘
                       │
          ┌────────────┼────────────────────┐
     离开页面      心跳超时/网络断开        主动退出/Token过期
          │              │                       │
          ▼              ▼                       ▼
   退订实体频道    DISCONNECTED            强制断开连接
   保留user_feed    （可重连）             清理全部订阅
```

### 9.2 各场景的行为定义

#### 场景 A：主动退出登录

1. 客户端调用登出 API，服务端将 Token 加入黑名单
2. 服务端向该用户的**所有连接**发送 `close` 帧（带 reason: `logout`）
3. `onDisconnect()` 清理连接、订阅、幂等 key
4. 客户端收到 `logout` reason 后**不发起重连**

```
# AuthService 登出时联动 WS 子系统
onLogout(userId):
  conns = repository.findByUserId(userId)
  for conn in conns:
    wsFrameAdapter.close(conn.connectionId, reason="logout")
    # onDisconnect 在 close 回调中自动触发
```

#### 场景 B：Token 过期（连接期间）

- 服务端**不主动检测** Token 过期（握手时已验证，连接存续期间不重复校验）
- 若需要强制踢人（如管理员封禁账号），走场景 A 的 `onLogout` 逻辑
- 扩展点：后续可在 `ping/pong` 时顺带校验 Token 有效期

#### 场景 C：页面跳转（离开实体页面）

客户端负责在页面卸载时退订对应实体频道，`user_feed` **不退订**：

```
# 前端约定（规范，非服务端强制）
离开 Thread 详情页 → unsubscribe("thread:{id}")
离开 Task 详情页   → unsubscribe("task:{id}")
离开 用户详情页    → unsubscribe("user_audit:{id}")
```

服务端对未退订的实体频道不作超时清理——频道只是一个订阅标记，事件发不到实际关闭的页面也无副作用；下次重连后订阅状态会被重建（见场景 E）。

#### 场景 D：心跳超时 / 网络中断（非主动断开）

1. 服务端检测到 90s 无心跳，调用 `wsFrameAdapter.close(connectionId, "heartbeat_timeout")`
2. `onDisconnect()` 清理该连接所有状态
3. 客户端感知到断开后，进入**指数退避重连**（1s → 2s → 4s → … 最大 30s）

#### 场景 E：客户端重连后的订阅恢复

服务端**不保存**断开前的订阅快照，重连等同于全新连接：

1. 新连接建立 → 自动订阅 `user_feed`
2. 客户端重连成功后，由**前端自行重新订阅**当前页面所需的实体频道
3. 前端在重连 handler 中读取当前路由，重发 `subscribe` 帧

> 这样避免了服务端维护复杂的"断线前订阅快照"，复杂度完全在前端，且前端最清楚当前在哪个页面。

#### 场景 F：同一用户多标签 / 多设备并发连接

- 每个标签/设备是**独立的 Connection**，`connectionId` 不同
- `user_feed` 类事件（通知、私信）会推送到该用户的**所有活跃连接**（`findByUserId` 返回多个）
- 实体频道（`thread:xx` 等）只推送到**订阅了该频道的连接**，未打开该页面的标签不受影响
- 退出登录时清理该用户所有连接（见场景 A）

### 9.3 生命周期事件汇总

| 触发原因 | 服务端行为 | 客户端行为 |
|---------|-----------|-----------|
| 握手成功 | 创建 Connection，自动订阅 `user_feed` | 重新订阅当前页面实体频道 |
| 主动 subscribe | 追加 Subscription，写幂等 key | 等待 ack |
| 主动 unsubscribe | 移除 Subscription，写幂等 key | 等待 ack |
| 页面跳转离开 | 无（等客户端发 unsubscribe） | 发 unsubscribe 帧 |
| 主动退出登录 | close 所有连接（reason: logout），清理全部状态 | 不重连 |
| 心跳超时 | close 连接（reason: heartbeat_timeout），清理状态 | 指数退避重连，重连后重订阅 |
| 网络中断 | 同心跳超时 | 同心跳超时 |
| 标签关闭 | 收到 TCP FIN，触发 onDisconnect，清理状态 | — |

---

## 10. 扩展点备忘

| 问题 | MVP 方案 | 后续方案 |
|------|---------|---------|
| 去重防重放 | 内存 TTL Map，60s 窗口 | Redis SET NX EX，天然原子 |
| 多节点推送 | 单节点内存 Map | Redis Pub/Sub + 节点路由 |
| 消息可靠性 | 推即失（fire and forget） | 客户端 ack + 服务端重试队列 |
| 连接鉴权刷新 | Token 过期则断连，客户端重连 | Token 刷新帧 |
| 背压控制 | 无 | 单连接发送队列 + 溢出丢弃策略 |
