import { describe, expect, it } from "vitest";
import { decodeLabState, encodeLabState, parseShareableLabs, parseSharedLab } from "./shared-lab";

describe("parseSharedLab", () => {
  it("reads the lab the video-server put in the room metadata", () => {
    const metadata = JSON.stringify({
      lab: { labKey: "gravity", state: { height: 20 }, sharedBy: "m-1", updatedAt: "2026-10-14T09:30:00Z" },
    });

    expect(parseSharedLab(metadata)).toEqual({ labKey: "gravity", state: { height: 20 }, sharedBy: "m-1" });
  });

  it("reads nothing shared from empty, cleared, foreign or broken metadata", () => {
    expect(parseSharedLab(undefined)).toBeNull();
    expect(parseSharedLab("")).toBeNull();
    expect(parseSharedLab('{"lab":null}')).toBeNull();
    expect(parseSharedLab("not json")).toBeNull();
    expect(parseSharedLab('{"lab":{"labKey":"alchemy","state":{},"sharedBy":"m"}}')).toBeNull();
    expect(parseSharedLab('{"lab":{"labKey":"gravity","state":[1],"sharedBy":"m"}}')).toBeNull();
  });
});

describe("parseShareableLabs", () => {
  it("keeps the known keys of the token attribute", () => {
    expect(parseShareableLabs("gravity, alchemy,,completions")).toEqual(["gravity", "completions"]);
    expect(parseShareableLabs(undefined)).toEqual([]);
  });
});

describe("lab state in an address", () => {
  it("survives the round trip, accents included, and refuses anything else", () => {
    const state = { expression: "x^2", note: "función" };

    const encoded = encodeLabState(state);

    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeLabState(encoded)).toEqual(state);
    expect(decodeLabState(null)).toBeNull();
    expect(decodeLabState("%%%")).toBeNull();
    expect(decodeLabState(encodeLabState([1, 2]))).toBeNull();
  });
});
