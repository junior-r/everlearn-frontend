"use client";

import { CaretDownIcon, HandIcon } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useId, useRef, useState } from "react";
import type { RaisedHand } from "@/entities/class-session";
import { format, useDictionary, useLocale } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { timeAgo } from "@/shared/lib/time-ago";
import { Button } from "@/shared/ui";
import type { Moderation } from "./ParticipantTile";

// How often the "2 minutes ago" of an open list is brought up to date
const TICK_MS = 30_000;

interface HandQueueProps {
  /** The raised hands, in the order they went up. */
  hands: RaisedHand[];
  localIdentity: string;
  /** Null unless the viewer is the Teacher of the class. */
  moderation: Moderation | null;
}

/**
 * How many hands are up, said aloud when it changes, and the list of them in
 * the order they went up, so the Teacher can give the floor in turn.
 */
export function HandQueue({ hands, localIdentity, moderation }: HandQueueProps) {
  const { classroom } = useDictionary();
  const text = classroom.handsQueue;
  const locale = useLocale();
  const panelId = useId();
  const container = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [, setTick] = useState(0);
  const count = hands.length;
  // The list puts itself away when the last hand goes down
  const isShown = isOpen && count > 0;
  const summary =
    count === 1 ? classroom.handsRaisedOne : format(classroom.handsRaisedMany, { count: String(count) });

  // A click anywhere else, or Escape, puts the list away
  useEffect(() => {
    if (!isShown) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    const timer = setInterval(() => setTick((tick) => tick + 1), TICK_MS);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      clearInterval(timer);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isShown]);

  const nameOf = (hand: RaisedHand) => {
    const name = hand.name || classroom.unnamed;
    return hand.identity === localIdentity ? format(classroom.you, { name }) : name;
  };

  return (
    <div ref={container} className="relative">
      <p role="status" className="sr-only">
        {count > 0 ? summary : ""}
      </p>
      {count > 0 && (
        <button
          type="button"
          aria-expanded={isShown}
          aria-controls={isShown ? panelId : undefined}
          onClick={() => setIsOpen((current) => !current)}
          className="flex items-center gap-1 rounded-full bg-sun-soft px-2.5 py-0.5 text-xs font-medium text-sun-ink transition hover:bg-sun focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun"
        >
          <HandIcon aria-hidden weight="fill" className="size-3.5" />
          {summary}
          <CaretDownIcon aria-hidden weight="bold" className={cn("size-3 transition-transform", isShown && "rotate-180")} />
        </button>
      )}
      {isShown && (
        <section
          id={panelId}
          aria-label={text.title}
          className="absolute top-full right-0 z-50 mt-2 flex max-h-[min(24rem,60dvh)] w-[min(20rem,calc(100vw-2rem))] animate-rise flex-col overflow-hidden rounded-2xl border border-line bg-surface text-foreground shadow-card"
        >
          <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold">{text.title}</h2>
            {moderation && count > 1 && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => hands.forEach((hand) => moderation.lowerHand(hand.identity))}
              >
                {text.lowerAll}
              </Button>
            )}
          </header>
          <ol className="flex flex-col gap-1 overflow-y-auto p-2">
            {hands.map((hand) => {
              const name = nameOf(hand);
              return (
                <li key={hand.identity} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
                  <span
                    aria-hidden
                    className="grid size-7 shrink-0 place-items-center rounded-full bg-sun text-xs font-bold text-ink"
                  >
                    {hand.position}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{name}</span>
                    {hand.raisedAt !== null && (
                      <span className="block text-xs text-muted">
                        {timeAgo(new Date(hand.raisedAt).toISOString(), locale)}
                      </span>
                    )}
                  </span>
                  {moderation && hand.identity !== localIdentity && (
                    <Button
                      size="sm"
                      variant="secondary"
                      aria-label={format(classroom.tile.lowerHand, { name })}
                      onClick={() => moderation.lowerHand(hand.identity)}
                    >
                      {text.lower}
                    </Button>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
