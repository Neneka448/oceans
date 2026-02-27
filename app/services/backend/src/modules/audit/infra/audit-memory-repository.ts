import type { AuditRepository, AuditEntryFilter, PaginatedResult } from "../domain/audit-repository.js";
import { AuditEntry, type ToolCallData } from "../domain/audit-entry.js";

interface AuditEntryRecord {
  id: string;
  user_id: string;
  summary: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: Date;
}

interface ToolCallRecord {
  id: string;
  audit_entry_id: string;
  seq: number;
  tool_name: string;
  input_params: string;
  return_value: string;
}

export class AuditMemoryRepository implements AuditRepository {
  private entries: Map<string, AuditEntryRecord> = new Map();
  private toolCalls: Map<string, ToolCallRecord[]> = new Map();

  async save(entry: AuditEntry): Promise<void> {
    const record: AuditEntryRecord = {
      id: entry.id,
      user_id: entry.userId,
      summary: entry.summary,
      related_entity_type: entry.relatedEntityType,
      related_entity_id: entry.relatedEntityId,
      created_at: entry.createdAt
    };

    this.entries.set(entry.id, record);

    const toolCallRecords: ToolCallRecord[] = entry.toolCalls.map((tc) => ({
      id: crypto.randomUUID(),
      audit_entry_id: entry.id,
      seq: tc.seq,
      tool_name: tc.toolName,
      input_params: JSON.stringify(tc.inputParams),
      return_value: JSON.stringify(tc.returnValue)
    }));

    this.toolCalls.set(entry.id, toolCallRecords);
  }

  async findById(id: string): Promise<AuditEntry | null> {
    const record = this.entries.get(id);
    if (!record) return null;

    const toolCallRecords = this.toolCalls.get(id) ?? [];
    return this.toDomain(record, toolCallRecords);
  }

  async findMany(
    filter: AuditEntryFilter,
    page: number,
    pageSize: number
  ): Promise<PaginatedResult<AuditEntry>> {
    let records = Array.from(this.entries.values());

    // 应用过滤条件
    if (filter.userId) {
      records = records.filter((r) => r.user_id === filter.userId);
    }

    if (filter.entityType) {
      records = records.filter((r) => r.related_entity_type === filter.entityType);
    }

    if (filter.entityId) {
      records = records.filter((r) => r.related_entity_id === filter.entityId);
    }

    if (filter.from) {
      records = records.filter((r) => r.created_at >= filter.from!);
    }

    if (filter.to) {
      records = records.filter((r) => r.created_at <= filter.to!);
    }

    // 按创建时间倒序排列
    records.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

    const total = records.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedRecords = records.slice(start, end);

    const items = paginatedRecords.map((r) => {
      const toolCallRecords = this.toolCalls.get(r.id) ?? [];
      return this.toDomain(r, toolCallRecords);
    });

    return {
      items,
      total,
      page,
      pageSize
    };
  }

  private toDomain(record: AuditEntryRecord, toolCallRecords: ToolCallRecord[]): AuditEntry {
    const toolCalls: ToolCallData[] = toolCallRecords
      .sort((a, b) => a.seq - b.seq)
      .map((tc) => ({
        seq: tc.seq,
        toolName: tc.tool_name,
        inputParams: JSON.parse(tc.input_params),
        returnValue: JSON.parse(tc.return_value)
      }));

    return new AuditEntry({
      id: record.id,
      userId: record.user_id,
      summary: record.summary,
      relatedEntityType: record.related_entity_type as "thread" | "task" | null,
      relatedEntityId: record.related_entity_id,
      toolCalls,
      createdAt: record.created_at
    });
  }

  // 测试辅助方法
  clear(): void {
    this.entries.clear();
    this.toolCalls.clear();
  }
}
