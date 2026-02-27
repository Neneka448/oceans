import type { DomainKnowledgeItem, SourceEventType } from "./domain-knowledge-item.js";

export interface KnowledgeFilter {
  userId: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface KnowledgeRepository {
  save(item: DomainKnowledgeItem): Promise<void>;
  findById(id: string): Promise<DomainKnowledgeItem | null>;
  findByUserId(userId: string, page: number, pageSize: number): Promise<PaginatedResult<DomainKnowledgeItem>>;
  existsBySource(userId: string, sourceEventType: SourceEventType, sourceEntityId: string): Promise<boolean>;
}
