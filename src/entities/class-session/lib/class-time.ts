const pad = (value: number) => String(value).padStart(2, "0");

/** Time since a class started as a running clock: `4:07`, then `1:04:07` past the hour. Never negative. */
export function elapsedClock(startedAt: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  const rest = `${pad(seconds % 60)}`;
  return hours > 0 ? `${hours}:${pad(minutes)}:${rest}` : `${minutes}:${rest}`;
}

/** Whole minutes a class lasted, rounded; null while it has no end. */
export function lastedMinutes(startsAt: string, endedAt: string | null): number | null {
  if (endedAt === null) {
    return null;
  }
  return Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(startsAt)) / 60_000));
}
