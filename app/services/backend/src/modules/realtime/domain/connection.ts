import type { SubscriptionChannel } from "./subscription.js";

export class Connection {
  readonly subscriptions: Set<SubscriptionChannel>;
  readonly connectedAt: number;
  lastHeartbeatAt: number;

  constructor(
    readonly connectionId: string,
    readonly userId: string,
    connectedAt = Date.now()
  ) {
    this.subscriptions = new Set<SubscriptionChannel>(["user_feed"]);
    this.connectedAt = connectedAt;
    this.lastHeartbeatAt = connectedAt;
  }

  subscribe(channel: SubscriptionChannel): void {
    this.subscriptions.add(channel);
  }

  unsubscribe(channel: SubscriptionChannel): void {
    if (channel === "user_feed") {
      return;
    }

    this.subscriptions.delete(channel);
  }

  isSubscribed(channel: SubscriptionChannel): boolean {
    return this.subscriptions.has(channel);
  }

  touch(currentTime = Date.now()): void {
    this.lastHeartbeatAt = currentTime;
  }
}
