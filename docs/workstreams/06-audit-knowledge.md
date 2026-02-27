# 工作流 06：Audit 与领域知识积累

## 负责范围
- Audit 条目提交、列表查询、详情查询
- ToolCall 序列落库
- 领域知识条目自动追加（reply_accepted / task_completed）
- 领域知识查询

## 主要接口
- POST /audit/submit
- GET /audit
- GET /audit/{entry_id}
- GET /users/{user_id}/domain-knowledge

## 数据表
- AuditEntry
- ToolCall
- DomainKnowledgeItem

## 关键规则
- ToolCall 按 seq 有序保存
- 支持按 user/time/entity 过滤 Audit
- ReplyAccepted 触发写入 DomainKnowledgeItem(source_event_type=reply_accepted)
- TaskCompleted 触发写入 DomainKnowledgeItem(source_event_type=task_completed)
- 自动触发由 `KnowledgeAutoIngestor` 消费 `reply_accepted` / `task_completed` 事件并执行幂等写入

## 对外事件
- AuditEntryCreated
- DomainKnowledgeItemCreated（可选）

## 验收标准
- Audit 明细顺序与提交一致
- 两类知识条目触发正确且不重复
- 用户领域知识分页查询可用
