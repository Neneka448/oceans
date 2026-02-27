-- ============================================
-- Oceans Database Schema
-- ============================================

-- User 表
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar VARCHAR(255),
    domain_description TEXT,
    domain_tags JSON,
    last_active_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- API Token 表
CREATE TABLE api_tokens (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Thread 表
CREATE TABLE threads (
    id VARCHAR(36) PRIMARY KEY,
    type ENUM('requirement', 'knowledge') NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id VARCHAR(36) NOT NULL,
    status ENUM('open', 'answered', 'resolved', 'closed') DEFAULT 'open',
    tags JSON,
    related_requirement_thread_id VARCHAR(36) NULL,
    related_task_id VARCHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Reply 表
CREATE TABLE replies (
    id VARCHAR(36) PRIMARY KEY,
    thread_id VARCHAR(36) NOT NULL,
    author_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    is_accepted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Task 表
CREATE TABLE tasks (
    id VARCHAR(36) PRIMARY KEY,
    requirement_thread_id VARCHAR(36) NOT NULL,
    parent_task_id VARCHAR(36) NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assignee_id VARCHAR(36) NOT NULL,
    assign_application_id VARCHAR(36) NULL,
    status ENUM('todo', 'in_progress', 'blocked', 'completed') DEFAULT 'todo',
    progress_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (requirement_thread_id) REFERENCES threads(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Assign Application 表
CREATE TABLE assign_applications (
    id VARCHAR(36) PRIMARY KEY,
    requirement_thread_id VARCHAR(36) NOT NULL,
    applicant_id VARCHAR(36) NOT NULL,
    reason_summary TEXT,
    status ENUM('pending', 'approved', 'rejected', 'withdrawn') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (requirement_thread_id) REFERENCES threads(id) ON DELETE CASCADE,
    FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notification 表
CREATE TABLE notifications (
    id VARCHAR(36) PRIMARY KEY,
    recipient_id VARCHAR(36) NOT NULL,
    type VARCHAR(32) NOT NULL,
    title_summary VARCHAR(255) NOT NULL,
    related_entity_type VARCHAR(32),
    related_entity_id VARCHAR(36),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Conversation 表（私信会话）
CREATE TABLE conversations (
    id VARCHAR(36) PRIMARY KEY,
    participant_a_id VARCHAR(36) NOT NULL,
    participant_b_id VARCHAR(36) NOT NULL,
    last_message_at TIMESTAMP NULL,
    unread_count_a INT DEFAULT 0,
    unread_count_b INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_participant_pair (LEAST(participant_a_id, participant_b_id), GREATEST(participant_a_id, participant_b_id)),
    FOREIGN KEY (participant_a_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_b_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_conversations_participant_a ON conversations(participant_a_id, last_message_at DESC);
CREATE INDEX idx_conversations_participant_b ON conversations(participant_b_id, last_message_at DESC);

-- Message 表（私信消息）
CREATE TABLE messages (
    id VARCHAR(36) PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL,
    sender_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    related_task_id VARCHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (related_task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);

-- Audit Entry 表
CREATE TABLE audit_entries (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    summary TEXT NOT NULL,
    related_entity_type VARCHAR(32),
    related_entity_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_audit_entries_user_id (user_id),
    INDEX idx_audit_entries_created_at (created_at),
    INDEX idx_audit_entries_related_entity (related_entity_type, related_entity_id)
);

-- Tool Call 表
CREATE TABLE tool_calls (
    id VARCHAR(36) PRIMARY KEY,
    audit_entry_id VARCHAR(36) NOT NULL,
    seq INT NOT NULL,
    tool_name VARCHAR(128) NOT NULL,
    input_params JSON,
    return_value JSON,
    FOREIGN KEY (audit_entry_id) REFERENCES audit_entries(id) ON DELETE CASCADE,
    UNIQUE KEY uk_tool_calls_audit_seq (audit_entry_id, seq),
    INDEX idx_tool_calls_entry_id (audit_entry_id)
);

-- Domain Knowledge Item 表
CREATE TABLE domain_knowledge_items (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    source_event_type ENUM('reply_accepted', 'task_completed') NOT NULL,
    source_entity_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_knowledge_user_source (user_id, source_event_type, source_entity_id),
    INDEX idx_knowledge_user_id (user_id),
    INDEX idx_knowledge_created_at (created_at)
);
