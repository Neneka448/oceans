import type { Connection } from "./connection.js";
import type { SubscriptionChannel } from "./subscription.js";

export interface ConnectionRepository {
  save(connection: Connection): void;
  findById(connectionId: string): Connection | null;
  findByUserId(userId: string): Connection[];
  findBySubscription(channel: SubscriptionChannel): Connection[];
  list(): Connection[];
  remove(connectionId: string): void;
}
