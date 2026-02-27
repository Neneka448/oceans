import type { AuditEntry } from "./audit-entry.js";

export interface AuditEntryFilter {
  userId?: string;
  entityType?: string;
  entityId?: string;
  from?: Date;
  to?: Date;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditRepository {
  save(entry: AuditEntry): Promise<void>;
  findById(id: string): Promise<AuditEntry | null>;
  findMany(filter: AuditEntryFilter, page: number, pageSize: number): Promise<PaginatedResult<AuditEntry>>;
}
