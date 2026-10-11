import { useId, type ReactNode } from "react";
import { barLengths } from "@/shared/lib/chart-scale";
import { cn } from "@/shared/lib/cn";
import { toneSolid, type Tone } from "@/shared/lib/tone";

export interface ChartBar {
  label: string;
  value: number;
  /** The value as the reader should see it, already formatted for the locale. */
  display: string;
  tone: Tone;
}

interface ChartProps {
  title: string;
  /** One line under the title saying what is counted. */
  hint?: string;
  bars: ChartBar[];
  /** The top of the scale, for values with a natural one (a percentage); the largest bar otherwise. */
  max?: number;
  /** Shown instead of the bars while there is nothing to draw. */
  emptyText: string;
}

interface FrameProps extends Pick<ChartProps, "title" | "hint" | "emptyText"> {
  isEmpty: boolean;
  children(labelId: string): ReactNode;
}

/** The card every chart sits in: its title, what it counts, and the empty state. */
function ChartFrame({ title, hint, emptyText, isEmpty, children }: FrameProps) {
  const labelId = useId();
  return (
    <figure className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card">
      <figcaption>
        <p id={labelId} className="font-semibold">
          {title}
        </p>
        {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      </figcaption>
      {isEmpty ? <p className="text-sm text-muted">{emptyText}</p> : children(labelId)}
    </figure>
  );
}

const hasNothing = (bars: ChartBar[]) => bars.every((bar) => bar.value <= 0);

/**
 * Horizontal bars, for comparing a handful of named things. It is a list with
 * every value written out, so it reads the same without the colours or the bars.
 */
export function BarChart({ bars, max, ...frame }: ChartProps) {
  const lengths = barLengths(
    bars.map((bar) => bar.value),
    max,
  );
  return (
    <ChartFrame {...frame} isEmpty={hasNothing(bars)}>
      {(labelId) => (
        <ul aria-labelledby={labelId} className="flex flex-col gap-3">
          {bars.map((bar, index) => (
            <li key={bar.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1.5 text-sm">
              <span className="truncate" title={bar.label}>
                {bar.label}
              </span>
              <span className="font-mono font-semibold tabular-nums">{bar.display}</span>
              <span aria-hidden className="col-span-2 h-2.5 overflow-hidden rounded-full bg-surface-muted">
                <span
                  className={cn("block h-full rounded-full transition-[width] duration-500", toneSolid[bar.tone])}
                  style={{ width: `${lengths[index]}%` }}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </ChartFrame>
  );
}

/** Vertical columns, for a distribution along a scale (ranges of grades). Same list semantics as `BarChart`. */
export function ColumnChart({ bars, max, ...frame }: ChartProps) {
  const lengths = barLengths(
    bars.map((bar) => bar.value),
    max,
  );
  return (
    <ChartFrame {...frame} isEmpty={hasNothing(bars)}>
      {(labelId) => (
        <ul aria-labelledby={labelId} className="flex h-52 items-stretch gap-2 sm:gap-4">
          {bars.map((bar, index) => (
            <li key={bar.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
              <span className="font-mono text-sm font-semibold tabular-nums">{bar.display}</span>
              <span aria-hidden className="flex w-full flex-1 items-end overflow-hidden rounded-xl bg-surface-muted">
                <span
                  className={cn("block w-full rounded-xl transition-[height] duration-500", toneSolid[bar.tone])}
                  style={{ height: `${lengths[index]}%` }}
                />
              </span>
              <span className="w-full truncate text-xs text-muted">{bar.label}</span>
            </li>
          ))}
        </ul>
      )}
    </ChartFrame>
  );
}
