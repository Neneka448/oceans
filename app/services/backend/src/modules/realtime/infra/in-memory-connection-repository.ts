import type { Connection } from "../domain/connection.js";
import type { ConnectionRepository } from "../domain/connection-repository.js";
import type { SubscriptionChannel } from "../domain/subscription.js";

const addIndex = <T>(index: Map<string, Set<T>>, key: string, value: T): void => {
  const bucket = index.get(key) ?? new Set<T>();
  bucket.add(value);
  index.set(key, bucket);
};

const removeIndex = <T>(index: Map<string, Set<T>>, key: string, value: T): void => {
  const bucket = index.get(key);

  if (!bucket) {
    return;
  }

  bucket.delete(value);

  if (bucket.size === 0) {
    index.delete(key);
  }
};

export class InMemoryConnectionRepository implements ConnectionRepository {
  private readonly connections = new Map<string, Connection>();
  private readonly userIndex = new Map<string, Set<string>>();
  private readonly channelIndex = new Map<string, Set<string>>();

  save(connection: Connection): void {
    const previous = this.connections.get(connection.connectionId);

    if (previous) {
      removeIndex(this.userIndex, previous.userId, previous.connectionId);

      for (const channel of previous.subscriptions) {
        removeIndex(this.channelIndex, channel, previous.connectionId);
      }
    }

    this.connections.set(connection.connectionId, connection);
    addIndex(this.userIndex, connection.userId, connection.connectionId);

    for (const channel of connection.subscriptions) {
      addIndex(this.channelIndex, channel, connection.connectionId);
    }
  }

  findById(connectionId: string): Connection | null {
    return this.connections.get(connectionId) ?? null;
  }

  findByUserId(userId: string): Connection[] {
    const ids = this.userIndex.get(userId);

    if (!ids) {
      return [];
    }

    return [...ids]
      .map((id) => this.connections.get(id))
      .filter((connection): connection is Connection => Boolean(connection));
  }

  findBySubscription(channel: SubscriptionChannel): Connection[] {
    const ids = this.channelIndex.get(channel);

    if (!ids) {
      return [];
    }

    return [...ids]
      .map((id) => this.connections.get(id))
      .filter((connection): connection is Connection => Boolean(connection));
  }

  list(): Connection[] {
    return [...this.connections.values()];
  }

  remove(connectionId: string): void {
    const connection = this.connections.get(connectionId);

    if (!connection) {
      return;
    }

    this.connections.delete(connectionId);
    removeIndex(this.userIndex, connection.userId, connection.connectionId);

    for (const channel of connection.subscriptions) {
      removeIndex(this.channelIndex, channel, connection.connectionId);
    }
  }
}
