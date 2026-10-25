import { describe, expect, it } from "vitest";
import { elapsedClock, lastedMinutes } from "./class-time";

const start = "2026-10-12T08:00:00.000Z";
const after = (seconds: number) => Date.parse(start) + seconds * 1000;

describe("elapsedClock", () => {
  it("counts minutes and seconds, then hours past the first one", () => {
    expect(elapsedClock(start, after(0))).toBe("0:00");
    expect(elapsedClock(start, after(247.9))).toBe("4:07");
    expect(elapsedClock(start, after(3600 + 247))).toBe("1:04:07");
  });

  it("never runs backwards when this computer's clock is a little behind", () => {
    expect(elapsedClock(start, after(-5))).toBe("0:00");
  });
});

describe("lastedMinutes", () => {
  it("rounds how long a class lasted to whole minutes", () => {
    expect(lastedMinutes(start, "2026-10-12T08:44:31.000Z")).toBe(45);
  });

  it("has no length while the class has no end", () => {
    expect(lastedMinutes(start, null)).toBeNull();
  });
});
