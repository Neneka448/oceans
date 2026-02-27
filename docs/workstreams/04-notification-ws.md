# 工作流 04：通知与 WebSocket 推送

## 负责范围
- 通知记录落库与查询/已读
- WS 连接管理、订阅管理、心跳、去重
- 业务事件 -> 推送事件路由

## 本次实现（Dev-04）

代码目录：
- `app/services/backend/src/modules/notification/**`
- `app/services/backend/src/modules/realtime/**`
- `app/services/backend/src/shared/interface/current-user.ts`
- `app/services/backend/src/shared/interface/domain-event-bus.ts`

已落地能力：
- 通知 HTTP 能力（应用层 + 内存仓储 + 路由）
- WS 连接与订阅模型（`Connection` + `ConnectionRepository`）
- subscribe/unsubscribe 帧去重（`connectionId:frameId` + TTL）
- ping/pong 心跳触达（`touch lastHeartbeatAt`）
- 连接生命周期清理（断连、登出、超时）
- 领域事件 -> 推送事件路由监听（不反向修改业务语义）

## 主要接口
HTTP:
- GET /notifications
- GET /notifications/unread-count
- POST /notifications/mark-read

WS:
- GET /ws
- client frame: subscribe / unsubscribe / ping
- server events: notification.new, message.new, thread.replied, task.updated, assign.reviewed, audit.entry

## 数据表/组件
- Notification
- ConnectionStore（内存/可扩展 Redis）
- IdempotencyStore

## 关键规则
- HTTP 做业务；WS 只做推送
- subscribe/unsubscribe 必须带 frame id，做去重防重放
- 生命周期清理：断线、登出、超时都要移除订阅和幂等 key

## 事件映射（已实现）
- `NotificationCreated` -> `notification.new` -> `user_feed`
- `MessageCreated` -> `message.new` -> `user_feed`
- `ReplyAdded` -> `thread.replied` -> `thread:{thread_id}`
- `TaskUpdated` -> `task.updated` -> `task:{task_id}`
- `AssignReviewed` -> `assign.reviewed` -> `user_feed(申请人)`
- `AuditEntryCreated` -> `audit.entry` -> `user_audit:{user_id}`

## 输入事件（来自其他工作流）
- ThreadCreated / ReplyAdded / MentionDetected
- AssignApplied / AssignReviewed / TaskUpdated
- MessageCreated
- AuditEntryCreated

## 测试覆盖（本次新增）
- `notification-service.test.ts`
  - 通知分页查询与 `is_read` 过滤
  - 指定通知标记已读与未读数变化
- `connection-app-service.test.ts`
  - 订阅生命周期与超时清理
  - 用户登出清理全部连接
- `ws-message-handler.test.ts`
  - 重复 frame 去重（ack duplicated）
  - `ping` -> `pong`
- `domain-event-listener.test.ts`
  - 通知事件路由到 `user_feed`
  - 帖子回复路由到 `thread:{id}`

## 验收标准
- 在线用户实时收到推送；离线用户只保留通知记录
- 重复 frame 不重复执行业务动作
- 心跳超时自动断连并可重连恢复
