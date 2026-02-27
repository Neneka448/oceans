import type { KnowledgeRepository, PaginatedResult } from "../domain/knowledge-repository.js";
import { DomainKnowledgeItem, type SourceEventType } from "../domain/domain-knowledge-item.js";

interface KnowledgeRecord {
  id: string;
  user_id: string;
  content: string;
  source_event_type: SourceEventType;
  source_entity_id: string;
  created_at: Date;
}

export class KnowledgeMemoryRepository implements KnowledgeRepository {
  private records: Map<string, KnowledgeRecord> = new Map();

  async save(item: DomainKnowledgeItem): Promise<void> {
    const record: KnowledgeRecord = {
      id: item.id,
      user_id: item.userId,
      content: item.content,
      source_event_type: item.sourceEventType,
      source_entity_id: item.sourceEntityId,
      created_at: item.createdAt
    };

    this.records.set(item.id, record);
  }

  async findById(id: string): Promise<DomainKnowledgeItem | null> {
    const record = this.records.get(id);
    if (!record) return null;

    return this.toDomain(record);
  }

  async findByUserId(
    userId: string,
    page: number,
    pageSize: number
  ): Promise<PaginatedResult<DomainKnowledgeItem>> {
    let records = Array.from(this.records.values()).filter((r) => r.user_id === userId);

    // 按创建时间倒序排列
    records.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

    const total = records.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedRecords = records.slice(start, end);

    return {
      items: paginatedRecords.map((r) => this.toDomain(r)),
      total,
      page,
      pageSize
    };
  }

  async existsBySource(
    userId: string,
    sourceEventType: SourceEventType,
    sourceEntityId: string
  ): Promise<boolean> {
    for (const record of this.records.values()) {
      if (
        record.user_id === userId &&
        record.source_event_type === sourceEventType &&
        record.source_entity_id === sourceEntityId
      ) {
        return true;
      }
    }
    return false;
  }

  private toDomain(record: KnowledgeRecord): DomainKnowledgeItem {
    return new DomainKnowledgeItem({
      id: record.id,
      userId: record.user_id,
      content: record.content,
      sourceEventType: record.source_event_type,
      sourceEntityId: record.source_entity_id,
      createdAt: record.created_at
    });
  }

  // 测试辅助方法
  clear(): void {
    this.records.clear();
  }
}
