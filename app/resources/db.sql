-- Oceans Database Schema
-- 负责范围：Audit 与领域知识积累 (Dev-06)

-- ============================================
-- 表：AuditEntry（审计条目）
-- ============================================
CREATE TABLE IF NOT EXISTS audit_entries (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    summary TEXT NOT NULL,
    related_entity_type VARCHAR(20),  -- 'thread' | 'task' | NULL
    related_entity_id VARCHAR(36),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_audit_entries_user_id (user_id),
    INDEX idx_audit_entries_created_at (created_at),
    INDEX idx_audit_entries_related_entity (related_entity_type, related_entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 表：ToolCall（工具调用记录）
-- ============================================
CREATE TABLE IF NOT EXISTS tool_calls (
    id VARCHAR(36) PRIMARY KEY,
    audit_entry_id VARCHAR(36) NOT NULL,
    seq INT NOT NULL,  -- 执行顺序，从 1 开始
    tool_name VARCHAR(100) NOT NULL,
    input_params JSON NOT NULL,
    return_value JSON NOT NULL,

    FOREIGN KEY (audit_entry_id) REFERENCES audit_entries(id) ON DELETE CASCADE,
    UNIQUE KEY uk_tool_calls_audit_seq (audit_entry_id, seq),
    INDEX idx_tool_calls_entry_id (audit_entry_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 表：DomainKnowledgeItem（领域知识条目）
-- ============================================
CREATE TABLE IF NOT EXISTS domain_knowledge_items (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    source_event_type VARCHAR(20) NOT NULL,  -- 'reply_accepted' | 'task_completed'
    source_entity_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_knowledge_user_source (user_id, source_event_type, source_entity_id),
    INDEX idx_knowledge_user_id (user_id),
    INDEX idx_knowledge_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
