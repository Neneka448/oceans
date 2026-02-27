import type { ServerFrame } from "../domain/ws-frame.js";
import type { WsFrameAdapter } from "../application/ws-frame-adapter.js";

export class InMemoryWsFrameAdapter implements WsFrameAdapter {
  private readonly sentFrames = new Map<string, ServerFrame[]>();
  private readonly closedConnections = new Map<string, string>();

  send(connectionId: string, frame: ServerFrame): void {
    const frames = this.sentFrames.get(connectionId) ?? [];
    frames.push(frame);
    this.sentFrames.set(connectionId, frames);
  }

  close(connectionId: string, reason: string): void {
    this.closedConnections.set(connectionId, reason);
  }

  listSentFrames(connectionId: string): ServerFrame[] {
    return this.sentFrames.get(connectionId) ?? [];
  }

  getCloseReason(connectionId: string): string | undefined {
    return this.closedConnections.get(connectionId);
  }
}
