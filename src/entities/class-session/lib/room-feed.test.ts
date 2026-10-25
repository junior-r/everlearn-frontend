import { describe, expect, it } from "vitest";
import { EMPTY_FEED, parseFeedPackets, withHistory, withPacket, type FeedPacket } from "./room-feed";
import { CAPTIONS_TOPIC, CHAT_DELETED_TOPIC, CHAT_TOPIC } from "./room-messages";

const encode = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));
const chat = (id: string): FeedPacket => ({
  topic: CHAT_TOPIC,
  payload: encode({ id, senderId: "member-1", senderName: "Grace Hopper", content: `texto ${id}`, sentAt: "", signature: "s" }),
});
const deletion = (id: string): FeedPacket => ({ topic: CHAT_DELETED_TOPIC, payload: encode({ id }) });
const caption = (id: string): FeedPacket => ({
  topic: CAPTIONS_TOPIC,
  payload: encode({ id, speakerId: "member-1", speakerName: "Grace Hopper", text: `dicho ${id}` }),
});
const feedOf = (...packets: FeedPacket[]) => packets.reduce(withPacket, EMPTY_FEED);
const ids = (items: { id: string }[]) => items.map((item) => item.id);

describe("withPacket", () => {
  it("adds messages and captions once each, and blanks a message taken down", () => {
    const feed = feedOf(chat("m1"), chat("m2"), chat("m1"), deletion("m1"), caption("c1"));

    expect(ids(feed.messages)).toEqual(["m1", "m2"]);
    expect(feed.messages[0]).toMatchObject({ content: "", isDeleted: true });
    expect(feed.deletedIds).toEqual(["m1"]);
    expect(ids(feed.captions)).toEqual(["c1"]);
  });

  it("keeps only the last three captions", () => {
    expect(ids(feedOf(caption("1"), caption("2"), caption("3"), caption("4")).captions)).toEqual(["2", "3", "4"]);
  });

  it("ignores packets of other topics and packets that do not parse", () => {
    expect(feedOf({ topic: "other", payload: encode({ id: "x" }) }, { topic: CHAT_TOPIC, payload: encode("hola") })).toEqual(
      EMPTY_FEED,
    );
  });
});

describe("withHistory", () => {
  it("puts what was said before the viewer arrived ahead of what they saw live", () => {
    const live = feedOf(chat("m3"));

    expect(ids(withHistory(live, [chat("m1"), chat("m2"), chat("m3")]).messages)).toEqual(["m1", "m2", "m3"]);
    expect(ids(withHistory(live, [chat("m1")]).messages)).toEqual(["m1", "m3"]);
  });

  it("fills what was missed while away without moving what was already shown", () => {
    const seen = feedOf(chat("m1"), chat("m2"));

    expect(ids(withHistory(seen, [chat("m1"), chat("m2"), chat("m3"), chat("m4")]).messages)).toEqual([
      "m1",
      "m2",
      "m3",
      "m4",
    ]);
  });

  it("keeps down a message taken down live even when the replay was read before", () => {
    const live = feedOf(deletion("m1"));

    expect(withHistory(live, [chat("m1")]).messages[0]).toMatchObject({ id: "m1", isDeleted: true });
  });

  it("applies the takedowns the replay holds", () => {
    expect(withHistory(EMPTY_FEED, [chat("m1"), deletion("m1")]).messages[0]).toMatchObject({ isDeleted: true });
  });

  it("merges captions the same way and keeps the last three", () => {
    const merged = withHistory(feedOf(caption("c4")), [caption("c1"), caption("c2"), caption("c3")]);

    expect(ids(merged.captions)).toEqual(["c2", "c3", "c4"]);
  });
});

describe("parseFeedPackets", () => {
  it("reads the replay into packets the room parsers understand", () => {
    const [packet] = parseFeedPackets({ packets: [{ topic: CHAT_TOPIC, payload: { id: "m1" } }] });

    expect(packet.topic).toBe(CHAT_TOPIC);
    expect(JSON.parse(new TextDecoder().decode(packet.payload))).toEqual({ id: "m1" });
  });

  it.each([null, "texto", {}, { packets: "no" }])("reads %j as an empty replay", (body) => {
    expect(parseFeedPackets(body)).toEqual([]);
  });

  it("leaves out entries that are not packets", () => {
    expect(parseFeedPackets({ packets: [null, 3, { payload: {} }, { topic: CHAT_TOPIC, payload: {} }] })).toHaveLength(1);
  });
});
