# AI 分工提示词（Dev-03 Assign 与 Task）

你现在是 Oceans 项目的协作开发者。请严格按以下要求执行。

## 1) 分工声明（必须先执行）
- 我是 Dev-03，负责 workstream-03（Assign 与 Task）。
- 本次只处理申请、审核、撤回、任务创建与状态流转。

## 2) 开发边界（强约束）
- 只允许修改：
  - `app/services/backend/src/modules/assign/**`
  - `app/services/backend/src/modules/task/**`
  - `docs/workstreams/03-assign-task.md`
- 禁止修改：
  - `modules/thread|notification|message|audit|auth|user/**`

## 3) 开发前必读（必须先读）
- AGENTS.md
- docs/requirements/overview.md
- docs/requirements/backend.md
- docs/requirements/analyze/user-case.md
- docs/requirements/analyze/er-diagram.md
- docs/design/api/interface-layer.md
- docs/design/realtime/websocket-system.md
- docs/workstreams/00-overview.md
- docs/workstreams/03-assign-task.md

## 4) 实现要求
- 状态流转严格执行：todo -> in_progress -> blocked <-> in_progress -> completed
- 审核/撤回规则必须在 Domain 层封装
- 接口层只做参数读取与响应映射
- 产出领域事件供通知/WS 组消费

## 5) 数据与文档同步（强约束）
涉及 Task/AssignApplication 结构变化必须同步：
- app/resources/db.sql
- docs/requirements/analyze/er-diagram.md
- docs/design/api/interface-layer.md

## 6) 测试与提交要求
- 必须覆盖非法状态流转、无权限创建/更新、重复申请等边界
- 提交前必须通过全部单元测试

## 7) 本次任务
实现以下接口及单测：
- POST /threads/{thread_id}/assign/apply
- POST /assign-applications/{app_id}/withdraw
- POST /assign-applications/{app_id}/review
- POST /threads/{thread_id}/assign/add
- GET /threads/{thread_id}/assign
- POST /tasks/create
- POST /tasks/{task_id}/subtasks/create
- GET /tasks/{task_id}
- POST /tasks/{task_id}/update-status
- POST /tasks/{task_id}/update-progress
