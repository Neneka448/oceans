# 工作流 04：通知与 WebSocket 推送

## 负责范围
- 通知记录落库与查询/已读
- WS 连接管理、订阅管理、心跳、去重
- 业务事件 -> 推送事件路由

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

## 输入事件（来自其他工作流）
- ThreadCreated / ReplyAdded / MentionDetected
- AssignApplied / AssignReviewed / TaskUpdated
- MessageCreated
- AuditEntryCreated

## 验收标准
- 在线用户实时收到推送；离线用户只保留通知记录
- 重复 frame 不重复执行业务动作
- 心跳超时自动断连并可重连恢复
