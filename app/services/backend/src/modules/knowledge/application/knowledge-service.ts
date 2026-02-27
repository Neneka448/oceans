import { randomUUID } from "crypto";
import type { KnowledgeRepository, PaginatedResult } from "../domain/knowledge-repository.js";
import { DomainKnowledgeItem, type SourceEventType, type DomainKnowledgeItemCreatedEvent } from "../domain/domain-knowledge-item.js";

export interface CreateKnowledgeCommand {
  userId: string;
  content: string;
  sourceEventType: SourceEventType;
  sourceEntityId: string;
}

export interface KnowledgeDto {
  knowledgeId: string;
  content: string;
  sourceEventType: SourceEventType;
  sourceEntityId: string;
  createdAt: string;
}

export type KnowledgeItemCreatedHandler = (event: DomainKnowledgeItemCreatedEvent) => void | Promise<void>;

export class KnowledgeService {
  private readonly repository: KnowledgeRepository;
  private eventHandlers: KnowledgeItemCreatedHandler[] = [];

  constructor(repository: KnowledgeRepository) {
    this.repository = repository;
  }

  onItemCreated(handler: KnowledgeItemCreatedHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * 创建领域知识条目（用于系统自动触发）
   * 会检查去重：同一用户的同一来源事件只能创建一次
   */
  async createKnowledge(command: CreateKnowledgeCommand): Promise<{ knowledgeId: string; created: boolean }> {
    // 检查是否已存在（去重）
    const exists = await this.repository.existsBySource(
      command.userId,
      command.sourceEventType,
      command.sourceEntityId
    );

    if (exists) {
      // 已存在，返回已存在的条目 ID
      return { knowledgeId: "", created: false };
    }

    const knowledgeId = randomUUID();

    const item = DomainKnowledgeItem.create(
      knowledgeId,
      command.userId,
      command.content,
      command.sourceEventType,
      command.sourceEntityId
    );

    await this.repository.save(item);

    // 触发领域事件
    const event: DomainKnowledgeItemCreatedEvent = {
      name: "knowledge.item_created",
      payload: {
        knowledgeId: item.id,
        userId: item.userId,
        content: item.content,
        sourceEventType: item.sourceEventType,
        sourceEntityId: item.sourceEntityId,
        createdAt: item.createdAt.toISOString()
      }
    };

    // 异步执行事件处理器
    for (const handler of this.eventHandlers) {
      try {
        await handler(event);
      } catch {
        // 事件处理错误不应影响主流程
      }
    }

    return { knowledgeId, created: true };
  }

  async getUserKnowledge(
    userId: string,
    page: number,
    pageSize: number
  ): Promise<PaginatedResult<KnowledgeDto>> {
    const result = await this.repository.findByUserId(userId, page, pageSize);

    return {
      items: result.items.map((item) => this.mapToDto(item)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize
    };
  }

  private mapToDto(item: DomainKnowledgeItem): KnowledgeDto {
    return {
      knowledgeId: item.id,
      content: item.content,
      sourceEventType: item.sourceEventType,
      sourceEntityId: item.sourceEntityId,
      createdAt: item.createdAt.toISOString()
    };
  }
}
