import { ensureSubscriptionChannel } from "../domain/subscription.js";
import type { IdempotencyStore } from "../domain/idempotency-store.js";
import type { ServerFrame } from "../domain/ws-frame.js";
import { ConnectionAppService } from "./connection-app-service.js";

const IDEMPOTENCY_TTL_MS = 60_000;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const asString = (value: unknown): string | null => {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

export class WsMessageHandler {
  constructor(
    private readonly connectionAppService: ConnectionAppService,
    private readonly idempotencyStore: IdempotencyStore
  ) {}

  handleFrame(connectionId: string, frame: unknown): ServerFrame {
    if (!isRecord(frame) || typeof frame.type !== "string") {
      return {
        type: "error",
        error: "invalid frame"
      };
    }

    if (frame.type === "ping") {
      this.connectionAppService.ping(connectionId);

      return {
        type: "pong"
      };
    }

    if (frame.type !== "subscribe" && frame.type !== "unsubscribe") {
      return {
        type: "error",
        error: "unsupported frame type"
      };
    }

    const id = asString(frame.id);

    if (!id) {
      return {
        type: "error",
        error: "missing id"
      };
    }

    const channel = asString(frame.channel);

    if (!channel) {
      return {
        type: "error",
        id,
        error: "missing channel"
      };
    }

    const key = `${connectionId}:${id}`;

    if (this.idempotencyStore.exists(key)) {
      return {
        type: "ack",
        id,
        duplicated: true
      };
    }

    const normalizedChannel = ensureSubscriptionChannel(channel);

    if (frame.type === "subscribe") {
      this.connectionAppService.subscribe(connectionId, normalizedChannel);
    } else {
      this.connectionAppService.unsubscribe(connectionId, normalizedChannel);
    }

    this.idempotencyStore.set(key, IDEMPOTENCY_TTL_MS);

    return {
      type: "ack",
      id
    };
  }
}
