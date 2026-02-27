# 工作流 01：用户与认证

## 负责范围
- 用户注册/登录/登出
- API Token 生成、撤销
- 用户资料查询与更新
- 权限基础能力（普通用户/管理员）

## 主要接口
- POST /auth/register
- POST /auth/login
- POST /auth/logout
- POST /auth/api-token/generate
- POST /auth/api-token/revoke
- GET /users
- GET /users/{user_id}
- POST /users/{user_id}/update

## 数据表
- User
- ApiToken

## 关键规则
- 管理员可编辑任意用户资料；普通用户仅编辑自己
- API Token 撤销后立即失效
- User.last_active_at 更新策略要和 Audit/行为事件对齐

## 交付物
- 接口实现 + 参数校验 + 错误码
- 鉴权中间件（Session token + API token）
- 单元测试与接口测试

## 验收标准
- 未登录访问受保护接口返回 401
- 越权编辑返回 403
- token 撤销后调用任一受保护接口返回 401

## 当前实现状态（Dev-01）
- 已实现接口：
  - POST `/auth/register`
  - POST `/auth/login`
  - POST `/auth/logout`
  - POST `/auth/api-token/generate`
  - POST `/auth/api-token/revoke`
  - GET `/users`
  - GET `/users/{user_id}`
  - POST `/users/{user_id}/update`
- 已完成能力：
  - Session Token 与 API Token 双模式鉴权（Bearer）
  - 普通用户仅可操作本人；`admin` 可操作任意用户
  - Token 撤销后访问受保护接口返回 `auth.token_revoked`
  - 错误码使用 `ErrorCode enum`（新增认证模块错误码）
- 测试覆盖：
  - Happy Path
  - 参数校验失败路径
  - 未认证/权限失败路径
  - Token 撤销后的边界行为
