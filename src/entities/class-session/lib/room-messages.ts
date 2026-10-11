import type { Caption, ChatMessage } from "../model/types";

/** Topics of the data messages the video-server publishes into a class room. */
export const CHAT_TOPIC = "chat";
export const CAPTIONS_TOPIC = "captions";

export const MAX_CHAT_LENGTH = 2000;

type Fields = Record<string, unknown>;

function decode(payload: Uint8Array): Fields | null {
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(payload));
    return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Fields) : null;
  } catch {
    return null;
  }
}

const text = (fields: Fields, key: string) => {
  const value = fields[key];
  return typeof value === "string" ? value : "";
};

/** Reads a chat message from a room data packet; null if the packet is not one. */
export function parseChatMessage(payload: Uint8Array): ChatMessage | null {
  const fields = decode(payload);
  if (!fields) {
    return null;
  }
  const message: ChatMessage = {
    id: text(fields, "id"),
    senderId: text(fields, "senderId"),
    senderName: text(fields, "senderName"),
    content: text(fields, "content"),
    sentAt: text(fields, "sentAt"),
  };
  return message.id && message.senderId && message.content ? message : null;
}

/** Reads a live caption from a room data packet; null if the packet is not one. */
export function parseCaption(payload: Uint8Array): Caption | null {
  const fields = decode(payload);
  if (!fields) {
    return null;
  }
  const caption: Caption = {
    id: text(fields, "id"),
    speakerId: text(fields, "speakerId"),
    speakerName: text(fields, "speakerName"),
    text: text(fields, "text"),
  };
  return caption.id && caption.text ? caption : null;
}

/** Adds an item to the end unless its id is already listed, keeping only the newest `limit` items. */
export function appendUnique<Item extends { id: string }>(items: Item[], item: Item, limit: number): Item[] {
  if (items.some((existing) => existing.id === item.id)) {
    return items;
  }
  return [...items, item].slice(-limit);
}
