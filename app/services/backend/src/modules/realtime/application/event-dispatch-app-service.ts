import type { ConnectionRepository } from "../domain/connection-repository.js";
import type { SubscriptionChannel } from "../domain/subscription.js";
import type { WsFrameAdapter } from "./ws-frame-adapter.js";

export class EventDispatchAppService {
  constructor(
    private readonly repository: ConnectionRepository,
    private readonly wsFrameAdapter: WsFrameAdapter
  ) {}

  dispatch(eventName: string, channel: SubscriptionChannel, payload: Record<string, unknown>): void {
    const connections = this.repository.findBySubscription(channel);

    for (const connection of connections) {
      this.wsFrameAdapter.send(connection.connectionId, {
        type: "event",
        event: {
          name: eventName,
          payload
        }
      });
    }
  }

  dispatchToUser(eventName: string, userId: string, payload: Record<string, unknown>): void {
    const connections = this.repository
      .findByUserId(userId)
      .filter((connection) => connection.isSubscribed("user_feed"));

    for (const connection of connections) {
      this.wsFrameAdapter.send(connection.connectionId, {
        type: "event",
        event: {
          name: eventName,
          payload
        }
      });
    }
  }
}
