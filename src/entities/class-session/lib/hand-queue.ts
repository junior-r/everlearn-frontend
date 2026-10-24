import { HAND_ATTRIBUTE } from "./room-messages";

/** A participant as the room reports them; only what the queue needs. */
export interface HandHolder {
  identity: string;
  name?: string;
  attributes: Readonly<Record<string, string>>;
}

export interface RaisedHand {
  identity: string;
  name: string;
  /** When the hand went up, in milliseconds; null if the video-server's value could not be read. */
  raisedAt: number | null;
  /** 1 for the first hand up. */
  position: number;
}

/**
 * The raised hands in the order they went up, earliest first. Ties, and times
 * that cannot be read, fall back to the participant's identity, so every
 * viewer sees the same order.
 */
export function handQueue(participants: readonly HandHolder[]): RaisedHand[] {
  return participants
    .filter((participant) => participant.attributes[HAND_ATTRIBUTE])
    .map((participant) => {
      const time = Date.parse(participant.attributes[HAND_ATTRIBUTE]);
      return { identity: participant.identity, name: participant.name ?? "", raisedAt: Number.isNaN(time) ? null : time };
    })
    .sort(
      (a, b) =>
        (a.raisedAt ?? Number.POSITIVE_INFINITY) - (b.raisedAt ?? Number.POSITIVE_INFINITY) ||
        a.identity.localeCompare(b.identity),
    )
    .map((hand, index) => ({ ...hand, position: index + 1 }));
}
