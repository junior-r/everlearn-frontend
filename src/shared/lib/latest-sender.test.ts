import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLatestSender } from "./latest-sender";

describe("createLatestSender", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** A send that resolves only when told to, recording what it was given. */
  function deferredSend() {
    const sent: number[] = [];
    const pending: Array<() => void> = [];
    const send = (value: number) =>
      new Promise<void>((resolve) => {
        sent.push(value);
        pending.push(resolve);
      });
    const finish = async () => {
      pending.shift()?.();
      await vi.advanceTimersByTimeAsync(0);
    };
    return { sent, send, finish };
  }

  it("sends the first value at once", () => {
    const { sent, send } = deferredSend();
    const sender = createLatestSender(send, { minInterval: 200, now: () => Date.now() });

    sender.push(1);

    expect(sent).toEqual([1]);
  });

  it("sends one request at a time, and only the newest value that waited", async () => {
    const { sent, send, finish } = deferredSend();
    const sender = createLatestSender(send, { minInterval: 0, now: () => Date.now() });

    sender.push(1);
    sender.push(2);
    sender.push(3);
    expect(sent).toEqual([1]);

    await finish();
    expect(sent).toEqual([1, 3]);
  });

  it("waits out the interval between two sends", async () => {
    const { sent, send, finish } = deferredSend();
    const sender = createLatestSender(send, { minInterval: 200, now: () => Date.now() });

    sender.push(1);
    await finish();
    sender.push(2);
    expect(sent).toEqual([1]);

    await vi.advanceTimersByTimeAsync(199);
    expect(sent).toEqual([1]);
    await vi.advanceTimersByTimeAsync(1);
    expect(sent).toEqual([1, 2]);
  });

  it("goes on after a failed send, and reports it", async () => {
    const errors: unknown[] = [];
    const sent: number[] = [];
    const sender = createLatestSender(
      (value: number) => {
        sent.push(value);
        return value === 1 ? Promise.reject(new Error("down")) : Promise.resolve();
      },
      { minInterval: 0, onError: (error) => errors.push(error), now: () => Date.now() },
    );

    sender.push(1);
    sender.push(2);
    await vi.advanceTimersByTimeAsync(0);

    expect(sent).toEqual([1, 2]);
    expect(errors).toHaveLength(1);
  });

  it("sends nothing more once disposed", async () => {
    const { sent, send, finish } = deferredSend();
    const sender = createLatestSender(send, { minInterval: 200, now: () => Date.now() });

    sender.push(1);
    sender.push(2);
    sender.dispose();
    await finish();
    await vi.advanceTimersByTimeAsync(500);

    expect(sent).toEqual([1]);
  });
});
