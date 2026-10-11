import { DisconnectReason } from "livekit-client";
import { describe, expect, it } from "vitest";
import { closureFor, gridColumns } from "./room-state";

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
