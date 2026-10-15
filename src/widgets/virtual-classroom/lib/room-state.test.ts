import { DisconnectReason } from "livekit-client";
import { describe, expect, it } from "vitest";
import { closureFor, gridColumns, stageKey, startedScreen, unreadCount } from "./room-state";

describe("closureFor", () => {
  it("says nothing when the viewer left on purpose", () => {
    expect(closureFor(DisconnectReason.CLIENT_INITIATED)).toBeNull();
  });

  it.each([
    [DisconnectReason.DUPLICATE_IDENTITY, "duplicate"],
    [DisconnectReason.ROOM_DELETED, "ended"],
    [DisconnectReason.ROOM_CLOSED, "ended"],
    [DisconnectReason.JOIN_FAILURE, "failed"],
    [DisconnectReason.SERVER_SHUTDOWN, "lost"],
    [DisconnectReason.UNKNOWN_REASON, "lost"],
    [undefined, "lost"],
  ])("explains reason %s as %s", (reason, closure) => {
    expect(closureFor(reason)).toBe(closure);
  });
});

describe("gridColumns", () => {
  it("gives one participant the whole stage and adds columns as the class grows", () => {
    expect(gridColumns(0)).toBe("grid-cols-1");
    expect(gridColumns(1)).toBe("grid-cols-1");
    expect(gridColumns(2)).toBe(gridColumns(4));
    expect(gridColumns(5)).toBe(gridColumns(9));
    expect(gridColumns(10)).toBe(gridColumns(40));
    expect(new Set([1, 2, 5, 10].map(gridColumns)).size).toBe(4);
  });
});

describe("stageKey", () => {
  const tiles = ["alan:camera", "grace:camera", "alan:screen_share"];
  const screens = ["alan:screen_share"];

  it("puts a shared screen on the stage until the viewer chooses", () => {
    expect(stageKey(tiles, screens, undefined)).toBe("alan:screen_share");
    expect(stageKey(["alan:camera", "grace:camera"], [], undefined)).toBeNull();
  });

  it("lets the viewer's pin win over a shared screen", () => {
    expect(stageKey(tiles, screens, "grace:camera")).toBe("grace:camera");
  });

  it("keeps the grid when the viewer took everything off the stage", () => {
    expect(stageKey(tiles, screens, null)).toBeNull();
  });

  it("forgets a pin whose tile is gone", () => {
    expect(stageKey(tiles, screens, "ada:camera")).toBe("alan:screen_share");
    expect(stageKey(["alan:camera"], [], "ada:camera")).toBeNull();
  });
});

describe("startedScreen", () => {
  it("names the screen that was not there before", () => {
    expect(startedScreen([], ["alan:screen_share"])).toBe("alan:screen_share");
    expect(startedScreen(["alan:screen_share"], ["alan:screen_share", "grace:screen_share"])).toBe(
      "grace:screen_share",
    );
  });

  it("says nothing while the same screens go on, or when one stops", () => {
    expect(startedScreen(["alan:screen_share"], ["alan:screen_share"])).toBeNull();
    expect(startedScreen(["alan:screen_share"], [])).toBeNull();
  });
});

describe("unreadCount", () => {
  it("counts what arrived since the chat was closed, and nothing while it is open", () => {
    expect(unreadCount(7, 4, false)).toBe(3);
    expect(unreadCount(7, 4, true)).toBe(0);
  });

  it("never goes below zero when old messages were dropped", () => {
    expect(unreadCount(300, 320, false)).toBe(0);
  });
});
