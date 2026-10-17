import { describe, expect, it } from "vitest";
import { nextRun, runOf, stoppedRun } from "./state-fields";

describe("runs of a simulation", () => {
  it("never reuses a number, whether played or stopped", () => {
    const seen = new Set<number>();
    let run = 0;
    for (const step of [nextRun, stoppedRun, nextRun, nextRun, stoppedRun, nextRun]) {
      run = step(run);
      expect(seen.has(run)).toBe(false);
      seen.add(run);
    }
  });

  it("plays above zero and waits at zero or below", () => {
    expect(nextRun(-3)).toBeGreaterThan(0);
    expect(stoppedRun(3)).toBeLessThan(0);
    expect(runOf(-4)).toBe(-4);
    expect(runOf("1")).toBe(0);
  });
});
