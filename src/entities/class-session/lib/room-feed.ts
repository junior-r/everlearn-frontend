import type { Caption, ChatMessage } from "../model/types";
import {
  appendUnique,
  CAPTIONS_TOPIC,
  CHAT_DELETED_TOPIC,
  CHAT_TOPIC,
  parseCaption,
  parseChatDeletion,
  parseChatMessage,
  withDeleted,
} from "./room-messages";

/** A data message as the room delivered it: live, or replayed by the video-server to a late joiner. */
export interface FeedPacket {
  topic: string;
  payload: Uint8Array;
}

/** The chat and captions a viewer is shown, and every message they know was taken down. */
export interface RoomFeed {
  messages: ChatMessage[];
  captions: Caption[];
  deletedIds: string[];
}

export const EMPTY_FEED: RoomFeed = { messages: [], captions: [], deletedIds: [] };

const MAX_MESSAGES = 300;
// Captions are for following along, not for reading back
const MAX_CAPTIONS = 3;

/** Adds one packet to the feed; a packet of another topic, or one that does not parse, changes nothing. */
export function withPacket(feed: RoomFeed, packet: FeedPacket): RoomFeed {
  switch (packet.topic) {
    case CHAT_TOPIC: {
      const message = parseChatMessage(packet.payload);
      return message ? { ...feed, messages: appendUnique(feed.messages, message, MAX_MESSAGES) } : feed;
    }
    case CHAT_DELETED_TOPIC: {
      const id = parseChatDeletion(packet.payload);
      return id
        ? { ...feed, messages: withDeleted(feed.messages, id), deletedIds: [...feed.deletedIds, id].slice(-MAX_MESSAGES) }
        : feed;
    }
    case CAPTIONS_TOPIC: {
      const caption = parseCaption(packet.payload);
      return caption ? { ...feed, captions: appendUnique(feed.captions, caption, MAX_CAPTIONS) } : feed;
    }
    default:
      return feed;
  }
}

const notIn = <Item extends { id: string }>(items: Item[], known: Item[]) =>
  items.filter((item) => !known.some((other) => other.id === item.id));

/**
 * Merges what the room kept with what this viewer saw live. The replay sets the
 * order; what arrived live after it was read goes at the end, and a message
 * taken down live stays down even if the replay predates it.
 */
export function withHistory(live: RoomFeed, history: FeedPacket[]): RoomFeed {
  const past = history.reduce(withPacket, EMPTY_FEED);
  const messages = [...past.messages, ...notIn(live.messages, past.messages)].slice(-MAX_MESSAGES);
  return {
    messages: live.deletedIds.reduce(withDeleted, messages),
    captions: [...past.captions, ...notIn(live.captions, past.captions)].slice(-MAX_CAPTIONS),
    deletedIds: [...new Set([...past.deletedIds, ...live.deletedIds])].slice(-MAX_MESSAGES),
  };
}

/** Reads the video-server's replay; anything that is not a packet is left out. */
export function parseFeedPackets(body: unknown): FeedPacket[] {
  const packets = typeof body === "object" && body !== null ? (body as { packets?: unknown }).packets : null;
  if (!Array.isArray(packets)) {
    return [];
  }
  const encoder = new TextEncoder();
  return packets.flatMap((packet: unknown) => {
    if (typeof packet !== "object" || packet === null) {
      return [];
    }
    const { topic, payload } = packet as { topic?: unknown; payload?: unknown };
    return typeof topic === "string" ? [{ topic, payload: encoder.encode(JSON.stringify(payload)) }] : [];
  });
}
