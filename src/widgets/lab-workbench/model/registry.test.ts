import { describe, expect, it } from "vitest";
import { LAB_KEYS } from "@/entities/lab";
import { LAB_RUNNERS } from "./registry";

describe("the lab registry", () => {
  it("has a lab for every key of the catalogue", () => {
    for (const key of LAB_KEYS) {
      expect(LAB_RUNNERS[key].key).toBe(key);
    }
  });

  it("reads back every starting state as it is, after a trip through JSON (the room, an address)", () => {
    for (const key of LAB_KEYS) {
      const runner = LAB_RUNNERS[key];
      const initial = runner.initial();
      expect(runner.parse(JSON.parse(JSON.stringify(initial)))).toEqual(initial);
    }
  });

  it("turns anything else into a usable state instead of failing", () => {
    for (const key of LAB_KEYS) {
      const runner = LAB_RUNNERS[key];
      for (const garbage of [null, 42, "x", [], { height: "high", bodies: "earth", functions: 3, history: {} }]) {
        expect(() => runner.parse(garbage)).not.toThrow();
        expect(typeof runner.parse(garbage)).toBe("object");
      }
    }
  });

  it("keeps values in range", () => {
    expect(LAB_RUNNERS.gravity.parse({ height: 5000, bodies: ["pluto", "mars"], run: -3 })).toEqual({
      height: 20,
      bodies: ["earth", "mars"],
      run: 0,
    });
    expect(LAB_RUNNERS.forces.parse({ mass: 0, force: 100, friction: 2, angle: 30, run: 2 })).toEqual({
      mass: 10,
      force: 100,
      friction: 0.3,
      angle: 30,
      run: 2,
    });
  });

  it("keeps only up to three functions, and a valid window", () => {
    const state = LAB_RUNNERS["function-grapher"].parse({
      functions: ["x", "x^2", "x^3", "x^4"],
      view: { xMin: 5, xMax: -5, yMin: 0, yMax: 1 },
      probe: 99,
    }) as { functions: string[]; view: { xMin: number }; probe: number };
    expect(state.functions).toEqual(["x", "x^2", "x^3"]);
    expect(state.view.xMin).toBe(-10);
    expect(state.probe).toBe(0);
  });

  it("never lets a language state show answers without an exercise", () => {
    expect(LAB_RUNNERS.completions.parse({ exercise: null, revealed: ["fuimos"] })).toEqual({
      exercise: null,
      revealed: null,
    });
    expect(
      LAB_RUNNERS.definitions.parse({ exercise: { id: "e1", prompt: "Signo sobre una vocal" }, revealed: ["tilde"] }),
    ).toEqual({ exercise: { id: "e1", prompt: "Signo sobre una vocal", hint: null }, revealed: ["tilde"] });
  });
});
