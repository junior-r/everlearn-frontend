import { io, type Socket } from "socket.io-client";

/** What the server pushes to a signed-in browser. */
export type RealtimeEvent = "message" | "notification";

type Handler = (payload: unknown) => void;

export interface RealtimeOptions {
  /** The Socket.io endpoint, namespace included. */
  url: string;
  getToken(): string | null;
  /** Renews the access token; resolves to null when the session is over. */
  refresh(): Promise<string | null>;
  /** How long to wait before trying again after the server refused the connection. */
  retryDelayMs?: number;
  connect?: typeof io;
}

export interface Realtime {
  /** Opens the connection, if it is not open already. */
  connect(): void;
  disconnect(): void;
  /** Calls the handler for each event of that kind; returns an unsubscribe function. */
  on(event: RealtimeEvent, handler: Handler): () => void;
  /** Tells the server what this browser is showing (an open conversation), or null for nothing. */
  setViewing(key: string | null): void;
}

/**
 * The live connection to the backend. It delivers what happens while the app
 * is open; nothing depends on it alone, since every screen also loads its data
 * over HTTP. The server drops a connection whose access token has expired, so
 * the token is renewed before trying again.
 */
export function createRealtime(options: RealtimeOptions): Realtime {
  const open = options.connect ?? io;
  const handlers = new Map<RealtimeEvent, Set<Handler>>();
  let socket: Socket | null = null;
  let viewing: string | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;

  function dispatch(event: RealtimeEvent, payload: unknown): void {
    handlers.get(event)?.forEach((handler) => handler(payload));
  }

  function connect(): void {
    if (socket) {
      return;
    }
    const current = open(options.url, {
      // Asked for on every attempt, so a reconnection carries the latest token
      auth: (send) => send({ token: options.getToken() }),
      transports: ["websocket"],
    });
    socket = current;
    current.on("connect", () => current.emit("viewing", viewing));
    current.on("message", (payload: unknown) => dispatch("message", payload));
    current.on("notification", (payload: unknown) => dispatch("notification", payload));
    current.on("disconnect", (reason) => {
      // The server closes the socket itself only when it refuses the token
      if (reason !== "io server disconnect" || socket !== current) {
        return;
      }
      retry = setTimeout(() => {
        void options.refresh().then((token) => {
          if (token && socket === current) {
            current.connect();
          }
        });
      }, options.retryDelayMs ?? 3000);
    });
  }

  function disconnect(): void {
    if (retry) {
      clearTimeout(retry);
      retry = null;
    }
    socket?.disconnect();
    socket = null;
    viewing = null;
  }

  return {
    connect,
    disconnect,
    on(event, handler) {
      const set = handlers.get(event) ?? new Set<Handler>();
      set.add(handler);
      handlers.set(event, set);
      return () => set.delete(handler);
    },
    setViewing(key) {
      viewing = key;
      if (socket?.connected) {
        socket.emit("viewing", key);
      }
    },
  };
}
