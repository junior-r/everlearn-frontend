"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionState,
  useParticipantAttribute,
  useParticipants,
  useRoomContext,
  useTracks,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  deleteChatMessage,
  endClass,
  handQueue,
  lowerParticipantHand,
  muteParticipant,
  setHandRaised,
  type ChatMessage,
  type ClassroomAccess,
  type RaisedHand,
} from "@/entities/class-session";
import { LABS_ATTRIBUTE, parseShareableLabs, type LabLookup } from "@/entities/lab";
import { ChatPanel } from "@/features/classroom/send-chat-message";
import { errorCode } from "@/shared/api";
import { env } from "@/shared/config/env";
import { errorMessage, format, useDictionary } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { Badge, Button, Dialog, ErrorNotice } from "@/shared/ui";
import {
  closureFor,
  gridColumns,
  LAB_STAGE_KEY,
  stageKey,
  startedScreen,
  unreadCount,
  type Closure,
  type StageChoice,
} from "../lib/room-state";
import { roomOptions } from "../lib/room-options";
import { useRoomFeed } from "../model/use-room-feed";
import { useSharedLab } from "../model/use-shared-lab";
import { ClassControls } from "./ClassControls";
import { HandQueue } from "./HandQueue";
import { LabPicker } from "./LabPicker";
import { LiveCaptions } from "./LiveCaptions";
import { ParticipantTile, type Moderation } from "./ParticipantTile";
import { SharedLabPanel } from "./SharedLabPanel";

interface VirtualClassroomProps {
  access: ClassroomAccess;
  /** The institution the class belongs to, for what a shared lab loads (a Teacher's exercises). */
  institutionId: string;
  /** The labs the classroom can show; given by the page, so the classroom does not depend on them. */
  findLab: LabLookup;
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

/** A lab shown to the class: its name, for its tile, and the panel that draws it on the stage. */
interface StagedLab {
  name: string;
  panel: ReactNode;
}

/**
 * Everyone in the class. A shared screen, or the tile the viewer pinned, is
 * shown large with the rest beside it. A screen that starts being shared takes
 * the stage for everyone, whatever each viewer had pinned.
 */
function VideoGrid({
  moderation,
  lab,
  hands,
}: {
  moderation: Moderation | null;
  lab: StagedLab | null;
  hands: RaisedHand[];
}) {
  const { classroom } = useDictionary();
  const tracks = useTracks(TILES);
  const handPositions = new Map(hands.map((hand) => [hand.identity, hand.position]));
  const [choice, setChoice] = useState<StageChoice>(undefined);
  // A shared lab is one more thing to put on the stage, and it takes it the way a new screen does
  const labKeys = lab ? [LAB_STAGE_KEY] : [];
  const keys = [...labKeys, ...tracks.map(keyOf)];
  const screens = [...labKeys, ...tracks.filter((trackRef) => trackRef.source === Track.Source.ScreenShare).map(keyOf)];
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
  // Zoom is offered where a tile is large: on the stage and in the grid, not in the strip beside the stage
  const tile = (trackRef: TrackReferenceOrPlaceholder, canZoom: boolean, className?: string) => {
    const key = keyOf(trackRef);
    return (
      <ParticipantTile
        key={key}
        trackRef={trackRef}
        isOnStage={key === onStage}
        onToggleStage={() => setChoice(key === onStage ? null : key)}
        handPosition={handPositions.get(trackRef.participant.identity) ?? null}
        canZoom={canZoom}
        moderation={moderation}
        className={className}
      />
    );
  };

  // The lab off the stage keeps a tile, to bring it back
  const labTile = (className?: string) =>
    lab && (
      <li key={LAB_STAGE_KEY} className={cn("flex", className)}>
        <button
          type="button"
          onClick={() => setChoice(LAB_STAGE_KEY)}
          className="flex flex-1 flex-col items-start justify-end gap-1 rounded-2xl bg-surface p-3 text-left text-foreground transition hover:ring-2 hover:ring-brand focus-visible:outline-2 focus-visible:outline-on-ink"
        >
          <span className="text-xs text-muted">{classroom.lab.tile}</span>
          <span className="font-semibold">{lab.name}</span>
        </button>
      </li>
    );

  if (onStage === null) {
    return (
      <ul
        aria-label={classroom.participants}
        className={cn(
          "grid flex-1 auto-rows-[minmax(10rem,1fr)] gap-3 p-0.5 lg:min-h-0 lg:overflow-y-auto",
          gridColumns(keys.length),
        )}
      >
        {labTile()}
        {tracks.map((trackRef) => tile(trackRef, true))}
      </ul>
    );
  }
  const others = tracks.filter((trackRef) => keyOf(trackRef) !== onStage);
  const isLabOnStage = onStage === LAB_STAGE_KEY && lab !== null;
  return (
    <div className="flex flex-1 flex-col gap-3 p-0.5 lg:min-h-0 lg:flex-row">
      {isLabOnStage ? (
        <div aria-label={classroom.stage} className="flex min-h-64 flex-1 flex-col lg:min-h-0">
          {lab.panel}
        </div>
      ) : (
        <ul aria-label={classroom.stage} className="flex min-h-64 flex-1 lg:min-h-0">
          {tracks.filter((trackRef) => keyOf(trackRef) === onStage).map((trackRef) => tile(trackRef, true, "flex-1"))}
        </ul>
      )}
      {(others.length > 0 || (lab && !isLabOnStage)) && (
        <ul
          aria-label={classroom.participants}
          className="flex shrink-0 gap-3 overflow-x-auto p-0.5 lg:w-52 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto"
        >
          {!isLabOnStage && labTile("h-28 w-44 shrink-0 lg:h-32 lg:w-full")}
          {others.map((trackRef) => tile(trackRef, false, "h-28 w-44 shrink-0 lg:h-32 lg:w-full"))}
        </ul>
      )}
    </div>
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

function Classroom({
  access,
  institutionId,
  findLab,
  closure,
  hadError,
  onLeave,
  onRejoin,
  onDeviceError,
}: ClassroomProps) {
  const { classroom, errors, labs, roles } = useDictionary();
  const state = useConnectionState();
  const room = useRoomContext();
  const feed = useRoomFeed();
  const hands = handQueue(useParticipants());
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
  const reportError = useCallback((caught: unknown) => setActionError(errorCode(caught)), []);
  const sharedLab = useSharedLab({ token, identity: access.identity, isTeacher, findLab, onError: reportError });
  const shareableLabs = parseShareableLabs(
    useParticipantAttribute(LABS_ATTRIBUTE, { participant: room.localParticipant }),
  );
  const [isPickingLab, setIsPickingLab] = useState(false);
  const current = sharedLab.current;
  const stagedLab = useMemo<StagedLab | null>(
    () =>
      current && {
        name: labs.names[current.labKey],
        panel: (
          <SharedLabPanel labKey={current.labKey} state={current.state} mode={current.mode} onStop={sharedLab.stop}>
            {findLab(current.labKey).render({
              state: current.state,
              onChange: sharedLab.update,
              mode: current.mode,
              institutionId,
            })}
          </SharedLabPanel>
        ),
      },
    [current, labs.names, findLab, institutionId, sharedLab.stop, sharedLab.update],
  );
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
        {isInRoom && (
          <HandQueue hands={hands} localIdentity={room.localParticipant.identity} moderation={moderation} />
        )}
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
            <VideoGrid moderation={moderation} lab={stagedLab} hands={hands} />
            <LiveCaptions captions={feed.captions} />
            <ClassControls
              isChatOpen={isChatOpen}
              unread={unreadCount(feed.messages.length, readUpTo, isChatOpen)}
              onToggleChat={toggleChat}
              onToggleHand={toggleHand}
              onLeave={() => setIsLeaving(true)}
              onDeviceError={onDeviceError}
              lab={
                isTeacher && shareableLabs.length > 0
                  ? { isSharing: current !== null, onPick: () => setIsPickingLab(true), onStop: sharedLab.stop }
                  : null
              }
            />
            <LabPicker
              isOpen={isPickingLab}
              labs={shareableLabs}
              onPick={(labKey) => {
                setIsPickingLab(false);
                sharedLab.share(labKey);
              }}
              onClose={() => setIsPickingLab(false)}
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
export function VirtualClassroom({ access, institutionId, findLab, onLeave, onRejoin }: VirtualClassroomProps) {
  const [closure, setClosure] = useState<Closure | null>(null);
  const [hadError, setHadError] = useState(false);
  const startsOnAir = access.role === "TEACHER";
  // Built once: LiveKitRoom makes a new room whenever its options change
  const options = useMemo(() => roomOptions(access.role), [access.role]);
  return (
    <LiveKitRoom
      serverUrl={env.livekitUrl}
      token={access.token}
      connect={closure === null}
      options={options}
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
        institutionId={institutionId}
        findLab={findLab}
        closure={closure}
        hadError={hadError}
        onLeave={onLeave}
        onRejoin={onRejoin}
        onDeviceError={() => setHadError(true)}
      />
    </LiveKitRoom>
  );
}
