"use client";

import { StartAudio, useTrackToggle } from "@livekit/components-react";
import {
  MicrophoneIcon,
  MicrophoneSlashIcon,
  SignOutIcon,
  SpeakerHighIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { Track } from "livekit-client";
import { useDictionary } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { Button, buttonClass } from "@/shared/ui";

interface DeviceToggleProps {
  source: Track.Source.Microphone | Track.Source.Camera;
  /** What pressing the button does while the device is on, and while it is off. */
  labels: { on: string; off: string };
  icons: { on: Icon; off: Icon };
  onDeviceError(): void;
}

function DeviceToggle({ source, labels, icons, onDeviceError }: DeviceToggleProps) {
  const { toggle, enabled, pending } = useTrackToggle({ source, onDeviceError });
  const DeviceIcon = enabled ? icons.on : icons.off;
  return (
    <button
      type="button"
      aria-pressed={enabled}
      disabled={pending}
      onClick={() => void toggle()}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60",
        enabled ? "bg-on-ink text-ink hover:bg-on-ink/90" : "bg-ink-raised text-on-ink hover:bg-ink-raised/70",
      )}
    >
      <DeviceIcon aria-hidden weight="fill" className="size-5" />
      {enabled ? labels.off : labels.on}
    </button>
  );
}

interface ClassControlsProps {
  onLeave(): void;
  onDeviceError(): void;
}

/** The viewer's own controls: microphone, camera and leaving the class. */
export function ClassControls({ onLeave, onDeviceError }: ClassControlsProps) {
  const { classroom } = useDictionary();
  const text = classroom.controls;
  return (
    <div role="group" aria-label={text.label} className="flex flex-wrap items-center justify-center gap-2">
      <DeviceToggle
        source={Track.Source.Microphone}
        labels={{ on: text.micOn, off: text.micOff }}
        icons={{ on: MicrophoneIcon, off: MicrophoneSlashIcon }}
        onDeviceError={onDeviceError}
      />
      <DeviceToggle
        source={Track.Source.Camera}
        labels={{ on: text.cameraOn, off: text.cameraOff }}
        icons={{ on: VideoCameraIcon, off: VideoCameraSlashIcon }}
        onDeviceError={onDeviceError}
      />
      {/* Renders only when the browser blocked sound until the viewer interacts with the page */}
      <StartAudio label={text.startAudio} className={buttonClass("primary", "sm")}>
        <SpeakerHighIcon aria-hidden weight="fill" className="size-4" />
        {text.startAudio}
      </StartAudio>
      <Button variant="danger" size="sm" className="h-11" onClick={onLeave}>
        <SignOutIcon aria-hidden weight="bold" className="size-4" />
        {classroom.leave}
      </Button>
    </div>
  );
}
