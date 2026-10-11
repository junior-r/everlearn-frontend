import { apiClient, forInstitution } from "@/shared/api";
import type { Contact, Conversation, ConversationSummary, DirectMessage } from "./model/types";

export {
  conversationKey,
  isDirectMessage,
  MAX_MESSAGE_LENGTH,
  mergeMessages,
  MIN_SEARCH_LENGTH,
  PAGE_SIZE,
  peerOf,
} from "./model/types";
export type { Contact, Conversation, ConversationSummary, DirectMessage } from "./model/types";

/** Members of the institution whose name contains the query. */
export function searchContacts(institutionId: string, query: string, signal?: AbortSignal): Promise<Contact[]> {
  return apiClient.request<Contact[]>(`/messages/contacts?${new URLSearchParams({ query })}`, {
    headers: forInstitution(institutionId),
    signal,
  });
}

/** Everyone the member has exchanged messages with in the institution, most recent first. */
export function fetchConversations(institutionId: string): Promise<ConversationSummary[]> {
  return apiClient.request<ConversationSummary[]>("/messages/conversations", {
    headers: forInstitution(institutionId),
  });
}

/** A conversation's latest messages, or those before a date. Opening it marks it as read. */
export function openConversation(institutionId: string, peerId: string, before?: string): Promise<Conversation> {
  const query = before ? `?${new URLSearchParams({ before })}` : "";
  return apiClient.request<Conversation>(`/messages/conversations/${peerId}${query}`, {
    headers: forInstitution(institutionId),
  });
}

export function sendMessage(institutionId: string, peerId: string, body: string): Promise<DirectMessage> {
  return apiClient.request<DirectMessage>(`/messages/conversations/${peerId}`, {
    method: "POST",
    body: { body },
    headers: forInstitution(institutionId),
  });
}
