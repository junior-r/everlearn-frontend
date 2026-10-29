"use client";

import { useDictionary } from "@/shared/i18n";

/** Tells everyone in the class, the Students first, that it is being recorded. */
export function RecordingBadge() {
  const text = useDictionary().classroom.recording;
  return (
    <p
      role="status"
      title={text.liveNotice}
      className="flex items-center gap-1.5 rounded-full bg-coral-soft px-2.5 py-0.5 text-xs font-semibold text-coral-ink"
    >
      <span aria-hidden className="size-2 animate-pulse rounded-full bg-coral" />
      {text.live}
      <span className="sr-only">. {text.liveNotice}</span>
    </p>
  );
}
