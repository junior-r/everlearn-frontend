import { describe, expect, it } from "vitest";
import { compile } from "./expression";

/** The value of an expression that must compile. */
function value(source: string, scope: Record<string, number> = {}, angle: "rad" | "deg" = "rad"): number {
  const compiled = compile(source);
  if (!compiled.ok) {
    throw new Error(`${source} did not compile: ${compiled.error.code}`);
  }
  return compiled.expression.evaluate(scope, angle);
}

describe("compile", () => {
  it("follows the usual order of operations", () => {
    expect(value("1 + 2 * 3")).toBe(7);
    expect(value("(1 + 2) * 3")).toBe(9);
    expect(value("2^3^2")).toBe(512);
    expect(value("-2^2")).toBe(-4);
    expect(value("2^-1")).toBe(0.5);
    expect(value("10 / 4 - 1")).toBe(1.5);
  });

  it("multiplies without a sign the way it is written on paper", () => {
    expect(value("2x", { x: 3 })).toBe(6);
    expect(value("2x^2", { x: 3 })).toBe(18);
    expect(value("3(x + 1)", { x: 1 })).toBe(6);
    expect(value("(x + 1)(x - 1)", { x: 3 })).toBe(8);
    expect(value("2 pi")).toBeCloseTo(2 * Math.PI);
  });

  it("knows the functions and constants of a scientific calculator", () => {
    expect(value("sqrt(16) + abs(-2)")).toBe(6);
    expect(value("ln(e)")).toBe(1);
    expect(value("log(1000)")).toBeCloseTo(3);
    expect(value("5!")).toBe(120);
    expect(value("sin(pi / 2)")).toBeCloseTo(1);
  });

  it("reads the symbols of a keypad and a decimal comma", () => {
    expect(value("2 × 3 ÷ 4")).toBe(1.5);
    expect(value("√(9) + π")).toBeCloseTo(3 + Math.PI);
    expect(value("1,5 + 0.5")).toBe(2);
    expect(value("1.5e3")).toBe(1500);
  });

  it("works in degrees when asked, both ways", () => {
    expect(value("sin(30)", {}, "deg")).toBeCloseTo(0.5);
    expect(value("asin(1)", {}, "deg")).toBeCloseTo(90);
    expect(value("sin(30)", {}, "rad")).toBeCloseTo(Math.sin(30));
  });

  it("gives NaN where the expression is undefined, instead of failing", () => {
    expect(value("1 / 0")).toBeNaN();
    expect(value("sqrt(-1)")).toBeNaN();
    expect(value("2.5!")).toBeNaN();
    expect(value("x + 1")).toBeNaN();
  });

  it("lists the variables, leaving out constants and functions", () => {
    const compiled = compile("v * t + d0 - sin(pi t)");
    expect(compiled.ok && compiled.expression.variables).toEqual(["v", "t", "d0"]);
  });

  it("reports what is wrong without throwing", () => {
    expect(compile("")).toEqual({ ok: false, error: { code: "empty" } });
    expect(compile("2 +")).toEqual({ ok: false, error: { code: "syntax" } });
    expect(compile("(1 + 2")).toEqual({ ok: false, error: { code: "syntax" } });
    expect(compile("sin x")).toEqual({ ok: false, error: { code: "syntax" } });
    expect(compile("2 $ 3")).toEqual({ ok: false, error: { code: "syntax" } });
    expect(compile("y + 1", ["x"])).toEqual({ ok: false, error: { code: "unknownName", name: "y" } });
    expect(compile("1+".repeat(300))).toEqual({ ok: false, error: { code: "tooLong" } });
    expect(compile("(".repeat(100) + "1" + ")".repeat(100))).toEqual({ ok: false, error: { code: "tooLong" } });
  });

  it("never runs what it is given as code", () => {
    expect(compile("toString").ok).toBe(true);
    expect(value("constructor")).toBeNaN();
    expect(value("toString + 1")).toBeNaN();
    expect(value("constructor(1)")).toBeNaN();
    expect(value("alert(1)")).toBeNaN();
  });
});
