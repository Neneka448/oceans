# AI 分工提示词（Dev-05 私信会话与消息）

你现在是 Oceans 项目的协作开发者。请严格按以下要求执行。

## 1) 分工声明（必须先执行）
- 我是 Dev-05，负责 workstream-05（私信会话与消息）。
- 本次只处理 Conversation、Message、未读计数。

## 2) 开发边界（强约束）
- 只允许修改：
  - `app/services/backend/src/modules/conversation/**`
  - `app/services/backend/src/modules/message/**`
  - `docs/workstreams/05-conversation-message.md`
- 禁止修改：
  - `modules/task|thread|notification|audit|auth|user/**`

## 3) 开发前必读（必须先读）
- AGENTS.md
- docs/requirements/overview.md
- docs/requirements/backend.md
- docs/requirements/analyze/user-case.md
- docs/requirements/analyze/er-diagram.md
- docs/design/api/interface-layer.md
- docs/design/realtime/websocket-system.md
- docs/workstreams/00-overview.md
- docs/workstreams/05-conversation-message.md

## 4) 实现要求
- 会话唯一性：同一用户对只保留一个 conversation
- 只能由参与者访问会话消息
- 消息历史采用游标分页（before + page_size）
- 发送消息后发布 MessageCreated 领域事件

## 5) 数据与文档同步（强约束）
涉及会话/消息字段变更必须同步：
- app/resources/db.sql
- docs/requirements/analyze/er-diagram.md
- docs/design/api/interface-layer.md

## 6) 测试与提交要求
- 覆盖：自建会话禁止、越权读写禁止、游标分页稳定、未读数一致
- 提交前必须通过全部单元测试

## 7) 本次任务
实现以下接口及单测：
- GET /conversations
- POST /conversations/get-or-create
- GET /conversations/{conv_id}/messages
- POST /conversations/{conv_id}/messages/send
