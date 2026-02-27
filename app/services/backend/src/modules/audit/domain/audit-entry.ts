/**
 * AuditEntry 领域实体
 * 代表一次完整的审计记录，包含行为摘要和关联的工具调用序列
 */

export interface ToolCallData {
  seq: number;
  toolName: string;
  inputParams: unknown;
  returnValue: unknown;
}

export interface AuditEntryProps {
  id: string;
  userId: string;
  summary: string;
  relatedEntityType?: "thread" | "task" | null;
  relatedEntityId?: string | null;
  toolCalls: ToolCallData[];
  createdAt: Date;
}

export class AuditEntry {
  readonly id: string;
  readonly userId: string;
  readonly summary: string;
  readonly relatedEntityType: "thread" | "task" | null;
  readonly relatedEntityId: string | null;
  readonly toolCalls: ToolCallData[];
  readonly createdAt: Date;

  constructor(props: AuditEntryProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.summary = props.summary;
    this.relatedEntityType = props.relatedEntityType ?? null;
    this.relatedEntityId = props.relatedEntityId ?? null;
    this.toolCalls = [...props.toolCalls].sort((a, b) => a.seq - b.seq);
    this.createdAt = props.createdAt;
  }

  static create(
    id: string,
    userId: string,
    summary: string,
    toolCalls: ToolCallData[],
    relatedEntityType?: string,
    relatedEntityId?: string
  ): AuditEntry {
    // 验证 tool_calls 的 seq 是连续的从 1 开始
    const sortedCalls = [...toolCalls].sort((a, b) => a.seq - b.seq);
    for (let i = 0; i < sortedCalls.length; i++) {
      if (sortedCalls[i].seq !== i + 1) {
        throw new Error(`Tool call sequence must be continuous starting from 1, expected ${i + 1} at index ${i}`);
      }
    }

    // 验证 related_entity_type 的有效性
    let entityType: "thread" | "task" | null = null;
    if (relatedEntityType) {
      if (relatedEntityType !== "thread" && relatedEntityType !== "task") {
        throw new Error(`Invalid related_entity_type: ${relatedEntityType}, must be 'thread' or 'task'`);
      }
      entityType = relatedEntityType;
    }

    // 如果指定了 entity_type，则必须有 entity_id
    if (entityType && !relatedEntityId) {
      throw new Error("related_entity_id is required when related_entity_type is provided");
    }

    return new AuditEntry({
      id,
      userId,
      summary,
      relatedEntityType: entityType,
      relatedEntityId: relatedEntityId ?? null,
      toolCalls: sortedCalls,
      createdAt: new Date()
    });
  }
}

/**
 * AuditEntryCreated 领域事件
 * 当新的审计条目被创建时触发，用于 WS 推送
 */
export interface AuditEntryCreatedEvent {
  name: "audit.entry_created";
  payload: {
    entryId: string;
    userId: string;
    summary: string;
    createdAt: string;
  };
}
