import type { ServerFrame } from "../domain/ws-frame.js";

export interface WsFrameAdapter {
  send(connectionId: string, frame: ServerFrame): void;
  close(connectionId: string, reason: string): void;
}
