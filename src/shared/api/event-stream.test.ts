import { describe, expect, it } from "vitest";
import { readEventStream } from "./event-stream";

function streamOf(chunks: string[], onCancel?: () => void): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let next = 0;
  return new ReadableStream({
    pull(controller) {
      if (next < chunks.length) {
        controller.enqueue(encoder.encode(chunks[next]));
        next += 1;
      } else {
        controller.close();
      }
    },
    cancel: onCancel,
  });
}

async function collect(chunks: string[]): Promise<string[]> {
  const events: string[] = [];
  for await (const data of readEventStream(streamOf(chunks))) {
    events.push(data);
  }
  return events;
}

describe("readEventStream", () => {
  it("yields the data of each event", async () => {
    expect(await collect(['data: {"a":1}\n\n', 'data: {"b":2}\n\n'])).toEqual(['{"a":1}', '{"b":2}']);
  });

  it("puts together an event split across chunks, and separates several in one", async () => {
    expect(await collect(["data: ho", "la\n", "\ndata: uno\n\ndata: dos\n\n"])).toEqual(["hola", "uno", "dos"]);
  });

  it("keeps a character whose bytes arrive in different chunks", async () => {
    const bytes = new TextEncoder().encode("data: ¿Cómo?\n\n");
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        // Cuts "¿" in half
        controller.enqueue(bytes.slice(0, 7));
        controller.enqueue(bytes.slice(7));
        controller.close();
      },
    });

    const events: string[] = [];
    for await (const data of readEventStream(stream)) {
      events.push(data);
    }

    expect(events).toEqual(["¿Cómo?"]);
  });

  it("ignores comments and other fields, joins data lines and accepts CRLF", async () => {
    expect(await collect([": ping\n\n", "event: note\ndata: a\ndata: b\n\n", "data: c\r\n\r\n"])).toEqual([
      "a\nb",
      "c",
    ]);
  });

  it("yields a last event the server did not terminate", async () => {
    expect(await collect(["data: uno\n\ndata: dos"])).toEqual(["uno", "dos"]);
  });

  it("releases the connection when the reader stops early", async () => {
    let cancelled = false;
    const events = readEventStream(
      streamOf(["data: uno\n\n", "data: dos\n\n", "data: tres\n\n"], () => {
        cancelled = true;
      }),
    );

    for await (const data of events) {
      if (data === "uno") {
        break;
      }
    }

    expect(cancelled).toBe(true);
  });
});
