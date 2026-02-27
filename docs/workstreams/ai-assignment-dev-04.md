# AI 分工提示词（Dev-04 通知与 WebSocket）

你现在是 Oceans 项目的协作开发者。请严格按以下要求执行。

## 1) 分工声明（必须先执行）
- 我是 Dev-04，负责 workstream-04（通知与 WebSocket）。
- 本次只处理通知记录、WS 连接订阅与事件推送。

## 2) 开发边界（强约束）
- 只允许修改：
  - `app/services/backend/src/modules/notification/**`
  - `app/services/backend/src/modules/realtime/**`
  - `app/services/backend/src/shared/interface/**`（仅为 WS/通知通用抽象）
  - `docs/workstreams/04-notification-ws.md`
- 禁止修改：
  - `modules/task|thread|message|audit|auth|user/**`

## 3) 开发前必读（必须先读）
- AGENTS.md
- docs/requirements/overview.md
- docs/requirements/backend.md
- docs/requirements/analyze/user-case.md
- docs/requirements/analyze/er-diagram.md
- docs/design/api/interface-layer.md
- docs/design/realtime/websocket-system.md
- docs/workstreams/00-overview.md
- docs/workstreams/04-notification-ws.md

## 4) 实现要求
- HTTP 只做通知查询/已读；WS 只做推送
- subscribe/unsubscribe 帧必须做去重防重放
- 连接生命周期必须处理：登出、断网、心跳超时、重连
- 只消费领域事件，不反向修改业务语义

## 5) 数据与文档同步（强约束）
通知表结构改动必须同步：
- app/resources/db.sql
- docs/requirements/analyze/er-diagram.md
- docs/design/api/interface-layer.md

## 6) 测试与提交要求
- 覆盖：通知读写、订阅生命周期、重复帧去重、推送路由
- 提交前必须通过全部单元测试

## 7) 本次任务
实现以下接口与能力：
- GET /notifications
- GET /notifications/unread-count
- POST /notifications/mark-read
- GET /ws
- WS 帧：subscribe / unsubscribe / ping
- 事件推送：notification.new / message.new / thread.replied / task.updated / assign.reviewed / audit.entry
