import type { Role } from "@/entities/session";

export const MAX_MESSAGE_LENGTH = 2000;
export const MIN_SEARCH_LENGTH = 2;
/** How many messages the backend returns per request. */
export const PAGE_SIZE = 50;

/** Someone to write to: an active member of the same institution. */
export interface Contact {
  userId: string;
  firstName: string;
  lastName: string;
  roles: Role[];
}

export interface DirectMessage {
  id: string;
  institutionId: string;
  senderId: string;
  recipientId: string;
  body: string;
  /** ISO date-time. */
  createdAt: string;
  readAt: string | null;
}

export interface ConversationSummary {
  peer: Contact;
  lastMessage: DirectMessage;
  /** Messages from the peer not opened yet. */
  unread: number;
}

export interface Conversation {
  peer: Contact;
  messages: DirectMessage[];
}

/** What the browser tells the server it is showing while a conversation is open. Mirrors the backend. */
export const conversationKey = (institutionId: string, peerUserId: string) => `dm:${institutionId}:${peerUserId}`;

/** Whether something pushed by the server has the shape of a message. */
export function isDirectMessage(value: unknown): value is DirectMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const message = value as Record<string, unknown>;
  return ["id", "institutionId", "senderId", "recipientId", "body", "createdAt"].every(
    (field) => typeof message[field] === "string",
  );
}

/** The other end of a message, from the point of view of `userId`; null if the message is not theirs. */
export function peerOf(message: DirectMessage, userId: string): string | null {
  if (message.senderId === userId) {
    return message.recipientId;
  }
  return message.recipientId === userId ? message.senderId : null;
}

/**
 * Adds messages to a conversation, oldest first and each one once. The same
 * message can arrive twice: as the answer to sending it and as a push.
 */
export function mergeMessages(current: readonly DirectMessage[], incoming: readonly DirectMessage[]): DirectMessage[] {
  const byId = new Map([...current, ...incoming].map((message) => [message.id, message]));
  return [...byId.values()].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
}
