"use client";

import {
  isTrackReference,
  useIsSpeaking,
  useParticipantAttribute,
  useTrackMutedIndicator,
  VideoTrack,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import {
  DotsThreeIcon,
  HandIcon,
  HandPalmIcon,
  MicrophoneSlashIcon,
  PushPinIcon,
  PushPinSlashIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Track } from "livekit-client";
import { HAND_ATTRIBUTE, ROLE_ATTRIBUTE } from "@/entities/class-session";
import { format, useDictionary } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { Avatar, ContextMenu, useContextMenu, type MenuAction } from "@/shared/ui";

/** What the Teacher of the class may do to a participant; nobody else gets these. */
export interface Moderation {
  mute(identity: string): void;
  lowerHand(identity: string): void;
}

interface ParticipantTileProps {
  trackRef: TrackReferenceOrPlaceholder;
  /** The tile is the one shown large. */
  isOnStage: boolean;
  onToggleStage(): void;
  /** Null unless the viewer is the Teacher of the class. */
  moderation: Moderation | null;
  className?: string;
}

/**
 * One participant on the stage: their camera, their initials while it is off,
 * or the screen they share. Its menu (right click, or the button in its
 * corner) pins it and, for the Teacher, keeps order.
 */
export function ParticipantTile({ trackRef, isOnStage, onToggleStage, moderation, className }: ParticipantTileProps) {
  const { classroom, roles } = useDictionary();
  const text = classroom.tile;
  const { participant } = trackRef;
  const isScreen = trackRef.source === Track.Source.ScreenShare;
  const isSpeaking = useIsSpeaking(participant);
  const video = useTrackMutedIndicator(trackRef);
  const microphone = useTrackMutedIndicator({ participant, source: Track.Source.Microphone });
  const isHandRaised = Boolean(useParticipantAttribute(HAND_ATTRIBUTE, { participant }));
  const isTeacher = useParticipantAttribute(ROLE_ATTRIBUTE, { participant }) === "TEACHER";
  const menu = useContextMenu();

  const name = participant.name || classroom.unnamed;
  const ownName = participant.isLocal ? format(classroom.you, { name }) : name;
  const label = isScreen ? format(text.screenOf, { name: ownName }) : ownName;
  const showsVideo = isTrackReference(trackRef) && !video.isMuted;
  // A shared screen says nothing about its owner's microphone or hand: their own tile does
  const states = isScreen
    ? []
    : [microphone.isMuted && classroom.muted, isHandRaised && text.handRaised].filter((state) => state !== false);

  const canModerate = moderation !== null && !isScreen && !participant.isLocal;
  const actions: MenuAction[] = [
    {
      id: "stage",
      label: isOnStage ? text.unpin : text.pin,
      icon: isOnStage ? PushPinSlashIcon : PushPinIcon,
      onSelect: onToggleStage,
    },
    ...(canModerate && !microphone.isMuted
      ? [
          {
            id: "mute",
            label: format(text.mute, { name }),
            icon: MicrophoneSlashIcon,
            onSelect: () => moderation.mute(participant.identity),
          },
        ]
      : []),
    ...(canModerate && isHandRaised
      ? [
          {
            id: "lower-hand",
            label: format(text.lowerHand, { name }),
            icon: HandPalmIcon,
            onSelect: () => moderation.lowerHand(participant.identity),
          },
        ]
      : []),
  ];
  const menuLabel = format(text.options, { name: label });

  return (
    <li
      aria-label={[label, ...states].join(", ")}
      onContextMenu={menu.openAtPointer}
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-ink-raised outline-2 outline-offset-2 transition-[outline-color] duration-150",
        isSpeaking && !isScreen ? "outline-mint" : "outline-transparent",
        className,
      )}
    >
      {showsVideo ? (
        <VideoTrack
          trackRef={trackRef}
          className={cn("absolute inset-0 size-full", isScreen ? "bg-ink object-contain" : "object-cover")}
        />
      ) : (
        <div className="flex size-full items-center justify-center">
          <Avatar name={name} size="md" />
          <span className="sr-only">{classroom.cameraOff}</span>
        </div>
      )}
      {isHandRaised && !isScreen && (
        <span
          aria-hidden
          className="absolute top-2 left-2 flex size-8 animate-pop items-center justify-center rounded-full bg-sun text-ink"
        >
          <HandIcon weight="fill" className="size-4.5" />
        </span>
      )}
      <button
        type="button"
        aria-label={menuLabel}
        aria-haspopup="menu"
        onClick={menu.openBelow}
        className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-ink/75 text-on-ink opacity-0 transition duration-150 group-hover:opacity-100 hover:bg-ink active:scale-[0.96] focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-on-ink [@media(hover:none)]:opacity-100"
      >
        <DotsThreeIcon aria-hidden weight="bold" className="size-5" />
      </button>
      <p className="absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-full bg-ink/75 px-2.5 py-1 text-xs font-medium text-on-ink">
        {!isScreen && microphone.isMuted && (
          <MicrophoneSlashIcon aria-hidden weight="fill" className="size-3.5 shrink-0 text-coral" />
        )}
        {isOnStage && <PushPinIcon aria-hidden weight="fill" className="size-3.5 shrink-0 text-sky" />}
        <span className="truncate">{label}</span>
        {isTeacher && !isScreen && <span className="shrink-0 text-on-ink/65">{roles.TEACHER}</span>}
      </p>
      <ContextMenu label={menuLabel} actions={actions} anchor={menu.anchor} onClose={menu.close} />
    </li>
  );
}
