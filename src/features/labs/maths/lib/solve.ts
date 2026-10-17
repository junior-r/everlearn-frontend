import { compile, type Expression, type ExpressionError } from "@/shared/lib/expression";

export interface Equation {
  /** Every variable on either side, in order of appearance. */
  variables: string[];
  /** Left side minus right side: zero where the equation holds. */
  residual(scope: Record<string, number>): number;
}

export type ParsedEquation =
  | { ok: true; equation: Equation }
  | { ok: false; error: ExpressionError | { code: "noEquals" } };

/** Reads "left = right"; a single expression is read as "expression = 0". */
export function parseEquation(source: string): ParsedEquation {
  const sides = source.split("=");
  if (sides.length > 2) {
    return { ok: false, error: { code: "noEquals" } };
  }
  const compiled = sides.map((side) => compile(side));
  const failed = compiled.find((side) => !side.ok);
  if (failed && !failed.ok) {
    return { ok: false, error: failed.error };
  }
  const [left, right] = compiled.map((side) => (side.ok ? side.expression : null)) as [Expression, Expression | undefined];
  const variables = [...new Set([...left.variables, ...(right?.variables ?? [])])];
  return {
    ok: true,
    equation: {
      variables,
      residual: (scope) => left.evaluate(scope) - (right ? right.evaluate(scope) : 0),
    },
  };
}

const MAX_ROOTS = 4;
const TOLERANCE = 1e-10;

function bisect(f: (u: number) => number, low: number, high: number): number {
  let a = low;
  let b = high;
  let fa = f(a);
  for (let step = 0; step < 200; step += 1) {
    const middle = (a + b) / 2;
    const fm = f(middle);
    if (fm === 0 || (b - a) / 2 < TOLERANCE * Math.max(1, Math.abs(middle))) {
      return middle;
    }
    if (Math.sign(fm) === Math.sign(fa)) {
      a = middle;
      fa = fm;
    } else {
      b = middle;
    }
  }
  return (a + b) / 2;
}

/** Where to look for a sign change: dense near zero, then wider and wider on both sides. */
function searchGrid(): number[] {
  const positive: number[] = [];
  for (let value = 1e-6; value <= 1e7; value *= 1.08) {
    positive.push(value);
  }
  return [...positive.map((value) => -value).reverse(), 0, ...positive];
}
const GRID = searchGrid();

const tidy = (value: number) => {
  const rounded = Number(value.toPrecision(10));
  return Object.is(rounded, -0) ? 0 : rounded;
};

/**
 * Solves the equation for one variable, the others being known. Returns the
 * real solutions found between -10⁷ and 10⁷ (at most four), smallest first;
 * none when there is no solution in that range.
 */
export function solveFor(equation: Equation, unknown: string, known: Record<string, number>): number[] {
  const f = (u: number) => equation.residual({ ...known, [unknown]: u });
  const roots: number[] = [];
  const add = (root: number) => {
    const scale = Math.max(1, Math.abs(root));
    // A sign change across an asymptote (1/x at 0) is not a solution
    if (Math.abs(f(root)) > 1e-6 * scale) {
      return;
    }
    if (!roots.some((existing) => Math.abs(existing - root) < 1e-7 * scale)) {
      roots.push(tidy(root));
    }
  };
  let previous = GRID[0];
  let fPrevious = f(previous);
  for (const point of GRID.slice(1)) {
    if (roots.length >= MAX_ROOTS) {
      break;
    }
    const value = f(point);
    if (value === 0) {
      add(point);
    } else if (Number.isFinite(value) && Number.isFinite(fPrevious) && Math.sign(value) !== Math.sign(fPrevious) && fPrevious !== 0) {
      add(bisect(f, previous, point));
    }
    previous = point;
    fPrevious = value;
  }
  return roots.sort((left, right) => left - right);
}
