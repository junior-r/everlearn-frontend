"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useParticipants,
  useRoomContext,
  useTracks,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { HandIcon } from "@phosphor-icons/react/dist/ssr";
import { ConnectionState, Track } from "livekit-client";
import { useCallback, useMemo, useState } from "react";
import {
  deleteChatMessage,
  endClass,
  HAND_ATTRIBUTE,
  lowerParticipantHand,
  muteParticipant,
  setHandRaised,
  type ChatMessage,
  type ClassroomAccess,
} from "@/entities/class-session";
import { ChatPanel } from "@/features/classroom/send-chat-message";
import { errorCode } from "@/shared/api";
import { env } from "@/shared/config/env";
import { errorMessage, format, useDictionary } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { Badge, Button, Dialog, ErrorNotice } from "@/shared/ui";
import {
  closureFor,
  gridColumns,
  stageKey,
  startedScreen,
  unreadCount,
  type Closure,
  type StageChoice,
} from "../lib/room-state";
import { ROOM_OPTIONS } from "../lib/room-options";
import { useRoomFeed } from "../model/use-room-feed";
import { ClassControls } from "./ClassControls";
import { LiveCaptions } from "./LiveCaptions";
import { ParticipantTile, type Moderation } from "./ParticipantTile";

interface VirtualClassroomProps {
  access: ClassroomAccess;
  /** The viewer chose to go, or gave up after losing the class. */
  onLeave(): void;
  /** The viewer wants back in after a lost connection; the page then provides a new access. */
  onRejoin(): void;
}

// One tile per participant, with or without a camera, and one more per shared screen
const TILES = [
  { source: Track.Source.Camera, withPlaceholder: true },
  { source: Track.Source.ScreenShare, withPlaceholder: false },
];

const keyOf = (trackRef: TrackReferenceOrPlaceholder) => `${trackRef.participant.identity}:${trackRef.source}`;

/**
 * Everyone in the class. A shared screen, or the tile the viewer pinned, is
 * shown large with the rest beside it. A screen that starts being shared takes
 * the stage for everyone, whatever each viewer had pinned.
 */
function VideoGrid({ moderation }: { moderation: Moderation | null }) {
  const { classroom } = useDictionary();
  const tracks = useTracks(TILES);
  const [choice, setChoice] = useState<StageChoice>(undefined);
  const keys = tracks.map(keyOf);
  const screens = tracks.filter((trackRef) => trackRef.source === Track.Source.ScreenShare).map(keyOf);
  const [knownScreens, setKnownScreens] = useState(screens);
  // Compared while rendering, so the new screen is on the stage in the same paint it appears
  if (knownScreens.join() !== screens.join()) {
    setKnownScreens(screens);
    const started = startedScreen(knownScreens, screens);
    if (started) {
      setChoice(started);
    }
  }
  const onStage = stageKey(keys, screens, choice);
  const tile = (trackRef: TrackReferenceOrPlaceholder, className?: string) => {
    const key = keyOf(trackRef);
    return (
      <ParticipantTile
        key={key}
        trackRef={trackRef}
        isOnStage={key === onStage}
        onToggleStage={() => setChoice(key === onStage ? null : key)}
        moderation={moderation}
        className={className}
      />
    );
  };

  if (onStage === null) {
    return (
      <ul
        aria-label={classroom.participants}
        className={cn(
          "grid flex-1 auto-rows-[minmax(10rem,1fr)] gap-3 p-0.5 lg:min-h-0 lg:overflow-y-auto",
          gridColumns(tracks.length),
        )}
      >
        {tracks.map((trackRef) => tile(trackRef))}
      </ul>
    );
  }
  const others = tracks.filter((trackRef) => keyOf(trackRef) !== onStage);
  return (
    <div className="flex flex-1 flex-col gap-3 p-0.5 lg:min-h-0 lg:flex-row">
      <ul aria-label={classroom.stage} className="flex min-h-64 flex-1 lg:min-h-0">
        {tracks.filter((trackRef) => keyOf(trackRef) === onStage).map((trackRef) => tile(trackRef, "flex-1"))}
      </ul>
      {others.length > 0 && (
        <ul
          aria-label={classroom.participants}
          className="flex shrink-0 gap-3 overflow-x-auto p-0.5 lg:w-52 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto"
        >
          {others.map((trackRef) => tile(trackRef, "h-28 w-44 shrink-0 lg:h-32 lg:w-full"))}
        </ul>
      )}
    </div>
  );
}

/** How many hands are up, said aloud when it changes: the Teacher may be looking at a shared screen. */
function RaisedHands() {
  const { classroom } = useDictionary();
  const raised = useParticipants().filter((participant) => participant.attributes[HAND_ATTRIBUTE]).length;
  return (
    <p role="status" className={cn(raised === 0 && "sr-only")}>
      {raised > 0 && (
        <Badge tone="sun">
          <HandIcon aria-hidden weight="fill" className="mr-1 size-3.5" />
          {raised === 1 ? classroom.handsRaisedOne : format(classroom.handsRaisedMany, { count: String(raised) })}
        </Badge>
      )}
    </p>
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
  const { classroom, errors, roles } = useDictionary();
  const state = useConnectionState();
  const room = useRoomContext();
  const feed = useRoomFeed();
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [readUpTo, setReadUpTo] = useState(0);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const isTeacher = access.role === "TEACHER";
  const { token } = access;
  const isInRoom = state !== ConnectionState.Connecting && state !== ConnectionState.Disconnected;
  const outcome = closure ?? (hadError && state === ConnectionState.Disconnected ? "failed" : null);

  /** Asks the video-server for something and says so when it refuses; resolves to whether it worked. */
  const attempt = useCallback(async (action: () => Promise<void>) => {
    setActionError(null);
    try {
      await action();
      return true;
    } catch (caught) {
      setActionError(errorCode(caught));
      return false;
    }
  }, []);
  // The video-server refuses these to anyone but the Teacher; the menus simply do not offer them
  const moderation = useMemo<Moderation | null>(
    () =>
      isTeacher
        ? {
            mute: (identity) => void attempt(() => muteParticipant(token, identity)),
            lowerHand: (identity) => void attempt(() => lowerParticipantHand(token, identity)),
          }
        : null,
    [isTeacher, token, attempt],
  );
  const toggleHand = useCallback(
    async (raised: boolean) => {
      await attempt(() => setHandRaised(token, raised));
    },
    [token, attempt],
  );
  const deleteMessage = useCallback(
    (message: ChatMessage) => void attempt(() => deleteChatMessage(token, message)),
    [token, attempt],
  );

  function toggleChat() {
    setReadUpTo(feed.messages.length);
    setIsChatOpen((open) => !open);
  }

  function leave() {
    void room.disconnect();
    onLeave();
  }

  /**
   * The Teacher leaves first and then closes the room: closing it under a live
   * connection makes the browser report its channels as broken. If the class
   * could not be closed, the Teacher goes back in as they were, and is told.
   */
  async function endForEveryone() {
    setIsEnding(true);
    const { isCameraEnabled, isMicrophoneEnabled } = room.localParticipant;
    await room.disconnect();
    if (await attempt(() => endClass(token))) {
      onLeave();
      return;
    }
    setIsEnding(false);
    setIsLeaving(false);
    try {
      await room.connect(env.livekitUrl, token);
      await room.localParticipant.setCameraEnabled(isCameraEnabled);
      await room.localParticipant.setMicrophoneEnabled(isMicrophoneEnabled);
    } catch {
      onDeviceError();
    }
  }

  const leaveText = classroom.leaveDialog;
  return (
    <>
      <header className="flex flex-wrap items-center gap-3 border-b border-on-ink/10 px-4 py-3">
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">
          {format(classroom.heading, { subject: access.subjectName, group: access.groupName })}
        </h1>
        {isInRoom && <RaisedHands />}
        {isInRoom && state !== ConnectionState.Connected && (
          <p role="status" className="rounded-full bg-sun-soft px-2.5 py-0.5 text-xs font-medium text-sun-ink">
            {classroom.reconnecting}
          </p>
        )}
        <Badge tone={isTeacher ? "sky" : "mint"}>{roles[access.role]}</Badge>
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
          <main className="flex min-w-0 flex-1 flex-col gap-3 p-3 sm:p-4 lg:min-h-0">
            {hadError && <ErrorNotice message={classroom.deviceError} />}
            <ErrorNotice message={errorMessage(errors, actionError)} />
            <VideoGrid moderation={moderation} />
            <LiveCaptions captions={feed.captions} />
            <ClassControls
              isChatOpen={isChatOpen}
              unread={unreadCount(feed.messages.length, readUpTo, isChatOpen)}
              onToggleChat={toggleChat}
              onToggleHand={toggleHand}
              onLeave={() => setIsLeaving(true)}
              onDeviceError={onDeviceError}
            />
          </main>
          {isChatOpen && (
            <aside className="flex h-80 shrink-0 animate-rise flex-col border-t border-line bg-surface text-foreground lg:h-auto lg:w-80 lg:border-t-0 lg:border-l">
              <ChatPanel
                messages={feed.messages}
                selfId={access.identity}
                roomToken={token}
                canModerate={isTeacher}
                onDelete={deleteMessage}
                onClose={toggleChat}
              />
            </aside>
          )}
          <Dialog
            isOpen={isLeaving}
            title={isTeacher ? leaveText.teacherTitle : leaveText.title}
            description={isTeacher ? leaveText.teacherBody : leaveText.body}
            onClose={() => setIsLeaving(false)}
          >
            <Button size="sm" variant="secondary" onClick={() => setIsLeaving(false)}>
              {leaveText.cancel}
            </Button>
            {isTeacher ? (
              <>
                <Button size="sm" variant="secondary" disabled={isEnding} onClick={leave}>
                  {leaveText.leaveOnly}
                </Button>
                <Button size="sm" variant="danger" isLoading={isEnding} onClick={() => void endForEveryone()}>
                  {leaveText.end}
                </Button>
              </>
            ) : (
              <Button size="sm" variant="danger" onClick={leave}>
                {leaveText.confirm}
              </Button>
            )}
          </Dialog>
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
      options={ROOM_OPTIONS}
      audio={startsOnAir}
      video={startsOnAir}
      onDisconnected={(reason) => setClosure((current) => current ?? closureFor(reason))}
      onError={() => setHadError(true)}
      // A screen share that is cancelled comes without a device kind, and is not a failure
      onMediaDeviceFailure={(_failure, kind) => setHadError((had) => had || kind !== undefined)}
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
