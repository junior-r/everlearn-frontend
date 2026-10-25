"use client";

import { useTrackToggle } from "@livekit/components-react";
import { Track } from "livekit-client";
import { useState } from "react";
import { SCREEN_CAPTURE, SCREEN_PUBLISH } from "../lib/room-options";

/**
 * The viewer's screen share: pressing starts it at once, but stopping waits
 * for a confirmation. Closing the browser's picker is a change of mind, not a device error.
 */
export function useScreenShare() {
  const { toggle, enabled, pending } = useTrackToggle({
    source: Track.Source.ScreenShare,
    captureOptions: SCREEN_CAPTURE,
    publishOptions: SCREEN_PUBLISH,
    onDeviceError: () => undefined,
  });
  const [isAskingToStop, setIsAskingToStop] = useState(false);
  return {
    enabled,
    pending,
    // A share ended from the browser's own bar leaves nothing to confirm
    isConfirmingStop: isAskingToStop && enabled,
    press: () => (enabled ? setIsAskingToStop(true) : void toggle(true)),
    stop: () => {
      setIsAskingToStop(false);
      void toggle(false);
    },
    keep: () => setIsAskingToStop(false),
  };
}
