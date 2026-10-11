/**
 * Reads a Server-Sent Events body and yields the `data` of each event as it
 * arrives. An event may come split across network chunks, or several in one.
 */
export async function* readEventStream(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffered = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      buffered += decoder.decode(value, { stream: !done });
      const blocks = buffered.split(/\r?\n\r?\n/);
      // Without the blank line that ends it, the last block is still arriving
      buffered = done ? "" : (blocks.pop() ?? "");
      for (const block of blocks) {
        const data = block
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice("data:".length).trimStart())
          .join("\n");
        if (data) {
          yield data;
        }
      }
      if (done) {
        return;
      }
    }
  } finally {
    // Also when the consumer stops early, so the connection is released
    await reader.cancel().catch(() => undefined);
  }
}
