import { DisconnectReason } from "livekit-client";

/** Why the viewer is no longer in the class, when they did not leave by themselves. */
export type Closure = "lost" | "failed" | "ended" | "duplicate";

/** Turns LiveKit's reason for a disconnection into what to tell the viewer; null when they left on purpose. */
export function closureFor(reason: DisconnectReason | undefined): Closure | null {
  switch (reason) {
    case DisconnectReason.CLIENT_INITIATED:
      return null;
    case DisconnectReason.DUPLICATE_IDENTITY:
      return "duplicate";
    case DisconnectReason.ROOM_DELETED:
    case DisconnectReason.ROOM_CLOSED:
      return "ended";
    case DisconnectReason.JOIN_FAILURE:
      return "failed";
    default:
      return "lost";
  }
}

/** Column classes for a grid of `count` video tiles: as few columns as keep every tile large. */
export function gridColumns(count: number): string {
  if (count <= 1) {
    return "grid-cols-1";
  }
  if (count <= 4) {
    return "grid-cols-2";
  }
  if (count <= 9) {
    return "grid-cols-2 lg:grid-cols-3";
  }
  return "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4";
}

/** What the viewer asked to see large: a tile, nobody (`null`), or no preference yet (`undefined`). */
export type StageChoice = string | null | undefined;

/**
 * The tile that takes the stage, by key. The viewer's pin wins while that tile
 * is still there; with no preference a shared screen takes it; otherwise nobody does.
 * A screen that starts being shared replaces the pin (see `startedScreen`).
 */
export function stageKey(tileKeys: string[], screenKeys: string[], choice: StageChoice): string | null {
  if (choice === null) {
    return null;
  }
  if (choice !== undefined && tileKeys.includes(choice)) {
    return choice;
  }
  return screenKeys[0] ?? null;
}

/** The screen that started being shared between two looks at the room, if any. */
export function startedScreen(before: string[], now: string[]): string | null {
  return now.find((key) => !before.includes(key)) ?? null;
}

/** Messages that arrived since the viewer last had the chat open. */
export function unreadCount(total: number, readUpTo: number, isChatOpen: boolean): number {
  return isChatOpen ? 0 : Math.max(0, total - readUpTo);
}
