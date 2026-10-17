import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export interface Reading {
  label: string;
  /** Already formatted, with its unit. */
  value: string;
}

interface LabStageProps {
  /** What the lab shows; decoration only, every value it draws is also among the readings. */
  visual: ReactNode;
  /** Name of the drawing, for those who cannot see it. */
  visualLabel: string;
  controls: ReactNode;
  readings: Reading[];
  readingsLabel: string;
  /** Buttons under the controls (run, reset). */
  actions?: ReactNode;
}

/**
 * The frame every simulation shares: controls on one side, the drawing on
 * the other, and what the lab computed as text below it.
 */
export function LabStage({ visual, visualLabel, controls, readings, readingsLabel, actions }: LabStageProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card">
        {controls}
        {actions && <div className="mt-auto flex flex-wrap gap-2 pt-2">{actions}</div>}
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <figure
          aria-label={visualLabel}
          className="relative overflow-hidden rounded-2xl border border-line bg-surface-muted"
        >
          {visual}
        </figure>
        <Readings label={readingsLabel} readings={readings} />
      </div>
    </div>
  );
}

/** What a lab computed, as a list of figures. */
export function Readings({ label, readings, className }: { label: string; readings: Reading[]; className?: string }) {
  return (
    <dl aria-label={label} className={cn("grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-2", className)}>
      {readings.map((reading) => (
        <div key={reading.label} className="rounded-xl border border-line bg-surface px-3 py-2">
          <dt className="text-xs text-muted">{reading.label}</dt>
          <dd className="font-mono text-base font-semibold tabular-nums">{reading.value}</dd>
        </div>
      ))}
    </dl>
  );
}
