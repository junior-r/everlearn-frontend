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
