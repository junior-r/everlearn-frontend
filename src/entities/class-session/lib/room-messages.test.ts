import { describe, expect, it } from "vitest";
import { appendUnique, parseCaption, parseChatDeletion, parseChatMessage, withDeleted } from "./room-messages";

const packet = (value: unknown) => new TextEncoder().encode(typeof value === "string" ? value : JSON.stringify(value));

describe("parseChatMessage", () => {
  const message = {
    id: "m-1",
    senderId: "member-1",
    senderName: "Grace Hopper",
    content: "¿Puede repetir?",
    sentAt: "2026-10-12T08:03:00Z",
    signature: "a1b2",
  };

  it("reads a message the video-server published, ignoring fields it does not know", () => {
    expect(parseChatMessage(packet({ ...message, extra: true, isDeleted: true }))).toEqual({
      ...message,
      isDeleted: false,
    });
  });

  it("keeps a message whose sender has no name", () => {
    expect(parseChatMessage(packet({ ...message, senderName: undefined }))?.senderName).toBe("");
  });

  it.each([
    ["is not JSON", "hola"],
    ["is not an object", [message]],
    ["is null", null],
    ["has no id", { ...message, id: "" }],
    ["has no sender", { ...message, senderId: undefined }],
    ["has no content", { ...message, content: "" }],
    ["has content that is not text", { ...message, content: { html: "<b>x</b>" } }],
  ])("rejects a packet that %s", (_label, value) => {
    expect(parseChatMessage(packet(value))).toBeNull();
  });
});

describe("parseCaption", () => {
  const caption = { id: "c-1", speakerId: "member-1", speakerName: "Alan Turing", text: "Buenos días" };

  it("reads a caption and drops the timing it does not show", () => {
    expect(parseCaption(packet({ ...caption, startedAt: "2026-10-12T08:00:00Z" }))).toEqual(caption);
  });

  it("rejects a caption with no text and anything that is not a caption", () => {
    expect(parseCaption(packet({ ...caption, text: "" }))).toBeNull();
    expect(parseCaption(packet("not json"))).toBeNull();
  });
});

describe("appendUnique", () => {
  const item = (id: string) => ({ id });

  it("adds new items at the end and skips one already listed", () => {
    const first = appendUnique([], item("a"), 10);
    const second = appendUnique(first, item("b"), 10);

    expect(second).toEqual([item("a"), item("b")]);
    // The same array, so a repeated delivery does not re-render the list
    expect(appendUnique(second, item("a"), 10)).toBe(second);
  });

  it("keeps only the newest items once the limit is reached", () => {
    const items = ["a", "b", "c", "d"].reduce<{ id: string }[]>(
      (list, id) => appendUnique(list, item(id), 3),
      [],
    );

    expect(items).toEqual([item("b"), item("c"), item("d")]);
  });
});

describe("chat messages taken down", () => {
  const message = (id: string) => ({
    id,
    senderId: "member-1",
    senderName: "Grace Hopper",
    content: "Hola",
    sentAt: "2026-10-12T08:03:00Z",
    signature: "a1b2",
    isDeleted: false,
  });

  it("reads which message was taken down, and nothing from a packet that names none", () => {
    expect(parseChatDeletion(packet({ id: "m-1" }))).toBe("m-1");
    expect(parseChatDeletion(packet({ id: 7 }))).toBeNull();
    expect(parseChatDeletion(packet("hola"))).toBeNull();
  });

  it("blanks the message and keeps its place", () => {
    const messages = [message("m-1"), message("m-2")];

    expect(withDeleted(messages, "m-1")).toEqual([{ ...message("m-1"), content: "", isDeleted: true }, message("m-2")]);
  });

  it("returns the same list when there is nothing to take down", () => {
    const messages = [message("m-1")];

    expect(withDeleted(messages, "m-9")).toBe(messages);
    const once = withDeleted(messages, "m-1");
    expect(withDeleted(once, "m-1")).toBe(once);
  });
});
