import { describe, expect, it } from "vitest";
import { samplePlot, ticks, zoom } from "./plot";
import { parseEquation, solveFor } from "./solve";

const view = { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };

describe("samplePlot", () => {
  it("draws a continuous function as one run, edge to edge", () => {
    const runs = samplePlot((x) => x * x, view, 100);
    expect(runs).toHaveLength(1);
    expect(runs[0][0]).toEqual({ x: -5, y: 25 });
    expect(runs[0].at(-1)).toEqual({ x: 5, y: 25 });
  });

  it("breaks the line at an asymptote and where the function is undefined", () => {
    expect(samplePlot((x) => 1 / x, view, 101)).toHaveLength(2);
    expect(samplePlot((x) => Math.sqrt(x), view, 100)).toHaveLength(1);
    expect(samplePlot((x) => Math.sqrt(x), view, 100)[0][0].x).toBe(0);
    expect(samplePlot(() => Number.NaN, view)).toEqual([]);
  });
});

describe("axes", () => {
  it("marks round numbers", () => {
    expect(ticks(-5, 5, 10)).toEqual([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]);
    expect(ticks(-5, 5)).toEqual([-4, -2, 0, 2, 4]);
    expect(ticks(0, 1, 5)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
    expect(ticks(3, 3)).toEqual([]);
  });

  it("zooms around the centre", () => {
    expect(zoom(view, 0.5)).toEqual({ xMin: -2.5, xMax: 2.5, yMin: -2.5, yMax: 2.5 });
  });
});

describe("solving for a variable", () => {
  const solve = (source: string, unknown: string, known: Record<string, number>) => {
    const parsed = parseEquation(source);
    if (!parsed.ok) {
      throw new Error(parsed.error.code);
    }
    return solveFor(parsed.equation, unknown, known);
  };

  it("finds the unknown of a formula, whichever it is", () => {
    expect(solve("v = d / t", "v", { d: 100, t: 20 })).toEqual([5]);
    expect(solve("v = d / t", "t", { v: 5, d: 100 })).toEqual([20]);
    expect(solve("F = m a", "a", { F: 30, m: 6 })).toEqual([5]);
  });

  it("gives every solution of an equation with more than one", () => {
    expect(solve("c^2 = a^2 + b^2", "c", { a: 3, b: 4 })).toEqual([-5, 5]);
    expect(solve("x^2 - 5x + 6", "x", {})).toEqual([2, 3]);
  });

  it("finds none when there is none, and is not fooled by an asymptote", () => {
    expect(solve("x^2 + 1 = 0", "x", {})).toEqual([]);
    expect(solve("1 / x = 0", "x", {})).toEqual([]);
  });

  it("lists the variables and refuses what is not an equation", () => {
    const parsed = parseEquation("E = m g h");
    expect(parsed.ok && parsed.equation.variables).toEqual(["E", "m", "g", "h"]);
    expect(parseEquation("a = b = c")).toEqual({ ok: false, error: { code: "noEquals" } });
    expect(parseEquation("a = ")).toEqual({ ok: false, error: { code: "empty" } });
  });
});
