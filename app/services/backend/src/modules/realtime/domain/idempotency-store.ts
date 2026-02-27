export interface IdempotencyStore {
  exists(key: string): boolean;
  set(key: string, ttlMs: number): void;
  deleteByPrefix(prefix: string): void;
}
