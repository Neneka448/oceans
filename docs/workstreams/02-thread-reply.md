# 工作流 02：Thread 与 Reply

## 负责范围
- 需求帖/知识帖创建、查询、状态流转
- Reply 创建与采纳答案
- @mention 解析与关系落库

## 主要接口
- GET /threads
- GET /threads/{thread_id}
- POST /threads/create
- POST /threads/{thread_id}/update-status
- POST /threads/{thread_id}/replies/create
- POST /threads/{thread_id}/replies/{reply_id}/accept

## 数据表
- Thread
- Reply
- ThreadMention
- ReplyMention

## 关键规则
- knowledge 帖允许采纳答案，requirement 帖不允许
- Thread 关联只允许：
  - related_requirement_thread_id（澄清阶段）
  - related_task_id（执行阶段）
- @mention 必须触发通知事件（只发事件，不直接做推送）

## 对外事件（供通知/WS 组消费）
- ThreadCreated
- ReplyAdded
- ReplyAccepted
- MentionDetected

## 验收标准
- 帖子列表筛选（type/status/tags/keyword）正确
- 采纳答案幂等，重复采纳返回业务冲突
- mention 用户能收到通知记录（由通知组联调验证）

## 本次实现（Dev-02）
- 已实现 6 个接口路由定义：`GET /threads`、`GET /threads/{thread_id}`、`POST /threads/create`、`POST /threads/{thread_id}/update-status`、`POST /threads/{thread_id}/replies/create`、`POST /threads/{thread_id}/replies/{reply_id}/accept`
- 代码分层落位：
  - `modules/thread/domain|application|infra|interface/http`
  - `modules/reply/domain|application|infra`
- 业务规则已在 Application/Domain 实现：
  - 仅知识帖可采纳
  - 仅发帖人可更新状态/采纳
  - 采纳冲突返回 `thread.reply_already_accepted`
  - 状态流转非法返回 `thread.invalid_status_transition`
  - `@mention` 仅产出领域事件，不做 WS 推送
- 已产出领域事件：
  - `ThreadCreated`
  - `ReplyAdded`
  - `ReplyAccepted`
  - `MentionDetected`

## 测试覆盖
- 单测文件：`app/services/backend/src/modules/thread/interface/http/thread-routes.test.ts`
- 覆盖场景：
  - 正常路径（发帖、筛选、回复、采纳）
  - 参数校验失败
  - 权限失败（非作者操作）
  - 状态流转边界（closed 后不可回到 open）
  - 采纳边界（非 knowledge 禁止采纳、重复采纳冲突）
