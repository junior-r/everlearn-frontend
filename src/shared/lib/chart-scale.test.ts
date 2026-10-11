import { describe, expect, it } from "vitest";
import { barLengths } from "./chart-scale";

describe("barLengths", () => {
  it("scales to the largest value when no maximum is given", () => {
    expect(barLengths([50, 200, 100])).toEqual([25, 100, 50]);
  });

  it("scales to a fixed maximum, so percentages keep their meaning", () => {
    expect(barLengths([75, 100, 0], 100)).toEqual([75, 100, 0]);
  });

  it("draws nothing when every value is zero, or there are none", () => {
    expect(barLengths([0, 0])).toEqual([0, 0]);
    expect(barLengths([])).toEqual([]);
    expect(barLengths([5], 0)).toEqual([0]);
  });

  it("never draws outside the track", () => {
    expect(barLengths([150, -20], 100)).toEqual([100, 0]);
  });
});
