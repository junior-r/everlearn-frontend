import { describe, expect, it } from "vitest";
import { handQueue, type HandHolder } from "./hand-queue";

const holder = (identity: string, hand?: string, name = identity.toUpperCase()): HandHolder => ({
  identity,
  name,
  attributes: hand === undefined ? { role: "STUDENT" } : { role: "STUDENT", hand },
});

describe("handQueue", () => {
  it("lists only raised hands, earliest first, numbered from 1", () => {
    const queue = handQueue([
      holder("carla", "2026-10-12T08:05:00.000Z"),
      holder("ana"),
      holder("beto", "2026-10-12T08:03:00.000Z"),
      holder("dani", ""),
    ]);

    expect(queue.map(({ identity, position }) => [identity, position])).toEqual([
      ["beto", 1],
      ["carla", 2],
    ]);
    expect(queue[0]).toMatchObject({ name: "BETO", raisedAt: Date.parse("2026-10-12T08:03:00.000Z") });
  });

  it("orders hands raised within the same second by their milliseconds", () => {
    const queue = handQueue([holder("late", "2026-10-12T08:03:00.900Z"), holder("early", "2026-10-12T08:03:00.100Z")]);

    expect(queue.map((hand) => hand.identity)).toEqual(["early", "late"]);
  });

  it("reads the older second-precision values the video-server sent before", () => {
    const queue = handQueue([holder("b", "2026-10-12T08:04:00Z"), holder("a", "2026-10-12T08:03:00.500Z")]);

    expect(queue.map((hand) => hand.identity)).toEqual(["a", "b"]);
  });

  it("breaks exact ties by identity, so every viewer sees the same order", () => {
    const same = "2026-10-12T08:03:00.000Z";

    expect(handQueue([holder("zoe", same), holder("ana", same)]).map((hand) => hand.identity)).toEqual(["ana", "zoe"]);
    expect(handQueue([holder("ana", same), holder("zoe", same)]).map((hand) => hand.identity)).toEqual(["ana", "zoe"]);
  });

  it("puts a hand whose time cannot be read at the end, with no time", () => {
    const queue = handQueue([holder("odd", "not-a-time"), holder("ok", "2026-10-12T08:03:00.000Z")]);

    expect(queue.map(({ identity, raisedAt }) => [identity, raisedAt])).toEqual([
      ["ok", Date.parse("2026-10-12T08:03:00.000Z")],
      ["odd", null],
    ]);
  });

  it("is empty when no hand is up", () => {
    expect(handQueue([holder("ana"), holder("beto")])).toEqual([]);
  });
});
