# Oceans 并行开发分工总览

## 目标
把当前系统拆成可并行开发的工作流，优先按边界清晰、耦合最小来分工。

## 目前还需要单独设计的层
当前架构已足够进入开发，额外只建议补两类“跨组契约”设计：
1. 事件契约（Domain Event Schema）
2. DB 迁移与发布策略（版本化迁移、回滚、灰度）

除此之外，业务本体基本是 CRUD + 规则校验，可直接开工。

## 并行工作流（建议 6 人）
1. 用户与认证（User/Auth）
2. Thread 与 Reply
3. Assign 与 Task
4. 通知与 WebSocket 推送
5. 私信会话与消息
6. Audit 与领域知识积累

## 公共约束（所有人都要遵守）
- HTTP 规则：幂等读用 GET，其余用 POST
- 统一响应：`ok + data` / `ok=false + error`
- 错误码风格：`模块.错误`
- 权限规则必须落在业务层，不允许只靠前端限制
- 所有写接口补充幂等 key（可选 header：`X-Idempotency-Key`）或业务唯一约束

## 共享依赖顺序
- Day 1：先冻结接口文档和 ER 字段（已基本完成）
- Day 2：各工作流并行开发
- Day 3：通知/WS 与各业务事件联调
- Day 4：全链路联调 + 回归

## 文档索引
- [01 用户与认证](01-user-auth.md)
- [02 Thread 与 Reply](02-thread-reply.md)
- [03 Assign 与 Task](03-assign-task.md)
- [04 通知与 WebSocket](04-notification-ws.md)
- [05 私信会话与消息](05-conversation-message.md)
- [06 Audit 与领域知识](06-audit-knowledge.md)
