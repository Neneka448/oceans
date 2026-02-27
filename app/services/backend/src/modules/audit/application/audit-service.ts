import { randomUUID } from "crypto";
import type { AuditRepository, AuditEntryFilter } from "../domain/audit-repository.js";
import { AuditEntry, type ToolCallData, type AuditEntryCreatedEvent } from "../domain/audit-entry.js";
import type { PaginatedResult } from "../domain/audit-repository.js";

export interface SubmitAuditCommand {
  userId: string;
  summary: string;
  relatedEntityType?: "thread" | "task";
  relatedEntityId?: string;
  toolCalls: Array<{
    seq: number;
    toolName: string;
    inputParams: unknown;
    returnValue: unknown;
  }>;
}

export interface AuditEntryDto {
  entryId: string;
  userId: string;
  summary: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  createdAt: string;
}

export interface AuditEntryDetailDto extends AuditEntryDto {
  toolCalls: Array<{
    seq: number;
    toolName: string;
    inputParams: unknown;
    returnValue: unknown;
  }>;
}

export type AuditEntryCreatedHandler = (event: AuditEntryCreatedEvent) => void | Promise<void>;

export class AuditService {
  private readonly repository: AuditRepository;
  private eventHandlers: AuditEntryCreatedHandler[] = [];

  constructor(repository: AuditRepository) {
    this.repository = repository;
  }

  onEntryCreated(handler: AuditEntryCreatedHandler): void {
    this.eventHandlers.push(handler);
  }

  async submitAudit(command: SubmitAuditCommand): Promise<{ entryId: string }> {
    const entryId = randomUUID();

    const toolCalls: ToolCallData[] = command.toolCalls.map((tc) => ({
      seq: tc.seq,
      toolName: tc.toolName,
      inputParams: tc.inputParams,
      returnValue: tc.returnValue
    }));

    const entry = AuditEntry.create(
      entryId,
      command.userId,
      command.summary,
      toolCalls,
      command.relatedEntityType,
      command.relatedEntityId
    );

    await this.repository.save(entry);

    // 触发领域事件
    const event: AuditEntryCreatedEvent = {
      name: "audit.entry_created",
      payload: {
        entryId: entry.id,
        userId: entry.userId,
        summary: entry.summary,
        createdAt: entry.createdAt.toISOString()
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

    return { entryId };
  }

  async getAuditEntry(entryId: string): Promise<AuditEntryDetailDto | null> {
    const entry = await this.repository.findById(entryId);
    if (!entry) return null;

    return this.mapToDetailDto(entry);
  }

  async listAuditEntries(
    filter: AuditEntryFilter,
    page: number,
    pageSize: number
  ): Promise<PaginatedResult<AuditEntryDto>> {
    const result = await this.repository.findMany(filter, page, pageSize);

    return {
      items: result.items.map((e) => this.mapToDto(e)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize
    };
  }

  private mapToDto(entry: AuditEntry): AuditEntryDto {
    return {
      entryId: entry.id,
      userId: entry.userId,
      summary: entry.summary,
      relatedEntityType: entry.relatedEntityType,
      relatedEntityId: entry.relatedEntityId,
      createdAt: entry.createdAt.toISOString()
    };
  }

  private mapToDetailDto(entry: AuditEntry): AuditEntryDetailDto {
    return {
      ...this.mapToDto(entry),
      toolCalls: entry.toolCalls.map((tc) => ({
        seq: tc.seq,
        toolName: tc.toolName,
        inputParams: tc.inputParams,
        returnValue: tc.returnValue
      }))
    };
  }
}
