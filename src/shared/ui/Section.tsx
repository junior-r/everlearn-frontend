import type { ReactNode } from "react";
import { Mosaic } from "./Mosaic";

/** The heading card at the top of a page, with a strip of the mosaic of its own. */
export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="flex items-center justify-between gap-6 overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-1.5 max-w-[65ch] text-sm text-muted">{subtitle}</p>
      </div>
      {/* Seeded by the title, so each page has its own strip of tiles */}
      <Mosaic seed={title} columns={4} rows={2} className="hidden w-44 shrink-0 lg:grid" />
    </header>
  );
}

interface SectionProps {
  title: string;
  /** Frames the content as a card; for forms, which otherwise float on the page. */
  panel?: boolean;
  children: ReactNode;
}

/** Heading for a block inside a page. */
export function Section({ title, panel = false, children }: SectionProps) {
  return (
    <section aria-label={title} className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2.5 text-lg font-semibold">
        <span aria-hidden className="h-5 w-1.5 rounded-full bg-sun" />
        {title}
      </h2>
      {panel ? (
        <div className="max-w-xl rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">{children}</div>
      ) : (
        children
      )}
    </section>
  );
}
