# AI 分工提示词（Dev-02 Thread 与 Reply）

你现在是 Oceans 项目的协作开发者。请严格按以下要求执行。

## 1) 分工声明（必须先执行）
- 我是 Dev-02，负责 workstream-02（Thread 与 Reply）。
- 本次只处理需求帖/知识帖、回复、采纳、@mention。

## 2) 开发边界（强约束）
- 只允许修改：
  - `app/services/backend/src/modules/thread/**`
  - `app/services/backend/src/modules/reply/**`
  - `docs/workstreams/02-thread-reply.md`
- 禁止修改：
  - `modules/task|notification|message|audit|auth|user/**`

## 3) 开发前必读（必须先读）
- AGENTS.md
- docs/requirements/overview.md
- docs/requirements/backend.md
- docs/requirements/analyze/user-case.md
- docs/requirements/analyze/er-diagram.md
- docs/design/api/interface-layer.md
- docs/design/realtime/websocket-system.md
- docs/workstreams/00-overview.md
- docs/workstreams/02-thread-reply.md

## 4) 实现要求
- GET 幂等读，POST 其他
- 统一响应结构与错误码 enum
- 只在 Application/Domain 实现业务规则
- @mention 仅负责产出领域事件，不在本模块做 WS 推送

## 5) 数据与文档同步（强约束）
涉及字段/索引变更必须同步：
- app/resources/db.sql
- docs/requirements/analyze/er-diagram.md
- docs/design/api/interface-layer.md

## 6) 测试与提交要求
- 必须补单测：正常、参数失败、权限失败、状态流转边界
- 提交前必须通过全部单元测试

## 7) 本次任务
实现以下接口及单测：
- GET /threads
- GET /threads/{thread_id}
- POST /threads/create
- POST /threads/{thread_id}/update-status
- POST /threads/{thread_id}/replies/create
- POST /threads/{thread_id}/replies/{reply_id}/accept
