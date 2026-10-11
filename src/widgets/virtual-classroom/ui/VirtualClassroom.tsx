"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import { useState } from "react";
import type { ClassroomAccess } from "@/entities/class-session";
import { ChatPanel } from "@/features/classroom/send-chat-message";
import { env } from "@/shared/config/env";
import { format, useDictionary } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { Badge, Button, ErrorNotice } from "@/shared/ui";
import { closureFor, gridColumns, type Closure } from "../lib/room-state";
import { useRoomFeed } from "../model/use-room-feed";
import { ClassControls } from "./ClassControls";
import { LiveCaptions } from "./LiveCaptions";
import { ParticipantTile } from "./ParticipantTile";

interface VirtualClassroomProps {
  access: ClassroomAccess;
  /** The viewer chose to go, or gave up after losing the class. */
  onLeave(): void;
  /** The viewer wants back in after a lost connection; the page then provides a new access. */
  onRejoin(): void;
}

const CAMERAS = [{ source: Track.Source.Camera, withPlaceholder: true }];

function VideoGrid() {
  const { classroom } = useDictionary();
  // One tile per participant, with or without a camera
  const tracks = useTracks(CAMERAS);
  return (
    <ul
      aria-label={classroom.participants}
      className={cn("grid flex-1 auto-rows-[minmax(10rem,1fr)] gap-3 p-0.5 lg:min-h-0 lg:overflow-y-auto", gridColumns(tracks.length))}
    >
      {tracks.map((trackRef) => (
        <ParticipantTile key={trackRef.participant.identity} trackRef={trackRef} />
      ))}
    </ul>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">{children}</div>;
}

interface ClassroomProps extends VirtualClassroomProps {
  closure: Closure | null;
  /** LiveKit reported an error: fatal if the room was never reached, a device problem otherwise. */
  hadError: boolean;
  onDeviceError(): void;
}

function Classroom({ access, closure, hadError, onLeave, onRejoin, onDeviceError }: ClassroomProps) {
  const { classroom, roles } = useDictionary();
  const state = useConnectionState();
  const room = useRoomContext();
  const feed = useRoomFeed();
  const isInRoom = state !== ConnectionState.Connecting && state !== ConnectionState.Disconnected;
  const outcome = closure ?? (hadError && state === ConnectionState.Disconnected ? "failed" : null);

  function leave() {
    void room.disconnect();
    onLeave();
  }

  return (
    <>
      <header className="flex flex-wrap items-center gap-3 border-b border-on-ink/10 px-4 py-3">
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">
          {format(classroom.heading, { subject: access.subjectName, group: access.groupName })}
        </h1>
        {isInRoom && state !== ConnectionState.Connected && (
          <p role="status" className="rounded-full bg-sun-soft px-2.5 py-0.5 text-xs font-medium text-sun-ink">
            {classroom.reconnecting}
          </p>
        )}
        <Badge tone={access.role === "TEACHER" ? "sky" : "mint"}>{roles[access.role]}</Badge>
      </header>
      {outcome ? (
        <CenteredMessage>
          <p role="alert" className="text-lg font-medium">
            {classroom.closed[outcome]}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {outcome !== "ended" && (
              <Button size="sm" onClick={onRejoin}>
                {classroom.closed.rejoin}
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={onLeave}>
              {classroom.backHome}
            </Button>
          </div>
        </CenteredMessage>
      ) : !isInRoom ? (
        <CenteredMessage>
          <p role="status" className="text-sm text-on-ink/70">
            {classroom.connecting}
          </p>
        </CenteredMessage>
      ) : (
        <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
          <main className="flex flex-1 flex-col gap-3 p-3 sm:p-4 lg:min-h-0">
            {hadError && <ErrorNotice message={classroom.deviceError} />}
            <VideoGrid />
            <LiveCaptions captions={feed.captions} />
            <ClassControls onLeave={leave} onDeviceError={onDeviceError} />
          </main>
          <aside className="flex h-80 shrink-0 flex-col border-t border-line bg-surface text-foreground lg:h-auto lg:w-80 lg:border-t-0 lg:border-l">
            <ChatPanel messages={feed.messages} selfId={access.identity} roomToken={access.token} />
          </aside>
        </div>
      )}
      <RoomAudioRenderer />
    </>
  );
}

/**
 * A live class: the video grid, the viewer's controls, live captions and the
 * chat. It connects with the access the backend issued and explains every
 * way the connection can end. A Teacher enters on air; Students enter muted.
 */
export function VirtualClassroom({ access, onLeave, onRejoin }: VirtualClassroomProps) {
  const [closure, setClosure] = useState<Closure | null>(null);
  const [hadError, setHadError] = useState(false);
  const startsOnAir = access.role === "TEACHER";
  return (
    <LiveKitRoom
      serverUrl={env.livekitUrl}
      token={access.token}
      connect={closure === null}
      audio={startsOnAir}
      video={startsOnAir}
      onDisconnected={(reason) => setClosure((current) => current ?? closureFor(reason))}
      onError={() => setHadError(true)}
      onMediaDeviceFailure={() => setHadError(true)}
      // A fixed stage beside the chat on large screens; a page that scrolls on small ones
      className="flex min-h-dvh flex-col bg-ink text-on-ink lg:h-dvh"
    >
      <Classroom
        access={access}
        closure={closure}
        hadError={hadError}
        onLeave={onLeave}
        onRejoin={onRejoin}
        onDeviceError={() => setHadError(true)}
      />
    </LiveKitRoom>
  );
}
