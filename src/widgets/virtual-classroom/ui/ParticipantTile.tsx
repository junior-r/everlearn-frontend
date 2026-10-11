"use client";

import {
  isTrackReference,
  useIsSpeaking,
  useTrackMutedIndicator,
  VideoTrack,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { MicrophoneSlashIcon } from "@phosphor-icons/react/dist/ssr";
import { Track } from "livekit-client";
import { format, useDictionary } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { Avatar } from "@/shared/ui";

/** One participant on the stage: their camera, or their initials while it is off. */
export function ParticipantTile({ trackRef }: { trackRef: TrackReferenceOrPlaceholder }) {
  const { classroom } = useDictionary();
  const { participant } = trackRef;
  const isSpeaking = useIsSpeaking(participant);
  const camera = useTrackMutedIndicator(trackRef);
  const microphone = useTrackMutedIndicator({ participant, source: Track.Source.Microphone });
  const name = participant.name || classroom.unnamed;
  const label = participant.isLocal ? format(classroom.you, { name }) : name;
  const showsVideo = isTrackReference(trackRef) && !camera.isMuted;

  return (
    <li
      aria-label={microphone.isMuted ? `${label}, ${classroom.muted}` : label}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-ink-raised outline-2 outline-offset-2 transition-[outline-color] duration-150",
        isSpeaking ? "outline-mint" : "outline-transparent",
      )}
    >
      {showsVideo ? (
        <VideoTrack trackRef={trackRef} className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center">
          <Avatar name={name} size="md" />
          <span className="sr-only">{classroom.cameraOff}</span>
        </div>
      )}
      <p className="absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-full bg-ink/75 px-2.5 py-1 text-xs font-medium text-on-ink">
        {microphone.isMuted && <MicrophoneSlashIcon aria-hidden weight="fill" className="size-3.5 shrink-0 text-coral" />}
        <span className="truncate">{label}</span>
      </p>
    </li>
  );
}
