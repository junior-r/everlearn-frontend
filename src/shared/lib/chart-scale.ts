/**
 * How long each bar of a chart is, as a percentage of the track. The scale
 * runs from 0 to `max`, or to the largest value when no maximum is given, so
 * bars are comparable with each other and never overflow.
 */
export function barLengths(values: readonly number[], max?: number): number[] {
  const top = max ?? Math.max(0, ...values);
  if (top <= 0) {
    return values.map(() => 0);
  }
  return values.map((value) => Math.min(100, Math.max(0, (value / top) * 100)));
}
