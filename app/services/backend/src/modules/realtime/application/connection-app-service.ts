import { AppError } from "../../../shared/errors/app-error.js";
import { ErrorCode } from "../../../shared/errors/error-code.js";
import { Connection } from "../domain/connection.js";
import type { ConnectionRepository } from "../domain/connection-repository.js";
import type { IdempotencyStore } from "../domain/idempotency-store.js";
import type { SubscriptionChannel } from "../domain/subscription.js";

export class ConnectionAppService {
  constructor(
    private readonly repository: ConnectionRepository,
    private readonly idempotencyStore: IdempotencyStore
  ) {}

  onConnect(connectionId: string, userId: string): Connection {
    const connection = new Connection(connectionId, userId);
    this.repository.save(connection);

    return connection;
  }

  onDisconnect(connectionId: string): void {
    this.repository.remove(connectionId);
    this.idempotencyStore.deleteByPrefix(`${connectionId}:`);
  }

  subscribe(connectionId: string, channel: SubscriptionChannel): void {
    const connection = this.requireConnection(connectionId);
    connection.subscribe(channel);
    this.repository.save(connection);
  }

  unsubscribe(connectionId: string, channel: SubscriptionChannel): void {
    const connection = this.requireConnection(connectionId);
    connection.unsubscribe(channel);
    this.repository.save(connection);
  }

  ping(connectionId: string, currentTime = Date.now()): void {
    const connection = this.requireConnection(connectionId);
    connection.touch(currentTime);
    this.repository.save(connection);
  }

  closeStaleConnections(heartbeatTimeoutMs: number, now = Date.now()): string[] {
    const staleConnections = this.repository
      .list()
      .filter((connection) => now - connection.lastHeartbeatAt > heartbeatTimeoutMs);

    for (const staleConnection of staleConnections) {
      this.onDisconnect(staleConnection.connectionId);
    }

    return staleConnections.map((connection) => connection.connectionId);
  }

  logoutUser(userId: string): string[] {
    const connections = this.repository.findByUserId(userId);

    for (const connection of connections) {
      this.onDisconnect(connection.connectionId);
    }

    return connections.map((connection) => connection.connectionId);
  }

  private requireConnection(connectionId: string): Connection {
    const connection = this.repository.findById(connectionId);

    if (!connection) {
      throw new AppError(ErrorCode.NotFound, "connection not found", 404);
    }

    return connection;
  }
}
