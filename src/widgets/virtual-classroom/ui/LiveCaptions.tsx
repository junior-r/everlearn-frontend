"use client";

import { useParticipants } from "@livekit/components-react";
import { ClosedCaptioningIcon } from "@phosphor-icons/react/dist/ssr";
import { useId } from "react";
import type { Caption } from "@/entities/class-session";
import { useDictionary } from "@/shared/i18n";

/** The latest things said in the class, as text. New captions are announced to screen readers. */
export function LiveCaptions({ captions }: { captions: Caption[] }) {
  const { classroom } = useDictionary();
  const text = classroom.captions;
  const headingId = useId();
  const participants = useParticipants();
  // The track event the caption comes from does not always carry the speaker's name; the room does
  const nameOf = (caption: Caption) =>
    caption.speakerName ||
    participants.find((participant) => participant.identity === caption.speakerId)?.name ||
    classroom.unnamed;
  return (
    <section aria-labelledby={headingId} className="rounded-2xl bg-ink-raised px-4 py-3">
      <h2 id={headingId} className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-on-ink/70 uppercase">
        <ClosedCaptioningIcon aria-hidden weight="fill" className="size-4" />
        {text.title}
      </h2>
      <div aria-live="polite" className="mt-1.5 flex min-h-10 flex-col justify-end gap-0.5 text-sm">
        {captions.length === 0 ? (
          <p className="text-on-ink/60">{text.empty}</p>
        ) : (
          captions.map((caption) => (
            <p key={caption.id}>
              <span className="font-semibold">{nameOf(caption)}: </span>
              {caption.text}
            </p>
          ))
        )}
      </div>
    </section>
  );
}
