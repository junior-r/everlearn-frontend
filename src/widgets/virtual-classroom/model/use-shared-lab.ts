"use client";

import { useRoomInfo } from "@livekit/components-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { shareLab, stopSharingLab } from "@/entities/class-session";
import { parseSharedLab, type LabKey, type LabLookup, type LabState } from "@/entities/lab";
import { createLatestSender } from "@/shared/lib/latest-sender";

/** The lab on the class's stage, and how this viewer takes part in it. */
export interface ClassLab {
  labKey: LabKey;
  state: LabState;
  mode: "presenter" | "follower";
}

/** What the Teacher sends: a lab and its state, or null to take it off show. */
type Broadcast = { labKey: LabKey; state: LabState } | null;

/** Each change becomes a request, but never more often than this, and always the latest state. */
const SEND_INTERVAL_MS = 200;

interface SharedLabOptions {
  token: string;
  identity: string;
  isTeacher: boolean;
  findLab: LabLookup;
  onError(error: unknown): void;
}

/**
 * The lab shown to the class. The Teacher drives it from local state and sends
 * every change to the video-server, in order; everyone else draws what the room
 * metadata says, which also reaches whoever joins late.
 */
export function useSharedLab({ token, identity, isTeacher, findLab, onError }: SharedLabOptions) {
  const { metadata } = useRoomInfo();
  const remote = useMemo(() => parseSharedLab(metadata), [metadata]);
  const [presented, setPresented] = useState<{ labKey: LabKey; state: LabState } | null>(null);
  // Once the Teacher has acted, the room metadata no longer decides what they present
  const [hasTakenOver, setHasTakenOver] = useState(false);
  const sender = useMemo(
    () =>
      createLatestSender<Broadcast>(
        (broadcast) => (broadcast ? shareLab(token, broadcast.labKey, broadcast.state) : stopSharingLab(token)),
        { minInterval: SEND_INTERVAL_MS, onError },
      ),
    [token, onError],
  );
  useEffect(() => () => sender.dispose(), [sender]);

  // A Teacher back in a class where they were sharing takes the lab up where it was
  if (isTeacher && !hasTakenOver && presented === null && remote?.sharedBy === identity) {
    setHasTakenOver(true);
    setPresented({ labKey: remote.labKey, state: findLab(remote.labKey).parse(remote.state) });
  }

  const share = useCallback(
    (labKey: LabKey) => {
      const state = findLab(labKey).initial();
      setHasTakenOver(true);
      setPresented({ labKey, state });
      sender.push({ labKey, state });
    },
    [findLab, sender],
  );
  const update = useCallback(
    (state: LabState) => {
      if (!presented) {
        return;
      }
      setPresented({ labKey: presented.labKey, state });
      sender.push({ labKey: presented.labKey, state });
    },
    [presented, sender],
  );
  const stop = useCallback(() => {
    setHasTakenOver(true);
    setPresented(null);
    sender.push(null);
  }, [sender]);

  const followed = useMemo<ClassLab | null>(
    () => remote && { labKey: remote.labKey, state: findLab(remote.labKey).parse(remote.state), mode: "follower" },
    [remote, findLab],
  );
  const current: ClassLab | null = isTeacher ? presented && { ...presented, mode: "presenter" } : followed;
  return { current, share, update, stop };
}
