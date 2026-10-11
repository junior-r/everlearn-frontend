import { describe, expect, it } from "vitest";
import { conversationKey, isDirectMessage, mergeMessages, peerOf, type DirectMessage } from "./types";

const message = (id: string, second: number, senderId = "grace", recipientId = "alan"): DirectMessage => ({
  id,
  institutionId: "a",
  senderId,
  recipientId,
  body: id,
  createdAt: `2026-10-11T12:00:${String(second).padStart(2, "0")}.000Z`,
  readAt: null,
});

describe("mergeMessages", () => {
  it("keeps the conversation in order whatever order messages arrive in", () => {
    const merged = mergeMessages([message("b", 2), message("a", 1)], [message("d", 4), message("c", 3)]);

    expect(merged.map(({ id }) => id)).toEqual(["a", "b", "c", "d"]);
  });

  it("keeps one copy of a message that arrives twice, the latest one", () => {
    const read = { ...message("a", 1), readAt: "2026-10-11T12:05:00.000Z" };

    const merged = mergeMessages([message("a", 1), message("b", 2)], [read]);

    expect(merged).toHaveLength(2);
    expect(merged[0].readAt).toBe("2026-10-11T12:05:00.000Z");
  });

  it("orders messages of the same instant the same way every time", () => {
    expect(mergeMessages([message("z", 1)], [message("y", 1)]).map(({ id }) => id)).toEqual(["y", "z"]);
  });
});

describe("peerOf", () => {
  it("names the other end of one's own messages, and nobody for someone else's", () => {
    expect(peerOf(message("a", 1, "grace", "alan"), "grace")).toBe("alan");
    expect(peerOf(message("a", 1, "grace", "alan"), "alan")).toBe("grace");
    expect(peerOf(message("a", 1, "grace", "alan"), "linus")).toBeNull();
  });
});

describe("isDirectMessage", () => {
  it("accepts a message and refuses anything else the server might push", () => {
    expect(isDirectMessage(message("a", 1))).toBe(true);
    expect(isDirectMessage(null)).toBe(false);
    expect(isDirectMessage({ id: "a" })).toBe(false);
    expect(isDirectMessage({ ...message("a", 1), body: 7 })).toBe(false);
  });
});

describe("conversationKey", () => {
  it("names a conversation by institution and peer", () => {
    expect(conversationKey("inst", "alan")).toBe("dm:inst:alan");
  });
});
