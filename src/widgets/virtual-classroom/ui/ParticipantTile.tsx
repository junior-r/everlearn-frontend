"use client";

import {
  isTrackReference,
  useConnectionQualityIndicator,
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
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  MicrophoneSlashIcon,
  PushPinIcon,
  PushPinSlashIcon,
  WifiLowIcon,
  WifiSlashIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { ConnectionQuality, Track } from "livekit-client";
import { useRef } from "react";
import { ROLE_ATTRIBUTE } from "@/entities/class-session";
import { format, useDictionary, useLocale } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { Avatar, ContextMenu, useContextMenu, type MenuAction } from "@/shared/ui";
import { MAX_SCALE, zoomTransform } from "../lib/zoom";
import { useZoom } from "../model/use-zoom";

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
  /** The participant's turn among the raised hands (1 is first); null while their hand is down. */
  handPosition: number | null;
  /** The tile is large enough to zoom into (the stage, or the grid). */
  canZoom: boolean;
  /** Null unless the viewer is the Teacher of the class. */
  moderation: Moderation | null;
  className?: string;
}

const overlayButton =
  "flex size-8 items-center justify-center rounded-full bg-ink/75 text-on-ink transition duration-150 hover:bg-ink active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-on-ink disabled:pointer-events-none disabled:opacity-40";

function ZoomButton({ label, icon: ZoomIcon, disabled, onClick }: { label: string; icon: Icon; disabled: boolean; onClick(): void }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className={overlayButton}>
      <ZoomIcon aria-hidden weight="bold" className="size-4" />
    </button>
  );
}

/**
 * One participant on the stage: their camera, their initials while it is off,
 * or the screen they share. Its menu (right click, or the button in its
 * corner) pins it and, for the Teacher, keeps order. A large tile can be
 * zoomed into by the viewer alone.
 */
export function ParticipantTile({
  trackRef,
  isOnStage,
  onToggleStage,
  handPosition,
  canZoom,
  moderation,
  className,
}: ParticipantTileProps) {
  const { classroom, roles } = useDictionary();
  const locale = useLocale();
  const text = classroom.tile;
  const { participant } = trackRef;
  const isScreen = trackRef.source === Track.Source.ScreenShare;
  const isSpeaking = useIsSpeaking(participant);
  const video = useTrackMutedIndicator(trackRef);
  const microphone = useTrackMutedIndicator({ participant, source: Track.Source.Microphone });
  const { quality } = useConnectionQualityIndicator({ participant });
  const isHandRaised = handPosition !== null;
  const isTeacher = useParticipantAttribute(ROLE_ATTRIBUTE, { participant }) === "TEACHER";
  const menu = useContextMenu();
  const showsVideo = isTrackReference(trackRef) && !video.isMuted;
  const area = useRef<HTMLLIElement>(null);
  const zoom = useZoom(area, canZoom && showsVideo);

  const name = participant.name || classroom.unnamed;
  const ownName = participant.isLocal ? format(classroom.you, { name }) : name;
  const label = isScreen ? format(text.screenOf, { name: ownName }) : ownName;
  // Only a connection worth worrying about is shown, as other calls do
  const connection =
    quality === ConnectionQuality.Lost ? text.connectionLost : quality === ConnectionQuality.Poor ? text.connectionPoor : null;
  // A shared screen says nothing about its owner's microphone, hand or connection: their own tile does
  const states = isScreen
    ? []
    : [
        microphone.isMuted && classroom.muted,
        isHandRaised && format(text.handTurn, { position: String(handPosition) }),
        connection ?? false,
      ].filter((state) => state !== false);
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(zoom.zoom.scale);

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
  const showsZoom = canZoom && showsVideo;

  return (
    <li
      ref={area}
      aria-label={[label, ...states].join(", ")}
      onContextMenu={menu.openAtPointer}
      {...zoom.handlers}
      style={zoom.style}
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-ink-raised outline-2 outline-offset-2 transition-[outline-color] duration-150",
        isSpeaking && !isScreen ? "outline-mint" : "outline-transparent",
        zoom.isZoomed && "cursor-grab active:cursor-grabbing",
        className,
      )}
    >
      {showsVideo ? (
        <VideoTrack
          trackRef={trackRef}
          style={{ transform: zoomTransform(zoom.zoom) }}
          className={cn(
            "absolute inset-0 size-full origin-center will-change-transform",
            isScreen ? "bg-ink object-contain" : "object-cover",
          )}
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
          className="absolute top-2 left-2 flex h-8 min-w-8 animate-pop items-center justify-center gap-1 rounded-full bg-sun px-2 text-sm font-bold text-ink"
        >
          <HandIcon weight="fill" className="size-4.5" />
          {handPosition}
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
      {showsZoom && (
        <div
          role="group"
          aria-label={format(classroom.zoom.group, { name: label })}
          className={cn(
            "absolute right-2 bottom-2 flex items-center gap-1 transition duration-150 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100",
            zoom.isZoomed ? "opacity-100" : "opacity-0",
          )}
        >
          <ZoomButton
            label={classroom.zoom.out}
            icon={MagnifyingGlassMinusIcon}
            disabled={!zoom.isZoomed}
            onClick={zoom.zoomOut}
          />
          <button
            type="button"
            aria-label={format(classroom.zoom.reset, { percent })}
            title={format(classroom.zoom.reset, { percent })}
            disabled={!zoom.isZoomed}
            onClick={zoom.reset}
            className={cn(overlayButton, "w-auto min-w-12 px-2 text-xs font-semibold tabular-nums")}
          >
            {percent}
          </button>
          <ZoomButton
            label={classroom.zoom.in}
            icon={MagnifyingGlassPlusIcon}
            disabled={zoom.zoom.scale >= MAX_SCALE}
            onClick={zoom.zoomIn}
          />
        </div>
      )}
      <p
        className={cn(
          "absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-ink/75 px-2.5 py-1 text-xs font-medium text-on-ink",
          // Leaves room for the zoom buttons in the other corner
          showsZoom ? "max-w-[calc(100%-10.5rem)]" : "max-w-[calc(100%-1rem)]",
        )}
      >
        {!isScreen && connection && <ConnectionIcon quality={quality} />}
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

function ConnectionIcon({ quality }: { quality: ConnectionQuality }) {
  return quality === ConnectionQuality.Lost ? (
    <WifiSlashIcon aria-hidden weight="bold" className="size-3.5 shrink-0 text-coral" />
  ) : (
    <WifiLowIcon aria-hidden weight="bold" className="size-3.5 shrink-0 text-sun" />
  );
}
