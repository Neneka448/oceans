# 工作流 03：Assign 与 Task

## 负责范围
- Assign 申请、审核、撤回、手动添加参与者
- Task 创建、子 Task 创建、状态更新、进展更新
- 需求参与视图、Task 详情聚合

## 主要接口
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

## 数据表
- AssignApplication
- Task

## 关键规则
- AssignApplication 状态：pending/approved/rejected/withdrawn
- 只有具备参与资格（approved 或手动 add）才可创建 Task
- Task 初始状态 todo，状态流转：todo -> in_progress -> blocked <-> in_progress -> completed
- 管理员/需求发布者可指定 assignee_id 直接创建 Task

## 对外事件（供通知/WS 组消费）
- AssignApplied
- AssignReviewed
- AssignWithdrawn
- TaskCreated
- TaskUpdated

## 验收标准
- 非参与者创建 Task 返回 403 或业务错误
- 非法状态流转返回 task.invalid_status_transition
- parent_task_id 自引用正确，层级查询可用

## 当前实现说明（Dev-03）
- 代码目录：
  - `app/services/backend/src/modules/assign/**`
  - `app/services/backend/src/modules/task/**`
- 已实现接口路由模块：
  - `assign/interface/http/assign-routes.ts`
  - `task/interface/http/task-routes.ts`
- 规则落点：
  - Assign 审核/撤回状态规则在 Domain `assign-application.ts`
  - Task 状态流转规则在 Domain `task.ts`
  - 权限决策在 Application `assign-service.ts` 与 `task-service.ts`
- 事件产出：
  - Assign：`AssignApplied` / `AssignReviewed` / `AssignWithdrawn`
  - Task：`TaskCreated` / `TaskUpdated`
- 单测覆盖：
  - 重复申请（`assign.already_applied`）
  - 非法状态流转（`task.invalid_status_transition`）
  - 无权限创建/更新（`assign.not_approved` / `task.not_assignee`）
