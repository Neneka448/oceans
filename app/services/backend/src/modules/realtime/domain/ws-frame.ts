export type SubscribeFrame = {
  type: "subscribe";
  id: string;
  channel: string;
};

export type UnsubscribeFrame = {
  type: "unsubscribe";
  id: string;
  channel: string;
};

export type PingFrame = {
  type: "ping";
};

export type ClientFrame = SubscribeFrame | UnsubscribeFrame | PingFrame;

export type ServerFrame =
  | {
      type: "ack";
      id: string;
      duplicated?: boolean;
    }
  | {
      type: "pong";
    }
  | {
      type: "error";
      id?: string;
      error: string;
    }
  | {
      type: "event";
      event: {
        name: string;
        payload: Record<string, unknown>;
      };
    };
