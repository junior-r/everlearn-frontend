"use client";

import type { ReactNode } from "react";
import { useDictionary } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { Logo } from "./Logo";
import { Mosaic } from "./Mosaic";

interface CenteredCardProps {
  brand: string;
  wide?: boolean;
  children: ReactNode;
}

/**
 * Page shell of the auth, account and onboarding screens: the content in one
 * card, beside a brand panel that carries the mosaic on large screens.
 */
export function CenteredCard({ brand, wide = false, children }: CenteredCardProps) {
  const { common } = useDictionary();
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Sticky, so the panel stays whole while a long form scrolls beside it */}
      <aside className="hidden overflow-hidden bg-ink p-10 text-on-ink lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:justify-between xl:p-14">
        <Logo name={brand} variant="inverse" />
        <Mosaic seed="everlearn" columns={5} rows={5} animated className="mx-auto w-full max-w-[min(28rem,45dvh)]" />
        <div className="max-w-md">
          <p className="font-display text-3xl leading-tight font-semibold tracking-tight">
            {common.panelTitle}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-on-ink/70">{common.panelBody}</p>
        </div>
      </aside>
      <main className="flex flex-col items-center justify-center px-4 py-10 sm:py-12">
        <div className={cn("w-full animate-rise", wide ? "max-w-lg" : "max-w-sm")}>
          {/* The panel is hidden on small screens, so a strip of the mosaic keeps the identity there */}
          <Mosaic seed="everlearn" columns={8} rows={1} className="mb-5 lg:hidden" />
          {/* On large screens the logo lives in the panel, so the first heading needs no gap above it */}
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-8 lg:[&>h1]:mt-0">
            <div className="lg:hidden">
              <Logo name={brand} />
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

export function PageStatus({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <span aria-hidden className="flex gap-1.5">
        <span className="size-3 animate-bounce rounded-full bg-brand [animation-delay:-0.3s]" />
        <span className="size-3 animate-bounce rounded-full bg-sun [animation-delay:-0.15s]" />
        <span className="size-3 animate-bounce rounded-full bg-mint" />
      </span>
      <p role="status" className="text-sm text-muted">
        {children}
      </p>
    </main>
  );
}
