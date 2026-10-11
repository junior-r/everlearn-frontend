import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRealtime, type RealtimeOptions } from "./realtime";

type Listener = (...args: unknown[]) => void;

/** A socket the test drives by hand: it records what was emitted and fires events on demand. */
class FakeSocket {
  connected = false;
  readonly emitted: Array<[string, unknown]> = [];
  connects = 0;
  private readonly listeners = new Map<string, Listener[]>();

  on(event: string, listener: Listener): this {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);
    return this;
  }

  emit(event: string, payload: unknown): this {
    this.emitted.push([event, payload]);
    return this;
  }

  connect(): this {
    this.connects += 1;
    return this;
  }

  disconnect(): this {
    this.connected = false;
    return this;
  }

  fire(event: string, ...args: unknown[]): void {
    if (event === "connect") {
      this.connected = true;
    }
    this.listeners.get(event)?.forEach((listener) => listener(...args));
  }
}

function setup(overrides: Partial<RealtimeOptions> = {}) {
  const sockets: FakeSocket[] = [];
  const auths: unknown[] = [];
  let token: string | null = "token-1";
  const refresh = vi.fn(async () => {
    token = "token-2";
    return token;
  });
  const realtime = createRealtime({
    url: "http://api.test/realtime",
    getToken: () => token,
    refresh,
    retryDelayMs: 1000,
    connect: ((_url: string, options: { auth: (send: (data: unknown) => void) => void }) => {
      const socket = new FakeSocket();
      sockets.push(socket);
      options.auth((data) => auths.push(data));
      return socket;
    }) as unknown as RealtimeOptions["connect"],
    ...overrides,
  });
  return { realtime, sockets, auths, refresh };
}

describe("createRealtime", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("opens one connection with the current access token, however often it is asked to", () => {
    const { realtime, sockets, auths } = setup();

    realtime.connect();
    realtime.connect();

    expect(sockets).toHaveLength(1);
    expect(auths).toEqual([{ token: "token-1" }]);
  });

  it("hands each event to its listeners until they unsubscribe", () => {
    const { realtime, sockets } = setup();
    const onMessage = vi.fn();
    const onNotification = vi.fn();
    const stop = realtime.on("message", onMessage);
    realtime.on("notification", onNotification);
    realtime.connect();

    sockets[0].fire("message", { id: "m1" });
    sockets[0].fire("notification", null);
    stop();
    sockets[0].fire("message", { id: "m2" });

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith({ id: "m1" });
    expect(onNotification).toHaveBeenCalledWith(null);
  });

  it("tells the server what is being viewed, and says it again after reconnecting", () => {
    const { realtime, sockets } = setup();
    realtime.connect();
    // Chosen before the connection is up: sent once it is
    realtime.setViewing("dm:a:alan");
    expect(sockets[0].emitted).toEqual([]);

    sockets[0].fire("connect");
    realtime.setViewing(null);
    realtime.setViewing("dm:a:grace");
    sockets[0].fire("connect");

    expect(sockets[0].emitted).toEqual([
      ["viewing", "dm:a:alan"],
      ["viewing", null],
      ["viewing", "dm:a:grace"],
      ["viewing", "dm:a:grace"],
    ]);
  });

  it("renews the token and connects again when the server refused the connection", async () => {
    const { realtime, sockets, refresh } = setup();
    realtime.connect();

    sockets[0].fire("disconnect", "io server disconnect");
    expect(refresh).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(sockets[0].connects).toBe(1);
  });

  it("leaves a dropped network connection to Socket.io, and stays down when the session is over", async () => {
    const dropped = setup();
    dropped.realtime.connect();
    dropped.sockets[0].fire("disconnect", "transport close");
    await vi.advanceTimersByTimeAsync(5000);
    expect(dropped.refresh).not.toHaveBeenCalled();

    const over = setup({ refresh: vi.fn(async () => null) });
    over.realtime.connect();
    over.sockets[0].fire("disconnect", "io server disconnect");
    await vi.advanceTimersByTimeAsync(5000);
    expect(over.sockets[0].connects).toBe(0);
  });

  it("stops retrying once disconnected on purpose, and can connect afresh later", async () => {
    const { realtime, sockets, refresh } = setup();
    realtime.connect();
    sockets[0].fire("disconnect", "io server disconnect");

    realtime.disconnect();
    await vi.advanceTimersByTimeAsync(5000);
    realtime.connect();

    expect(refresh).not.toHaveBeenCalled();
    expect(sockets).toHaveLength(2);
  });
});
