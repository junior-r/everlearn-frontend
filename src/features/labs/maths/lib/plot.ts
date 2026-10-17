export interface Viewport {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Samples y = f(x) across the viewport into runs of points. A run ends where
 * the function is undefined or jumps across the whole window (an asymptote,
 * as in tan x or 1/x), so no line is drawn through the gap.
 */
export function samplePlot(evaluate: (x: number) => number, view: Viewport, columns = 240): Point[][] {
  const runs: Point[][] = [];
  let run: Point[] = [];
  const height = view.yMax - view.yMin;
  for (let column = 0; column <= columns; column += 1) {
    const x = view.xMin + ((view.xMax - view.xMin) * column) / columns;
    const y = evaluate(x);
    const previous = run[run.length - 1];
    const breaks = !Number.isFinite(y) || (previous !== undefined && Math.abs(y - previous.y) > height * 2);
    if (breaks) {
      if (run.length > 1) {
        runs.push(run);
      }
      run = Number.isFinite(y) ? [{ x, y }] : [];
      continue;
    }
    run.push({ x, y });
  }
  if (run.length > 1) {
    runs.push(run);
  }
  return runs;
}

/** Round numbers to mark an axis with, about `count` of them between min and max. */
export function ticks(min: number, max: number, count = 8): number[] {
  const span = max - min;
  if (!(span > 0) || !Number.isFinite(span)) {
    return [];
  }
  const rough = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= rough) ?? 10 * magnitude;
  const first = Math.ceil(min / step) * step;
  const values: number[] = [];
  for (let value = first; value <= max + step * 1e-9; value += step) {
    // Rounded to the step, so 0.30000000000000004 reads 0.3
    values.push(Number((Math.round(value / step) * step).toPrecision(12)));
  }
  return values;
}

/** The viewport zoomed around its centre: a factor below 1 zooms in. */
export function zoom(view: Viewport, factor: number): Viewport {
  const cx = (view.xMin + view.xMax) / 2;
  const cy = (view.yMin + view.yMax) / 2;
  const halfWidth = ((view.xMax - view.xMin) / 2) * factor;
  const halfHeight = ((view.yMax - view.yMin) / 2) * factor;
  return { xMin: cx - halfWidth, xMax: cx + halfWidth, yMin: cy - halfHeight, yMax: cy + halfHeight };
}
