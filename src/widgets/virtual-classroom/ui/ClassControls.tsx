"use client";

import {
  StartAudio,
  useLocalParticipant,
  useMediaDeviceSelect,
  useParticipantAttribute,
  useTrackToggle,
} from "@livekit/components-react";
import {
  CaretUpIcon,
  ChatCircleDotsIcon,
  FlaskIcon,
  CheckIcon,
  HandIcon,
  MicrophoneIcon,
  MicrophoneSlashIcon,
  MonitorArrowUpIcon,
  SignOutIcon,
  SpeakerHighIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { Track } from "livekit-client";
import { useState, type MouseEvent, type ReactNode } from "react";
import { HAND_ATTRIBUTE } from "@/entities/class-session";
import { format, useDictionary } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { SCREEN_CAPTURE, SCREEN_PUBLISH } from "../lib/room-options";
import { Button, buttonClass, ContextMenu, useContextMenu, type MenuAction } from "@/shared/ui";

/** How a control looks: resting, switched off (a closed microphone), or one of the states worth noticing. */
type Look = "idle" | "off" | "raised" | "sharing" | "open";

const looks: Record<Look, string> = {
  idle: "bg-on-ink/10 text-on-ink hover:bg-on-ink/20",
  off: "bg-coral text-ink hover:bg-coral/85",
  raised: "bg-sun text-ink hover:bg-sun/85",
  sharing: "bg-sky text-ink hover:bg-sky/85",
  open: "bg-on-ink text-ink hover:bg-on-ink/85",
};

interface ControlButtonProps {
  /** What pressing the button does now; it is the button's only text. */
  label: string;
  icon: Icon;
  look: Look;
  isPressed: boolean;
  disabled?: boolean;
  onClick(event: MouseEvent<HTMLButtonElement>): void;
  /** The button opens a menu instead of acting. */
  hasMenu?: boolean;
  className?: string;
  children?: ReactNode;
}

function ControlButton({
  label,
  icon: ControlIcon,
  look,
  isPressed,
  hasMenu = false,
  disabled,
  onClick,
  className,
  children,
}: ControlButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={hasMenu ? undefined : isPressed}
      aria-haspopup={hasMenu ? "menu" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative flex size-12 items-center justify-center rounded-xl transition duration-150 active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-ink disabled:cursor-not-allowed disabled:opacity-60",
        looks[look],
        className,
      )}
    >
      <ControlIcon aria-hidden weight="fill" className="size-5" />
      {children}
    </button>
  );
}

interface DeviceToggleProps {
  source: Track.Source.Microphone | Track.Source.Camera;
  /** What pressing the button does while the device is on, and while it is off. */
  labels: { on: string; off: string };
  /** The name of the list of devices, and of a device the browser gives no name for (`{number}`). */
  picker: { label: string; unnamed: string };
  icons: { on: Icon; off: Icon };
  onDeviceError(): void;
}

/** Turns a microphone or camera on and off, with the list of connected ones beside it to choose from. */
function DeviceToggle({ source, labels, picker, icons, onDeviceError }: DeviceToggleProps) {
  const { toggle, enabled, pending } = useTrackToggle({ source, onDeviceError });
  const kind = source === Track.Source.Microphone ? "audioinput" : "videoinput";
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({ kind, onError: onDeviceError });
  const menu = useContextMenu();
  // Browsers name devices only once the viewer has let the page use one of that kind
  const actions: MenuAction[] = devices.map((device, index) => {
    const isCurrent = device.deviceId === activeDeviceId;
    return {
      id: device.deviceId || String(index),
      label: device.label || format(picker.unnamed, { number: String(index + 1) }),
      icon: isCurrent ? CheckIcon : icons.on,
      isCurrent,
      onSelect: () => void setActiveMediaDevice(device.deviceId).catch(onDeviceError),
    };
  });
  const look = enabled ? "idle" : "off";
  return (
    <div className="flex">
      <ControlButton
        label={enabled ? labels.off : labels.on}
        icon={enabled ? icons.on : icons.off}
        look={look}
        isPressed={enabled}
        disabled={pending}
        onClick={() => void toggle()}
        className="rounded-r-none"
      />
      <button
        type="button"
        aria-label={picker.label}
        title={picker.label}
        aria-haspopup="menu"
        disabled={actions.length === 0}
        onClick={menu.openAbove}
        className={cn(
          "flex h-12 w-7 items-center justify-center rounded-r-xl border-l border-ink/25 transition duration-150 active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-ink disabled:cursor-not-allowed disabled:opacity-60",
          looks[look],
        )}
      >
        <CaretUpIcon aria-hidden weight="bold" className="size-3.5" />
      </button>
      <ContextMenu label={picker.label} actions={actions} anchor={menu.anchor} onClose={menu.close} />
    </div>
  );
}

/** Shares the viewer's screen. Closing the browser's picker is a change of mind, not a device error. */
function ScreenShareToggle({ labels }: { labels: { on: string; off: string } }) {
  const { toggle, enabled, pending } = useTrackToggle({
    source: Track.Source.ScreenShare,
    captureOptions: SCREEN_CAPTURE,
    publishOptions: SCREEN_PUBLISH,
    onDeviceError: () => undefined,
  });
  return (
    <ControlButton
      label={enabled ? labels.off : labels.on}
      icon={MonitorArrowUpIcon}
      look={enabled ? "sharing" : "idle"}
      isPressed={enabled}
      disabled={pending}
      onClick={() => void toggle()}
    />
  );
}

/** What the Teacher can do with a lab from the toolbar; null for anyone else. */
export interface LabSharing {
  isSharing: boolean;
  /** Opens the list of labs to choose from. */
  onPick(): void;
  onStop(): void;
}

/**
 * The Teacher's share button: a menu with their screen and a lab. A lab is
 * shared as state, not as video, so it stays sharp and costs no upload.
 */
function ShareMenu({ labels, lab, offersScreen }: { labels: { on: string; off: string }; lab: LabSharing; offersScreen: boolean }) {
  const { classroom } = useDictionary();
  const text = classroom.controls;
  const { toggle, enabled } = useTrackToggle({
    source: Track.Source.ScreenShare,
    captureOptions: SCREEN_CAPTURE,
    publishOptions: SCREEN_PUBLISH,
    onDeviceError: () => undefined,
  });
  const menu = useContextMenu();
  const actions: MenuAction[] = [
    ...(offersScreen
      ? [{ id: "screen", label: enabled ? labels.off : labels.on, icon: MonitorArrowUpIcon, onSelect: () => void toggle() }]
      : []),
    lab.isSharing
      ? { id: "lab", label: text.labStop, icon: FlaskIcon, isDanger: true, onSelect: lab.onStop }
      : { id: "lab", label: text.labShare, icon: FlaskIcon, onSelect: lab.onPick },
  ];
  const isSharing = enabled || lab.isSharing;
  return (
    <>
      <ControlButton
        label={text.share}
        icon={MonitorArrowUpIcon}
        look={isSharing ? "sharing" : "idle"}
        isPressed={isSharing}
        hasMenu
        onClick={menu.openAbove}
      />
      <ContextMenu label={text.share} actions={actions} anchor={menu.anchor} onClose={menu.close} />
    </>
  );
}

const canShareScreen = () =>
  typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getDisplayMedia === "function";

interface ClassControlsProps {
  isChatOpen: boolean;
  /** Messages that arrived while the chat was closed. */
  unread: number;
  onToggleChat(): void;
  /** Raises or lowers the viewer's hand; the room then shows it, here included. */
  onToggleHand(raised: boolean): Promise<void>;
  /** The viewer asked to go; the classroom confirms before anything happens. */
  onLeave(): void;
  onDeviceError(): void;
  /** Only for the Teacher, and only when the institution has labs to share. */
  lab: LabSharing | null;
}

/** The viewer's own controls: microphone and camera (and which ones), screen or lab, hand, chat and leaving the class. */
export function ClassControls({
  isChatOpen,
  unread,
  onToggleChat,
  onToggleHand,
  onLeave,
  onDeviceError,
  lab,
}: ClassControlsProps) {
  const { classroom } = useDictionary();
  const text = classroom.controls;
  const { localParticipant } = useLocalParticipant();
  const isHandRaised = Boolean(useParticipantAttribute(HAND_ATTRIBUTE, { participant: localParticipant }));
  const [isMovingHand, setIsMovingHand] = useState(false);
  // Phones have no screen to share: the button is left out instead of failing
  const [offersScreenShare] = useState(canShareScreen);
  const chatLabel = isChatOpen ? text.chatClose : text.chatOpen;
  const unreadText = unread === 1 ? text.unreadOne : format(text.unreadMany, { count: String(unread) });

  async function toggleHand() {
    setIsMovingHand(true);
    await onToggleHand(!isHandRaised);
    setIsMovingHand(false);
  }

  return (
    <div
      role="group"
      aria-label={text.label}
      className="mx-auto flex max-w-full flex-wrap items-center justify-center gap-2 rounded-2xl bg-ink-raised p-2"
    >
      <DeviceToggle
        source={Track.Source.Microphone}
        labels={{ on: text.micOn, off: text.micOff }}
        picker={{ label: text.micPicker, unnamed: text.micUnnamed }}
        icons={{ on: MicrophoneIcon, off: MicrophoneSlashIcon }}
        onDeviceError={onDeviceError}
      />
      <DeviceToggle
        source={Track.Source.Camera}
        labels={{ on: text.cameraOn, off: text.cameraOff }}
        picker={{ label: text.cameraPicker, unnamed: text.cameraUnnamed }}
        icons={{ on: VideoCameraIcon, off: VideoCameraSlashIcon }}
        onDeviceError={onDeviceError}
      />
      {lab ? (
        <ShareMenu labels={{ on: text.shareOn, off: text.shareOff }} lab={lab} offersScreen={offersScreenShare} />
      ) : (
        offersScreenShare && <ScreenShareToggle labels={{ on: text.shareOn, off: text.shareOff }} />
      )}
      <ControlButton
        label={isHandRaised ? text.handDown : text.handUp}
        icon={HandIcon}
        look={isHandRaised ? "raised" : "idle"}
        isPressed={isHandRaised}
        disabled={isMovingHand}
        onClick={() => void toggleHand()}
      />
      <ControlButton
        label={unread > 0 ? `${chatLabel}, ${unreadText}` : chatLabel}
        icon={ChatCircleDotsIcon}
        look={isChatOpen ? "open" : "idle"}
        isPressed={isChatOpen}
        onClick={onToggleChat}
      >
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 flex h-5 min-w-5 animate-pop items-center justify-center rounded-full bg-coral px-1 font-mono text-[0.6875rem] font-semibold text-ink"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </ControlButton>
      {/* Renders only when the browser blocked sound until the viewer interacts with the page */}
      <StartAudio label={text.startAudio} className={cn(buttonClass("primary", "sm"), "h-12")}>
        <SpeakerHighIcon aria-hidden weight="fill" className="size-4" />
        {text.startAudio}
      </StartAudio>
      <span aria-hidden className="mx-1 hidden h-6 w-px bg-on-ink/15 sm:block" />
      <Button variant="danger" size="sm" className="h-12" aria-label={classroom.leave} onClick={onLeave}>
        <SignOutIcon aria-hidden weight="bold" className="size-5" />
        <span className="hidden sm:inline">{classroom.leave}</span>
      </Button>
    </div>
  );
}
