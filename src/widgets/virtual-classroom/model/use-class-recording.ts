"use client";

import { useIsRecording } from "@livekit/components-react";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/shared/api";
import { startRecording, stopRecording } from "@/entities/class-session";

// Egress opens a browser and joins the room before the recording runs; past this, the request is taken as lost
const SETTLE_MS = 60_000;

export interface ClassRecording {
  /** True while the room is being recorded, as LiveKit tells everyone in it. */
  isRecording: boolean;
  /** A start or stop was asked for and the room has not shown it yet. */
  isPending: boolean;
  start(): void;
  stop(): void;
}

/**
 * Starts and stops the recording of a class through the video-server. Whether the
 * class is being recorded comes only from the room, so every viewer sees the same.
 */
export function useClassRecording(roomToken: string, onError: (caught: unknown) => void): ClassRecording {
  const isRecording = useIsRecording();
  // The state the room was asked to reach; null when nothing is awaited
  const [awaited, setAwaited] = useState<boolean | null>(null);
  if (awaited !== null && awaited === isRecording) {
    setAwaited(null);
  }

  useEffect(() => {
    if (awaited === null) {
      return;
    }
    const timer = setTimeout(() => {
      setAwaited(null);
      onError(new ApiError(0, "RECORDING_FAILED", "The room never showed the recording change"));
    }, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [awaited, onError]);

  const ask = useCallback(
    (wanted: boolean) => {
      setAwaited(wanted);
      (wanted ? startRecording : stopRecording)(roomToken).catch((caught: unknown) => {
        setAwaited(null);
        onError(caught);
      });
    },
    [roomToken, onError],
  );

  return {
    isRecording,
    isPending: awaited !== null,
    start: useCallback(() => ask(true), [ask]),
    stop: useCallback(() => ask(false), [ask]),
  };
}
