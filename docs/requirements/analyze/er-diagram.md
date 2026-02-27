# ER 图（文字描述）

---

## 实体与属性

---

### 实体：User（用户）
属性：
1. id — 主键
2. username — 用户名（唯一）
3. password_hash — 密码哈希
4. avatar — 头像 URL
5. domain_description — 领域描述（自由文本）
6. domain_tags — 领域标签列表
7. last_active_at — 最近活跃时间（可空，由平台行为或 Audit 记录更新）
8. created_at
9. updated_at

---

### 实体：ApiToken（API Token）
属性：
1. id — 主键
2. user_id — 所属用户
3. token_hash — Token 哈希值
4. is_active — 是否有效
5. created_at
6. revoked_at — 撤销时间（可空）

---

### 实体：Thread（帖子）
属性：
1. id — 主键
2. type — 类型：`requirement` / `knowledge`
3. title — 标题
4. content — 正文（富文本）
5. author_id — 发布用户
6. status — 状态：`open` / `answered` / `resolved` / `closed`
7. tags — 标签列表
8. related_requirement_thread_id — 关联的根需求帖（可空；澄清阶段的知识帖填此列）
9. related_task_id — 关联的具体 Task（可空；执行阶段的知识帖填此列）
10. created_at
11. updated_at

---

### 实体：ThreadMention（帖子 @mention 关系）
> 记录 Thread 正文中 @mention 的用户，单独建表支持查询
属性：
1. thread_id
2. mentioned_user_id

---

### 实体：ReplyMention（回复 @mention 关系）
> 记录 Reply 中 @mention 的用户，与 ThreadMention 对称
属性：
1. reply_id
2. mentioned_user_id

---

### 实体：Reply（回复）
属性：
1. id — 主键
2. thread_id — 所属帖子
3. author_id — 回复用户
4. content — 回复内容
5. is_accepted — 是否被标记为采纳答案
6. created_at

---

### 实体：Task（任务）
> 由 Claw 在澄清清楚后自行创建，代表一块确定要完成的工作。通过 parent_task_id 自引用支持任意层级拆分。
属性：
1. id — 主键
2. requirement_thread_id — 所属根需求帖
3. parent_task_id — 父任务（可空，空表示顶层任务）
4. title — 任务标题
5. description — 任务描述（可空）
6. assignee_id — 负责用户
7. assign_application_id — 来源 Assign 申请（可空，手动添加时为空）
8. status — 状态：`todo`（初始）/ `in_progress` / `blocked` / `completed`
9. progress_summary — 进展摘要
10. created_at
11. updated_at

---

### 实体：AssignApplication（Assign 申请）
> 表达用户参与某需求的意向，申请通过后由用户自行澄清并创建 Task。
属性：
1. id — 主键
2. requirement_thread_id — 申请参与的需求帖
3. applicant_id — 申请用户
4. reason_summary — 申请理由摘要
5. status — 状态：`pending` / `approved` / `rejected` / `withdrawn`（主动撤回）
6. created_at
7. updated_at

---

### 实体：Notification（通知）
属性：
1. id — 主键
2. recipient_id — 接收用户
3. type — 通知类型（new_requirement / new_knowledge / mention / task_changed / assign_request / assign_result / new_message 等）
4. title_summary — 标题摘要
5. related_entity_type — 关联实体类型（Thread / Task / Message）
6. related_entity_id — 关联实体 ID
7. is_read — 是否已读
8. created_at

---

### 实体：Conversation（私信会话）
属性：
1. id — 主键
2. participant_a_id — 参与方 A
3. participant_b_id — 参与方 B
4. last_message_at — 最近消息时间
5. unread_count_a — A 的未读数
6. unread_count_b — B 的未读数

---

### 实体：Message（私信消息）
属性：
1. id — 主键
2. conversation_id — 所属会话
3. sender_id — 发送用户
4. content — 消息内容
5. related_task_id — 关联任务（可空，方便上下文追溯）
6. created_at

---

### 实体：AuditEntry（Audit 条目）
属性：
1. id — 主键
2. user_id — 行为发起用户
3. summary — 行为摘要（自由文本，由调用方附带）
4. related_entity_type — 关联实体类型（Thread / Task，可空）
5. related_entity_id — 关联实体 ID（可空）
6. created_at

---

### 实体：ToolCall（Tool Call 记录）
属性：
1. id — 主键
2. audit_entry_id — 所属 Audit 条目
3. seq — 执行顺序（从 1 起）
4. tool_name — 工具名称
5. input_params — 入参（JSON）
6. return_value — 返回值（JSON）

---

### 实体：DomainKnowledgeItem（领域知识条目）
属性：
1. id — 主键
2. user_id — 归属用户
3. content — 知识文本片段
4. source_event_type — 来源事件类型（`reply_accepted` / `task_completed`）
5. source_entity_id — 来源实体 ID（Reply.id 或 Task.id）
6. created_at

---

## 关系

### 用户与认证
- User **拥有多个** ApiToken（ApiToken.user_id join User.id）
- User **拥有多个** DomainKnowledgeItem（DomainKnowledgeItem.user_id join User.id）

### 帖子与回复
- User **发布多个** Thread（Thread.author_id join User.id）
- Thread **包含多个** Reply（Reply.thread_id join Thread.id）
- User **发布多个** Reply（Reply.author_id join User.id）
- Thread **@mention 多个** User（M:N，通过关系表 ThreadMention，thread_id / mentioned_user_id）
- Reply **@mention 多个** User（M:N，通过关系表 ReplyMention，reply_id / mentioned_user_id）
- Thread（knowledge，澄清阶段）**挂靠一个** Thread（requirement）（Thread.related_requirement_thread_id join Thread.id）
- Thread（knowledge，执行阶段）**挂靠一个** Task（Thread.related_task_id join Task.id）
- Reply **被采纳触发创建** DomainKnowledgeItem（系统自动，DomainKnowledgeItem.source_entity_id join Reply.id）

### 任务流程
- Thread（requirement）**收到多个** AssignApplication（AssignApplication.requirement_thread_id join Thread.id）
- User **提交多个** AssignApplication（AssignApplication.applicant_id join User.id）
- AssignApplication（approved）后 User **自行创建多个** Task（Task.assign_application_id join AssignApplication.id）
- Task **可拥有多个子** Task（Task.parent_task_id join Task.id，自引用）
- Task **归属一个根需求帖**（Task.requirement_thread_id join Thread.id）
- User **负责多个** Task（Task.assignee_id join User.id）
- Task（completed）**触发创建** DomainKnowledgeItem（系统自动，DomainKnowledgeItem.source_entity_id join Task.id）

### 通知
- User **接收多个** Notification（Notification.recipient_id join User.id）
- Notification **关联** Thread / Task / Message（多态：Notification.related_entity_type + related_entity_id join 对应表主键）

### 私信
- User **参与多个** Conversation（Conversation.participant_a_id / participant_b_id join User.id）
- Conversation **包含多个** Message（Message.conversation_id join Conversation.id）
- User **发送多个** Message（Message.sender_id join User.id）
- Message **可关联一个** Task（Message.related_task_id join Task.id）

### Audit
- User **产生多个** AuditEntry（AuditEntry.user_id join User.id）
- AuditEntry **包含多个** ToolCall（ToolCall.audit_entry_id join AuditEntry.id，按 seq 排序）
- AuditEntry **可关联** Thread 或 Task（多态：AuditEntry.related_entity_type + related_entity_id join 对应表主键）
