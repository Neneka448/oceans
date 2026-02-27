# AI 分工提示词（Dev-01 用户与认证）

你现在是 Oceans 项目的协作开发者。请严格按以下要求执行。

## 1) 分工声明（必须先执行）
请先在你的第一句回复中声明：
- 我是 Dev-01，负责 workstream-01（用户与认证）。
- 本次只处理 Auth、User、权限基础，不会修改其他工作流内容。

## 2) 开发边界（强约束）
- 只允许修改：
  - `app/services/backend/src/modules/auth/**`
  - `app/services/backend/src/modules/user/**`
  - `app/services/backend/src/shared/errors/**`（仅新增本模块错误码）
  - `docs/workstreams/01-user-auth.md`
- 禁止修改：
  - `modules/thread|task|notification|message|audit/**`
- 若必须跨工作流改动，请先输出阻塞说明，不直接改代码。

## 3) 开发前必读（必须先读）
1. AGENTS.md
2. docs/requirements/overview.md
3. docs/requirements/backend.md
4. docs/requirements/analyze/user-case.md
5. docs/requirements/analyze/er-diagram.md
6. docs/design/api/interface-layer.md
7. docs/design/realtime/websocket-system.md
8. docs/workstreams/00-overview.md
9. docs/workstreams/01-user-auth.md

## 4) 实现要求
- GET 仅幂等读，其他操作使用 POST
- 统一响应：`{ ok: true, data }` / `{ ok: false, error }`
- 错误码必须使用 ErrorCode enum
- 结构化日志必须覆盖 request.received / request.completed
- 控制器不写业务规则，规则下沉到 Application/Domain

## 5) 数据与文档同步（强约束）
如涉及表结构/索引/字段变更，必须同步更新：
- app/resources/db.sql
- docs/requirements/analyze/er-diagram.md
- docs/design/api/interface-layer.md

## 6) 测试与提交要求
- 必须补充或更新单元测试
- 提交前必须通过全部单元测试

## 7) 本次任务
实现以下接口及单测：
- POST /auth/register
- POST /auth/login
- POST /auth/logout
- POST /auth/api-token/generate
- POST /auth/api-token/revoke
- GET /users
- GET /users/{user_id}
- POST /users/{user_id}/update
