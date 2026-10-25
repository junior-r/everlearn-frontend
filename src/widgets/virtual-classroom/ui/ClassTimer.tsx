"use client";

import { TimerIcon } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useState } from "react";
import { elapsedClock } from "@/entities/class-session";
import { useDictionary } from "@/shared/i18n";

/** How long the class has been going, from the start the backend gave every participant alike. */
export function ClassTimer({ startedAt }: { startedAt: string }) {
  const { classroom } = useDictionary();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <p
      role="timer"
      aria-label={classroom.timer}
      title={classroom.timer}
      className="flex items-center gap-1.5 rounded-full bg-on-ink/10 px-2.5 py-0.5 font-mono text-sm tabular-nums"
    >
      <TimerIcon aria-hidden weight="bold" className="size-4" />
      {elapsedClock(startedAt, now)}
    </p>
  );
}
