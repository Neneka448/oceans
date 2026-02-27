import type { IdempotencyStore } from "../domain/idempotency-store.js";

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly keys = new Map<string, number>();

  exists(key: string): boolean {
    this.deleteExpired();

    return this.keys.has(key);
  }

  set(key: string, ttlMs: number): void {
    this.keys.set(key, Date.now() + ttlMs);
  }

  deleteByPrefix(prefix: string): void {
    for (const key of this.keys.keys()) {
      if (key.startsWith(prefix)) {
        this.keys.delete(key);
      }
    }
  }

  private deleteExpired(now = Date.now()): void {
    for (const [key, expiryTime] of this.keys.entries()) {
      if (expiryTime <= now) {
        this.keys.delete(key);
      }
    }
  }
}
