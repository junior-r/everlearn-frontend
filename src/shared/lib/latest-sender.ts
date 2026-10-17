export interface LatestSender<T> {
  /** Queues a value; only the newest one waiting is ever sent. */
  push(value: T): void;
  /** Drops whatever is waiting and stops sending. */
  dispose(): void;
}

interface LatestSenderOptions {
  /** The least time between the start of two sends, in milliseconds. */
  minInterval: number;
  onError?(error: unknown): void;
  now?(): number;
}

/**
 * Sends a stream of states one request at a time, at most once per
 * `minInterval`, always the newest: a slider dragged for a second becomes a
 * handful of requests that arrive in order, ending with where it stopped.
 */
export function createLatestSender<T>(send: (value: T) => Promise<void>, options: LatestSenderOptions): LatestSender<T> {
  const now = options.now ?? Date.now;
  let waiting: { value: T } | null = null;
  let isSending = false;
  let lastStart = Number.NEGATIVE_INFINITY;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let isDisposed = false;

  function schedule(): void {
    if (isDisposed || isSending || timer !== null || waiting === null) {
      return;
    }
    const wait = lastStart + options.minInterval - now();
    if (wait > 0) {
      timer = setTimeout(() => {
        timer = null;
        void flush();
      }, wait);
    } else {
      void flush();
    }
  }

  async function flush(): Promise<void> {
    if (isDisposed || waiting === null) {
      return;
    }
    const { value } = waiting;
    waiting = null;
    isSending = true;
    lastStart = now();
    try {
      await send(value);
    } catch (error) {
      options.onError?.(error);
    } finally {
      isSending = false;
      schedule();
    }
  }

  return {
    push(value) {
      waiting = { value };
      schedule();
    },
    dispose() {
      isDisposed = true;
      waiting = null;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
