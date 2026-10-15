/** Readers for the fields of a lab state that came from elsewhere: the room, an address. */

export type Fields = Record<string, unknown>;

export const isFields = (value: unknown): value is Fields =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A finite number within [min, max], or the fallback. */
export function numberIn(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}

/** One of the allowed values, or the fallback. */
export function oneOf<Value extends string>(value: unknown, allowed: readonly Value[], fallback: Value): Value {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as Value) : fallback;
}

/** A string cut to `maxLength`, or the fallback. */
export function textOf(value: unknown, maxLength: number, fallback = ""): string {
  return typeof value === "string" ? value.slice(0, maxLength) : fallback;
}

/**
 * Which run of a simulation is shown: above 0 it plays, 0 or below it waits at
 * its start. A number is never used twice, so a new run never shows an old run's time.
 */
export const runOf = (value: unknown) => numberIn(value, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 0);

/** The run that plays next. */
export const nextRun = (run: number) => Math.abs(run) + 1;

/** Back at the start, waiting, under a number of its own. */
export const stoppedRun = (run: number) => -(Math.abs(run) + 1);
