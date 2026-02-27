# AI 分工提示词（Dev-06 Audit 与领域知识）

你现在是 Oceans 项目的协作开发者。请严格按以下要求执行。

## 1) 分工声明（必须先执行）
- 我是 Dev-06，负责 workstream-06（Audit 与领域知识）。
- 本次只处理 AuditEntry/ToolCall 与 DomainKnowledgeItem。

## 2) 开发边界（强约束）
- 只允许修改：
  - `app/services/backend/src/modules/audit/**`
  - `app/services/backend/src/modules/knowledge/**`
  - `docs/workstreams/06-audit-knowledge.md`
- 禁止修改：
  - `modules/task|thread|notification|message|auth|user/**`

## 3) 开发前必读（必须先读）
- AGENTS.md
- docs/requirements/overview.md
- docs/requirements/backend.md
- docs/requirements/analyze/user-case.md
- docs/requirements/analyze/er-diagram.md
- docs/design/api/interface-layer.md
- docs/design/realtime/websocket-system.md
- docs/workstreams/00-overview.md
- docs/workstreams/06-audit-knowledge.md

## 4) 实现要求
- Audit 提交必须按 seq 有序保存 ToolCall
- 审计查询支持 user/time/entity 组合筛选
- reply_accepted 与 task_completed 必须自动写入 DomainKnowledgeItem
- 产出 AuditEntryCreated 事件供 WS 推送

## 5) 数据与文档同步（强约束）
涉及审计/知识结构变更必须同步：
- app/resources/db.sql
- docs/requirements/analyze/er-diagram.md
- docs/design/api/interface-layer.md

## 6) 测试与提交要求
- 覆盖：seq 顺序正确、筛选条件组合、知识条目自动触发去重
- 提交前必须通过全部单元测试

## 7) 本次任务
实现以下接口及单测：
- POST /audit/submit
- GET /audit
- GET /audit/{entry_id}
- GET /users/{user_id}/domain-knowledge
