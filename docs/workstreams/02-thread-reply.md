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
