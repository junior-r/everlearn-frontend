import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { toneSoft, type Tone } from "@/shared/lib/tone";

/** The row of summary cards at the top of a dashboard; a definition list of figures. */
export function StatGrid({ label, children }: { label: string; children: ReactNode }) {
  return (
    <dl aria-label={label} className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-4">
      {children}
    </dl>
  );
}

interface StatCardProps {
  label: string;
  /** The figure, already formatted for the locale. */
  value: string;
  /** A line of context under the figure. */
  hint?: string;
  icon: Icon;
  tone: Tone;
}

/** One figure of a dashboard: a big number, what it counts, and an icon in the tone that stands for it. */
export function StatCard({ label, value, hint, icon: StatIcon, tone }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card">
      <span aria-hidden className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", toneSoft[tone])}>
        <StatIcon weight="duotone" className="size-6" />
      </span>
      <div className="min-w-0">
        <dt className="text-sm leading-snug text-muted">{label}</dt>
        <dd className="font-display text-3xl leading-tight font-semibold tracking-tight tabular-nums">{value}</dd>
        {hint && <dd className="mt-0.5 text-xs text-muted">{hint}</dd>}
      </div>
    </div>
  );
}
